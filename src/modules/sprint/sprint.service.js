import { sprintRepository } from "./sprint.repository.js";
import { issueRepository } from "../issue/issue.repository.js";
import { AppError } from "../../shared/errors/AppError.js";
import { ErrorCodes } from "../../shared/errors/ErrorCodes.js";
import { SPRINT_STATUSES } from "../../shared/constants/sprint.constants.js";
import { ISSUE_STATUSES } from "../../shared/constants/issue.constants.js";
import { IssueModel } from "../issue/issue.model.js";
import { activityService } from "../activity/activity.service.js";
import { ACTIVITY_TYPES } from "../../shared/constants/activity.constants.js";
import { notificationService } from "../notification/notification.service.js";
import { NOTIFICATION_TYPES } from "../../shared/constants/notification.constants.js";
import { ProjectMemberModel } from "../project/projectMember.model.js";
import { getIO } from "../../socket/socket.server.js";
import { emitToProject } from "../../socket/socket.rooms.js";
import { SOCKET_EVENTS } from "../../socket/socket.events.js";

class SprintService {

  async #getProjectMemberIds(projectId) {
    const members = await ProjectMemberModel.find({ projectId }).select("userId");
    return members.map((m) => m.userId);
  }

  async createSprint(
    { name, startDate, endDate, goal },
    projectId,
    workspaceId,
    userId
  ) {
    /**
     * Validate dates if both provided.
     * endDate must be after startDate.
     */
    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      throw new AppError(
        "End date must be after start date.",
        400,
        ErrorCodes.SPRINT_DATES_INVALID
      );
    }




    const sprint = sprintRepository.create({
      name,
      startDate: startDate || null,
      endDate: endDate || null,
      goal: goal || null,
      projectId,
      workspaceId,
      createdBy: userId,
    });

    activityService.log({
      actor: userId,
      type: ACTIVITY_TYPES.SPRINT_CREATED,
      workspaceId,
      projectId,
      metadata: {
        sprintName: sprint.name,
      },
    });

    return sprint
  }

  async getSprints(projectId) {
    return sprintRepository.findByProject(projectId);
  }

  async getSprintById(sprintId) {
    const sprint = await sprintRepository.findByIdWithProject(sprintId);

    if (!sprint) {
      throw new AppError(
        "Sprint not found.",
        404,
        ErrorCodes.SPRINT_NOT_FOUND
      );
    }

    return sprint;
  }

  async updateSprint(sprintId, updates) {
    const sprint = await sprintRepository.findById(sprintId);

    if (!sprint) {
      throw new AppError("Sprint not found.", 404, ErrorCodes.SPRINT_NOT_FOUND);
    }

    if (sprint.status === SPRINT_STATUSES.COMPLETED) {
      throw new AppError(
        "Completed sprints cannot be modified.",
        400,
        ErrorCodes.SPRINT_ALREADY_COMPLETED
      );
    }

    if (updates.startDate && updates.endDate) {
      if (new Date(updates.endDate) <= new Date(updates.startDate)) {
        throw new AppError(
          "End date must be after start date.",
          400,
          ErrorCodes.SPRINT_DATES_INVALID
        );
      }
    }

    return sprintRepository.updateById(sprintId, updates);
  }

  async deleteSprint(sprintId) {
    const sprint = await sprintRepository.findById(sprintId);

    if (!sprint) {
      throw new AppError("Sprint not found.", 404, ErrorCodes.SPRINT_NOT_FOUND);
    }

    if (sprint.status === SPRINT_STATUSES.ACTIVE) {
      throw new AppError(
        "Cannot delete an active sprint. Complete it first.",
        400,
        ErrorCodes.SPRINT_ALREADY_ACTIVE
      );
    }

    /**
     * Move all issues in this sprint back to backlog
     * before deleting the sprint.
     */
    await IssueModel.updateMany(
      { sprintId },
      { $set: { sprintId: null } }
    );

    await sprintRepository.deleteById(sprintId);
  }

  /**
   * Starts a sprint.
   *
   * Rules:
   * 1. Sprint must be in PLANNED status
   * 2. No other sprint can be ACTIVE in this project
   * 3. Sets startedAt to now
   */
  async startSprint(sprintId, projectId, userId) {
    const sprint = await sprintRepository.findById(sprintId);

    if (!sprint) {
      throw new AppError("Sprint not found.", 404, ErrorCodes.SPRINT_NOT_FOUND);
    }

    if (sprint.status !== SPRINT_STATUSES.PLANNED) {
      throw new AppError(
        "Only planned sprints can be started.",
        400,
        ErrorCodes.SPRINT_NOT_ACTIVE
      );
    }

    /**
     * Check for existing active sprint.
     * Only one sprint can be active at a time per project.
     */
    const activeSprint = await sprintRepository.findActiveSprint(projectId);

    if (activeSprint) {
      throw new AppError(
        `Sprint "${activeSprint.name}" is already active. ` +
        `Complete it before starting a new one.`,
        400,
        ErrorCodes.SPRINT_ALREADY_ACTIVE
      );
    }

    activityService.log({
      actor: userId,
      type: ACTIVITY_TYPES.SPRINT_STARTED,
      workspaceId: sprint.workspaceId,
      projectId: sprint.projectId,
      metadata: {
        sprintName: sprint.name,
        startedAt: new Date(),
      },
    });

    const memberIds = await this.#getProjectMemberIds(projectId);

    notificationService.notifyMany({
      recipientIds: memberIds,
      senderId: userId,
      type: NOTIFICATION_TYPES.SPRINT_STARTED,
      message: `Sprint "${sprint.name}" has started`,
      workspaceId: sprint.workspaceId,
      projectId,
      link: `/workspaces/${sprint.workspaceId}/projects/${projectId}`,
    });


    try {
      emitToProject(getIO(), projectId.toString(), SOCKET_EVENTS.SPRINT_STARTED, {
        sprint: updated,
        projectId,
      });
    } catch (error) {
      logger.warn(`Socket emit failed: ${error.message}`);
    }


    return sprintRepository.updateById(sprintId, {
      status: SPRINT_STATUSES.ACTIVE,
      startedAt: new Date(),
    });
  }

  /**
   * Completes a sprint.
   *
   * Rules:
   * 1. Sprint must be ACTIVE
   * 2. All non-DONE issues move back to backlog
   * 3. Velocity metrics are recorded
   * 4. Sprint status becomes COMPLETED
   */
  async completeSprint(sprintId, projectId, userId) {
    const sprint = await sprintRepository.findById(sprintId);

    if (!sprint) {
      throw new AppError("Sprint not found.", 404, ErrorCodes.SPRINT_NOT_FOUND);
    }

    if (sprint.status !== SPRINT_STATUSES.ACTIVE) {
      throw new AppError(
        "Only active sprints can be completed.",
        400,
        ErrorCodes.SPRINT_NOT_ACTIVE
      );
    }

    // Count total and completed issues for velocity
    const totalIssues = await IssueModel.countDocuments({ sprintId });
    const completedIssues = await IssueModel.countDocuments({
      sprintId,
      status: ISSUE_STATUSES.DONE,
    });

    /**
     * Move all non-DONE issues back to backlog.
     * DONE issues stay linked to this sprint for history.
     */
    await IssueModel.updateMany(
      {
        sprintId,
        status: { $ne: ISSUE_STATUSES.DONE },
      },
      {
        $set: {
          sprintId: null,
          status: ISSUE_STATUSES.TODO,
        },
      }
    );

    activityService.log({
      actor: userId,
      type: ACTIVITY_TYPES.SPRINT_COMPLETED,
      workspaceId: sprint.workspaceId,
      projectId: sprint.projectId,
      metadata: {
        sprintName: sprint.name,
        totalIssues,
        completedIssues,
      },
    });


    const memberIds = await this.#getProjectMemberIds(projectId);

    notificationService.notifyMany({
      recipientIds: memberIds,
      senderId: userId,
      type: NOTIFICATION_TYPES.SPRINT_COMPLETED,
      message: `Sprint "${sprint.name}" completed — ${completedIssues}/${totalIssues} issues done`,
      workspaceId: sprint.workspaceId,
      projectId,
      link: `/workspaces/${sprint.workspaceId}/projects/${projectId}`,
    });

    try {
      emitToProject(
        getIO(),
        projectId.toString(),
        SOCKET_EVENTS.SPRINT_COMPLETED,
        { sprint: completed, projectId }
      );
    } catch (error) {
      logger.warn(`Socket emit failed: ${error.message}`);
    }


    return sprintRepository.updateById(sprintId, {
      status: SPRINT_STATUSES.COMPLETED,
      completedAt: new Date(),
      totalIssues,
      completedIssues,
    });
  }

  // ─── Sprint Issue Management ──────────────────────────────────

  /**
   * Adds an issue to a sprint (moves from backlog).
   */
  async addIssueToSprint(sprintId, issueId) {
    const sprint = await sprintRepository.findById(sprintId);

    if (!sprint) {
      throw new AppError("Sprint not found.", 404, ErrorCodes.SPRINT_NOT_FOUND);
    }

    if (sprint.status === SPRINT_STATUSES.COMPLETED) {
      throw new AppError(
        "Cannot add issues to a completed sprint.",
        400,
        ErrorCodes.SPRINT_ALREADY_COMPLETED
      );
    }

    const issue = await issueRepository.findById(issueId);

    if (!issue) {
      throw new AppError("Issue not found.", 404, ErrorCodes.ISSUE_NOT_FOUND);
    }

    return issueRepository.updateById(issueId, { sprintId });
  }

  /**
   * Removes an issue from a sprint (back to backlog).
   */
  async removeIssueFromSprint(sprintId, issueId) {
    const sprint = await sprintRepository.findById(sprintId);

    if (!sprint) {
      throw new AppError("Sprint not found.", 404, ErrorCodes.SPRINT_NOT_FOUND);
    }

    if (sprint.status === SPRINT_STATUSES.COMPLETED) {
      throw new AppError(
        "Cannot remove issues from a completed sprint.",
        400,
        ErrorCodes.SPRINT_ALREADY_COMPLETED
      );
    }

    return issueRepository.updateById(issueId, { sprintId: null });
  }

  /**
   * Returns all issues belonging to a sprint.
   */
  async getSprintIssues(sprintId) {
    const sprint = await sprintRepository.findById(sprintId);

    if (!sprint) {
      throw new AppError("Sprint not found.", 404, ErrorCodes.SPRINT_NOT_FOUND);
    }

    return IssueModel.find({ sprintId })
      .populate("assignees", "name email profilePicture")
      .populate("reporter", "name email profilePicture")
      .sort({ order: 1 });
  }
}

export const sprintService = new SprintService();
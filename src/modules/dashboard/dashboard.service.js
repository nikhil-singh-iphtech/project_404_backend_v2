// src/modules/dashboard/dashboard.service.js

import mongoose from "mongoose";
import { IssueModel } from "../issue/issue.model.js";
import { SprintModel } from "../sprint/sprint.model.js";
import { ProjectMemberModel } from "../project/projectMember.model.js";
import { ActivityModel } from "../activity/activity.model.js";
import { ProjectModel } from "../project/project.model.js";
import { WorkspaceModel } from "../workspace/workspace.model.js";
import { AppError } from "../../shared/errors/AppError.js";
import { ErrorCodes } from "../../shared/errors/ErrorCodes.js";
import { ISSUE_STATUSES } from "../../shared/constants/issue.constants.js";
import { SPRINT_STATUSES } from "../../shared/constants/sprint.constants.js";

class DashboardService {
  /**
   * ─── Issue Breakdown ──────────────────────────────────────
   * Groups issues by a given field and counts them.
   * Reused for status, type, and priority breakdowns —
   * the shape of the query is identical, only the field changes.
   */
  async #getIssueBreakdown(projectId, field) {
    const result = await IssueModel.aggregate([
      {
        $match: {
          projectId: new mongoose.Types.ObjectId(projectId),
          parentId: null, // top-level issues only, consistent with board/list views
        },
      },
      {
        $group: {
          _id: `$${field}`,
          count: { $sum: 1 },
        },
      },
    ]);

    /**
     * Aggregation only returns buckets that exist.
     * If a project has zero BUG issues, "BUG" won't appear
     * in the result at all — the frontend needs every key present
     * even at zero, so we normalize it here.
     */
    return result.reduce((acc, { _id, count }) => {
      acc[_id] = count;
      return acc;
    }, {});
  }

  /**
   * ─── Overdue Issues ───────────────────────────────────────
   * Issues with a dueDate in the past that are not yet DONE.
   */
  async #getOverdueCount(projectId) {
    return IssueModel.countDocuments({
      projectId,
      parentId: null,
      dueDate: { $lt: new Date() },
      status: { $ne: ISSUE_STATUSES.DONE },
    });
  }

  /**
   * ─── Member Workload ──────────────────────────────────────
   * Counts how many open (non-DONE) issues are assigned
   * to each project member, joined with their name/email.
   *
   * $unwind splits an issue with 3 assignees into 3 separate
   * documents — one per assignee — so $group can count per person.
   * Without $unwind, an issue with multiple assignees would only
   * ever be attributed to the array as a whole, not to each person.
   */
  async #getMemberWorkload(projectId) {
    const workload = await IssueModel.aggregate([
      {
        $match: {
          projectId: new mongoose.Types.ObjectId(projectId),
          parentId: null,
          status: { $ne: ISSUE_STATUSES.DONE },
        },
      },
      { $unwind: "$assignees" },
      {
        $group: {
          _id: "$assignees",
          openIssueCount: { $sum: 1 },
        },
      },
      {
        /**
         * $lookup joins the User collection to attach
         * name/email to each workload entry — MongoDB has
         * no foreign keys, so this is the manual join.
         */
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 0,
          userId: "$_id",
          name: "$user.name",
          email: "$user.email",
          openIssueCount: 1,
        },
      },
      { $sort: { openIssueCount: -1 } },
    ]);

    return workload;
  }

  /**
   * ─── Sprint Velocity ──────────────────────────────────────
   * Velocity is a computed metric — it doesn't exist as a
   * stored field. We use totalIssues/completedIssues already
   * captured when each sprint was completed (Phase 5), so no
   * recomputation from raw issues is needed.
   */
  async #getSprintVelocity(projectId, limitToLast = 5) {
    const sprints = await SprintModel.find({
      projectId,
      status: SPRINT_STATUSES.COMPLETED,
    })
      .sort({ completedAt: -1 })
      .limit(limitToLast)
      .select("name totalIssues completedIssues completedAt");

    return sprints
      .map((s) => ({
        sprintName: s.name,
        totalIssues: s.totalIssues,
        completedIssues: s.completedIssues,
        velocity: s.totalIssues
          ? Math.round((s.completedIssues / s.totalIssues) * 100)
          : 0,
        completedAt: s.completedAt,
      }))
      .reverse(); // oldest to newest, for charting left-to-right
  }

  /**
   * ─── Active Sprint Snapshot ───────────────────────────────
   */
  async #getActiveSprint(projectId) {
    const sprint = await SprintModel.findOne({
      projectId,
      status: SPRINT_STATUSES.ACTIVE,
    }).select("name startedAt endDate");

    if (!sprint) return null;

    const issueCount = await IssueModel.countDocuments({
      sprintId: sprint._id,
    });

    const doneCount = await IssueModel.countDocuments({
      sprintId: sprint._id,
      status: ISSUE_STATUSES.DONE,
    });

    return {
      name: sprint.name,
      startedAt: sprint.startedAt,
      endDate: sprint.endDate,
      totalIssues: issueCount,
      completedIssues: doneCount,
    };
  }

  /**
   * ─── Recent Activity ──────────────────────────────────────
   */
  async #getRecentActivity(projectId, limit = 10) {
    return ActivityModel.find({ projectId })
      .populate("actor", "name email profilePicture")
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  // ─── PROJECT DASHBOARD ──────────────────────────────────────
  async getProjectDashboard(projectId) {
    const project = await ProjectModel.findById(projectId).select("name key");

    if (!project) {
      throw new AppError("Project not found.", 404, ErrorCodes.PROJECT_NOT_FOUND);
    }

    /**
     * All independent reads run in parallel via Promise.all.
     * None of these queries depend on each other's results,
     * so running them sequentially would just waste time.
     */
    const [
      statusBreakdown,
      typeBreakdown,
      priorityBreakdown,
      overdueCount,
      memberWorkload,
      velocity,
      activeSprint,
      recentActivity,
      totalIssueCount,
      totalMemberCount,
    ] = await Promise.all([
      this.#getIssueBreakdown(projectId, "status"),
      this.#getIssueBreakdown(projectId, "type"),
      this.#getIssueBreakdown(projectId, "priority"),
      this.#getOverdueCount(projectId),
      this.#getMemberWorkload(projectId),
      this.#getSprintVelocity(projectId),
      this.#getActiveSprint(projectId),
      this.#getRecentActivity(projectId),
      IssueModel.countDocuments({ projectId, parentId: null }),
      ProjectMemberModel.countDocuments({ projectId }),
    ]);

    return {
      project: { id: project._id, name: project.name, key: project.key },
      summary: {
        totalIssues: totalIssueCount,
        totalMembers: totalMemberCount,
        overdueIssues: overdueCount,
      },
      issuesByStatus: statusBreakdown,
      issuesByType: typeBreakdown,
      issuesByPriority: priorityBreakdown,
      memberWorkload,
      sprintVelocity: velocity,
      activeSprint,
      recentActivity,
    };
  }

  // ─── WORKSPACE DASHBOARD ────────────────────────────────────
  async getWorkspaceDashboard(workspaceId) {
    const workspace = await WorkspaceModel.findById(workspaceId).select("name slug");

    if (!workspace) {
      throw new AppError("Workspace not found.", 404, ErrorCodes.WORKSPACE_NOT_FOUND);
    }

    const projects = await ProjectModel.find({ workspaceId }).select("_id name key");
    const projectIds = projects.map((p) => p._id);

    const [
      statusBreakdown,
      totalIssueCount,
      totalMemberCount,
      activeSprints,
      recentActivity,
    ] = await Promise.all([
      IssueModel.aggregate([
        { $match: { workspaceId: new mongoose.Types.ObjectId(workspaceId), parentId: null } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]).then((result) =>
        result.reduce((acc, { _id, count }) => {
          acc[_id] = count;
          return acc;
        }, {})
      ),
      IssueModel.countDocuments({ workspaceId, parentId: null }),
      (await import("../workspace/workspaceMember.model.js")).WorkspaceMemberModel.countDocuments({
        workspaceId,
      }),
      SprintModel.find({
        projectId: { $in: projectIds },
        status: SPRINT_STATUSES.ACTIVE,
      }).select("name projectId"),
      this.#getRecentActivity_workspace(workspaceId),
    ]);

    return {
      workspace: { id: workspace._id, name: workspace.name, slug: workspace.slug },
      summary: {
        totalProjects: projects.length,
        totalIssues: totalIssueCount,
        totalMembers: totalMemberCount,
      },
      issuesByStatus: statusBreakdown,
      activeSprints,
      projects,
      recentActivity,
    };
  }

  async #getRecentActivity_workspace(workspaceId, limit = 10) {
    return ActivityModel.find({ workspaceId })
      .populate("actor", "name email profilePicture")
      .sort({ createdAt: -1 })
      .limit(limit);
  }
}

export const dashboardService = new DashboardService();
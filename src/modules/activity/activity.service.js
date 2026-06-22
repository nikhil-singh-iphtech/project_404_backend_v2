import { activityRepository } from "./activity.repository.js";
import { logger } from "../../shared/utils/logger.js";

class ActivityService {
  /**
   * Creates an activity record.
   *
   * Why never throw errors here?
   * Activity logging is a side effect — it should NEVER
   * cause the main operation to fail. If logging fails,
   * the issue was still created, the comment was still added.
   * We log the error and move on silently.
   *
   * This is called fire-and-forget logging.
   */
  async log({
    actor,
    type,
    workspaceId,
    projectId = null,
    issueId   = null,
    metadata  = {},
  }) {
    try {
      await activityRepository.create({
        actor,
        type,
        workspaceId,
        projectId,
        issueId,
        metadata,
      });
    } catch (error) {
      /**
       * Never rethrow — activity failure must not
       * break the operation that triggered it.
       */
      logger.error(`Activity logging failed: ${error.message}`, {
        type,
        actor,
        workspaceId,
      });
    }
  }

  async getIssueActivities(issueId, { page, limit }) {
    return activityRepository.findByIssue(issueId, { page, limit });
  }

  async getProjectActivities(projectId, { page, limit }) {
    return activityRepository.findByProject(projectId, { page, limit });
  }

  async getWorkspaceActivities(workspaceId, { page, limit }) {
    return activityRepository.findByWorkspace(workspaceId, { page, limit });
  }
}

export const activityService = new ActivityService();
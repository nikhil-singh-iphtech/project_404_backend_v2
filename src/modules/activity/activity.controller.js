// src/modules/activity/activity.controller.js

import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { ApiResponse } from "../../shared/utils/ApiResponse.js";
import { activityService } from "./activity.service.js";

class ActivityController {
  getIssueActivities = asyncHandler(async (req, res) => {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await activityService.getIssueActivities(
      req.params.issueId,
      { page, limit }
    );

    ApiResponse.paginated(
      res,
      "Activities fetched successfully",
      result.activities,
      {
        page:       result.page,
        limit:      result.limit,
        total:      result.total,
        totalPages: result.totalPages,
      }
    );
  });

  getProjectActivities = asyncHandler(async (req, res) => {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await activityService.getProjectActivities(
      req.params.projectId,
      { page, limit }
    );

    ApiResponse.paginated(
      res,
      "Activities fetched successfully",
      result.activities,
      {
        page:       result.page,
        limit:      result.limit,
        total:      result.total,
        totalPages: result.totalPages,
      }
    );
  });

  getWorkspaceActivities = asyncHandler(async (req, res) => {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await activityService.getWorkspaceActivities(
      req.params.workspaceId,
      { page, limit }
    );

    ApiResponse.paginated(
      res,
      "Activities fetched successfully",
      result.activities,
      {
        page:       result.page,
        limit:      result.limit,
        total:      result.total,
        totalPages: result.totalPages,
      }
    );
  });
}

export const activityController = new ActivityController();
// src/modules/dashboard/dashboard.controller.js

import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { ApiResponse } from "../../shared/utils/ApiResponse.js";
import { dashboardService } from "./dashboard.service.js";

class DashboardController {
  getProjectDashboard = asyncHandler(async (req, res) => {
    const dashboard = await dashboardService.getProjectDashboard(
      req.params.projectId
    );
    ApiResponse.success(res, 200, "Dashboard fetched successfully", { dashboard });
  });

  getWorkspaceDashboard = asyncHandler(async (req, res) => {
    const dashboard = await dashboardService.getWorkspaceDashboard(
      req.params.workspaceId
    );
    ApiResponse.success(res, 200, "Dashboard fetched successfully", { dashboard });
  });
}

export const dashboardController = new DashboardController();
// src/modules/dashboard/dashboard.routes.js

import { Router } from "express";
import { dashboardController } from "./dashboard.controller.js";
import { authenticate } from "../../shared/middleware/auth.middleware.js";
import {
  requireWorkspaceRole,
  requireProjectRole,
} from "../../shared/middleware/authorization.middleware.js";

/**
 * Workspace-level dashboard
 * Mounted at: /api/workspaces/:workspaceId/dashboard
 */
export const workspaceDashboardRouter = Router({ mergeParams: true });

workspaceDashboardRouter.get(
  "/",
  authenticate,
  requireWorkspaceRole("MEMBER"),
  dashboardController.getWorkspaceDashboard
);

/**
 * Project-level dashboard
 * Mounted at: /api/workspaces/:workspaceId/projects/:projectId/dashboard
 */
export const projectDashboardRouter = Router({ mergeParams: true });

projectDashboardRouter.get(
  "/",
  authenticate,
  requireProjectRole("VIEWER"),
  dashboardController.getProjectDashboard
);
// src/modules/activity/activity.routes.js

import { Router } from "express";
import { activityController } from "./activity.controller.js";
import { authenticate } from "../../shared/middleware/auth.middleware.js";
import { requireWorkspaceRole } from "../../shared/middleware/authorization.middleware.js";
import { requireProjectRole } from "../../shared/middleware/authorization.middleware.js";

/**
 * Issue activities — nested under issues
 * Mounted at: /api/workspaces/:wId/projects/:pId/issues/:iId/activities
 */
export const issueActivityRouter = Router({ mergeParams: true });

issueActivityRouter.get(
  "/",
  authenticate,
  requireProjectRole("VIEWER"),
  activityController.getIssueActivities
);

/**
 * Project activities — nested under projects
 * Mounted at: /api/workspaces/:wId/projects/:pId/activities
 */
export const projectActivityRouter = Router({ mergeParams: true });

projectActivityRouter.get(
  "/",
  authenticate,
  requireProjectRole("VIEWER"),
  activityController.getProjectActivities
);

/**
 * Workspace activities — nested under workspaces
 * Mounted at: /api/workspaces/:wId/activities
 */
export const workspaceActivityRouter = Router({ mergeParams: true });

workspaceActivityRouter.get(
  "/",
  authenticate,
  requireWorkspaceRole("MEMBER"),
  activityController.getWorkspaceActivities
);
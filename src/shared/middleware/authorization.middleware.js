// src/shared/middleware/authorization.middleware.js

import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../errors/AppError.js";
import { ErrorCodes } from "../errors/ErrorCodes.js";
import { WorkspaceMemberModel } from "../../modules/workspace/workspaceMember.model.js";
import { ProjectMemberModel } from "../../modules/project/projectMember.model.js";
import {
  WORKSPACE_ROLE_HIERARCHY,
  PROJECT_ROLE_HIERARCHY,
} from "../constants/roles.constants.js";

/**
 * Verifies the requesting user is a member of the workspace
 * with AT LEAST the required role level.
 *
 * Usage:
 *   router.post("/", authenticate, requireWorkspaceRole("ADMIN"), controller.create)
 *
 * Why middleware instead of checking in the service?
 * Authorization is cross-cutting — it belongs at the routing
 * layer, not scattered inside business logic. Services should
 * assume the caller is already authorized.
 */
export const requireWorkspaceRole = (minimumRole) =>
  asyncHandler(async (req, res, next) => {
    const workspaceId = req.params.workspaceId || req.body.workspaceId;

    const membership = await WorkspaceMemberModel.findOne({
      workspaceId,
      userId: req.user._id,
    });

    if (!membership) {
      throw new AppError(
        "You are not a member of this workspace.",
        403,
        ErrorCodes.WORKSPACE_FORBIDDEN
      );
    }

    const userLevel    = WORKSPACE_ROLE_HIERARCHY[membership.role] || 0;
    const requiredLevel = WORKSPACE_ROLE_HIERARCHY[minimumRole] || 0;

    if (userLevel < requiredLevel) {
      throw new AppError(
        `This action requires ${minimumRole} role or higher.`,
        403,
        ErrorCodes.WORKSPACE_FORBIDDEN
      );
    }

    // Attach membership to req for use in controllers/services
    req.workspaceMembership = membership;
    next();
  });

/**
 * Verifies membership at the project level.
 */
export const requireProjectRole = (minimumRole) =>
  asyncHandler(async (req, res, next) => {
    const projectId = req.params.projectId || req.body.projectId;

    const membership = await ProjectMemberModel.findOne({
      projectId,
      userId: req.user._id,
    });

    if (!membership) {
      throw new AppError(
        "You are not a member of this project.",
        403,
        ErrorCodes.PROJECT_FORBIDDEN
      );
    }

    const userLevel     = PROJECT_ROLE_HIERARCHY[membership.role] || 0;
    const requiredLevel = PROJECT_ROLE_HIERARCHY[minimumRole] || 0;

    if (userLevel < requiredLevel) {
      throw new AppError(
        `This action requires ${minimumRole} role or higher.`,
        403,
        ErrorCodes.PROJECT_FORBIDDEN
      );
    }

    req.projectMembership = membership;
    next();
  });
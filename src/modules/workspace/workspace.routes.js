// src/modules/workspace/workspace.routes.js

import { Router } from "express";
import { workspaceController } from "./workspace.controller.js";
import { authenticate } from "../../shared/middleware/auth.middleware.js";
import { requireWorkspaceRole } from "../../shared/middleware/authorization.middleware.js";
import { validate } from "../../shared/validators/validate.js";
import { optionalAuth } from "../../shared/middleware/optionalAuth.middleware.js";
import { invitationRouter } from "../invitation/invitation.routes.js";
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  updateMemberRoleSchema,
} from "./workspace.validator.js";


export const workspaceRouter = Router();
workspaceRouter.use("/:workspaceId/invitations", invitationRouter);
// All workspace routes require authentication
workspaceRouter.use(authenticate);

// ─── Workspace CRUD ────────────────────────────────────────────
workspaceRouter.post(   "/",                    validate(createWorkspaceSchema), workspaceController.create);
workspaceRouter.get(    "/",                    workspaceController.getMyWorkspaces);
workspaceRouter.get(    "/:workspaceId",        requireWorkspaceRole("MEMBER"),  workspaceController.getById);
workspaceRouter.patch(  "/:workspaceId",        requireWorkspaceRole("ADMIN"),   validate(updateWorkspaceSchema), workspaceController.update);
workspaceRouter.delete( "/:workspaceId",        requireWorkspaceRole("OWNER"),   workspaceController.delete);

// ─── Member Management ─────────────────────────────────────────
workspaceRouter.get(    "/:workspaceId/members",              requireWorkspaceRole("MEMBER"), workspaceController.getMembers);
workspaceRouter.patch(  "/:workspaceId/members/:memberId",    requireWorkspaceRole("ADMIN"),  validate(updateMemberRoleSchema), workspaceController.updateMemberRole);
workspaceRouter.delete( "/:workspaceId/members/:memberId",    requireWorkspaceRole("ADMIN"),  workspaceController.removeMember);
workspaceRouter.post(   "/:workspaceId/leave",                requireWorkspaceRole("MEMBER"), workspaceController.leave);
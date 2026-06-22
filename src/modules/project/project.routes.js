// src/modules/project/project.routes.js

import { Router } from "express";
import { projectController } from "./project.controller.js";
import { authenticate } from "../../shared/middleware/auth.middleware.js";
import {
  requireWorkspaceRole,
  requireProjectRole,
} from "../../shared/middleware/authorization.middleware.js";
import { validate } from "../../shared/validators/validate.js";
import {
  createProjectSchema,
  updateProjectSchema,
  addProjectMemberSchema,
} from "./project.validator.js";

export const projectRouter = Router({ mergeParams: true });

projectRouter.use(authenticate);

// ─── Project CRUD ──────────────────────────────────────────────
projectRouter.post(   "/",             requireWorkspaceRole("MEMBER"), validate(createProjectSchema), projectController.create);
projectRouter.get(    "/",             requireWorkspaceRole("MEMBER"), projectController.getByWorkspace);
projectRouter.get(    "/:projectId",   requireProjectRole("VIEWER"),   projectController.getById);
projectRouter.patch(  "/:projectId",   requireProjectRole("ADMIN"),    validate(updateProjectSchema),  projectController.update);
projectRouter.delete( "/:projectId",   requireProjectRole("ADMIN"),    projectController.delete);

// ─── Project Members ───────────────────────────────────────────
projectRouter.get(    "/:projectId/members",             requireProjectRole("MEMBER"), projectController.getMembers);
projectRouter.post(   "/:projectId/members",             requireProjectRole("ADMIN"),  validate(addProjectMemberSchema), projectController.addMember);
projectRouter.delete( "/:projectId/members/:memberId",   requireProjectRole("ADMIN"),  projectController.removeMember);
import { Router } from "express";
import { sprintController } from "./sprint.controller.js";
import { authenticate } from "../../shared/middleware/auth.middleware.js";
import { requireProjectRole } from "../../shared/middleware/authorization.middleware.js";
import { validate } from "../../shared/validators/validate.js";
import {
  createSprintSchema,
  updateSprintSchema,
  addIssueToSprintSchema,
} from "./sprint.validator.js";

export const sprintRouter = Router({ mergeParams: true });

// ─── Sprint CRUD 
sprintRouter.post(
  "/",
  authenticate,
  requireProjectRole("ADMIN"),
  validate(createSprintSchema),
  sprintController.create
);

sprintRouter.get(
  "/",
  authenticate,
  requireProjectRole("VIEWER"),
  sprintController.getAll
);

sprintRouter.get(
  "/:sprintId",
  authenticate,
  requireProjectRole("VIEWER"),
  sprintController.getById
);

sprintRouter.patch(
  "/:sprintId",
  authenticate,
  requireProjectRole("ADMIN"),
  validate(updateSprintSchema),
  sprintController.update
);

sprintRouter.delete(
  "/:sprintId",
  authenticate,
  requireProjectRole("ADMIN"),
  sprintController.delete
);

// ─── Sprint Lifecycle ──────────────────────────────────────────
sprintRouter.post(
  "/:sprintId/start",
  authenticate,
  requireProjectRole("ADMIN"),
  sprintController.start
);

sprintRouter.post(
  "/:sprintId/complete",
  authenticate,
  requireProjectRole("ADMIN"),
  sprintController.complete
);

// ─── Sprint Issues ─────────────────────────────────────────────
sprintRouter.get(
  "/:sprintId/issues",
  authenticate,
  requireProjectRole("VIEWER"),
  sprintController.getIssues
);

sprintRouter.post(
  "/:sprintId/issues",
  authenticate,
  requireProjectRole("MEMBER"),
  validate(addIssueToSprintSchema),
  sprintController.addIssue
);

sprintRouter.delete(
  "/:sprintId/issues/:issueId",
  authenticate,
  requireProjectRole("MEMBER"),
  sprintController.removeIssue
);
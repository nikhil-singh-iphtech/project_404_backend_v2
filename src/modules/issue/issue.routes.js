

import { Router } from "express";
import { issueController } from "./issue.controller.js";
import { authenticate } from "../../shared/middleware/auth.middleware.js";
import { requireProjectRole } from "../../shared/middleware/authorization.middleware.js";
import { validate } from "../../shared/validators/validate.js";
import {
  createIssueSchema,
  updateIssueSchema,
  updateStatusSchema,
  moveIssueSchema,
} from "./issue.validator.js";

export const issueRouter = Router({ mergeParams: true });

// ─── Board ────────────────────────────────────────────────────
issueRouter.get(
  "/board",
  authenticate,
  requireProjectRole("VIEWER"),
  issueController.getBoard
);

issueRouter.patch(
  "/board/issues/:issueId/move",
  authenticate,
  requireProjectRole("MEMBER"),
  validate(moveIssueSchema),
  issueController.moveIssue
);

// ─── Issues CRUD ──────────────────────────────────────────────
issueRouter.post(
  "/",
  authenticate,
  requireProjectRole("MEMBER"),
  validate(createIssueSchema),
  issueController.create
);

issueRouter.get(
  "/",
  authenticate,
  requireProjectRole("VIEWER"),
  issueController.getAll
);

issueRouter.get(
  "/:issueId",
  authenticate,
  requireProjectRole("VIEWER"),
  issueController.getById
);

issueRouter.patch(
  "/:issueId",
  authenticate,
  requireProjectRole("MEMBER"),
  validate(updateIssueSchema),
  issueController.update
);

issueRouter.patch(
  "/:issueId/status",
  authenticate,
  requireProjectRole("MEMBER"),
  validate(updateStatusSchema),
  issueController.updateStatus
);

issueRouter.get(
  "/:issueId/subtasks",
  authenticate,
  requireProjectRole("VIEWER"),
  issueController.getSubtasks
);

issueRouter.delete(
  "/:issueId",
  authenticate,
  requireProjectRole("ADMIN"),
  issueController.delete
);
// src/modules/comment/comment.routes.js

import { Router } from "express";
import { commentController } from "./comment.controller.js";
import { authenticate } from "../../shared/middleware/auth.middleware.js";
import { requireProjectRole } from "../../shared/middleware/authorization.middleware.js";
import { validate } from "../../shared/validators/validate.js";
import {
  createCommentSchema,
  updateCommentSchema,
} from "./comment.validator.js";

export const commentRouter = Router({ mergeParams: true });

commentRouter.post(
  "/",
  authenticate,
  requireProjectRole("MEMBER"),
  validate(createCommentSchema),
  commentController.create
);

commentRouter.get(
  "/",
  authenticate,
  requireProjectRole("VIEWER"),
  commentController.getAll
);

commentRouter.patch(
  "/:commentId",
  authenticate,
  requireProjectRole("MEMBER"),
  validate(updateCommentSchema),
  commentController.update
);

commentRouter.delete(
  "/:commentId",
  authenticate,
  requireProjectRole("MEMBER"),
  commentController.delete
);
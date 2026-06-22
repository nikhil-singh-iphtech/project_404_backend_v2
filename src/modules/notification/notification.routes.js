// src/modules/notification/notification.routes.js

import { Router } from "express";
import { notificationController } from "./notification.controller.js";
import { authenticate } from "../../shared/middleware/auth.middleware.js";

export const notificationRouter = Router();

/**
 * All notification routes are user-scoped.
 * No workspace or project params needed —
 * notifications belong to the logged-in user.
 */
notificationRouter.use(authenticate);

notificationRouter.get(
  "/",
  notificationController.getAll
);

notificationRouter.get(
  "/unread-count",
  notificationController.getUnreadCount
);

notificationRouter.patch(
  "/read-all",
  notificationController.markAllAsRead
);

notificationRouter.patch(
  "/:notificationId/read",
  notificationController.markAsRead
);

notificationRouter.delete(
  "/:notificationId",
  notificationController.delete
);
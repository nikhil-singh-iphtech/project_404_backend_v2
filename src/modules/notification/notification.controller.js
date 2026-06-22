// src/modules/notification/notification.controller.js

import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { ApiResponse } from "../../shared/utils/ApiResponse.js";
import { notificationService } from "./notification.service.js";

class NotificationController {
  getAll = asyncHandler(async (req, res) => {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await notificationService.getNotifications(
      req.user._id,
      { page, limit }
    );

    ApiResponse.paginated(
      res,
      "Notifications fetched successfully",
      result.notifications,
      {
        page:       result.page,
        limit:      result.limit,
        total:      result.total,
        totalPages: result.totalPages,
      }
    );
  });

  getUnreadCount = asyncHandler(async (req, res) => {
    const result = await notificationService.getUnreadCount(req.user._id);
    ApiResponse.success(res, 200, "Unread count fetched", result);
  });

  markAsRead = asyncHandler(async (req, res) => {
    const notification = await notificationService.markAsRead(
      req.params.notificationId,
      req.user._id
    );
    ApiResponse.success(res, 200, "Notification marked as read", {
      notification,
    });
  });

  markAllAsRead = asyncHandler(async (req, res) => {
    await notificationService.markAllAsRead(req.user._id);
    ApiResponse.noContent(res);
  });

  delete = asyncHandler(async (req, res) => {
    await notificationService.deleteNotification(
      req.params.notificationId,
      req.user._id
    );
    ApiResponse.noContent(res);
  });
}

export const notificationController = new NotificationController();
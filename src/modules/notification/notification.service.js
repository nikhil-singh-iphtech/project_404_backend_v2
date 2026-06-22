// src/modules/notification/notification.service.js

import { notificationRepository } from "./notification.repository.js";
import { AppError } from "../../shared/errors/AppError.js";
import { ErrorCodes } from "../../shared/errors/ErrorCodes.js";
import { NOTIFICATION_TYPES } from "../../shared/constants/notification.constants.js";
import { logger } from "../../shared/utils/logger.js";
import { getIO } from "../../socket/socket.server.js";
import { emitToUser } from "../../socket/socket.rooms.js";
import { SOCKET_EVENTS } from "../../socket/socket.events.js";

class NotificationService {
  /**
   * Core notification creator.
   * Called by other services — never by the user directly.
   *
   * Like activityService.log(), this never throws.
   * Notification failure must never break the main operation.
   */
  async notify({
    recipientId,
    senderId,
    type,
    message,
    workspaceId = null,
    projectId   = null,
    issueId     = null,
    link        = null,
  }) {
    try {
      /**
       * Never notify yourself.
       * If John assigns an issue to himself,
       * John should not get a notification.
       */
      if (
        recipientId &&
        senderId &&
        recipientId.toString() === senderId.toString()
      ) {
        return;
      }

      const notification=await notificationRepository.create({
        recipient:   recipientId,
        sender:      senderId   || null,
        type,
        message,
        workspaceId,
        projectId,
        issueId,
        link,
      });


       try {
      emitToUser(
        getIO(),
        recipientId.toString(),
        SOCKET_EVENTS.NOTIFICATION_NEW,
        { notification }
      );
    } catch (socketError) {
      logger.warn(`Notification socket emit failed: ${socketError.message}`);
    }
    
    } catch (error) {
      logger.error(`Notification creation failed: ${error.message}`, {
        type,
        recipientId,
      });
    }
  }

  /**
   * Notifies multiple recipients at once.
   * More efficient than calling notify() in a loop.
   */
  async notifyMany({
    recipientIds,
    senderId,
    type,
    message,
    workspaceId = null,
    projectId   = null,
    issueId     = null,
    link        = null,
  }) {
    try {
      /**
       * Filter out the sender from recipients.
       * Nobody gets notified about their own actions.
       */
      const filteredRecipients = recipientIds.filter(
        (id) => id.toString() !== senderId?.toString()
      );

      if (!filteredRecipients.length) return;

      const notifications = filteredRecipients.map((recipientId) => ({
        recipient:   recipientId,
        sender:      senderId   || null,
        type,
        message,
        workspaceId,
        projectId,
        issueId,
        link,
        isRead:      false,
        readAt:      null,
        createdAt:   new Date(),
      }));

      await notificationRepository.createMany(notifications);
    } catch (error) {
      logger.error(`Bulk notification creation failed: ${error.message}`, {
        type,
        recipientIds,
      });
    }
  }

  // ─── User-facing methods ────────────────────────────────────

  async getNotifications(recipientId, { page, limit }) {
    return notificationRepository.findByRecipient(
      recipientId,
      { page, limit }
    );
  }

  async getUnreadCount(recipientId) {
    const count = await notificationRepository.getUnreadCount(recipientId);
    return { count };
  }

  async markAsRead(notificationId, recipientId) {
    const notification = await notificationRepository.markAsRead(
      notificationId,
      recipientId
    );

    if (!notification) {
      throw new AppError(
        "Notification not found.",
        404,
        ErrorCodes.NOTIFICATION_NOT_FOUND
      );
    }

    return notification;
  }

  async markAllAsRead(recipientId) {
    await notificationRepository.markAllAsRead(recipientId);
  }

  async deleteNotification(notificationId, recipientId) {
    const notification = await notificationRepository.deleteNotification(
      notificationId,
      recipientId
    );

    if (!notification) {
      throw new AppError(
        "Notification not found.",
        404,
        ErrorCodes.NOTIFICATION_NOT_FOUND
      );
    }
  }
}

export const notificationService = new NotificationService();
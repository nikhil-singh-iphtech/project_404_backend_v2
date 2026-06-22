// src/modules/notification/notification.repository.js

import { BaseRepository } from "../../shared/repositories/BaseRepository.js";
import { NotificationModel } from "./notification.model.js";

class NotificationRepository extends BaseRepository {
  constructor() {
    super(NotificationModel);
  }

  async findByRecipient(recipientId, { page = 1, limit = 20 }) {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      NotificationModel.find({ recipient: recipientId })
        .populate("sender", "name email profilePicture")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      NotificationModel.countDocuments({ recipient: recipientId }),
    ]);

    return {
      notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUnreadCount(recipientId) {
    return NotificationModel.countDocuments({
      recipient: recipientId,
      isRead:    false,
    });
  }

  async markAsRead(notificationId, recipientId) {
    return NotificationModel.findOneAndUpdate(
      { _id: notificationId, recipient: recipientId },
      { $set: { isRead: true, readAt: new Date() } },
      { returnDocument: "after" }
    );
  }

  async markAllAsRead(recipientId) {
    return NotificationModel.updateMany(
      { recipient: recipientId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
  }

  async deleteNotification(notificationId, recipientId) {
    return NotificationModel.findOneAndDelete({
      _id:       notificationId,
      recipient: recipientId,
    });
  }

  /**
   * Creates multiple notifications in one DB operation.
   * Used when multiple users need to be notified of the same event.
   */
  async createMany(notifications) {
    return NotificationModel.insertMany(notifications, { ordered: false });
  }
}

export const notificationRepository = new NotificationRepository();
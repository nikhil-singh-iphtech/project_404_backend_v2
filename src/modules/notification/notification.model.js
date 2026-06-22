import mongoose from "mongoose";
import { NOTIFICATION_TYPES } from "../../shared/constants/notification.constants.js";

const notificationSchema = new mongoose.Schema(
  {
    /**
     * Who receives this notification.
     * Every notification belongs to exactly one user.
     * If 5 users need to be notified, 5 records are created.
     *
     * Why one record per recipient instead of an array of recipients?
     * Each user has independent read/unread state.
     * User A reads it, User B hasn't — impossible with a shared record.
     */
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /**
     * Who triggered this notification.
     * Null for system-generated notifications.
     */
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: true,
    },

    /**
     * Human readable message shown in the notification.
     * Pre-rendered on the backend so frontend just displays it.
     *
     * Example: "John assigned BACK-5 to you"
     */
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },

    // ─── Context references ──────────────────────────────────
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      default: null,
    },

    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },

    issueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Issue",
      default: null,
    },

    /**
     * Deep link for the frontend.
     * Clicking the notification navigates here.
     * Example: "/workspaces/acme-corp/projects/BACK/issues/BACK-5"
     */
    link: {
      type: String,
      default: null,
    },

    // ─── State ───────────────────────────────────────────────
    isRead: {
      type: Boolean,
      default: false,
    },

    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    updatedAt: false,
  }
);

// ─── Indexes ──────────────────────────────────────────────────
/**
 * Primary query: get all notifications for a user
 * sorted by newest first.
 */
notificationSchema.index({ recipient: 1, createdAt: -1 });

/**
 * Unread count query — very frequent, needs to be fast.
 */
notificationSchema.index({ recipient: 1, isRead: 1 });

/**
 * Cleanup old notifications — TTL index auto-deletes
 * notifications older than 90 days.
 * Prevents the collection from growing unboundedly.
 */
notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

export const NotificationModel = mongoose.model(
  "Notification",
  notificationSchema
);
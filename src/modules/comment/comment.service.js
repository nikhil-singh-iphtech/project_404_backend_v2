// src/modules/comment/comment.service.js

import { commentRepository } from "./comment.repository.js";
import { issueRepository } from "../issue/issue.repository.js";
import { notificationService } from "../notification/notification.service.js";
import { activityService } from "../activity/activity.service.js";
import { getIO } from "../../socket/socket.server.js";
import { emitToProject } from "../../socket/socket.rooms.js";
import { SOCKET_EVENTS } from "../../socket/socket.events.js";
import { NOTIFICATION_TYPES } from "../../shared/constants/notification.constants.js";
import { ACTIVITY_TYPES } from "../../shared/constants/activity.constants.js";
import { AppError } from "../../shared/errors/AppError.js";
import { ErrorCodes } from "../../shared/errors/ErrorCodes.js";
import { logger } from "../../shared/utils/logger.js";

class CommentService {
  async createComment(
    { content },
    issueId,
    projectId,
    workspaceId,
    authorId
  ) {
    // Verify issue exists before adding comment — reuse this single fetch
    const issue = await issueRepository.findById(issueId);

    if (!issue) {
      throw new AppError(
        "Issue not found.",
        404,
        ErrorCodes.ISSUE_NOT_FOUND
      );
    }

    const comment = await commentRepository.create({
      content,
      issueId,
      projectId,
      workspaceId,
      author: authorId,
    });

    const populated = await commentRepository.findByIdWithAuthor(comment._id);

    // ─── Activity Log ──────────────────────────────────────────
    activityService.log({
      actor: authorId,
      type: ACTIVITY_TYPES.COMMENT_ADDED,
      workspaceId,
      projectId,
      issueId,
      metadata: {
        commentId: comment._id,
        preview: content.substring(0, 100),
      },
    });

    // ─── Notifications ─────────────────────────────────────────
    /**
     * Notify all participants:
     * - The issue reporter
     * - All assignees
     * Exclude the comment author — no self-notifications
     * (notificationService.notifyMany already filters the sender out).
     */
    const participants = [
      issue.reporter,
      ...issue.assignees,
    ].filter(Boolean);

    notificationService.notifyMany({
      recipientIds: participants,
      senderId: authorId,
      type: NOTIFICATION_TYPES.ISSUE_COMMENT_ADDED,
      message: `New comment on ${issue.issueCode}: "${content.substring(0, 60)}${content.length > 60 ? "..." : ""}"`,
      workspaceId,
      projectId,
      issueId,
      link: `/workspaces/${workspaceId}/projects/${projectId}/issues/${issueId}`,
    });

    // ─── Real-Time Emit ────────────────────────────────────────
    try {
      emitToProject(
        getIO(),
        projectId.toString(),
        SOCKET_EVENTS.COMMENT_ADDED,
        {
          comment: populated,
          issueId,
          projectId,
        }
      );
    } catch (error) {
      logger.warn(`Socket emit failed on comment create: ${error.message}`);
    }

    return populated;
  }

  async getComments(issueId, { page, limit }) {
    return commentRepository.findByIssue(issueId, { page, limit });
  }

  async updateComment(commentId, { content }, userId) {
    const comment = await commentRepository.findById(commentId);

    if (!comment) {
      throw new AppError(
        "Comment not found.",
        404,
        ErrorCodes.COMMENT_NOT_FOUND
      );
    }

    /**
     * Ownership check — only the author can edit.
     * This is record-level ownership, not role-based.
     * Even a project ADMIN cannot edit someone else's comment.
     */
    if (comment.author.toString() !== userId.toString()) {
      throw new AppError(
        "You can only edit your own comments.",
        403,
        ErrorCodes.COMMENT_FORBIDDEN
      );
    }

    const updated = await commentRepository.updateById(commentId, {
      content,
      isEdited: true,
      editedAt: new Date(),
    });

    const populated = await commentRepository.findByIdWithAuthor(updated._id);

    // ─── Activity Log ──────────────────────────────────────────
    activityService.log({
      actor: userId,
      type: ACTIVITY_TYPES.COMMENT_UPDATED,
      workspaceId: comment.workspaceId,
      projectId: comment.projectId,
      issueId: comment.issueId,
      metadata: {
        commentId,
      },
    });

    // ─── Real-Time Emit ────────────────────────────────────────
    try {
      emitToProject(
        getIO(),
        comment.projectId.toString(),
        SOCKET_EVENTS.COMMENT_UPDATED,
        {
          comment: populated,
          issueId: comment.issueId,
          projectId: comment.projectId,
        }
      );
    } catch (error) {
      logger.warn(`Socket emit failed on comment update: ${error.message}`);
    }

    return populated;
  }

  async deleteComment(commentId, userId, userRole) {
    const comment = await commentRepository.findById(commentId);

    if (!comment) {
      throw new AppError(
        "Comment not found.",
        404,
        ErrorCodes.COMMENT_NOT_FOUND
      );
    }

    /**
     * Deletion is allowed if:
     * 1. The user is the comment author  OR
     * 2. The user is a project ADMIN
     *
     * Why allow ADMIN to delete?
     * Moderation — admins need to remove inappropriate content
     * without being the author.
     */
    const isAuthor = comment.author.toString() === userId.toString();
    const isAdmin = userRole === "ADMIN";

    if (!isAuthor && !isAdmin) {
      throw new AppError(
        "You do not have permission to delete this comment.",
        403,
        ErrorCodes.COMMENT_FORBIDDEN
      );
    }

    // ─── Activity Log ──────────────────────────────────────────
    activityService.log({
      actor: userId,
      type: ACTIVITY_TYPES.COMMENT_DELETED,
      workspaceId: comment.workspaceId,
      projectId: comment.projectId,
      issueId: comment.issueId,
      metadata: {
        commentId,
      },
    });

    // ─── Real-Time Emit ────────────────────────────────────────
    try {
      emitToProject(
        getIO(),
        comment.projectId.toString(),
        SOCKET_EVENTS.COMMENT_DELETED,
        {
          commentId,
          issueId: comment.issueId,
          projectId: comment.projectId,
        }
      );
    } catch (error) {
      logger.warn(`Socket emit failed on comment delete: ${error.message}`);
    }

    await commentRepository.deleteById(commentId);
  }
}

export const commentService = new CommentService();
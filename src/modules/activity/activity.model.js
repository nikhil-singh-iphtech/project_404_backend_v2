// src/modules/activity/activity.model.js

import mongoose from "mongoose";
import { ACTIVITY_TYPES } from "../../shared/constants/activity.constants.js";

const activitySchema = new mongoose.Schema(
  {
    /**
     * Who performed the action.
     */
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /**
     * What type of action was performed.
     * Machine-readable string — frontend maps this
     * to a human-readable sentence.
     */
    type: {
      type: String,
      enum: Object.values(ACTIVITY_TYPES),
      required: true,
    },

    /**
     * Context references — all optional depending on type.
     * An issue activity has issueId.
     * A project activity might not have issueId.
     * A workspace activity might not have projectId or issueId.
     */
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
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
     * Flexible metadata about what changed.
     * Different activity types store different data here.
     *
     * Examples:
     * ISSUE_STATUS_CHANGED: { from: "TODO", to: "IN_PROGRESS" }
     * ISSUE_ASSIGNED:       { assignee: { _id, name } }
     * ISSUE_CREATED:        { issueCode: "BACK-1", title: "..." }
     * COMMENT_ADDED:        { commentId: "...", preview: "First 100 chars..." }
     * SPRINT_STARTED:       { sprintName: "Sprint 1" }
     *
     * Why not separate fields for each type?
     * Too many nullable columns for each possible combination.
     * A flexible object is cleaner and extensible.
     */
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    /**
     * Activities are never updated — only created and read.
     * Disable the updatedAt field to save storage.
     */
    updatedAt: false,
  }
);

// ─── Indexes ──────────────────────────────────────────────────
/**
 * Primary query patterns:
 * 1. All activities for an issue   (issue timeline)
 * 2. All activities for a project  (project feed)
 * 3. All activities for a workspace (workspace feed)
 * All sorted by most recent first.
 */
activitySchema.index({ issueId: 1,     createdAt: -1 });
activitySchema.index({ projectId: 1,   createdAt: -1 });
activitySchema.index({ workspaceId: 1, createdAt: -1 });
activitySchema.index({ actor: 1,       createdAt: -1 });

export const ActivityModel = mongoose.model("Activity", activitySchema);
// src/modules/project/project.model.js

import mongoose from "mongoose";
import { PROJECT_STATUSES } from "../../shared/constants/project.constants.js";

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    /**
     * Short identifier used as issue prefix.
     * e.g. key: "BACKEND" → issues become BACKEND-1, BACKEND-2
     * Jira calls this the "project key".
     */
    key: {
      type: String,
      required: [true, "Project key is required"],
      trim: true,
      uppercase: true,
      minlength: [2, "Key must be at least 2 characters"],
      maxlength: [10, "Key cannot exceed 10 characters"],
      match: [/^[A-Z0-9]+$/, "Key can only contain uppercase letters and numbers"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: null,
    },

    /**
     * Every project belongs to exactly one workspace.
     * This is the primary relationship — projects cannot exist without workspaces.
     */
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },

    /**
     * Who created the project.
     * Automatically gets PROJECT ADMIN role in ProjectMember.
     */
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: Object.values(PROJECT_STATUSES),
      default: PROJECT_STATUSES.ACTIVE,
    },

    emoji: {
      type: String,
      default: "📋",
    },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────
/**
 * key must be unique within a workspace — two projects in the
 * same workspace cannot share a key. But "BACKEND" can exist
 * in workspace A and workspace B.
 */
projectSchema.index({ workspaceId: 1, key: 1 }, { unique: true });
projectSchema.index({ workspaceId: 1 });          // "All projects in workspace"
projectSchema.index({ createdBy: 1 });            // "Projects I created"

export const ProjectModel = mongoose.model("Project", projectSchema);
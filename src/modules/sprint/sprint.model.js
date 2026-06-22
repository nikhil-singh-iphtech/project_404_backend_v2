import mongoose from "mongoose";
import { SPRINT_STATUSES } from "../../shared/constants/sprint.constants.js";

const sprintSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Sprint name is required"],
      trim: true,
      maxlength: [100, "Sprint name cannot exceed 100 characters"],
    },

    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },

    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },

    status: {
      type: String,
      enum: Object.values(SPRINT_STATUSES),
      default: SPRINT_STATUSES.PLANNED,
    },

    startDate: {
      type: Date,
      default: null,
    },

    endDate: {
      type: Date,
      default: null,
    },

    /**
     * Actual date the sprint was started.
     * Different from startDate — startDate is planned,
     * startedAt is when the ADMIN actually clicked start.
     */
    startedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    goal: {
      type: String,
      trim: true,
      maxlength: [500, "Sprint goal cannot exceed 500 characters"],
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /**
     * Velocity tracking — populated when sprint is completed.
     * Used by Dashboard phase for burndown charts.
     */
    totalIssues: {
      type: Number,
      default: 0,
    },

    completedIssues: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────
sprintSchema.index({ projectId: 1, status: 1 });
sprintSchema.index({ projectId: 1, createdAt: -1 });
sprintSchema.index({ workspaceId: 1 });

export const SprintModel = mongoose.model("Sprint", sprintSchema);


import mongoose from "mongoose";
import {
  ISSUE_TYPES,
  ISSUE_STATUSES,
  ISSUE_PRIORITIES,
} from "../../shared/constants/issue.constants.js";

const issueSchema = new mongoose.Schema(
  {
    
    title: {
      type: String,
      required: [true, "Issue title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [255, "Title cannot exceed 255 characters"],
    },

    description: {
      type: String,
      default: null,
      maxlength: [50000, "Description cannot exceed 50000 characters"],
    },

    /**
     * Auto-generated sequential number per project.
     * BACK-1, BACK-2, BACK-3...
     *
     * Why store the number here and not generate on read?
     * Because generating on read requires counting all previous
     * issues — expensive at scale. Store it once on create.
     *
     * Why not use MongoDB _id?
     * _id is a hex string — not human readable.
     * Issue numbers need to be memorable and typeable.
     */
    issueNumber: {
      type: Number,
      required: true,
    },

    /**
     * Human readable reference: "BACK-42"
     * Derived from project.key + issueNumber.
     * Stored for fast lookups and display.
     */
    issueCode: {
      type: String,
      required: true,
      uppercase: true,
    },

    // ─── Classification ───────────────────────────────────────
    type: {
      type: String,
      enum: Object.values(ISSUE_TYPES),
      required: [true, "Issue type is required"],
    },

    status: {
      type: String,
      enum: Object.values(ISSUE_STATUSES),
      default: ISSUE_STATUSES.TODO,
    },

    priority: {
      type: String,
      enum: Object.values(ISSUE_PRIORITIES),
      default: ISSUE_PRIORITIES.MEDIUM,
    },

    // ─── Relationships ────────────────────────────────────────
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

    /**
     * Self-referencing relationship.
     *
     * Epic → Stories:   story.parentId = epic._id
     * Issue → Subtasks: subtask.parentId = issue._id
     *
     * Why a single parentId instead of separate epicId + parentId?
     * Simpler queries, one field to check, easier to traverse.
     * Trade-off: you lose the ability to distinguish
     * "belongs to epic" from "is a subtask of task" without
     * checking the parent's type. Acceptable trade-off.
     */
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Issue",
      default: null,
    },

    // ─── Assignment ───────────────────────────────────────────
    assignees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ─── Sprint ───────────────────────────────────────────────
    /**
     * Optional — issues can exist outside of sprints (backlog).
     * Null = backlog item.
     */
    sprintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sprint",
      default: null,
    },

    // ─── Metadata ─────────────────────────────────────────────
    labels: [
      {
        type: String,
        trim: true,
        maxlength: 50,
      },
    ],

    dueDate: {
      type: Date,
      default: null,
    },

    estimatedHours: {
      type: Number,
      min: 0,
      default: null,
    },

    /**
     * Used for ordering issues within a Kanban column.
     * Lower number = higher position.
     * When an issue is moved, only the affected issues
     * get their order updated — not the entire column.
     */
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────
/**
 * Compound unique index — issueCode must be unique per project.
 * BACK-1 can exist in project A and project B.
 * But only one BACK-1 per project.
 */
issueSchema.index({ projectId: 1, issueCode: 1 }, { unique: true });
issueSchema.index({ projectId: 1, issueNumber: 1 }, { unique: true });
issueSchema.index({ workspaceId: 1 });
issueSchema.index({ projectId: 1, status: 1 });         // Kanban board query
issueSchema.index({ projectId: 1, type: 1 });           // Filter by type
issueSchema.index({ assignees: 1 });                    // My issues query
issueSchema.index({ parentId: 1 });                     // Get children query
issueSchema.index({ sprintId: 1 });                     // Sprint board query
issueSchema.index({ projectId: 1, order: 1 });          // Ordered list query
issueSchema.index({ reporter: 1 });                     // Reported by me query

export const IssueModel = mongoose.model("Issue", issueSchema);
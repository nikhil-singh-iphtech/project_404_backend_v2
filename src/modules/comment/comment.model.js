import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, "Comment content is required"],
      trim: true,
      minlength: [1, "Comment cannot be empty"],
      maxlength: [5000, "Comment cannot exceed 5000 characters"],
    },

    issueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Issue",
      required: true,
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

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /**
     * Tracks whether this comment was edited after creation.
     * Frontend shows "edited" label when true.
     */
    isEdited: {
      type: Boolean,
      default: false,
    },

    editedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────
/**
 * Primary query pattern: get all comments for an issue
 * sorted by creation time (oldest first = natural conversation).
 */
commentSchema.index({ issueId: 1, createdAt: 1 });
commentSchema.index({ author: 1 });
commentSchema.index({ projectId: 1 });

export const CommentModel = mongoose.model("Comment", commentSchema);
// src/modules/issue/issueSequence.model.js

import mongoose from "mongoose";

/**
 * Atomic counter for issue numbering per project.
 *
 * WHY a separate collection instead of storing count on Project?
 *
 * Race condition scenario without atomic counter:
 *   User A reads project.issueCount = 5
 *   User B reads project.issueCount = 5
 *   User A creates issue → BACK-6
 *   User B creates issue → BACK-6 (DUPLICATE!)
 *
 * MongoDB's findOneAndUpdate with $inc is atomic.
 * The counter increments and returns the new value
 * in a single operation — no race condition possible.
 *
 * This is the standard pattern used by Jira, Linear, GitHub.
 */
const issueSequenceSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
    unique: true,
  },
  seq: {
    type: Number,
    default: 0,
  },
});

export const IssueSequenceModel = mongoose.model(
  "IssueSequence",
  issueSequenceSchema
);
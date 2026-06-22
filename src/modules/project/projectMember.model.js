// src/modules/project/projectMember.model.js

import mongoose from "mongoose";
import { PROJECT_ROLES } from "../../shared/constants/roles.constants.js";

const projectMemberSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(PROJECT_ROLES),
      default: PROJECT_ROLES.MEMBER,
    },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────
projectMemberSchema.index({ projectId: 1, userId: 1 }, { unique: true });
projectMemberSchema.index({ projectId: 1 });
projectMemberSchema.index({ userId: 1, workspaceId: 1 });

export const ProjectMemberModel = mongoose.model("ProjectMember", projectMemberSchema);
// src/modules/invitation/invitation.model.js

import mongoose from "mongoose";
import { WORKSPACE_ROLES } from "../../shared/constants/roles.constants.js";
import { INVITATION_STATUSES } from "../../shared/constants/invitation.constant.js";

const invitationSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    role: {
      type: String,
      enum: Object.values(WORKSPACE_ROLES),
      default: WORKSPACE_ROLES.MEMBER,
    },

    /**
     * The user who sent the invite.
     * Must be OWNER or ADMIN of the workspace.
     */
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /**
     * Secure random token — sent in the invite email link.
     * Never expose the raw token in API responses.
     * Store hashed, compare hashed. (same principle as OTP)
     */
    token: {
      type: String,
      required: true,
      select: false,
    },

    status: {
      type: String,
      enum: Object.values(INVITATION_STATUSES),
      default: INVITATION_STATUSES.PENDING,
    },

    expiresAt: {
      type: Date,
      required: true,
      /**
       * TTL index — MongoDB automatically deletes expired
       * invitations. No cron job needed.
       */
    },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────
invitationSchema.index({ token: 1 });
invitationSchema.index({ email: 1, workspaceId: 1 });
invitationSchema.index({ workspaceId: 1, status: 1 });

/**
 * TTL index — auto-deletes documents after expiresAt.
 * MongoDB checks this every 60 seconds.
 */
invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const InvitationModel = mongoose.model("Invitation", invitationSchema);
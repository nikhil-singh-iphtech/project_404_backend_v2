// src/modules/invitation/invitation.service.js

import { invitationRepository } from "./invitation.repository.js";
import { workspaceRepository } from "../workspace/workspace.repository.js";
import { emailService } from "../../shared/services/email.service.js";
import { AppError } from "../../shared/errors/AppError.js";
import { ErrorCodes } from "../../shared/errors/ErrorCodes.js";
import { INVITATION_STATUSES } from "../../shared/constants/invitation.constant.js";
import { config } from "../../config/app.config.js";

import { notificationService } from "../notification/notification.service.js";
import { NOTIFICATION_TYPES }  from "../../shared/constants/notification.constants.js";


class InvitationService {
  async sendInvitation({ workspaceId, email, role, invitedBy }) {
    // Block if already a workspace member
    const { UserModel } = await import("../auth/auth.model.js");
    const existingUser = await UserModel.findOne({ email });

    if (existingUser) {
      const isMember = await workspaceRepository.findMember({
        workspaceId,
        userId: existingUser._id,
      });

      if (isMember) {
        throw new AppError(
          "This user is already a member of the workspace.",
          409,
          ErrorCodes.INVITATION_ALREADY_MEMBER
        );
      }
    }

    // Cancel any existing pending invite for this email + workspace
    const existingInvite = await invitationRepository.findPendingByEmailAndWorkspace(
      email,
      workspaceId
    );

    if (existingInvite) {
      await invitationRepository.updateById(existingInvite._id, {
        status: INVITATION_STATUSES.REVOKED,
      });
    }

    const rawToken = await invitationRepository.createInvitation({
      workspaceId,
      email,
      role,
      invitedBy: invitedBy._id,
    });

    console.log(rawToken)                                   // delete it later

    const inviteUrl = `${config.CLIENT_URL}/invitations/accept?token=${rawToken}`;

    await emailService.sendInvitationEmail({
      to:            email,
      inviterName:   invitedBy.name,
      workspaceName: invitedBy.workspaceName,
      inviteUrl,
      role,
    });

    return { message: "Invitation sent successfully." };
  }

 // src/modules/invitation/invitation.service.js
// Update acceptInvitation method

async acceptInvitation(rawToken, userId) {
  const invitation = await invitationRepository.findByToken(rawToken);

  if (!invitation) {
    throw new AppError("Invalid invitation token.", 404, ErrorCodes.INVITATION_NOT_FOUND);
  }

  if (invitation.status === INVITATION_STATUSES.REVOKED) {
    throw new AppError("This invitation has been revoked.", 400, ErrorCodes.INVITATION_REVOKED);
  }

  if (invitation.status === INVITATION_STATUSES.ACCEPTED) {
    throw new AppError("This invitation has already been accepted.", 400, ErrorCodes.INVITATION_ALREADY_ACCEPTED);
  }

  if (invitation.expiresAt < new Date()) {
    throw new AppError("This invitation has expired.", 400, ErrorCodes.INVITATION_EXPIRED);
  }

  /**
   * NEW — verify the accepting user's email matches
   * the email the invite was sent to.
   *
   * Why? Without this, if Alice forwards the invite link
   * to Bob, Bob can accept it and join as Alice's role.
   * The invite was meant for Alice, not Bob.
   */
  const { UserModel } = await import("../auth/auth.model.js");
  const acceptingUser = await UserModel.findById(userId).select("email");

  if (!acceptingUser || acceptingUser.email !== invitation.email) {
    throw new AppError(
      "This invitation was sent to a different email address.",
      403,
      ErrorCodes.AUTH_FORBIDDEN
    );
  }

  const existingMember = await workspaceRepository.findMember({
    workspaceId: invitation.workspaceId,
    userId,
  });

  if (!existingMember) {
    await workspaceRepository.addMember({
      workspaceId: invitation.workspaceId,
      userId,
      role: invitation.role,
    });
  }

  await invitationRepository.updateById(invitation._id, {
    status: INVITATION_STATUSES.ACCEPTED,
  });

 
notificationService.notify({
  recipientId: userId,
  senderId:    null,  // system notification
  type:        NOTIFICATION_TYPES.WORKSPACE_MEMBER_ADDED,
  message:     `You have been added to workspace "${workspace.name}"`,
  workspaceId: invitation.workspaceId,
  link:        `/workspaces/${invitation.workspaceId}`,
});


  return { workspaceId: invitation.workspaceId };
}

  async revokeInvitation(invitationId, workspaceId) {
    const invitation = await invitationRepository.findById(invitationId);

    if (!invitation || invitation.workspaceId.toString() !== workspaceId.toString()) {
      throw new AppError("Invitation not found.", 404, ErrorCodes.INVITATION_NOT_FOUND);
    }

    await invitationRepository.updateById(invitationId, {
      status: INVITATION_STATUSES.REVOKED,
    });
  }

  async getWorkspaceInvitations(workspaceId) {
    return invitationRepository.findAllByWorkspace(workspaceId);
  }

  

async getInvitationDetails(rawToken) {
  /**
   * Public endpoint — no auth required.
   * Returns just enough info to render the invite landing page.
   * Never returns the hashed token or sensitive workspace data.
   */
  const invitation = await invitationRepository.findByToken(rawToken);

  if (!invitation) {
    throw new AppError("Invalid invitation token.", 404, ErrorCodes.INVITATION_NOT_FOUND);
  }

  if (invitation.status !== INVITATION_STATUSES.PENDING) {
    throw new AppError(
      "This invitation is no longer valid.",
      400,
      ErrorCodes.INVITATION_REVOKED
    );
  }

  if (invitation.expiresAt < new Date()) {
    throw new AppError("This invitation has expired.", 400, ErrorCodes.INVITATION_EXPIRED);
  }

  const workspace = await workspaceRepository.findById(invitation.workspaceId);

  return {
    email:         invitation.email,
    role:          invitation.role,
    workspaceName: workspace?.name,
    workspaceLogo: workspace?.logo,
    expiresAt:     invitation.expiresAt,
  };
}
}

export const invitationService = new InvitationService();
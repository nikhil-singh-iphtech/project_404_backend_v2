// src/modules/invitation/invitation.controller.js

import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { ApiResponse } from "../../shared/utils/ApiResponse.js";
import { invitationService } from "./invitation.service.js";
import { workspaceRepository } from "../workspace/workspace.repository.js";

class InvitationController {
  send = asyncHandler(async (req, res) => {
    const workspace = await workspaceRepository.findById(req.params.workspaceId);
    console.log(workspace)

    const result = await invitationService.sendInvitation({
      workspaceId: req.params.workspaceId,
      email:       req.body.email,
      role:        req.body.role,
      invitedBy:   { ...req.user.toObject(), workspaceName: workspace.name },
    });

    ApiResponse.success(res, 200, result.message);
  });

  accept = asyncHandler(async (req, res) => {
    const result = await invitationService.acceptInvitation(
      req.body.token,
      req.user._id
    );
    ApiResponse.success(res, 200, "Invitation accepted successfully", result);
  });

  revoke = asyncHandler(async (req, res) => {
    await invitationService.revokeInvitation(
      req.params.invitationId,
      req.params.workspaceId
    );
    ApiResponse.noContent(res);
  });

  getAll = asyncHandler(async (req, res) => {
    const invitations = await invitationService.getWorkspaceInvitations(
      req.params.workspaceId
    );
    ApiResponse.success(res, 200, "Invitations fetched successfully", { invitations });
  });

  

getDetails = asyncHandler(async (req, res) => {
  const result = await invitationService.getInvitationDetails(req.query.token);
  ApiResponse.success(res, 200, "Invitation details fetched", result);
});
}

export const invitationController = new InvitationController();
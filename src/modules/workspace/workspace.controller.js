// src/modules/workspace/workspace.controller.js

import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { ApiResponse } from "../../shared/utils/ApiResponse.js";
import { workspaceService } from "./workspace.service.js";

class WorkspaceController {
  create = asyncHandler(async (req, res) => {
    const workspace = await workspaceService.createWorkspace(req.body, req.user._id);
    ApiResponse.created(res, "Workspace created successfully", { workspace });
  });

  getById = asyncHandler(async (req, res) => {
    const workspace = await workspaceService.getWorkspaceById(req.params.workspaceId);
    ApiResponse.success(res, 200, "Workspace fetched successfully", { workspace });
  });

  getMyWorkspaces = asyncHandler(async (req, res) => {
    const workspaces = await workspaceService.getUserWorkspaces(req.user._id);
    ApiResponse.success(res, 200, "Workspaces fetched successfully", { workspaces });
  });

  update = asyncHandler(async (req, res) => {
    const workspace = await workspaceService.updateWorkspace(
      req.params.workspaceId,
      req.body
    );
    ApiResponse.success(res, 200, "Workspace updated successfully", { workspace });
  });

  delete = asyncHandler(async (req, res) => {
    await workspaceService.deleteWorkspace(req.params.workspaceId);
    ApiResponse.noContent(res);
  });

  getMembers = asyncHandler(async (req, res) => {
    const members = await workspaceService.getWorkspaceMembers(req.params.workspaceId);
    ApiResponse.success(res, 200, "Members fetched successfully", { members });
  });

  updateMemberRole = asyncHandler(async (req, res) => {
    const member = await workspaceService.updateMemberRole({
      workspaceId:          req.params.workspaceId,
      targetUserId:         req.params.memberId,
      role:                 req.body.role,
      requestingMembership: req.workspaceMembership,
    });
    ApiResponse.success(res, 200, "Member role updated successfully", { member });
  });

  removeMember = asyncHandler(async (req, res) => {
    await workspaceService.removeMember({
      workspaceId:          req.params.workspaceId,
      targetUserId:         req.params.memberId,
      requestingMembership: req.workspaceMembership,
    });
    ApiResponse.noContent(res);
  });

  leave = asyncHandler(async (req, res) => {
    await workspaceService.leaveWorkspace({
      workspaceId: req.params.workspaceId,
      userId:      req.user._id,
    });
    ApiResponse.noContent(res);
  });
}

export const workspaceController = new WorkspaceController();
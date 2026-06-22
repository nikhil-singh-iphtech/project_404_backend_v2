// src/modules/project/project.controller.js

import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { ApiResponse } from "../../shared/utils/ApiResponse.js";
import { projectService } from "./project.service.js";

class ProjectController {
  create = asyncHandler(async (req, res) => {
    const project = await projectService.createProject(
      { ...req.body, workspaceId: req.params.workspaceId },
      req.user._id
    );
    ApiResponse.created(res, "Project created successfully", { project });
  });

  getById = asyncHandler(async (req, res) => {
    const project = await projectService.getProjectById(req.params.projectId);
    ApiResponse.success(res, 200, "Project fetched successfully", { project });
  });

  getByWorkspace = asyncHandler(async (req, res) => {
    const projects = await projectService.getWorkspaceProjects(req.params.workspaceId);
    ApiResponse.success(res, 200, "Projects fetched successfully", { projects });
  });

  update = asyncHandler(async (req, res) => {
    const project = await projectService.updateProject(req.params.projectId, req.body);
    ApiResponse.success(res, 200, "Project updated successfully", { project });
  });

  delete = asyncHandler(async (req, res) => {
    await projectService.deleteProject(req.params.projectId);
    ApiResponse.noContent(res);
  });

  getMembers = asyncHandler(async (req, res) => {
    const members = await projectService.getProjectMembers(req.params.projectId);
    ApiResponse.success(res, 200, "Members fetched successfully", { members });
  });

  addMember = asyncHandler(async (req, res) => {
    const member = await projectService.addProjectMember({
      projectId:   req.params.projectId,
      workspaceId: req.params.workspaceId,
      userId:      req.body.userId,
      role:        req.body.role,
    });
    ApiResponse.created(res, "Member added successfully", { member });
  });

  removeMember = asyncHandler(async (req, res) => {
    await projectService.removeProjectMember({
      projectId: req.params.projectId,
      userId:    req.params.memberId,
    });
    ApiResponse.noContent(res);
  });
}

export const projectController = new ProjectController();
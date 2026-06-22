// src/modules/project/project.service.js

import { projectRepository } from "./project.repository.js";
import { workspaceRepository } from "../workspace/workspace.repository.js";
import { AppError } from "../../shared/errors/AppError.js";
import { ErrorCodes } from "../../shared/errors/ErrorCodes.js";
import { PROJECT_ROLES } from "../../shared/constants/roles.constants.js";

class ProjectService {
  async createProject({ name, key, description, emoji, workspaceId }, userId) {
    const existing = await projectRepository.findByKeyAndWorkspace(key, workspaceId);
    if (existing) {
      throw new AppError(
        `Project key "${key.toUpperCase()}" already exists in this workspace.`,
        409,
        ErrorCodes.PROJECT_KEY_CONFLICT
      );
    }

    const project = await projectRepository.create({
      name,
      key:         key.toUpperCase(),
      description,
      emoji,
      workspaceId,
      createdBy:   userId,
    });

    // Creator automatically gets ADMIN role on the project
    await projectRepository.addMember({
      projectId:   project._id,
      userId,
      workspaceId,
      role:        PROJECT_ROLES.ADMIN,
    });

    return project;
  }

  async getProjectById(projectId) {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new AppError("Project not found.", 404, ErrorCodes.PROJECT_NOT_FOUND);
    }
    return project;
  }

  async getWorkspaceProjects(workspaceId) {
    return projectRepository.findAllByWorkspace(workspaceId);
  }

  async updateProject(projectId, updates) {
    if (updates.key) updates.key = updates.key.toUpperCase();

    const project = await projectRepository.updateById(projectId, updates);
    if (!project) {
      throw new AppError("Project not found.", 404, ErrorCodes.PROJECT_NOT_FOUND);
    }
    return project;
  }

  async deleteProject(projectId) {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new AppError("Project not found.", 404, ErrorCodes.PROJECT_NOT_FOUND);
    }
    await projectRepository.deleteById(projectId);
  }

  // ─── Project Members ──────────────────────────────────────
  async getProjectMembers(projectId) {
    return projectRepository.findAllMembers(projectId);
  }

  async addProjectMember({ projectId, userId, workspaceId, role }) {
    // Verify user is a workspace member first
    const isWorkspaceMember = await workspaceRepository.findMember({
      workspaceId,
      userId,
    });

    if (!isWorkspaceMember) {
      throw new AppError(
        "User must be a workspace member before being added to a project.",
        400,
        ErrorCodes.MEMBER_NOT_FOUND
      );
    }

    const existing = await projectRepository.findMember({ projectId, userId });
    if (existing) {
      throw new AppError(
        "User is already a member of this project.",
        409,
        ErrorCodes.MEMBER_ALREADY_EXISTS
      );
    }

    return projectRepository.addMember({
      projectId,
      userId,
      workspaceId,
      role: role || PROJECT_ROLES.MEMBER,
    });
  }

  async removeProjectMember({ projectId, userId }) {
    const member = await projectRepository.findMember({ projectId, userId });
    if (!member) {
      throw new AppError("Member not found in project.", 404, ErrorCodes.MEMBER_NOT_FOUND);
    }
    await projectRepository.removeMember({ projectId, userId });
  }
}

export const projectService = new ProjectService();
// src/modules/project/project.repository.js

import { BaseRepository } from "../../shared/repositories/BaseRepository.js";
import { ProjectModel } from "./project.model.js";
import { ProjectMemberModel } from "./projectMember.model.js";

class ProjectRepository extends BaseRepository {
  constructor() {
    super(ProjectModel);
  }

  async findByKeyAndWorkspace(key, workspaceId) {
    return ProjectModel.findOne({ key: key.toUpperCase(), workspaceId });
  }

  async findAllByWorkspace(workspaceId) {
    return ProjectModel.find({ workspaceId })
      .populate("createdBy", "name email profilePicture")
      .sort({ createdAt: -1 });
  }

  async findMemberProjects(workspaceId, userId) {
    const memberships = await ProjectMemberModel.find({ workspaceId, userId })
      .select("projectId role");

    const projectIds = memberships.map((m) => m.projectId);

    return ProjectModel.find({
      workspaceId,
      _id: { $in: projectIds },
    }).populate("createdBy", "name email");
  }

  // ─── Project Member Operations ────────────────────────────
  async addMember({ projectId, userId, workspaceId, role }) {
    return ProjectMemberModel.create({ projectId, userId, workspaceId, role });
  }

  async findMember({ projectId, userId }) {
    return ProjectMemberModel.findOne({ projectId, userId });
  }

  async findAllMembers(projectId) {
    return ProjectMemberModel.find({ projectId })
      .populate("userId", "name email profilePicture")
      .sort({ createdAt: 1 });
  }

  async updateMemberRole({ projectId, userId, role }) {
    return ProjectMemberModel.findOneAndUpdate(
      { projectId, userId },
      { role },
      { new: true }
    );
  }

  async removeMember({ projectId, userId }) {
    return ProjectMemberModel.findOneAndDelete({ projectId, userId });
  }
}

export const projectRepository = new ProjectRepository();
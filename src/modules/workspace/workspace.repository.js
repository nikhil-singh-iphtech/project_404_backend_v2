// src/modules/workspace/workspace.repository.js

import { BaseRepository } from "../../shared/repositories/BaseRepository.js";
import { WorkspaceModel } from "./workspace.model.js";
import { WorkspaceMemberModel } from "./workspaceMember.model.js";

class WorkspaceRepository extends BaseRepository {
  constructor() {
    super(WorkspaceModel);
  }

  async findBySlug(slug) {
    return WorkspaceModel.findOne({ slug });
  }

  async findByIdWithOwner(id) {
    return WorkspaceModel.findById(id).populate("owner", "name email profilePicture");
  }

  /**
   * Returns all workspaces a user is a member of.
   * Joins WorkspaceMember → Workspace in one query.
   */
  async findAllByUserId(userId) {
    const memberships = await WorkspaceMemberModel.find({ userId })
      .populate({
        path: "workspaceId",
        select: "name slug description logo owner",
        populate: { path: "owner", select: "name email" },
      })
      .sort({ createdAt: -1 });

    return memberships
      .filter((m) => m.workspaceId) // filter orphaned records
      .map((m) => ({
        ...m.workspaceId.toObject(),
        role: m.role,
        joinedAt: m.joinedAt,
      }));
  }

  // ─── Member Operations ────────────────────────────────────
  async addMember({ workspaceId, userId, role }) {
    return WorkspaceMemberModel.create({ workspaceId, userId, role });
  }

  async findMember({ workspaceId, userId }) {
    return WorkspaceMemberModel.findOne({ workspaceId, userId });
  }

  async findAllMembers(workspaceId) {
    return WorkspaceMemberModel.find({ workspaceId })
      .populate("userId", "name email profilePicture")
      .sort({ createdAt: 1 });
  }

  async updateMemberRole({ workspaceId, userId, role }) {
    return WorkspaceMemberModel.findOneAndUpdate(
      { workspaceId, userId },
      { role },
      { new: true }
    );
  }

  async removeMember({ workspaceId, userId }) {
    return WorkspaceMemberModel.findOneAndDelete({ workspaceId, userId });
  }

  async countOwners(workspaceId) {
    return WorkspaceMemberModel.countDocuments({
      workspaceId,
      role: "OWNER",
    });
  }
}

export const workspaceRepository = new WorkspaceRepository();
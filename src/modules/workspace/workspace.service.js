// src/modules/workspace/workspace.service.js

import slugify from "slugify";
import { workspaceRepository } from "./workspace.repository.js";
import { AppError } from "../../shared/errors/AppError.js";
import { ErrorCodes } from "../../shared/errors/ErrorCodes.js";
import { WORKSPACE_ROLES } from "../../shared/constants/roles.constants.js";
import { notificationService } from "../notification/notification.service.js";
import { NOTIFICATION_TYPES }  from "../../shared/constants/notification.constants.js";


class WorkspaceService {
  /**
   * Generates a unique slug from the workspace name.
   * If "Acme Corp" exists, tries "acme-corp-2", "acme-corp-3", etc.
   */
  async #generateUniqueSlug(name) {
    const base = slugify(name, { lower: true, strict: true });
    let slug = base;
    let counter = 2;

    while (await workspaceRepository.findBySlug(slug)) {
      slug = `${base}-${counter}`;
      counter++;
    }

    return slug;
  }

  async createWorkspace({ name, description, logo }, userId) {
    const slug = await this.#generateUniqueSlug(name);

    const workspace = await workspaceRepository.create({
      name,
      slug,
      description,
      logo,
      owner: userId,
    });

    /**
     * Creator automatically becomes OWNER member.
     * We store this in WorkspaceMember — not just as workspace.owner —
     * so all membership queries go through one collection.
     */
    await workspaceRepository.addMember({
      workspaceId: workspace._id,
      userId,
      role: WORKSPACE_ROLES.OWNER,
    });

    return workspace;
  }

  async getWorkspaceById(workspaceId) {
    const workspace = await workspaceRepository.findByIdWithOwner(workspaceId);

    if (!workspace) {
      throw new AppError(
        "Workspace not found.",
        404,
        ErrorCodes.WORKSPACE_NOT_FOUND
      );
    }

    return workspace;
  }

  async getUserWorkspaces(userId) {
    return workspaceRepository.findAllByUserId(userId);
  }

  async updateWorkspace(workspaceId, updates) {
    /**
     * If name is being updated, regenerate slug.
     * Why? Slug is derived from name — they should stay in sync.
     * Trade-off: changing name breaks existing bookmarked URLs.
     * Some SaaS products lock slug after creation. We allow it for now.
     */
    if (updates.name) {
      updates.slug = await this.#generateUniqueSlug(updates.name);
    }

    const workspace = await workspaceRepository.updateById(workspaceId, updates);

    if (!workspace) {
      throw new AppError("Workspace not found.", 404, ErrorCodes.WORKSPACE_NOT_FOUND);
    }

    return workspace;
  }

  async deleteWorkspace(workspaceId) {
    const workspace = await workspaceRepository.findById(workspaceId);

    if (!workspace) {
      throw new AppError("Workspace not found.", 404, ErrorCodes.WORKSPACE_NOT_FOUND);
    }

    await workspaceRepository.deleteById(workspaceId);
    /**
     * Note: In production you'd also:
     * - Delete all WorkspaceMembers
     * - Delete all Projects
     * - Delete all ProjectMembers
     * - Delete all Issues
     * - Archive or delete all Invitations
     *
     * Use a transaction or a background job for this.
     * We'll add cascade deletion in Phase 14 (Performance & Optimization).
     */
  }

  // ─── Member Management ────────────────────────────────────
  async getWorkspaceMembers(workspaceId) {
    return workspaceRepository.findAllMembers(workspaceId);
  }

  async updateMemberRole({ workspaceId, targetUserId, role, requestingMembership }) {
    /**
     * Business rules:
     * 1. Cannot change your own role
     * 2. Cannot promote someone to OWNER (ownership transfer is a separate flow)
     * 3. Cannot demote the last OWNER
     */
    if (targetUserId.toString() === requestingMembership.userId.toString()) {
      throw new AppError(
        "You cannot change your own role.",
        400,
        ErrorCodes.MEMBER_ROLE_FORBIDDEN
      );
    }

    if (role === WORKSPACE_ROLES.OWNER) {
      throw new AppError(
        "Cannot assign OWNER role directly. Use workspace transfer.",
        400,
        ErrorCodes.MEMBER_ROLE_FORBIDDEN
      );
    }

    const targetMember = await workspaceRepository.findMember({
      workspaceId,
      userId: targetUserId,
    });

    if (!targetMember) {
      throw new AppError("Member not found.", 404, ErrorCodes.MEMBER_NOT_FOUND);
    }

    // Protect against removing last owner by demotion
    if (targetMember.role === WORKSPACE_ROLES.OWNER) {
      const ownerCount = await workspaceRepository.countOwners(workspaceId);
      if (ownerCount <= 1) {
        throw new AppError(
          "Cannot change role of the last owner.",
          400,
          ErrorCodes.MEMBER_LAST_OWNER
        );
      }
    }

    return workspaceRepository.updateMemberRole({
      workspaceId,
      userId: targetUserId,
      role,
    });
  }

  async removeMember({ workspaceId, targetUserId, requestingMembership }) {
    if (targetUserId.toString() === requestingMembership.userId.toString()) {
      throw new AppError(
        "Use the leave workspace endpoint to remove yourself.",
        400,
        ErrorCodes.MEMBER_ROLE_FORBIDDEN
      );
    }

    const targetMember = await workspaceRepository.findMember({
      workspaceId,
      userId: targetUserId,
    });

    if (!targetMember) {
      throw new AppError("Member not found.", 404, ErrorCodes.MEMBER_NOT_FOUND);
    }

    if (targetMember.role === WORKSPACE_ROLES.OWNER) {
      throw new AppError(
        "Cannot remove an OWNER from the workspace.",
        400,
        ErrorCodes.MEMBER_ROLE_FORBIDDEN
      );
    }

    await workspaceRepository.removeMember({ workspaceId, userId: targetUserId });

     notificationService.notify({
    recipientId: targetUserId,
    senderId:    requestingMembership.userId,
    type:        NOTIFICATION_TYPES.WORKSPACE_MEMBER_REMOVED,
    message:     `You have been removed from the workspace`,
    workspaceId,
  });
  }

  async leaveWorkspace({ workspaceId, userId }) {
    const membership = await workspaceRepository.findMember({ workspaceId, userId });

    if (!membership) {
      throw new AppError("You are not a member of this workspace.", 404, ErrorCodes.MEMBER_NOT_FOUND);
    }

    if (membership.role === WORKSPACE_ROLES.OWNER) {
      const ownerCount = await workspaceRepository.countOwners(workspaceId);
      if (ownerCount <= 1) {
        throw new AppError(
          "You are the last owner. Transfer ownership before leaving.",
          400,
          ErrorCodes.MEMBER_LAST_OWNER
        );
      }
    }

    await workspaceRepository.removeMember({ workspaceId, userId });
  }
}

export const workspaceService = new WorkspaceService();
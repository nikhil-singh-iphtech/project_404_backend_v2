// src/socket/socket.rooms.js

/**
 * Room naming conventions.
 * Consistent names prevent typos causing missed events.
 *
 * workspace:665abc → all workspace members
 * project:668ghi   → all project members
 * user:664xyz      → private room for one user (notifications)
 */
export const ROOMS = {
  workspace: (workspaceId) => `workspace:${workspaceId}`,
  project:   (projectId)   => `project:${projectId}`,
  user:      (userId)      => `user:${userId}`,
};

/**
 * Emits an event to all members of a project room.
 */
export const emitToProject = (io, projectId, event, data) => {
  io.to(ROOMS.project(projectId)).emit(event, data);
};

/**
 * Emits an event to all members of a workspace room.
 */
export const emitToWorkspace = (io, workspaceId, event, data) => {
  io.to(ROOMS.workspace(workspaceId)).emit(event, data);
};

/**
 * Emits a private event to a specific user.
 * Used for notifications — only the recipient sees it.
 */
export const emitToUser = (io, userId, event, data) => {
  io.to(ROOMS.user(userId)).emit(event, data);
};
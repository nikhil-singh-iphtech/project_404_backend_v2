// src/socket/socket.server.js

import { Server } from "socket.io";
import { socketAuthMiddleware } from "./socket.middleware.js";
import { ROOMS } from "./socket.rooms.js";
import { SOCKET_EVENTS } from "./socket.events.js";
import { WorkspaceMemberModel } from "../modules/workspace/workspaceMember.model.js";
import { ProjectMemberModel } from "../modules/project/projectMember.model.js";
import { logger } from "../shared/utils/logger.js";
import { config } from "../config/app.config.js";

/**
 * Singleton — the io instance is shared across the entire app.
 * Services import this to emit events.
 */
let io;

export const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin:      config.CLIENT_URL,
      methods:     ["GET", "POST"],
      credentials: true,
    },
    /**
     * pingTimeout: how long to wait for a pong before
     * considering the client disconnected.
     * pingInterval: how often to send a ping.
     */
    pingTimeout:  60000,
    pingInterval: 25000,
  });

  // ─── Apply auth middleware to all connections ──────────────
  io.use(socketAuthMiddleware);

  // ─── Connection handler ────────────────────────────────────
  io.on(SOCKET_EVENTS.CONNECT, async (socket) => {
    const userId = socket.user._id.toString();

    logger.info(`Socket connected: ${userId}`);

    /**
     * Step 1 — Join the user's private room immediately.
     * This room receives personal notifications.
     */
    socket.join(ROOMS.user(userId));

    /**
     * Step 2 — Auto-join all workspace rooms this user belongs to.
     * We fetch memberships on connect so the client doesn't need
     * to manually join each room.
     */
    try {
      const workspaceMemberships = await WorkspaceMemberModel.find({
        userId,
      }).select("workspaceId");

      workspaceMemberships.forEach(({ workspaceId }) => {
        socket.join(ROOMS.workspace(workspaceId.toString()));
      });

      /**
       * Step 3 — Auto-join all project rooms.
       */
      const projectMemberships = await ProjectMemberModel.find({
        userId,
      }).select("projectId");

      projectMemberships.forEach(({ projectId }) => {
        socket.join(ROOMS.project(projectId.toString()));
      });

      logger.info(
        `User ${userId} joined ${workspaceMemberships.length} workspace rooms ` +
        `and ${projectMemberships.length} project rooms`
      );

    } catch (error) {
      logger.error(`Failed to join rooms for user ${userId}: ${error.message}`);
    }

    // ─── Manual room join (when user is added to a new project) ──
    /**
     * Client emits this when they navigate to a project.
     * Also used when a user is added to a new project mid-session.
     */
    socket.on(SOCKET_EVENTS.JOIN_PROJECT, async ({ projectId }) => {
      try {
        const membership = await ProjectMemberModel.findOne({
          projectId,
          userId,
        });

        if (!membership) {
          socket.emit(SOCKET_EVENTS.ERROR, {
            message: "You are not a member of this project",
          });
          return;
        }

        socket.join(ROOMS.project(projectId));
        logger.info(`User ${userId} joined project room: ${projectId}`);

      } catch (error) {
        logger.error(`Join project room failed: ${error.message}`);
      }
    });

    socket.on(SOCKET_EVENTS.LEAVE_PROJECT, ({ projectId }) => {
      socket.leave(ROOMS.project(projectId));
      logger.info(`User ${userId} left project room: ${projectId}`);
    });

    // ─── Disconnect ────────────────────────────────────────────
    socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
      logger.info(`Socket disconnected: ${userId} — reason: ${reason}`);
    });
  });

  logger.info("Socket.io server initialized");
  return io;
};

/**
 * Returns the io instance.
 * Used by services to emit events.
 *
 * Why a getter instead of direct export?
 * io is undefined until initializeSocket() is called.
 * The getter ensures we never use an uninitialized instance.
 */
export const getIO = () => {
  if (!io) {
    throw new Error(
      "Socket.io not initialized. Call initializeSocket() first."
    );
  }
  return io;
};
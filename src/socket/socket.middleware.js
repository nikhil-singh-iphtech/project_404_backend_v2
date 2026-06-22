

import jwt from "jsonwebtoken";
import { config } from "../config/app.config.js";
import { UserModel } from "../modules/auth/auth.model.js";
import { logger } from "../shared/utils/logger.js";

/**
 * Authenticates Socket.io connections using JWT.
 *
 * Why authenticate socket connections?
 * Without auth, anyone could connect and join any room.
 * A malicious user could receive real-time updates
 * for projects they don't belong to.
 *
 * The token is passed in the socket handshake auth object:
 * const socket = io(URL, { auth: { token: "Bearer eyJ..." } });
 */
export const socketAuthMiddleware = async (socket, next) => {
  try {
    const authHeader = socket.handshake.auth?.token;

    if (!authHeader?.startsWith("Bearer ")) {
      return next(new Error("Authentication required"));
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, config.JWT_SECRET);

    const user = await UserModel.findById(decoded.userId).select(
      "-password -refreshToken"
    );

    if (!user) {
      return next(new Error("User not found"));
    }

    /**
     * Attach user to socket for use in event handlers.
     * Same pattern as req.user in Express middleware.
     */
    socket.user = user;
    next();

  } catch (error) {
    logger.warn(`Socket auth failed: ${error.message}`);
    next(new Error("Invalid or expired token"));
  }
};
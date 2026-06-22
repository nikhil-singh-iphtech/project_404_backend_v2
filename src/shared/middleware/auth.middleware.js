// src/shared/middleware/auth.middleware.js

import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../errors/AppError.js";
import { ErrorCodes } from "../errors/ErrorCodes.js";
import { config } from "../../config/app.config.js";
import { UserModel } from "../../modules/auth/auth.model.js";

const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  /^\/api\/workspaces\/[^/]+\/invitations\/details$/,
];

const isPublicRoute = (path) =>
  PUBLIC_ROUTES.some(route =>
    typeof route === 'string' ? route === path : route.test(path)
  );

export const authenticate = asyncHandler(async (req, res, next) => {
 

  // ✅ Strip query string before matching
  const pathname = req.path;

  if (isPublicRoute(pathname)) {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    throw new AppError(
      "Authentication required. Please provide a valid token.",
      401,
      ErrorCodes.AUTH_UNAUTHORIZED
    );
  }

  const token = authHeader.split(" ")[1];
  const decoded = jwt.verify(token, config.JWT_SECRET);

  const user = await UserModel.findById(decoded.userId)
    .select("-password -refreshToken");

  if (!user) {
    throw new AppError(
      "User no longer exists.",
      401,
      ErrorCodes.AUTH_UNAUTHORIZED
    );
  }

  req.user = user;
  next();
});
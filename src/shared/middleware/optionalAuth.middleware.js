// src/shared/middleware/optionalAuth.middleware.js

import jwt from "jsonwebtoken";
import { config } from "../../config/app.config.js";
import { UserModel } from "../../modules/auth/auth.model.js";

export const optionalAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return next(); // no token → still proceed

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = await UserModel.findById(decoded.userId)
      .select("-password -refreshToken");

    if (user) req.user = user; // attach if valid, silently skip if not
  } catch {
    // expired/invalid token → just ignore, don't block
  }

  next();
};
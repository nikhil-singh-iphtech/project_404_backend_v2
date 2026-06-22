// src/shared/middleware/notFound.js

import { AppError } from "../errors/AppError.js";
import { ErrorCodes } from "../errors/ErrorCodes.js";

/**
 * Catch-all for routes that don't exist.
 * Registered after all route definitions, before errorHandler.
 */
export const notFound = (req, res, next) => {
  next(
    new AppError(
      `Route not found: ${req.method} ${req.originalUrl}`,
      404,
      ErrorCodes.NOT_FOUND
    )
  );
};
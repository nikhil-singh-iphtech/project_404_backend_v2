// src/shared/middleware/mongoSanitize.js

import sanitize from "mongo-sanitize";

/**
 * Manually sanitize req.body, req.params, and req.query
 * without attempting to overwrite read-only properties.
 *
 * mongo-sanitize strips keys that start with "$" or contain "."
 * which prevents MongoDB operator injection attacks like:
 *   { "email": { "$gt": "" } }
 */
export const mongoSanitizeMiddleware = (req, res, next) => {
  if (req.body)   req.body   = sanitize(req.body);
  if (req.params) req.params = sanitize(req.params);

  // Don't reassign req.query — mutate its properties in place
  if (req.query) {
    Object.keys(req.query).forEach((key) => {
      req.query[key] = sanitize(req.query[key]);
    });
  }

  next();
};
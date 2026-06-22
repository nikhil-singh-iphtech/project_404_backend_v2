// src/shared/validators/validate.js
import { AppError } from "../errors/AppError.js";
import { ErrorCodes } from "../errors/ErrorCodes.js";

export const validate = (schema, source = "body") => (req, res, next) => {
  const target = source === "query" ? req.query : req.body;

  const { error, value } = schema.validate(target, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const message = error.details.map((d) => d.message.replace(/['"]/g, "")).join("; ");
    return next(new AppError(message, 400, ErrorCodes.VALIDATION_ERROR));
  }

  if (source === "query") Object.assign(req.query, value);
  else req.body = value;

  next();
};
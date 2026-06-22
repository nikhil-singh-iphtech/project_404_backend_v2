import { AppError } from "./AppError.js";
import { ErrorCodes } from "./ErrorCodes.js";
import { logger } from "../utils/logger.js";
import { config } from "../../config/app.config.js";


const handleCastError = (err) =>
  new AppError(`Invalid ${err.path}: ${err.value}`, 400, ErrorCodes.VALIDATION_ERROR);


const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  return new AppError(
    `"${value}" already exists for field "${field}". Please use a different value.`,
    409,
    ErrorCodes[`${field.toUpperCase()}_ALREADY_EXISTS`] || ErrorCodes.VALIDATION_ERROR
  );
};


const handleValidationError = (err) => {
  const messages = Object.values(err.errors).map((e) => e.message);
  return new AppError(
    `Validation failed: ${messages.join(". ")}`,
    400,
    ErrorCodes.VALIDATION_ERROR
  );
};


const handleJWTExpiredError = () =>
  new AppError("Your session has expired. Please log in again.", 401, ErrorCodes.AUTH_TOKEN_EXPIRED);


const handleJWTError = () =>
  new AppError("Invalid authentication token. Please log in again.", 401, ErrorCodes.AUTH_TOKEN_INVALID);


const sendErrorResponse = (err, res) => {
  const response = {
    success: false,
    message: err.message,
    errorCode: err.errorCode || ErrorCodes.INTERNAL_SERVER_ERROR,
    ...(config.isDevelopment() && { stack: err.stack }),
  };

  res.status(err.statusCode).json(response);
};


export const globalErrorHandler = (err, req, res, next) => {

  err.statusCode = err.statusCode || 500;
  err.isOperational = err.isOperational || false;


  if (err.statusCode >= 500) {
    logger.error(`[${req.method}] ${req.path} → ${err.message}`, {
      stack: err.stack,
      body: req.body,
      params: req.params,
    });
  } else {
    logger.warn(`[${req.method}] ${req.path} → ${err.message}`);
  }

 
  let normalizedError = err;

  if (err.name === "CastError")             normalizedError = handleCastError(err);
  if (err.code === 11000)                   normalizedError = handleDuplicateKeyError(err);
  if (err.name === "ValidationError")       normalizedError = handleValidationError(err);
  if (err.name === "TokenExpiredError")     normalizedError = handleJWTExpiredError();
  if (err.name === "JsonWebTokenError")     normalizedError = handleJWTError();

  
  if (normalizedError.isOperational) {
    return sendErrorResponse(normalizedError, res);
  }


  logger.error("UNHANDLED/PROGRAMMING ERROR:", err);
  return res.status(500).json({
    success: false,
    message: "An unexpected error occurred. Our team has been notified.",
    errorCode: ErrorCodes.INTERNAL_SERVER_ERROR,
  });
};
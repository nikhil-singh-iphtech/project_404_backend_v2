// src/shared/errors/AppError.js

/**
 * The base class for all application errors.
 *
 * Why extend Error?
 * So instanceof checks work, stack traces are preserved,
 * and Express's error middleware can distinguish operational
 * errors (404, 403, validation) from programming errors (crashes).
 *
 * Operational errors = expected, safe to send to client
 * Programming errors = unexpected, send generic 500
 */
export class AppError extends Error {
  constructor(message, statusCode, errorCode = null) {
    super(message);

    this.statusCode = statusCode;
    this.errorCode = errorCode;   // Machine-readable code for the frontend
    this.isOperational = true;    // Flag: this is a known, expected error

    // Captures the stack trace correctly, excluding the constructor call
    Error.captureStackTrace(this, this.constructor);
  }
}
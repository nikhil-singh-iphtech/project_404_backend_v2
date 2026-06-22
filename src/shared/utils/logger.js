
import winston from "winston";
import { config } from "../../config/app.config.js";

const { combine, timestamp, printf, colorize, errors } = winston.format;

/**
 * Development format: human-readable, colorized
 * Production format: JSON, structured for log aggregation
 */
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ timestamp, level, message, stack }) => {
    return stack
      ? `[${timestamp}] ${level}: ${message}\n${stack}`
      : `[${timestamp}] ${level}: ${message}`;
  })
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: config.isDevelopment() ? "debug" : "info",
  format: config.isProduction() ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),

    // In production you'd add:
    // new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    // or a CloudWatch / Datadog transport
  ],

  // Prevents Winston from exiting on uncaught exceptions
  exitOnError: false,
});
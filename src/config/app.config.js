// src/config/app.config.js

import dotenv from "dotenv";
dotenv.config();

const requireEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`[Config] Missing required environment variable: "${key}"`);
  }
  return value;
};

const optionalEnv = (key, defaultValue) => process.env[key] ?? defaultValue;

export const config = {
  // ─── Server ────────────────────────────────────────────────
  NODE_ENV:     optionalEnv("NODE_ENV", "development"),
  PORT:         parseInt(optionalEnv("PORT", "5000"), 10),
  CLIENT_URL:   requireEnv("CLIENT_URL"),

  // ─── Database ──────────────────────────────────────────────
  MONGO_URI:    requireEnv("MONGO_URI"),

  // ─── JWT ───────────────────────────────────────────────────
  JWT_SECRET:              requireEnv("JWT_SECRET"),
  JWT_EXPIRES_IN:          optionalEnv("JWT_EXPIRES_IN", "25m"),
  JWT_REFRESH_SECRET:      requireEnv("JWT_REFRESH_SECRET"),
  JWT_REFRESH_EXPIRES_IN:  optionalEnv("JWT_REFRESH_EXPIRES_IN", "7d"),

  // ─── Email ─────────────────────────────────────────────────
  SMTP_HOST:   requireEnv("SMTP_HOST"),
  SMTP_PORT:   parseInt(optionalEnv("SMTP_PORT", "587"), 10),
  SMTP_USER:   requireEnv("SMTP_USER"),
  SMTP_PASS:   requireEnv("SMTP_PASS"),
  EMAIL_FROM:  optionalEnv("EMAIL_FROM", "noreply@yoursaas.com"),

  // ─── Google OAuth ──────────────────────────────────────────
  GOOGLE_CLIENT_ID:      requireEnv("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET:  requireEnv("GOOGLE_CLIENT_SECRET"),
  GOOGLE_CALLBACK_URL:   requireEnv("GOOGLE_CALLBACK_URL"),

  // ─── Helpers ───────────────────────────────────────────────
  isProduction:  () => process.env.NODE_ENV === "production",
  isDevelopment: () => process.env.NODE_ENV === "development",
};
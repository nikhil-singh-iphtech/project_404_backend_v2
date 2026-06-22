// src/modules/auth/auth.routes.js

import { Router } from "express";
import passport from "passport";
import rateLimit from "express-rate-limit";

import { authController } from "./auth.controller.js";
import { validate } from "../../shared/validators/validate.js";
import { authenticate } from "../../shared/middleware/auth.middleware.js";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  sendOtpSchema,
  verifyOtpSchema,
  checkEmailSchema,           // ← new
} from "./auth.validator.js";

// ─── Rate Limiters ─────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many attempts. Try again in 15 minutes." },
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many OTP requests. Try again in 15 minutes." },
});

/**
 * checkEmail gets its own limiter.
 *
 * Why? Without it, an attacker can enumerate every email in your
 * database with 10,000 requests. Even at authLimiter's 10/15min,
 * that's still 10 probes per IP. A dedicated limiter with a low
 * ceiling keeps enumeration impractical.
 */
const checkEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many requests. Try again in 15 minutes." },
});

export const authRouter = Router();

// ─── Health ────────────────────────────────────────────────────
authRouter.get("/health", (req, res) => {
  res.json({ success: true, message: "Auth service is running" });
});

// ─── Email Check (always first) ────────────────────────────────
authRouter.post(
  "/check-email",
  checkEmailLimiter,
  validate(checkEmailSchema),
  authController.checkEmail
);

// ─── Email + Password ──────────────────────────────────────────
authRouter.post("/register", authLimiter, validate(registerSchema), authController.register);
authRouter.post("/login",    authLimiter, validate(loginSchema),    authController.login);

// ─── OTP / Passwordless ───────────────────────────────────────
authRouter.post("/otp/send",   otpLimiter,  validate(sendOtpSchema),   authController.sendOtp);
authRouter.post("/otp/verify", authLimiter, validate(verifyOtpSchema), authController.verifyOtp);

// ─── Google OAuth ──────────────────────────────────────────────
authRouter.get(
  "/google",
  passport.authenticate("google", { session: false, scope: ["profile", "email"] })
);

authRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/api/auth/google/failure",
  }),
  authController.googleCallback
);

authRouter.get("/google/failure", (req, res) => {
  res.redirect(`${config.CLIENT_URL}/login?error=google_failed`);
});

// ─── Token + Session ───────────────────────────────────────────
authRouter.post("/refresh", authLimiter, validate(refreshTokenSchema), authController.refreshToken);
authRouter.post("/logout",  authenticate, authController.logout);
authRouter.get("/me",       authenticate, authController.getMe);
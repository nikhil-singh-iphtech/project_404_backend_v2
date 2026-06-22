// src/modules/auth/auth.controller.js

import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { ApiResponse } from "../../shared/utils/ApiResponse.js";
import { authService } from "./auth.service.js";
import { config } from "../../config/app.config.js";

class AuthController {
  // ─── Email + Password ─────────────────────────────────────────
  register = asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    ApiResponse.created(res, "Account created successfully", result);
  });

  login = asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    ApiResponse.success(res, 200, "Login successful", result);
  });

  // ─── OTP ──────────────────────────────────────────────────────
  sendOtp = asyncHandler(async (req, res) => {
    const result = await authService.sendOtp(req.body.email);
    ApiResponse.success(res, 200, result.message);
  });

  verifyOtp = asyncHandler(async (req, res) => {
    const result = await authService.verifyOtp(req.body);
    ApiResponse.success(res, 200, "Login successful", result);
  });

   checkEmail = asyncHandler(async (req, res) => {
    const result = await authService.checkEmail(req.body.email);
    ApiResponse.success(res, 200, "Email checked successfully", result);
  });

  // ─── Google OAuth ─────────────────────────────────────────────
  /**
   * googleCallback runs AFTER Passport has verified the Google
   * profile and attached req.user. We just need to issue JWTs
   * and redirect the frontend with tokens in the query string.
   *
   * Why redirect with tokens in query params?
   * This is a browser-based OAuth flow — the callback is a full
   * page redirect, not an AJAX call. The frontend needs the tokens
   * to land somewhere it can read them (URL params → localStorage/memory).
   *
   * In production: use short-lived one-time codes instead of raw tokens
   * in the URL to prevent tokens appearing in server access logs.
   */
  googleCallback = asyncHandler(async (req, res) => {
    const result = await authService.handleGoogleLogin(req.user);

    const redirectUrl = new URL(`${config.CLIENT_URL}/auth/callback`);
    redirectUrl.searchParams.set("accessToken", result.accessToken);
    redirectUrl.searchParams.set("refreshToken", result.refreshToken);

    res.redirect(redirectUrl.toString());
  });

  // ─── Token + Session ──────────────────────────────────────────
  refreshToken = asyncHandler(async (req, res) => {
    const tokens = await authService.refreshAccessToken(req.body.refreshToken);
    ApiResponse.success(res, 200, "Token refreshed successfully", tokens);
  });

  logout = asyncHandler(async (req, res) => {
    await authService.logout(req.user._id);
    ApiResponse.noContent(res);
  });

  getMe = asyncHandler(async (req, res) => {
    ApiResponse.success(res, 200, "User fetched successfully", { user: req.user });
  });
}

export const authController = new AuthController();
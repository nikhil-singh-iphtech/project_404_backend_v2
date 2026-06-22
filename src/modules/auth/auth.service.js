// src/modules/auth/auth.service.js

import jwt from "jsonwebtoken";
import { authRepository } from "./auth.repository.js";
import { emailService } from "../../shared/services/email.service.js";
import { AppError } from "../../shared/errors/AppError.js";
import { ErrorCodes } from "../../shared/errors/ErrorCodes.js";
import { config } from "../../config/app.config.js";

class AuthService {
  // ─── Token Generation ─────────────────────────────────────────
  #generateTokens(userId) {
    const accessToken = jwt.sign({ userId }, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN,
    });
    const refreshToken = jwt.sign({ userId }, config.JWT_REFRESH_SECRET, {
      expiresIn: config.JWT_REFRESH_EXPIRES_IN,
    });
    return { accessToken, refreshToken };
  }

  #sanitizeUser(user) {
    return {
      _id:              user._id,
      name:             user.name,
      email:            user.email,
      profilePicture:   user.profilePicture,
      authProvider:     user.authProvider,
      isEmailVerified:  user.isEmailVerified,
    };
  }

  // ─── Email + Password ─────────────────────────────────────────
  async register({ name, email, password }) {
    const existing = await authRepository.findByEmail(email);
    if (existing) {
      throw new AppError(
        "An account with this email already exists.",
        409,
        ErrorCodes.AUTH_EMAIL_ALREADY_EXISTS
      );
    }

    const user = await authRepository.create({
      name,
      email,
      password,
      authProvider: "email",
    });

    const { accessToken, refreshToken } = this.#generateTokens(user._id);
    await authRepository.updateRefreshToken(user._id, refreshToken);

    return {
      user: this.#sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }
  
 async checkEmail(email) {
    const user = await authRepository.findAuthProviderByEmail(email);

    if (!user) {
      return {
        exists:   false,
        provider: null,
      };
    }

    return {
      exists:   true,
      provider: user.authProvider,  // "email" | "google" | "otp"
    };
  }
  async login({ email, password }) {
    const user = await authRepository.findByEmail(email);

    if (!user) {
      throw new AppError("Invalid email or password.", 401, ErrorCodes.AUTH_INVALID_CREDENTIALS);
    }

    /**
     * Block non-email-provider users from password login.
     * Better UX than a generic "invalid credentials" message.
     */
    if (user.authProvider !== "email") {
      throw new AppError(
        `This account uses ${user.authProvider} login. Please use that method instead.`,
        400,
        ErrorCodes.AUTH_INVALID_CREDENTIALS
      );
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AppError("Invalid email or password.", 401, ErrorCodes.AUTH_INVALID_CREDENTIALS);
    }

    const { accessToken, refreshToken } = this.#generateTokens(user._id);
    await authRepository.updateRefreshToken(user._id, refreshToken);

    return {
      user: this.#sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  // ─── OTP / Passwordless ───────────────────────────────────────
  /**
   * Flow:
   * 1. User submits email → we generate OTP → email it → return 200
   * 2. User submits email + OTP → we verify → issue tokens
   *
   * Why two separate endpoints instead of one?
   * Separation of concerns. Step 1 is "request a code".
   * Step 2 is "exchange code for session". They have different
   * rate limiting needs — step 1 is more expensive (sends email).
   */
  async sendOtp(email) {
    let user = await authRepository.findByEmail(email);

    /**
     * If no account exists, create one automatically.
     * This is the "magic link" / passwordless registration pattern.
     * First OTP login = account creation.
     */
    if (!user) {
      user = await authRepository.create({
        name:         email.split("@")[0],
        email,
        authProvider: "otp",
      });
    }

    if (user.authProvider === "email") {
      throw new AppError(
        "This account uses email/password login. Please log in with your password.",
        400,
        ErrorCodes.AUTH_INVALID_CREDENTIALS
      );
    }

    // Generate OTP (plain) — stores hash internally on the user document
    const otp = user.generateOtp();
    await user.save();

    // Send plain OTP via email — never log or return this value
    await emailService.sendOtpEmail(email, otp);

    return { message: "OTP sent successfully. Check your email." };
  }

  async verifyOtp({ email, otp }) {
    const user = await authRepository.findByEmail(email);

    if (!user) {
      throw new AppError("Invalid email or OTP.", 401, ErrorCodes.AUTH_INVALID_CREDENTIALS);
    }

    const result = user.verifyOtp(otp);

    if (!result.valid) {
      // Save incremented attempt count before throwing
      await user.save();

      const messages = {
        EXPIRED:      "OTP has expired. Please request a new one.",
        MAX_ATTEMPTS: "Too many failed attempts. Please request a new OTP.",
        INVALID:      "Invalid OTP. Please try again.",
      };

      throw new AppError(
        messages[result.reason] || "Invalid OTP.",
        401,
        ErrorCodes.AUTH_INVALID_CREDENTIALS
      );
    }

    // Valid — clear OTP fields to prevent reuse
    user.clearOtp();
    user.isEmailVerified = true;
    await user.save();

    const { accessToken, refreshToken } = this.#generateTokens(user._id);
    await authRepository.updateRefreshToken(user._id, refreshToken);

    return {
      user: this.#sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  // ─── Google OAuth ─────────────────────────────────────────────
  /**
   * Called after Passport has verified the Google profile
   * and attached the user to req.user.
   * Our job here: just issue JWT tokens.
   */
  async handleGoogleLogin(user) {
    const { accessToken, refreshToken } = this.#generateTokens(user._id);
    await authRepository.updateRefreshToken(user._id, refreshToken);

    return {
      user: this.#sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  // ─── Token Refresh ────────────────────────────────────────────
  async refreshAccessToken(incomingRefreshToken) {
    let decoded;
    try {
      decoded = jwt.verify(incomingRefreshToken, config.JWT_REFRESH_SECRET);
    } catch {
      throw new AppError("Invalid or expired refresh token.", 401, ErrorCodes.AUTH_TOKEN_INVALID);
    }

    const user = await authRepository.findByIdWithRefreshToken(decoded.userId);

    if (!user || user.refreshToken !== incomingRefreshToken) {
      throw new AppError(
        "Refresh token is invalid or has already been used.",
        401,
        ErrorCodes.AUTH_TOKEN_INVALID
      );
    }

    const { accessToken, refreshToken } = this.#generateTokens(user._id);
    await authRepository.updateRefreshToken(user._id, refreshToken);

    return { accessToken, refreshToken };
  }

  // ─── Logout ───────────────────────────────────────────────────
  async logout(userId) {
    await authRepository.updateRefreshToken(userId, null);
  }
}

export const authService = new AuthService();
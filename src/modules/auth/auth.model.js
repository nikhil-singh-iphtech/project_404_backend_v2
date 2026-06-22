// src/modules/auth/auth.model.js

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },

    // ─────────────────────────────────────────────────────────
    // Authentication Provider
    // ─────────────────────────────────────────────────────────
    authProvider: {
      type: String,
      enum: ["email", "google", "otp"],
      default: "email",
    },

    // Only required for email auth
    password: {
      type: String,
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },

    profilePicture: {
      type: String,
      default: null,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    // ─────────────────────────────────────────────────────────
    // Refresh Token
    // ─────────────────────────────────────────────────────────
    refreshToken: {
      type: String,
      select: false,
    },

    // ─────────────────────────────────────────────────────────
    // OTP Fields
    // ─────────────────────────────────────────────────────────
    otpCode: {
      type: String,
      select: false,
    },

    otpExpiry: {
      type: Date,
      select: false,
    },

    otpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// ─────────────────────────────────────────────────────────
// Indexes
// ─────────────────────────────────────────────────────────

userSchema.index({ otpExpiry: 1 });

// ─────────────────────────────────────────────────────────
// Pre Save Hook
// ─────────────────────────────────────────────────────────
//
// IMPORTANT:
// Modern Mongoose async middleware should NOT use next()
// Mongoose waits for the returned Promise automatically.
//

userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 12);
});

// ─────────────────────────────────────────────────────────
// Instance Methods
// ─────────────────────────────────────────────────────────

userSchema.methods.comparePassword = async function (
  candidatePassword
) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Generate OTP
 *
 * Creates a 6-digit OTP
 * Stores SHA256 hash in DB
 * Returns plain OTP for email/SMS delivery
 */
userSchema.methods.generateOtp = function () {
  const otp = Math.floor(
    100000 + Math.random() * 900000
  ).toString();

  this.otpCode = crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");

  this.otpExpiry = new Date(
    Date.now() + 10 * 60 * 1000
  );

  this.otpAttempts = 0;

  return otp;
};

/**
 * Verify OTP
 */
userSchema.methods.verifyOtp = function (
  submittedOtp
) {
  if (this.otpAttempts >= 5) {
    return {
      valid: false,
      reason: "MAX_ATTEMPTS",
    };
  }

  if (
    !this.otpExpiry ||
    this.otpExpiry < new Date()
  ) {
    return {
      valid: false,
      reason: "EXPIRED",
    };
  }

  const hashedSubmittedOtp = crypto
    .createHash("sha256")
    .update(submittedOtp)
    .digest("hex");

  if (hashedSubmittedOtp !== this.otpCode) {
    this.otpAttempts += 1;

    return {
      valid: false,
      reason: "INVALID",
    };
  }

  return {
    valid: true,
  };
};

/**
 * Clear OTP after successful verification
 */
userSchema.methods.clearOtp = function () {
  this.otpCode = undefined;
  this.otpExpiry = undefined;
  this.otpAttempts = 0;
};

// ─────────────────────────────────────────────────────────
// Export Model
// ─────────────────────────────────────────────────────────

export const UserModel = mongoose.model(
  "User",
  userSchema
);
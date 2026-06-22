// src/modules/auth/auth.repository.js

import { BaseRepository } from "../../shared/repositories/BaseRepository.js";
import { UserModel } from "./auth.model.js";

class AuthRepository extends BaseRepository {
  constructor() {
    super(UserModel);
  }

  async findByEmail(email) {
    return UserModel.findOne({ email }).select(
      "+password +refreshToken +otpCode +otpExpiry +otpAttempts"
    );
  }

   async findAuthProviderByEmail(email) {
    return UserModel.findOne({ email }).select("email authProvider");
  }

  async findByIdWithRefreshToken(id) {
    return UserModel.findById(id).select("+refreshToken");
  }

  async findByIdWithOtp(id) {
    return UserModel.findById(id).select(
      "+otpCode +otpExpiry +otpAttempts"
    );
  }

  async updateRefreshToken(userId, refreshToken) {
    return this.updateById(userId, { refreshToken });
  }
}

export const authRepository = new AuthRepository();
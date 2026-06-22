// src/config/passport.config.js

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { config } from "./app.config.js";
import { UserModel } from "../modules/auth/auth.model.js";
import { logger } from "../shared/utils/logger.js";

/**
 * Why Passport for Google OAuth and not a manual implementation?
 *
 * Manual OAuth involves:
 * 1. Redirecting user to Google's auth URL
 * 2. Handling the callback with an authorization code
 * 3. Exchanging the code for tokens via Google's token endpoint
 * 4. Fetching the user profile
 * 5. Handling errors at every step
 *
 * Passport abstracts steps 2-5 into a verified callback.
 * The strategy pattern also means adding GitHub, Microsoft, etc.
 * later is just adding another strategy — same pattern.
 *
 * Why NOT use Passport session-based auth?
 * We're building a JWT-based API, not a server-rendered app.
 * Passport handles the OAuth flow only. After profile verification,
 * we issue our own JWT — Passport's session is not used.
 */
export const initializePassport = () => {
  passport.use(
    new GoogleStrategy(
      {
        clientID:     config.GOOGLE_CLIENT_ID,
        clientSecret: config.GOOGLE_CLIENT_SECRET,
        callbackURL:  config.GOOGLE_CALLBACK_URL,
        scope:        ["profile", "email"],
      },

      /**
       * This callback runs after Google authenticates the user
       * and returns their profile.
       *
       * Our job here: find or create a User in our database.
       *
       * "Find or create" pattern:
       * - If user exists with this email + google provider → return them
       * - If user exists with this email but different provider → block (account conflict)
       * - If user doesn't exist → create a new google-provider account
       */
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;

          if (!email) {
            return done(
              new Error("No email returned from Google. Please ensure your Google account has an email."),
              null
            );
          }

          // Check if user already exists
          let user = await UserModel.findOne({ email });

          if (user) {
            // Account exists but was created with a different provider
            if (user.authProvider !== "google") {
              return done(
                new Error(
                  `This email is registered with ${user.authProvider} login. Please use that method.`
                ),
                null
              );
            }
            // Existing Google user — just return them
            return done(null, user);
          }

          // New user — create account
          user = await UserModel.create({
            name:             profile.displayName || email.split("@")[0],
            email,
            authProvider:     "google",
            profilePicture:   profile.photos?.[0]?.value || null,
            isEmailVerified:  true, // Google has already verified this email
          });

          logger.info(`New Google OAuth user created: ${email}`);
          return done(null, user);

        } catch (error) {
          logger.error(`Google OAuth strategy error: ${error.message}`);
          return done(error, null);
        }
      }
    )
  );
};
// src/shared/services/email.service.js

import nodemailer from "nodemailer";
import { config } from "../../config/app.config.js";
import { logger } from "../utils/logger.js";

/**
 * Why a shared service and not inside the auth module?
 *
 * Email sending is infrastructure — it will be reused by:
 * - Auth (OTP)
 * - Invitations (Phase 2)
 * - Notifications (Phase 7)
 *
 * Domain-specific email CONTENT lives in each module.
 * The transport mechanism lives here, once.
 */
class EmailService {
  #transporter;

  constructor() {
    this.#transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_PORT === 465, // true for 465, false for 587
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
      },
    });
  }

  async sendMail({ to, subject, html }) {
    try {
      const info = await this.#transporter.sendMail({
        from: `"Project Manager" <${config.EMAIL_FROM}>`,
        to,
        subject,
        html,
      });

      logger.info(`Email sent to ${to}: ${info.messageId}`);
      return info;
    } catch (error) {
      // Log but don't crash the request — email failure shouldn't
      // block the user from receiving their OTP response.
      // In production: add to a retry queue (Bull/BullMQ).
      logger.error(`Email send failed to ${to}: ${error.message}`);
      throw error;
    }
  }

  /**
   * OTP email template.
   * Lives here because it's email infrastructure.
   * The HTML template is intentionally simple — replace with
   * a proper template engine (Handlebars/MJML) in production.
   */
  async sendOtpEmail(to, otp) {
    return this.sendMail({
      to,
      subject: "Your login code",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1a1a1a;">Your login code</h2>
          <p style="color: #444;">Use the code below to sign in. It expires in <strong>10 minutes</strong>.</p>
          <div style="
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #4f46e5;
            background: #f5f3ff;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            margin: 24px 0;
          ">${otp}</div>
          <p style="color: #888; font-size: 13px;">
            If you didn't request this, you can safely ignore this email.
            Never share this code with anyone.
          </p>
        </div>
      `,
    });
  }


  async sendInvitationEmail({ to, inviterName, workspaceName, inviteUrl, role }) {
    return this.sendMail({
      to,
      subject: `${inviterName} invited you to join ${workspaceName} on Plana`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1a1a1a;">You're invited to join ${workspaceName}</h2>
          <p style="color: #444;">
            <strong>${inviterName}</strong> has invited you to join
            <strong>${workspaceName}</strong> as a <strong>${role}</strong>.
          </p>
          <a href="${inviteUrl}" style="
            display: inline-block;
            background: #4f46e5;
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: bold;
            margin: 24px 0;
          ">Accept Invitation</a>
          <p style="color: #888; font-size: 13px;">
            This invitation expires in 7 days.
            If you did not expect this invitation, you can safely ignore this email.
          </p>
        </div>
      `,
    });
  }
}

export const emailService = new EmailService();
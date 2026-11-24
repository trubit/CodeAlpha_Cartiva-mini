import dns from 'dns';
import https from 'https';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // Ignore in environments where not supported
}

function sendViaBrevoHttps(
  apiKey: string,
  payload: {
    sender: { name: string; email: string };
    to: Array<{ email: string }>;
    subject: string;
    htmlContent?: string;
    textContent?: string;
  }
): Promise<{ success: boolean; messageId?: string }> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const req = https.request(
      'https://api.brevo.com/v3/smtp/email',
      {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'accept': 'application/json',
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(postData),
        },
        timeout: 10000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = JSON.parse(body);
              resolve({ success: true, messageId: parsed.messageId });
            } catch {
              resolve({ success: true });
            }
          } else {
            reject(new Error(`Brevo API status ${res.statusCode}: ${body}`));
          }
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('Brevo API request timed out after 10000ms'));
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  simulated?: boolean;
}

class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    const isPlaceholder =
      !env.EMAIL_HOST ||
      (env.EMAIL_HOST === 'smtp.mailtrap.io' &&
        (env.EMAIL_USER === 'placeholder_smtp_user' || !env.EMAIL_USER));

    if (env.NODE_ENV === 'test' || isPlaceholder) {
      this.isConfigured = false;
      logger.info('Email service initialized in simulation/development mode.');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: env.EMAIL_HOST,
        port: env.EMAIL_PORT,
        secure: env.EMAIL_PORT === 465,
        auth: {
          user: env.EMAIL_USER,
          pass: env.EMAIL_PASSWORD,
        },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000,
      });
      this.isConfigured = true;
      logger.info('Email service initialized with SMTP transport.');
    } catch (error) {
      this.isConfigured = false;
      logger.warn(
        { error: (error as Error).message },
        'Failed to initialize SMTP transporter; email service will simulate sends.'
      );
    }
  }

  public async sendEmail(options: EmailOptions): Promise<EmailSendResult> {
    if (env.NODE_ENV === 'test') {
      logger.info(
        { to: options.to, subject: options.subject },
        'Email dispatch simulated (test or development mode)'
      );
      return { success: true, simulated: true };
    }

    // 1. Primary: If BREVO_API_KEY is configured, dispatch directly via Brevo REST API (HTTPS port 443)
    if (env.BREVO_API_KEY) {
      try {
        const fromMatch = env.EMAIL_FROM.match(/^(?:(.*?)<)?([^>]+)>?$/);
        const senderName = fromMatch?.[1]?.trim() || 'Cartiva Mini';
        const senderEmail = fromMatch?.[2]?.trim() || 'beth.ezika67@gmail.com';

        const result = await sendViaBrevoHttps(env.BREVO_API_KEY, {
          sender: { name: senderName, email: senderEmail },
          to: [{ email: options.to }],
          subject: options.subject,
          htmlContent: options.html,
          textContent: options.text,
        });

        logger.info(
          { to: options.to, messageId: result.messageId, provider: 'brevo-api' },
          'Email dispatched successfully via Brevo REST API'
        );
        return { success: true, messageId: result.messageId, simulated: false };
      } catch (brevoErr) {
        logger.warn(
          { error: (brevoErr as Error).message },
          'Brevo REST API dispatch failed; attempting fallback to SMTP transport'
        );
      }
    }

    // 2. Secondary fallback: SMTP transport
    if (this.isConfigured && this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: env.EMAIL_FROM,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        });

        logger.info(
          { to: options.to, messageId: info.messageId, provider: 'smtp' },
          'Email dispatched successfully via SMTP transport'
        );

        return { success: true, messageId: info.messageId, simulated: false };
      } catch (error) {
        logger.error(
          { to: options.to, error: (error as Error).message },
          'Failed to dispatch email via SMTP transport'
        );
      }
    }

    // 3. Fallback: Simulation if offline or credentials unconfigured
    logger.info(
      { to: options.to, subject: options.subject },
      'Email dispatch simulated (fallback mode)'
    );
    return { success: true, simulated: true };
  }

  /**
   * 6-Digit OTP Verification Email (Replaces verification-link flow)
   */
  public async sendOtpEmail(
    to: string,
    firstName: string,
    otpCode: string,
    purpose: 'email_verification' | 'password_reset' | 'login_verification',
    expiryMinutes: number = 30
  ): Promise<EmailSendResult> {
    const purposeTitle =
      purpose === 'email_verification'
        ? 'Verify Your Email Address'
        : purpose === 'password_reset'
          ? 'Password Reset Code'
          : 'Security Verification Code';

    // Do NOT include the secret OTP in the subject to ensure it is never exposed in logs
    const subject = `Cartiva Mini — Your ${purposeTitle}`;

    const bodyContent = `
      <p style="margin: 0 0 16px; font-size: 15px; color: #334155;">Hello ${firstName},</p>
      <p style="margin: 0 0 16px; font-size: 15px; color: #334155;">
        Thank you for choosing Cartiva Mini. Please use the six-digit verification code below to complete your ${
          purpose === 'email_verification' ? 'email verification' : 'verification request'
        }:
      </p>
      <div style="margin: 28px 0; text-align: center;">
        <p style="margin: 0 0 10px; font-size: 13px; font-weight: 700; color: #1557D5; text-transform: uppercase; letter-spacing: 1px;">
          Your Cartiva Mini Verification Code
        </p>
        <div style="display: inline-block; background-color: #101D3B; color: #FFFFFF; font-size: 34px; font-weight: 800; letter-spacing: 10px; padding: 18px 40px; border-radius: 12px; font-family: 'Courier New', Courier, monospace; box-shadow: 0 8px 20px rgba(16, 29, 59, 0.25);">
          ${otpCode}
        </div>
      </div>
      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px 20px; margin: 24px 0; text-align: left;">
        <p style="margin: 0 0 8px; font-size: 14px; font-weight: 700; color: #1E293B;">Important Instructions:</p>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.7;">
          <li>Enter this six-digit code on the Cartiva Mini verification page.</li>
          <li>The code expires after <strong>${expiryMinutes} minutes</strong>.</li>
          <li>Never share the code with anyone. Cartiva Mini staff will never ask for your verification code.</li>
          <li>Request another code if the current one expires.</li>
        </ul>
      </div>
    `;

    const footerNote = `Security notice: Never share this code with anyone. If you did not request this verification code, please ignore this email or contact support.`;

    const html = this.generateBrandedTemplate({
      title: `${purposeTitle} — Cartiva Mini`,
      headline: purposeTitle,
      bodyContent,
      footerNote,
    });

    const text = `Hello ${firstName},\n\nYour Cartiva Mini Verification Code: ${otpCode}\n\nInstructions:\n- Enter this six-digit code on the Cartiva Mini verification page.\n- The code expires after ${expiryMinutes} minutes.\n- Never share the code with anyone.\n- Request another code if the current one expires.\n\n— Cartiva Mini Team`;

    return this.sendEmail({ to, subject, html, text });
  }

  /**
   * Generates Cartiva Mini branded HTML email layout.
   */
  private generateBrandedTemplate(params: {
    title: string;
    headline: string;
    bodyContent: string;
    ctaText?: string;
    ctaUrl?: string;
    footerNote?: string;
  }): string {
    const ctaButtonHtml =
      params.ctaText && params.ctaUrl
        ? `
        <div style="margin: 32px 0; text-align: center;">
          <a href="${params.ctaUrl}" style="background-color: #0f172a; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            ${params.ctaText}
          </a>
        </div>
        `
        : '';

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${params.title}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
                <!-- Header -->
                <tr>
                  <td style="padding: 32px 40px 24px; border-bottom: 1px solid #f1f5f9; text-align: center;">
                    <span style="font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #0f172a;">CARTIVA<span style="color: #6366f1;">.</span>MINI</span>
                  </td>
                </tr>
                <!-- Content -->
                <tr>
                  <td style="padding: 36px 40px;">
                    <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #0f172a; line-height: 1.3;">${params.headline}</h1>
                    <div style="font-size: 15px; line-height: 1.6; color: #334155;">
                      ${params.bodyContent}
                    </div>
                    ${ctaButtonHtml}
                    ${
                      params.footerNote
                        ? `<p style="margin: 24px 0 0; font-size: 13px; color: #64748b; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 16px;">${params.footerNote}</p>`
                        : ''
                    }
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                    <p style="margin: 0 0 4px;">&copy; ${new Date().getFullYear()} Cartiva Mini. All rights reserved.</p>
                    <p style="margin: 0;">Securing premium commercial shopping for discerning customers.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }



  /**
   * Password Reset Email
   */
  public async sendPasswordResetEmail(
    to: string,
    firstName: string,
    resetToken: string
  ): Promise<EmailSendResult> {
    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const subject = 'Cartiva Mini — Password Reset Request';

    const bodyContent = `
      <p>Hello ${firstName},</p>
      <p>We received a request to reset the password for your Cartiva Mini account.</p>
      <p>You can choose a new password by clicking the secure link below.</p>
    `;

    const footerNote = `For your security, this password reset link is strictly valid for 1 hour. If you did not request this change, your account is still safe and no action is required.`;

    const html = this.generateBrandedTemplate({
      title: subject,
      headline: 'Reset Your Password',
      bodyContent,
      ctaText: 'Reset Password',
      ctaUrl: resetUrl,
      footerNote,
    });

    const text = `Hello ${firstName},\n\nWe received a request to reset your Cartiva Mini account password. Use the link below to set a new password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you did not request this, please disregard this email.`;

    return this.sendEmail({ to, subject, html, text });
  }

  /**
   * Password Changed Security Notification
   */
  public async sendPasswordChangedNotification(
    to: string,
    firstName: string
  ): Promise<EmailSendResult> {
    const subject = 'Cartiva Mini — Security Notification: Password Changed';

    const bodyContent = `
      <p>Hello ${firstName},</p>
      <p>The password associated with your Cartiva Mini account was recently changed.</p>
      <p>All active sessions on other devices have been automatically revoked for your security.</p>
    `;

    const footerNote = `If you did not make this change, please contact our support team immediately or request a password reset to safeguard your account.`;

    const html = this.generateBrandedTemplate({
      title: subject,
      headline: 'Password Successfully Updated',
      bodyContent,
      footerNote,
    });

    const text = `Hello ${firstName},\n\nThe password for your Cartiva Mini account was recently updated. All existing sessions have been invalidated.\n\nIf you did not make this change, please contact support immediately.`;

    return this.sendEmail({ to, subject, html, text });
  }

  /**
   * Email Change Verification Email
   */
  public async sendEmailChangeVerificationEmail(
    to: string,
    firstName: string,
    otpCode: string
  ): Promise<EmailSendResult> {
    const subject = 'Cartiva Mini — Confirm Your New Email Address';

    const bodyContent = `
      <p>Hello ${firstName},</p>
      <p>We received a request to update the primary email address on your Cartiva Mini account to this address.</p>
      <p>Use the following 6-digit verification code to confirm this update:</p>
      <div style="margin: 24px 0; padding: 18px; background: #F8FAFC; border: 2px dashed #CBD5E1; border-radius: 12px; text-align: center;">
        <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0A192F; font-family: monospace;">${otpCode}</span>
      </div>
      <p style="font-size: 13px; color: #64748B;">This code expires in 30 minutes. If you did not request this update, please secure your account immediately.</p>
    `;

    const html = this.generateBrandedTemplate({
      title: subject,
      headline: 'Confirm Your New Email Address',
      bodyContent,
    });

    const text = `Hello ${firstName},\n\nUse this 6-digit code to confirm your new Cartiva Mini email address: ${otpCode}\n\nThis code expires in 30 minutes.`;

    return this.sendEmail({ to, subject, html, text });
  }

  /**
   * Account Deactivation Notification
   */
  public async sendAccountDeactivationNotice(
    to: string,
    firstName: string
  ): Promise<EmailSendResult> {
    const subject = 'Cartiva Mini — Account Deactivation Notice';

    const bodyContent = `
      <p>Hello ${firstName},</p>
      <p>Your Cartiva Mini account has been successfully deactivated in accordance with your request.</p>
      <p>All active sessions have been terminated. Your order history and transaction records are preserved in our secure archive in accordance with legal and financial retention requirements.</p>
    `;

    const footerNote = `If you wish to reactivate your account in the future, please contact our support team.`;

    const html = this.generateBrandedTemplate({
      title: subject,
      headline: 'Account Deactivated',
      bodyContent,
      footerNote,
    });

    const text = `Hello ${firstName},\n\nYour Cartiva Mini account has been deactivated per your request. All active sessions have been terminated.\n\nIf you did not request this, please contact support immediately.`;

    return this.sendEmail({ to, subject, html, text });
  }

  /**
   * Account Deletion Request Received
   */
  public async sendDeletionRequestConfirmation(
    to: string,
    firstName: string,
    requestId: string
  ): Promise<EmailSendResult> {
    const subject = 'Cartiva Mini — Account Deletion Request Received';

    const bodyContent = `
      <p>Hello ${firstName},</p>
      <p>We have received your formal request to delete your personal data associated with Cartiva Mini (Reference ID: <strong>${requestId}</strong>).</p>
      <p>In accordance with data privacy regulations and our data retention policy, our administrative compliance team will review your account to fulfill deletion while preserving legally mandated tax and transaction records.</p>
    `;

    const footerNote = `You will receive a follow-up notification once the review is completed.`;

    const html = this.generateBrandedTemplate({
      title: subject,
      headline: 'Deletion Request Under Review',
      bodyContent,
      footerNote,
    });

    const text = `Hello ${firstName},\n\nWe received your account deletion request (ID: ${requestId}). Our team is reviewing it in accordance with applicable privacy laws and data retention obligations.`;

    return this.sendEmail({ to, subject, html, text });
  }
}

export const emailService = new EmailService();

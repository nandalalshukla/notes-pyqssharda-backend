/**
 * Report Email Service
 * Handles sending notification emails for reporting system
 * Sends emails to: reporters, content owners, and moderators
 *
 * Architecture:
 * - Decoupled from main report logic for better maintainability
 * - Graceful error handling (logs but doesn't fail the report)
 * - Async/non-blocking to prevent delays in report creation
 */

import { sendEmail } from "../../utils/email.js";
import {
  reporterConfirmationTemplate,
  contentOwnerNotificationTemplate,
  reportResolutionTemplate,
  moderatorAlertTemplate,
  type ReportEmailContext,
} from "./reportEmailTemplates.js";

export interface ReportNotificationPayload {
  reportId: string;
  reporterEmail: string;
  reporterName: string;
  contentOwnerEmail: string;
  contentOwnerName: string;
  targetType: "post" | "comment" | "user";
  reason: string;
  reportMessage?: string;
  createdAt: Date;
}

export interface ReportResolutionPayload extends ReportNotificationPayload {
  actionTaken: string;
  moderatorName: string;
  contentOwnerEmail: string;
  contentOwnerName: string;
}

const APP_URL = process.env.APP_URL || "https://sharda-social.vercel.app";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@sharda.social";

/**
 * Send confirmation email to the user who submitted the report
 * This executes asynchronously and doesn't block report creation
 */
export const sendReportConfirmationEmail = async (
  payload: ReportNotificationPayload,
): Promise<void> => {
  try {
    const context: ReportEmailContext = {
      reporterName: payload.reporterName,
      contentOwnerName: payload.contentOwnerName,
      targetType: payload.targetType,
      reason: payload.reason,
      reportMessage: payload.reportMessage,
      reportId: payload.reportId,
      createdAt: payload.createdAt,
      appUrl: APP_URL,
    };

    const html = reporterConfirmationTemplate(context);
    const subject = `Report Received - We're On It`;

    const result = await sendEmail(payload.reporterEmail, subject, html);

    if (!result.success) {
      console.warn(
        `⚠️ Failed to send confirmation email to reporter ${payload.reporterEmail}:`,
        result.error,
      );
    }
  } catch (error) {
    console.error(
      `❌ Error sending confirmation email to reporter:`,
      error instanceof Error ? error.message : error,
    );
    // Don't throw - email failures shouldn't block report creation
  }
};

/**
 * Notify content owner that their content has been reported
 * This executes asynchronously and doesn't block report creation
 */
export const sendContentOwnerNotificationEmail = async (
  payload: ReportNotificationPayload,
): Promise<void> => {
  try {
    const context: ReportEmailContext = {
      reporterName: payload.reporterName,
      contentOwnerName: payload.contentOwnerName,
      targetType: payload.targetType,
      reason: payload.reason,
      reportMessage: payload.reportMessage,
      reportId: payload.reportId,
      createdAt: payload.createdAt,
      appUrl: APP_URL,
    };

    const html = contentOwnerNotificationTemplate(context);
    const subject = `Your ${payload.targetType} Has Been Reported`;

    const result = await sendEmail(payload.contentOwnerEmail, subject, html);

    if (!result.success) {
      console.warn(
        `⚠️ Failed to send notification email to content owner ${payload.contentOwnerEmail}:`,
        result.error,
      );
    }
  } catch (error) {
    console.error(
      `❌ Error sending notification email to content owner:`,
      error instanceof Error ? error.message : error,
    );
    // Don't throw - email failures shouldn't block report creation
  }
};

/**
 * Send alert to moderators about new report
 * Primarily for admin dashboard, but can be used for urgent cases
 * Optional - controlled by environment variable
 */
export const sendModeratorAlertEmail = async (
  payload: ReportNotificationPayload,
): Promise<void> => {
  // Only send if enabled in environment
  if (process.env.SEND_MODERATOR_ALERTS !== "true") {
    return;
  }

  try {
    const context: ReportEmailContext = {
      reporterName: payload.reporterName,
      contentOwnerName: payload.contentOwnerName,
      targetType: payload.targetType,
      reason: payload.reason,
      reportMessage: payload.reportMessage,
      reportId: payload.reportId,
      createdAt: payload.createdAt,
      appUrl: APP_URL,
    };

    const html = moderatorAlertTemplate(context);
    const subject = `[URGENT] New Report #${payload.reportId.slice(-8)} - Action Required`;

    const result = await sendEmail(ADMIN_EMAIL, subject, html);

    if (!result.success) {
      console.warn(`⚠️ Failed to send moderator alert email:`, result.error);
    }
  } catch (error) {
    console.error(
      `❌ Error sending moderator alert email:`,
      error instanceof Error ? error.message : error,
    );
    // Don't throw - email failures shouldn't block report creation
  }
};

/**
 * Notify reporter of moderation action taken on their report
 * Called when moderator has reviewed and taken action
 */
export const sendReportResolutionEmail = async (
  payload: ReportResolutionPayload,
): Promise<void> => {
  try {
    const context = {
      reporterName: payload.reporterName,
      contentOwnerName: payload.contentOwnerName,
      targetType: payload.targetType,
      reason: payload.reason,
      reportMessage: payload.reportMessage,
      reportId: payload.reportId,
      createdAt: payload.createdAt,
      appUrl: APP_URL,
      actionTaken: payload.actionTaken,
      moderatorName: payload.moderatorName,
    };

    const html = reportResolutionTemplate(context);
    const subject = `Report Resolution - Action Taken`;

    const result = await sendEmail(payload.reporterEmail, subject, html);

    if (!result.success) {
      console.warn(
        `⚠️ Failed to send resolution email to reporter ${payload.reporterEmail}:`,
        result.error,
      );
    }
  } catch (error) {
    console.error(
      `❌ Error sending resolution email to reporter:`,
      error instanceof Error ? error.message : error,
    );
    // Don't throw - email failures shouldn't affect moderation actions
  }
};

/**
 * Send notification to content owner about moderation decision
 * Informs them if their content was deleted or they received a warning
 */
export const sendContentOwnerActionNotificationEmail = async (
  payload: ReportResolutionPayload,
): Promise<void> => {
  try {
    // Only send if action was taken against the content owner
    const actionsTakingEffect = [
      "post_deleted",
      "comment_deleted",
      "warning_sent",
      "user_suspended",
      "user_deleted",
    ];

    if (!actionsTakingEffect.includes(payload.actionTaken)) {
      return;
    }

    const actionMessages: Record<string, string> = {
      post_deleted: "Your post has been removed",
      comment_deleted: "Your comment has been removed",
      warning_sent: "Your account has received a formal warning",
      user_suspended: "Your account has been temporarily suspended",
      user_deleted: "Your account has been permanently deleted",
    };

    const subject =
      actionMessages[payload.actionTaken] || "Account Action Taken";

    const html = `
<div style="color:#374151;line-height:1.6;">
  <h2 style="color:#111827;margin:0 0 16px 0;font-size:20px;font-weight:700;">
    Moderation Action Taken
  </h2>
  
  <p style="margin:0 0 16px 0;color:#4B5563;">
    Hello <strong>${payload.contentOwnerName}</strong>,
  </p>

  <p style="margin:0 0 20px 0;color:#4B5563;">
    After reviewing a report against your ${payload.targetType}, our moderation team has taken the following action:
  </p>

  <div style="background-color:#FEE2E2;border:1px solid #FECACA;border-radius:8px;padding:16px;margin:24px 0;">
    <p style="margin:0;font-size:13px;color:#991B1B;">
      <strong>Action Taken:</strong> ${actionMessages[payload.actionTaken]}
    </p>
  </div>

  <p style="margin:16px 0 0 0;color:#6B7280;font-size:13px;">
    Please review our community guidelines to ensure future content complies with our standards. 
    If you believe this action was unfair, you can appeal within 30 days.
  </p>
</div>
    `;

    const result = await sendEmail(payload.contentOwnerEmail, subject, html);

    if (!result.success) {
      console.warn(
        `⚠️ Failed to send action notification to content owner ${payload.contentOwnerEmail}:`,
        result.error,
      );
    }
  } catch (error) {
    console.error(
      `❌ Error sending action notification to content owner:`,
      error instanceof Error ? error.message : error,
    );
    // Don't throw - email failures shouldn't affect moderation actions
  }
};

/**
 * Batch send all notification emails for a new report
 * Executes all emails concurrently without blocking
 * Returns success/failure status for each email
 */
export const sendReportNotificationEmails = async (
  payload: ReportNotificationPayload,
): Promise<{
  confirmation: boolean;
  contentOwnerNotification: boolean;
  moderatorAlert: boolean;
}> => {
  // Execute all emails concurrently
  const [confirmationResult, contentOwnerResult, moderatorResult] =
    await Promise.allSettled([
      sendReportConfirmationEmail(payload),
      sendContentOwnerNotificationEmail(payload),
      sendModeratorAlertEmail(payload),
    ]);

  return {
    confirmation: confirmationResult.status === "fulfilled",
    contentOwnerNotification: contentOwnerResult.status === "fulfilled",
    moderatorAlert: moderatorResult.status === "fulfilled",
  };
};

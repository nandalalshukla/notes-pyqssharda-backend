/**
 * Report Email Templates
 * Professional HTML email templates for the reporting system
 * Sends notifications to reporters, content owners, and moderators
 */

export interface ReportEmailContext {
  reporterName: string;
  contentOwnerName: string;
  targetType: "post" | "comment" | "user";
  reason: string;
  reportMessage?: string;
  reportId: string;
  createdAt: Date;
  appUrl: string;
}

/**
 * Email template for report confirmation sent to the reporter
 */
export const reporterConfirmationTemplate = (context: ReportEmailContext) => {
  const contentTypeLabel = {
    post: "post",
    comment: "comment",
    user: "user",
  }[context.targetType];

  const reasonLabel = context.reason.replace(/_/g, " ").toLowerCase();

  return `
<div style="color:#374151;line-height:1.6;">
  <h2 style="color:#111827;margin:0 0 16px 0;font-size:20px;font-weight:700;">
    Thank You for Your Report
  </h2>
  
  <p style="margin:0 0 16px 0;color:#4B5563;">
    Hello <strong>${context.reporterName}</strong>,
  </p>

  <p style="margin:0 0 20px 0;color:#4B5563;">
    We've received your report and appreciate you helping keep our community safe and respectful. 
    Our moderation team will review it thoroughly and take appropriate action within 24-48 hours.
  </p>

  <!-- Report Summary Card -->
  <div style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:16px;margin:24px 0;">
    <h3 style="margin:0 0 12px 0;color:#111827;font-size:14px;font-weight:600;">Report Summary</h3>
    
    <table style="width:100%;font-size:13px;color:#374151;">
      <tr style="border-bottom:1px solid #E5E7EB;">
        <td style="padding:8px 0;font-weight:500;color:#111827;">Report ID:</td>
        <td style="padding:8px 0;text-align:right;font-family:monospace;color:#6B7280;">${context.reportId.slice(-8)}</td>
      </tr>
      <tr style="border-bottom:1px solid #E5E7EB;">
        <td style="padding:8px 0;font-weight:500;color:#111827;">Content Type:</td>
        <td style="padding:8px 0;text-align:right;text-transform:capitalize;">${contentTypeLabel}</td>
      </tr>
      <tr style="border-bottom:1px solid #E5E7EB;">
        <td style="padding:8px 0;font-weight:500;color:#111827;">Reason:</td>
        <td style="padding:8px 0;text-align:right;text-transform:capitalize;">${reasonLabel}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-weight:500;color:#111827;">Submitted:</td>
        <td style="padding:8px 0;text-align:right;">${context.createdAt.toLocaleDateString(
          "en-US",
          {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          },
        )}</td>
      </tr>
    </table>

    ${
      context.reportMessage
        ? `<p style="margin:12px 0 0 0;padding-top:12px;border-top:1px solid #E5E7EB;font-size:12px;color:#4B5563;"><strong>Your Message:</strong><br/>"${context.reportMessage}"</p>`
        : ""
    }
  </div>

  <div style="background-color:#EFF6FF;border-left:4px solid #3B82F6;padding:12px 16px;margin:20px 0;border-radius:4px;">
    <p style="margin:0;font-size:13px;color:#1E40AF;">
      <strong>What happens next?</strong> Our moderation team reviews all reports carefully. 
      If action is needed, the appropriate measures will be taken. You'll receive a follow-up notification.
    </p>
  </div>

  <p style="margin:20px 0 0 0;color:#6B7280;font-size:13px;">
    If you have any questions, please reach out to our support team.
  </p>
</div>
  `;
};

/**
 * Email template notifying content owner of a report
 */
export const contentOwnerNotificationTemplate = (
  context: ReportEmailContext,
) => {
  const contentTypeLabel = {
    post: "post",
    comment: "comment",
    user: "your account",
  }[context.targetType];

  const reasonLabel = context.reason.replace(/_/g, " ").toLowerCase();

  return `
<div style="color:#374151;line-height:1.6;">
  <h2 style="color:#111827;margin:0 0 16px 0;font-size:20px;font-weight:700;">
    Your ${contentTypeLabel.charAt(0).toUpperCase() + contentTypeLabel.slice(1)} Has Been Reported
  </h2>
  
  <p style="margin:0 0 16px 0;color:#4B5563;">
    Hello <strong>${context.contentOwnerName}</strong>,
  </p>

  <p style="margin:0 0 20px 0;color:#4B5563;">
    A user has reported your ${contentTypeLabel} for violating our community standards. 
    Our moderation team will review this report carefully. Depending on their findings, 
    your content may be removed and/or your account may face restrictions.
  </p>

  <!-- Report Details Card -->
  <div style="background-color:#FEF3C7;border:1px solid #FCD34D;border-radius:8px;padding:16px;margin:24px 0;">
    <h3 style="margin:0 0 12px 0;color:#92400E;font-size:14px;font-weight:600;">Report Details</h3>
    
    <table style="width:100%;font-size:13px;color:#374151;">
      <tr style="border-bottom:1px solid #FCD34D;">
        <td style="padding:8px 0;font-weight:500;color:#111827;">Content Type:</td>
        <td style="padding:8px 0;text-align:right;text-transform:capitalize;">${contentTypeLabel}</td>
      </tr>
      <tr style="border-bottom:1px solid #FCD34D;">
        <td style="padding:8px 0;font-weight:500;color:#111827;">Reason:</td>
        <td style="padding:8px 0;text-align:right;text-transform:capitalize;">${reasonLabel}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-weight:500;color:#111827;">Reported:</td>
        <td style="padding:8px 0;text-align:right;">${context.createdAt.toLocaleDateString(
          "en-US",
          {
            year: "numeric",
            month: "short",
            day: "numeric",
          },
        )}</td>
      </tr>
    </table>
  </div>

  <div style="background-color:#F0FDF4;border-left:4px solid #22C55E;padding:12px 16px;margin:20px 0;border-radius:4px;">
    <p style="margin:0;font-size:13px;color:#15803D;">
      <strong>Our Commitment:</strong> We maintain fair and transparent moderation. 
      If you believe this report is unfair, you can appeal when we notify you of our decision.
    </p>
  </div>

  <p style="margin:20px 0 0 0;color:#6B7280;font-size:13px;">
    You can review our community guidelines to ensure your content complies with our standards.
  </p>
</div>
  `;
};

/**
 * Email template for moderators when a new report is submitted
 * (Usually integrated into dashboard, but can be sent as admin notification)
 */
export const moderatorAlertTemplate = (context: ReportEmailContext) => {
  const contentTypeLabel = {
    post: "post",
    comment: "comment",
    user: "user",
  }[context.targetType];

  const reasonLabel = context.reason.replace(/_/g, " ").toLowerCase();

  return `
<div style="color:#374151;line-height:1.6;">
  <h2 style="color:#111827;margin:0 0 16px 0;font-size:20px;font-weight:700;">
    🚨 New Report Submitted - Requires Review
  </h2>
  
  <p style="margin:0 0 20px 0;color:#4B5563;">
    A new report has been submitted by <strong>${context.reporterName}</strong> and requires moderation review.
  </p>

  <!-- Report Details Card -->
  <div style="background-color:#F3F4F6;border:1px solid #D1D5DB;border-radius:8px;padding:16px;margin:20px 0;">
    <h3 style="margin:0 0 12px 0;color:#111827;font-size:14px;font-weight:600;">Report Information</h3>
    
    <table style="width:100%;font-size:13px;color:#374151;">
      <tr style="border-bottom:1px solid #D1D5DB;">
        <td style="padding:8px 0;font-weight:500;color:#111827;width:35%;">Report ID:</td>
        <td style="padding:8px 0;font-family:monospace;color:#6B7280;">${context.reportId}</td>
      </tr>
      <tr style="border-bottom:1px solid #D1D5DB;">
        <td style="padding:8px 0;font-weight:500;color:#111827;">Reported By:</td>
        <td style="padding:8px 0;">${context.reporterName}</td>
      </tr>
      <tr style="border-bottom:1px solid #D1D5DB;">
        <td style="padding:8px 0;font-weight:500;color:#111827;">Content Owner:</td>
        <td style="padding:8px 0;">${context.contentOwnerName}</td>
      </tr>
      <tr style="border-bottom:1px solid #D1D5DB;">
        <td style="padding:8px 0;font-weight:500;color:#111827;">Content Type:</td>
        <td style="padding:8px 0;text-transform:capitalize;">${contentTypeLabel}</td>
      </tr>
      <tr style="border-bottom:1px solid #D1D5DB;">
        <td style="padding:8px 0;font-weight:500;color:#111827;">Reason:</td>
        <td style="padding:8px 0;text-transform:capitalize;">${reasonLabel}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-weight:500;color:#111827;">Submitted:</td>
        <td style="padding:8px 0;">${context.createdAt.toLocaleDateString(
          "en-US",
          {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          },
        )}</td>
      </tr>
    </table>

    ${
      context.reportMessage
        ? `<p style="margin:12px 0 0 0;padding-top:12px;border-top:1px solid #D1D5DB;font-size:12px;color:#4B5563;"><strong>Reporter Message:</strong><br/>"${context.reportMessage}"</p>`
        : ""
    }
  </div>

  <div style="text-align:center;margin:24px 0;">
    <a href="${context.appUrl}/admin/reports/${context.reportId}" style="display:inline-block;background-color:#2563EB;color:white;padding:10px 24px;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">
      Review Report in Dashboard
    </a>
  </div>

  <p style="margin:16px 0 0 0;color:#6B7280;font-size:12px;border-top:1px solid #E5E7EB;padding-top:16px;">
    This is an automated notification. Log in to the admin dashboard to take action on this report.
  </p>
</div>
  `;
};

/**
 * Email template for moderator action notification to reporter
 */
export const reportResolutionTemplate = (
  context: ReportEmailContext & {
    actionTaken: string;
    moderatorName: string;
  },
) => {
  const contentTypeLabel = {
    post: "post",
    comment: "comment",
    user: "user",
  }[context.targetType];

  const actionMessages: Record<string, string> = {
    post_deleted: "The reported post has been removed from the platform.",
    comment_deleted: "The reported comment has been removed from the platform.",
    warning_sent:
      "The user who created this content has been sent a formal warning.",
    user_suspended:
      "The user account has been suspended due to violations of community standards.",
    user_deleted: "The user account has been permanently deleted.",
    ignored:
      "After careful review, this report was determined not to violate our community standards.",
    none: "The report has been reviewed.",
  };

  return `
<div style="color:#374151;line-height:1.6;">
  <h2 style="color:#111827;margin:0 0 16px 0;font-size:20px;font-weight:700;">
    Report Review Complete
  </h2>
  
  <p style="margin:0 0 16px 0;color:#4B5563;">
    Hello <strong>${context.reporterName}</strong>,
  </p>

  <p style="margin:0 0 20px 0;color:#4B5563;">
    Thank you for reporting inappropriate content. Our moderation team has completed their review of your report.
  </p>

  <!-- Action Taken Card -->
  <div style="background-color:#F0FDF4;border:1px solid #BBEF63;border-radius:8px;padding:16px;margin:24px 0;">
    <h3 style="margin:0 0 12px 0;color:#166534;font-size:14px;font-weight:600;">✓ Action Taken</h3>
    <p style="margin:0;font-size:13px;color:#166534;">
      ${actionMessages[context.actionTaken] || "The report has been processed."}
    </p>
  </div>

  <!-- Report Details -->
  <div style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:16px;margin:20px 0;font-size:13px;">
    <p style="margin:0 0 8px 0;color:#6B7280;">
      <strong>Report ID:</strong> ${context.reportId.slice(-8)}
    </p>
    <p style="margin:0 0 8px 0;color:#6B7280;">
      <strong>Content Type:</strong> ${contentTypeLabel}
    </p>
    <p style="margin:0;color:#6B7280;">
      <strong>Reviewed By:</strong> Moderation Team
    </p>
  </div>

  <p style="margin:16px 0 0 0;color:#6B7280;font-size:13px;">
    We appreciate your contribution to keeping our community safe. Your feedback helps us maintain a respectful environment for everyone.
  </p>
</div>
  `;
};

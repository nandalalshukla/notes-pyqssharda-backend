import { transporter } from "../config/email.js";

const EMAIL_FROM =
  process.env.EMAIL_FROM || "Sharda Online Library <shuklanandalal@gmail.com>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "shuklanandalal@gmail.com";

// Clean, minimal email wrapper matching website theme
const emailWrapper = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sharda Online Library</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F2F4F8;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F2F4F8; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border: 2px solid #000000;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px; text-align: center; border-bottom: 2px solid #000000;">
              <h1 style="margin: 0; color: #000000; font-size: 24px; font-weight: 700;">
                Sharda Online Library
              </h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; text-align: center; border-top: 2px solid #000000; background-color: #F2F4F8;">
              <p style="margin: 0 0 8px 0; color: #666666; font-size: 12px;">
                © ${new Date().getFullYear()} Sharda Online Library
              </p>
              <p style="margin: 0; color: #999999; font-size: 11px;">
                Your Academic Resource Hub
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Helper function to send email with Nodemailer
async function sendEmail(to: string, subject: string, html: string) {
  try {
    console.log(`📧 Attempting to send email to: ${to}`);
    console.log(`📧 Subject: ${subject}`);

    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      html: emailWrapper(html),
    });

    console.log(`✅ Email sent successfully to: ${to}`);
    console.log(`📬 Message ID: ${info.messageId}`);
    return info;
  } catch (error: any) {
    console.error(`❌ Failed to send email to: ${to}`);
    console.error(`❌ Error details:`, error.message);
    throw error;
  }
}

export async function sendOTPMail(email: string, otp: string) {
  const content = `
    <h2 style="margin: 0 0 24px 0; color: #000000; font-size: 20px; font-weight: 600; text-align: center;">
      Email Verification
    </h2>
    <p style="margin: 0 0 24px 0; color: #333333; font-size: 15px; line-height: 1.6; text-align: center;">
      Enter this code to verify your email address:
    </p>
    <div style="background-color: #F2F4F8; border: 2px solid #000000; padding: 24px; text-align: center; margin: 0 0 24px 0;">
      <div style="font-size: 32px; font-weight: 700; color: #C084FC; letter-spacing: 8px; font-family: monospace;">
        ${otp}
      </div>
    </div>
    <p style="margin: 0; color: #666666; font-size: 13px; text-align: center;">
      This code expires in 10 minutes. If you didn't request this, please ignore this email.
    </p>
  `;

  return sendEmail(email, "Verify Your Email", content);
}

export async function sendWelcomeMail(email: string, name: string) {
  const content = `
    <h2 style="margin: 0 0 16px 0; color: #000000; font-size: 20px; font-weight: 600;">
      Welcome, ${name}!
    </h2>
    <p style="margin: 0 0 24px 0; color: #333333; font-size: 15px; line-height: 1.6;">
      Thank you for joining Sharda Online Library. We're excited to have you as part of our academic community.
    </p>
    <div style="border-left: 3px solid #C084FC; padding-left: 16px; margin: 0 0 24px 0;">
      <p style="margin: 0 0 8px 0; color: #000000; font-size: 14px; font-weight: 600;">
        What's available:
      </p>
      <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.8;">
        • Study notes and materials<br>
        • Previous year question papers<br>
        • Subject-wise syllabus<br>
        • Collaborative learning resources
      </p>
    </div>
    <p style="margin: 0; color: #333333; font-size: 14px;">
      Happy studying!
    </p>
  `;

  return sendEmail(email, "Welcome to Sharda Online Library", content);
}

export async function requestForModeratorMail(email: string, name: string) {
  const content = `
    <h2 style="margin: 0 0 24px 0; color: #000000; font-size: 20px; font-weight: 600;">
      New Moderator Request
    </h2>
    <div style="background-color: #F2F4F8; border: 2px solid #000000; padding: 20px; margin: 0 0 24px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666666; font-size: 14px; font-weight: 600;">Name:</td>
          <td style="padding: 8px 0; color: #000000; font-size: 14px;">${name}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666666; font-size: 14px; font-weight: 600;">Email:</td>
          <td style="padding: 8px 0; color: #000000; font-size: 14px;">${email}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666666; font-size: 14px; font-weight: 600;">Date:</td>
          <td style="padding: 8px 0; color: #000000; font-size: 14px;">${new Date().toLocaleDateString()}</td>
        </tr>
      </table>
    </div>
    <p style="margin: 0; color: #333333; font-size: 14px;">
      Please review this request in the admin panel.
    </p>
  `;

  return sendEmail(
    process.env.ADMIN_EMAIL!,
    "New Moderator Application",
    content,
  );
}

export async function moderatorApprovalMail(email: string, name: string) {
  const content = `
    <div style="text-align: center; margin: 0 0 24px 0;">
      <div style="display: inline-block; background-color: #4ADE80; padding: 12px 24px; border: 2px solid #000000; margin-bottom: 16px;">
        <span style="color: #000000; font-size: 14px; font-weight: 700;">APPROVED</span>
      </div>
    </div>
    <h2 style="margin: 0 0 16px 0; color: #000000; font-size: 20px; font-weight: 600;">
      Congratulations, ${name}!
    </h2>
    <p style="margin: 0 0 24px 0; color: #333333; font-size: 15px; line-height: 1.6;">
      Your application to become a moderator has been approved. You can now help maintain the quality of content on our platform.
    </p>
    <div style="border-left: 3px solid #4ADE80; padding-left: 16px; margin: 0 0 24px 0;">
      <p style="margin: 0 0 8px 0; color: #000000; font-size: 14px; font-weight: 600;">
        Your responsibilities:
      </p>
      <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.8;">
        • Review and approve submitted content<br>
        • Maintain quality standards<br>
        • Support the community<br>
        • Respond to user concerns
      </p>
    </div>
    <p style="margin: 0; color: #333333; font-size: 14px;">
      Welcome to the team!
    </p>
  `;

  return sendEmail(email, "Moderator Application Approved", content);
}

export async function moderatorRejectionMail(email: string, name: string) {
  const content = `
    <h2 style="margin: 0 0 24px 0; color: #000000; font-size: 24px; font-weight: 600;">
      Moderator Application Update
    </h2>
    <p style="margin: 0 0 24px 0; color: #333333; font-size: 16px; line-height: 1.6;">
      Hello ${name},
    </p>
    <p style="margin: 0 0 24px 0; color: #333333; font-size: 15px; line-height: 1.6;">
      Thank you for your interest in becoming a moderator at Sharda Online Library. We truly appreciate the time and effort you put into your application.
    </p>
    <p style="margin: 0 0 32px 0; color: #333333; font-size: 15px; line-height: 1.6;">
      After careful consideration, we regret to inform you that we are unable to approve your moderator application at this time. This decision does not reflect on your value as a community member.
    </p>
    <div style="border-left: 3px solid #FF9F66; background-color: #F2F4F8; padding: 20px; margin: 0 0 32px 0;">
      <p style="margin: 0 0 8px 0; color: #000000; font-size: 14px; font-weight: 600;">
        What's Next?
      </p>
      <p style="margin: 0; color: #333333; font-size: 14px; line-height: 1.6;">
        You're welcome to reapply in the future. We encourage you to continue contributing to our community, and feel free to reach out if you have any questions.
      </p>
    </div>
    <p style="margin: 0; color: #666666; font-size: 14px;">
      Best Regards,<br>
      The Sharda Online Library Team
    </p>
  `;

  return sendEmail(email, "Update on Your Moderator Application", content);
}

export async function contentApprovalMail(
  email: string,
  name: string,
  contentType: string,
) {
  const content = `
    <h2 style="margin: 0 0 24px 0; color: #000000; font-size: 24px; font-weight: 600;">
      Content Published!
    </h2>
    <p style="margin: 0 0 24px 0; color: #333333; font-size: 16px; line-height: 1.6;">
      Great news, ${name}!
    </p>
    <p style="margin: 0 0 32px 0; color: #333333; font-size: 15px; line-height: 1.6;">
      Your ${contentType} submission has been approved and is now live on Sharda Online Library.
    </p>
    <div style="border: 2px solid #4ADE80; background-color: #F2F4F8; padding: 24px; margin: 0 0 32px 0; text-align: center;">
      <p style="margin: 0 0 8px 0; color: #4ADE80; font-size: 12px; font-weight: 700; letter-spacing: 1px;">
        STATUS
      </p>
      <p style="margin: 0; color: #000000; font-size: 18px; font-weight: 600;">
        PUBLISHED
      </p>
    </div>
    <p style="margin: 0 0 32px 0; color: #333333; font-size: 15px; line-height: 1.6;">
      Thank you for your valuable contribution! Your effort helps thousands of students in their academic journey.
    </p>
    <p style="margin: 0; color: #666666; font-size: 14px;">
      Best Regards,<br>
      The Sharda Online Library Team
    </p>
  `;

  return sendEmail(email, `${contentType} Approved - Now Live!`, content);
}

export async function contentRejectionMail(
  email: string,
  name: string,
  contentType: string,
  reason: string,
) {
  const content = `
    <h2 style="margin: 0 0 24px 0; color: #000000; font-size: 24px; font-weight: 600;">
      Content Submission Update
    </h2>
    <p style="margin: 0 0 24px 0; color: #333333; font-size: 16px; line-height: 1.6;">
      Hello ${name},
    </p>
    <p style="margin: 0 0 24px 0; color: #333333; font-size: 15px; line-height: 1.6;">
      Thank you for your ${contentType} submission to Sharda Online Library. We appreciate your effort and contribution.
    </p>
    <p style="margin: 0 0 32px 0; color: #333333; font-size: 15px; line-height: 1.6;">
      After careful review by our moderation team, we're unable to approve your submission at this time.
    </p>
    <div style="border: 2px solid #000000; background-color: #F2F4F8; padding: 20px; margin: 0 0 32px 0;">
      <p style="margin: 0 0 12px 0; color: #000000; font-size: 14px; font-weight: 600;">
        Reason for Rejection:
      </p>
      <p style="margin: 0; color: #333333; font-size: 14px; line-height: 1.6;">
        ${reason}
      </p>
    </div>
    <div style="border-left: 3px solid #C084FC; background-color: #F2F4F8; padding: 20px; margin: 0 0 32px 0;">
      <p style="margin: 0 0 8px 0; color: #000000; font-size: 14px; font-weight: 600;">
        Next Steps
      </p>
      <p style="margin: 0; color: #333333; font-size: 14px; line-height: 1.6;">
        You're welcome to revise and resubmit your content after addressing the feedback above. We're here to help if you have any questions!
      </p>
    </div>
    <p style="margin: 0; color: #666666; font-size: 14px;">
      Thank you for understanding,<br>
      The Sharda Online Library Moderation Team
    </p>
  `;

  return sendEmail(
    email,
    `${contentType} Submission - Revision Needed`,
    content,
  );
}

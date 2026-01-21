import { resend } from "../config/email.js";

const EMAIL_FROM =
  process.env.EMAIL_FROM || "Sharda Online Library <onboarding@resend.dev>";

// Professional email wrapper template
const emailWrapper = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sharda Online Library</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f7fa;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f7fa; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                📚 Sharda Online Library
              </h1>
              <p style="margin: 8px 0 0 0; color: #ffffff; opacity: 0.9; font-size: 14px;">
                Your Academic Resource Hub
              </p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 10px 0; color: #6c757d; font-size: 13px;">
                © ${new Date().getFullYear()} Sharda Online Library. All rights reserved.
              </p>
              <p style="margin: 0; color: #adb5bd; font-size: 12px;">
                This email was sent to you because you have an account with us.
              </p>
              <div style="margin-top: 15px;">
                <a href="#" style="color: #667eea; text-decoration: none; font-size: 12px; margin: 0 10px;">Help Center</a>
                <span style="color: #dee2e6;">|</span>
                <a href="#" style="color: #667eea; text-decoration: none; font-size: 12px; margin: 0 10px;">Contact Support</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Helper function to send email with Resend
async function sendEmail(to: string, subject: string, html: string) {
  try {
    console.log(`📧 Attempting to send email to: ${to}`);
    console.log(`📧 Subject: ${subject}`);

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html: emailWrapper(html),
    });

    if (error) {
      console.error(`❌ Failed to send email to: ${to}`);
      console.error(`❌ Error:`, error);
      throw new Error(error.message);
    }

    console.log(`✅ Email sent successfully to: ${to}`);
    console.log(`📬 Email ID: ${data?.id}`);
    return data;
  } catch (error: any) {
    console.error(`❌ Failed to send email to: ${to}`);
    console.error(`❌ Error details:`, error.message);
    throw error;
  }
}

export async function sendOTPMail(email: string, otp: string) {
  const content = `
    <div style="text-align: center;">
      <div style="background-color: #667eea; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 28px;">🔐</span>
      </div>
      <h2 style="margin: 0 0 16px 0; color: #1a202c; font-size: 24px; font-weight: 600;">
        Verify Your Email Address
      </h2>
      <p style="margin: 0 0 30px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
        Please use the following One-Time Password (OTP) to complete your verification:
      </p>
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; padding: 20px; margin: 30px 0; display: inline-block;">
        <span style="font-size: 36px; font-weight: 700; color: #ffffff; letter-spacing: 8px; font-family: 'Courier New', monospace;">
          ${otp}
        </span>
      </div>
      <p style="margin: 30px 0 0 0; color: #718096; font-size: 14px; line-height: 1.6;">
        This code will expire in <strong>10 minutes</strong> for security reasons.
      </p>
      <p style="margin: 10px 0 0 0; color: #a0aec0; font-size: 13px;">
        If you didn't request this code, please ignore this email.
      </p>
    </div>
  `;

  return sendEmail(email, "Verify Your Email - OTP Code", content);
}

export async function sendWelcomeMail(email: string, name: string) {
  const content = `
    <div style="text-align: center;">
      <div style="background-color: #48bb78; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 28px;">🎉</span>
      </div>
      <h2 style="margin: 0 0 16px 0; color: #1a202c; font-size: 24px; font-weight: 600;">
        Welcome to Sharda Online Library, ${name}!
      </h2>
      <p style="margin: 0 0 20px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
        We're thrilled to have you join our academic community.
      </p>
    </div>
    <div style="background-color: #f7fafc; border-left: 4px solid #667eea; padding: 20px; margin: 25px 0; border-radius: 6px;">
      <h3 style="margin: 0 0 12px 0; color: #2d3748; font-size: 18px; font-weight: 600;">
        What's Available for You:
      </h3>
      <ul style="margin: 0; padding: 0 0 0 20px; color: #4a5568; line-height: 1.8;">
        <li>Access to comprehensive study notes</li>
        <li>Previous year question papers (PYQs)</li>
        <li>Subject-wise syllabus materials</li>
        <li>Collaborative learning community</li>
      </ul>
    </div>
    <p style="margin: 25px 0 0 0; color: #4a5568; font-size: 15px; line-height: 1.6; text-align: center;">
      Start exploring our resources and make the most of your academic journey!
    </p>
    <div style="text-align: center; margin-top: 30px;">
      <p style="margin: 0; color: #2d3748; font-size: 15px; font-weight: 600;">
        Happy Studying! 📖
      </p>
      <p style="margin: 8px 0 0 0; color: #718096; font-size: 14px;">
        — The Sharda Online Library Team
      </p>
    </div>
  `;

  return sendEmail(email, "Welcome to Sharda Online Library! 🎓", content);
}

export async function requestForModeratorMail(email: string, name: string) {
  const content = `
    <div style="text-align: center;">
      <div style="background-color: #ed8936; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 28px;">👤</span>
      </div>
      <h2 style="margin: 0 0 16px 0; color: #1a202c; font-size: 24px; font-weight: 600;">
        New Moderator Request
      </h2>
    </div>
    <div style="background-color: #fff5f0; border: 1px solid #fed7d7; border-radius: 8px; padding: 20px; margin: 25px 0;">
      <p style="margin: 0 0 12px 0; color: #2d3748; font-size: 15px;">
        <strong>Applicant Details:</strong>
      </p>
      <table style="width: 100%; color: #4a5568; font-size: 14px;">
        <tr>
          <td style="padding: 8px 0;"><strong>Name:</strong></td>
          <td style="padding: 8px 0;">${name}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Email:</strong></td>
          <td style="padding: 8px 0;">${email}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Request Date:</strong></td>
          <td style="padding: 8px 0;">${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</td>
        </tr>
      </table>
    </div>
    <p style="margin: 25px 0 0 0; color: #4a5568; font-size: 15px; line-height: 1.6; text-align: center;">
      Please review this request in the admin panel and take appropriate action.
    </p>
    <div style="text-align: center; margin-top: 30px;">
      <p style="margin: 0; color: #718096; font-size: 14px;">
        — Automated Notification from Sharda Online Library
      </p>
    </div>
  `;

  return sendEmail(
    process.env.ADMIN_EMAIL!,
    "New Moderator Application Received",
    content,
  );
}

export async function moderatorApprovalMail(email: string, name: string) {
  const content = `
    <div style="text-align: center;">
      <div style="background-color: #48bb78; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 28px;">✅</span>
      </div>
      <h2 style="margin: 0 0 16px 0; color: #1a202c; font-size: 24px; font-weight: 600;">
        Congratulations, ${name}!
      </h2>
      <p style="margin: 0 0 20px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
        Your application to become a moderator has been <strong style="color: #48bb78;">approved</strong>!
      </p>
    </div>
    <div style="background-color: #f0fff4; border-left: 4px solid #48bb78; padding: 20px; margin: 25px 0; border-radius: 6px;">
      <h3 style="margin: 0 0 12px 0; color: #2d3748; font-size: 18px; font-weight: 600;">
        Your Moderator Responsibilities:
      </h3>
      <ul style="margin: 0; padding: 0 0 0 20px; color: #4a5568; line-height: 1.8;">
        <li>Review and approve submitted content</li>
        <li>Ensure quality standards are maintained</li>
        <li>Help maintain a positive community environment</li>
        <li>Respond to user reports and concerns</li>
      </ul>
    </div>
    <p style="margin: 25px 0 0 0; color: #4a5568; font-size: 15px; line-height: 1.6; text-align: center;">
      Thank you for your commitment to helping our academic community thrive!
    </p>
    <div style="text-align: center; margin-top: 30px;">
      <p style="margin: 0; color: #2d3748; font-size: 15px; font-weight: 600;">
        Welcome to the team! 🎊
      </p>
      <p style="margin: 8px 0 0 0; color: #718096; font-size: 14px;">
        — The Sharda Online Library Team
      </p>
    </div>
  `;

  return sendEmail(
    email,
    "Moderator Application Approved - Welcome Aboard! 🎉",
    content,
  );
}

export async function moderatorRejectionMail(email: string, name: string) {
  const content = `
    <div style="text-align: center;">
      <div style="background-color: #fc8181; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 28px;">📋</span>
      </div>
      <h2 style="margin: 0 0 16px 0; color: #1a202c; font-size: 24px; font-weight: 600;">
        Update on Your Moderator Application
      </h2>
      <p style="margin: 0 0 20px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
        Hello ${name},
      </p>
    </div>
    <div style="background-color: #f7fafc; border-radius: 8px; padding: 25px; margin: 25px 0;">
      <p style="margin: 0 0 15px 0; color: #4a5568; font-size: 15px; line-height: 1.7;">
        Thank you for your interest in becoming a moderator at Sharda Online Library. We truly appreciate the time and effort you put into your application.
      </p>
      <p style="margin: 0; color: #4a5568; font-size: 15px; line-height: 1.7;">
        After careful consideration, we regret to inform you that we are unable to approve your moderator application at this time. This decision does not reflect on your value as a community member.
      </p>
    </div>
    <div style="background-color: #ebf8ff; border-left: 4px solid #4299e1; padding: 20px; margin: 25px 0; border-radius: 6px;">
      <p style="margin: 0; color: #2c5282; font-size: 14px; line-height: 1.7;">
        <strong>💡 What's Next?</strong><br>
        You're welcome to reapply in the future. We encourage you to continue contributing to our community, and feel free to reach out if you have any questions.
      </p>
    </div>
    <div style="text-align: center; margin-top: 30px;">
      <p style="margin: 0; color: #718096; font-size: 14px;">
        Best Regards,<br>
        — The Sharda Online Library Team
      </p>
    </div>
  `;

  return sendEmail(email, "Update on Your Moderator Application", content);
}

export async function contentApprovalMail(
  email: string,
  name: string,
  contentType: string,
) {
  const content = `
    <div style="text-align: center;">
      <div style="background-color: #48bb78; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 28px;">✨</span>
      </div>
      <h2 style="margin: 0 0 16px 0; color: #1a202c; font-size: 24px; font-weight: 600;">
        Great News, ${name}!
      </h2>
      <p style="margin: 0 0 20px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
        Your ${contentType} submission has been <strong style="color: #48bb78;">approved</strong> and is now live!
      </p>
    </div>
    <div style="background-color: #f0fff4; border: 2px solid #9ae6b4; border-radius: 8px; padding: 25px; margin: 25px 0; text-align: center;">
      <p style="margin: 0 0 10px 0; color: #2f855a; font-size: 18px; font-weight: 600;">
        🎊 Published Successfully!
      </p>
      <p style="margin: 0; color: #4a5568; font-size: 14px;">
        Your content is now available for the entire community
      </p>
    </div>
    <p style="margin: 25px 0 0 0; color: #4a5568; font-size: 15px; line-height: 1.7; text-align: center;">
      Thank you for your valuable contribution to Sharda Online Library! Your effort helps thousands of students in their academic journey.
    </p>
    <div style="background-color: #ebf8ff; border-radius: 6px; padding: 20px; margin: 25px 0;">
      <p style="margin: 0; color: #2c5282; font-size: 14px; text-align: center;">
        💡 Keep contributing! Every submission makes a difference.
      </p>
    </div>
    <div style="text-align: center; margin-top: 30px;">
      <p style="margin: 0; color: #2d3748; font-size: 15px; font-weight: 600;">
        Keep up the amazing work! 🌟
      </p>
      <p style="margin: 8px 0 0 0; color: #718096; font-size: 14px;">
        — The Sharda Online Library Team
      </p>
    </div>
  `;

  return sendEmail(email, `${contentType} Approved - Now Live! ✅`, content);
}

export async function contentRejectionMail(
  email: string,
  name: string,
  contentType: string,
  reason: string,
) {
  const content = `
    <div style="text-align: center;">
      <div style="background-color: #fc8181; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 28px;">📝</span>
      </div>
      <h2 style="margin: 0 0 16px 0; color: #1a202c; font-size: 24px; font-weight: 600;">
        Update on Your ${contentType} Submission
      </h2>
      <p style="margin: 0 0 20px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
        Hello ${name},
      </p>
    </div>
    <div style="background-color: #f7fafc; border-radius: 8px; padding: 25px; margin: 25px 0;">
      <p style="margin: 0 0 15px 0; color: #4a5568; font-size: 15px; line-height: 1.7;">
        Thank you for your ${contentType} submission to Sharda Online Library. We appreciate your effort and contribution.
      </p>
      <p style="margin: 0; color: #4a5568; font-size: 15px; line-height: 1.7;">
        After careful review by our moderation team, we're unable to approve your submission at this time.
      </p>
    </div>
    <div style="background-color: #fff5f5; border-left: 4px solid #fc8181; padding: 20px; margin: 25px 0; border-radius: 6px;">
      <p style="margin: 0 0 10px 0; color: #742a2a; font-size: 14px; font-weight: 600;">
        Reason for Rejection:
      </p>
      <p style="margin: 0; color: #c53030; font-size: 15px; line-height: 1.6;">
        ${reason}
      </p>
    </div>
    <div style="background-color: #ebf8ff; border-left: 4px solid #4299e1; padding: 20px; margin: 25px 0; border-radius: 6px;">
      <p style="margin: 0; color: #2c5282; font-size: 14px; line-height: 1.7;">
        <strong>💡 Next Steps:</strong><br>
        You're welcome to revise and resubmit your content after addressing the feedback above. We're here to help if you have any questions!
      </p>
    </div>
    <div style="text-align: center; margin-top: 30px;">
      <p style="margin: 0; color: #718096; font-size: 14px;">
        Thank you for understanding,<br>
        — The Sharda Online Library Moderation Team
      </p>
    </div>
  `;

  return sendEmail(
    email,
    `${contentType} Submission - Revision Needed`,
    content,
  );
}

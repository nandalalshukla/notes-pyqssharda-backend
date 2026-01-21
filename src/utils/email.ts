import { transporter } from "../config/email.js";

const EMAIL_FROM =
  process.env.EMAIL_FROM || "Sharda Online Library <shuklanandalal@gmail.com>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "shuklanandalal@gmail.com";

// Enhanced email wrapper with better styling
const emailWrapper = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sharda Online Library</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); overflow: hidden;">
          <!-- Header with gradient -->
          <tr>
            <td style="padding: 40px 32px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <div style="background-color: white; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                <span style="font-size: 32px;">📚</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                Sharda Online Library
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                Your Academic Resource Hub
              </p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 48px 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; text-align: center; background: linear-gradient(to bottom, #f8f9fa 0%, #e9ecef 100%); border-top: 1px solid #dee2e6;">
              <p style="margin: 0 0 12px 0; color: #6c757d; font-size: 13px; line-height: 1.6;">
                © ${new Date().getFullYear()} Sharda Online Library. All rights reserved.
              </p>
              <div style="margin-top: 16px;">
                <a href="#" style="display: inline-block; margin: 0 8px; color: #667eea; text-decoration: none; font-size: 12px;">Help Center</a>
                <span style="color: #dee2e6;">•</span>
                <a href="#" style="display: inline-block; margin: 0 8px; color: #667eea; text-decoration: none; font-size: 12px;">Contact Us</a>
                <span style="color: #dee2e6;">•</span>
                <a href="#" style="display: inline-block; margin: 0 8px; color: #667eea; text-decoration: none; font-size: 12px;">Privacy Policy</a>
              </div>
            </td>
          </tr>
        </table>
        <!-- Extra spacing -->
        <p style="margin: 24px 0 0 0; color: rgba(255,255,255,0.7); font-size: 11px; text-align: center;">
          This email was sent to you by Sharda Online Library
        </p>
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
    <div style="text-align: center;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 24px; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);">
        <span style="font-size: 40px;">🔐</span>
      </div>
      <h2 style="margin: 0 0 16px 0; color: #1a202c; font-size: 28px; font-weight: 700;">
        Verify Your Email
      </h2>
      <p style="margin: 0 0 32px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
        Enter this verification code to complete your registration:
      </p>
    </div>
    
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 32px; text-align: center; margin: 0 0 32px 0; box-shadow: 0 4px 16px rgba(102, 126, 234, 0.2);">
      <div style="background-color: white; border-radius: 8px; padding: 20px; display: inline-block;">
        <div style="font-size: 42px; font-weight: 800; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: 12px; font-family: 'Courier New', monospace;">
          ${otp}
        </div>
      </div>
    </div>
    
    <div style="background-color: #f7fafc; border-left: 4px solid #667eea; border-radius: 6px; padding: 20px; margin: 0 0 24px 0;">
      <p style="margin: 0; color: #2d3748; font-size: 14px; line-height: 1.6;">
        ⏰ <strong>Valid for 10 minutes</strong><br>
        <span style="color: #718096;">This code will expire soon. Please verify your email promptly.</span>
      </p>
    </div>
    
    <p style="margin: 0; color: #718096; font-size: 13px; text-align: center; line-height: 1.6;">
      If you didn't request this verification code, please ignore this email or contact support if you have concerns.
    </p>
  `;

  return sendEmail(
    email,
    "🔐 Verify Your Email - Sharda Online Library",
    content,
  );
}

export async function sendWelcomeMail(email: string, name: string) {
  const content = `
    <div style="text-align: center;">
      <div style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 24px; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(72, 187, 120, 0.3);">
        <span style="font-size: 40px;">🎉</span>
      </div>
      <h2 style="margin: 0 0 16px 0; color: #1a202c; font-size: 28px; font-weight: 700;">
        Welcome, ${name}!
      </h2>
      <p style="margin: 0 0 32px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
        Thank you for joining Sharda Online Library. We're thrilled to have you as part of our academic community!
      </p>
    </div>
    
    <div style="background: linear-gradient(to bottom right, #f7fafc, #edf2f7); border-radius: 12px; padding: 28px; margin: 0 0 28px 0; border: 1px solid #e2e8f0;">
      <h3 style="margin: 0 0 20px 0; color: #2d3748; font-size: 18px; font-weight: 600;">
        🚀 What You Can Explore:
      </h3>
      <table style="width: 100%;">
        <tr>
          <td style="padding: 12px 0; vertical-align: top;">
            <span style="font-size: 24px; margin-right: 12px;">📝</span>
          </td>
          <td style="padding: 12px 0;">
            <strong style="color: #2d3748; font-size: 15px;">Study Notes & Materials</strong><br>
            <span style="color: #718096; font-size: 14px;">Comprehensive notes curated by students</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0; vertical-align: top;">
            <span style="font-size: 24px; margin-right: 12px;">📊</span>
          </td>
          <td style="padding: 12px 0;">
            <strong style="color: #2d3748; font-size: 15px;">Previous Year Questions</strong><br>
            <span style="color: #718096; font-size: 14px;">Practice with past exam papers</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0; vertical-align: top;">
            <span style="font-size: 24px; margin-right: 12px;">📚</span>
          </td>
          <td style="padding: 12px 0;">
            <strong style="color: #2d3748; font-size: 15px;">Course Syllabus</strong><br>
            <span style="color: #718096; font-size: 14px;">Stay on track with curriculum guides</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0; vertical-align: top;">
            <span style="font-size: 24px; margin-right: 12px;">🤝</span>
          </td>
          <td style="padding: 12px 0;">
            <strong style="color: #2d3748; font-size: 15px;">Collaborative Learning</strong><br>
            <span style="color: #718096; font-size: 14px;">Connect with fellow students</span>
          </td>
        </tr>
      </table>
    </div>
    
    <div style="text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; padding: 20px; margin: 0 0 24px 0;">
      <p style="margin: 0; color: white; font-size: 15px; font-weight: 600;">
        ✨ Ready to Start Your Academic Journey?
      </p>
    </div>
    
    <p style="margin: 0; color: #718096; font-size: 14px; text-align: center;">
      If you have any questions, our support team is here to help!
    </p>
  `;

  return sendEmail(email, "🎉 Welcome to Sharda Online Library!", content);
}

export async function requestForModeratorMail(email: string, name: string) {
  const content = `
    <div style="text-align: center;">
      <div style="background: linear-gradient(135deg, #f6ad55 0%, #ed8936 100%); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 24px; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(246, 173, 85, 0.3);">
        <span style="font-size: 40px;">📫</span>
      </div>
      <h2 style="margin: 0 0 16px 0; color: #1a202c; font-size: 26px; font-weight: 700;">
        New Moderator Application
      </h2>
      <p style="margin: 0 0 32px 0; color: #4a5568; font-size: 15px;">
        A new user has requested moderator access
      </p>
    </div>
    
    <div style="background: linear-gradient(to bottom right, #fff5f0, #fef5e7); border-radius: 12px; padding: 28px; margin: 0 0 28px 0; border-left: 4px solid #f6ad55; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
      <h3 style="margin: 0 0 20px 0; color: #2d3748; font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
        📄 Application Details
      </h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #fed7aa;">
          <td style="padding: 14px 0; color: #744210; font-size: 14px; font-weight: 600;">Full Name</td>
          <td style="padding: 14px 0; color: #1a202c; font-size: 15px; font-weight: 500; text-align: right;">${name}</td>
        </tr>
        <tr style="border-bottom: 1px solid #fed7aa;">
          <td style="padding: 14px 0; color: #744210; font-size: 14px; font-weight: 600;">Email Address</td>
          <td style="padding: 14px 0; color: #1a202c; font-size: 15px; font-weight: 500; text-align: right;">${email}</td>
        </tr>
        <tr>
          <td style="padding: 14px 0; color: #744210; font-size: 14px; font-weight: 600;">Submitted On</td>
          <td style="padding: 14px 0; color: #1a202c; font-size: 15px; font-weight: 500; text-align: right;">${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</td>
        </tr>
      </table>
    </div>
    
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; padding: 20px; text-align: center;">
      <p style="margin: 0; color: white; font-size: 14px; font-weight: 600;">
        ⚡ Please review this request in the admin dashboard
      </p>
    </div>
  `;

  return sendEmail(
    process.env.ADMIN_EMAIL!,
    "📫 New Moderator Application - Action Required",
    content,
  );
}

export async function moderatorApprovalMail(email: string, name: string) {
  const content = `
    <div style="text-align: center;">
      <div style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); width: 100px; height: 100px; border-radius: 50%; margin: 0 auto 24px; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 10px 30px rgba(72, 187, 120, 0.4);">
        <span style="font-size: 50px;">✅</span>
      </div>
      <div style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); display: inline-block; padding: 12px 32px; border-radius: 24px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(72, 187, 120, 0.2);">
        <span style="color: white; font-size: 16px; font-weight: 700; letter-spacing: 1px;">✓ APPROVED</span>
      </div>
      <h2 style="margin: 0 0 16px 0; color: #1a202c; font-size: 30px; font-weight: 700;">
        Congratulations, ${name}!
      </h2>
      <p style="margin: 0 0 32px 0; color: #4a5568; font-size: 17px; line-height: 1.6;">
        Your application to become a moderator has been <strong style="color: #38a169;">approved</strong>! Welcome to the moderation team.
      </p>
    </div>
    
    <div style="background: linear-gradient(to bottom right, #f0fff4, #e6fffa); border-radius: 12px; padding: 28px; margin: 0 0 28px 0; border-left: 4px solid #48bb78; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
      <h3 style="margin: 0 0 20px 0; color: #2d3748; font-size: 18px; font-weight: 600;">
        🎖️ Your Responsibilities:
      </h3>
      <table style="width: 100%;">
        <tr>
          <td style="padding: 12px 0; vertical-align: top;">
            <span style="font-size: 24px; margin-right: 12px;">✔️</span>
          </td>
          <td style="padding: 12px 0;">
            <strong style="color: #2d3748; font-size: 15px;">Review & Approve Content</strong><br>
            <span style="color: #718096; font-size: 14px;">Ensure quality standards are maintained</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0; vertical-align: top;">
            <span style="font-size: 24px; margin-right: 12px;">🛡️</span>
          </td>
          <td style="padding: 12px 0;">
            <strong style="color: #2d3748; font-size: 15px;">Maintain Quality Standards</strong><br>
            <span style="color: #718096; font-size: 14px;">Keep content accurate and relevant</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0; vertical-align: top;">
            <span style="font-size: 24px; margin-right: 12px;">🤝</span>
          </td>
          <td style="padding: 12px 0;">
            <strong style="color: #2d3748; font-size: 15px;">Support the Community</strong><br>
            <span style="color: #718096; font-size: 14px;">Help students find what they need</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0; vertical-align: top;">
            <span style="font-size: 24px; margin-right: 12px;">💬</span>
          </td>
          <td style="padding: 12px 0;">
            <strong style="color: #2d3748; font-size: 15px;">Respond to User Concerns</strong><br>
            <span style="color: #718096; font-size: 14px;">Address issues promptly and fairly</span>
          </td>
        </tr>
      </table>
    </div>
    
    <div style="text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; padding: 24px;">
      <p style="margin: 0; color: white; font-size: 16px; font-weight: 600;">
        🚀 Welcome to the team! Let's make learning better together.
      </p>
    </div>
  `;

  return sendEmail(
    email,
    "✅ Moderator Application Approved - Welcome Aboard!",
    content,
  );
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

import { transporter } from "../config/nodemailer";

export async function sendOTPMail(email: string, otp: string) {
  await transporter.sendMail({
    from: `"Sharda Online Library" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Your OTP Verification Code",
    html: `
      <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 32px;">
        <div style="max-width: 400px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #eee; padding: 24px;">
          <h2 style="color: #4F8EF7; text-align: center;">Verify Your Email</h2>
          <p style="font-size: 16px; color: #333; text-align: center;">
            Use the following OTP to complete your verification:
          </p>
          <div style="font-size: 32px; font-weight: bold; color: #222; background: #f1f7ff; border-radius: 6px; padding: 16px; text-align: center; letter-spacing: 8px; margin: 24px 0;">
            ${otp}
          </div>
          <p style="font-size: 14px; color: #888; text-align: center;">
            This code will expire in a few minutes. If you did not request this, please ignore this email.
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendWelcomeMail(email: string, name: string) {
  await transporter.sendMail({
    from: `"Sharda Online Library" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Welcome to Sharda Online Library!",
    html: `
      <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 32px;">
        <div style="max-width: 400px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #eee; padding: 24px;">
          <h2 style="color: #4F8EF7; text-align: center;">Welcome to Sharda Online Library, ${name}!</h2>
          <p style="font-size: 16px; color: #333;">
            We're excited to have you on board. Explore our vast collection of notes and previous year questions to aid your studies.
          </p>
          <p style="font-size: 16px; color: #333;">
            If you have any questions or need assistance, feel free to reach out to our support team.
          </p>
          <p style="font-size: 16px; color: #333;">
            Happy Studying!<br/>
            The Sharda Online Library Team
          </p>
        </div>
      </div>
    `,
  });
}

export async function requestForModeratorMail(email: string, name: string) {
  await transporter.sendMail({
    from: `"Sharda Online Library" <${process.env.SMTP_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: "New Moderator Request Received",
    html: `
      <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 32px;">
        <div style="max-width: 400px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #eee; padding: 24px;">
          <h2 style="color: #4F8EF7; text-align: center;">New Moderator Request</h2>
          <p style="font-size: 16px; color: #333;">
            A new request to become a moderator has been submitted by ${name} (${email}).
          </p>
          <p style="font-size: 16px; color: #333;">
            Please review the request in the admin panel and take the necessary action.
          </p>
          <p style="font-size: 16px; color: #333;">
            Best Regards,<br/>
            The Sharda Online Library Team
          </p>
        </div>
      </div>
    `,
  });
}


export async function moderatorApprovalMail(email: string, name: string) {
  await transporter.sendMail({
    from: `"Sharda Online Library" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Your Request to Become a Moderator is Approved!",
    html: `
      <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 32px;">
        <div style="max-width: 400px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #eee; padding: 24px;">
          <h2 style="color: #4F8EF7; text-align: center;">Congratulations, ${name}!</h2>
          <p style="font-size: 16px; color: #333;">
            Your request to become a moderator on Sharda Online Library has been approved. You can now help us maintain the quality of content on our platform.
          </p>
          <p style="font-size: 16px; color: #333;">
            Thank you for your willingness to contribute to our community. If you have any questions, feel free to reach out to our support team.
          </p>
          <p style="font-size: 16px; color: #333;">
            Best Regards,<br/>
            The Sharda Online Library Team
          </p>
        </div>
      </div>
    `,
  });
}

export async function moderatorRejectionMail(email: string, name: string) {
  await transporter.sendMail({
    from: `"Sharda Online Library" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Update on Your Moderator Request",
    html: `
      <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 32px;">
        <div style="max-width: 400px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #eee; padding: 24px;">
          <h2 style="color: #4F8EF7; text-align: center;">Hello, ${name}</h2>
          <p style="font-size: 16px; color: #333;">
            We appreciate your interest in becoming a moderator on Sharda Online Library. After careful consideration, we regret to inform you that your request has not been approved at this time.
          </p>
          <p style="font-size: 16px; color: #333;">
            Thank you for your understanding. If you have any questions or would like feedback, please feel free to reach out to our support team.
          </p>
          <p style="font-size: 16px; color: #333;">
            Best Regards,<br/>
            The Sharda Online Library Team
          </p>
        </div>
      </div>
    `,
  });
}

export async function contentApprovalMail(
  email: string,
  name: string,
  contentType: string
) {
  await transporter.sendMail({
    from: `"Sharda Online Library" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Your ${contentType} has been Approved!`,
    html: `
      <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 32px;">
        <div style="max-width: 400px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #eee; padding: 24px;">
          <h2 style="color: #4F8EF7; text-align: center;">Congratulations, ${name}!</h2>
          <p style="font-size: 16px; color: #333;">
            We are pleased to inform you that your submitted ${contentType} has been approved and is now live on Sharda Online Library.
          </p>
          <p style="font-size: 16px; color: #333;">
            Thank you for contributing to our community. If you have any questions, feel free to reach out to our support team.
          </p>
          <p style="font-size: 16px; color: #333;">
            Best Regards,<br/>
            The Sharda Online Library Team
          </p>
        </div>
      </div>
    `,
  });
}
export async function contentRejectionMail(
  email: string,
  name: string,
  contentType: string,
  reason: string
) {
  await transporter.sendMail({
    from: `"Sharda Online Library" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Update on Your ${contentType} Submission`,
    html: `
      <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 32px;">
        <div style="max-width: 400px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #eee; padding: 24px;">
          <h2 style="color: #4F8EF7; text-align: center;">Hello, ${name}</h2>
          <p style="font-size: 16px; color: #333;">
            We appreciate your effort in submitting the ${contentType} to Sharda Online Library. After careful review, we regret to inform you that it has not been approved.
          </p>
          <p style="font-size: 16px; color: #333;">
            Reason for rejection: ${reason}
          </p>
          <p style="font-size: 16px; color: #333;">
            Thank you for your understanding. If you have any questions or would like feedback, please feel free to reach out to our support team.
          </p>
          <p style="font-size: 16px; color: #333;">
            Best Regards,<br/>
            The Sharda Online Library Team
          </p>
        </div>
      </div>
    `,
  });
}

import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify transporter configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email transporter verification failed:", error);
    console.error(
      "⚠️  Check your EMAIL_USER and EMAIL_PASS environment variables",
    );
    console.error(
      "⚠️  For Gmail, you must use an App Password: https://myaccount.google.com/apppasswords",
    );
  } else {
    console.log("✅ Email server is ready to send messages");
  }
});

import nodemailer from "nodemailer";

// Validate required environment variables
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error(
    "❌ CRITICAL: EMAIL_USER and EMAIL_PASS must be set in environment variables",
  );
  console.error("Current EMAIL_USER:", process.env.EMAIL_USER || "NOT SET");
  console.error(
    "Current EMAIL_PASS:",
    process.env.EMAIL_PASS ? "***SET***" : "NOT SET",
  );
}

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587, // Use port 587 instead of 465 (Render blocks 465)
  secure: false, // Use STARTTLS (true for 465, false for 587)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    ciphers: "SSLv3",
    rejectUnauthorized: false, // Allow self-signed certificates in cloud environments
  },
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 30000,
  pool: true, // Use connection pooling
  maxConnections: 5,
  maxMessages: 100,
  rateDelta: 1000, // Rate limit: 1 second between messages
  rateLimit: 5, // Max 5 messages per rateDelta
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
    console.error("⚠️  Detailed error:", error.message);
  } else {
    console.log("✅ Email server is ready to send messages");
    console.log("📧 Email configured for:", process.env.EMAIL_USER);
  }
});

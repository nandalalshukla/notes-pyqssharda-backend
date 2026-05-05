import { Resend } from "resend";

// Ensure RESEND_API_KEY environment variable is configured
const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  console.warn("⚠️ RESEND_API_KEY is missing from environment variables.");
}

// Create Resend instance
export const resend = new Resend(resendApiKey);

// Global sender email configuration
export const EMAIL_CONFIG = {
  from: "Sharda Social <noreply@sharda.social>",
  adminEmail: process.env.ADMIN_EMAIL || "shuklanandalal@gmail.com",
};

// Validate initialization
if (resendApiKey) {
  console.log("✅ Resend email service initialized successfully.");
}

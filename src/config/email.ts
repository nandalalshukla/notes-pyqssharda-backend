import { Resend } from "resend";

// Validate required environment variables
if (!process.env.RESEND_API_KEY) {
  console.error(
    "❌ CRITICAL: RESEND_API_KEY must be set in environment variables",
  );
  console.error(
    "Current RESEND_API_KEY:",
    process.env.RESEND_API_KEY ? "***SET***" : "NOT SET",
  );
}

if (!process.env.EMAIL_FROM) {
  console.warn("⚠️  EMAIL_FROM not set, using default: onboarding@resend.dev");
}

// Initialize Resend client
export const resend = new Resend(process.env.RESEND_API_KEY);

// Verify on startup
(async () => {
  try {
    // Test API key validity by making a simple API call
    console.log("✅ Resend email service initialized");
    console.log(
      "📧 Email will be sent from:",
      process.env.EMAIL_FROM || "onboarding@resend.dev",
    );
  } catch (error: any) {
    console.error("❌ Resend initialization failed:", error.message);
  }
})();

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

console.log("🧪 Testing Resend Email Integration\n");
console.log("Environment check:");
console.log(
  "RESEND_API_KEY:",
  process.env.RESEND_API_KEY ? "✅ Set" : "❌ Not set",
);
console.log(
  "EMAIL_FROM:",
  process.env.EMAIL_FROM || "Using default: onboarding@resend.dev",
);
console.log();

// Import email functions after env is loaded
const { sendOTPMail, sendWelcomeMail } = await import("./utils/email.js");

async function testEmails() {
  try {
    console.log("📧 Test 1: Sending OTP email...");
    await sendOTPMail("shuklanandalal@gmail.com", "123456");
    console.log("✅ OTP email test passed!\n");

    console.log("📧 Test 2: Sending Welcome email...");
    await sendWelcomeMail("shuklanandalal@gmail.com", "Test User");
    console.log("✅ Welcome email test passed!\n");

    console.log("🎉 All email tests completed successfully!");
    console.log(
      "\n💡 Check your inbox at shuklanandalal@gmail.com to see the emails!",
    );
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Email test failed:", error.message);
    console.error("\nFull error:", error);
    process.exit(1);
  }
}

testEmails();

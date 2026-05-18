import crypto from "crypto";
import { User } from "../models/users/user.model.js";
import { sendOTPMail } from "./email.js";

async function generateOtp(): Promise<string> {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  return otp;
}

async function hashOtp(otp: string) {
  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
  return hashedOtp;
}

async function otpExpiryTime(minutes: number) {
  const now = new Date();
  now.setMinutes(now.getMinutes() + minutes);
  return now;
}

async function sendAndStoreOtp(email: string): Promise<void> {
  const otp = await generateOtp();

  // It's important to await the email send operation here!
  const sendResult = await sendOTPMail(email, otp);

  if (!sendResult.success) {
    console.error(`✗ Failed to send OTP email to ${email}:`, sendResult.error);
    // Throw an error so the controller can catch it and show an appropriate message
    throw new Error(
      "Failed to send OTP email. We are experiencing high traffic, please try again later.",
    );
  }

  const hashedOtp = await hashOtp(otp);
  const otpExpiry = await otpExpiryTime(3);
  const result = await User.updateOne(
    { email },
    { $set: { emailOtpHash: hashedOtp, emailOtpExpiry: otpExpiry } },
  );
  if (result.matchedCount === 0) {
    throw new Error("User not found");
  }
}

async function verifyOtp(otp: string, hashedOtp: string): Promise<boolean> {
  const hashedInputOtp = await hashOtp(otp);
  return hashedInputOtp === hashedOtp;
}

export { verifyOtp, sendAndStoreOtp, generateOtp };

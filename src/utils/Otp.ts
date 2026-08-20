import crypto from "crypto";
import { User } from "../models/users/user.model.js";
import { sendOTPMail } from "./email.js";

function generateOtp(): string {
  // crypto.randomInt (CSPRNG) instead of Math.random() (a fast, predictable
  // PRNG not meant for security-sensitive values like a verification code).
  return crypto.randomInt(100000, 1000000).toString();
}

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

function otpExpiryTime(minutes: number): Date {
  const now = new Date();
  now.setMinutes(now.getMinutes() + minutes);
  return now;
}

async function sendAndStoreOtp(email: string): Promise<void> {
  const otp = generateOtp();

  // It's important to await the email send operation here!
  const sendResult = await sendOTPMail(email, otp);

  if (!sendResult.success) {
    console.error(`✗ Failed to send OTP email to ${email}:`, sendResult.error);
    // Throw an error so the controller can catch it and show an appropriate message
    throw new Error(
      "Failed to send OTP email. We are experiencing high traffic, please try again later.",
    );
  }

  const hashedOtp = hashOtp(otp);
  const otpExpiry = otpExpiryTime(3);
  const result = await User.updateOne(
    { email },
    { $set: { emailOtpHash: hashedOtp, emailOtpExpiry: otpExpiry } },
  );
  if (result.matchedCount === 0) {
    throw new Error("User not found");
  }
}

function verifyOtp(otp: string, hashedOtp: string): boolean {
  const hashedInputBuf = Buffer.from(hashOtp(otp), "hex");
  const storedBuf = Buffer.from(hashedOtp, "hex");
  // Constant-time comparison — a plain `===` short-circuits on the first
  // differing byte, which (in principle, over enough samples) leaks how
  // many leading hex characters of the hash an attacker's guess matched.
  if (hashedInputBuf.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(hashedInputBuf, storedBuf);
}

export { verifyOtp, sendAndStoreOtp, generateOtp };

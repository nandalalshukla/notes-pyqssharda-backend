import crypto from "crypto";
import { OTP_RESEND_COOLDOWN_MS, OTP_TTL_MS } from "../config/auth.js";
import { User } from "../models/users/user.model.js";
import { sendOTPMail } from "./email.js";
import type { OtpPurpose } from "./email.js";

function generateOtp(): string {
  // crypto.randomInt (CSPRNG) instead of Math.random() (a fast, predictable
  // PRNG not meant for security-sensitive values like a verification code).
  return crypto.randomInt(100000, 1000000).toString();
}

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

async function sendAndStoreOtp(email: string, purpose: OtpPurpose): Promise<void> {
  const otp = generateOtp();
  const hashedOtp = hashOtp(otp);
  const now = new Date();
  const otpExpiry = new Date(now.getTime() + OTP_TTL_MS);
  const eligibleAccount =
    purpose === "email-verification"
      ? { isEmailVerified: false, verificationExpiresAt: { $gt: now } }
      : { isEmailVerified: true };

  // Atomically claim the current OTP slot before sending. The per-account
  // cooldown prevents concurrent requests, including requests from different
  // IPs, from invalidating one another's codes or spamming an inbox.
  const claimed = await User.updateOne(
    {
      email,
      ...eligibleAccount,
      $or: [
        { emailOtpSentAt: { $exists: false } },
        {
          emailOtpSentAt: {
            $lte: new Date(now.getTime() - OTP_RESEND_COOLDOWN_MS),
          },
        },
      ],
    },
    {
      $set: {
        emailOtpHash: hashedOtp,
        emailOtpExpiry: otpExpiry,
        emailOtpPurpose: purpose,
        emailOtpSentAt: now,
      },
    },
  );

  // Do not reveal whether an address is missing, expired, verified already,
  // or inside the resend cooldown. Callers return the same public response.
  if (claimed.modifiedCount === 0) return;

  const sendResult = await sendOTPMail(email, otp, purpose);
  if (sendResult.success) return;

  console.error(`Failed to send ${purpose} OTP email to ${email}:`, sendResult.error);

  // Clear only this request's OTP so a concurrent newer code is not removed.
  // Releasing emailOtpSentAt also permits an immediate retry after a failure.
  await User.updateOne(
    { email, emailOtpHash: hashedOtp, emailOtpPurpose: purpose },
    {
      $unset: {
        emailOtpHash: 1,
        emailOtpExpiry: 1,
        emailOtpPurpose: 1,
        emailOtpSentAt: 1,
      },
    },
  );

  throw new Error("Failed to send OTP email. Please try again shortly.");
}

function verifyOtp(otp: string, hashedOtp: string): boolean {
  const hashedInputBuf = Buffer.from(hashOtp(otp), "hex");
  const storedBuf = Buffer.from(hashedOtp, "hex");
  // Constant-time comparison â€” a plain `===` short-circuits on the first
  // differing byte, which (in principle, over enough samples) leaks how
  // many leading hex characters of the hash an attacker's guess matched.
  if (hashedInputBuf.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(hashedInputBuf, storedBuf);
}

export { verifyOtp, sendAndStoreOtp, generateOtp };

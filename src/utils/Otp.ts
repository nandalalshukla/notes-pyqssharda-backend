import crypto from "crypto";
import { User } from "../models/users/user.model";
import { sendMail } from "./email";

async function generateOtp(): Promise<string> {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  console.log("Generated OTP:", otp); //for testing purposes only
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
  console.log(`Sending OTP ${otp} to email: ${email}`);
  sendMail(email, otp);
  const hashedOtp = await hashOtp(otp);
  const otpExpiry = await otpExpiryTime(3);
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error("User not found");
  }
  user.emailOtpHash = hashedOtp;
  user.emailOtpExpiry = otpExpiry;
  await user.save();
}

async function isOtpExpired(expiryTime: Date) {
  return new Date() > expiryTime;
}

async function verifyOtp(otp: string, hashedOtp: string): Promise<boolean> {
  
  const expiryTime = await otpExpiryTime(5);
  const hashedInputOtp = await hashOtp(otp);
  return hashedInputOtp === hashedOtp && !isOtpExpired(expiryTime);
}

export {
  verifyOtp,
  sendAndStoreOtp,
  generateOtp,
};

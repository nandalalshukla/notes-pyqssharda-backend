import nodemailer from "nodemailer";

const emailHost = process.env.EMAIL_HOST || "smtp.gmail.com";
const emailPort = Number(process.env.EMAIL_PORT || "587");
const emailSecure =
  process.env.EMAIL_SECURE === "true" ? true : emailPort === 465;

// Create email transporter using SMTP settings from env
export const transporter = nodemailer.createTransport({
  host: emailHost,
  port: emailPort,
  secure: emailSecure,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false, // Allow self-signed certificates
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
  from: {
    name: "Sharda Online Library",
    address: process.env.EMAIL_USER || "shardaonlinelibrary@gmail.com",
  },
});

// Verify transporter configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email transporter configuration error:", error);
  } else {
    console.log("✅ Email server is ready to send messages");
  }
});

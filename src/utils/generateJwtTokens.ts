import jwt from "jsonwebtoken";


export function generateAccessToken(userId: string) {
  return jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET!, {
    expiresIn: "15m",
  });
}
export function generateRefreshToken(userId: string) {
  return jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET!, {
    expiresIn: "7d",
  });
}
export function generateVerifyToken(userId: string) {
  return jwt.sign({ userId }, process.env.EMAIL_VERIFY_TOKEN_SECRET!, {
    expiresIn: "10m",
  });
}

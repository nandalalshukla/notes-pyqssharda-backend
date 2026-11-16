/** A pending registration reserves its email and username for one day. */
export const UNVERIFIED_ACCOUNT_TTL_MS = 24 * 60 * 60 * 1000;

/** One-time codes expire independently of the pending-account reservation. */
export const OTP_TTL_MINUTES = 10;
export const OTP_TTL_MS = OTP_TTL_MINUTES * 60 * 1000;

/** Prevent repeated sends to the same address, including across multiple IPs. */
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

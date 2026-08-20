import crypto from "crypto";

/**
 * Deterministic one-way hash for opaque bearer tokens (refresh tokens) that
 * need to be looked up by exact value in the DB. SHA-256 (not bcrypt) is
 * correct here: the input is already a high-entropy random JWT, not a
 * low-entropy human password, so slow hashing buys nothing — but hashing it
 * at all means a DB read (backup leak, injection, etc.) doesn't hand out
 * live bearer tokens in plaintext.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

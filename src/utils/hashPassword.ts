import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

// A real bcrypt hash of a fixed, never-used string — NOT a real user's hash.
// Used to give login a bcrypt.compare() to run against when no user matches
// the given email, so failed logins take the same amount of time whether or
// not the email exists (see login.ts). Safe to keep in source: it hashes a
// constant, not a secret.
export const DUMMY_PASSWORD_HASH =
  "$2b$10$GQ8M.2Lr6i6IU5ajEltpuONizuDJy1FH3EatzqXgLKm7cx9fO2On6";

export const hashPassword = async (plainPassword: string): Promise<string> => {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
};

export const comparePassword = async (
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(plainPassword, hashedPassword);
};

import { z } from "zod";

/**
 * Profile updates are sent as `multipart/form-data` (multer handles the
 * avatar), so booleans arrive as the strings "true"/"false". This accepts
 * a real boolean too, so a JSON client needs no special casing.
 */
const formBoolean = z
  .union([z.boolean(), z.string()])
  .transform((value) =>
    typeof value === "boolean" ? value : value.toLowerCase() === "true",
  );

/**
 * Schema for updating user profile
 * Used in: updateProfile controller
 * Note: profilePic file is handled by multer, only text fields are validated
 */
export const editProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, { message: "Name must be at least 3 characters" })
    .max(50, { message: "Name must not exceed 50 characters" })
    .regex(/^[a-zA-Z\s]+$/, {
      message: "Name can only contain letters and spaces",
    })
    .optional(),

  bio: z
    .string()
    .trim()
    .max(500, { message: "Bio must not exceed 500 characters" })
    .optional(),

  course: z
    .string()
    .trim()
    .max(100, { message: "Course must not exceed 100 characters" })
    .optional(),

  contactNo: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, {
      message: "Contact number must be exactly 10 digits",
    })
    .optional(),

  // ── Privacy toggles ────────────────────────────────────────────────────────
  // Sent flat rather than as a nested `privacy` object because FormData
  // can't carry nesting without a JSON round-trip. Each is independently
  // optional so a form can submit just the one the user changed.
  showEmail: formBoolean.optional(),
  showContactNo: formBoolean.optional(),
  showCourse: formBoolean.optional(),
});

export type EditProfileInput = z.infer<typeof editProfileSchema>;

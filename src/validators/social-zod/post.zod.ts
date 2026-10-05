import { z } from "zod";

export const postTypeSchema = z.enum([
  "general",
  "event",
  "announcement",
  "opportunity",
  "lost_found",
]);

export const lostFoundKindSchema = z.enum(["lost", "found"]);

export const lostFoundCategorySchema = z.enum([
  "electronics",
  "documents",
  "stationery",
  "clothing",
  "accessories",
  "keys",
  "wallet",
  "id_card",
  "other",
]);

export const lostFoundStatusSchema = z.enum(["open", "resolved"]);

/**
 * Post bodies arrive as `multipart/form-data` (multer handles the files),
 * so every scalar reaches us as a string — `true`/`false` included. This
 * accepts the real boolean too, so a future JSON client needs no special
 * casing, and treats only the literal string "true" as true.
 */
const formBoolean = z
  .union([z.boolean(), z.string()])
  .transform((value) =>
    typeof value === "boolean" ? value : value.toLowerCase() === "true",
  );

/**
 * A `yyyy-mm-dd` (or any Date-parseable) string from the composer's date
 * input. Empty string means "not provided" and normalizes to null rather
 * than an Invalid Date.
 */
const optionalDateString = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) => !value || !Number.isNaN(new Date(value).getTime()),
    { message: "Please provide a valid date" },
  );

/**
 * The lost & found detail fields, sent flat alongside the rest of the post
 * (rather than as a nested object) because that is what FormData can carry
 * without a JSON round-trip. The controller reassembles them into the
 * Post's `lostFound` sub-document.
 */
const lostFoundFields = {
  lostFoundKind: lostFoundKindSchema.optional(),
  lostFoundItemName: z
    .string()
    .trim()
    .max(120, "Item name cannot exceed 120 characters")
    .optional(),
  lostFoundCategory: lostFoundCategorySchema.optional(),
  lostFoundLocation: z
    .string()
    .trim()
    .max(200, "Location cannot exceed 200 characters")
    .optional(),
  lostFoundDate: optionalDateString,
  lostFoundContactInfo: z
    .string()
    .trim()
    .max(200, "Contact details cannot exceed 200 characters")
    .optional(),
  lostFoundStatus: lostFoundStatusSchema.optional(),
};

/**
 * Schema for creating a post
 * Used in: createPost controller
 * Note: Files are handled separately by multer, only content is validated here
 */
export const createPostSchema = z
  .object({
    type: postTypeSchema.default("general"),
    content: z
      .string()
      .max(2000, "Post content cannot exceed 2000 characters")
      .optional()
      .refine(
        (value) => {
          // Either content or files must be provided (handled in controller)
          return value === undefined || typeof value === "string";
        },
        { message: "Content must be a string" },
      ),
    isAnonymous: formBoolean.optional().default(false),
    ...lostFoundFields,
  })
  .superRefine((value, ctx) => {
    if (value.type !== "lost_found") return;

    // A lost & found post without these two is just an untitled general
    // post filed under the wrong board — the whole feature (search,
    // "Lost"/"Found" wording, resolve flow) hangs off them.
    if (!value.lostFoundKind) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lostFoundKind"],
        message: "Tell us whether you lost this item or found it",
      });
    }

    if (!value.lostFoundItemName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lostFoundItemName"],
        message: "Please name the item",
      });
    }
  });

/**
 * Schema for editing a post
 * Used in: editPost controller
 */
export const editPostSchema = z.object({
  type: postTypeSchema.optional(),
  content: z
    .string()
    .trim()
    .max(2000, "Post content cannot exceed 2000 characters")
    .optional(),
  isAnonymous: formBoolean.optional(),
  ...lostFoundFields,
  removePublicIds: z
    .string()
    .optional()
    .refine(
      (value) => {
        if (!value) return true;
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed);
        } catch {
          return false;
        }
      },
      { message: "removePublicIds must be a valid JSON array" },
    ),
});

/**
 * Extracted params schema for post endpoints
 */
export const postParamsSchema = z.object({
  postId: z.string().refine((id) => /^[0-9a-fA-F]{24}$/.test(id), {
    message: "Invalid post ID format",
  }),
});

/**
 * Body for the dedicated "mark my lost & found post resolved / reopen it"
 * endpoint. Kept separate from editPostSchema so the one-tap action on the
 * card doesn't have to go through the full multipart edit route (and its
 * upload rate limit) just to flip a single field.
 */
export const lostFoundStatusUpdateSchema = z.object({
  postId: z.string().refine((id) => /^[0-9a-fA-F]{24}$/.test(id), {
    message: "Invalid post ID format",
  }),
  status: lostFoundStatusSchema,
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type EditPostInput = z.infer<typeof editPostSchema>;
export type PostParams = z.infer<typeof postParamsSchema>;
export type LostFoundStatusUpdateInput = z.infer<
  typeof lostFoundStatusUpdateSchema
>;

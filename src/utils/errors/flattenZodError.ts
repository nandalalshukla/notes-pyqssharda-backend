import type { ZodError } from "zod";

/**
 * Flattens Zod's internal `issues` array into a stable `{ field: message }`
 * map. Zod's raw `error.issues` is shaped around ITS OWN validation
 * internals (varies per issue `code` — `invalid_type` has
 * `expected`/`received`, `too_small` has `minimum`/`inclusive`, etc.) —
 * that's an implementation detail of the validation library, not a
 * contract this app should hand to every frontend form. This gives the
 * frontend one predictable shape to key inline field errors off of,
 * regardless of what kind of Zod rule failed.
 *
 * When a path has multiple issues, the first one wins — good enough for
 * "show one error per field" UI, which is what every form here does.
 */
export function flattenZodError(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path.length > 0 ? issue.path.join(".") : "_root";
    if (!(field in fieldErrors)) {
      fieldErrors[field] = issue.message;
    }
  }
  return fieldErrors;
}

import type {
  LostFoundCategory,
  LostFoundKind,
  LostFoundStatus,
  LostFoundWriteInput,
  StoredLostFound,
} from "../../../types/social.types.js";

/**
 * The flat `lostFound*` fields the composer sends (see
 * validators/social-zod/post.zod.ts — FormData can't carry a nested
 * object without a JSON round-trip, so they arrive side by side with
 * `content` and `type`).
 */
export type LostFoundBody = {
  lostFoundKind?: LostFoundKind;
  lostFoundItemName?: string;
  lostFoundCategory?: LostFoundCategory;
  lostFoundLocation?: string;
  lostFoundDate?: string;
  lostFoundContactInfo?: string;
  lostFoundStatus?: LostFoundStatus;
};

const parseDate = (value?: string) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

/**
 * Assembles the Post.lostFound sub-document from a validated create body.
 * Only ever called for `type === "lost_found"`, where the validator has
 * already enforced that kind and itemName are present.
 */
export function buildLostFoundFromBody(
  body: LostFoundBody,
): LostFoundWriteInput {
  return {
    kind: body.lostFoundKind,
    itemName: body.lostFoundItemName,
    category: body.lostFoundCategory || "other",
    location: body.lostFoundLocation || "",
    dateOccurred: parseDate(body.lostFoundDate),
    contactInfo: body.lostFoundContactInfo || "",
    status: body.lostFoundStatus || "open",
    resolvedAt: body.lostFoundStatus === "resolved" ? new Date() : undefined,
  };
}

/**
 * Merges an edit body into an existing sub-document, leaving any field the
 * client didn't send untouched — an edit that only changes the location
 * must not blank out the item name.
 *
 * `existing` may be absent when a post is being converted to lost & found
 * from another type, in which case this fills in the defaults.
 */
export function mergeLostFoundFromBody(
  existing: StoredLostFound | null | undefined,
  body: LostFoundBody,
): LostFoundWriteInput {
  const previousStatus = existing?.status ?? "open";
  const nextStatus = body.lostFoundStatus ?? previousStatus;
  const previousResolvedAt = existing?.resolvedAt ?? undefined;

  return {
    kind: body.lostFoundKind ?? existing?.kind ?? undefined,
    itemName: body.lostFoundItemName ?? existing?.itemName ?? undefined,
    category: body.lostFoundCategory ?? existing?.category ?? "other",
    location: body.lostFoundLocation ?? existing?.location ?? "",
    dateOccurred:
      body.lostFoundDate !== undefined
        ? parseDate(body.lostFoundDate)
        : (existing?.dateOccurred ?? undefined),
    contactInfo: body.lostFoundContactInfo ?? existing?.contactInfo ?? "",
    status: nextStatus,
    // Stamp resolvedAt on the transition into "resolved" and clear it on
    // the way back out, so a reopened-then-resolved-again post reports
    // when it was *last* resolved rather than the first time.
    resolvedAt:
      nextStatus === "resolved"
        ? previousStatus === "resolved"
          ? (previousResolvedAt ?? new Date())
          : new Date()
        : undefined,
  };
}

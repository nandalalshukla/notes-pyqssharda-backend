/**
 * Who may publish which post types without review.
 *
 * Events and announcements speak *for* the campus rather than to it — a
 * fake "exams moved to Friday" post does real damage — so a general member
 * writing one lands it in a review queue instead of the feed. Staff
 * (moderators and admins) publish those directly, and every other post
 * type stays immediate for everyone.
 *
 * This is the single source of truth for that rule: createPost, editPost
 * and the mod queue all derive their behaviour from the helpers below
 * rather than re-testing roles and types themselves.
 */

/** Post types a general member cannot publish without approval. */
export const MODERATED_POST_TYPES = ["event", "announcement"] as const;

/** Roles that publish moderated types directly *and* review other people's. */
export const POST_REVIEWER_ROLES = ["mod", "admin"] as const;

export type PostModerationStatus = "approved" | "pending" | "rejected";

export function isPostReviewer(role?: string | null): boolean {
  return POST_REVIEWER_ROLES.includes(role as (typeof POST_REVIEWER_ROLES)[number]);
}

export function isModeratedPostType(type?: string | null): boolean {
  return MODERATED_POST_TYPES.includes(
    type as (typeof MODERATED_POST_TYPES)[number],
  );
}

/**
 * Whether a post of this type, written by someone in this role, has to be
 * reviewed before anyone else can see it.
 */
export function requiresApproval(
  type?: string | null,
  role?: string | null,
): boolean {
  return isModeratedPostType(type) && !isPostReviewer(role);
}

/**
 * The status a post should carry after being created or edited.
 *
 * Note this is also the *re-review* rule: an edit runs it again, so an
 * already-approved announcement a member rewrites goes back to "pending".
 * Without that, approval would be trivially bypassable — publish something
 * innocuous, wait for approval, then edit it into anything.
 */
export function resolveModerationStatus(
  type?: string | null,
  role?: string | null,
): PostModerationStatus {
  return requiresApproval(type, role) ? "pending" : "approved";
}

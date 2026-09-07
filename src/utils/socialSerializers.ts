import type {
  PopulatedLikeUser,
  PopulatedUserSummary,
  SerializedLostFound,
  StoredLostFound,
} from "../types/social.types.js";

type MaybePopulatedUser = PopulatedUserSummary | null | undefined;
type MaybePopulatedLikeUser = PopulatedLikeUser | null | undefined;

export function hasPopulatedUserSummary(
  user: MaybePopulatedUser,
): user is PopulatedUserSummary {
  return Boolean(user && typeof user === "object" && "_id" in user);
}

export function hasPopulatedLikeUser(
  user: MaybePopulatedLikeUser,
): user is PopulatedLikeUser {
  return Boolean(user && typeof user === "object" && "_id" in user);
}

export function serializeUserSummary(
  user: PopulatedUserSummary,
  extras: { isFollowedByCurrentUser?: boolean } = {},
) {
  return {
    _id: user._id,
    username: user.username || "Anonymous",
    avatar: user.profilePic?.url || "",
    profilePic: user.profilePic,
    role: user.role,
    ...extras,
  };
}

/**
 * The stand-in author every viewer other than the author themselves sees
 * on an anonymous post.
 *
 * `_id` is deliberately `null`, not the real id: the id is the one field
 * that would deanonymize the post no matter how the rest is masked (the
 * client links profiles, follow buttons and hover cards off it). Nothing
 * downstream may reconstruct the author from this object — the real ref
 * stays server-side on the document, where moderation and ownership
 * checks read it.
 */
export const ANONYMOUS_AUTHOR = {
  _id: null,
  username: "Anonymous",
  avatar: "",
  profilePic: null,
  role: "user",
  isFollowedByCurrentUser: false,
} as const;

/**
 * Decides which author a given viewer is allowed to see on a post.
 *
 * Authors always see themselves on their own anonymous posts — otherwise
 * the client couldn't tell it's their post, and the edit/delete controls
 * (which key off author id) would disappear from the one person entitled
 * to them. Everyone else gets ANONYMOUS_AUTHOR.
 */
export function serializePostAuthor(
  author: PopulatedUserSummary,
  options: {
    isAnonymous?: boolean;
    viewerId?: string | null;
    isFollowedByCurrentUser?: boolean;
  } = {},
) {
  const { isAnonymous, viewerId, isFollowedByCurrentUser } = options;
  const viewerIsAuthor =
    Boolean(viewerId) && String(viewerId) === author._id.toString();

  if (isAnonymous && !viewerIsAuthor) {
    return { ...ANONYMOUS_AUTHOR };
  }

  return serializeUserSummary(author, {
    ...(isFollowedByCurrentUser === undefined
      ? {}
      : { isFollowedByCurrentUser }),
  });
}

/**
 * Normalizes the `lostFound` sub-document for the wire. Returns `null` for
 * every non-lost&found post so the client can branch on presence alone
 * instead of also checking `type`.
 */
export function serializeLostFound(
  lostFound: StoredLostFound | null | undefined,
): SerializedLostFound | null {
  if (!lostFound || !lostFound.kind) return null;

  return {
    kind: lostFound.kind,
    itemName: lostFound.itemName || "",
    category: lostFound.category || "other",
    location: lostFound.location || "",
    dateOccurred: lostFound.dateOccurred ?? null,
    contactInfo: lostFound.contactInfo || "",
    status: lostFound.status || "open",
    resolvedAt: lostFound.resolvedAt ?? null,
  };
}

import type {
  PopulatedLikeUser,
  PopulatedUserSummary,
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

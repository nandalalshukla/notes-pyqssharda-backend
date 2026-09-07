import type { Types } from "mongoose";

/**
 * The fields serializeAuthUser reads. Every caller passes a User document
 * (hydrated or lean) that carries at least these — anything selected away
 * simply comes back undefined rather than throwing.
 */
export interface AuthUserSource {
  _id: Types.ObjectId;
  name?: string;
  username?: string;
  email?: string;
  role?: string;
  profilePic?: { url?: string; publicId?: string | null } | null;
  bio?: string;
  course?: string;
  contactNo?: string | null;
  privacy?: {
    showEmail?: boolean;
    showContactNo?: boolean;
    showCourse?: boolean;
  } | null;
  followersCount?: number;
  followingCount?: number;
  contributions?: number;
  isEmailVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * The one shape every endpoint that establishes or refreshes a session
 * hands back: login, email verification, `GET /auth/me`, and the profile
 * update endpoints.
 *
 * These four used to spell out their own field lists, which had already
 * drifted — login returned `bio`/`course` while verification didn't, and
 * neither carried the `privacy` flags that `/auth/me` did. That mattered
 * once verification began signing the user straight in: whether your
 * client-side user object had a `course` on it came down to which endpoint
 * you happened to arrive through.
 *
 * `id` (not `_id`) is kept for backwards compatibility — it is what every
 * one of these endpoints has always returned, and the frontend's auth store
 * normalizes it back to `_id` on the way in.
 */
export function serializeAuthUser(user: AuthUserSource) {
  return {
    id: user._id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    profilePic: user.profilePic,
    bio: user.bio,
    course: user.course,
    contactNo: user.contactNo,
    // Defaulted the same way the read paths do, so an account created
    // before these settings existed reports the sharing behaviour it
    // actually has rather than `undefined`.
    privacy: {
      showEmail: user.privacy?.showEmail ?? true,
      showContactNo: user.privacy?.showContactNo ?? true,
      showCourse: user.privacy?.showCourse ?? true,
    },
    followersCount: user.followersCount,
    followingCount: user.followingCount,
    contributions: user.contributions,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
  };
}

/**
 * The field list a `.select()` needs so serializeAuthUser has everything
 * it reads. Endpoints that load the whole document don't need this.
 */
export const AUTH_USER_SELECT =
  "_id name username email role profilePic bio course contactNo privacy followersCount followingCount contributions isEmailVerified createdAt";

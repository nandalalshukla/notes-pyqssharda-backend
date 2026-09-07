// Shared types for social-controller / social-service read paths.
//
// Mongoose types a `ref`ed field (e.g. `author: { type: ObjectId, ref: "User" }`)
// as `Types.ObjectId` at the schema level, even on documents that were
// `.populate()`d — populate mutates the field at runtime to hold the
// referenced sub-document, but the static schema type has no way to know
// that. These interfaces describe the *actual* runtime shape of a populated
// field for each distinct `.populate(path, "select string")` call used in
// the social controllers/services, so call sites can assert to a precise
// type instead of `any`.
//
// Each interface name documents which fields it selects — keep it in sync
// with the `.populate()` select string it backs. Do not reuse an interface
// for a populate call that selects a different field set.

import type { Types } from "mongoose";

/** The `profilePic` embedded sub-document on User (users/user.model.ts). */
export interface ProfilePic {
  url: string;
  publicId: string | null;
}

/**
 * User populated via `.populate("author"/"actor"/"reporter"/"targetOwner",
 * "_id username profilePic role")` (any field order) — used for Post.author,
 * Comment.author, Notification.actor, and Report.reporter/targetOwner in
 * report.service.ts.
 */
export interface PopulatedUserSummary {
  _id: Types.ObjectId;
  username: string;
  profilePic?: ProfilePic;
  role: string;
}

/**
 * User populated via `.populate({ path: "user", select: "username email
 * profilePic role privacy _id" })` on Like — used by like/getLikes.ts.
 * Same as PopulatedUserSummary plus `email` and the `privacy` flags that
 * decide whether that email may actually be shown to the requester.
 */
export interface PopulatedLikeUser {
  _id: Types.ObjectId;
  username: string;
  email: string;
  profilePic?: ProfilePic;
  role: string;
  privacy?: UserPrivacySettings;
}

/**
 * User populated via `.populate("reporter"/"targetOwner", "email username")`
 * in reportModeration.service.ts — narrower than PopulatedUserSummary
 * (no profilePic/role).
 */
export interface PopulatedReporterContact {
  _id: Types.ObjectId;
  email: string;
  username: string;
}

/** Post populated via `.populate({ path: "post", select: "_id" })` on Notification. */
export interface PopulatedNotificationPostRef {
  _id: Types.ObjectId;
}

/** Comment populated via `.populate({ path: "comment", select: "_id post" })` on Notification. */
export interface PopulatedNotificationCommentRef {
  _id: Types.ObjectId;
  post: Types.ObjectId;
}

export type LostFoundKind = "lost" | "found";

export type LostFoundCategory =
  | "electronics"
  | "documents"
  | "stationery"
  | "clothing"
  | "accessories"
  | "keys"
  | "wallet"
  | "id_card"
  | "other";

export type LostFoundStatus = "open" | "resolved";

/**
 * The `lostFound` sub-document as Mongoose hands it back off a `.lean()`
 * read or a hydrated document. Every field except `kind`/`itemName` is
 * optional at the schema level, and documents written before the field
 * existed have it absent entirely — so this is deliberately wider than
 * what a write is allowed to be (see LostFoundWriteInput).
 */
export interface StoredLostFound {
  kind?: LostFoundKind | null;
  itemName?: string | null;
  category?: LostFoundCategory | null;
  location?: string | null;
  dateOccurred?: Date | null;
  contactInfo?: string | null;
  status?: LostFoundStatus | null;
  resolvedAt?: Date | null;
}

/**
 * What the create/edit controllers hand to Mongoose for `Post.lostFound`.
 *
 * Absent values are `undefined` rather than `null` here because that's
 * what Mongoose's inferred write type accepts — it then applies the
 * schema's own `default: null` for anything left unset, which is how a
 * cleared date ends up stored as null.
 */
export interface LostFoundWriteInput {
  kind: LostFoundKind | undefined;
  itemName: string | undefined;
  category: LostFoundCategory;
  location: string;
  dateOccurred: Date | undefined;
  contactInfo: string;
  status: LostFoundStatus;
  resolvedAt: Date | undefined;
}

/** The wire shape produced by `serializeLostFound` (utils/socialSerializers.ts). */
export interface SerializedLostFound {
  kind: LostFoundKind;
  itemName: string;
  category: LostFoundCategory;
  location: string;
  dateOccurred: Date | null;
  contactInfo: string;
  status: LostFoundStatus;
  resolvedAt: Date | null;
}

/** The `privacy` embedded sub-document on User (users/user.model.ts). */
export interface UserPrivacySettings {
  showEmail?: boolean;
  showContactNo?: boolean;
  showCourse?: boolean;
}

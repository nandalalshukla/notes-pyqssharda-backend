import mongoose from "mongoose";
import { User } from "../../models/users/user.model.js";

export interface MentionReferenceInput {
  userId: string;
  username: string;
}

export interface ValidatedMention {
  userId: mongoose.Types.ObjectId;
  usernameSnapshot: string;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasMentionToken(content: string, username: string): boolean {
  const escaped = escapeRegex(username.toLowerCase());
  const pattern = new RegExp(`(^|[^a-zA-Z0-9._])@${escaped}(?![a-zA-Z0-9._])`, "i");
  return pattern.test(content);
}

export async function resolveMentions(
  content: string,
  references: unknown,
  actorId: string,
): Promise<ValidatedMention[]> {
  if (!Array.isArray(references) || references.length === 0) return [];

  const uniqueIds = new Set<string>();
  for (const reference of references) {
    if (
      typeof reference === "object" &&
      reference !== null &&
      "userId" in reference &&
      typeof reference.userId === "string" &&
      mongoose.isValidObjectId(reference.userId) &&
      reference.userId !== actorId
    ) {
      uniqueIds.add(reference.userId);
    }
  }

  if (uniqueIds.size === 0) return [];

  const users = await User.find({
    _id: { $in: [...uniqueIds].map((id) => new mongoose.Types.ObjectId(id)) },
    isActive: true,
    isEmailVerified: true,
  })
    .select("_id username")
    .lean();

  const valid: ValidatedMention[] = [];
  for (const user of users) {
    const username = user.username.toLowerCase();
    const matchingReference = references.find(
      (reference) =>
        typeof reference === "object" &&
        reference !== null &&
        "userId" in reference &&
        reference.userId === user._id.toString(),
    ) as MentionReferenceInput | undefined;

    if (!matchingReference) continue;

    const snapshot = matchingReference.username?.trim().toLowerCase();
    if (
      hasMentionToken(content, username) ||
      (snapshot && snapshot !== username && hasMentionToken(content, snapshot))
    ) {
      valid.push({
        userId: user._id,
        usernameSnapshot: username,
      });
    }
  }

  return valid;
}

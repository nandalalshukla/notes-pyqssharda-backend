import mongoose, { Schema } from "mongoose";

const ObjectId = Schema.Types.ObjectId;
const sessionSchema = new Schema(
  {
    userId: {
      type: ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // SHA-256 hash of the refresh token, never the raw bearer token — so a
    // DB read/leak can't be used to replay a live session.
    refreshTokenHash: {
      type: String,
      required: true,
      select: false,
    },

    deviceInfo: {
      type: String,
    },

    ipAddress: {
      type: String,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

sessionSchema.index({ refreshTokenHash: 1 }, { unique: true });
// TTL index: MongoDB automatically deletes a session document once
// `expiresAt` is in the past, instead of stale rows accumulating forever.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = mongoose.model("Session", sessionSchema);

// The refresh-token field was renamed `refreshToken` -> `refreshTokenHash`,
// but the old unique index survived in the deployed database. Since new
// session documents never set `refreshToken`, Mongo indexed every one of them
// as `null` — so the first login succeeded and every login after it (on any
// device) failed with a duplicate-key error, making it look like a user could
// only be signed in on one device at a time.
//
// This reconciles the deployed collection with the schema above: legacy
// sessions are unusable anyway (every lookup goes through `refreshTokenHash`),
// so they're purged, the stale index is dropped, and a pre-rename `expiresAt`
// index that was created without a TTL is rebuilt so expired sessions
// actually get reaped.
export const ensureSessionIndexes = async () => {
  await Session.collection.deleteMany({ refreshTokenHash: { $exists: false } });

  const indexes = await Session.collection.indexes();

  for (const index of indexes) {
    const name = index.name;
    if (!name || name === "_id_") continue;

    const isLegacyTokenIndex = name === "refreshToken_1";
    const isTtlLessExpiryIndex =
      name === "expiresAt_1" && index.expireAfterSeconds === undefined;

    if (isLegacyTokenIndex || isTtlLessExpiryIndex) {
      await Session.collection.dropIndex(name);
    }
  }

  await Session.syncIndexes();
};

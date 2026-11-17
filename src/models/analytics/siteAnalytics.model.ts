import mongoose, { Schema } from "mongoose";

const siteMetricsSchema = new Schema(
  {
    _id: { type: String, required: true },
    totalPageViews: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true, versionKey: false },
);

const sitePresenceSchema = new Schema(
  {
    _id: { type: String, required: true },
    lastSeenAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false },
);
sitePresenceSchema.index({ lastSeenAt: 1 });
sitePresenceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const sitePageViewSchema = new Schema(
  {
    _id: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false },
);
sitePageViewSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SiteMetrics = mongoose.model("SiteMetrics", siteMetricsSchema);
export const SitePresence = mongoose.model("SitePresence", sitePresenceSchema);
export const SitePageView = mongoose.model("SitePageView", sitePageViewSchema);

export const ensureSiteAnalyticsIndexes = async (initialPageViews: number) => {
  await Promise.all([
    SitePresence.createIndexes(),
    SitePageView.createIndexes(),
  ]);

  // Seed only once. Setting an initial total in deployment configuration
  // never overwrites the live counter after the first successful startup.
  await SiteMetrics.updateOne(
    { _id: "global" },
    { $setOnInsert: { totalPageViews: initialPageViews } },
    { upsert: true },
  );
};

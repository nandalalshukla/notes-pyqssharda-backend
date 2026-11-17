import { createHash } from "node:crypto";
import type { Request, Response } from "express";
import mongoose from "mongoose";
import type { SiteAnalyticsPulseInput } from "../../../validators/social-zod/siteAnalytics.zod.js";
import {
  SiteMetrics,
  SitePageView,
  SitePresence,
} from "../../../models/analytics/siteAnalytics.model.js";

const PRESENCE_WINDOW_MS = 90 * 1000;
const PRESENCE_EXPIRY_MS = 3 * 60 * 1000;
const PAGE_VIEW_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

const hashId = (value: string) =>
  createHash("sha256").update(value).digest("hex");

export const pulseSiteAnalytics = async (req: Request, res: Response) => {
  const { browserId, pageViewId } = req.body as SiteAnalyticsPulseInput;
  const now = new Date();

  // Store only hashes of random browser generated IDs. IP addresses and
  // other request fingerprint data are deliberately not recorded.
  await SitePresence.updateOne(
    { _id: hashId(browserId) },
    {
      $set: {
        lastSeenAt: now,
        expiresAt: new Date(now.getTime() + PRESENCE_EXPIRY_MS),
      },
    },
    { upsert: true },
  );

  // A page view ID is unique to one client-side route view. Deduplicating it
  // makes repeated heartbeats safe and the transaction prevents the event
  // record and aggregate counter from getting out of sync.
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const result = await SitePageView.updateOne(
        { _id: hashId(pageViewId) },
        {
          $setOnInsert: {
            expiresAt: new Date(now.getTime() + PAGE_VIEW_RETENTION_MS),
          },
        },
        { upsert: true, session },
      );

      if (result.upsertedCount > 0) {
        await SiteMetrics.updateOne(
          { _id: "global" },
          { $inc: { totalPageViews: 1 } },
          { session },
        );
      }
    });
  } finally {
    await session.endSession();
  }

  const [metrics, onlineNow] = await Promise.all([
    SiteMetrics.findById("global").select("totalPageViews").lean(),
    SitePresence.countDocuments({
      lastSeenAt: { $gte: new Date(now.getTime() - PRESENCE_WINDOW_MS) },
    }),
  ]);

  res.setHeader("Cache-Control", "no-store");
  res.json({
    success: true,
    data: {
      totalPageViews: metrics?.totalPageViews ?? 0,
      onlineNow,
    },
  });
};

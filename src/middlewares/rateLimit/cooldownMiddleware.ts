import type { Request, Response, NextFunction, RequestHandler } from "express";

type CooldownOptions = {
  windowMs: number;
  keyGenerator?: (req: Request) => string;
  message?: string;
};

const defaultKeyGenerator = (req: Request) =>
  req.user?.userId || req.ip || "anonymous";

export const cooldown = ({
  windowMs,
  keyGenerator,
  message,
}: CooldownOptions): RequestHandler => {
  const store = new Map<string, number>();
  const cooldownMessage =
    message || "Please wait a moment before trying again.";

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = (keyGenerator || defaultKeyGenerator)(req);
    const last = store.get(key) || 0;

    if (now - last < windowMs) {
      return res.status(429).json({
        success: false,
        message: cooldownMessage,
      });
    }

    store.set(key, now);
    return next();
  };
};

export default cooldown;

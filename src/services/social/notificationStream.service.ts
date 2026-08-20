import type { Response } from "express";

/**
 * In-process pub/sub for pushing notifications to connected clients over
 * Server-Sent Events. A user can have more than one live connection (phone +
 * laptop, two tabs, ...), so each userId maps to a Set of open responses.
 *
 * This is intentionally in-memory, not backed by Redis/a message broker —
 * correct for a single Node process. If this API is ever horizontally
 * scaled to multiple instances, a user's connection could live on an
 * instance that didn't handle the write that triggered the notification;
 * at that point this map needs to be replaced with a shared pub/sub (e.g.
 * Redis) that every instance subscribes to. Noted here so it isn't a
 * silent correctness gap if that day comes.
 */
const connections = new Map<string, Set<Response>>();

const HEARTBEAT_INTERVAL_MS = 25_000;

function writeEvent(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function subscribe(userId: string, res: Response): () => void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    // Nginx-style proxies (Render sits behind one) buffer responses by
    // default, which would hold every event until the buffer fills —
    // defeating "real-time". This header asks them not to.
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();

  let set = connections.get(userId);
  if (!set) {
    set = new Set();
    connections.set(userId, set);
  }
  set.add(res);

  // Periodic comment-only ping keeps the connection alive through proxies/
  // load balancers that silently drop idle connections, and lets the
  // client detect a dead connection quickly instead of waiting on a full
  // TCP timeout.
  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, HEARTBEAT_INTERVAL_MS);

  const cleanup = () => {
    clearInterval(heartbeat);
    const current = connections.get(userId);
    current?.delete(res);
    if (current && current.size === 0) {
      connections.delete(userId);
    }
  };

  res.on("close", cleanup);

  return cleanup;
}

export function publishToUser(
  userId: string,
  event: "notification" | "unread-count",
  data: unknown,
) {
  const set = connections.get(userId);
  if (!set || set.size === 0) return;
  for (const res of set) {
    writeEvent(res, event, data);
  }
}

export function connectedDeviceCount(userId: string): number {
  return connections.get(userId)?.size ?? 0;
}

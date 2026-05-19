import { initTRPC, TRPCError } from "@trpc/server";
import type { TrpcContext } from "./context";

// In-memory sliding-window rate limiter. Bucket keys are `<scope>|<userId|ip>`,
// values are arrays of unix timestamps (ms). On each call we drop expired
// timestamps, then check the count.
//
// Trade-offs vs. a persistent store (Redis):
//   - Lost on process restart. Acceptable for MVP — we just want to slow down
//     scripted abuse, not protect against state-level adversaries.
//   - Per-process counter. If we ever horizontal-scale, switch to Redis +
//     INCR/EXPIRE.
//
// In `NODE_ENV=test` the middleware short-circuits so unit tests can run as
// many `.mutate()` calls as they need without hitting the bucket.

type Bucket = number[];

const buckets = new Map<string, Bucket>();

export type RateLimitConfig = {
  /** Stable label for the rule (e.g. "createRequest"). */
  scope: string;
  /** Max events per window. */
  max: number;
  /** Window length in seconds. */
  windowSec: number;
};

// Test-only: clear all buckets between test runs.
export function __resetRateLimitForTests() {
  buckets.clear();
}

function pruneAndCount(key: string, windowMs: number, now: number): number {
  const arr = buckets.get(key);
  if (!arr) return 0;
  // Drop entries older than `now - windowMs`. Bucket arrays stay short because
  // window is bounded.
  const fresh = arr.filter((t) => t > now - windowMs);
  if (fresh.length === 0) {
    buckets.delete(key);
  } else if (fresh.length !== arr.length) {
    buckets.set(key, fresh);
  }
  return fresh.length;
}

function recordHit(key: string, now: number): void {
  const arr = buckets.get(key) ?? [];
  arr.push(now);
  buckets.set(key, arr);
}

function bucketKey(scope: string, ctx: TrpcContext): string {
  // Prefer authenticated user id (stable per user). For unauthenticated public
  // procedures we fall back to the request IP. If neither is available the
  // limiter degrades to "global" (still useful to cap a stampede).
  const userId = ctx.user?.id;
  if (userId != null) return `${scope}|u${userId}`;
  // Hono/Express req shape: ip is on the request. Cast loosely — we just need
  // a string discriminator.
  const reqIp = (ctx.req as unknown as { ip?: string })?.ip;
  return `${scope}|${reqIp ?? "anon"}`;
}

const t = initTRPC.context<TrpcContext>().create();

/**
 * Builds a tRPC middleware enforcing the given config. Usage:
 *
 *   const rateLimited = (cfg) => protectedProcedure.use(rateLimitMiddleware(cfg));
 *   createRequest: rateLimited({ scope: "createRequest", max: 10, windowSec: 3600 })
 *     .input(...)
 *     .mutation(...)
 */
export function rateLimitMiddleware(config: RateLimitConfig) {
  return t.middleware(async (opts) => {
    if (process.env.NODE_ENV === "test") return opts.next();

    const now = Date.now();
    const windowMs = config.windowSec * 1000;
    const key = bucketKey(config.scope, opts.ctx);
    const count = pruneAndCount(key, windowMs, now);

    if (count >= config.max) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Calma! Você atingiu o limite de ${config.max} a cada ${Math.round(
          config.windowSec / 60,
        )} min. Tenta de novo em alguns minutos.`,
      });
    }

    recordHit(key, now);
    return opts.next();
  });
}

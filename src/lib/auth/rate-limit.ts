import { ApiError } from "@/lib/api";

type Entry = { count: number; expiresAt: number };
export class RateLimiter {
  private entries = new Map<string, Entry>();
  constructor(private limit = 10, private windowMs = 15 * 60 * 1000, private maxKeys = 10_000) {}

  allow(key: string, now = Date.now()) {
    for (const [entryKey, entry] of this.entries) {
      if (entry.expiresAt <= now) this.entries.delete(entryKey);
    }
    const entry = this.entries.get(key);
    if (!entry) {
      if (this.entries.size >= this.maxKeys) return false;
      this.entries.set(key, { count: 1, expiresAt: now + this.windowMs });
      return true;
    }
    if (entry.count >= this.limit) return false;
    entry.count++;
    return true;
  }
}

const globalLimiter = globalThis as unknown as { authLimiter?: RateLimiter };
const limiter = globalLimiter.authLimiter ??= new RateLimiter();

export function limitAuth(request: Request, email: string, action: "login" | "signup") {
  // Deploy behind a trusted proxy that replaces x-forwarded-for (e.g. Vercel).
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!limiter.allow(`${action}:${ip}:${email}`)) throw new ApiError(429, "RATE_LIMITED", "Too many attempts. Try again in 15 minutes.");
}

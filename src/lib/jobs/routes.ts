import { timingSafeEqual, createHash } from "node:crypto";
import { apiHandler, ApiError } from "@/lib/api";
import { runDaily } from "./service";

export const daily = apiHandler(async request => {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization") ?? "";
  const digest = (text: string) => createHash("sha256").update(text).digest();
  if (!secret || !timingSafeEqual(digest(authorization), digest(`Bearer ${secret}`))) throw new ApiError(401, "UNAUTHORIZED", "Valid job authorization is required.");
  return Response.json({ data: await runDaily() });
});

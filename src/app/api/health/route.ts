import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    if (!process.env.DATABASE_URL) throw new Error("Database is not configured");
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ app: "ok", database: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ app: "ok", database: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

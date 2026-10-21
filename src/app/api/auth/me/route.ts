import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";

export const GET = apiHandler(async () => NextResponse.json({ user: await requireUser() }));

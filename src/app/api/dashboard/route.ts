import { apiHandler } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { dashboard } from "@/lib/domain/summary";
export const GET = apiHandler(async () => Response.json({ data: await dashboard((await requireUser()).id) }));

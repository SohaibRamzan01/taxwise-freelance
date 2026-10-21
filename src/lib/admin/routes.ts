import { z } from "zod";
import { apiHandler, parseJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/session";
import { adminQuery, changeUser, listAudit, listUsers, overview, userPatch } from "./service";
export const users = apiHandler(async request => { await requireAdmin(); return Response.json(await listUsers(adminQuery.parse(Object.fromEntries(new URL(request.url).searchParams)))); });
export const audit = apiHandler(async request => { await requireAdmin(); return Response.json(await listAudit(adminQuery.parse(Object.fromEntries(new URL(request.url).searchParams)))); });
export const analytics = apiHandler(async () => { await requireAdmin(); return Response.json({ data: await overview() }); });
export async function updateUser(request: Request, context: { params: Promise<{ id: string }> }) {
  return apiHandler(async request => {
    const actor = await requireAdmin();
    const id = z.string().min(1).max(100).parse((await context.params).id);
    return Response.json({ data: await changeUser(actor.id, id, await parseJson(request, userPatch)) });
  })(request);
}

import { z } from "zod";
import { apiHandler, parseJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { listSchema } from "@/lib/domain/validation";
import { bulkExpenses, bulkSchema, exportLedger, importExpenses, importSchema } from "./service";
import { previewExpenses } from "./csv";
export const bulk = apiHandler(async request => {
  const user = await requireUser();
  return Response.json({ data: await bulkExpenses(user.id, await parseJson(request, bulkSchema)) });
});
export const preview = apiHandler(async request => {
  await requireUser();
  const body = await parseJson(request, z.object({ csv: z.string().max(128000) }).strict(), 256000);
  return Response.json({ data: await previewExpenses(body.csv) });
});
export const commit = apiHandler(async request => {
  const user = await requireUser();
  const body = await parseJson(request, importSchema, 256000);
  return Response.json({ data: await importExpenses(user.id, body.rows) }, { status: 201 });
});
export const exportRoute = (entity: "expenses" | "income") => apiHandler(async request => {
  const user = await requireUser();
  return exportLedger(entity, user.id, listSchema.parse(Object.fromEntries(new URL(request.url).searchParams)));
});

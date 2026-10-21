import { z } from "zod";
import { apiHandler, parseJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { createRecord, deleteRecord, getRecord, listRecords, updateRecord } from "./service";
import { listSchema, type Entity } from "./validation";

export function collectionRoutes(entity: Entity) {
  return {
    GET: apiHandler(async request => {
      const user = await requireUser();
      const query = listSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
      return Response.json(await listRecords(entity, user.id, query));
    }),
    POST: apiHandler(async request => {
      const user = await requireUser();
      return Response.json({ data: await createRecord(entity, user.id, await parseJson(request, z.unknown())) }, { status: 201 });
    }),
  };
}
type Context = { params: Promise<{ id: string }> };
export function itemRoutes(entity: Entity) {
  const handle = (method: "GET" | "PATCH" | "DELETE") => async (request: Request, context: Context) => apiHandler(async request => {
    const user = await requireUser();
    const id = z.string().min(1).max(100).parse((await context.params).id);
    const data = method === "GET" ? await getRecord(entity, user.id, id) : method === "DELETE" ? await deleteRecord(entity, user.id, id) : await updateRecord(entity, user.id, id, await parseJson(request, z.unknown()));
    return Response.json({ data });
  })(request);
  return { GET: handle("GET"), PATCH: handle("PATCH"), DELETE: handle("DELETE") };
}

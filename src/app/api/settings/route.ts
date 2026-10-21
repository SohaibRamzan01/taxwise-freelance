import { apiHandler, parseJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { getSettings, updateSettings } from "@/lib/domain/summary";
import { settingsSchema } from "@/lib/domain/validation";
export const GET = apiHandler(async () => Response.json({ data: await getSettings((await requireUser()).id) }));
export const PATCH = apiHandler(async request => {
  const user = await requireUser();
  return Response.json({ data: await updateSettings(user.id, await parseJson(request, settingsSchema)) });
});

import { apiHandler, parseJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { categorizeExpense, categorizeInput } from "@/lib/ai";
export const POST = apiHandler(async request => {
  await requireUser();
  return Response.json({ data: await categorizeExpense(await parseJson(request, categorizeInput)) });
});

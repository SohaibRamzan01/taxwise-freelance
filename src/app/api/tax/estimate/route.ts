import { apiHandler } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { taxSummary } from "@/lib/domain/summary";
import { estimateQuerySchema } from "@/lib/domain/validation";
export const GET = apiHandler(async request => {
  const user = await requireUser();
  const query = estimateQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  const { estimate, schedule, plan, payments } = await taxSummary(user.id, { ...query, annualise: query.annualise === "true" });
  return Response.json({ data: { estimate, schedule, plan, payments } });
});

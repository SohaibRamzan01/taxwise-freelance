import { apiHandler } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { loadTaxReport, reportQuerySchema } from "@/lib/reports/service";
import { deductionSummaryCsv } from "@/lib/reports/summary";
import { pdfResponse, taxSummaryPdf } from "@/lib/pdf/documents";
export const runtime = "nodejs";
export const GET = apiHandler(async request => {
  const user = await requireUser();
  const query = reportQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  const summary = await loadTaxReport(user, query);
  const filename = `tax-summary-${query.year}${query.quarter ? `-q${query.quarter}` : ""}`;
  if (query.format === "json") return Response.json({ data: summary });
  if (query.format === "csv") return new Response(deductionSummaryCsv(summary), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}.csv"` } });
  return pdfResponse(await taxSummaryPdf(summary), `${filename}.pdf`);
});

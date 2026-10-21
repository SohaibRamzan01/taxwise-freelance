import { z } from "zod";
import { apiHandler, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/domain/summary";
import { effectiveStatus } from "@/lib/domain/invoices";
import { invoicePdf, pdfResponse } from "@/lib/pdf/documents";
export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return apiHandler(async () => {
    const user = await requireUser();
    const id = z.string().min(1).max(100).parse((await context.params).id);
    const invoice = await db.invoice.findFirst({ where: { id, userId: user.id }, include: { client: true, items: { orderBy: { position: "asc" } } } });
    if (!invoice) throw new ApiError(404, "NOT_FOUND", "Invoice not found.");
    const profile = await getSettings(user.id);
    const pdf = await invoicePdf({ ...invoice, status: effectiveStatus(invoice, new Date().toISOString().slice(0, 10)), issueDate: invoice.issueDate.toISOString().slice(0, 10), dueDate: invoice.dueDate.toISOString().slice(0, 10), paidAt: invoice.paidAt?.toISOString().slice(0, 10), items: invoice.items.map(item => ({ ...item, quantity: item.quantity.toString() })), business: { name: profile.businessName || user.name, address: profile.businessAddress, email: profile.businessEmail || user.email, phone: profile.businessPhone } });
    return pdfResponse(pdf, `invoice-${invoice.number.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`);
  })(request);
}

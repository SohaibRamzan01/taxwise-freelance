import type { InvoiceStatus } from "@prisma/client";
import { ApiError } from "@/lib/errors";
import { roundedRatio } from "@/lib/tax";
import type { InvoiceInput } from "./validation";

const transitions: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: ["SENT", "VOID"], SENT: ["DRAFT", "PAID", "VOID"], OVERDUE: ["DRAFT", "SENT", "PAID", "VOID"], PAID: ["SENT", "VOID"], VOID: ["DRAFT"],
};
export function assertTransition(from: InvoiceStatus, to: InvoiceStatus) {
  if (to === "OVERDUE" || (from !== to && !transitions[from].includes(to))) throw new ApiError(409, "INVALID_TRANSITION", "This invoice status transition is not allowed. Overdue status is calculated automatically.");
}
export function effectiveStatus(invoice: { status: InvoiceStatus; dueDate: Date }, today: string): InvoiceStatus {
  if (invoice.status === "SENT" || invoice.status === "OVERDUE") return invoice.dueDate.toISOString().slice(0, 10) < today ? "OVERDUE" : "SENT";
  return invoice.status;
}
export function invoiceTotals(input: Pick<InvoiceInput, "items" | "discountCents" | "taxRateBasisPoints">) {
  const items = input.items.map((item, position) => ({ ...item, position, amountCents: roundedRatio(item.unitPriceCents, Math.round(item.quantity * 10000), 10000) }));
  const subtotalCents = items.reduce((sum, item) => sum + item.amountCents, 0);
  if (input.discountCents > subtotalCents) throw new ApiError(400, "INVALID_DISCOUNT", "Discount cannot exceed subtotal.");
  const taxCents = roundedRatio(subtotalCents - input.discountCents, input.taxRateBasisPoints, 10000);
  const totalCents = subtotalCents - input.discountCents + taxCents;
  if (Math.max(subtotalCents, totalCents, ...items.map(i => i.amountCents)) > 2147483647) throw new ApiError(400, "AMOUNT_TOO_LARGE", "Invoice exceeds the supported amount.");
  return { items, subtotalCents, taxCents, totalCents };
}

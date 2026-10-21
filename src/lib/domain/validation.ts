import { z } from "zod";
import { ExpenseCategory, FilingStatus, InvoiceStatus, PaymentMethod } from "@prisma/client";
import { isoDate } from "@/lib/tax";

export const money = z.number().int().min(0).max(2147483647);
const text = z.string().trim().min(1).max(200);
const notes = z.string().trim().max(2000).nullable().optional();
const optionalText = z.string().trim().max(200).nullable().optional();
export const dateString = z.string().refine(value => { try { isoDate(value); return true; } catch { return false; } }, "Use a valid YYYY-MM-DD date.");
const date = dateString.transform(value => new Date(`${value}T00:00:00Z`));
const email = z.union([z.email().max(254), z.literal("")]).nullable().optional();
export const expenseSchema = z.object({ date, vendor: text, amountCents: money, category: z.enum(ExpenseCategory), businessUsePercent: z.number().int().min(0).max(100).default(100), paymentMethod: z.enum(PaymentMethod).default("OTHER"), notes }).strict();
export const expensePatchSchema = expenseSchema.partial().extend({ businessUsePercent: expenseSchema.shape.businessUsePercent.removeDefault().optional(), paymentMethod: expenseSchema.shape.paymentMethod.removeDefault().optional() });
export const incomeSchema = z.object({ date, source: text, amountCents: money, notes }).strict();
export const clientSchema = z.object({ name: text, email, company: optionalText, address: notes, phone: optionalText, notes }).strict();
export const paymentSchema = z.object({ taxYear: z.literal(2026), quarter: z.number().int().min(1).max(4), date, amountCents: money, confirmation: optionalText, notes }).strict();
export const itemSchema = z.object({ description: text, quantity: z.number().positive().max(1000000).refine(n => Math.abs(n * 10000 - Math.round(n * 10000)) < 0.00001, "Use at most four decimal places."), unitPriceCents: money }).strict();
export const invoiceSchema = z.object({ clientId: text, issueDate: date, dueDate: date, items: z.array(itemSchema).min(1).max(50), discountCents: money.default(0), taxRateBasisPoints: z.number().int().min(0).max(10000).default(0), currency: z.literal("USD").default("USD"), notes, terms: notes }).strict();
export const invoicePatchSchema = invoiceSchema.partial().extend({ discountCents: money.optional(), taxRateBasisPoints: z.number().int().min(0).max(10000).optional(), currency: z.literal("USD").optional(), status: z.enum(InvoiceStatus).optional(), paidAt: date.optional() }).strict();
export const settingsSchema = z.object({ filingStatus: z.enum(FilingStatus).optional(), taxYear: z.literal(2026).optional(), priorYearTaxCents: money.optional(), priorYearAgiCents: money.optional(), useSafeHarbour: z.boolean().optional(), businessName: optionalText, businessAddress: notes, businessEmail: email, businessPhone: optionalText, currency: z.literal("USD").optional() }).strict();
export const listSchema = z.object({
  search: z.string().trim().max(200).default(""), page: z.coerce.number().int().min(1).max(100000).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().max(40).optional(), direction: z.enum(["asc", "desc"]).default("desc"), from: dateString.optional(), to: dateString.optional(),
  category: z.enum(ExpenseCategory).optional(), status: z.enum(InvoiceStatus).optional(), year: z.coerce.number().int().min(2000).max(2100).optional(), quarter: z.coerce.number().int().min(1).max(4).optional(),
}).strict().refine(q => !q.from || !q.to || q.from <= q.to, "End date must be after start date.");
export const estimateQuerySchema = z.object({ year: z.coerce.number().pipe(z.literal(2026)).optional(), annualise: z.enum(["true", "false"]).default("true"), asOf: dateString.optional() }).strict();
export type ListQuery = z.infer<typeof listSchema>;
export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type InvoicePatch = z.infer<typeof invoicePatchSchema>;
export type Entity = "expenses" | "income" | "clients" | "invoices" | "estimated-payments";

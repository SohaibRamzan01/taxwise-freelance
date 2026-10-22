import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/api";
import { deductibleAmount } from "@/lib/tax";
import { assertTransition, effectiveStatus, invoiceTotals } from "./invoices";
import { clientSchema, expenseSchema, expensePatchSchema, incomeSchema, invoiceSchema, invoicePatchSchema, paymentSchema, type Entity, type ListQuery } from "./validation";

type Tx = Prisma.TransactionClient;
const missing = () => new ApiError(404, "NOT_FOUND", "Record not found.");
const invoiceInclude = { client: true, items: { orderBy: { position: "asc" as const } } };
export const today = () => new Date().toISOString().slice(0, 10);
const displayInvoice = <T extends { status: Parameters<typeof effectiveStatus>[0]["status"]; dueDate: Date }>(row: T) => ({ ...row, status: effectiveStatus(row, today()) });

/** Serialize writes per account, including number allocation and paid-income synchronization. */
export async function write<T>(userId: string, work: (tx: Tx) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
        return work(tx);
      }, { isolationLevel: "Serializable" });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2034" && attempt < 2) continue;
        if (error.code === "P2034") throw new ApiError(409, "CONCURRENT_CHANGE", "Another update occurred. Please retry.");
        if (error.code === "P2003") throw new ApiError(409, "RECORD_IN_USE", "This record is in use. Remove its linked records first.");
        if (error.code === "P2025") throw missing();
      }
      throw error;
    }
  }
}

export function listOptions(entity: Entity, userId: string, q: ListQuery, asOf = today()) {
  const allowed: Record<Entity, string[]> = { expenses: ["date", "vendor", "amountCents", "category"], income: ["date", "source", "amountCents"], clients: ["name", "company", "createdAt"], invoices: ["issueDate", "dueDate", "number", "totalCents"], "estimated-payments": ["date", "amountCents", "quarter"] };
  const sort = q.sort ?? allowed[entity][0];
  if (!allowed[entity].includes(sort)) throw new ApiError(400, "INVALID_SORT", "Unsupported sort field.");
  const where: Record<string, unknown> = { userId };
  const fields: Record<Entity, string[]> = { expenses: ["vendor", "notes"], income: ["source", "notes"], clients: ["name", "company", "email"], invoices: ["number", "notes"], "estimated-payments": ["confirmation", "notes"] };
  if (q.search) where.OR = fields[entity].map(field => ({ [field]: { contains: q.search, mode: "insensitive" } }));
  const dateField = entity === "invoices" ? "issueDate" : entity === "clients" ? "createdAt" : "date";
  if (q.from || q.to) where[dateField] = { ...(q.from ? { gte: new Date(q.from) } : {}), ...(q.to ? { lt: new Date(new Date(q.to).getTime() + 86400000) } : {}) };
  if (entity === "expenses" && q.category) where.category = q.category;
  if (entity === "estimated-payments") { if (q.year) where.taxYear = q.year; if (q.quarter) where.quarter = q.quarter; }
  if (entity === "invoices" && q.status) {
    if (["SENT", "OVERDUE"].includes(q.status)) {
      where.status = { in: ["SENT", "OVERDUE"] };
      where.dueDate = q.status === "OVERDUE" ? { lt: new Date(asOf) } : { gte: new Date(asOf) };
    } else where.status = q.status;
  }
  return { where, orderBy: [{ [sort]: q.direction }, { id: "asc" as const }], skip: (q.page - 1) * q.pageSize, take: q.pageSize };
}

export async function listRecords(entity: Entity, userId: string, q: ListQuery) {
  const options = listOptions(entity, userId, q);
  // These delegates share findMany/count signatures for the common scoped query options.
  const delegate = entity === "expenses" ? db.expense : entity === "income" ? db.income : entity === "clients" ? db.client : entity === "estimated-payments" ? db.estimatedPayment : null;
  let rows: unknown[], total: number;
  let totals: { amountCents: number; deductibleCents: number } | undefined;
  if (entity === "invoices") {
    const args = options as Prisma.InvoiceFindManyArgs;
    const result = await Promise.all([db.invoice.findMany({ ...args, include: invoiceInclude }), db.invoice.count({ where: args.where })]);
    rows = result[0].map(displayInvoice); total = result[1];
  } else if (entity === "expenses") {
    const args = options as Prisma.ExpenseFindManyArgs;
    const [pageRows, count, matching] = await Promise.all([
      db.expense.findMany({ ...args, include: { receipt: { select: { id: true } } } }),
      db.expense.count({ where: args.where }),
      db.expense.findMany({ where: args.where, select: { amountCents: true, businessUsePercent: true, category: true } }),
    ]);
    rows = pageRows; total = count;
    totals = matching.reduce((sum, row) => ({ amountCents: sum.amountCents + row.amountCents, deductibleCents: sum.deductibleCents + deductibleAmount(row.amountCents, row.businessUsePercent, row.category) }), { amountCents: 0, deductibleCents: 0 });
  } else {
    // The structural cast stays at this adapter boundary; input field names come from the allowlist above.
    const table = delegate as unknown as { findMany(args: typeof options): Promise<unknown[]>; count(args: { where: typeof options.where }): Promise<number> };
    [rows, total] = await Promise.all([table.findMany(options), table.count({ where: options.where })]);
  }
  return { data: rows, pagination: { page: q.page, pageSize: q.pageSize, total, pages: Math.ceil(total / q.pageSize) }, ...(totals ? { totals } : {}) };
}

export async function getRecord(entity: Entity, userId: string, id: string, tx: Tx = db) {
  const where = { id, userId };
  const row = entity === "expenses" ? await tx.expense.findFirst({ where }) : entity === "income" ? await tx.income.findFirst({ where }) : entity === "clients" ? await tx.client.findFirst({ where }) : entity === "estimated-payments" ? await tx.estimatedPayment.findFirst({ where }) : await tx.invoice.findFirst({ where, include: invoiceInclude });
  if (!row) throw missing();
  return entity === "invoices" ? displayInvoice(row as Prisma.InvoiceGetPayload<{ include: typeof invoiceInclude }>) : row;
}

async function assertClient(tx: Tx, userId: string, clientId: string) {
  if (!await tx.client.findFirst({ where: { id: clientId, userId } })) throw missing();
}
function assertDates(issueDate: Date, dueDate: Date) {
  if (dueDate < issueDate) throw new ApiError(400, "INVALID_DATES", "Due date cannot precede issue date.");
}

export async function createRecord(entity: Entity, userId: string, body: unknown) {
  // Validate before opening a transaction; never accept client-supplied userId or totals.
  const expense = entity === "expenses" ? expenseSchema.parse(body) : null;
  const income = entity === "income" ? incomeSchema.parse(body) : null;
  const client = entity === "clients" ? clientSchema.parse(body) : null;
  const payment = entity === "estimated-payments" ? paymentSchema.parse(body) : null;
  const invoice = entity === "invoices" ? invoiceSchema.parse(body) : null;
  return write(userId, async tx => {
    if (expense) {
      const { receiptId, ...data } = expense;
      if (receiptId && !await tx.receipt.findFirst({ where: { id: receiptId, userId, expenseId: null } })) throw missing();
      const row = await tx.expense.create({ data: { ...data, userId } });
      if (receiptId) await tx.receipt.update({ where: { id: receiptId, userId }, data: { expenseId: row.id } });
      return row;
    }
    if (income) return tx.income.create({ data: { ...income, userId } });
    if (client) return tx.client.create({ data: { ...client, userId } });
    if (payment) return tx.estimatedPayment.create({ data: { ...payment, userId } });
    if (!invoice) throw missing();
    assertDates(invoice.issueDate, invoice.dueDate);
    await assertClient(tx, userId, invoice.clientId);
    const { items, ...totals } = invoiceTotals(invoice);
    const account = await tx.user.update({ where: { id: userId }, data: { nextInvoiceNumber: { increment: 1 } }, select: { nextInvoiceNumber: true } });
    const { items: _items, ...data } = invoice;
    void _items;
    const row = await tx.invoice.create({ data: { ...data, ...totals, userId, number: `INV-${String(account.nextInvoiceNumber - 1).padStart(4, "0")}` }, include: invoiceInclude });
    await tx.invoiceItem.createMany({ data: items.map(item => ({ ...item, userId, invoiceId: row.id })) });
    return tx.invoice.findFirst({ where: { id: row.id, userId }, include: invoiceInclude });
  });
}

export async function updateRecord(entity: Entity, userId: string, id: string, body: unknown) {
  const expense = entity === "expenses" ? expensePatchSchema.parse(body) : null;
  const income = entity === "income" ? incomeSchema.partial().parse(body) : null;
  const client = entity === "clients" ? clientSchema.partial().parse(body) : null;
  const payment = entity === "estimated-payments" ? paymentSchema.partial().parse(body) : null;
  const patch = entity === "invoices" ? invoicePatchSchema.parse(body) : null;
  return write(userId, async tx => {
    await getRecord(entity, userId, id, tx);
    const where = { id, userId };
    if (expense) return tx.expense.update({ where, data: expense });
    if (client) return tx.client.update({ where, data: client });
    if (payment) return tx.estimatedPayment.update({ where, data: payment });
    if (income) {
      const row = await tx.income.findFirst({ where });
      if (row?.invoiceId) throw new ApiError(409, "LINKED_INCOME", "Change the linked invoice to update this income.");
      return tx.income.update({ where, data: income });
    }
    if (!patch) throw missing();
    const row = await tx.invoice.findFirst({ where, include: invoiceInclude });
    if (!row) throw missing();
    const { status: requestedStatus, paidAt, ...changes } = patch;
    const status = requestedStatus ?? row.status;
    if (requestedStatus) assertTransition(row.status, requestedStatus);
    if ((row.status === "PAID" || row.status === "VOID") && Object.keys(changes).length) throw new ApiError(409, "INVOICE_LOCKED", "Reopen this invoice before editing its contents.");
    if (paidAt && status !== "PAID") throw new ApiError(400, "INVALID_PAYMENT_DATE", "A payment date requires PAID status.");
    const merged = { ...row, ...changes, items: changes.items ?? row.items.map(item => ({ description: item.description, quantity: Number(item.quantity), unitPriceCents: item.unitPriceCents })) };
    assertDates(merged.issueDate, merged.dueDate);
    await assertClient(tx, userId, merged.clientId);
    const { items, ...totals } = invoiceTotals(merged);
    const { items: _items, ...data } = changes;
    void _items;
    const paymentDate = status === "PAID" ? paidAt ?? row.paidAt ?? new Date(today()) : null;
    if (paymentDate && (paymentDate > new Date(today()) || paymentDate < merged.issueDate)) throw new ApiError(400, "INVALID_PAYMENT_DATE", "Payment date must be between issue date and today.");
    await tx.invoice.update({ where, data: { ...data, ...totals, status, paidAt: paymentDate } });
    if (changes.items) {
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id, userId } });
      await tx.invoiceItem.createMany({ data: items.map(item => ({ ...item, invoiceId: id, userId })) });
    }
    if (status === "PAID") {
      const incomeData = { date: paymentDate!, source: `${row.client.company || row.client.name} / ${row.number}`, amountCents: totals.totalCents };
      await tx.income.upsert({ where: { invoiceId_userId: { invoiceId: id, userId } }, create: { ...incomeData, userId, invoiceId: id }, update: incomeData });
    } else await tx.income.deleteMany({ where: { invoiceId: id, userId } });
    const updated = await tx.invoice.findFirst({ where, include: invoiceInclude });
    return updated && displayInvoice(updated);
  });
}

export async function deleteRecord(entity: Entity, userId: string, id: string) {
  return write(userId, async tx => {
    const row = await getRecord(entity, userId, id, tx);
    const where = { id, userId };
    if (entity === "income" && "invoiceId" in row && row.invoiceId) throw new ApiError(409, "LINKED_INCOME", "Un-pay or delete the invoice to remove its income.");
    if (entity === "expenses") await tx.expense.delete({ where });
    if (entity === "income") await tx.income.delete({ where });
    if (entity === "clients") await tx.client.delete({ where });
    if (entity === "estimated-payments") await tx.estimatedPayment.delete({ where });
    if (entity === "invoices") {
      await tx.income.deleteMany({ where: { invoiceId: id, userId } });
      await tx.invoice.delete({ where });
    }
    await tx.auditLog.create({ data: { userId, action: "DELETE", entityType: entity, entityId: id } });
    return { deleted: true };
  });
}

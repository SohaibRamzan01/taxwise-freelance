import { z } from "zod";
import { apiHandler } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
export const search = apiHandler(async request => {
  const user = await requireUser();
  const { q } = z.object({ q: z.string().trim().min(2).max(200) }).strict().parse(Object.fromEntries(new URL(request.url).searchParams));
  const contains = { contains: q, mode: "insensitive" as const };
  const [expenses, clients, invoices] = await Promise.all([
    db.expense.findMany({ where: { userId: user.id, OR: [{ vendor: contains }, { notes: contains }] }, select: { id: true, vendor: true, amountCents: true }, orderBy: [{ date: "desc" }, { id: "asc" }], take: 5 }),
    db.client.findMany({ where: { userId: user.id, OR: [{ name: contains }, { email: contains }, { company: contains }] }, select: { id: true, name: true }, orderBy: [{ name: "asc" }, { id: "asc" }], take: 5 }),
    db.invoice.findMany({ where: { userId: user.id, OR: [{ number: contains }, { notes: contains }, { client: { name: contains } }, { client: { company: contains } }] }, select: { id: true, number: true, totalCents: true }, orderBy: [{ issueDate: "desc" }, { id: "asc" }], take: 5 }),
  ]);
  return Response.json({ data: { expenses, clients, invoices } });
});

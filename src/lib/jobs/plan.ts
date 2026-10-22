import { rules2026 } from "@/lib/tax";

type Invoice = { id: string; userId: string; number: string; dueDate: Date };
type User = { id: string; taxYear: number };
export type Reminder = { userId: string; type: string; key: string; title: string; body: string };

/** UTC calendar days; invoice keys also allow a reminder when its due date changes. */
export function dailyPlan(now: Date, invoices: Invoice[], users: User[]) {
  const day = now.toISOString().slice(0, 10);
  const horizon = new Date(`${day}T00:00:00Z`).getTime() + 14 * 86400000;
  const notifications: Reminder[] = invoices.filter(i => i.dueDate.toISOString().slice(0, 10) < day).map(i => ({
    userId: i.userId, type: "INVOICE_OVERDUE", key: `invoice:${i.id}:${i.dueDate.toISOString().slice(0, 10)}`,
    title: `Invoice ${i.number} is overdue`, body: `Payment was due ${i.dueDate.toISOString().slice(0, 10)}. Review it in Invoices.`,
  }));
  for (const user of users) {
    if (user.taxYear !== rules2026.year) continue;
    rules2026.dueDates.forEach((due, index) => {
      if (due >= day && new Date(due).getTime() <= horizon) notifications.push({
        userId: user.id, type: "TAX_DUE", key: `tax:${rules2026.year}:${index + 1}`,
        title: `Quarter ${index + 1} estimated tax due ${due}`,
        body: "Review your estimated tax plan and payments. Estimates are for planning, not tax advice.",
      });
    });
  }
  return { day, cutoff: new Date(now.getTime() - 86400000), notifications };
}

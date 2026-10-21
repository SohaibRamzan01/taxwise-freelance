import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/lib/auth/password";
import { signupSchema } from "../src/lib/auth/validation";

async function main() {
  const password = process.env.SEED_DEMO_PASSWORD;
  if (!password) { console.log("Seed skipped: SEED_DEMO_PASSWORD is unset."); return; }
  signupSchema.shape.password.parse(password);
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to seed.");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    if (await db.user.findUnique({ where: { email: "demo@taxwise.example" } })) {
      console.log("Seed skipped: demo account already exists."); return;
    }
    const passwordHash = await hashPassword(password);
    await db.$transaction(async tx => {
      const user = await tx.user.create({ data: { email: "demo@taxwise.example", name: "Alex Morgan", passwordHash, businessName: "Morgan Design Studio", businessAddress: "Portland, OR", nextInvoiceNumber: 3 } });
      const userId = user.id;
      const client = await tx.client.create({ data: { userId, name: "Jordan Lee", company: "Cedar & Co.", email: "jordan@cedar.example", address: "Seattle, WA" } });
      const secondClient = await tx.client.create({ data: { userId, name: "Sam Rivera", company: "Northline Studio", email: "sam@northline.example", address: "Austin, TX" } });
      const invoice = await tx.invoice.create({ data: { userId, clientId: client.id, number: "INV-2026-001", status: "PAID", issueDate: new Date("2026-06-01"), dueDate: new Date("2026-06-15"), paidAt: new Date("2026-06-12"), subtotalCents: 240000, totalCents: 240000 } });
      await tx.invoiceItem.create({ data: { userId, invoiceId: invoice.id, description: "Brand identity design", quantity: 24, unitPriceCents: 10000, amountCents: 240000 } });
      const outstanding = await tx.invoice.create({ data: { userId, clientId: secondClient.id, number: "INV-2026-002", status: "SENT", issueDate: new Date("2026-10-12"), dueDate: new Date("2026-10-30"), subtotalCents: 175000, totalCents: 175000 } });
      await tx.invoiceItem.create({ data: { userId, invoiceId: outstanding.id, description: "Website design milestone", quantity: 1, unitPriceCents: 175000, amountCents: 175000 } });
      await tx.income.createMany({ data: [
        { userId, invoiceId: invoice.id, date: new Date("2026-06-12"), source: "Cedar & Co. — INV-2026-001", amountCents: 240000 },
        { userId, date: new Date("2026-06-20"), source: "Design consultation", amountCents: 65000 },
      ] });
      await tx.expense.createMany({ data: [
        { userId, date: new Date("2026-06-02"), vendor: "Figma", amountCents: 1500, category: "SOFTWARE_AND_SUBSCRIPTIONS", paymentMethod: "CREDIT_CARD" },
        { userId, date: new Date("2026-06-08"), vendor: "Office supply store", amountCents: 8400, category: "SUPPLIES", paymentMethod: "DEBIT_CARD" },
        { userId, date: new Date("2026-06-10"), vendor: "Client lunch", amountCents: 6200, category: "MEALS", paymentMethod: "CREDIT_CARD", notes: "Project planning with Cedar & Co." },
        { userId, date: new Date("2026-06-15"), vendor: "Internet service", amountCents: 8000, businessUsePercent: 75, category: "UTILITIES", paymentMethod: "BANK_TRANSFER" },
      ] });
      await tx.estimatedPayment.create({ data: { userId, taxYear: 2026, quarter: 2, date: new Date("2026-06-15"), amountCents: 45000, notes: "Sample estimated payment" } });
    });
    console.log("Demo data created for demo@taxwise.example.");
  } finally { await db.$disconnect(); }
}

main().catch(() => { console.error("Seed failed. Check database configuration and password requirements."); process.exitCode = 1; });

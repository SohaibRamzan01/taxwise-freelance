import "dotenv/config";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/lib/auth/password";
import { signupSchema } from "../src/lib/auth/validation";
import { demoClients, demoExpenses, demoInvoices, demoManualIncome, demoPayments } from "./demo-data";

async function clearDemo(tx: Prisma.TransactionClient, userId: string) {
  // Delete income before invoices, and invoices before their restricted client FK.
  await tx.income.deleteMany({ where: { userId } });
  await tx.invoice.deleteMany({ where: { userId } });
  await tx.client.deleteMany({ where: { userId } });
  await tx.receipt.deleteMany({ where: { userId } });
  await tx.expense.deleteMany({ where: { userId } });
  await tx.estimatedPayment.deleteMany({ where: { userId } });
  await tx.auditLog.deleteMany({ where: { userId } });
}

async function seedDemo(db: PrismaClient, password: string) {
  const existing = await db.user.findUnique({ where: { email: "demo@taxwise.example" } });
  if (existing && process.env.SEED_RESET_DEMO !== "true") {
    console.log("Demo skipped: account exists (set SEED_RESET_DEMO=true to replace its data).");
    return;
  }
  const passwordHash = await hashPassword(password);
  const samples = new Map<string, Buffer>();
  for (const row of demoExpenses) if (row.sample) samples.set(row.sample, await readFile(new URL(`../public/samples/${row.sample}`, import.meta.url)));
  await db.$transaction(async tx => {
    if (existing) await clearDemo(tx, existing.id);
    const profile = { name: "Alex Morgan", passwordHash, filingStatus: "SINGLE" as const, taxYear: 2026,
      businessName: "Morgan Design Studio", businessAddress: "1420 NW Everett Street, Suite 210\nPortland, OR 97209",
      businessEmail: "demo@taxwise.example", businessPhone: "+1 503 555 0142", currency: "USD",
      priorYearTaxCents: 1600000, priorYearAgiCents: 7800000, useSafeHarbour: true, nextInvoiceNumber: 17 };
    const user = existing ? await tx.user.update({ where: { id: existing.id }, data: profile })
      : await tx.user.create({ data: { ...profile, email: "demo@taxwise.example" } });
    const userId = user.id;
    const clients = [];
    for (const data of demoClients) clients.push(await tx.client.create({ data: { ...data, userId } }));
    for (const { clientIndex, description, ...data } of demoInvoices) {
      const invoice = await tx.invoice.create({ data: { ...data, userId, clientId: clients[clientIndex].id, subtotalCents: data.totalCents, terms: "Payment due within 14 days. Thank you for your business." } });
      await tx.invoiceItem.create({ data: { userId, invoiceId: invoice.id, description, quantity: 1, unitPriceCents: data.totalCents, amountCents: data.totalCents } });
      if (data.status === "PAID" && data.paidAt) await tx.income.create({ data: { userId, invoiceId: invoice.id, date: data.paidAt, source: `${clients[clientIndex].company} / ${data.number}`, amountCents: data.totalCents } });
    }
    await tx.income.createMany({ data: demoManualIncome.map(row => ({ ...row, userId })) });
    for (const { sample, ...data } of demoExpenses) {
      const expense = await tx.expense.create({ data: { ...data, userId, paymentMethod: data.category === "INTERNET_PHONE" ? "BANK_TRANSFER" : "CREDIT_CARD" } });
      if (sample) {
        const image = samples.get(sample)!;
        await tx.receipt.create({ data: { userId, expenseId: expense.id, image: new Uint8Array(image), size: image.length, mimeType: "image/png" } });
      }
    }
    await tx.estimatedPayment.createMany({ data: demoPayments.map(row => ({ ...row, userId, taxYear: 2026 })) });
    await tx.auditLog.create({ data: { userId, action: "DEMO_SEEDED", entityType: "users", entityId: userId } });
  }, { timeout: 30000 });
  console.log("Demo populated: 4 clients, 16 invoices (12 paid), 48 expenses, 3 receipts, 15 income entries, 3 payments.");
}

async function seedTelemetry(db: PrismaClient) {
  const names = ["Maya Patel", "Noah Williams", "Avery Kim", "Olivia Garcia", "Ethan Davis", "Sophia Wilson"];
  const now = new Date();
  for (const [i, name] of names.entries()) {
    const email = `demo-${i + 1}@taxwise.example`;
    if (await db.user.findUnique({ where: { email } })) continue;
    // Telemetry accounts have individual random passwords, never a shared credential.
    const passwordHash = await hashPassword(randomBytes(24).toString("base64url"));
    const createdAt = new Date(now.getTime() - (i * 9 + 8) * 86400000);
    await db.$transaction(async tx => {
      const user = await tx.user.create({ data: { email, name, passwordHash, createdAt, nextInvoiceNumber: 2 } });
      const userId = user.id;
      const client = await tx.client.create({ data: { userId, name: `Sample client ${i + 1}`, createdAt } });
      const totalCents = 95000 + i * 42500;
      const invoice = await tx.invoice.create({ data: { userId, clientId: client.id, number: "INV-0001", status: "PAID", issueDate: createdAt, dueDate: new Date(createdAt.getTime() + 14 * 86400000), paidAt: createdAt, totalCents, subtotalCents: totalCents, createdAt } });
      await tx.invoiceItem.create({ data: { userId, invoiceId: invoice.id, description: "Freelance project milestone", amountCents: totalCents, unitPriceCents: totalCents, createdAt } });
      await tx.income.create({ data: { userId, invoiceId: invoice.id, source: "Sample client / INV-0001", amountCents: totalCents, date: createdAt, createdAt } });
      await tx.expense.createMany({ data: [0, 1, 2].map(j => ({ userId, vendor: ["Adobe", "Client lunch", "Internet service"][j], category: (["SOFTWARE_AND_SUBSCRIPTIONS", "MEALS", "INTERNET_PHONE"] as const)[j], amountCents: 3000 + i * 500 + j * 1200, businessUsePercent: j === 2 ? 75 : 100, date: createdAt, createdAt })) });
      await tx.auditLog.createMany({ data: [
        { userId, action: "SIGNUP", createdAt },
        { userId, action: "LOGIN", createdAt: new Date(now.getTime() - (i * 4 + 1) * 86400000) },
        { userId, action: "DELETE", entityType: "expenses", entityId: `demo-removed-expense-${i + 1}`, createdAt: new Date(now.getTime() - (i * 4 + 2) * 86400000), metadata: { demo: true } },
      ] });
    });
  }
  console.log("Telemetry demo accounts ready (6 accounts; existing accounts skipped).");
}

async function main() {
  const password = process.env.SEED_DEMO_PASSWORD, adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!password && !adminPassword) { console.log("Seed skipped: SEED_DEMO_PASSWORD and SEED_ADMIN_PASSWORD are unset."); return; }
  for (const value of [password, adminPassword]) if (value) signupSchema.shape.password.parse(value);
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to seed.");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    if (password) { await seedDemo(db, password); await seedTelemetry(db); }
    if (adminPassword) {
      const email = "admin@taxwise.example";
      if (await db.user.findUnique({ where: { email } })) console.log("Admin skipped: account exists.");
      else {
        await db.user.create({ data: { email, name: "Demo Administrator", role: "ADMIN", passwordHash: await hashPassword(adminPassword) } });
        console.log("Admin created: admin@taxwise.example.");
      }
    } else console.log("Admin skipped: SEED_ADMIN_PASSWORD is unset.");
  } finally { await db.$disconnect(); }
}

main().catch(() => { console.error("Seed failed. Check database configuration, sample images and password requirements."); process.exitCode = 1; });

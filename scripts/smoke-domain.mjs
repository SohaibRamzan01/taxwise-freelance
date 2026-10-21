// Runs against a local server and cleans up only accounts created by this run.
import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import pg from "pg";

const origin = process.env.SMOKE_APP_URL || "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(origin).hostname)) throw new Error("Smoke test requires a local app.");
const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5433/taxwise";
if (!["localhost", "127.0.0.1"].includes(new URL(databaseUrl).hostname)) throw new Error("Smoke cleanup requires a local database.");
const client = new pg.Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 });
await client.connect();
const accounts = [];
async function request(path, { method = "GET", body, cookie, expected = 200, requestOrigin = origin } = {}) {
  const response = await fetch(`${origin}${path}`, { method, headers: { origin: requestOrigin, ...(body ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined, redirect: "manual" });
  const payload = await response.json();
  assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(payload)}`);
  return { response, ...payload };
}
try {
  const token = randomBytes(8).toString("hex");
  for (const n of [1, 2]) {
    const result = await request("/api/auth/signup", { method: "POST", expected: 201, body: { name: "Domain smoke", email: `smoke-${token}-${n}@example.test`, password: randomBytes(24).toString("base64url") } });
    accounts.push({ id: result.user.id, cookie: result.response.headers.get("set-cookie").split(";")[0] });
  }
  const [a, b] = accounts;
  const call = (path, options = {}) => request(path, { cookie: a.cookie, ...options });
  const createdClient = (await call("/api/clients", { method: "POST", expected: 201, body: { name: "Smoke Client", email: "client@example.test", company: "Smoke Studio" } })).data;
  const invoiceBody = { clientId: createdClient.id, issueDate: "2026-01-01", dueDate: "2026-01-15", items: [{ description: "Design", quantity: 2.5, unitPriceCents: 10000 }], discountCents: 1000, taxRateBasisPoints: 725 };
  const invoice = (await call("/api/invoices", { method: "POST", expected: 201, body: invoiceBody })).data;
  assert.equal(invoice.number, "INV-0001"); assert.equal(invoice.totalCents, 25740); assert.equal(invoice.items.length, 1);
  const secondInvoice = (await call("/api/invoices", { method: "POST", expected: 201, body: invoiceBody })).data;
  assert.equal(secondInvoice.number, "INV-0002");
  await call(`/api/invoices/${secondInvoice.id}`, { method: "DELETE" });
  await call(`/api/invoices/${invoice.id}`, { method: "PATCH", expected: 409, body: { status: "PAID" } });
  const sent = (await call(`/api/invoices/${invoice.id}`, { method: "PATCH", body: { status: "SENT" } })).data;
  assert.equal(sent.status, "OVERDUE"); assert.equal(sent.totalCents, 25740);
  const overdue = await call("/api/invoices?status=OVERDUE&sort=dueDate&pageSize=1");
  assert.equal(overdue.pagination.total, 1); assert.equal(overdue.data[0].id, invoice.id);
  for (let i = 0; i < 2; i++) await call(`/api/invoices/${invoice.id}`, { method: "PATCH", body: { status: "PAID", paidAt: "2026-06-01" } });
  const linkedIncome = await call("/api/income");
  assert.equal(linkedIncome.data.length, 1); assert.equal(linkedIncome.data[0].amountCents, 25740);
  await call(`/api/income/${linkedIncome.data[0].id}`, { method: "DELETE", expected: 409 });
  await call(`/api/invoices/${invoice.id}`, { method: "PATCH", expected: 409, body: { discountCents: 0 } });
  await call(`/api/invoices/${invoice.id}`, { method: "PATCH", body: { status: "SENT" } });
  assert.equal((await call("/api/income")).data.length, 0);
  await call(`/api/invoices/${invoice.id}`, { method: "PATCH", body: { status: "PAID", paidAt: "2026-06-01" } });
  const expense = (await call("/api/expenses", { method: "POST", expected: 201, body: { date: "2026-06-10", vendor: "Client lunch", amountCents: 10000, category: "MEALS", businessUsePercent: 80, paymentMethod: "CREDIT_CARD" } })).data;
  await call(`/api/expenses/${expense.id}`, { method: "PATCH", body: { vendor: "Client lunch updated" } });
  assert.equal((await call(`/api/expenses/${expense.id}`)).data.businessUsePercent, 80);
  const manualIncome = (await call("/api/income", { method: "POST", expected: 201, body: { date: "2026-06-11", source: "Consultation", amountCents: 5000 } })).data;
  const estimate = (await call("/api/tax/estimate?year=2026&annualise=false")).data;
  assert.equal(estimate.estimate.ytdIncomeCents, 30740); assert.equal(estimate.estimate.ytdDeductionsCents, 4000); assert.equal(estimate.estimate.totalTaxCents, 3778);
  const payment = (await call("/api/estimated-payments", { method: "POST", expected: 201, body: { taxYear: 2026, quarter: 2, date: "2026-06-15", amountCents: 1000, confirmation: "smoke" } })).data;
  assert.equal((await call("/api/tax/estimate?year=2026&annualise=false")).data.schedule.paidSoFarCents, 1000);
  const summary = (await call("/api/dashboard")).data;
  assert.equal(summary.monthly.length, 12); assert.equal(summary.kpis.incomeCents, 30740); assert.equal(summary.deductions[0].amountCents, 4000);
  await call("/api/settings", { method: "PATCH", body: { filingStatus: "HEAD_OF_HOUSEHOLD", priorYearTaxCents: 50000, priorYearAgiCents: 16000000, useSafeHarbour: true, businessName: "Smoke Studio" } });
  assert.equal((await call("/api/settings")).data.businessName, "Smoke Studio");
  await call("/api/settings", { method: "PATCH", expected: 400, body: { role: "ADMIN" } });
  await call("/api/expenses", { method: "POST", expected: 400, body: { date: "2026-02-30", vendor: "Invalid", amountCents: -1, category: "OTHER" } });
  await call("/api/expenses", { method: "POST", expected: 403, requestOrigin: "https://foreign.example", body: {} });
  await request("/api/expenses", { expected: 401 });
  await call("/api/tax/estimate?year=2025", { expected: 400 });
  for (const [entity, id] of [["clients", createdClient.id], ["invoices", invoice.id], ["expenses", expense.id], ["income", manualIncome.id], ["estimated-payments", payment.id]]) {
    for (const method of ["GET", "PATCH", "DELETE"]) await request(`/api/${entity}/${id}`, { cookie: b.cookie, method, ...(method === "PATCH" ? { body: {} } : {}), expected: 404 });
  }
  await request("/api/invoices", { cookie: b.cookie, method: "POST", body: invoiceBody, expected: 404 });
  assert.equal((await request("/api/dashboard", { cookie: b.cookie })).data.kpis.incomeCents, 0);
  const print = await fetch(`${origin}/invoices/${invoice.id}/print`, { headers: { cookie: a.cookie } });
  assert.equal(print.status, 200); assert.match(await print.text(), /INV-0001/);
  await call(`/api/invoices/${invoice.id}`, { method: "DELETE" });
  assert.equal((await call("/api/income")).pagination.total, 1);
  await call(`/api/clients/${createdClient.id}`, { method: "DELETE" });
  await call(`/api/expenses/${expense.id}`, { method: "DELETE" });
  await call(`/api/income/${manualIncome.id}`, { method: "DELETE" });
  await call(`/api/estimated-payments/${payment.id}`, { method: "DELETE" });
  const audit = await client.query('SELECT count(*)::int AS count FROM "AuditLog" WHERE "userId"=$1 AND action=$2', [a.id, "DELETE"]);
  assert.equal(audit.rows[0].count, 6);
  console.log("PASS: signup, scoped CRUD, invoice numbering/status/payment sync, deductions, estimate, dashboard, settings, print, origin/input validation, tenant isolation, and transactional delete audit.");
} finally {
  for (const account of accounts) {
    // Explicitly remove fixture dependents before their restricted client/invoice relationships.
    await client.query('DELETE FROM "Income" WHERE "userId"=$1', [account.id]);
    await client.query('DELETE FROM "Invoice" WHERE "userId"=$1', [account.id]);
    await client.query('DELETE FROM "User" WHERE id=$1', [account.id]);
  }
  await client.end();
}

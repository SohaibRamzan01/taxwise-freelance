// Production HTTP smoke; disposable accounts, local hosts only.
import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import pg from "pg";
const origin = process.env.SMOKE_APP_URL || "http://localhost:3000";
const databaseUrl = process.env.DATABASE_URL;
for (const url of [origin, databaseUrl]) if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname)) throw new Error("Smoke test requires local app and database hosts.");
const db = new pg.Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 }); await db.connect();
const accounts = [];
async function call(path, { method = "GET", body, cookie = accounts[0]?.cookie, expected = 200, requestOrigin = origin } = {}) {
  const response = await fetch(`${origin}${path}`, { method, headers: { origin: requestOrigin, ...(cookie ? { cookie } : {}), ...(body && !(body instanceof FormData) ? { "content-type": "application/json" } : {}) }, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined, redirect: "manual" });
  assert.equal(response.status, expected, `${method} ${path}: status ${response.status}`);
  if (response.headers.get("content-type")?.includes("json")) return { response, ...await response.json() };
  return { response, bytes: Buffer.from(await response.arrayBuffer()) };
}
function upload(image) { const form = new FormData(); form.set("image", new File([image], "receipt.png", { type: "image/png" })); return form; }
try {
  const token = randomBytes(8).toString("hex");
  for (const n of [1, 2]) {
    const result = await call("/api/auth/signup", { method: "POST", cookie: "", expected: 201, body: { name: "Receipt smoke", email: `receipt-smoke-${token}-${n}@example.test`, password: randomBytes(24).toString("base64url") } });
    accounts.push({ id: result.user.id, cookie: result.response.headers.get("set-cookie").split(";")[0] });
  }
  const foreign = accounts[1].cookie;
  await call("/api/receipts/scan", { method: "POST", body: upload(Buffer.from("bad")), expected: 415 });
  await call("/api/receipts/scan", { method: "POST", body: upload(Buffer.from("bad")), requestOrigin: "https://foreign.example", expected: 403 });
  const image = await readFile("public/samples/hardware.png");
  const scan = (await call("/api/receipts/scan", { method: "POST", body: upload(image), expected: 201 })).data;
  assert.equal(scan.vendor, "DELL"); assert.equal(scan.date, "2026-06-16"); assert.equal(scan.totalCents, 31104); assert.equal(scan.suggestion.category, "COMPUTER_HARDWARE");
  const receipt = await call(`/api/receipts/${scan.receiptId}`); assert.deepEqual(receipt.bytes, image); assert.equal(receipt.response.headers.get("cache-control"), "no-store");
  await call(`/api/receipts/${scan.receiptId}`, { cookie: foreign, expected: 404 });
  await call(`/api/receipts/${scan.receiptId}`, { cookie: "", expected: 401 });
  const expenseBody = { vendor: scan.vendor, date: scan.date, amountCents: scan.totalCents, category: scan.suggestion.category, businessUsePercent: 80, receiptId: scan.receiptId };
  await call("/api/expenses", { method: "POST", cookie: foreign, body: expenseBody, expected: 404 });
  const expense = (await call("/api/expenses", { method: "POST", body: expenseBody, expected: 201 })).data;
  assert.equal((await call("/api/expenses")).data[0].receipt.id, scan.receiptId);
  await call("/api/expenses", { method: "POST", body: expenseBody, expected: 404 });
  await call(`/api/receipts/${scan.receiptId}`, { method: "DELETE", expected: 404 });
  for (const [sample, category, cents] of [["internet", "INTERNET_PHONE", 8000], ["meals", "MEALS", 6200]]) {
    const scanned = (await call("/api/receipts/scan", { method: "POST", body: upload(await readFile(`public/samples/${sample}.png`)), expected: 201 })).data;
    assert.equal(scanned.totalCents, cents); assert.equal(scanned.suggestion.category, category);
    await call(`/api/receipts/${scanned.receiptId}`, { cookie: foreign, method: "DELETE", expected: 404 });
    await call(`/api/receipts/${scanned.receiptId}`, { method: "DELETE" });
    await call(`/api/receipts/${scanned.receiptId}`, { expected: 404 });
  }
  const client = (await call("/api/clients", { method: "POST", expected: 201, body: { name: "Cedar Client", company: "Cedar & Co." } })).data;
  const invoice = (await call("/api/invoices", { method: "POST", expected: 201, body: { clientId: client.id, issueDate: "2026-06-01", dueDate: "2026-06-15", items: [{ description: "Design services", quantity: 2.5, unitPriceCents: 10000 }], discountCents: 1000, taxRateBasisPoints: 725 } })).data;
  await call(`/api/invoices/${invoice.id}`, { method: "PATCH", body: { status: "SENT" } });
  await call(`/api/invoices/${invoice.id}`, { method: "PATCH", body: { status: "PAID", paidAt: "2026-06-12" } });
  await call("/api/estimated-payments", { method: "POST", expected: 201, body: { taxYear: 2026, quarter: 2, date: "2026-06-15", amountCents: 1000 } });
  await call(`/api/invoices/${invoice.id}/pdf`, { cookie: foreign, expected: 404 });
  const pdfs = [["invoice", `/api/invoices/${invoice.id}/pdf`], ["tax-summary", "/api/reports/tax-summary?year=2026&quarter="], ["tax-summary-q2", "/api/reports/tax-summary?year=2026&quarter=2"]];
  await mkdir("orchestration/logs/task-004", { recursive: true });
  for (const [name, url] of pdfs) {
    const { response, bytes } = await call(url); assert.equal(response.headers.get("content-type"), "application/pdf"); assert.equal(bytes.subarray(0, 4).toString(), "%PDF"); assert(bytes.length > 1024);
    await writeFile(`orchestration/logs/task-004/${name}.pdf`, bytes); console.log(`${name}: valid PDF header, ${bytes.length} bytes`);
  }
  const summary = (await call("/api/reports/tax-summary?year=2026&quarter=2&format=json")).data;
  assert.equal(summary.incomeCents, 25740); assert.equal(summary.expenseCents, 31104); assert.equal(summary.deductionsCents, 24883); assert.equal(summary.paymentsCents, 1000);
  const csv = await call("/api/reports/tax-summary?year=2026&quarter=2&format=csv"); assert.match(csv.bytes.toString(), /"311.04","248.83"/);
  const foreignSummary = (await call("/api/reports/tax-summary?format=json", { cookie: foreign })).data; assert.equal(foreignSummary.incomeCents, 0); assert.equal(foreignSummary.expenseCents, 0);
  for (const q of ["year=2025", "quarter=5", "userId=foreign"]) await call(`/api/reports/tax-summary?${q}`, { expected: 400 });
  await call("/api/reports/tax-summary", { cookie: "", expected: 401 });
  const reportsPage = await call("/reports"); assert.match(reportsPage.bytes.toString(), /Reports/);
  const expensesPage = await call("/expenses"); assert.match(expensesPage.bytes.toString(), /Scan receipt/);
  const print = await call(`/invoices/${invoice.id}/print`); assert.match(print.bytes.toString(), /Download PDF/);
  await call(`/api/expenses/${expense.id}`, { method: "DELETE" }); await call(`/api/receipts/${scan.receiptId}`, { expected: 404 });
  const receipts = await db.query('SELECT count(*)::int AS n FROM "Receipt" WHERE "userId"=$1', [accounts[0].id]); assert.equal(receipts.rows[0].n, 0);
  console.log("PASS: three real OCR samples, private receipts, reviewed expense attachment, cascade cleanup, invoice/annual/quarter PDFs, matching JSON/CSV, period validation, tenant isolation, and workspace pages.");
} finally {
  for (const account of accounts) {
    await db.query('DELETE FROM "Income" WHERE "userId"=$1', [account.id]);
    await db.query('DELETE FROM "Invoice" WHERE "userId"=$1', [account.id]);
    await db.query('DELETE FROM "User" WHERE id=$1', [account.id]);
  }
  await db.end();
}

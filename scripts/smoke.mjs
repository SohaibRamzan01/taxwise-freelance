// HTTP only: safe to run against an owned local or deployed TaxWise instance.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";

const target = new URL(process.argv[2] || process.env.SMOKE_APP_URL || "http://localhost:3000");
if (!["http:", "https:"].includes(target.protocol) || target.username || target.password || target.pathname !== "/" || target.search || target.hash) throw new Error("Supply an http(s) base origin without credentials, a path, query or fragment.");
const origin = target.origin;
const email = `smoke-${randomBytes(10).toString("hex")}@example.test`;
const password = randomBytes(24).toString("base64url");
let cookie = "", failed = false, signedUp = false;
const cleanup = [];
async function call(path, { method = "GET", body, expected = 200 } = {}) {
  const response = await fetch(`${origin}${path}`, {
    method, headers: { origin, ...(cookie ? { cookie } : {}), ...(body && !(body instanceof FormData) ? { "content-type": "application/json" } : {}) },
    body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual", signal: AbortSignal.timeout(65000),
  });
  assert.equal(response.status, expected, `${method} ${path}: expected ${expected}, received ${response.status}`);
  return response;
}
async function json(path, options) { return (await call(path, options)).json(); }
async function step(name, work) {
  try { const result = await work(); console.log(`PASS ${name}`); return result; }
  catch (error) { console.error(`FAIL ${name}: ${error.message}`); failed = true; throw error; }
}
const today = new Date().toISOString().slice(0, 10);
const issueDate = today < "2026-06-01" ? today : "2026-06-01";
try {
  await step("health", async () => { const health = await json("/api/health"); assert.equal(health.app, "ok"); assert.equal(health.database, "ok"); });
  await step("signup", async () => {
    const response = await call("/api/auth/signup", { method: "POST", expected: 201, body: { name: "Disposable smoke user", email, password } });
    cookie = response.headers.get("set-cookie")?.split(";")[0] || "";
    assert(cookie.startsWith("taxwise_session="), "signup did not set a session cookie"); signedUp = true;
    assert.equal((await response.json()).user.role, "USER");
  });
  const client = await step("create client", async () => {
    const { data } = await json("/api/clients", { method: "POST", expected: 201, body: { name: "Smoke client" } });
    cleanup.push(`/api/clients/${data.id}`); return data;
  });
  const invoice = await step("create invoice", async () => {
    const { data } = await json("/api/invoices", { method: "POST", expected: 201, body: { clientId: client.id, issueDate, dueDate: issueDate, items: [{ description: "Smoke services", quantity: 2, unitPriceCents: 10000 }] } });
    cleanup.push(`/api/invoices/${data.id}`); assert.equal(data.totalCents, 20000); return data;
  });
  await step("mark invoice paid and verify linked income", async () => {
    await json(`/api/invoices/${invoice.id}`, { method: "PATCH", body: { status: "SENT" } });
    await json(`/api/invoices/${invoice.id}`, { method: "PATCH", body: { status: "PAID", paidAt: issueDate } });
    const { data } = await json("/api/income"); assert.equal(data.filter(i => i.invoiceId === invoice.id).length, 1); assert.equal(data[0].amountCents, 20000);
  });
  const scan = await step("scan bundled sample receipt with real OCR", async () => {
    const form = new FormData(); form.set("image", new Blob([await readFile(new URL("../public/samples/hardware.png", import.meta.url))], { type: "image/png" }), "hardware.png");
    const { data } = await json("/api/receipts/scan", { method: "POST", body: form, expected: 201 });
    cleanup.push(`/api/receipts/${data.receiptId}`); assert.equal(data.vendor, "DELL"); assert.equal(data.totalCents, 31104); return data;
  });
  await step("save reviewed expense and fetch private receipt", async () => {
    const { data } = await json("/api/expenses", { method: "POST", expected: 201, body: { vendor: scan.vendor, date: scan.date, amountCents: scan.totalCents, category: scan.suggestion.category, businessUsePercent: 80, receiptId: scan.receiptId } });
    // Expense deletion cascades to the attached image.
    cleanup.splice(cleanup.indexOf(`/api/receipts/${scan.receiptId}`), 1); cleanup.push(`/api/expenses/${data.id}`);
    const response = await call(`/api/receipts/${scan.receiptId}`); assert.equal(response.headers.get("content-type"), "image/png"); assert.equal(response.headers.get("cache-control"), "no-store");
  });
  await step("tax estimate", async () => {
    const { data } = await json("/api/tax/estimate?year=2026&annualise=false");
    assert.equal(data.estimate.ytdIncomeCents, 20000); assert(Number.isSafeInteger(data.estimate.totalTaxCents));
  });
  await step("tax summary PDF", async () => {
    const response = await call("/api/reports/tax-summary?year=2026"); assert.equal(response.headers.get("content-type"), "application/pdf");
    const bytes = Buffer.from(await response.arrayBuffer()); assert.equal(bytes.subarray(0, 4).toString(), "%PDF"); assert(bytes.length > 1024);
  });
  await step("notifications and non-admin access control", async () => {
    const result = await json("/api/notifications"); assert(Array.isArray(result.data));
    for (const path of ["overview", "users", "audit"]) await call(`/api/admin/${path}`, { expected: 403 });
  });
} catch { failed = true; }
finally {
  // Delete only IDs created during this invocation, in reverse dependency order.
  for (const path of cleanup.reverse()) {
    try { await step(`cleanup ${path.split("/")[2]}`, () => call(path, { method: "DELETE" })); }
    catch { /* Keep trying remaining cleanup even after a failure. */ }
  }
  if (signedUp) {
    try { await step("logout", async () => { await call("/api/auth/logout", { method: "POST" }); cookie = ""; await call("/api/auth/me", { expected: 401 }); }); }
    catch { failed = true; }
    console.log(`INFO Disposable account ${email} and its audit records remain: no account-delete API exists. Domain fixtures were cleaned via the API where possible.`);
  }
}
process.exitCode = failed ? 1 : 0;

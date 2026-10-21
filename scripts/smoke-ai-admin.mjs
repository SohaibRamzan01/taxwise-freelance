// Local production HTTP/DB integration checks. Creates and removes only this run's fixtures.
import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import pg from "pg";

const origin = process.env.SMOKE_APP_URL || "http://localhost:3000";
const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5433/taxwise";
for (const url of [origin, databaseUrl]) if (!["localhost", "127.0.0.1"].includes(new URL(url).hostname)) throw new Error("Smoke tests require a local app and database.");
const database = new pg.Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 });
await database.connect();
const accounts = [];
async function call(path, { method = "GET", body, account = accounts[0], expected = 200, requestOrigin = origin, csv = false } = {}) {
  const response = await fetch(`${origin}${path}`, { method, headers: { origin: requestOrigin, ...(account ? { cookie: account.cookie } : {}), ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined, redirect: "manual" });
  const text = await response.text();
  assert.equal(response.status, expected, `${method} ${path}: ${text.slice(0, 1000)}`);
  assert.equal(response.headers.get("cache-control"), "no-store");
  return csv ? text : { ...JSON.parse(text), response };
}
try {
  const tag = randomBytes(8).toString("hex");
  for (const n of [1, 2, 3]) {
    const password = randomBytes(24).toString("base64url");
    const created = await call("/api/auth/signup", { method: "POST", expected: 201, account: null, body: { name: "AI admin smoke", email: `smoke-005-${tag}-${n}@example.test`, password } });
    accounts.push({ id: created.user.id, email: created.user.email, password, cookie: created.response.headers.get("set-cookie").split(";")[0] });
  }
  const [owner, foreign, admin] = accounts;
  // Only this disposable fixture is bootstrapped as admin. Its JWT remains USER.
  await database.query('UPDATE "User" SET role=$1 WHERE id=$2', ["ADMIN", admin.id]);
  for (const endpoint of ["overview", "users", "audit"]) {
    await call(`/api/admin/${endpoint}`, { expected: 403 });
    await call(`/api/admin/${endpoint}`, { expected: 401, account: null });
  }
  await call(`/api/admin/users/${foreign.id}`, { method: "PATCH", body: { role: "ADMIN" }, expected: 403 });
  const suggestion = (await call("/api/expenses/categorize", { method: "POST", body: { vendor: "Adobe", description: "Design tools", amount: 2999 } })).data;
  assert.equal(suggestion.category, "SOFTWARE_AND_SUBSCRIPTIONS"); assert.ok(["ai", "rules"].includes(suggestion.source));
  const preview = (await call("/api/expenses/import/preview", { method: "POST", body: { csv: 'date,vendor,amount,notes\n2026-06-01,Adobe,29.99,"Tools, design"\n2026-06-02,Delta,100.50,Flight' } })).data;
  assert.ok(preview.every(row => row.errors.length === 0)); assert.equal(preview[1].data.category, "TRAVEL");
  await call("/api/expenses/import", { method: "POST", expected: 201, body: { rows: preview.map(row => row.data) } });
  const expenseBody = { date: "2026-06-03", vendor: "Foreign vendor", amountCents: 1000, category: "OTHER" };
  const other = (await call("/api/expenses", { method: "POST", account: foreign, expected: 201, body: expenseBody })).data;
  const owned = (await call("/api/expenses")).data;
  assert.equal(owned.length, 2);
  // Bulk deletion must cascade to the owner's attached receipts too.
  const receiptId = `smoke-005-${tag}`;
  await database.query('INSERT INTO "Receipt" (id, "userId", "expenseId", image, "mimeType", size) VALUES ($1,$2,$3,$4,$5,$6)', [receiptId, owner.id, owned[0].id, Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), "image/png", 8]);
  await call("/api/expenses/bulk", { method: "POST", expected: 404, body: { action: "delete", ids: [owned[0].id, other.id] } });
  assert.equal((await call("/api/expenses")).data.length, 2);
  await call("/api/expenses/bulk", { method: "POST", body: { action: "categorize", ids: owned.map(row => row.id), category: "MEALS" } });
  assert.ok((await call("/api/expenses")).data.every(row => row.category === "MEALS"));
  const exported = await call("/api/expenses/export?search=Adobe&category=MEALS&from=2026-06-01&to=2026-06-01&page=99&pageSize=1", { csv: true });
  assert.match(exported, /Adobe/); assert.doesNotMatch(exported, /Delta|Foreign vendor/);
  await call("/api/income", { method: "POST", expected: 201, body: { date: "2026-06-01", source: "=UNTRUSTED()", amountCents: 1234 } });
  assert.match(await call("/api/income/export", { csv: true }), /'=UNTRUSTED\(\)/);
  const client = (await call("/api/clients", { method: "POST", expected: 201, body: { name: "Adobe client" } })).data;
  const invoice = (await call("/api/invoices", { method: "POST", expected: 201, body: { clientId: client.id, issueDate: "2026-06-01", dueDate: "2026-06-30", items: [{ description: "Work", quantity: 1, unitPriceCents: 10000 }] } })).data;
  const results = (await call("/api/search?q=Adobe")).data;
  assert.equal(results.expenses.length, 1); assert.equal(results.clients.length, 1); assert.equal(results.invoices[0].id, invoice.id);
  assert.deepEqual((await call("/api/search?q=Adobe", { account: foreign })).data, { expenses: [], clients: [], invoices: [] });
  await call("/api/expenses/import", { method: "POST", expected: 400, body: { rows: [{ ...expenseBody, userId: foreign.id }] } });
  await call("/api/expenses/bulk", { method: "POST", expected: 403, requestOrigin: "https://foreign.example", body: { action: "delete", ids: owned.map(row => row.id) } });
  // A week with only login activity must still appear in telemetry.
  const previousMonday = new Date(); previousMonday.setUTCHours(0, 0, 0, 0); previousMonday.setUTCDate(previousMonday.getUTCDate() - (previousMonday.getUTCDay() + 6) % 7 - 7);
  await database.query('INSERT INTO "AuditLog" (id, "userId", action, "createdAt") VALUES ($1,$2,$3,$4)', [`smoke-activity-${tag}`, owner.id, "LOGIN", previousMonday]);
  const stats = (await call("/api/admin/overview", { account: admin })).data;
  assert.equal(stats.weekly.length, 12); assert.ok(stats.activeUsers >= 3); assert.ok(stats.weekly.some(row => row.signups >= 3 && row.activeUsers >= 3)); assert.ok(stats.weekly.some(row => row.invoices >= 1 && row.expenses >= 3));
  assert.ok(stats.weekly.find(row => row.week === previousMonday.toISOString().slice(0, 10)).activeUsers >= 1);
  const users = await call(`/api/admin/users?search=${encodeURIComponent(foreign.email)}`, { account: admin });
  assert.equal(users.data.length, 1); assert.equal(users.data[0].id, foreign.id); assert.equal("passwordHash" in users.data[0], false);
  for (const body of [{ role: "USER" }, { isActive: false }]) await call(`/api/admin/users/${admin.id}`, { account: admin, method: "PATCH", expected: 409, body });
  await call(`/api/admin/users/${foreign.id}`, { account: admin, method: "PATCH", body: { role: "ADMIN" } });
  // Current DB role takes effect despite the original USER token.
  await call("/api/admin/users", { account: foreign });
  let page = await fetch(`${origin}/admin`, { headers: { cookie: foreign.cookie }, redirect: "manual" }); assert.equal(page.status, 200); assert.match(await page.text(), /Platform administration/);
  const signedInAdmin = await call("/api/auth/login", { account: null, method: "POST", body: { email: foreign.email, password: foreign.password } });
  foreign.cookie = signedInAdmin.response.headers.get("set-cookie").split(";")[0];
  await call(`/api/admin/users/${foreign.id}`, { account: admin, method: "PATCH", body: { role: "USER" } });
  // The newly issued ADMIN JWT must not preserve admin access after demotion.
  await call("/api/admin/users", { account: foreign, expected: 403 });
  await call(`/api/admin/users/${foreign.id}`, { account: admin, method: "PATCH", body: { isActive: false } });
  await call("/api/expenses", { account: foreign, expected: 401 });
  await call(`/api/admin/users/${foreign.id}`, { account: admin, method: "PATCH", body: { isActive: true } });
  await call("/api/expenses", { account: foreign });
  const audit = await call(`/api/admin/audit?action=USER_UPDATE&userId=${admin.id}&entityType=users`, { account: admin });
  assert.ok(audit.data.length >= 4); assert.ok(audit.data.every(row => row.entityId === foreign.id && row.userId === admin.id));
  await call("/api/expenses/bulk", { method: "POST", body: { action: "delete", ids: owned.map(row => row.id) } });
  assert.equal((await call("/api/expenses")).data.length, 0); assert.equal((await call("/api/expenses", { account: foreign })).data.length, 1);
  assert.equal((await database.query('SELECT id FROM "Receipt" WHERE id=$1', [receiptId])).rows.length, 0);
  const logs = await database.query('SELECT action FROM "AuditLog" WHERE "userId"=$1', [owner.id]);
  for (const action of ["IMPORT", "BULK_CATEGORIZE", "BULK_DELETE"]) assert.ok(logs.rows.some(row => row.action === action));
  for (const path of ["/expenses?search=Adobe", "/income", "/clients?search=Adobe", "/invoices", "/admin"]) {
    page = await fetch(`${origin}${path}`, { headers: { cookie: (path === "/admin" ? admin : owner).cookie } }); assert.equal(page.status, 200);
  }
  assert.equal((await fetch(`${origin}/nonexistent-smoke-005`)).status, 404);
  console.log(`PASS: categorization (${suggestion.source}), CSV preview/import/export, batch isolation/audits and receipt cascade, global search, admin telemetry including login-only weeks, role/status changes with stale USER/ADMIN tokens, self protection, origin/input validation, workspace HTML and 404.`);
} finally {
  for (const account of accounts) {
    await database.query('DELETE FROM "Income" WHERE "userId"=$1', [account.id]);
    await database.query('DELETE FROM "Invoice" WHERE "userId"=$1', [account.id]);
    await database.query('DELETE FROM "User" WHERE id=$1', [account.id]);
  }
  await database.end();
}

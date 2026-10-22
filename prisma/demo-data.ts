import type { ExpenseCategory, InvoiceStatus } from "@prisma/client";

type DemoInvoice = { number: string; clientIndex: number; issueDate: Date; dueDate: Date; paidAt: Date | null; totalCents: number; description: string; status: InvoiceStatus };
export const demoClients = [
  { name: "Jordan Lee", company: "Cedar & Co.", email: "jordan@cedar.example", address: "Seattle, WA" },
  { name: "Sam Rivera", company: "Northline Studio", email: "sam@northline.example", address: "Austin, TX" },
  { name: "Taylor Brooks", company: "Harbor Health", email: "taylor@harbor.example", address: "Portland, OR" },
  { name: "Casey Chen", company: "Summit Outdoors", email: "casey@summit.example", address: "Denver, CO" },
];
export const demoInvoices: DemoInvoice[] = [
  ["2026-01-05", "2026-01-19", "2026-01-16", 620000, "Brand strategy and identity"],
  ["2026-02-02", "2026-02-16", "2026-02-13", 740000, "Website discovery and design"],
  ["2026-03-02", "2026-03-16", "2026-03-13", 580000, "Patient portal UX research"],
  ["2026-03-16", "2026-03-30", "2026-03-27", 490000, "Spring campaign creative"],
  ["2026-04-06", "2026-04-20", "2026-04-17", 810000, "E-commerce storefront design"],
  ["2026-05-04", "2026-05-18", "2026-05-15", 670000, "Website implementation milestone"],
  ["2026-06-01", "2026-06-15", "2026-06-12", 720000, "Portal design system"],
  ["2026-06-15", "2026-06-29", "2026-06-26", 350000, "Summer campaign assets"],
  ["2026-07-06", "2026-07-20", "2026-07-17", 860000, "Brand rollout and packaging"],
  ["2026-08-03", "2026-08-17", "2026-08-14", 640000, "Customer onboarding experience"],
  ["2026-09-07", "2026-09-21", "2026-09-18", 690000, "Accessibility and UI improvements"],
  ["2026-10-05", "2026-10-19", "2026-10-16", 780000, "Autumn storefront launch"],
].map(([issueDate, dueDate, paidAt, amountCents, description], i) => ({
  number: `INV-${String(i + 1).padStart(4, "0")}`, clientIndex: i % 4,
  issueDate: new Date(issueDate), dueDate: new Date(dueDate), paidAt: new Date(paidAt),
  totalCents: Number(amountCents), description: String(description), status: "PAID",
}));
for (const [i, status, issue, due, amount, description] of [
  [12, "SENT", "2026-09-21", "2026-10-05", 420000, "Fall campaign design"],
  [13, "SENT", "2026-10-19", "2026-11-02", 560000, "Website maintenance milestone"],
  [14, "DRAFT", "2026-10-20", "2026-11-10", 320000, "Winter project proposal"],
  [15, "VOID", "2026-08-10", "2026-08-24", 250000, "Cancelled photography scope"],
] as const) demoInvoices.push({ number: `INV-${String(i + 1).padStart(4, "0")}`, clientIndex: i % 4,
  issueDate: new Date(issue), dueDate: new Date(due), paidAt: null, totalCents: amount, description, status });

type DemoExpense = { date: Date; vendor: string; amountCents: number; category: ExpenseCategory; businessUsePercent: number; notes?: string; sample?: string };
export const demoExpenses: DemoExpense[] = [];
const rotatingCosts: [string, ExpenseCategory, number, number][] = [
  ["Google Ads", "ADVERTISING", 18500, 100], ["WeWork", "RENT_AND_LEASE", 42000, 100],
  ["Hiscox", "INSURANCE", 9600, 100], ["Design subcontractor", "CONTRACT_LABOR", 95000, 100],
  ["Bookkeeping consultation", "LEGAL_AND_PROFESSIONAL", 27500, 100], ["Staples", "SUPPLIES", 8400, 100],
  ["Portland General Electric", "UTILITIES", 13800, 35], ["Office chair", "OFFICE_EXPENSE", 32900, 90],
  ["Design conference", "EDUCATION", 45000, 100], ["Business mileage parking", "CAR_AND_TRUCK", 4600, 80],
];
for (let month = 1; month <= 10; month++) {
  const day = (d: number) => new Date(`2026-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  const [vendor, category, amountCents, businessUsePercent] = rotatingCosts[month - 1];
  demoExpenses.push(
    { date: day(2), vendor: "Adobe Creative Cloud", amountCents: 5999, category: "SOFTWARE_AND_SUBSCRIPTIONS", businessUsePercent: 100 },
    { date: day(15), vendor: "PTCL", amountCents: 8000, category: "INTERNET_PHONE", businessUsePercent: 75, ...(month === 6 ? { sample: "internet.png" } : {}) },
    { date: day(10), vendor: "Cedar Cafe", amountCents: month === 6 ? 6200 : 4800 + month * 350, category: "MEALS", businessUsePercent: month % 2 ? 80 : 100, notes: "Client project planning lunch", ...(month === 6 ? { sample: "meals.png" } : {}) },
    { date: day(8), vendor, category, amountCents, businessUsePercent },
  );
}
demoExpenses.push(
  { date: new Date("2026-01-12"), vendor: "Apple", amountCents: 219900, category: "COMPUTER_HARDWARE", businessUsePercent: 90, notes: "Studio laptop" },
  { date: new Date("2026-06-16"), vendor: "Dell", amountCents: 31104, category: "COMPUTER_HARDWARE", businessUsePercent: 100, sample: "hardware.png", notes: "Monitor and keyboard, including sales tax" },
  { date: new Date("2026-03-18"), vendor: "Alaska Airlines", amountCents: 42860, category: "TRAVEL", businessUsePercent: 100, notes: "Client workshop in Seattle" },
  { date: new Date("2026-07-14"), vendor: "Hyatt Denver", amountCents: 68000, category: "TRAVEL", businessUsePercent: 80, notes: "Summit Outdoors launch workshop" },
  { date: new Date("2026-04-12"), vendor: "Home studio allocation", amountCents: 45000, category: "HOME_OFFICE", businessUsePercent: 100, notes: "Quarterly workspace cost allocation" },
  { date: new Date("2026-09-12"), vendor: "Home studio allocation", amountCents: 45000, category: "HOME_OFFICE", businessUsePercent: 100 },
  { date: new Date("2026-05-19"), vendor: "Local business association", amountCents: 18000, category: "OTHER", businessUsePercent: 100 },
  { date: new Date("2026-10-12"), vendor: "Figma", amountCents: 15000, category: "SOFTWARE_AND_SUBSCRIPTIONS", businessUsePercent: 100 },
);
export const demoManualIncome = [
  { date: new Date("2026-02-20"), source: "Design mentoring workshop", amountCents: 95000 },
  { date: new Date("2026-06-20"), source: "Independent design consultation", amountCents: 125000 },
  { date: new Date("2026-09-25"), source: "Template licensing royalties", amountCents: 78000 },
];
export const demoPayments = [
  { quarter: 1, date: new Date("2026-04-14"), amountCents: 400000, confirmation: "DEMO-Q1-2026" },
  { quarter: 2, date: new Date("2026-06-15"), amountCents: 400000, confirmation: "DEMO-Q2-2026" },
  { quarter: 3, date: new Date("2026-09-15"), amountCents: 385000, confirmation: "DEMO-Q3-2026", notes: "Partial installment; $150 below the safe-harbour quarter target" },
];

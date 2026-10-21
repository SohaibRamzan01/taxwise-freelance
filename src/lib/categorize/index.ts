import type { ExpenseCategory } from "@/lib/tax/categories";
export interface CategorySuggestion { category: ExpenseCategory; confidence: number; matchedKeyword: string | null }
const rules: { category: ExpenseCategory; keywords: string[] }[] = [
  { category: "COMPUTER_HARDWARE", keywords: ["dell", "apple", "lenovo", "monitor", "laptop", "keyboard", "computer", "printer"] },
  { category: "INTERNET_PHONE", keywords: ["ptcl", "verizon", "comcast", "jazz", "internet", "broadband", "mobile", "phone", "at&t"] },
  { category: "TRAVEL", keywords: ["uber", "lyft", "delta", "united airlines", "careem", "airline", "airlines", "hotel", "airbnb", "flight", "booking.com"] },
  { category: "SOFTWARE_AND_SUBSCRIPTIONS", keywords: ["adobe", "github", "aws", "amazon web services", "zoom", "figma", "microsoft", "google workspace", "slack", "notion", "dropbox", "software", "subscription", "hosting"] },
  { category: "MEALS", keywords: ["restaurant", "cafe", "café", "coffee", "starbucks", "lunch", "dinner"] },
  { category: "ADVERTISING", keywords: ["google ads", "facebook ads", "advertising", "marketing"] },
  { category: "CAR_AND_TRUCK", keywords: ["gasoline", "fuel", "parking", "toll"] },
  { category: "INSURANCE", keywords: ["insurance", "premium"] },
  { category: "LEGAL_AND_PROFESSIONAL", keywords: ["upwork fees", "upwork fee", "fiverr fees", "platform fee", "attorney", "lawyer", "accountant", "legal"] },
  { category: "OFFICE_EXPENSE", keywords: ["staples", "office depot", "stationery"] },
  { category: "SUPPLIES", keywords: ["supplies", "paper", "ink", "toner"] },
  { category: "EDUCATION", keywords: ["udemy", "coursera", "training", "course", "textbook"] },
  { category: "UTILITIES", keywords: ["electricity", "water bill", "utility"] },
  { category: "RENT_AND_LEASE", keywords: ["wework", "regus", "coworking", "lease", "office rent"] },
  { category: "CONTRACT_LABOR", keywords: ["upwork", "fiverr", "contractor"] },
  { category: "HOME_OFFICE", keywords: ["home office"] },
];
const normalize = (s: string) => s.toLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}&.]+/gu, " ").trim();
function match(source: string): CategorySuggestion | null {
  const normalized = ` ${normalize(source)} `;
  for (const rule of rules) for (const keyword of rule.keywords) {
    if (normalized.includes(` ${normalize(keyword)} `)) return { category: rule.category, confidence: 0.7, matchedKeyword: keyword };
  }
  return null;
}
/** Vendor matches take priority over incidental item keywords. Amount never determines category. */
export function suggestCategory({ vendor = "", text = "" }: { vendor?: string | null; text?: string | null; amount?: number | null }): CategorySuggestion {
  // Distinguish platform service fees from payments to contractors.
  if (/\b(upwork|fiverr)\b/i.test(vendor ?? "") && /\bfees?\b/i.test(`${vendor} ${text}`)) return { category: "LEGAL_AND_PROFESSIONAL", confidence: 0.95, matchedKeyword: "platform fee" };
  const vendorMatch = match(vendor ?? "");
  if (vendorMatch) return { ...vendorMatch, confidence: 0.95 };
  return match(text ?? "") ?? { category: "OTHER", confidence: 0, matchedKeyword: null };
}

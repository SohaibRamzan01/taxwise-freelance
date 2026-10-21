import type { ExpenseCategory } from "@/lib/tax/categories";
export interface CategorySuggestion { category: ExpenseCategory; confidence: number; matchedKeyword: string | null }
const rules: { category: ExpenseCategory; keywords: string[] }[] = [
  { category: "COMPUTER_HARDWARE", keywords: ["dell", "apple", "lenovo", "monitor", "laptop", "keyboard", "computer", "printer"] },
  { category: "INTERNET_PHONE", keywords: ["ptcl", "verizon", "comcast", "jazz", "internet", "broadband", "mobile", "phone", "at&t"] },
  { category: "TRAVEL", keywords: ["uber", "careem", "airline", "airlines", "hotel", "airbnb", "flight", "booking.com"] },
  { category: "SOFTWARE_AND_SUBSCRIPTIONS", keywords: ["adobe", "github", "aws", "zoom", "figma", "microsoft", "software", "subscription", "hosting"] },
  { category: "MEALS", keywords: ["restaurant", "cafe", "café", "coffee", "starbucks", "lunch", "dinner"] },
  { category: "ADVERTISING", keywords: ["google ads", "facebook ads", "advertising", "marketing"] },
  { category: "CAR_AND_TRUCK", keywords: ["gasoline", "fuel", "parking", "toll"] },
  { category: "INSURANCE", keywords: ["insurance", "premium"] },
  { category: "LEGAL_AND_PROFESSIONAL", keywords: ["attorney", "lawyer", "accountant", "legal"] },
  { category: "OFFICE_EXPENSE", keywords: ["staples", "office depot", "stationery"] },
  { category: "SUPPLIES", keywords: ["supplies", "paper", "ink", "toner"] },
  { category: "EDUCATION", keywords: ["udemy", "coursera", "training", "course", "textbook"] },
  { category: "UTILITIES", keywords: ["electricity", "water bill", "utility"] },
  { category: "RENT_AND_LEASE", keywords: ["coworking", "lease", "office rent"] },
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
  const vendorMatch = match(vendor ?? "");
  if (vendorMatch) return { ...vendorMatch, confidence: 0.95 };
  return match(text ?? "") ?? { category: "OTHER", confidence: 0, matchedKeyword: null };
}

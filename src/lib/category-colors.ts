import type { ExpenseCategory } from "./tax/categories";

// Stable by category, rather than by the order of the current chart/filter.
export const categoryColors = {
  COMPUTER_HARDWARE: "#9FD6FF",
  INTERNET_PHONE: "#B8E1FF",
  OFFICE_EXPENSE: "#CDEAFF",
  SOFTWARE_AND_SUBSCRIPTIONS: "#89C5F0",
  TRAVEL: "#FFC07A",
  CAR_AND_TRUCK: "#FFD09D",
  MEALS: "#FFE0BE",
  ADVERTISING: "#FF9FCB",
  CONTRACT_LABOR: "#FFB6D7",
  LEGAL_AND_PROFESSIONAL: "#FFD0E5",
  EDUCATION: "#F28BBA",
  INSURANCE: "#8FEAA8",
  RENT_AND_LEASE: "#A9EFBF",
  SUPPLIES: "#C6F5D4",
  UTILITIES: "#7BD497",
  HOME_OFFICE: "#B7EBC7",
  OTHER: "#D8EDFF",
} as const satisfies Record<ExpenseCategory, string>;

export function categoryColor(category: string): string {
  return Object.hasOwn(categoryColors, category) ? categoryColors[category as ExpenseCategory] : categoryColors.OTHER;
}

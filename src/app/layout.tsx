import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "TaxWise Freelance — Work freely. Plan confidently.", template: "%s | TaxWise Freelance" },
  description: "A clearer view of your freelance income, business expenses, invoices, and estimated taxes.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

import type { Metadata } from "next";
import "./globals.css";
import { Notifications } from "@/components/notifications";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { themeScript } from "@/lib/theme";

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-bricolage" });
const body = Geist({ subsets: ["latin"], variable: "--font-geist" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: { default: "TaxWise Freelance — Work freely. Plan confidently.", template: "%s | TaxWise Freelance" },
  description: "A clearer view of your freelance income, business expenses, invoices, and estimated taxes.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning className={`${display.variable} ${body.variable} ${mono.variable}`}><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body>{children}<Notifications /></body></html>;
}

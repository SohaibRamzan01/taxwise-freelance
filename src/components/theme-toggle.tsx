"use client";
import { Moon, Sun } from "lucide-react";
import { toggleTheme } from "@/lib/theme";

export function ThemeToggle() {
  return <button type="button" className="icon-button theme-toggle" onClick={toggleTheme} aria-label="Toggle light or dark theme" title="Toggle light or dark theme"><Sun className="theme-sun" size={18} aria-hidden="true" /><Moon className="theme-moon" size={18} aria-hidden="true" /></button>;
}

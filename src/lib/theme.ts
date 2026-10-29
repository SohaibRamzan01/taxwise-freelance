export type Theme = "light" | "dark";
export const THEME_KEY = "taxwise-theme";

// Runs before body paint. Storage can be unavailable in private contexts.
export const themeScript = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch{}})();`;

export function toggleTheme(): Theme {
  const root = document.documentElement;
  const dark = root.dataset.theme === "dark" || (!root.dataset.theme && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const next = dark ? "light" : "dark";
  root.dataset.theme = next;
  try { localStorage.setItem(THEME_KEY, next); } catch { /* The current tab can still change theme. */ }
  return next;
}

import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { THEME_KEY, themeScript, toggleTheme } from "./theme";

afterEach(() => vi.unstubAllGlobals());

describe("theme before paint", () => {
  it.each(["light", "dark"])("restores a saved %s choice before hydration", theme => {
    const root = { dataset: {} };
    runInNewContext(themeScript, { document: { documentElement: root }, localStorage: { getItem: (key: string) => key === THEME_KEY ? theme : null } });
    expect(root.dataset).toEqual({ theme });
  });
  it.each([null, "invalid"])("leaves system CSS in control for %s", saved => {
    const root = { dataset: {} };
    runInNewContext(themeScript, { document: { documentElement: root }, localStorage: { getItem: () => saved } });
    expect(root.dataset).toEqual({});
  });
  it("continues rendering when storage is blocked", () => {
    expect(() => runInNewContext(themeScript, { localStorage: { getItem: () => { throw new Error("blocked"); } } })).not.toThrow();
  });
});

describe("theme switching", () => {
  function setup(theme?: string, systemDark = false, blocked = false) {
    const root = { dataset: { theme } };
    const setItem = vi.fn((key: string, value: string) => { if (blocked) throw new Error(`blocked: ${key}=${value}`); });
    vi.stubGlobal("document", { documentElement: root });
    vi.stubGlobal("window", { matchMedia: () => ({ matches: systemDark }) });
    vi.stubGlobal("localStorage", { setItem });
    return { root, setItem };
  }
  it.each([true, false])("toggles the effective system theme (dark = %s)", systemDark => {
    const { root, setItem } = setup(undefined, systemDark);
    const expected = systemDark ? "light" : "dark";
    expect(toggleTheme()).toBe(expected);
    expect(root.dataset.theme).toBe(expected);
    expect(setItem).toHaveBeenCalledWith(THEME_KEY, expected);
  });
  it("prefers the explicit theme over the system and survives reload", () => {
    const { root, setItem } = setup("light", true);
    toggleTheme();
    const restored = { dataset: {} };
    runInNewContext(themeScript, { document: { documentElement: restored }, localStorage: { getItem: () => setItem.mock.calls[0][1] } });
    expect(restored.dataset).toEqual({ theme: "dark" });
    toggleTheme();
    expect(root.dataset.theme).toBe("light");
  });
  it("still switches this tab when storage writes fail", () => {
    const { root } = setup("dark", true, true);
    expect(toggleTheme()).toBe("light");
    expect(root.dataset.theme).toBe("light");
  });
});

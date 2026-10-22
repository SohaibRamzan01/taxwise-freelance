import { describe, expect, it } from "vitest";
import { normalizeDatabaseUrl } from "./db-connection";

describe("database connection TLS mode", () => {
  it("makes verification explicit while preserving credentials and Neon options", () => {
    const input = "postgresql://user:p%40ss@db.example.test:5432/taxwise?sslmode=require&channel_binding=require&options=endpoint%3Ddemo";
    const url = new URL(normalizeDatabaseUrl(input)!);
    expect(url.searchParams.get("sslmode")).toBe("verify-full");
    expect(url.username).toBe("user");
    expect(url.password).toBe("p%40ss");
    expect(url.host).toBe("db.example.test:5432");
    expect(url.pathname).toBe("/taxwise");
    expect(url.searchParams.get("channel_binding")).toBe("require");
    expect(url.searchParams.get("options")).toBe("endpoint=demo");
    expect(normalizeDatabaseUrl(url.toString())).toBe(url.toString());
  });

  it.each([undefined, "", "postgresql://localhost:5434/taxwise", "postgresql://db/taxwise?sslmode=verify-full", "postgresql://db/taxwise?sslmode=disable"])("preserves other configuration: %s", input => {
    expect(normalizeDatabaseUrl(input)).toBe(input);
  });
});

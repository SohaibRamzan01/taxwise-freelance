/** Preserve pg's current certificate/hostname verification without its ambiguous alias. */
export function normalizeDatabaseUrl(connectionString: string | undefined): string | undefined {
  if (!connectionString) return connectionString;
  const url = new URL(connectionString);
  if (url.searchParams.get("sslmode") !== "require") return connectionString;
  url.searchParams.set("sslmode", "verify-full");
  return url.toString();
}

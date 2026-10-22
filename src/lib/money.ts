export function dollarsToCents(value: string): number {
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(value)) throw new Error("Enter a positive amount with at most two decimal places.");
  const [whole, fraction = ""] = value.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents > 2147483647) throw new Error("Amount is too large.");
  return cents;
}
export const moneyText = (cents: number) => (cents / 100).toFixed(2);
export const formatMoney = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

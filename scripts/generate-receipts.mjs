// Deterministic, fictitious receipt fixtures. Run: node scripts/generate-receipts.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
await mkdir("public/samples", { recursive: true });
const receipts = {
  hardware: ["DELL", "RECEIPT", "Date: 2026-06-16", "Order: DEMO-001", "", "Monitor         $249.00", "Keyboard         $39.00", "SUBTOTAL        $288.00", "Tax              $23.04", "GRAND TOTAL     $311.04", "", "Paid by card", "SAMPLE - NOT A REAL PURCHASE"],
  internet: ["PTCL", "INTERNET RECEIPT", "Date: 06/15/2026", "Account: DEMO-002", "", "Broadband        $80.00", "Tax               $0.00", "AMOUNT DUE       $80.00", "", "Paid by bank transfer", "SAMPLE - NOT A REAL PURCHASE"],
  meals: ["CEDAR CAFE", "RECEIPT", "Date: June 10, 2026", "Table: 12", "", "Lunch            $42.00", "Coffee            $8.00", "SUBTOTAL         $50.00", "Tax               $4.00", "Tip               $8.00", "TOTAL            $62.00", "", "SAMPLE - NOT A REAL PURCHASE"],
};
for (const [name, lines] of Object.entries(receipts)) {
  const text = lines.map((line, i) => `<text x="45" y="${70 + i * 45}" font-size="${i === 0 ? 38 : 25}" font-weight="${i === 0 ? 700 : 400}">${line}</text>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="760"><rect width="100%" height="100%" fill="white"/><g font-family="monospace" fill="black">${text}</g></svg>`;
  await sharp(Buffer.from(svg)).png().toFile(`public/samples/${name}.png`);
}
console.log("Generated three fictitious receipt PNGs.");

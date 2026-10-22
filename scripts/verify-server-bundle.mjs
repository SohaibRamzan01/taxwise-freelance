import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const routes = [
  ["receipts/scan", ["/tesseract.js/src/worker-script/node/index.js", ".wasm", "/@tesseract.js-data/eng/4.0.0/eng.traineddata.gz"]],
  ["invoices/[id]/pdf", ["/pdfkit/js/data/Helvetica.afm", "/pdfkit/js/data/Helvetica-Bold.afm"]],
  ["reports/tax-summary", ["/pdfkit/js/data/Helvetica.afm", "/pdfkit/js/data/Helvetica-Bold.afm"]],
];
for (const [route, assets] of routes) {
  const trace = JSON.parse(await readFile(`.next/server/app/api/${route}/route.js.nft.json`, "utf8"));
  for (const asset of assets) assert(trace.files.some(file => file.replaceAll("\\", "/").includes(asset)), `${route}: missing traced ${asset}`);
  console.log(`PASS ${route}: traced ${assets.join(", ")}`);
}

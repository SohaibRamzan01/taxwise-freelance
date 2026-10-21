// Inspect saved smoke-test PDFs without a browser. Run after smoke-receipts-reports.mjs.
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { readFile, writeFile } from "node:fs/promises";
for (const name of ["invoice", "tax-summary", "tax-summary-q2"]) {
  const task = getDocument({ data: new Uint8Array(await readFile(`orchestration/logs/task-004/${name}.pdf`)), useSystemFonts: true });
  const doc = await task.promise;
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i), viewport = page.getViewport({ scale: 1.3 });
    const target = doc.canvasFactory.create(Math.ceil(viewport.width), Math.ceil(viewport.height));
    await page.render({ canvasContext: target.context, viewport }).promise;
    await writeFile(`orchestration/logs/task-004/${name}-${i}.png`, target.canvas.toBuffer("image/png"));
    doc.canvasFactory.destroy(target);
  }
  console.log(`${name}: rendered ${doc.numPages} page(s)`); await task.destroy();
}

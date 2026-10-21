// Builds weekly progress-report PDFs: reports/weekly/week-NN.md -> pdf/Week-NN-*.pdf
// Markdown + Mermaid are rendered in headless Chrome/Edge (marked + mermaid from jsDelivr), then printed to PDF.
// Usage: node reports/weekly/build.mjs [01 02 ...]   (no args = every week-NN.md)
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const meta = JSON.parse(readFileSync(join(here, "meta.json"), "utf8"));
const browsers = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
];
const browser = browsers.find(existsSync);
if (!browser) throw new Error("Chrome or Edge not found");

const wanted = process.argv.slice(2);
const files = readdirSync(here)
  .filter((f) => /^week-\d\d\.md$/.test(f))
  .filter((f) => !wanted.length || wanted.includes(f.slice(5, 7)));

mkdirSync(join(here, "build"), { recursive: true });
mkdirSync(join(here, "pdf"), { recursive: true });

for (const file of files) {
  const raw = readFileSync(join(here, file), "utf8");
  const fm = /^---\n([\s\S]*?)\n---\n/.exec(raw.replace(/\r\n/g, "\n"));
  const front = Object.fromEntries(
    (fm?.[1] ?? "").split("\n").filter(Boolean).map((l) => {
      const i = l.indexOf(":");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
  );
  let body = raw.replace(/\r\n/g, "\n").replace(/^---\n[\s\S]*?\n---\n/, "");
  // <!-- include: docs/x.md --> pulls a supporting document in, headings demoted one level
  body = body.replace(/<!--\s*include:\s*(\S+)\s*-->/g, (_, p) =>
    readFileSync(join(root, p), "utf8").replace(/\r\n/g, "\n").replace(/^(#{1,5}) /gm, "#$1 "),
  );
  const week = file.slice(5, 7);
  const html = template({ ...meta, ...front, week }, body);
  const htmlPath = join(here, "build", `week-${week}.html`);
  writeFileSync(htmlPath, html);
  const pdfName = `Week-${week}-${(front.slug ?? "Report")}.pdf`;
  const pdfPath = join(here, "pdf", pdfName);
  execFileSync(browser, [
    "--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--run-all-compositor-stages-before-draw",
    "--virtual-time-budget=30000", `--print-to-pdf=${pdfPath}`, pathToFileURL(htmlPath).href,
  ], { stdio: "ignore" });
  console.log(`built ${pdfName}`);
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

function template(m, md) {
  const rows = [
    ["Project ID", m.projectId], ["Project title", m.projectTitle], ["Domain", m.domain],
    ["Student", m.student], ["Roll number", m.rollNo], ["Advisor", m.advisor],
    ["Reporting week", `Week ${Number(m.week)} of 12 — ${m.milestone ?? ""}`],
    ["Report date", m.date], ["Repository", m.repo],
  ].filter(([, v]) => v);
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(m.title)}</title>
<style>
@page { size: A4; margin: 18mm 16mm 18mm 16mm; }
body { font-family: "Segoe UI", Arial, sans-serif; font-size: 10.5pt; line-height: 1.5; color: #1a2330; }
.cover { height: 250mm; display: flex; flex-direction: column; justify-content: center; page-break-after: always; }
.cover .tag { color: #0f766e; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; font-size: 10pt; }
.cover h1 { font-size: 26pt; margin: 6px 0 4px; border: 0; }
.cover .sub { font-size: 14pt; color: #475569; margin-bottom: 28px; }
.cover table { width: 100%; }
h1 { font-size: 18pt; color: #0f3d3a; border-bottom: 2px solid #0f766e; padding-bottom: 4px; margin-top: 22px; }
h2 { font-size: 14pt; color: #0f3d3a; margin-top: 20px; page-break-after: avoid; }
h3 { font-size: 12pt; color: #134e4a; page-break-after: avoid; }
h4, h5, h6 { font-size: 11pt; page-break-after: avoid; }
table { border-collapse: collapse; width: 100%; margin: 8px 0 12px; font-size: 9.5pt; page-break-inside: auto; }
tr { page-break-inside: avoid; }
th, td { border: 1px solid #cbd5e1; padding: 5px 7px; text-align: left; vertical-align: top; }
th { background: #e6f4f1; }
code { font-family: Consolas, monospace; font-size: 9pt; background: #f1f5f9; padding: 1px 3px; border-radius: 3px; }
pre { background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px; white-space: pre-wrap; font-size: 8.5pt; page-break-inside: avoid; }
pre code { background: none; padding: 0; }
pre.mermaid { background: none; border: 0; text-align: center; }
blockquote { border-left: 3px solid #0f766e; margin: 8px 0; padding: 2px 12px; color: #334155; background: #f0fdfa; }
.appendix { page-break-before: always; }
img { max-width: 100%; }
</style>
<script src="https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js"></script>
</head><body>
<section class="cover">
  <div class="tag">Weekly Progress Report</div>
  <h1>${esc(m.projectTitle)}</h1>
  <div class="sub">Week ${Number(m.week)} — ${esc(m.milestone)}</div>
  <table>${rows.map(([k, v]) => `<tr><th style="width:32%">${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</table>
</section>
<main id="content"></main>
<script id="md" type="text/markdown">${md.replace(/<\/script/gi, "<\\/script")}</script>
<script>
  const src = document.getElementById("md").textContent;
  document.getElementById("content").innerHTML = marked.parse(src);
  document.querySelectorAll("code.language-mermaid").forEach((c) => {
    const pre = c.parentElement; pre.className = "mermaid"; pre.textContent = c.textContent;
  });
  mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "loose" });
  mermaid.run({ querySelector: "pre.mermaid" });
</script>
</body></html>`;
}

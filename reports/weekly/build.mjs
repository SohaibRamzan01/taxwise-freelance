// Builds weekly progress-report PDFs: reports/weekly/week-NN.md -> pdf/Week-NN-*.pdf
// Markdown + Mermaid are rendered in headless Chrome/Edge (marked + mermaid from jsDelivr), then printed to PDF.
// Portal-ready plain Markdown versions live in reports/weekly/portal/ (written by hand; the portal shows no tables).
// Usage: node reports/weekly/build.mjs [01 02 ...]   (no args = every week-NN.md)
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const meta = JSON.parse(readFileSync(join(here, "meta.json"), "utf8"));
const browser = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find(existsSync);
if (!browser) throw new Error("Chrome or Edge not found");

const wanted = process.argv.slice(2);
const files = readdirSync(here)
  .filter((f) => /^week-\d\d\.md$/.test(f))
  .filter((f) => !wanted.length || wanted.includes(f.slice(5, 7)));

mkdirSync(join(here, "build"), { recursive: true });
mkdirSync(join(here, "pdf"), { recursive: true });

for (const file of files) {
  const raw = readFileSync(join(here, file), "utf8").replace(/\r\n/g, "\n");
  const fm = /^---\n([\s\S]*?)\n---\n/.exec(raw);
  const front = Object.fromEntries(
    (fm?.[1] ?? "").split("\n").filter(Boolean).map((l) => {
      const i = l.indexOf(":");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
  );
  let body = raw.replace(/^---\n[\s\S]*?\n---\n/, "");
  // <!-- include: docs/x.md --> pulls a supporting document in, headings demoted one level
  body = body.replace(/<!--\s*include:\s*(\S+)\s*-->/g, (_, p) =>
    readFileSync(join(root, p), "utf8").replace(/\r\n/g, "\n").replace(/^(#{1,5}) /gm, "#$1 "),
  );
  const week = file.slice(5, 7);
  const htmlPath = join(here, "build", `week-${week}.html`);
  writeFileSync(htmlPath, template({ ...meta, ...front, week }, body));
  const pdfName = `Week-${week}-${front.slug ?? "Report"}.pdf`;
  execFileSync(browser, [
    "--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--run-all-compositor-stages-before-draw",
    "--virtual-time-budget=30000", `--print-to-pdf=${join(here, "pdf", pdfName)}`, pathToFileURL(htmlPath).href,
  ], { stdio: "ignore" });
  console.log(`built ${pdfName}`);
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

function template(m, md) {
  const info = [
    ["Student", m.student], ["Supervisor", m.supervisor], ["Department", m.department], ["Section", m.section],
    ["Project ID", m.projectId], ["Domain", m.domain], ["Reporting period", m.period], ["Submitted", m.date],
  ].filter(([, v]) => v);
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(m.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&family=Nunito+Sans:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
<style>
:root { --ink:#1f2a37; --muted:#5b6b7c; --brand:#0d7c74; --brand-dark:#0a4f4a; --soft:#e8f5f3; --line:#d6e2e0; --accent:#f59e0b; }
@page { size: A4; margin: 16mm 15mm 18mm 15mm; }
@page :first { margin: 0; }
* { box-sizing: border-box; }
body { margin:0; font-family: "Nunito Sans", "Segoe UI", sans-serif; font-size: 11pt; line-height: 1.6; color: var(--ink); }
h1, h2, h3, h4, .cover * { font-family: "Poppins", "Segoe UI", sans-serif; }

/* cover */
.cover { height: 297mm; width: 210mm; display: flex; flex-direction: column; page-break-after: always; }
.cover .band { background: linear-gradient(135deg, var(--brand-dark), var(--brand)); color: #fff; padding: 30mm 18mm 16mm; }
.cover .uni { font-size: 10pt; letter-spacing: .14em; text-transform: uppercase; opacity: .85; }
.cover .week { display: inline-block; margin-top: 14mm; background: var(--accent); color: #1f2a37; font-weight: 600;
  padding: 4px 14px; border-radius: 99px; font-size: 11pt; }
.cover h1 { font-size: 34pt; line-height: 1.1; margin: 6mm 0 2mm; color: #fff; border: 0; padding: 0; }
.cover .subtitle { font-size: 14pt; opacity: .9; font-weight: 500; }
.cover .milestone { font-size: 18pt; font-weight: 600; margin-top: 10mm; }
.cover .details { padding: 14mm 18mm; flex: 1; }
.cover .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm 10mm; }
.cover .item { border-left: 3px solid var(--brand); padding: 1mm 0 1mm 4mm; }
.cover .label { font-size: 8.5pt; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); }
.cover .value { font-size: 12pt; font-weight: 600; color: var(--ink); }
.cover .foot { padding: 0 18mm 14mm; color: var(--muted); font-size: 9pt; font-family: "Nunito Sans", sans-serif; }

/* body */
main { padding: 0; }
h1 { font-size: 17pt; color: var(--brand-dark); margin: 9mm 0 3mm; padding-bottom: 2mm; border-bottom: 2px solid var(--soft); page-break-after: avoid; }
h1:first-child { margin-top: 0; }
h2 { font-size: 13pt; color: var(--brand); margin: 6mm 0 2mm; page-break-after: avoid; }
h3 { font-size: 11.5pt; color: var(--ink); margin: 4mm 0 1mm; page-break-after: avoid; }
p { margin: 0 0 3mm; }
ul, ol { margin: 0 0 3mm; padding-left: 6mm; }
li { margin-bottom: 1mm; }
strong { color: var(--brand-dark); }
table { border-collapse: separate; border-spacing: 0; width: 100%; margin: 2mm 0 5mm; font-size: 10pt;
  border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
tr { page-break-inside: avoid; }
th { background: var(--brand); color: #fff; font-family: "Poppins", sans-serif; font-weight: 500; font-size: 9.5pt; text-align: left; padding: 6px 9px; }
td { padding: 6px 9px; border-top: 1px solid var(--line); vertical-align: top; }
tr:nth-child(even) td { background: #f7fbfa; }
code { font-family: Consolas, monospace; font-size: 9pt; background: #eef3f2; padding: 1px 4px; border-radius: 4px; }
blockquote { margin: 3mm 0 5mm; padding: 4mm 6mm; background: var(--soft); border-left: 4px solid var(--brand); border-radius: 0 8px 8px 0; font-size: 11.5pt; }
blockquote p:last-child { margin: 0; }
pre.mermaid { text-align: center; margin: 3mm 0 2mm; page-break-inside: avoid; background: none; }
pre.mermaid svg { width: 100% !important; max-width: 100% !important; height: auto; max-height: 215mm; }
td.nw { white-space: nowrap; }
.caption { text-align: center; color: var(--muted); font-size: 9pt; margin-bottom: 5mm; }
.glance { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; margin: 2mm 0 6mm; }
.glance div { background: var(--soft); border-radius: 10px; padding: 4mm; }
.glance b { display: block; font-family: "Poppins", sans-serif; font-size: 18pt; color: var(--brand-dark); line-height: 1.1; }
.glance span { font-size: 9pt; color: var(--muted); }
.cards { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; margin: 2mm 0 5mm; }
.card { border: 1px solid var(--line); border-radius: 10px; padding: 4mm 5mm; page-break-inside: avoid; font-size: 10pt; }
.card h3 { margin-top: 0; color: var(--brand-dark); }
.card ul { padding-left: 5mm; }
.note { background: #fff8eb; border: 1px solid #fde3b0; border-radius: 8px; padding: 3mm 5mm; font-size: 10pt; margin: 3mm 0 5mm; }
.wf { border: 1.5px solid #94a3b8; border-radius: 8px; padding: 3mm; font-size: 8.5pt; color: #475569; background: #fbfcfd; page-break-inside: avoid; }
.wf .bar { background: #e2e8f0; border-radius: 4px; padding: 1.5mm 3mm; margin-bottom: 2mm; font-weight: 700; }
.wf .row { display: flex; gap: 2mm; margin-bottom: 2mm; }
.wf .box { flex: 1; border: 1px dashed #94a3b8; border-radius: 4px; padding: 2mm; min-height: 9mm; }
.wf .btn { display: inline-block; background: #cbd5e1; border-radius: 4px; padding: 1mm 3mm; font-weight: 700; }
.pb { page-break-before: always; }
</style>
<script src="https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js"></script>
</head><body>
<section class="cover">
  <div class="band">
    <div class="uni">${esc(m.university)}</div>
    <div class="week">Weekly Progress Report · Week ${Number(m.week)} of 12</div>
    <h1>${esc(m.projectTitle)}</h1>
    <div class="subtitle">${esc(m.projectSubtitle)}</div>
    <div class="milestone">${esc(m.milestone)}</div>
  </div>
  <div class="details">
    <div class="grid">${info.map(([k, v]) => `<div class="item"><div class="label">${esc(k)}</div><div class="value">${esc(v)}</div></div>`).join("")}</div>
  </div>
  <div class="foot">Source code: ${esc(m.repo)}</div>
</section>
<main id="content"></main>
<script id="md" type="text/markdown">${md.replace(/<\/script/gi, "<\\/script")}</script>
<script>
  document.getElementById("content").innerHTML = marked.parse(document.getElementById("md").textContent);
  document.querySelectorAll("td").forEach((td) => { if (td.textContent.trim().length <= 8) td.classList.add("nw"); });
  document.querySelectorAll("code.language-mermaid").forEach((c) => {
    const pre = c.parentElement; pre.className = "mermaid"; pre.textContent = c.textContent;
  });
  mermaid.initialize({ startOnLoad: false, theme: "base", securityLevel: "loose",
    themeVariables: { fontFamily: "Nunito Sans, sans-serif", fontSize: "14px", primaryColor: "#e8f5f3",
      primaryBorderColor: "#0d7c74", primaryTextColor: "#1f2a37", lineColor: "#0a4f4a", secondaryColor: "#fff8eb", tertiaryColor: "#f7fbfa" } });
  mermaid.run({ querySelector: "pre.mermaid" });
</script>
</body></html>`;
}

import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { copyFile, lstat, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const coreAssets = ["", "-lstm", "-simd", "-simd-lstm", "-relaxedsimd", "-relaxedsimd-lstm"].flatMap(variant => [
  `/tesseract.js-core/tesseract-core${variant}.js`,
  `/tesseract.js-core/tesseract-core${variant}.wasm`,
]);
const routes = [
  ["receipts/scan", [
    "/tesseract.js/package.json", "/tesseract.js/src/worker-script/node/index.js",
    "/tesseract.js-core/package.json", ...coreAssets,
    "/@tesseract.js-data/eng/package.json", "/@tesseract.js-data/eng/4.0.0/eng.traineddata.gz",
    "/bmp-js/package.json", "/bmp-js/index.js", "/bmp-js/lib/decoder.js", "/bmp-js/lib/encoder.js",
    "/wasm-feature-detect/package.json", "/wasm-feature-detect/dist/cjs/index.cjs",
    "/regenerator-runtime/runtime.js", "/is-url/index.js",
  ]],
  ["invoices/[id]/pdf", ["/pdfkit/js/data/Helvetica.afm", "/pdfkit/js/data/Helvetica-Bold.afm"]],
  ["reports/tax-summary", ["/pdfkit/js/data/Helvetica.afm", "/pdfkit/js/data/Helvetica-Bold.afm"]],
];
let receiptFiles;
for (const [route, assets] of routes) {
  const manifest = path.resolve(`.next/server/app/api/${route}/route.js.nft.json`);
  const trace = JSON.parse(await readFile(manifest, "utf8"));
  const files = new Set(trace.files.map(file => path.resolve(path.dirname(manifest), file)));
  for (const asset of assets) assert(files.has(path.join(root, "node_modules", asset)), `${route}: missing traced ${asset}`);
  console.log(`PASS ${route}: traced ${assets.length} required runtime assets`);
  if (route === "receipts/scan") receiptFiles = files;
}

// Copy only traced package files. The guard also runs in the worker thread and
// rejects resolution into the checkout's full node_modules, including via symlinks.
const scratchRoot = path.resolve(root, ".next");
const isolated = await mkdtemp(path.join(scratchRoot, "verify-ocr-"));
try {
  for (const file of receiptFiles) {
    const relative = path.relative(root, file);
    if (!relative.startsWith(`node_modules${path.sep}`)) continue;
    assert(!(await lstat(file)).isSymbolicLink(), `Unexpected traced package symlink: ${relative}`);
    const destination = path.join(isolated, relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(file, destination);
  }
  const guard = path.join(isolated, "guard.cjs");
  await writeFile(guard, `
const Module = require('node:module');
const path = require('node:path');
const fs = require('node:fs');
const root = __dirname + path.sep;
const resolve = Module._resolveFilename;
Module._resolveFilename = function (...args) {
  const file = resolve.apply(this, args);
  if (!Module.isBuiltin(file) && !file.startsWith(root)) throw Error('Untraced module: ' + file);
  return file;
};
const forbidden = () => { throw Error('OCR must not download or write to the host filesystem'); };
global.fetch = forbidden;
for (const protocol of ['node:http', 'node:https']) {
  const api = require(protocol); api.request = forbidden; api.get = forbidden;
}
for (const name of ['writeFile', 'appendFile', 'mkdir', 'unlink']) {
  fs[name] = forbidden; fs[name + 'Sync'] = forbidden; fs.promises[name] = forbidden;
}
`);
  const runtime = `
const { createRequire } = require('node:module');
const path = require('node:path');
const assert = require('node:assert/strict');
const req = createRequire(path.join(process.cwd(), 'package.json'));
const { createWorker, OEM } = req('tesseract.js');
(async () => {
  const worker = await createWorker('eng', OEM.LSTM_ONLY, {
    workerPath: req.resolve('tesseract.js/src/worker-script/node/index.js'),
    corePath: path.dirname(req.resolve('tesseract.js-core/package.json')),
    langPath: path.join(path.dirname(req.resolve('@tesseract.js-data/eng/package.json')), '4.0.0'),
    gzip: true, cacheMethod: 'none', cachePath: require('node:os').tmpdir(),
    errorHandler: error => console.error(error),
  });
  try {
    const { data } = await worker.recognize(require('node:fs').readFileSync(0));
    assert.match(data.text, /DELL/); assert.match(data.text, /311\\.04/);
    console.log('PASS isolated OCR: traced files only, network and host writes disabled');
  } finally { await worker.terminate(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
`;
  const result = spawnSync(process.execPath, ["--require", guard, "-e", runtime], {
    cwd: isolated, input: await readFile(path.join(root, "public/samples/hardware.png")),
    encoding: "utf8", timeout: 35000,
    env: { ...process.env, NODE_PATH: "", NODE_OPTIONS: "" },
    windowsHide: true,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, `Isolated OCR failed:\n${result.stdout}\n${result.stderr}`);
  process.stdout.write(result.stdout);
} finally {
  // Validate the absolute target before recursively deleting our generated scratch directory.
  assert(path.dirname(isolated) === scratchRoot && path.basename(isolated).startsWith("verify-ocr-"));
  await rm(isolated, { recursive: true, force: true });
}

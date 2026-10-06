// Local end-to-end run: sample data (data/sample/*.csv) -> engine -> finished IP and Custom decks,
// plus the two Google Slides templates. Proves the same engine n8n uses produces both decks.
// Usage: npm i pptxgenjs && node tools/run-pipeline.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import pptxgen from 'pptxgenjs';
import { makeCtx, buildIP, buildCustom } from './deck-layouts.mjs';
const require = createRequire(import.meta.url);
const RE = require('../engine/report-engine.js');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

function parseCSV(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [h, ...body] = rows.filter((r) => r.length > 1 || r[0]);
  return body.map((r) => Object.fromEntries(h.map((k, i) => [k, r[i] ?? ''])));
}
const tabs = {};
for (const f of fs.readdirSync(path.join(ROOT, 'data/sample'))) tabs[f.replace('.csv', '')] = parseCSV(fs.readFileSync(path.join(ROOT, 'data/sample', f), 'utf8'));

const out = path.join(ROOT, 'out'); fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(path.join(ROOT, 'templates/slides'), { recursive: true });
const newDeck = () => { const p = new pptxgen(); p.layout = 'LAYOUT_WIDE'; p.company = 'ET BrandEquity'; return p; };

// Templates (upload to Drive, open as Google Slides)
for (const [name, build] of [['ip', buildIP], ['custom', buildCustom]]) {
  const p = newDeck(); p.title = `Report Studio ${name.toUpperCase()} template`;
  build(makeCtx(p, 'template', null, null));
  await p.writeFile({ fileName: path.join(ROOT, `templates/slides/report-template-${name}.pptx`) });
}
// Filled decks
for (const ek of ['etbe-bws-2025', 'etbe-northwind-25']) {
  const data = RE.selectEvent(tabs, ek); data.as_of = '2025-07-05'; data.version = 'v1';
  const res = RE.compute(data);
  const theme = RE.themeFrom(data.event.accent_hex);
  const p = newDeck(); p.title = data.event.name; p.subject = `event=${ek}; engine=${res.engine}; report=${res.model}`;
  (res.model === 'IP' ? buildIP : buildCustom)(makeCtx(p, 'filled', res, theme));
  const file = path.join(out, `${ek}_${res.model}_v1.pptx`);
  await p.writeFile({ fileName: file });
  fs.writeFileSync(path.join(out, `${ek}_result.json`), JSON.stringify(res, null, 2));
  console.log('\n' + RE.summaryText(res));
  console.log('slides kept:', res.sections.filter((s) => !res.drop.includes(s)).length, '→', path.relative(ROOT, file));
}

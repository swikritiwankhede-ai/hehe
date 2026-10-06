// Runs the JavaScript inside each workflow's Code nodes with mocked n8n globals ($, $input) and sample data.
// node n8n/test-workflows.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
const W = (f) => JSON.parse(fs.readFileSync(new URL('./workflows/' + f + '.json', import.meta.url)));
const codeOf = (wf, name) => wf.nodes.find((n) => n.name === name).parameters.jsCode;
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
function csv(f) {
  const t = fs.readFileSync(new URL('../data/sample/' + f + '.csv', import.meta.url), 'utf8');
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < t.length; i++) { const c = t[i];
    if (q) { if (c === '"' && t[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; } else if (c !== '\r') cell += c; }
  const [h, ...b] = rows; return b.map((r) => Object.fromEntries(h.map((k, i) => [k, r[i] ?? ''])));
}
async function run(wf, node, nodes, input) {
  const $ = (n) => { if (!(n in nodes)) throw new Error('missing mock for ' + n); const items = nodes[n].map((j) => (j.json ? j : { json: j })); return { all: () => items, first: () => items[0] }; };
  const $input = { all: () => input.map((j) => ({ json: j })), first: () => ({ json: input[0] }) };
  const fn = new AsyncFunction('$', '$input', codeOf(wf, node));
  return fn.call({ helpers: {} }, $, $input);
}
const cfg = [{ SHEET_ID: 's', TEMPLATE_IP_ID: 'tip', TEMPLATE_CUSTOM_ID: 'tcu', OUTPUT_FOLDER_ID: 'o', GEMINI_MODEL: 'm', EVENT_THEMES: 'AI' }];

// 01: OneWorld export with mobile numbers
const w1 = W('01-upload-event-data');
const raw = fs.readFileSync(new URL('../samples/oneworld_registrations_sample.csv', import.meta.url), 'utf8').trim().split('\n');
const hdr = raw[0].split(','); const rows = raw.slice(1).map((l) => Object.fromEntries(l.split(',').map((v, i) => [hdr[i], v])));
const out1 = await run(w1, 'Normalise rows', { 'Upload event data': [{ 'Event key': 'etbe-bws-2025', 'Data type': 'auto-detect', 'Platform (social exports only)': 'not social' }] }, rows);
assert.equal(out1.length, 413); assert.ok(out1.every((i) => i.json.__kind === 'attendees' && !('mobile' in i.json) && i.json.row_key));
console.log('ok 01 upload: 426 rows → 413 saved (7 without email rejected, 6 duplicates merged), mobile dropped');

// 03: compute both decks from the sheet tabs, then build Slides requests against a mock deck
const w3 = W('03-build-deck');
const TABS = ['events', 'sponsors', 'speakers', 'sessions', 'attendees', 'companies', 'wishlist', 'deliverables', 'followups', 'feedback', 'insights', 'photos', 'social', 'market', 'custom'];
const reads = Object.fromEntries(TABS.map((t) => ['Read ' + t, csv(t)]));
for (const [ek, model] of [['etbe-bws-2025', 'IP'], ['etbe-northwind-25', 'Custom']]) {
  const c = await run(w3, 'Compute report', { ...reads, Config: cfg, 'Build a deck': [{ 'Event key': ek, Version: 'v1', 'Send to': 'lead@example.com' }] }, [{}]);
  const j = c[0].json; assert.equal(j.model, model); assert.equal(j.blocked, false); assert.equal(j.templateId, model === 'IP' ? 'tip' : 'tcu');
  const pres = { presentationId: 'p', slides: [{ objectId: 's1', pageElements: [{ objectId: 'e1', shape: { text: { textElements: [{ startIndex: 0, endIndex: 20, textRun: { content: '{{event_name}} {{award_line}}' } }] } } }] }] };
  const r = await run(w3, 'Slides requests', { 'Compute report': c }, [pres]);
  const reqs = r[0].json.requests;
  assert.ok(reqs.some((q) => q.replaceAllText && q.replaceAllText.containsText.text === '{{event_name}}' && q.replaceAllText.replaceText === j.res.placeholders.event_name));
  if (model === 'IP') assert.equal(j.res.placeholders.award_line, 'Shark Awards (sample custom field)');
  console.log('ok 03 build deck:', model, '·', j.title, '·', reqs.length, 'Slides requests');
}
const blocked = await run(w3, 'Compute report', { ...reads, events: undefined, 'Read events': [{ event_key: 'x', model: 'IP', name: 'X', date_start: '2025-01-01' }], Config: cfg, 'Build a deck': [{ 'Event key': 'x', Version: 'v1', 'Send to': 'a@b.c' }] }, [{}]);
assert.equal(blocked[0].json.blocked, true); console.log('ok 03 blocks an event with no data');

// 02: Gemini response → only verbatim quotes saved, for listed leaders only
const w2 = W('02-video-to-insights');
const gem = { candidates: [{ content: { parts: [{ text: JSON.stringify({ segments: [{ start_sec: 0, end_sec: 30, speaker: 'Rohit Bhasin', text: 'Our reach grew 40% in one year. Taste still matters.' }],
  insights: [{ leader: 'Rohit Bhasin', headline: 'Reach up 40%', quote: 'Our reach grew 40% in one year.', start_sec: 2 }, { leader: 'Rohit Bhasin', headline: 'Invented', quote: 'We will triple revenue.', start_sec: 9 }, { leader: 'Someone Else', headline: 'x', quote: 'Taste still matters.' }] }) }] } }] };
const out2 = await run(w2, 'Check quotes', { 'Match to video plan': [{ event_key: 'etbe-bws-2025', file_name: '1140_Audi1_Panel_Rohit-Bhasin_Ashwin-Moorthy', leaders: 'Rohit Bhasin; Ashwin Moorthy' }], 'Read speakers': csv('speakers') }, [gem]);
assert.equal(out2.length, 1); assert.equal(out2[0].json.quote, 'Our reach grew 40% in one year.'); assert.equal(out2[0].json.status, 'pending'); assert.equal(out2[0].json.company, 'Kotak Mahindra Bank');
console.log('ok 02 video: 1 of 3 proposed insights kept (invented quote and unlisted speaker dropped)');
const m2 = await run(w2, 'Match to video plan', { 'New video in Drive': [{ id: 'f1', name: '1140_Audi1_Panel_Rohit-Bhasin_Ashwin-Moorthy.mp4' }], 'Read video_plan': csv('video_plan'), 'Read events': csv('events') }, [{}]);
assert.equal(m2[0].json.matched, true); assert.equal(m2[0].json.event_key, 'etbe-bws-2025'); console.log('ok 02 file matched to the video plan by name');

// 05: theme from website HTML
const w5 = W('05-theme-from-website');
const html = '<html><head><style>:root{--theme-color: rgba(231, 66, 95, 1)} body{font-family: Montserrat, sans-serif}</style></head><body><h1>Brand World Summit 2025</h1><p>#ETBWS2025 Reimagining Marketing In The Age of AI</p></body></html>';
const t1 = await run(w5, 'Read theme from HTML', {}, [{ data: html }]);
const ai = { candidates: [{ content: { parts: [{ text: JSON.stringify({ accent_color: '#E7425F', theme_line: 'Reimagining Marketing In The Age of AI', edition: '9th Edition', hashtag: '#ETBWS2025' }) }] } }] };
const t2 = await run(w5, 'Propose theme', { 'Read theme from HTML': t1, 'Theme from website': [{ 'Event key': 'etbe-bws-2025' }] }, [ai]);
assert.equal(t2[0].json.accent_hex, '#E7425F'); assert.equal(t2[0].json.theme_line, 'Reimagining Marketing In The Age of AI'); assert.ok(!('edition' in t2[0].json));
console.log('ok 05 theme: accent #E7425F from the page; AI edition "9th Edition" rejected because it is not on the page');

// 04: readiness digest
const w4 = W('04-daily-readiness');
const ev = csv('events').map((e) => ({ ...e, lead_email: 'lead@example.com' }));
const d4 = await run(w4, 'Readiness per event', { ...reads, 'Read events': ev }, [{}]);
assert.equal(d4.length, 2); console.log('ok 04 readiness: digest for', d4.length, 'active events');

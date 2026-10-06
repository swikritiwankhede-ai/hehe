// Tests for the engine: node engine/test.mjs
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const RE = require('./report-engine.js');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };

t('normalize attendees: maps OneWorld headers, drops mobile, rejects missing email, merges duplicates', () => {
  const rows = [
    { 'First Name': 'A', 'Official Email': 'A@x.com', 'Mobile Number': '900', Company: 'X', Designation: 'CMO', Status: 'Attended' },
    { 'First Name': 'A2', 'Official Email': 'a@x.com', 'Mobile Number': '901', Company: 'X', Designation: 'CMO', Status: 'Attended' },
    { 'First Name': 'B', 'Official Email': '', Company: 'Y', Designation: 'VP' }];
  const r = RE.normalize('attendees', rows, { event_key: 'e1' });
  assert.equal(r.rows.length, 1); assert.equal(r.rejected.length, 1);
  assert.equal(r.rows[0].email, 'a@x.com'); assert.equal(r.rows[0].first_name, 'A2');
  assert.ok(!('mobile' in r.rows[0]) && !JSON.stringify(r.rows).includes('900'));
  assert.ok(r.warnings.some((w) => /personal data/.test(w)));
});
t('detectKind recognises a LinkedIn export and an attendee export', () => {
  assert.equal(RE.detectKind(['Post link', 'Created date', 'Impressions', 'Reactions', 'Comments']), 'social');
  assert.equal(RE.detectKind(['First Name', 'Last Name', 'Official Email', 'Company', 'Designation']), 'attendees');
});
t('seniority rule', () => {
  assert.equal(RE.seniorityOf('Vice President - Marketing'), 'VP');
  assert.equal(RE.seniorityOf('President and CMO'), 'CXO');
  assert.equal(RE.seniorityOf('Head of Brand'), 'Director');
  assert.equal(RE.seniorityOf('DGM – Brand Marketing'), 'Manager');
});
t('quote check keeps verbatim quotes only and strips unsupported headline numbers', () => {
  const tr = 'We grew   reach by 40% in a year. AI gives speed, not taste.';
  const out = RE.checkQuotes(tr, [{ quote: 'AI gives speed, not taste.', headline: 'Speed vs taste' }, { quote: 'AI gives taste', headline: '' }, { quote: 'We grew reach by 40% in a year.', headline: 'Reach up 50%' }]);
  assert.deepEqual(out.map((q) => q.verbatim), [true, false, true]);
  assert.equal(out[2].headline, '');
});
t('social windows and multiplier basis', () => {
  const ev = { date_start: '2025-07-04', date_end: '2025-07-04', hashtag: '#X' };
  const s = RE.socialSummary(ev, [{ platform: 'LinkedIn', posted_at: '2025-06-24', impressions: '1,000', text: '#X' }, { platform: 'LinkedIn', posted_at: '2025-07-04', impressions: 500, text: '#x live' }, { platform: 'LinkedIn', posted_at: '2025-06-30', impressions: 999, text: 'unrelated' }]);
  assert.equal(s.pre, 1000); assert.equal(s.event, 500); assert.equal(s.multiplier, 5); // 500/1 ÷ 1000/10
});
t('Slides requests: drop, chart, theme colours, text, leftovers', () => {
  const rgb = (h) => ({ red: parseInt(h.slice(1, 3), 16) / 255, green: parseInt(h.slice(3, 5), 16) / 255, blue: parseInt(h.slice(5, 7), 16) / 255 });
  const shape = (id, text, fill, color) => ({ objectId: id, size: { width: { magnitude: 6e6 }, height: { magnitude: 3e6 } }, transform: { scaleX: 1, scaleY: 1, translateX: 1e5, translateY: 2e5 },
    shape: { shapeProperties: fill ? { shapeBackgroundFill: { solidFill: { color: { rgbColor: rgb(fill) } } } } : {}, text: { textElements: [{ startIndex: 0, endIndex: text.length, textRun: { content: text, style: color ? { foregroundColor: { opaqueColor: { rgbColor: rgb(color) } } } : {} } }] } } });
  const pres = { slides: [
    { objectId: 'p1', pageProperties: { pageBackgroundFill: { solidFill: { color: { rgbColor: rgb('#FF00AA') } } } }, pageElements: [shape('t1', '{{event_name}} {{unknown_thing}}', null, '#FFFFFF')] },
    { objectId: 'p2', pageElements: [shape('m2', '[[section:room]]'), shape('c2', '{{chart:seniority}}'), shape('k2', '{{room_title}}', '#FFD6F0', '#AA0077')] },
    { objectId: 'p3', pageElements: [shape('m3', '[[section:photos]]'), shape('i3', '{{img:photo1}}')] }] };
  const res = { placeholders: { event_name: 'BWS', room_title: '28% CXO' }, charts: { seniority: [['CXO', 10, '10'], ['VP', 5, '5']] }, images: {}, drop: ['photos'] };
  const reqs = RE.slidesRequests(pres, res, RE.themeFrom('#E7425F'));
  const kinds = reqs.map((r) => Object.keys(r)[0]);
  assert.ok(reqs.some((r) => r.deleteObject && r.deleteObject.objectId === 'p3'));
  assert.ok(reqs.some((r) => r.deleteObject && r.deleteObject.objectId === 'c2'));
  assert.equal(reqs.filter((r) => r.createShape && r.createShape.shapeType === 'RECTANGLE').length, 2);
  assert.ok(reqs.some((r) => r.updatePageProperties && r.updatePageProperties.objectId === 'p1'));
  assert.ok(reqs.some((r) => r.updateShapeProperties && r.updateShapeProperties.objectId === 'k2' && r.updateShapeProperties.shapeProperties.shapeBackgroundFill));
  assert.ok(reqs.some((r) => r.updateTextStyle && r.updateTextStyle.objectId === 'k2'));
  assert.ok(reqs.some((r) => r.replaceAllText && r.replaceAllText.containsText.text === '{{event_name}}' && r.replaceAllText.replaceText === 'BWS'));
  assert.ok(reqs.some((r) => r.replaceAllText && r.replaceAllText.containsText.text === '{{unknown_thing}}' && r.replaceAllText.replaceText === ''));
  assert.ok(reqs.some((r) => r.replaceAllText && r.replaceAllText.containsText.text === '[[section:room]]'));
  assert.ok(!reqs.some((r) => r.createShape && r.createShape.elementProperties.pageObjectId === 'p3'));
  const ids = reqs.filter((r) => r.createShape).map((r) => r.createShape.objectId);
  assert.equal(new Set(ids).size, ids.length); assert.ok(ids.every((i) => i.length >= 5 && i.length <= 50 && /^[a-zA-Z0-9_]/.test(i)));
});
t('compute refuses a missing event and blocks an IP event with no data', () => {
  assert.throws(() => RE.compute({}));
  const r = RE.compute({ event: { event_key: 'e', model: 'IP', name: 'X', date_start: '2025-01-01' } });
  assert.ok(r.blockers.length > 0);
});
console.log(n + ' tests passed');

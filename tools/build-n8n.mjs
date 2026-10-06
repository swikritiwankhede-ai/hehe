// Generates importable n8n workflows (n8n/workflows/*.json) with the report engine pasted into every Code node.
// Re-run after changing engine/report-engine.js:  node tools/build-n8n.mjs
// In n8n: Workflows → Import from file → pick each JSON → open every node with a red warning and select your credentials,
// then set the IDs in the "Config" node. Node parameter shapes can differ slightly between n8n versions: if a node
// shows a warning after import, open it and re-pick the highlighted option.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ENGINE = fs.readFileSync(path.join(ROOT, 'engine/report-engine.js'), 'utf8').replace(/^if \(typeof module.*$/m, '');
const OUT = path.join(ROOT, 'n8n/workflows'); fs.mkdirSync(OUT, { recursive: true });

const CONFIG = `// Edit these once. IDs are the long strings in Google Drive / Sheets / Slides URLs.
return [{ json: {
  SHEET_ID: 'PASTE_GOOGLE_SHEET_ID',            // the "Report Studio data" Google Sheet
  TEMPLATE_IP_ID: 'PASTE_IP_SLIDES_TEMPLATE_ID', // templates/slides/report-template-ip.pptx opened as Google Slides
  TEMPLATE_CUSTOM_ID: 'PASTE_CUSTOM_SLIDES_TEMPLATE_ID',
  OUTPUT_FOLDER_ID: 'PASTE_DRIVE_FOLDER_ID_FOR_DECKS',
  GEMINI_MODEL: 'gemini-2.5-flash',              // check the current model list in Google AI Studio
  EVENT_THEMES: 'AI in marketing; Gen Z; Bharat consumers; creativity; data and measurement'
}}];`;

function wf(name, nodes, links, extra = {}) {
  const connections = {};
  links.forEach(([from, to, outIndex = 0]) => {
    connections[from] = connections[from] || { main: [] };
    while (connections[from].main.length <= outIndex) connections[from].main.push([]);
    connections[from].main[outIndex].push({ node: to, type: 'main', index: 0 });
  });
  return { name, nodes, connections, active: false, settings: { executionOrder: 'v1', timezone: 'Asia/Kolkata' }, meta: { templateCredsSetupCompleted: false }, tags: [], ...extra };
}
let x = 0;
function node(name, type, typeVersion, parameters, more = {}) {
  x += 240;
  return { parameters, id: crypto.randomUUID(), name, type, typeVersion, position: [x, more.y ?? 300], ...more.props };
}
const reset = () => { x = 0; };
const code = (name, js, more) => node(name, 'n8n-nodes-base.code', 2, { jsCode: js }, more);
const sheetRL = { __rl: true, value: "={{ $('Config').first().json.SHEET_ID }}", mode: 'id' };
const readTab = (tab, y) => node('Read ' + tab, 'n8n-nodes-base.googleSheets', 4.5,
  { operation: 'read', documentId: sheetRL, sheetName: { __rl: true, value: tab, mode: 'name' }, options: {} },
  { y, props: { executeOnce: true, alwaysOutputData: true } });
const upsert = (name, sheetExpr, more) => node(name, 'n8n-nodes-base.googleSheets', 4.5, {
  operation: 'appendOrUpdate', documentId: sheetRL, sheetName: { __rl: true, value: sheetExpr, mode: 'name' },
  columns: { mappingMode: 'autoMapInputData', value: {}, matchingColumns: ['row_key'] }, options: { handlingExtraData: 'ignoreIt' } }, more);
const appendRun = (name, more) => node(name, 'n8n-nodes-base.googleSheets', 4.5, {
  operation: 'append', documentId: sheetRL, sheetName: { __rl: true, value: 'runs', mode: 'name' },
  columns: { mappingMode: 'autoMapInputData', value: {} }, options: { handlingExtraData: 'ignoreIt' } }, more);
const geminiAuth = { authentication: 'genericCredentialType', genericAuthType: 'httpQueryAuth' }; // credential: Query Auth, name "key", value = Gemini API key
const formEnd = (name, titleExpr, msgExpr) => node(name, 'n8n-nodes-base.form', 1, { operation: 'completion', respondWith: 'text', completionTitle: titleExpr, completionMessage: msgExpr, options: {} });

// ---------------- 01 Upload event data ----------------
reset();
const KINDS = ['auto-detect', 'events', 'attendees', 'speakers', 'sponsors', 'sessions', 'companies', 'wishlist', 'deliverables', 'followups', 'feedback', 'social', 'video_plan', 'photos', 'market', 'custom'];
const w1 = [
  node('Upload event data', 'n8n-nodes-base.formTrigger', 2.2, {
    formTitle: 'Report Studio · Upload event data',
    formDescription: 'Upload a OneWorld export, a filled template or a platform analytics export. Mobile numbers are never stored.',
    formFields: { values: [
      { fieldLabel: 'Event key', placeholder: 'etbe-bws-2025', requiredField: true },
      { fieldLabel: 'Data type', fieldType: 'dropdown', fieldOptions: { values: KINDS.map((k) => ({ option: k })) }, requiredField: true },
      { fieldLabel: 'Platform (social exports only)', fieldType: 'dropdown', fieldOptions: { values: ['', 'LinkedIn', 'Instagram', 'YouTube', 'Facebook'].map((o) => ({ option: o || 'not social' })) } },
      { fieldLabel: 'File', fieldType: 'file', multipleFiles: false, acceptFileTypes: '.xlsx,.xls,.csv', requiredField: true }] },
    responseMode: 'lastNode', options: { appendAttribution: false } }),
  code('Config', CONFIG),
  node('Is CSV?', 'n8n-nodes-base.if', 2, { conditions: { options: { caseSensitive: false, leftValue: '', typeValidation: 'loose' }, conditions: [{ id: crypto.randomUUID(), leftValue: '={{ $binary[Object.keys($binary)[0]].fileExtension }}', rightValue: 'csv', operator: { type: 'string', operation: 'equals' } }], combinator: 'and' }, options: {} }),
  node('Read CSV', 'n8n-nodes-base.extractFromFile', 1, { operation: 'csv', binaryPropertyName: '={{ Object.keys($binary)[0] }}', options: {} }, { y: 200 }),
  node('Read Excel', 'n8n-nodes-base.extractFromFile', 1, { operation: 'xlsx', binaryPropertyName: '={{ Object.keys($binary)[0] }}', options: {} }, { y: 400 }),
  code('Normalise rows', `${ENGINE}
const form = $('Upload event data').first().json;
const raw = $input.all().map((i) => i.json);
let kind = form['Data type'];
if (kind === 'auto-detect') kind = ReportEngine.detectKind(Object.keys(raw[0] || {}));
if (!kind) throw new Error('Could not tell what this file is. Pick the data type in the form.');
const platform = (form['Platform (social exports only)'] || '').replace('not social', '');
const r = ReportEngine.normalize(kind, raw, { event_key: form['Event key'].trim(), platform });
if (!r.rows.length) throw new Error('No usable rows. ' + r.summary + '. ' + r.rejected.slice(0, 5).map((x) => 'Row ' + x.row + ': ' + x.reason).join('; '));
return r.rows.map((row) => ({ json: Object.assign({ __kind: kind }, row) }));`, { y: 300 }),
  upsert('Save to sheet', '={{ $json.__kind }}'),
  code('Run log', `const n = $('Normalise rows').all(); const kind = n[0].json.__kind;
const form = $('Upload event data').first().json;
return [{ json: { ts: new Date().toISOString(), workflow: '01 Upload', event_key: form['Event key'], status: 'succeeded', detail: kind + ': ' + n.length + ' rows saved from ' + (Object.values($('Upload event data').first().binary || {})[0] || {}).fileName } }];`),
  appendRun('Write run log'),
  formEnd('Done', 'Upload saved', "={{ $('Run log').first().json.detail }}. Re-uploading the same file updates rows instead of duplicating them.")
];
const l1 = [['Upload event data', 'Config'], ['Config', 'Is CSV?'], ['Is CSV?', 'Read CSV', 0], ['Is CSV?', 'Read Excel', 1], ['Read CSV', 'Normalise rows'], ['Read Excel', 'Normalise rows'], ['Normalise rows', 'Save to sheet'], ['Save to sheet', 'Run log'], ['Run log', 'Write run log'], ['Write run log', 'Done']];

// ---------------- 02 Video → transcript → insights (Gemini) ----------------
reset();
const PROMPT_TRANSCRIBE = `You are transcribing a recording from {{event}} for a post-event report that sponsors will read.
Video type: {{type}}. People in this video, from the video plan: {{leaders}}.

1. Transcribe word for word in the original language mix (English, Hindi, Hinglish). Do not paraphrase, summarise, correct grammar or tidy filler that changes meaning. Write [inaudible] where you cannot hear.
2. Split into segments with start_sec, end_sec and speaker. speaker must be one of the listed names, "Moderator" or "Unknown". For a single-person video use that person for every segment. Name a speaker only when the recording makes it clear (an introduction, being addressed by name); give that evidence as an exact quote.
3. For each listed person, pick 1 to 3 insights a CMO would repeat to their leadership: a headline of at most 12 words and a quote of at most 40 words copied character for character from your transcript. Prefer quotes with a number, a prediction or a clear stance, related to these themes: {{themes}}. Never add a number that is not in the quote. If nothing qualifies, return no insight for that person.

Return JSON only, no prose:
{"segments":[{"start_sec":0,"end_sec":0,"speaker":"","text":""}],"speaker_evidence":[{"speaker":"","evidence_quote":""}],"insights":[{"leader":"","headline":"","quote":"","start_sec":0,"theme":""}]}`;
const w2 = [
  node('New video in Drive', 'n8n-nodes-base.googleDriveTrigger', 1, { pollTimes: { item: [{ mode: 'custom', cronExpression: '*/5 * * * *' }] }, triggerOn: 'specificFolder', folderToWatch: { __rl: true, value: 'PASTE_VIDEOS_FOLDER_ID', mode: 'id' }, event: 'fileCreated', options: {} }),
  code('Config', CONFIG),
  readTab('video_plan', 300), readTab('speakers', 300), readTab('events', 300),
  code('Match to video plan', `const file = $('New video in Drive').first().json;
const name = (file.name || file.title || '').replace(/\\.[a-z0-9]+$/i, '');
const sq = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const plan = $('Read video_plan').all().map((i) => i.json).filter((r) => r.planned_filename);
let row = plan.find((r) => sq(r.planned_filename) === sq(name));
if (!row) row = plan.find((r) => String(r.leaders || '').split(';').map((s) => s.trim()).filter(Boolean).every((l) => sq(name).includes(sq(l))));
if (!row) return [{ json: { matched: false, file_id: file.id, file_name: name } }];
const ev = $('Read events').all().map((i) => i.json).find((e) => e.event_key === row.event_key) || {};
return [{ json: { matched: true, file_id: file.id, file_name: name, mime: file.mimeType || 'video/mp4', event_key: row.event_key, event_name: ev.name || row.event_key,
  leaders: row.leaders, video_type: row.video_type, plan_row_key: row.row_key, plan_filename: row.planned_filename } }];`),
  node('Matched?', 'n8n-nodes-base.if', 2, { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' }, conditions: [{ id: crypto.randomUUID(), leftValue: '={{ $json.matched }}', rightValue: 'true', operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' }, options: {} }),
  node('Download video', 'n8n-nodes-base.googleDrive', 3, { operation: 'download', fileId: { __rl: true, value: '={{ $json.file_id }}', mode: 'id' }, options: {} }, { y: 200 }),
  code('Measure file', `const out = [];
for (let i = 0; i < $input.all().length; i++) { const buf = await this.helpers.getBinaryDataBuffer(i, 'data'); const it = $input.all()[i]; out.push({ json: Object.assign({}, $('Match to video plan').first().json, { bytes: buf.length }), binary: it.binary }); }
return out;`, { y: 200 }),
  node('Gemini: start upload', 'n8n-nodes-base.httpRequest', 4.2, { method: 'POST', url: 'https://generativelanguage.googleapis.com/upload/v1beta/files', ...geminiAuth,
    sendHeaders: true, headerParameters: { parameters: [{ name: 'X-Goog-Upload-Protocol', value: 'resumable' }, { name: 'X-Goog-Upload-Command', value: 'start' }, { name: 'X-Goog-Upload-Header-Content-Length', value: '={{ $json.bytes }}' }, { name: 'X-Goog-Upload-Header-Content-Type', value: '={{ $json.mime }}' }] },
    sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify({ file: { display_name: $json.file_name } }) }}', options: { response: { response: { fullResponse: true } } } }, { y: 200 }),
  node('Gemini: upload bytes', 'n8n-nodes-base.httpRequest', 4.2, { method: 'POST', url: "={{ $json.headers['x-goog-upload-url'] }}",
    sendHeaders: true, headerParameters: { parameters: [{ name: 'X-Goog-Upload-Command', value: 'upload, finalize' }, { name: 'X-Goog-Upload-Offset', value: '0' }] },
    sendBody: true, contentType: 'binaryData', inputDataFieldName: 'data', options: {} }, { y: 200 }),
  node('Wait for processing', 'n8n-nodes-base.wait', 1.1, { amount: 20, unit: 'seconds' }, { y: 200 }),
  node('Gemini: file state', 'n8n-nodes-base.httpRequest', 4.2, { method: 'GET', url: "={{ 'https://generativelanguage.googleapis.com/v1beta/' + ($json.file ? $json.file.name : $json.name) }}", ...geminiAuth, options: {} }, { y: 200 }),
  node('Ready?', 'n8n-nodes-base.if', 2, { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' }, conditions: [{ id: crypto.randomUUID(), leftValue: '={{ $json.state }}', rightValue: 'ACTIVE', operator: { type: 'string', operation: 'equals' } }], combinator: 'and' }, options: {} }, { y: 200 }),
  node('Gemini: transcribe + insights', 'n8n-nodes-base.httpRequest', 4.2, { method: 'POST', url: "={{ 'https://generativelanguage.googleapis.com/v1beta/models/' + $('Config').first().json.GEMINI_MODEL + ':generateContent' }}", ...geminiAuth,
    sendBody: true, specifyBody: 'json',
    jsonBody: `={{ JSON.stringify({ contents: [{ parts: [ { file_data: { mime_type: $json.mimeType, file_uri: $json.uri } }, { text: ${JSON.stringify(PROMPT_TRANSCRIBE)}.replace('{{event}}', $('Match to video plan').first().json.event_name).replace('{{type}}', $('Match to video plan').first().json.video_type).replace('{{leaders}}', $('Match to video plan').first().json.leaders).replace('{{themes}}', $('Config').first().json.EVENT_THEMES) } ] }], generationConfig: { temperature: 0, responseMimeType: 'application/json' } }) }}`,
    options: { timeout: 600000 } }, { y: 200 }),
  code('Check quotes', `${ENGINE}
const m = $('Match to video plan').first().json;
const txt = (((($input.first().json.candidates || [])[0] || {}).content || {}).parts || []).map((p) => p.text || '').join('');
let g; try { g = JSON.parse(txt); } catch (e) { throw new Error('Gemini did not return JSON: ' + txt.slice(0, 300)); }
const transcript = (g.segments || []).map((s) => s.text).join(' ');
const leaders = String(m.leaders || '').split(';').map((s) => s.trim()).filter(Boolean);
const speakers = Object.fromEntries($('Read speakers').all().map((i) => [String(i.json.name).toLowerCase(), i.json]));
const checked = ReportEngine.checkQuotes(transcript, (g.insights || []).filter((q) => leaders.some((l) => l.toLowerCase() === String(q.leader).toLowerCase())));
const rows = checked.filter((q) => q.verbatim).map((q) => {
  const sp = speakers[String(q.leader).toLowerCase()] || {};
  const row = { event_key: m.event_key, leader: q.leader, designation: sp.designation || '', company: sp.company || '', headline: q.headline, quote: q.quote, theme: q.theme || '', video: m.file_name, start_sec: q.start_sec || '', photo_url: sp.photo_url || '', status: 'pending' };
  return { json: Object.assign({ row_key: ReportEngine.rowKey('insights', row) }, row) };
});
const dropped = checked.length - rows.length;
return rows.length ? rows : [{ json: { __none: true } }];`, { y: 200 }),
  upsert('Save insights (pending)', 'insights', { y: 200 }),
  code('Run log', `const m = $('Match to video plan').first().json; const s = $('Check quotes').all();
const kept = s.filter((i) => !i.json.__none).length;
return [{ json: { ts: new Date().toISOString(), workflow: '02 Video', event_key: m.event_key, status: 'succeeded', detail: m.file_name + ': ' + kept + ' insights waiting for approval (quotes that were not word for word were dropped)' } }];`, { y: 200 }),
  appendRun('Write run log', { y: 200 }),
  code('Unmatched file', `const m = $input.first().json; return [{ json: { ts: new Date().toISOString(), workflow: '02 Video', event_key: '', status: 'needs attention', detail: 'No video plan row matches ' + m.file_name + '. Rename the file as the plan says, or add a row to video_plan.' } }];`, { y: 450 }),
  appendRun('Log unmatched', { y: 450 })
];
const l2 = [['New video in Drive', 'Config'], ['Config', 'Read video_plan'], ['Read video_plan', 'Read speakers'], ['Read speakers', 'Read events'], ['Read events', 'Match to video plan'], ['Match to video plan', 'Matched?'],
  ['Matched?', 'Download video', 0], ['Matched?', 'Unmatched file', 1], ['Unmatched file', 'Log unmatched'], ['Download video', 'Measure file'], ['Measure file', 'Gemini: start upload'], ['Gemini: start upload', 'Gemini: upload bytes'],
  ['Gemini: upload bytes', 'Wait for processing'], ['Wait for processing', 'Gemini: file state'], ['Gemini: file state', 'Ready?'], ['Ready?', 'Gemini: transcribe + insights', 0], ['Ready?', 'Wait for processing', 1],
  ['Gemini: transcribe + insights', 'Check quotes'], ['Check quotes', 'Save insights (pending)'], ['Save insights (pending)', 'Run log'], ['Run log', 'Write run log']];

// ---------------- 03 Build deck (IP or Custom) ----------------
reset();
const TABS_READ = ['events', 'sponsors', 'speakers', 'sessions', 'attendees', 'companies', 'wishlist', 'deliverables', 'followups', 'feedback', 'insights', 'photos', 'social', 'market', 'custom'];
const w3 = [
  node('Build a deck', 'n8n-nodes-base.formTrigger', 2.2, { formTitle: 'Report Studio · Build the post-event deck', formDescription: 'Builds the IP or Custom deck from the data sheet, in the event\'s theme. Only approved quotes, photos and market stats are used.',
    formFields: { values: [{ fieldLabel: 'Event key', placeholder: 'etbe-bws-2025', requiredField: true }, { fieldLabel: 'Version', fieldType: 'dropdown', fieldOptions: { values: [{ option: 'v1' }, { option: 'v2' }, { option: 'draft' }] }, requiredField: true }, { fieldLabel: 'Send to', fieldType: 'email', requiredField: true }] },
    responseMode: 'lastNode', options: { appendAttribution: false } }),
  code('Config', CONFIG),
  ...TABS_READ.map((t) => readTab(t, 300)),
  code('Compute report', `${ENGINE}
const form = $('Build a deck').first().json, cfg = $('Config').first().json;
const tabs = {};
${JSON.stringify(TABS_READ)}.forEach((t) => { tabs[t] = $('Read ' + t).all().map((i) => i.json).filter((r) => Object.keys(r).length); });
const data = ReportEngine.selectEvent(tabs, form['Event key'].trim());
data.version = form['Version']; data.as_of = new Date().toISOString().slice(0, 10);
const res = ReportEngine.compute(data);
const theme = ReportEngine.themeFrom(data.event.accent_hex);
const title = [data.event.name, res.model === 'Custom' ? data.event.sponsor_name : '', 'Post-event report', form['Version'], data.event.theme_id || ''].filter(Boolean).join(' · ');
return [{ json: { res, theme, title, model: res.model, blocked: res.blockers.length > 0, summary: ReportEngine.summaryText(res),
  templateId: res.model === 'Custom' ? cfg.TEMPLATE_CUSTOM_ID : cfg.TEMPLATE_IP_ID, sendTo: form['Send to'] } }];`),
  node('Blocked?', 'n8n-nodes-base.if', 2, { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' }, conditions: [{ id: crypto.randomUUID(), leftValue: '={{ $json.blocked }}', rightValue: 'true', operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' }, options: {} }),
  node('Copy template', 'n8n-nodes-base.googleDrive', 3, { operation: 'copy', fileId: { __rl: true, value: '={{ $json.templateId }}', mode: 'id' }, name: '={{ $json.title }}', sameFolder: false,
    driveId: { __rl: true, value: 'My Drive', mode: 'list', cachedResultName: 'My Drive' }, folderId: { __rl: true, value: "={{ $('Config').first().json.OUTPUT_FOLDER_ID }}", mode: 'id' }, options: {} }, { y: 200 }),
  node('Read copied deck', 'n8n-nodes-base.httpRequest', 4.2, { method: 'GET', url: '={{ "https://slides.googleapis.com/v1/presentations/" + $json.id }}', authentication: 'predefinedCredentialType', nodeCredentialType: 'googleSlidesOAuth2Api', options: {} }, { y: 200 }),
  code('Slides requests', `${ENGINE}
const c = $('Compute report').first().json;
const pres = $input.first().json;
const requests = ReportEngine.slidesRequests(pres, c.res, c.theme);
return [{ json: { presentationId: pres.presentationId, requests } }];`, { y: 200 }),
  node('Fill deck', 'n8n-nodes-base.httpRequest', 4.2, { method: 'POST', url: '={{ "https://slides.googleapis.com/v1/presentations/" + $json.presentationId + ":batchUpdate" }}', authentication: 'predefinedCredentialType', nodeCredentialType: 'googleSlidesOAuth2Api',
    sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify({ requests: $json.requests }) }}', options: {} }, { y: 200 }),
  node('Export PDF', 'n8n-nodes-base.googleDrive', 3, { operation: 'download', fileId: { __rl: true, value: "={{ $('Slides requests').first().json.presentationId }}", mode: 'id' },
    options: { googleFileConversion: { conversion: { slidesToFormat: 'application/pdf' } }, fileName: "={{ $('Compute report').first().json.title + '.pdf' }}" } }, { y: 200 }),
  node('Email the lead', 'n8n-nodes-base.gmail', 2.1, { sendTo: "={{ $('Compute report').first().json.sendTo }}", subject: "={{ 'Ready for review: ' + $('Compute report').first().json.title }}", emailType: 'text',
    message: "={{ 'The deck is ready for review in Google Slides:\\nhttps://docs.google.com/presentation/d/' + $('Slides requests').first().json.presentationId + '/edit\\n\\n' + $('Compute report').first().json.summary + '\\n\\nCheck every number against its source line before sharing with sponsors.' }}",
    options: { attachmentsUi: { attachmentsBinary: [{ property: 'data' }] } } }, { y: 200 }),
  code('Run log', `const c = $('Compute report').first().json;
return [{ json: { ts: new Date().toISOString(), workflow: '03 Build deck', event_key: c.res.event_key, status: 'succeeded', detail: c.title + ' · https://docs.google.com/presentation/d/' + $('Slides requests').first().json.presentationId } }];`, { y: 200 }),
  appendRun('Write run log', { y: 200 }),
  formEnd('Deck ready', 'Deck ready for review', "={{ 'Sent to ' + $('Compute report').first().json.sendTo + '. Open: https://docs.google.com/presentation/d/' + $('Slides requests').first().json.presentationId + '/edit' }}"),
  formEnd('Not ready', 'Not enough data yet', "={{ $('Compute report').first().json.summary }}")
];
const l3 = [['Build a deck', 'Config'], ['Config', 'Read ' + TABS_READ[0]], ...TABS_READ.slice(1).map((t, i) => ['Read ' + TABS_READ[i], 'Read ' + t]), ['Read ' + TABS_READ.at(-1), 'Compute report'], ['Compute report', 'Blocked?'],
  ['Blocked?', 'Not ready', 0], ['Blocked?', 'Copy template', 1], ['Copy template', 'Read copied deck'], ['Read copied deck', 'Slides requests'], ['Slides requests', 'Fill deck'], ['Fill deck', 'Export PDF'], ['Export PDF', 'Email the lead'], ['Email the lead', 'Run log'], ['Run log', 'Write run log'], ['Write run log', 'Deck ready']];

// ---------------- 04 Daily readiness digest ----------------
reset();
const w4 = [
  node('Every morning 09:00', 'n8n-nodes-base.scheduleTrigger', 1.2, { rule: { interval: [{ field: 'days', triggerAtHour: 9 }] } }),
  code('Config', CONFIG),
  ...TABS_READ.map((t) => readTab(t, 300)),
  code('Readiness per event', `${ENGINE}
const tabs = {};
${JSON.stringify(TABS_READ)}.forEach((t) => { tabs[t] = $('Read ' + t).all().map((i) => i.json).filter((r) => Object.keys(r).length); });
return tabs.events.filter((e) => String(e.status).toLowerCase() === 'active' && e.lead_email).map((e) => {
  const res = ReportEngine.compute(ReportEngine.selectEvent(tabs, e.event_key));
  return { json: { to: e.lead_email, subject: 'Readiness · ' + e.name, body: ReportEngine.summaryText(res) } };
});`),
  node('Email each lead', 'n8n-nodes-base.gmail', 2.1, { sendTo: '={{ $json.to }}', subject: '={{ $json.subject }}', emailType: 'text', message: '={{ $json.body }}', options: {} })
];
const l4 = [['Every morning 09:00', 'Config'], ['Config', 'Read ' + TABS_READ[0]], ...TABS_READ.slice(1).map((t, i) => ['Read ' + TABS_READ[i], 'Read ' + t]), ['Read ' + TABS_READ.at(-1), 'Readiness per event'], ['Readiness per event', 'Email each lead']];

// ---------------- 05 Theme from the event website ----------------
reset();
const PROMPT_THEME = `Below is the HTML <head> and the first part of the <body> of an event website built on ET's OneWorld platform.
Return JSON only with these keys, copying values exactly as they appear in the HTML (null when absent, never guess):
{"event_name":"","edition":"","theme_line":"","date":"","venue":"","hashtag":"","accent_color":"#RRGGBB","body_font":"","heading_font":""}
accent_color is the site's theme colour (CSS variables or inline styles named like theme, primary or brand), converted to hex.`;
const w5 = [
  node('Theme from website', 'n8n-nodes-base.formTrigger', 2.2, { formTitle: 'Report Studio · Take the theme from the event website', formDescription: 'Reads the public event page and proposes the deck theme. You approve it on the events tab.',
    formFields: { values: [{ fieldLabel: 'Event key', requiredField: true }, { fieldLabel: 'Event website URL', placeholder: 'https://brandequity.economictimes.indiatimes.com/...', requiredField: true }] }, responseMode: 'lastNode', options: { appendAttribution: false } }),
  code('Config', CONFIG),
  node('Fetch website', 'n8n-nodes-base.httpRequest', 4.2, { method: 'GET', url: "={{ $('Theme from website').first().json['Event website URL'] }}", options: { response: { response: { responseFormat: 'text' } } } }),
  code('Read theme from HTML', `const html = String($input.first().json.data || $input.first().json.body || '');
const rgbToHex = (s) => { const m = s.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/); return m ? '#' + [m[1], m[2], m[3]].map((n) => ('0' + (+n).toString(16)).slice(-2)).join('').toUpperCase() : (s.match(/#[0-9a-f]{6}/i) || [null])[0]; };
const varMatch = html.match(/--[a-z-]*(theme|primary|brand)[a-z-]*\\s*:\\s*([^;"]+)/i);
const font = (html.match(/font-family\\s*:\\s*['"]?([A-Za-z ]+)/i) || [])[1];
const tag = (html.match(/#[A-Za-z]+20\\d\\d/) || [])[0];
return [{ json: { from_code: { accent_color: varMatch ? rgbToHex(varMatch[2]) : null, body_font: font ? font.trim() : null, hashtag: tag || null }, html_excerpt: html.slice(0, 60000) } }];`),
  node('Gemini: read theme', 'n8n-nodes-base.httpRequest', 4.2, { method: 'POST', url: "={{ 'https://generativelanguage.googleapis.com/v1beta/models/' + $('Config').first().json.GEMINI_MODEL + ':generateContent' }}", ...geminiAuth,
    sendBody: true, specifyBody: 'json', jsonBody: `={{ JSON.stringify({ contents: [{ parts: [{ text: ${JSON.stringify(PROMPT_THEME)} + '\\n\\n' + $json.html_excerpt }] }], generationConfig: { temperature: 0, responseMimeType: 'application/json' } }) }}`, options: {} }),
  code('Propose theme', `${ENGINE}
const code = $('Read theme from HTML').first().json.from_code, html = $('Read theme from HTML').first().json.html_excerpt;
let ai = {}; try { ai = JSON.parse(((($input.first().json.candidates || [])[0] || {}).content || {}).parts.map((p) => p.text).join('')); } catch (e) {}
// Guardrail: keep an AI value only if it literally appears in the page (colours: in hex or rgb form).
const inPage = (v) => v && html.toLowerCase().includes(String(v).toLowerCase());
const colourInPage = (hex) => { const m = String(hex || '').match(/^#([0-9a-f]{6})$/i); if (!m) return false; const n = parseInt(m[1], 16);
  return inPage(hex) || new RegExp('rgba?\\(\\s*' + (n >> 16) + '\\s*,\\s*' + ((n >> 8) & 255) + '\\s*,\\s*' + (n & 255) + '\\b').test(html); };
const pick = (k) => code[k] || (inPage(ai[k]) ? ai[k] : null);
const accent = code.accent_color || (colourInPage(ai.accent_color) ? ai.accent_color.toUpperCase() : null);
const ek = $('Theme from website').first().json['Event key'].trim();
const row = { event_key: ek, accent_hex: accent || '', hashtag: pick('hashtag') || '', theme_line: inPage(ai.theme_line) ? ai.theme_line : '', edition: inPage(ai.edition) ? ai.edition : '', status: 'theme proposed' };
Object.keys(row).forEach((k) => { if (row[k] === '') delete row[k]; });
row.row_key = ReportEngine.rowKey('events', { event_key: ek });
return [{ json: row }];`),
  upsert('Save to events tab', 'events'),
  formEnd('Theme proposed', 'Theme proposed', "={{ 'Accent ' + ($json.accent_hex || 'not found') + ', hashtag ' + ($json.hashtag || 'not found') + '. Check them on the events tab, then build a draft deck to see the theme.' }}")
];
const l5 = [['Theme from website', 'Config'], ['Config', 'Fetch website'], ['Fetch website', 'Read theme from HTML'], ['Read theme from HTML', 'Gemini: read theme'], ['Gemini: read theme', 'Propose theme'], ['Propose theme', 'Save to events tab'], ['Save to events tab', 'Theme proposed']];

const all = [['01-upload-event-data', 'Report Studio · 01 Upload event data', w1, l1], ['02-video-to-insights', 'Report Studio · 02 Video → transcript → insights', w2, l2],
  ['03-build-deck', 'Report Studio · 03 Build deck (IP or Custom)', w3, l3], ['04-daily-readiness', 'Report Studio · 04 Daily readiness digest', w4, l4], ['05-theme-from-website', 'Report Studio · 05 Theme from website', w5, l5]];
for (const [file, name, nodes, links] of all) {
  const names = new Set(nodes.map((n) => n.name));
  links.forEach(([a, b]) => { if (!names.has(a) || !names.has(b)) throw new Error(file + ': bad link ' + a + ' → ' + b); });
  fs.writeFileSync(path.join(OUT, file + '.json'), JSON.stringify(wf(name, nodes, links), null, 2));
  console.log(file, nodes.length, 'nodes');
}
fs.writeFileSync(path.join(ROOT, 'n8n/prompts.md'), `# Prompts used by the workflows\n\n## Transcript and insights (02)\n\n\`\`\`\n${PROMPT_TRANSCRIBE}\n\`\`\`\n\n## Theme from website (05)\n\n\`\`\`\n${PROMPT_THEME}\n\`\`\`\n`);

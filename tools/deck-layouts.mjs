// Slide layouts for the IP and Custom decks.
// mode "template": writes {{placeholders}}, {{chart:x}} / {{img:x}} boxes, [[section:x]] markers and sentinel colours.
//   Upload the .pptx to Google Drive and open it as Google Slides: that becomes the template n8n copies and fills.
// mode "filled": writes the real values from engine results (for the local run and as a preview).
const S = { accent: '#FF00AA', dark: '#AA0077', tint: '#FFD6F0' }; // must match ReportEngine.SENTINELS
const hex = (h) => h.replace('#', '');

export function makeCtx(pptx, mode, res, theme) {
  const filled = mode === 'filled';
  const C = filled ? { accent: theme.accent, dark: theme.dark, tint: theme.tint } : S;
  const F = { head: 'Georgia', body: 'Montserrat' };
  const val = (k) => (filled ? String(res.placeholders[k] ?? '') : '{{' + k + '}}');
  return { pptx, filled, res, C, F, val, theme };
}

function base(ctx, section, opts = {}) {
  const { pptx, filled, C, F } = ctx;
  if (filled && section && ctx.res.drop.includes(section)) return null;
  const s = pptx.addSlide();
  s.background = { color: hex(opts.dark ? C.accent : '#FFFFFF') };
  if (!opts.dark) {
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.16, h: 7.5, fill: { color: hex(C.accent) }, line: { type: 'none' } });
    s.addText(filled ? `${ctx.res.placeholders.hashtag || ''}   ${ctx.res.placeholders.event_name}` : '{{hashtag}}   {{event_name}}', { x: 0.5, y: 7.05, w: 9, h: 0.3, fontFace: F.body, fontSize: 9, color: '777777' });
    s.addText(ctx.val('as_of'), { x: 8.6, y: 7.05, w: 4.3, h: 0.3, fontFace: F.body, fontSize: 9, color: '777777', align: 'right' });
  }
  if (!filled && section) s.addText(`[[section:${section}]]`, { x: 12.2, y: 0.05, w: 1.1, h: 0.2, fontFace: F.body, fontSize: 4, color: 'BBBBBB' });
  return s;
}
const title = (ctx, s, key, fallback) => s.addText(ctx.filled ? (ctx.res.placeholders[key] || fallback) : `{{${key}}}`, { x: 0.6, y: 0.4, w: 12, h: 0.9, fontFace: ctx.F.head, fontSize: 30, bold: true, color: hex(ctx.C.accent) });
const src = (ctx, s, key) => s.addText(ctx.val(key), { x: 0.6, y: 6.6, w: 12, h: 0.35, fontFace: ctx.F.body, fontSize: 10, color: '5A5A5A' });

function tile(ctx, s, x, y, w, h, key, label) {
  const { pptx, C, F } = ctx;
  s.addShape(pptx.ShapeType.roundRect, { x, y, w, h, fill: { color: hex(C.tint) }, line: { type: 'none' }, rectRadius: 0.08 });
  s.addText(ctx.val(key), { x: x + 0.15, y: y + 0.1, w: w - 0.3, h: h * 0.55, fontFace: F.head, fontSize: 30, bold: true, color: hex(C.dark), valign: 'bottom' });
  s.addText(label, { x: x + 0.15, y: y + h * 0.62, w: w - 0.3, h: h * 0.33, fontFace: F.body, fontSize: 12, color: '1A1A1A', valign: 'top' });
}
function tiles(ctx, s, items, cols = 4, y0 = 1.6, h = 2.2) {
  const gap = 0.2, w = (12.1 - gap * (cols - 1)) / cols;
  items.forEach(([k, l], i) => tile(ctx, s, 0.6 + (i % cols) * (w + gap), y0 + Math.floor(i / cols) * (h + gap), w, h, k, l));
}
function chart(ctx, s, key, x, y, w, h, label) {
  const { pptx, filled, C, F } = ctx;
  if (label) s.addText(label, { x, y: y - 0.4, w, h: 0.35, fontFace: F.body, fontSize: 12, bold: true, color: '1A1A1A' });
  if (!filled) { s.addShape(pptx.ShapeType.rect, { x, y, w, h, fill: { color: 'F4F4F4' }, line: { color: 'DDDDDD' } }); s.addText(`{{chart:${key}}}`, { x, y, w, h, fontFace: F.body, fontSize: 10, color: '999999', align: 'center' }); return; }
  const rows = (ctx.res.charts[key] || []).filter((r) => r[1] > 0);
  if (!rows.length) return;
  const max = Math.max(...rows.map((r) => r[1])), rh = h / rows.length, bh = Math.min(rh * 0.55, 0.4);
  rows.forEach((r, i) => {
    const yy = y + i * rh;
    s.addText(String(r[0]), { x, y: yy, w: w * 0.32, h: rh, fontFace: F.body, fontSize: 11, color: '1A1A1A', valign: 'middle' });
    s.addShape(pptx.ShapeType.rect, { x: x + w * 0.32, y: yy + (rh - bh) / 2, w: Math.max(0.02, (r[1] / max) * w * 0.5), h: bh, fill: { color: hex(C.accent) }, line: { type: 'none' } });
    s.addText(String(r[2] || r[1]), { x: x + w * 0.83, y: yy, w: w * 0.17, h: rh, fontFace: F.body, fontSize: 11, bold: true, color: '1A1A1A', valign: 'middle' });
  });
}
function img(ctx, s, key, x, y, w, h) {
  const { pptx, filled, F } = ctx;
  s.addShape(pptx.ShapeType.rect, { x, y, w, h, fill: { color: 'EEEEEE' }, line: { type: 'none' } });
  s.addText(filled ? (ctx.res.images[key] ? 'Photo' : '') : `{{img:${key}}}`, { x, y, w, h, fontFace: F.body, fontSize: 9, color: '888888', align: 'center' });
}
function quoteCard(ctx, s, i, x, y, w, h) {
  const { pptx, C, F } = ctx;
  s.addShape(pptx.ShapeType.roundRect, { x, y, w, h, fill: { color: 'FFFFFF' }, line: { color: 'E6E6E6' }, rectRadius: 0.06 });
  img(ctx, s, `q${i}_photo`, x + 0.2, y + 0.2, 1.0, 1.0);
  s.addText(ctx.val(`q${i}_name`), { x: x + 1.35, y: y + 0.2, w: w - 1.5, h: 0.4, fontFace: F.body, fontSize: 13, bold: true, color: '1A1A1A' });
  s.addText(ctx.val(`q${i}_role`), { x: x + 1.35, y: y + 0.6, w: w - 1.5, h: 0.5, fontFace: F.body, fontSize: 10, color: '5A5A5A', valign: 'top' });
  s.addText(ctx.val(`q${i}_headline`), { x: x + 0.2, y: y + 1.3, w: w - 0.4, h: 0.45, fontFace: F.head, fontSize: 14, bold: true, color: hex(C.dark) });
  s.addText(ctx.val(`q${i}_quote`), { x: x + 0.2, y: y + 1.75, w: w - 0.4, h: h - 1.9, fontFace: F.body, fontSize: 11, italic: true, color: '333333', valign: 'top' });
}
function cover(ctx, kicker, line2) {
  const s = base(ctx, 'cover', { dark: true }); const { F } = ctx;
  s.addText(kicker, { x: 0.7, y: 0.6, w: 11, h: 0.5, fontFace: F.body, fontSize: 16, bold: true, color: 'FFFFFF' });
  s.addText(ctx.val('event_name'), { x: 0.7, y: 2.3, w: 11.9, h: 1.3, fontFace: F.head, fontSize: 44, bold: true, color: 'FFFFFF' });
  s.addText(line2, { x: 0.7, y: 3.6, w: 11.9, h: 0.8, fontFace: F.head, fontSize: 24, bold: true, color: 'FFFFFF' });
  s.addText(ctx.val('date_venue'), { x: 0.7, y: 4.5, w: 11.9, h: 0.5, fontFace: F.body, fontSize: 18, bold: true, color: 'FFFFFF' });
  s.addText(`Post-event report · ${ctx.val('report_version')}`, { x: 0.7, y: 6.4, w: 8, h: 0.5, fontFace: F.body, fontSize: 16, bold: true, color: 'FFFFFF' });
}
function close(ctx) {
  const s = base(ctx, 'close', { dark: true }); const { F } = ctx;
  s.addText('Thank you', { x: 0.7, y: 2.6, w: 11.9, h: 1.2, fontFace: F.head, fontSize: 48, bold: true, color: 'FFFFFF' });
  s.addText(ctx.val('next_edition'), { x: 0.7, y: 3.8, w: 11.9, h: 0.6, fontFace: F.body, fontSize: 20, bold: true, color: 'FFFFFF' });
  s.addText(ctx.val('hashtag'), { x: 0.7, y: 4.4, w: 11.9, h: 0.6, fontFace: F.body, fontSize: 18, bold: true, color: 'FFFFFF' });
}
const textBlock = (ctx, s, key, x, y, w, h, size = 13) => s.addText(ctx.val(key), { x, y, w, h, fontFace: ctx.F.body, fontSize: size, color: '1A1A1A', valign: 'top', paraSpaceAfter: 4 });
function photos(ctx) {
  const s = base(ctx, 'photos'); if (!s) return;
  s.addText('Moments from the day', { x: 0.6, y: 0.4, w: 12, h: 0.9, fontFace: ctx.F.head, fontSize: 30, bold: true, color: hex(ctx.C.accent) });
  for (let i = 0; i < 6; i++) img(ctx, s, 'photo' + (i + 1), 0.6 + (i % 3) * 4.1, 1.5 + Math.floor(i / 3) * 2.6, 3.9, 2.4);
}

// ---------------- IP (event-level) ----------------
export function buildIP(ctx) {
  const { pptx } = ctx;
  cover(ctx, ctx.filled ? `${ctx.res.placeholders.edition} · ${ctx.res.placeholders.hashtag}` : '{{edition}} · {{hashtag}}', ctx.val('theme_line'));
  let s = base(ctx, 'glance');
  if (s) { s.addText('The day at a glance', { x: 0.6, y: 0.4, w: 12, h: 0.9, fontFace: ctx.F.head, fontSize: 30, bold: true, color: hex(ctx.C.accent) });
    tiles(ctx, s, [['registrations', 'Registered'], ['attended', 'Attended'], ['show_up_pct', 'Show-up rate'], ['unique_orgs', 'Organisations in the room'], ['speakers_count', 'Speakers'], ['sessions_count', 'Sessions'], ['partners_count', 'Partners'], ['impressions_total', 'Social impressions and views']]); src(ctx, s, 'src_glance'); }
  s = base(ctx, 'promise');
  if (s) { s.addText('What we promised, what we delivered', { x: 0.6, y: 0.4, w: 12, h: 0.9, fontFace: ctx.F.head, fontSize: 30, bold: true, color: hex(ctx.C.accent) });
    tiles(ctx, s, [['target_attendees', 'Attendees promised'], ['attended', 'Attendees in the room'], ['attendees_vs_target', 'Against target'], ['target_speakers', 'Speakers promised'], ['speakers_count', 'Speakers on stage'], ['speakers_vs_target', 'Against target']], 3); }
  s = base(ctx, 'room');
  if (s) { title(ctx, s, 'room_title'); chart(ctx, s, 'seniority', 0.6, 1.9, 7.4, 4.2, 'Attendees by seniority');
    tile(ctx, s, 8.6, 1.6, 4.1, 2.0, 'cxo_count', 'CXOs in the room'); tile(ctx, s, 8.6, 3.8, 4.1, 2.0, 'unique_orgs', 'Organisations'); src(ctx, s, 'src_room'); }
  s = base(ctx, 'orgs');
  if (s) { title(ctx, s, 'orgs_title'); chart(ctx, s, 'orgtype', 0.6, 1.9, 6.0, 3.6, 'Attendees by organisation type');
    s.addText('Brands in the room', { x: 7.0, y: 1.5, w: 5.7, h: 0.35, fontFace: ctx.F.body, fontSize: 12, bold: true, color: '1A1A1A' }); textBlock(ctx, s, 'top_brands', 7.0, 1.9, 5.7, 4.4, 12); src(ctx, s, 'src_orgs'); }
  s = base(ctx, 'content');
  if (s) { title(ctx, s, 'content_title'); chart(ctx, s, 'formats', 0.6, 1.9, 7.0, 4.0, 'Sessions by format'); tile(ctx, s, 8.4, 1.6, 4.3, 2.0, 'sessions_count', 'Sessions'); tile(ctx, s, 8.4, 3.8, 4.3, 2.0, 'content_hours', 'Of content'); }
  s = base(ctx, 'speakers');
  if (s) { title(ctx, s, 'speakers_title'); chart(ctx, s, 'speaker_seniority', 0.6, 1.9, 6.0, 4.0, 'Speakers by seniority');
    s.addText('On stage', { x: 7.0, y: 1.5, w: 5.7, h: 0.35, fontFace: ctx.F.body, fontSize: 12, bold: true, color: '1A1A1A' }); textBlock(ctx, s, 'speaker_highlights', 7.0, 1.9, 5.7, 4.4, 11); src(ctx, s, 'src_speakers'); }
  s = base(ctx, 'quotes');
  if (s) { s.addText('What leaders said', { x: 0.6, y: 0.4, w: 12, h: 0.9, fontFace: ctx.F.head, fontSize: 30, bold: true, color: hex(ctx.C.accent) });
    [1, 2, 3, 4].forEach((i) => quoteCard(ctx, s, i, 0.6 + ((i - 1) % 2) * 6.15, 1.4 + Math.floor((i - 1) / 2) * 2.65, 5.95, 2.5)); }
  s = base(ctx, 'partners');
  if (s) { title(ctx, s, 'partners_title'); textBlock(ctx, s, 'partners_by_tier', 0.6, 1.5, 12.1, 5.0, 12); }
  s = base(ctx, 'social');
  if (s) { title(ctx, s, 'social_title');
    const rows = [['', 'Pre-event', 'Event day'], ['LinkedIn', 'li_pre', 'li_event'], ['Instagram', 'ig_pre', 'ig_event'], ['YouTube', 'yt_pre', 'yt_event'], ['Total', 'total_pre', 'total_event']];
    rows.forEach((r, i) => r.forEach((c, j) => s.addText(i === 0 || j === 0 ? c : ctx.val(c), { x: 0.6 + j * 3.0, y: 1.6 + i * 0.7, w: 2.9, h: 0.6, fontFace: j ? ctx.F.head : ctx.F.body, fontSize: i === 0 || j === 0 ? 13 : 22, bold: true, color: i === 0 || j === 0 ? '1A1A1A' : hex(ctx.C.dark) })));
    s.addText(ctx.val('multiplier_line'), { x: 0.6, y: 5.2, w: 12, h: 0.5, fontFace: ctx.F.body, fontSize: 16, bold: true, color: '1A1A1A' });
    s.addText(ctx.val('multiplier_basis'), { x: 0.6, y: 5.7, w: 12, h: 0.4, fontFace: ctx.F.body, fontSize: 10, color: '5A5A5A' }); src(ctx, s, 'src_social'); }
  s = base(ctx, 'market');
  if (s) { s.addText('Market context', { x: 0.6, y: 0.4, w: 12, h: 0.9, fontFace: ctx.F.head, fontSize: 30, bold: true, color: hex(ctx.C.accent) });
    [1, 2, 3, 4].forEach((i) => { const x = 0.6 + ((i - 1) % 2) * 6.15, y = 1.5 + Math.floor((i - 1) / 2) * 2.5;
      s.addText(ctx.val(`m${i}_value`), { x, y, w: 5.9, h: 1.0, fontFace: ctx.F.head, fontSize: 26, bold: true, color: hex(ctx.C.dark) });
      s.addText(ctx.val(`m${i}_stat`), { x, y: y + 1.0, w: 5.9, h: 0.5, fontFace: ctx.F.body, fontSize: 14, color: '1A1A1A' });
      s.addText(ctx.val(`m${i}_src`), { x, y: y + 1.45, w: 5.9, h: 0.4, fontFace: ctx.F.body, fontSize: 10, color: '5A5A5A' }); }); }
  photos(ctx);
  close(ctx);
  return pptx;
}

// ---------------- Custom (one sponsor) ----------------
export function buildCustom(ctx) {
  cover(ctx, ctx.filled ? `${ctx.res.placeholders.sponsor_name} × ETBrandEquity` : '{{sponsor_name}} × ETBrandEquity', ctx.val('theme_line'));
  let s = base(ctx, 'mandate');
  if (s) { s.addText('The mandate', { x: 0.6, y: 0.4, w: 12, h: 0.9, fontFace: ctx.F.head, fontSize: 30, bold: true, color: hex(ctx.C.accent) });
    [1, 2, 3, 4].forEach((i) => { const x = 0.6 + ((i - 1) % 2) * 6.15, y = 1.6 + Math.floor((i - 1) / 2) * 2.4;
      ctx.pptx && s.addShape(ctx.pptx.ShapeType.roundRect, { x, y, w: 5.95, h: 2.2, fill: { color: hex(ctx.C.tint) }, line: { type: 'none' }, rectRadius: 0.08 });
      s.addText(String(i), { x: x + 0.2, y: y + 0.15, w: 0.6, h: 0.6, fontFace: ctx.F.head, fontSize: 24, bold: true, color: hex(ctx.C.dark) });
      s.addText(ctx.val('obj' + i), { x: x + 0.2, y: y + 0.8, w: 5.5, h: 1.3, fontFace: ctx.F.body, fontSize: 15, color: '1A1A1A', valign: 'top' }); }); }
  s = base(ctx, 'kpis');
  if (s) { title(ctx, s, 'kpi_title'); tiles(ctx, s, [['leaders_attended', 'Leaders in the room'], ['leaders_committed', 'Committed'], ['attendance_vs_commit', 'Against commitment'], ['touchpoints', 'Programmed touchpoints'], ['content_minutes', 'Content minutes'], ['sov_pct', 'Share of voice'], ['cxo_count', 'CXOs'], ['sectors_count', 'Sectors']]); src(ctx, s, 'src_kpis'); }
  s = base(ctx, 'wishlist');
  if (s) { title(ctx, s, 'wishlist_title'); tiles(ctx, s, [['wishlist_total', 'Target accounts'], ['wishlist_attended', 'In the room'], ['wishlist_met', 'Met'], ['wishlist_met_pct', 'Met rate']], 4, 1.5, 1.9);
    s.addText('Accounts met', { x: 0.6, y: 3.7, w: 12, h: 0.35, fontFace: ctx.F.body, fontSize: 12, bold: true, color: '1A1A1A' }); textBlock(ctx, s, 'accounts_met', 0.6, 4.05, 12.1, 2.4, 13); src(ctx, s, 'src_wishlist'); }
  s = base(ctx, 'audience');
  if (s) { title(ctx, s, 'audience_title'); chart(ctx, s, 'seniority', 0.6, 1.9, 3.9, 4.2, 'Seniority'); chart(ctx, s, 'sector', 4.75, 1.9, 3.9, 4.2, 'Sector'); chart(ctx, s, 'geo', 8.9, 1.9, 3.8, 4.2, 'Region'); src(ctx, s, 'src_audience'); }
  s = base(ctx, 'sov');
  if (s) { title(ctx, s, 'sov_title'); chart(ctx, s, 'sov', 0.6, 1.9, 12.1, 4.4, 'Sponsor-owned sessions (minutes)'); src(ctx, s, 'src_sov'); }
  s = base(ctx, 'delivered');
  if (s) { title(ctx, s, 'delivered_title'); textBlock(ctx, s, 'delivered_lines', 0.6, 1.5, 12.1, 4.8, 15); src(ctx, s, 'src_delivered'); }
  s = base(ctx, 'quotes');
  if (s) { s.addText('What leaders said', { x: 0.6, y: 0.4, w: 12, h: 0.9, fontFace: ctx.F.head, fontSize: 30, bold: true, color: hex(ctx.C.accent) }); [1, 2].forEach((i) => quoteCard(ctx, s, i, 0.6 + (i - 1) * 6.15, 1.5, 5.95, 4.5)); }
  s = base(ctx, 'followups');
  if (s) { title(ctx, s, 'followups_title'); textBlock(ctx, s, 'followup_lines', 0.6, 1.5, 12.1, 4.8, 15); }
  s = base(ctx, 'feedback');
  if (s) { s.addText('What the room said', { x: 0.6, y: 0.4, w: 12, h: 0.9, fontFace: ctx.F.head, fontSize: 30, bold: true, color: hex(ctx.C.accent) });
    tiles(ctx, s, [['feedback_avg', 'Average rating'], ['would_return_pct', 'Would attend again'], ['feedback_n', 'Responses']], 3, 1.5, 2.0);
    s.addText(ctx.val('feedback_quote'), { x: 0.6, y: 4.0, w: 12.1, h: 1.5, fontFace: ctx.F.head, fontSize: 20, italic: true, color: '1A1A1A' }); }
  s = base(ctx, 'roster');
  if (s) { s.addText('Who was in the room', { x: 0.6, y: 0.4, w: 12, h: 0.9, fontFace: ctx.F.head, fontSize: 30, bold: true, color: hex(ctx.C.accent) });
    textBlock(ctx, s, 'roster_col1', 0.6, 1.4, 6.0, 5.2, 9); textBlock(ctx, s, 'roster_col2', 6.8, 1.4, 6.0, 5.2, 9); }
  photos(ctx);
  close(ctx);
  return ctx.pptx;
}

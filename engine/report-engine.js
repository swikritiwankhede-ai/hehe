/*
 * Report Studio engine: one file, no dependencies.
 * Used in three places:
 *   1. n8n Code nodes (tools/build-n8n.mjs pastes this file into each workflow)
 *   2. the local end-to-end run (tools/run-pipeline.mjs)
 *   3. the tests (engine/test.mjs)
 * It normalises uploaded rows, computes every number for the IP and Custom decks,
 * and turns the result into Google Slides batchUpdate requests.
 * Rules it enforces: numbers come only from rows, quotes must be verbatim, no mobile numbers kept.
 */
const ReportEngine = (function () {
  const VERSION = '1.0.0';

  // ---------- small helpers ----------
  const norm = (s) => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const squash = (s) => norm(s).replace(/ /g, '');
  const str = (v) => (v == null ? '' : String(v).trim());
  function num(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    const s = String(v).replace(/,/g, '').replace(/%$/, '').trim();
    const m = s.match(/^(-?\d+(?:\.\d+)?)\s*([kKmM])?$/);
    if (!m) return null;
    let n = parseFloat(m[1]);
    if (m[2]) n *= /k/i.test(m[2]) ? 1e3 : 1e6;
    return n;
  }
  function fmtInt(n) {
    if (n == null || isNaN(n)) return '—';
    const s = String(Math.round(Math.abs(n)));
    // Indian digit grouping: 1,64,137
    const last3 = s.slice(-3), rest = s.slice(0, -3);
    const grouped = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3 : last3;
    return (n < 0 ? '-' : '') + grouped;
  }
  function fmtCompact(n) {
    if (n == null || isNaN(n)) return '—';
    const a = Math.abs(n);
    if (a >= 1e7) return (n / 1e6).toFixed(0) + 'M';
    if (a >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (a >= 1e4) return (n / 1e3).toFixed(0) + 'K';
    return fmtInt(n);
  }
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : null);
  const fmtPct = (p) => (p == null ? '—' : p + '%');
  function parseDate(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number' && v > 20000 && v < 80000) return new Date(Date.UTC(1899, 11, 30) + v * 864e5); // Sheets/Excel serial
    const s = String(v).trim();
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?/);
    if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0));
    m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/); // DD/MM/YYYY (Indian exports)
    if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
    const d = new Date(s);
    return isNaN(d) ? null : d;
  }
  const dayKey = (d) => (d ? d.toISOString().slice(0, 10) : '');
  function toMinutes(t) {
    const m = String(t || '').match(/(\d{1,2})[:.](\d{2})/);
    return m ? +m[1] * 60 + +m[2] : null;
  }
  function hash(s) { // FNV-1a, stable row keys for "append or update"
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  const uniq = (arr) => Array.from(new Set(arr));

  // ---------- classifiers ----------
  function seniorityOf(title) {
    const x = ' ' + norm(title) + ' ';
    if (/ (vp|vice president|svp|evp|avp) /.test(x)) return 'VP';
    if (/ (chief|cxo|ceo|cmo|cto|cio|cdo|coo|cfo|founder|co founder|cofounder|managing director|md|chairman|president|partner) /.test(x)) return 'CXO';
    if (/ (director|head) /.test(x)) return 'Director';
    if (/ (manager|lead|gm|dgm|agm) /.test(x)) return 'Manager';
    if (/ (actor|artist|athlete|author|cricketer|singer) /.test(x)) return 'Guest';
    return 'Other';
  }
  const SENIORITY_ORDER = ['CXO', 'VP', 'Director', 'Manager', 'Other'];
  function isAttended(a) {
    if (str(a.checked_in_at)) return true;
    const s = norm(a.status);
    return /attend|checked|present|yes/.test(s) && !/not|no show|noshow/.test(s);
  }

  // ---------- tabs (the Google Sheet layout) ----------
  const TABS = {
    events: { cols: ['event_key', 'model', 'name', 'edition', 'theme_line', 'date_start', 'date_end', 'venue', 'city', 'vertical', 'hashtag', 'short_name', 'sponsor_name', 'target_attendees', 'target_speakers', 'leaders_committed', 'objectives', 'theme_id', 'accent_hex', 'next_edition', 'status', 'lead_email'], key: ['event_key'], req: ['event_key', 'model', 'name'] },
    sponsors: { cols: ['event_key', 'name', 'group', 'tier', 'logo_url'], key: ['event_key', 'name'], req: ['name'],
      syn: { name: ['sponsor name', 'sponsor', 'partner', 'partner name'], group: ['group', 'tier label', 'category', 'oneworld group'], logo_url: ['logo', 'logo url'] } },
    speakers: { cols: ['event_key', 'name', 'designation', 'company', 'city', 'industry', 'photo_url', 'is_key'], key: ['event_key', 'name'], req: ['name'],
      syn: { name: ['speaker name', 'speaker'], designation: ['title', 'job title', 'desig'], company: ['organisation', 'organization'], photo_url: ['photo', 'photo url', 'image'], is_key: ['key speaker'] } },
    sessions: { cols: ['event_key', 'day', 'start', 'end', 'hall', 'title', 'format', 'owner', 'speakers'], key: ['event_key', 'day', 'start', 'hall', 'title'], req: ['start', 'end', 'title'],
      syn: { title: ['session', 'session title'], start: ['start time', 'from'], end: ['end time', 'to'], owner: ['session owner', 'owned by'], speakers: ['speaker names'] } },
    attendees: { cols: ['event_key', 'first_name', 'last_name', 'email', 'company', 'designation', 'city', 'status', 'lead_source', 'conversion_source', 'registered_at', 'checked_in_at'], key: ['event_key', 'email'], req: ['email'],
      syn: { first_name: ['first name', 'firstname'], last_name: ['last name', 'surname', 'lastname'], email: ['official email', 'email id', 'e mail', 'work email'], company: ['organisation', 'organization', 'company name'], designation: ['title', 'job title'], status: ['attendance', 'attendance status'], lead_source: ['lead source'], conversion_source: ['conversion source', 'utm source', 'channel'], registered_at: ['registration date', 'registered on'], checked_in_at: ['check in time', 'checkin time', 'check in'] },
      drop: ['mobile', 'mobile number', 'phone', 'phone number', 'contact number'] },
    companies: { cols: ['company', 'org_type', 'industry', 'hq_region'], key: ['company'], req: ['company'], global: true },
    wishlist: { cols: ['event_key', 'sponsor', 'person_name', 'email', 'company', 'outcome'], key: ['event_key', 'sponsor', 'email', 'company'], req: ['company'],
      syn: { person_name: ['name', 'person'], outcome: ['status', 'result'] } },
    deliverables: { cols: ['event_key', 'sponsor', 'item', 'committed', 'delivered', 'status', 'day', 'evidence'], key: ['event_key', 'sponsor', 'item'], req: ['item'],
      syn: { item: ['deliverable', 'touchpoint'], committed: ['promised', 'commitment'] } },
    followups: { cols: ['event_key', 'sponsor', 'person_name', 'company', 'request'], key: ['event_key', 'sponsor', 'person_name', 'company'], req: ['company'],
      syn: { person_name: ['name'], request: ['follow up', 'followup', 'ask'] } },
    feedback: { cols: ['event_key', 'email', 'rating', 'would_return', 'comment'], key: ['event_key', 'email'], req: ['rating'],
      syn: { rating: ['score', 'overall rating'], would_return: ['attend again', 'would attend again'] } },
    video_plan: { cols: ['event_key', 'planned_filename', 'video_type', 'leaders', 'session_time', 'hall', 'status'], key: ['event_key', 'planned_filename'], req: ['planned_filename'],
      syn: { planned_filename: ['drive file name auto', 'drive file name', 'file name'], video_type: ['video type', 'type'], leaders: ['leader s', 'leader'] } },
    insights: { cols: ['event_key', 'leader', 'designation', 'company', 'headline', 'quote', 'theme', 'video', 'start_sec', 'photo_url', 'status'], key: ['event_key', 'leader', 'quote'], req: ['leader', 'quote'] },
    photos: { cols: ['event_key', 'url', 'scene', 'caption', 'status'], key: ['event_key', 'url'], req: ['url'] },
    social: { cols: ['event_key', 'platform', 'post_url', 'posted_at', 'text', 'impressions', 'views', 'reach', 'reactions', 'comments', 'shares', 'clicks', 'as_of'], key: ['event_key', 'platform', 'post_url'], req: ['posted_at'],
      syn: { post_url: ['post link', 'permalink', 'url', 'video url', 'content'], posted_at: ['created date', 'publish time', 'published', 'video publish time', 'date', 'post date'], text: ['post text', 'description', 'caption', 'video title', 'title', 'post title'], impressions: ['impression'], views: ['video views', 'plays'], reactions: ['likes', 'reaction'], shares: ['reposts', 'share'], comments: ['comment'], clicks: ['click'] } },
    market: { cols: ['vertical', 'statistic', 'value', 'source', 'source_url', 'year', 'theme_tags', 'status'], key: ['vertical', 'statistic'], req: ['statistic', 'value', 'source', 'year'], global: true },
    custom: { cols: ['event_key', 'key', 'value', 'source'], key: ['event_key', 'key'], req: ['key'] },
    runs: { cols: ['ts', 'workflow', 'event_key', 'status', 'detail'], key: [], req: [] }
  };
  const KINDS = Object.keys(TABS).filter((k) => k !== 'runs');

  function headerMap(kind, headers) {
    const t = TABS[kind]; const map = {}; const dropped = [];
    headers.forEach((h) => {
      const n = norm(h);
      if (!n) return;
      if ((t.drop || []).some((d) => norm(d) === n)) { dropped.push(h); return; }
      let col = t.cols.find((c) => norm(c) === n);
      if (!col && t.syn) col = Object.keys(t.syn).find((c) => t.syn[c].some((s) => norm(s) === n));
      if (col && !Object.values(map).includes(col)) map[h] = col;
    });
    return { map, dropped };
  }

  function detectKind(headers) {
    let best = null, score = 0;
    KINDS.forEach((k) => {
      const { map } = headerMap(k, headers);
      const s = Object.keys(map).length + (TABS[k].req.every((r) => Object.values(map).includes(r)) ? 2 : 0);
      if (s > score) { score = s; best = k; }
    });
    return score >= 3 ? best : null;
  }

  function rowKey(kind, row) {
    const k = TABS[kind].key;
    return k.length ? hash(kind + '|' + k.map((c) => squash(row[c])).join('|')) : '';
  }

  /** Map uploaded rows (objects keyed by the file's headers) onto a tab's columns, validate and dedupe. */
  function normalize(kind, rawRows, opts) {
    opts = opts || {};
    if (!TABS[kind]) throw new Error('Unknown data type "' + kind + '". Use one of: ' + KINDS.join(', '));
    const t = TABS[kind];
    const headers = uniq([].concat(...rawRows.map((r) => Object.keys(r))));
    const { map, dropped } = headerMap(kind, headers);
    const rows = [], rejected = [], warnings = [];
    if (dropped.length) warnings.push('Not stored (personal data): ' + dropped.join(', '));
    const unmapped = headers.filter((h) => !map[h] && !dropped.includes(h));
    if (unmapped.length) warnings.push('Ignored columns: ' + unmapped.join(', '));
    const seen = {};
    rawRows.forEach((raw, i) => {
      const r = {};
      t.cols.forEach((c) => { r[c] = ''; });
      Object.keys(map).forEach((h) => { r[map[h]] = str(raw[h]); });
      if (!t.global && 'event_key' in r && !r.event_key) r.event_key = opts.event_key || '';
      if (kind === 'social' && !r.platform) r.platform = opts.platform || platformOf(r.post_url);
      if (kind === 'attendees') r.email = r.email.toLowerCase();
      if (kind === 'insights' || kind === 'photos') r.status = r.status || 'pending';
      const missing = t.req.filter((c) => !str(r[c]));
      if (!t.global && 'event_key' in r && !r.event_key) missing.push('event_key');
      if (missing.length) { rejected.push({ row: i + 2, reason: 'Missing ' + missing.join(', ') }); return; }
      const rk = rowKey(kind, r);
      if (rk && seen[rk] !== undefined) { rows[seen[rk]] = Object.assign({ row_key: rk }, r); return; }
      if (rk) seen[rk] = rows.length;
      rows.push(Object.assign({ row_key: rk }, r));
    });
    const dupes = rawRows.length - rows.length - rejected.length;
    if (dupes > 0) warnings.push(dupes + ' duplicate rows merged');
    return { kind, rows, rejected, warnings, mapped: map, summary: rows.length + ' rows ready, ' + rejected.length + ' rejected' + (dupes > 0 ? ', ' + dupes + ' duplicates merged' : '') };
  }

  function platformOf(url) {
    const u = String(url || '').toLowerCase();
    if (u.includes('linkedin')) return 'LinkedIn';
    if (u.includes('instagram')) return 'Instagram';
    if (u.includes('youtu')) return 'YouTube';
    if (u.includes('facebook')) return 'Facebook';
    if (u.includes('x.com') || u.includes('twitter')) return 'X';
    return '';
  }

  // ---------- data access ----------
  function forEvent(rows, ek) { return (rows || []).filter((r) => !r.event_key || r.event_key === ek); }
  function approved(rows) { return (rows || []).filter((r) => norm(r.status) === 'approved'); }
  function countBy(items, fn, order) {
    const m = {};
    items.forEach((x) => { const k = fn(x) || 'Not stated'; m[k] = (m[k] || 0) + 1; });
    let out = Object.keys(m).map((k) => [k, m[k]]);
    if (order) out.sort((a, b) => (order.indexOf(a[0]) + 99 * (order.indexOf(a[0]) < 0)) - (order.indexOf(b[0]) + 99 * (order.indexOf(b[0]) < 0)));
    else out.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    return out;
  }
  function topN(pairs, n) {
    if (pairs.length <= n) return pairs;
    const head = pairs.slice(0, n - 1), rest = pairs.slice(n - 1).reduce((s, p) => s + p[1], 0);
    return head.concat([['Other', rest]]);
  }
  const asChart = (pairs, total) => pairs.map((p) => [p[0], p[1], total ? p[1] + ' (' + pct(p[1], total) + '%)' : String(p[1])]);
  function dedupeAttendees(rows) {
    const m = {};
    rows.forEach((r) => { const e = str(r.email).toLowerCase(); if (e) m[e] = r; });
    return Object.values(m);
  }
  function companyIndex(rows) {
    const m = {};
    (rows || []).forEach((c) => { m[squash(c.company)] = c; });
    return m;
  }
  const minutesOf = (s) => { const a = toMinutes(s.start), b = toMinutes(s.end); return a != null && b != null && b > a ? b - a : 0; };
  const isInformal = (s) => /informal|break|lunch|dinner|networking|arrival|tea|registration/.test(norm(s.format + ' ' + s.title));
  function dateRangeText(ev) {
    const a = parseDate(ev.date_start), b = parseDate(ev.date_end);
    const f = (d) => d.getUTCDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()] + ' ' + d.getUTCFullYear();
    if (!a) return str(ev.date_start);
    if (!b || dayKey(a) === dayKey(b)) return f(a);
    return a.getUTCDate() + '–' + f(b);
  }

  // ---------- social windows ----------
  function socialSummary(ev, posts) {
    const start = parseDate(ev.date_start), end = parseDate(ev.date_end) || start;
    const keys = [ev.hashtag, ev.name, ev.short_name].map(norm).filter(Boolean);
    const withText = posts.filter((p) => str(p.text));
    const matched = withText.length ? posts.filter((p) => !str(p.text) || keys.some((k) => norm(p.text).includes(k))) : posts;
    const metric = (p) => num(p.impressions) != null ? num(p.impressions) : num(p.views) != null ? num(p.views) : num(p.reach) || 0;
    const out = { platforms: {}, pre: 0, event: 0, post: 0, posts: matched.length, firstPost: null, asOf: null, warnings: [] };
    if (posts.length && !withText.length) out.warnings.push('Social export has no post text: all posts counted; check they are event posts');
    matched.forEach((p) => {
      const d = parseDate(p.posted_at); if (!d || !start) return;
      const w = d < start ? 'pre' : d <= new Date(end.getTime() + 864e5 - 1) ? 'event' : 'post';
      const pl = p.platform || 'Other';
      out.platforms[pl] = out.platforms[pl] || { pre: 0, event: 0, post: 0, posts: 0 };
      out.platforms[pl][w] += metric(p); out.platforms[pl].posts++;
      out[w] += metric(p);
      if (w === 'pre' && (!out.firstPost || d < out.firstPost)) out.firstPost = d;
      const ao = parseDate(p.as_of); if (ao && (!out.asOf || ao > out.asOf)) out.asOf = ao;
    });
    const eventDays = start ? Math.max(1, Math.round((end - start) / 864e5) + 1) : 1;
    const preDays = out.firstPost ? Math.max(1, Math.round((start - out.firstPost) / 864e5)) : null;
    out.multiplier = preDays && out.pre ? Math.round(((out.event / eventDays) / (out.pre / preDays)) * 10) / 10 : null;
    out.basis = preDays ? 'Daily average on event day' + (eventDays > 1 ? 's' : '') + ' ÷ daily average from first event post (' + dayKey(out.firstPost) + ') to event start' : '';
    return out;
  }

  // ---------- quotes ----------
  const squeeze = (s) => String(s || '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim().toLowerCase();
  /** Keep only quotes that appear word for word in the transcript; drop headline numbers not in the quote. */
  function checkQuotes(transcript, insights) {
    const t = squeeze(transcript);
    return (insights || []).map((q) => {
      const ok = !!q.quote && t.includes(squeeze(q.quote));
      const nums = (String(q.headline || '').match(/\d[\d,.]*/g) || []);
      const numsOk = nums.every((n) => String(q.quote).includes(n));
      return Object.assign({}, q, { verbatim: ok, headline: numsOk ? q.headline : '', reject_reason: ok ? '' : 'Quote not found word for word in the transcript' });
    });
  }
  function pickQuotes(ins, speakers, n) {
    const keySet = new Set((speakers || []).filter((s) => /^(y|yes|true|1)$/i.test(str(s.is_key))).map((s) => squash(s.name)));
    return approved(ins).slice().sort((a, b) => {
      const sa = (/\d/.test(a.quote) ? 2 : 0) + (keySet.has(squash(a.leader)) ? 1 : 0);
      const sb = (/\d/.test(b.quote) ? 2 : 0) + (keySet.has(squash(b.leader)) ? 1 : 0);
      return sb - sa;
    }).filter((q, i, arr) => arr.findIndex((x) => squash(x.leader) === squash(q.leader)) === i).slice(0, n);
  }

  // ---------- result builder ----------
  function Result(model, ev) {
    return { model, event_key: ev.event_key, engine: VERSION, placeholders: {}, charts: {}, images: {}, sections: [], drop: [], readiness: [], blockers: [], warnings: [] };
  }
  function ready(res, source, ok, note) { res.readiness.push({ source, status: ok === true ? 'ready' : ok === false ? 'missing' : 'warn', note }); }
  function section(res, name, keep) { res.sections.push(name); if (!keep) res.drop.push(name); }

  function common(res, ev, data) {
    const P = res.placeholders;
    P.event_name = str(ev.name); P.edition = str(ev.edition); P.theme_line = str(ev.theme_line);
    P.date_venue = [dateRangeText(ev), str(ev.venue)].filter(Boolean).join(' · ');
    P.hashtag = str(ev.hashtag); P.next_edition = str(ev.next_edition) || 'See you at the next edition';
    P.as_of = 'Data as of ' + (data.as_of || new Date().toISOString().slice(0, 10));
    P.report_version = data.version || 'v1';
  }

  function fillQuotes(res, quotes, n) {
    const P = res.placeholders;
    for (let i = 1; i <= n; i++) {
      const q = quotes[i - 1];
      P['q' + i + '_name'] = q ? str(q.leader) : '';
      P['q' + i + '_role'] = q ? [str(q.designation), str(q.company)].filter(Boolean).join(', ') : '';
      P['q' + i + '_headline'] = q ? str(q.headline) : '';
      P['q' + i + '_quote'] = q ? '“' + str(q.quote) + '”' : '';
      if (q && str(q.photo_url)) res.images['q' + i + '_photo'] = str(q.photo_url);
    }
  }
  function fillPhotos(res, photos, n) {
    approved(photos).slice(0, n).forEach((p, i) => { res.images['photo' + (i + 1)] = str(p.url); res.placeholders['photo' + (i + 1) + '_caption'] = str(p.caption); });
    for (let i = 1; i <= n; i++) if (!res.placeholders['photo' + i + '_caption']) res.placeholders['photo' + i + '_caption'] = '';
  }

  // ---------- IP report: event-level value at scale ----------
  function computeIP(data) {
    const ev = data.event, ek = ev.event_key, res = Result('IP', ev), P = res.placeholders;
    common(res, ev, data);
    const att = dedupeAttendees(forEvent(data.attendees, ek));
    const room = att.filter(isAttended);
    const comp = companyIndex(data.companies);
    const speakers = forEvent(data.speakers, ek);
    const sessions = forEvent(data.sessions, ek);
    const sponsors = forEvent(data.sponsors, ek);
    const posts = forEvent(data.social, ek);
    const market = approved(data.market).filter((m) => norm(m.vertical) === norm(ev.vertical || 'BrandEquity'));

    ready(res, 'Event details', !!(ev.name && ev.date_start), ev.date_start ? '' : 'Add date_start on the events tab');
    ready(res, 'Attendees', room.length ? true : att.length ? null : false, att.length ? room.length + ' attended of ' + att.length + ' registered' : 'Upload the OneWorld registrations export');
    ready(res, 'Speakers', speakers.length > 0, speakers.length + ' speakers');
    ready(res, 'Agenda', sessions.length > 0, sessions.length + ' sessions');
    ready(res, 'Sponsors', sponsors.length > 0, sponsors.length + ' sponsors');
    ready(res, 'Social', posts.length ? true : null, posts.length ? posts.length + ' posts' : 'Upload LinkedIn, Instagram and YouTube exports');
    ready(res, 'Leader insights', approved(data.insights.filter((q) => q.event_key === ek)).length ? true : null, 'Approved quotes: ' + approved(data.insights.filter((q) => q.event_key === ek)).length);
    if (!ev.name) res.blockers.push('Event row is missing a name');
    if (!att.length && !speakers.length) res.blockers.push('No attendees and no speakers: nothing to report yet');

    // At a glance
    const orgs = uniq(room.map((a) => squash(a.company)).filter(Boolean));
    const minutes = sessions.filter((s) => !isInformal(s)).reduce((s, x) => s + minutesOf(x), 0);
    const soc = socialSummary(ev, posts);
    P.registrations = fmtInt(att.length); P.attended = fmtInt(room.length);
    P.show_up_pct = fmtPct(pct(room.length, att.length)); P.unique_orgs = fmtInt(orgs.length);
    P.speakers_count = fmtInt(speakers.length); P.sessions_count = fmtInt(sessions.filter((s) => !isInformal(s)).length);
    P.content_hours = minutes ? (Math.round((minutes / 60) * 10) / 10) + ' hrs' : '—';
    P.partners_count = fmtInt(sponsors.length); P.impressions_total = fmtCompact(soc.pre + soc.event);
    P.src_glance = 'Sources: OneWorld registrations and check-in · OneWorld speakers, agenda and sponsors · platform analytics exports. ' + P.as_of;
    section(res, 'glance', att.length || speakers.length);

    // Promised vs delivered (event promises from the sales deck / website)
    const tA = num(ev.target_attendees), tS = num(ev.target_speakers);
    P.target_attendees = tA ? fmtInt(tA) + '+' : '—'; P.target_speakers = tS ? fmtInt(tS) + '+' : '—';
    P.attendees_vs_target = tA ? fmtPct(pct(room.length, tA)) + ' of target' : '';
    P.speakers_vs_target = tS ? fmtPct(pct(speakers.length, tS)) + ' of target' : '';
    section(res, 'promise', (tA || tS) && room.length);

    // Who was in the room: seniority
    const sen = countBy(room, (a) => { const s = seniorityOf(a.designation); return s === 'Guest' ? 'Other' : s; }, SENIORITY_ORDER);
    const cxo = room.filter((a) => seniorityOf(a.designation) === 'CXO').length;
    res.charts.seniority = asChart(sen, room.length);
    P.cxo_count = fmtInt(cxo); P.cxo_pct = fmtPct(pct(cxo, room.length));
    P.room_title = room.length ? pct(cxo, room.length) + '% of the room were CXOs' : 'Who was in the room';
    P.src_room = 'n = ' + fmtInt(room.length) + ' attendees (checked in) · seniority from job titles';
    section(res, 'room', room.length);

    // Organisations
    const typed = room.map((a) => (comp[squash(a.company)] || {}).org_type || 'Unclassified');
    const orgPairs = countBy(typed.map((t) => ({ t })), (x) => x.t);
    res.charts.orgtype = asChart(topN(orgPairs, 6), room.length);
    const brands = countBy(room.filter((a) => norm((comp[squash(a.company)] || {}).org_type) === 'brand'), (a) => str(a.company));
    P.top_brands = brands.slice(0, 14).map((b) => b[0]).join('  ·  ') || '—';
    const brandPct = pct(typed.filter((t) => norm(t) === 'brand').length, room.length);
    P.orgs_title = room.length ? (brandPct != null ? brandPct + '% of attendees came from brands' : fmtInt(orgs.length) + ' organisations in the room') : '';
    const unclassified = typed.filter((t) => t === 'Unclassified').length;
    P.src_orgs = 'n = ' + fmtInt(room.length) + ' attendees, ' + fmtInt(orgs.length) + ' organisations · organisation type from the companies tab' + (unclassified ? ' · ' + unclassified + ' unclassified' : '');
    if (room.length && unclassified / room.length > 0.3) res.warnings.push(unclassified + ' attendees work at companies with no org type: fill the companies tab');
    section(res, 'orgs', room.length);

    // Content
    res.charts.formats = asChart(countBy(sessions.filter((s) => !isInformal(s)), (s) => cap(s.format) || 'Session'));
    P.content_title = sessions.length ? P.sessions_count + ' sessions, ' + P.content_hours + ' of content' : '';
    section(res, 'content', sessions.length);

    // Speakers
    const spSen = countBy(speakers, (s) => { const x = seniorityOf(s.designation); return x === 'Guest' ? 'Other' : x; }, SENIORITY_ORDER);
    const spCxo = speakers.filter((s) => seniorityOf(s.designation) === 'CXO').length;
    res.charts.speaker_seniority = asChart(spSen, speakers.length);
    P.speakers_title = speakers.length ? pct(spCxo, speakers.length) + '% of speakers were CXOs' : '';
    P.speaker_highlights = speakers.filter((s) => seniorityOf(s.designation) === 'CXO' && str(s.company)).slice(0, 8).map((s) => s.name + ', ' + s.designation + ', ' + s.company).join('\n');
    P.src_speakers = 'n = ' + speakers.length + ' speakers · OneWorld speakers / event website';
    section(res, 'speakers', speakers.length);

    // Leader quotes
    const quotes = pickQuotes(data.insights.filter((q) => q.event_key === ek), speakers, 4);
    fillQuotes(res, quotes, 4);
    section(res, 'quotes', quotes.length);

    // Partners by tier
    const byGroup = {};
    sponsors.forEach((s) => { const g = str(s.group) || str(s.tier) || 'Partners'; (byGroup[g] = byGroup[g] || []).push(str(s.name)); });
    P.partners_title = sponsors.length + ' partners across ' + Object.keys(byGroup).length + ' groups';
    P.partners_by_tier = Object.keys(byGroup).map((g) => g + ': ' + byGroup[g].join(', ')).join('\n');
    sponsors.filter((s) => str(s.logo_url)).slice(0, 12).forEach((s, i) => { res.images['logo' + (i + 1)] = str(s.logo_url); });
    section(res, 'partners', sponsors.length);

    // Social reach
    const plat = (k) => soc.platforms[k] || { pre: 0, event: 0 };
    [['li', 'LinkedIn'], ['ig', 'Instagram'], ['yt', 'YouTube']].forEach(([s, k]) => {
      P[s + '_pre'] = soc.platforms[k] ? fmtCompact(plat(k).pre) : '—';
      P[s + '_event'] = soc.platforms[k] ? fmtCompact(plat(k).event) : '—';
    });
    P.total_pre = fmtCompact(soc.pre); P.total_event = fmtCompact(soc.event);
    P.social_title = posts.length ? fmtCompact(soc.pre + soc.event) + ' impressions and views across ' + Object.keys(soc.platforms).length + ' platforms' : '';
    P.multiplier_line = soc.multiplier ? 'Event-day reach ran at ' + soc.multiplier + 'x the pre-event daily average' : '';
    P.multiplier_basis = soc.basis;
    P.src_social = 'Platform analytics exports (LinkedIn page, Meta Business Suite, YouTube Studio) · ' + soc.posts + ' event posts' + (soc.asOf ? ' · as of ' + dayKey(soc.asOf) : '');
    res.warnings.push.apply(res.warnings, soc.warnings);
    section(res, 'social', posts.length);

    // Market context
    market.slice().sort((a, b) => (num(b.year) || 0) - (num(a.year) || 0)).slice(0, 4).forEach((m, i) => {
      P['m' + (i + 1) + '_value'] = str(m.value); P['m' + (i + 1) + '_stat'] = str(m.statistic); P['m' + (i + 1) + '_src'] = str(m.source) + ' ' + str(m.year);
    });
    for (let i = 1; i <= 4; i++) ['value', 'stat', 'src'].forEach((f) => { if (P['m' + i + '_' + f] == null) P['m' + i + '_' + f] = ''; });
    section(res, 'market', market.length);

    fillPhotos(res, forEvent(data.photos, ek), 6);
    section(res, 'photos', approved(forEvent(data.photos, ek)).length);
    section(res, 'cover', true); section(res, 'close', true);
    return res;
  }

  // ---------- Custom report: one sponsor's commitments delivered ----------
  function computeCustom(data) {
    const ev = data.event, ek = ev.event_key, res = Result('Custom', ev), P = res.placeholders;
    common(res, ev, data);
    const sp = str(ev.sponsor_name), spK = squash(sp);
    const att = dedupeAttendees(forEvent(data.attendees, ek));
    const room = att.filter(isAttended);
    const comp = companyIndex(data.companies);
    const sessions = forEvent(data.sessions, ek);
    const wish = forEvent(data.wishlist, ek).filter((w) => !str(w.sponsor) || squash(w.sponsor) === spK);
    const deliv = forEvent(data.deliverables, ek).filter((d) => !str(d.sponsor) || squash(d.sponsor) === spK);
    const fups = forEvent(data.followups, ek).filter((f) => !str(f.sponsor) || squash(f.sponsor) === spK);
    const fb = forEvent(data.feedback, ek);
    P.sponsor_name = sp;

    ready(res, 'Event details', !!(ev.name && sp), sp ? '' : 'Add sponsor_name on the events tab');
    ready(res, 'Room check-in', room.length > 0, room.length + ' leaders checked in');
    ready(res, 'Run-of-show', sessions.length > 0, sessions.length + ' sessions');
    ready(res, 'Wishlist', wish.length ? true : null, wish.length + ' target accounts');
    ready(res, 'Commitments', deliv.length ? true : null, deliv.length + ' committed deliverables');
    ready(res, 'Follow-ups', fups.length ? true : null, fups.length + ' requests');
    ready(res, 'Feedback', fb.length ? true : null, fb.length + ' responses');
    if (!sp) res.blockers.push('Custom event needs sponsor_name');
    if (!room.length) res.blockers.push('No room check-in yet');

    // Mandate
    const objs = str(ev.objectives).split('|').map(str).filter(Boolean);
    for (let i = 1; i <= 4; i++) P['obj' + i] = objs[i - 1] || '';
    section(res, 'mandate', objs.length);

    // Headline KPIs
    const committed = num(ev.leaders_committed);
    const content = sessions.filter((s) => !isInformal(s));
    const contentMin = content.reduce((s, x) => s + minutesOf(x), 0);
    const owned = content.filter((s) => squash(s.owner) === spK);
    const ownedMin = owned.reduce((s, x) => s + minutesOf(x), 0);
    const sen = room.map((a) => seniorityOf(a.designation));
    const cxo = sen.filter((s) => s === 'CXO').length;
    const senior = sen.filter((s) => s === 'CXO' || s === 'VP' || s === 'Director').length;
    const industries = room.map((a) => (comp[squash(a.company)] || {}).industry).filter(Boolean);
    P.leaders_attended = fmtInt(room.length); P.leaders_committed = committed ? fmtInt(committed) : '—';
    P.attendance_vs_commit = committed ? fmtPct(pct(room.length, committed)) : '—';
    P.touchpoints = fmtInt(sessions.length); P.content_minutes = fmtInt(contentMin);
    P.sponsor_minutes = fmtInt(ownedMin); P.sov_pct = fmtPct(pct(ownedMin, contentMin));
    P.cxo_count = fmtInt(cxo); P.sectors_count = fmtInt(uniq(industries).length);
    P.kpi_title = committed ? room.length + ' leaders in the room against ' + committed + ' committed' : room.length + ' leaders in the room';
    P.src_kpis = 'Sources: room check-in · run-of-show with session owners · signed proposal. ' + P.as_of;
    section(res, 'kpis', true);

    // Wishlist met
    const roomEmails = new Set(room.map((a) => str(a.email).toLowerCase()));
    const roomCos = new Set(room.map((a) => squash(a.company)));
    const outcome = (w) => {
      const o = norm(w.outcome);
      if (o) return /met/.test(o) && !/not met/.test(o) ? 'met' : /attend/.test(o) && !/not attend/.test(o) ? 'attended' : 'absent';
      return (str(w.email) && roomEmails.has(str(w.email).toLowerCase())) || roomCos.has(squash(w.company)) ? 'attended' : 'absent';
    };
    const wo = wish.map((w) => ({ w, o: outcome(w) }));
    const met = wo.filter((x) => x.o === 'met'), inRoom = wo.filter((x) => x.o !== 'absent');
    P.wishlist_total = fmtInt(wish.length); P.wishlist_attended = fmtInt(inRoom.length);
    P.wishlist_met = fmtInt(met.length); P.wishlist_met_pct = fmtPct(pct(met.length, wish.length));
    P.wishlist_title = wish.length ? inRoom.length + ' of ' + wish.length + ' target accounts were in the room' : '';
    P.accounts_met = uniq(met.map((x) => str(x.w.company))).join('  ·  ') || '—';
    P.src_wishlist = 'Target list agreed with ' + sp + ' · outcomes from the session desk and check-in';
    section(res, 'wishlist', wish.length);

    // Audience quality
    res.charts.seniority = asChart(countBy(sen.map((s) => ({ s: s === 'Guest' ? 'Other' : s })), (x) => x.s, SENIORITY_ORDER), room.length);
    res.charts.sector = asChart(topN(countBy(room, (a) => (comp[squash(a.company)] || {}).industry || 'Not stated'), 6), room.length);
    res.charts.geo = asChart(topN(countBy(room, (a) => (comp[squash(a.company)] || {}).hq_region || str(a.city) || 'Not stated'), 5), room.length);
    P.audience_title = room.length ? pct(senior, room.length) + '% of the room were CXO, VP or Director' : '';
    P.orgs_count = fmtInt(uniq(room.map((a) => squash(a.company))).length);
    P.src_audience = 'n = ' + room.length + ' leaders · seniority from job titles · sector and region from the companies tab';
    section(res, 'audience', room.length);

    // Share of voice
    res.charts.sov = owned.map((s) => [str(s.title), minutesOf(s), minutesOf(s) + ' min']);
    P.sov_title = contentMin ? sp + ' owned ' + pct(ownedMin, contentMin) + '% of content minutes (' + ownedMin + ' of ' + contentMin + ')' : '';
    P.src_sov = 'Run-of-show: sessions tagged by owner; informal blocks excluded';
    section(res, 'sov', owned.length);

    // Delivered vs committed
    const isDone = (d) => /deliver|done|yes|complete/.test(norm(d.status)) && !/not|partial/.test(norm(d.status));
    const done = deliv.filter(isDone).length;
    P.delivered_title = deliv.length ? done + ' of ' + deliv.length + ' commitments delivered' : '';
    P.delivered_lines = deliv.map((d) => (isDone(d) ? '✓ ' : /partial/.test(norm(d.status)) ? '◐ ' : '✗ ') + str(d.item) +
      (str(d.day) ? ' · ' + str(d.day) : '') + (str(d.committed) || str(d.delivered) ? ' · committed ' + (str(d.committed) || '—') + ', delivered ' + (str(d.delivered) || '—') : '')).join('\n');
    P.src_delivered = 'Committed: signed proposal · delivered: ops checklist with evidence';
    section(res, 'delivered', deliv.length);

    const quotes = pickQuotes(data.insights.filter((q) => q.event_key === ek), [], 2);
    fillQuotes(res, quotes, 2);
    section(res, 'quotes', quotes.length);

    // Follow-ups
    P.followups_title = fups.length ? fups.length + ' leaders asked ' + sp + ' to follow up' : '';
    P.followup_lines = fups.slice(0, 12).map((f) => str(f.company) + (str(f.request) ? ': ' + str(f.request) : '')).join('\n');
    section(res, 'followups', fups.length);

    // Feedback
    const ratings = fb.map((f) => num(f.rating)).filter((x) => x != null);
    const ret = fb.filter((f) => str(f.would_return));
    const yes = ret.filter((f) => /^(y|yes|true|1)/i.test(str(f.would_return))).length;
    P.feedback_avg = ratings.length ? (Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10) + ' / 5' : '—';
    P.would_return_pct = fmtPct(pct(yes, ret.length)); P.feedback_n = 'n = ' + fb.length + ' responses';
    const best = fb.filter((f) => num(f.rating) >= 5 && str(f.comment)).map((f) => str(f.comment)).sort((a, b) => a.length - b.length)[0];
    P.feedback_quote = best ? '“' + best + '”' : '';
    section(res, 'feedback', fb.length);

    // Roster (named list is part of what a Custom sponsor buys)
    const rank = (a) => SENIORITY_ORDER.indexOf(seniorityOf(a.designation) === 'Guest' ? 'Other' : seniorityOf(a.designation));
    const lines = room.slice().sort((a, b) => rank(a) - rank(b) || str(a.first_name).localeCompare(str(b.first_name)))
      .map((a) => [str(a.first_name), str(a.last_name)].filter(Boolean).join(' ') + ' · ' + str(a.designation) + ', ' + str(a.company)).slice(0, 40);
    const half = Math.ceil(lines.length / 2);
    P.roster_col1 = lines.slice(0, half).join('\n'); P.roster_col2 = lines.slice(half).join('\n');
    section(res, 'roster', room.length);

    fillPhotos(res, forEvent(data.photos, ek), 6);
    section(res, 'photos', approved(forEvent(data.photos, ek)).length);
    section(res, 'cover', true); section(res, 'close', true);
    return res;
  }

  function cap(s) { s = str(s); return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : ''; }

  /** data = { event, attendees, speakers, sessions, sponsors, companies, social, insights, photos, market, wishlist, deliverables, followups, feedback } */
  function compute(data) {
    const d = Object.assign({ custom: [], attendees: [], speakers: [], sessions: [], sponsors: [], companies: [], social: [], insights: [], photos: [], market: [], wishlist: [], deliverables: [], followups: [], feedback: [] }, data);
    if (!d.event) throw new Error('No event row found for this event key');
    const res = norm(d.event.model) === 'custom' ? computeCustom(d) : computeIP(d);
    // Team-added slides: any {{key}} typed into a template is filled from the custom tab (computed values win).
    (d.custom || []).forEach((c) => { const k = str(c.key).replace(/[{}]/g, ''); if (k && res.placeholders[k] === undefined) res.placeholders[k] = str(c.value); });
    return res;
  }

  /** Pick one event's data out of whole-sheet tabs. */
  function selectEvent(tabs, eventKey) {
    const ev = (tabs.events || []).find((e) => str(e.event_key) === eventKey);
    const out = { event: ev };
    KINDS.filter((k) => k !== 'events').forEach((k) => { out[k] = TABS[k].global ? (tabs[k] || []) : forEvent(tabs[k] || [], eventKey).filter((r) => r.event_key === eventKey); });
    return out;
  }

  // ---------- theme ----------
  function hexToRgb(h) { const m = String(h || '').replace('#', '').match(/^([0-9a-f]{6})$/i); if (!m) return null; const n = parseInt(m[1], 16); return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }; }
  function rgbToHex(c) { return '#' + [c.r, c.g, c.b].map((v) => ('0' + Math.round(v).toString(16)).slice(-2)).join('').toUpperCase(); }
  function themeFrom(accentHex) {
    const a = hexToRgb(accentHex) || hexToRgb('#E7425F');
    const mix = (t, w) => ({ r: a.r * (1 - w) + t * w, g: a.g * (1 - w) + t * w, b: a.b * (1 - w) + t * w });
    return { accent: rgbToHex(a), dark: rgbToHex(mix(0, 0.2)), tint: rgbToHex(mix(255, 0.88)), text: '#1A1A1A', muted: '#5A5A5A' };
  }
  // Template colours the engine swaps for the event theme (pure magentas nobody uses on purpose).
  const SENTINELS = { accent: '#FF00AA', dark: '#AA0077', tint: '#FFD6F0' };

  // ---------- Google Slides ----------
  const toSlidesRgb = (hex) => { const c = hexToRgb(hex); return { red: c.r / 255, green: c.g / 255, blue: c.b / 255 }; };
  function sameColor(rgb, hex) {
    if (!rgb) return false;
    const c = hexToRgb(hex), t = 0.02;
    return Math.abs((rgb.red || 0) - c.r / 255) < t && Math.abs((rgb.green || 0) - c.g / 255) < t && Math.abs((rgb.blue || 0) - c.b / 255) < t;
  }
  function elementsOf(page) {
    const out = [];
    const walk = (els) => (els || []).forEach((e) => { out.push(e); if (e.elementGroup) walk(e.elementGroup.children); });
    walk(page.pageElements);
    return out;
  }
  function textOf(el) {
    const tes = (el.shape && el.shape.text && el.shape.text.textElements) || [];
    return tes.map((t) => (t.textRun && t.textRun.content) || '').join('');
  }

  /**
   * Build the batchUpdate requests that turn a copied template into the finished deck.
   * presentation = GET https://slides.googleapis.com/v1/presentations/{id}
   */
  function slidesRequests(presentation, res, theme) {
    theme = theme || themeFrom();
    const reqs = [], slides = presentation.slides || [];
    const dropPages = new Set();
    // 1. drop sections that have no data
    slides.forEach((pg) => {
      const txt = elementsOf(pg).map(textOf).join(' ');
      res.drop.forEach((s) => { if (txt.includes('[[section:' + s + ']]')) dropPages.add(pg.objectId); });
    });
    dropPages.forEach((id) => reqs.push({ deleteObject: { objectId: id } }));
    // 2. charts drawn as bars inside their placeholder box
    slides.filter((pg) => !dropPages.has(pg.objectId)).forEach((pg, pi) => {
      elementsOf(pg).forEach((el) => {
        const m = textOf(el).match(/\{\{chart:([a-z0-9_]+)\}\}/);
        if (!m) return;
        const rows = (res.charts[m[1]] || []).filter((r) => r[1] > 0);
        if (!rows.length) return; // replaced with blank text below
        const tr = el.transform || {}, sz = el.size || {};
        const W = (sz.width ? sz.width.magnitude : 3e6) * (tr.scaleX || 1), H = (sz.height ? sz.height.magnitude : 2e6) * (tr.scaleY || 1);
        const X = tr.translateX || 0, Y = tr.translateY || 0;
        const max = Math.max.apply(null, rows.map((r) => r[1]));
        const rowH = H / rows.length, barH = Math.min(rowH * 0.55, 380000);
        const fontPt = Math.max(9, Math.min(14, Math.round(rowH / 12700 * 0.32)));
        const base = 'c' + pi + '_' + m[1].replace(/[^a-z0-9]/g, '') + '_' + el.objectId.replace(/[^a-zA-Z0-9]/g, '').slice(-6);
        rows.forEach((r, i) => {
          const y = Y + i * rowH, id = (base + '_' + i).slice(0, 44);
          const labelW = W * 0.32, barMax = W * 0.5, valueW = W * 0.18;
          const box = (oid, x, w, h, yy) => ({ pageObjectId: pg.objectId, size: { width: { magnitude: Math.max(1, w), unit: 'EMU' }, height: { magnitude: h, unit: 'EMU' } }, transform: { scaleX: 1, scaleY: 1, translateX: x, translateY: yy, unit: 'EMU' } });
          const textBox = (oid, x, w, text, color, bold) => {
            reqs.push({ createShape: { objectId: oid, shapeType: 'TEXT_BOX', elementProperties: box(oid, x, w, rowH, y) } });
            reqs.push({ insertText: { objectId: oid, text: text } });
            reqs.push({ updateTextStyle: { objectId: oid, textRange: { type: 'ALL' }, style: { fontFamily: 'Montserrat', fontSize: { magnitude: fontPt, unit: 'PT' }, bold: !!bold, foregroundColor: { opaqueColor: { rgbColor: toSlidesRgb(color) } } }, fields: 'fontFamily,fontSize,bold,foregroundColor' } });
            reqs.push({ updateShapeProperties: { objectId: oid, shapeProperties: { contentAlignment: 'MIDDLE' }, fields: 'contentAlignment' } });
          };
          textBox(id + 'l', X, labelW, String(r[0]), theme.text, false);
          reqs.push({ createShape: { objectId: id + 'b', shapeType: 'RECTANGLE', elementProperties: box(id + 'b', X + labelW, (r[1] / max) * barMax, barH, y + (rowH - barH) / 2) } });
          reqs.push({ updateShapeProperties: { objectId: id + 'b', shapeProperties: { shapeBackgroundFill: { solidFill: { color: { rgbColor: toSlidesRgb(theme.accent) } } }, outline: { propertyState: 'NOT_RENDERED' } }, fields: 'shapeBackgroundFill.solidFill.color,outline.propertyState' } });
          textBox(id + 'v', X + labelW + barMax + W * 0.01, valueW, String(r[2] || r[1]), theme.text, true);
        });
        reqs.push({ deleteObject: { objectId: el.objectId } });
      });
    });
    // 3. theme colours: swap template sentinels for the event's colours
    const sentinelMap = [[SENTINELS.accent, theme.accent], [SENTINELS.dark, theme.dark], [SENTINELS.tint, theme.tint]];
    slides.filter((pg) => !dropPages.has(pg.objectId)).forEach((pg) => {
      const bg = pg.pageProperties && pg.pageProperties.pageBackgroundFill && pg.pageProperties.pageBackgroundFill.solidFill;
      sentinelMap.forEach(([s, t]) => {
        if (bg && bg.color && sameColor(bg.color.rgbColor, s)) reqs.push({ updatePageProperties: { objectId: pg.objectId, pageProperties: { pageBackgroundFill: { solidFill: { color: { rgbColor: toSlidesRgb(t) } } } }, fields: 'pageBackgroundFill.solidFill.color' } });
      });
      elementsOf(pg).forEach((el) => {
        if (!el.shape || /\{\{chart:/.test(textOf(el))) return;
        const fill = el.shape.shapeProperties && el.shape.shapeProperties.shapeBackgroundFill && el.shape.shapeProperties.shapeBackgroundFill.solidFill;
        sentinelMap.forEach(([s, t]) => {
          if (fill && fill.color && sameColor(fill.color.rgbColor, s)) reqs.push({ updateShapeProperties: { objectId: el.objectId, shapeProperties: { shapeBackgroundFill: { solidFill: { color: { rgbColor: toSlidesRgb(t) } } } }, fields: 'shapeBackgroundFill.solidFill.color' } });
        });
        ((el.shape.text && el.shape.text.textElements) || []).forEach((te) => {
          const fc = te.textRun && te.textRun.style && te.textRun.style.foregroundColor && te.textRun.style.foregroundColor.opaqueColor;
          if (!fc) return;
          sentinelMap.forEach(([s, t]) => {
            if (sameColor(fc.rgbColor, s) && te.endIndex > (te.startIndex || 0)) reqs.push({ updateTextStyle: { objectId: el.objectId, textRange: { type: 'FIXED_RANGE', startIndex: te.startIndex || 0, endIndex: te.endIndex }, style: { foregroundColor: { opaqueColor: { rgbColor: toSlidesRgb(t) } } }, fields: 'foregroundColor' } });
          });
        });
      });
    });
    // 4. images (URLs must be publicly readable, e.g. website logos or Drive files shared "anyone with the link")
    Object.keys(res.images).forEach((k) => {
      reqs.push({ replaceAllShapesWithImage: { imageUrl: res.images[k], imageReplaceMethod: 'CENTER_CROP', containsText: { text: '{{img:' + k + '}}', matchCase: true } } });
    });
    // 5. text: every placeholder, then clear leftovers
    Object.keys(res.placeholders).forEach((k) => {
      reqs.push({ replaceAllText: { containsText: { text: '{{' + k + '}}', matchCase: true }, replaceText: String(res.placeholders[k]) } });
    });
    const leftovers = new Set();
    slides.filter((pg) => !dropPages.has(pg.objectId)).forEach((pg) => elementsOf(pg).forEach((el) => {
      (textOf(el).match(/\{\{(img:|chart:)?[a-z0-9_]+\}\}|\[\[section:[a-z_]+\]\]/g) || []).forEach((t) => leftovers.add(t));
    }));
    leftovers.forEach((t) => {
      const k = t.replace(/[{}]/g, '');
      if (res.placeholders[k] !== undefined) return;
      if (/^img:/.test(k) && res.images[k.slice(4)]) return;
      reqs.push({ replaceAllText: { containsText: { text: t, matchCase: true }, replaceText: '' } });
    });
    return reqs;
  }

  /** Readable summary for the n8n form ending page / email. */
  function summaryText(res) {
    const lines = ['Report ' + res.model + ' · ' + res.event_key + ' · engine ' + res.engine];
    res.readiness.forEach((r) => lines.push((r.status === 'ready' ? '✓ ' : r.status === 'missing' ? '✗ ' : '! ') + r.source + (r.note ? ': ' + r.note : '')));
    if (res.drop.length) lines.push('Sections left out (no data): ' + res.drop.join(', '));
    res.warnings.forEach((w) => lines.push('Note: ' + w));
    res.blockers.forEach((b) => lines.push('BLOCKED: ' + b));
    return lines.join('\n');
  }

  return { VERSION, TABS, KINDS, rowKey, hash, normalize, detectKind, compute, selectEvent, checkQuotes, seniorityOf, socialSummary, slidesRequests, themeFrom, SENTINELS, summaryText, fmtInt, fmtCompact, parseDate };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = ReportEngine;

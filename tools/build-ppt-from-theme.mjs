// Builds a sponsor-facing PPT from a frozen theme file + report data.
// Usage: node tools/build-ppt-from-theme.mjs <theme.json> <report.json> <out.pptx>
// Needs pptxgenjs (npm i pptxgenjs). The theme_id is stamped into file metadata,
// slide-1 speaker notes and the file name so every deck traces back to its theme.
import fs from "node:fs";
import pptxgen from "pptxgenjs";

const [themePath, reportPath, outPath] = process.argv.slice(2);
const theme = JSON.parse(fs.readFileSync(themePath, "utf8"));
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
if (theme.status !== "approved") throw new Error(`Theme ${theme.theme_id} is ${theme.status}, not approved`);
if (report.theme_id !== theme.theme_id) throw new Error(`Report expects ${report.theme_id}, got ${theme.theme_id}`);

const d = theme.derived, t = theme.tokens;
const hex = (h) => h.replace("#", "");
const C = { accent: hex(d["hex.accent"]), tint: hex(d["hex.accent_tint"]), dark: hex(d["hex.accent_dark"]), bg: hex(d["hex.bg"]), text: hex(d["hex.text"]), muted: "5A5A5A" };
const F = { head: theme.fonts.heading.ppt_face, body: theme.fonts.body.ppt_face };
const S = { title: d["ppt.size.title"], sub: d["ppt.size.subtitle"], body: d["ppt.size.body"], cap: d["ppt.size.caption"] };

const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
pptx.title = `${theme.event.name} · Post-event report`;
pptx.company = "ET BrandEquity";
pptx.subject = `theme_id=${theme.theme_id}; theme_checksum=${theme.checksum}; report_version=${report.report_version}`;

const footer = { text: `${t["event.hashtag"]}  ·  ${theme.event.name}`, options: { x: 0.5, y: 7.05, w: 8, h: 0.3, fontFace: F.body, fontSize: S.cap, color: C.muted } };

pptx.defineSlideMaster({ title: "COVER", background: { color: C.accent }, objects: [] });
pptx.defineSlideMaster({
  title: "SECTION", background: { color: C.bg },
  objects: [{ rect: { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: C.accent } } }, { text: footer }],
  slideNumber: { x: 12.4, y: 7.05, fontFace: F.body, fontSize: S.cap, color: C.muted },
});

// Cover: white on accent only at large bold sizes (contrast 3.9:1).
const cover = pptx.addSlide({ masterName: "COVER" });
cover.addText(t["event.edition"], { x: 0.7, y: 0.6, w: 4, h: 0.5, fontFace: F.body, fontSize: 18, bold: true, color: "FFFFFF" });
cover.addText(theme.event.name, { x: 0.7, y: 2.4, w: 11.5, h: 1.2, fontFace: F.head, fontSize: 48, bold: true, color: "FFFFFF" });
cover.addText(report.theme_line, { x: 0.7, y: 3.6, w: 11.5, h: 0.8, fontFace: F.head, fontSize: 26, bold: true, color: "FFFFFF" });
cover.addText(`${report.date_venue}`, { x: 0.7, y: 4.5, w: 11.5, h: 0.5, fontFace: F.body, fontSize: 18, bold: true, color: "FFFFFF" });
cover.addText([{ text: "Post-event report", options: { bold: true } }, { text: `   ${t["event.hashtag"]}` }], { x: 0.7, y: 6.4, w: 8, h: 0.5, fontFace: F.body, fontSize: 18, color: "FFFFFF" });
cover.addNotes(`theme_id: ${theme.theme_id}\nchecksum: ${theme.checksum}\nreport_version: ${report.report_version}\nsource: ${theme.source.system} · ${theme.source.screen}`);

// Headline numbers: heading colour = accent (large), labels in body text colour.
const stats = pptx.addSlide({ masterName: "SECTION" });
stats.addText("The event at scale", { x: 0.6, y: 0.5, w: 12, h: 0.8, fontFace: F.head, fontSize: S.title, bold: true, color: hex(d["hex.heading"]) });
report.headline.forEach((m, i) => {
  const x = 0.6 + (i % 3) * 4.1, y = 1.7 + Math.floor(i / 3) * 2.5;
  stats.addShape(pptx.ShapeType.roundRect, { x, y, w: 3.8, h: 2.2, fill: { color: C.tint }, line: { color: C.tint }, rectRadius: 0.1 });
  stats.addText(m.value, { x: x + 0.25, y: y + 0.25, w: 3.3, h: 1.0, fontFace: F.head, fontSize: 40, bold: true, color: C.dark });
  stats.addText(m.label, { x: x + 0.25, y: y + 1.25, w: 3.3, h: 0.5, fontFace: F.body, fontSize: S.body, color: C.text });
  stats.addText(`Source: ${m.source}`, { x: x + 0.25, y: y + 1.7, w: 3.3, h: 0.35, fontFace: F.body, fontSize: S.cap, color: C.muted });
});
if (report.sample) stats.addText("SAMPLE FIGURES — not BWS 2025 results", { x: 7.5, y: 0.6, w: 5.2, h: 0.4, align: "right", fontFace: F.body, fontSize: S.cap, bold: true, color: C.dark });

// Section divider: shows heading style (colour, weight, Initial case).
const sec = pptx.addSlide({ masterName: "SECTION" });
sec.addText("What speakers said", { x: 0.6, y: 2.6, w: 12, h: 1.2, fontFace: F.head, fontSize: 44, bold: true, color: hex(d["hex.heading"]) });
sec.addText("Verbatim quotes from key speakers, approved by the events team", { x: 0.6, y: 3.8, w: 12, h: 0.6, fontFace: F.body, fontSize: S.sub - 10, color: C.text });

// Closing.
const end = pptx.addSlide({ masterName: "COVER" });
end.addText("Thank you", { x: 0.7, y: 2.6, w: 11.5, h: 1.2, fontFace: F.head, fontSize: 48, bold: true, color: "FFFFFF" });
end.addText(`See you at the next edition  ·  ${t["event.hashtag"]}`, { x: 0.7, y: 3.8, w: 11.5, h: 0.6, fontFace: F.body, fontSize: 20, bold: true, color: "FFFFFF" });

await pptx.writeFile({ fileName: outPath });
console.log(`Wrote ${outPath} with ${theme.theme_id}`);

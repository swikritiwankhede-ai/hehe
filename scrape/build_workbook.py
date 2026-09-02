"""Build the deliverable workbook from the classified keyword CSVs."""
import argparse, csv, collections
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

ap = argparse.ArgumentParser(description=__doc__)
ap.add_argument("--tech", required=True)
ap.add_argument("--review", required=True)
ap.add_argument("--removed", required=True)
ap.add_argument("--summary", required=True)
ap.add_argument("-o", "--out", default="etsignals_vendor_keywords.xlsx")
args = ap.parse_args()
OUT = args.out

read = lambda path: list(csv.DictReader(open(path, encoding="utf-8")))
keep, rev, drop = read(args.tech), read(args.review), read(args.removed)
summ = read(args.summary)
site = {s["domain"]: s["url"] for s in summ}
TYPE = {"product": "Product", "solution": "Solution", "use_case": "Use case",
        "platform": "Platform", "technology": "Technology", "offering": "Offering",
        "capability": "Capability", "service": "Service", "industry": "Industry", "nav": "Menu"}
FOUND = {"sitemap": "Sitemap", "nav_header": "Header menu", "nav_footer": "Footer menu"}

A = "Arial"
HF, HFONT = PatternFill("solid", fgColor="1F3864"), Font(name=A, bold=True, color="FFFFFF", size=10)
BODY, LINK = Font(name=A, size=10), Font(name=A, size=10, color="0563C1", underline="single")
wb = Workbook()

rm = wb.active; rm.title = "Read me"
kv, rvc, dvc = (collections.Counter(r["domain"] for r in x) for x in (keep, rev, drop))
for i, (txt, b) in enumerate([
    ("ETSignals — technology and cybersecurity keywords by sponsor", True), ("", False),
    ("Tech keywords", True),
    (f"{len(keep):,} keywords that name a technology or cybersecurity capability, across", False),
    (f"{len(kv)} of {len(summ)} sponsors. Each carries the domain it belongs to and the", False),
    ("ETSignals category that domain rolls up to.", False), ("", False),
    ("Needs review", True),
    (f"{len(rev):,} labels containing no recognisable technology term. Most are vendor", False),
    ("coinages and brand names — 'Nirikshak', 'Locomate PIS', 'MetaDefender Transfer", False),
    ("Guard' — which only a person can judge. They are NOT junk, and NOT yet included.", False),
    ("", False),
    ("Removed", True),
    (f"{len(drop):,} labels that are definitely not technology, each with the reason:", False),
    ("industries, dates, CVE numbers, language switchers, careers and site sections.", False),
    ("", False),
    ("How a keyword was judged", True),
    ("A keyword is kept only if it contains a term from a 460-term vocabulary spanning", False),
    ("17 domains, from Security Operations to Business Applications. Nothing is guessed:", False),
    ("a label matching neither the vocabulary nor a removal rule goes to Needs review.", False),
    ("", False),
    ("Checking any row", True),
    ("'Source URL' links to the live page the keyword came from. 'Vendor file' links to", False),
    ("that sponsor's folder — unzip vendors_out.zip beside this workbook for it to open.", False),
], start=1):
    rm.cell(row=i, column=1, value=txt).font = Font(name=A, size=11, bold=b)
rm.column_dimensions["A"].width = 92; rm.sheet_view.showGridLines = False

def sheet(name, rows, cols, extra_get):
    ws = wb.create_sheet(name); ws.append(cols)
    for r in rows:
        d = r["domain"]
        ws.append([d, site.get(d, f"https://{d}"), r["label"], *extra_get(r),
                   TYPE.get(r["bucket"], r["bucket"]), FOUND.get(r["source"], r["source"]),
                   r["url"], f"vendors_out/{d}/keywords.csv"])
    for row in ws.iter_rows(min_row=2):
        for c in row: c.font = BODY
        row[1].hyperlink, row[1].font = row[1].value, LINK
        row[-2].hyperlink, row[-2].font = row[-2].value, LINK
        row[-1].hyperlink, row[-1].font = row[-1].value, LINK
    return ws

keep.sort(key=lambda r: (r["domain"], r["category"], r["label"].lower()))
sheet("Tech keywords", keep,
      ["Vendor", "Vendor site", "Keyword", "Domain", "Category", "Type", "Found in",
       "Source URL", "Vendor file"], lambda r: (r["tech_domain"], r["category"]))
rev.sort(key=lambda r: (r["domain"], r["label"].lower()))
sheet("Needs review", rev,
      ["Vendor", "Vendor site", "Label", "Why", "Type", "Found in", "Source URL", "Vendor file"],
      lambda r: (r["reason"],))
drop.sort(key=lambda r: (r["reason"], r["domain"]))
sheet("Removed", drop,
      ["Vendor", "Vendor site", "Label", "Reason", "Type", "Found in", "Source URL", "Vendor file"],
      lambda r: (r["reason"],))

vs = wb.create_sheet("Vendors")
vs.append(["Vendor", "Site", "Tech keywords", "Needs review", "Removed", "Status", "Vendor file", "Note"])
for s in sorted(summ, key=lambda s: -kv[s["domain"]]):
    d = s["domain"]
    st = ("OK" if kv[d] else "No tech keywords" if (rvc[d] or dvc[d]) else "Not extracted")
    vs.append([d, s["url"], kv[d], rvc[d], dvc[d], st, f"vendors_out/{d}/", (s["error"] or "")[:110]])
for row in vs.iter_rows(min_row=2):
    for c in row: c.font = BODY
    row[1].hyperlink, row[1].font = row[1].value, LINK
    row[6].hyperlink, row[6].font = row[6].value, LINK

for name, widths in {"Tech keywords": [22, 30, 44, 30, 26, 12, 13, 56, 38],
                     "Needs review": [22, 30, 46, 26, 12, 13, 56, 38],
                     "Removed": [22, 30, 44, 44, 12, 13, 52, 38],
                     "Vendors": [24, 32, 14, 14, 11, 18, 28, 58]}.items():
    sh = wb[name]
    for j, w in enumerate(widths, start=1):
        sh.column_dimensions[get_column_letter(j)].width = w
    for c in sh[1]:
        c.font, c.fill, c.alignment = HFONT, HF, Alignment(vertical="center")
    sh.row_dimensions[1].height = 22; sh.freeze_panes = "A2"
    sh.auto_filter.ref = f"A1:{get_column_letter(sh.max_column)}{sh.max_row}"

wb.save(OUT)
print(f"written {OUT}: {len(keep):,} tech / {len(rev):,} review / {len(drop):,} removed")

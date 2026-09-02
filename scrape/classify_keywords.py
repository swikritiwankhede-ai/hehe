#!/usr/bin/env python3
"""
Split scraped labels into technology/cybersecurity keywords and everything else.

A label is kept only when it contains a term from tech_vocabulary. Labels matching
an explicit non-technical pattern are dropped with a reason. Anything that matches
neither is sent to a review list rather than being silently guessed at - these are
mostly vendor brand names ("Nirikshak", "Locomate PIS") that need a human to decode.

    python classify_keywords.py all352_clean.csv -o keywords_tech.csv
"""

from __future__ import annotations

import argparse
import collections
import csv
import re
from pathlib import Path

from tech_vocabulary import VOCABULARY, DOMAIN_TO_CATEGORY

# Terms are matched on word boundaries so "sca" does not fire inside "scalable".
DOMAIN_PATTERNS = [
    # a trailing s/es/ing/ed/er is allowed so "penetration test" also matches
    # "penetration testing", and "firewall" matches "firewalls"
    (domain, re.compile("|".join(
        rf"(?<![\w-]){re.escape(t)}(?:s|es|ing|ed|er|ers)?(?![\w-])" for t in terms), re.I))
    for domain, terms in VOCABULARY.items()
]

NON_TECH = [
    ("CVE identifier", re.compile(r"\bcve[\s\-]?\d{4}[\s\-]?\d+", re.I)),
    ("date or release cycle", re.compile(
        r"\b(19|20)\d{2}\b|\b(q[1-4]|h[12])\s*(fy)?\s*\d{2,4}\b|"
        r"\b(winter|spring|summer|fall)\s*[''‘’]?\d{2}\b|"
        r"\b(january|february|march|april|june|july|august|september|october|"
        r"november|december)\b", re.I)),
    ("industry or vertical", re.compile(
        r"^(healthcare|health care|financial services|manufacturing|retail|education|"
        r"public sector|government|insurance|banking|bfsi|telecom|telecommunications|"
        r"energy|utilities|oil & gas|automotive|aerospace|hospitality|logistics|media|"
        r"media & entertainment|pharmaceutical|pharma|legal|non-?profit|higher education|"
        r"k-12|federal|state & local|travel|transportation|real estate|agriculture|"
        r"mining|construction|life sciences|professional services|gaming|sports|defense|"
        r"consumer goods|cpg|automobile|edtech|fintech|ecommerce|e-commerce|"
        r"retail and ecommerce|small business|enterprise|mid-?market|smb|startups?|"
        r"finance|capital markets|private equity|energy & utilities|energy and utilities|"
        r"media and entertainment|media & entertainment|travel & hospitality|"
        r"travel and hospitality|federal government|state government|banking & finance|"
        r"food & beverage|chemicals|textiles|hi-?tech|high tech|public services|"
        r"central government|local government|nbfc|msme|banking and financial services|"
        r"energy utilities|aerospace and defen[cs]e|industrials?|utilities & energy|"
        r"human resources|telecom & media|discrete manufacturing)$", re.I)),
    ("event, report or content", re.compile(
        r"\b(webinar|conference|summit|roadshow|whitepaper|white paper|e-?book|"
        r"datasheet|case stud|podcast|blog|newsletter|press release|award|magazine|"
        r"infographic|meetup|user group|analyst report|gartner|forrester|idc)\b", re.I)),
    ("people, careers or company", re.compile(
        r"\b(career|careers|job openings|leadership team|board of directors|"
        r"investor relations|our team|our story|culture|diversity|life at|"
        r"corporate social|sustainability report|annual report)\b", re.I)),
    ("pricing, legal or admin", re.compile(
        r"\b(pricing|price list|request a quote|licen[cs]e agreement|eula|"
        r"terms of use|privacy policy|cookie|trademark|patent|refund|"
        r"renewal|billing portal|payment options)\b", re.I)),
    ("language switcher", re.compile(
        "^(english|deutsch|fran\u00e7ais|espa\u00f1ol|italiano|portugu\u00eas|nederlands|"
        "svenska|polski|t\u00fcrk\u00e7e|\u0440\u0443\u0441\u0441\u043a\u0438\u0439|"
        "japanese|korean|chinese|spanish|french|german|italian|portuguese|dutch|"
        "\u65e5\u672c\u8a9e|\ud55c\uad6d\uc5b4|\u4e2d\u6587)$", re.I)),
    ("obfuscated email address", re.compile(r"\[email|@\w+\.\w{2,}")),
    ("site section, not an offering", re.compile(
        r"^(community|awards|awards & recognition|insights|press releases|newsroom|"
        r"downloads|locations|trust|trust cent(er|re)|demos|guides|customer support|"
        r"customer service|find a partner|product documentation|events & webinars|"
        r"marketing|media kit|brand|logos?|faqs?|help cent(er|re)|contact sales|"
        r"partners|alliances|ecosystem|why us|our approach|methodology|testimonials|"
        r"reviews|industry|sustainability|responsible disclosure|consulting|"
        r"deployment options|platform overview|all resources|overview)$", re.I)),
    ("site section, not an offering", re.compile(
        r"^(privacy statement|cookies? policy|success stories|case study|case studies|"
        r"trial|free trial|start free|explore|clients|customer care|technical support|"
        r"support services|resource cent(er|re)|by use case|by industry|by role|"
        r"by product|marketplace|learn|learning|strategy|process|customer|health|"
        r"quick links|main menu|all|more|next|previous|search)$", re.I)),
    ("place or region", re.compile(
        r"^(north america|south america|emea|apac|latam|united states|usa|india|"
        r"singapore|australia|germany|france|japan|brazil|canada|united kingdom|uk|"
        r"middle east|africa|europe|asia|china|mexico|spain|italy|netherlands|"
        r"new york|london|mumbai|bangalore|bengaluru|delhi|dubai|sydney)$", re.I)),
]


THIRD_PARTY = {
    "microsoft", "google", "amazon", "aws", "azure", "oracle", "sap", "salesforce",
    "servicenow", "snowflake", "databricks", "cisco", "vmware", "ibm", "adobe",
    "workday", "atlassian", "slack", "zoom", "okta", "splunk", "crowdstrike",
    "palo alto networks", "fortinet", "zscaler", "netskope", "sentinelone",
    "confluent", "mongodb", "redis", "kafka", "github", "gitlab", "jira",
    "power bi", "tableau", "looker", "hubspot", "shopify", "stripe", "twilio",
}


def classify(label: str, vendor_domain: str = "") -> tuple[str, str, str]:
    """-> (verdict, domain_or_reason, category). Verdict is keep, drop or review."""
    key = label.strip().lower()
    if key in THIRD_PARTY:
        brand = key.replace(" ", "")
        if brand not in vendor_domain.replace(".", "").replace("-", ""):
            return "drop", "third-party brand (partner or integration reference)", ""
    for reason, pat in NON_TECH:
        if pat.search(label):
            return "drop", reason, ""
    for domain, pat in DOMAIN_PATTERNS:
        if pat.search(label):
            return "keep", domain, DOMAIN_TO_CATEGORY[domain]
    return "review", "no technology term found", ""


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input")
    ap.add_argument("-o", "--out", default="keywords_tech.csv")
    args = ap.parse_args()

    rows = list(csv.DictReader(open(args.input, newline="", encoding="utf-8")))
    kept: list[dict] = []
    dropped: list[dict] = []
    review: list[dict] = []
    for r in rows:
        verdict, detail, category = classify(r["label"], r.get("domain", ""))
        # the input already has a "domain" column holding the vendor host, so the
        # technology domain is written as "tech_domain" to avoid overwriting it
        if verdict == "keep":
            kept.append({**r, "tech_domain": detail, "category": category})
        elif verdict == "drop":
            dropped.append({**r, "reason": detail})
        else:
            review.append({**r, "reason": detail})

    out = Path(args.out)
    stem = out.with_suffix("")
    base = ["company", "domain", "source", "bucket", "label", "url"]

    def write(path: Path, data: list[dict], extra: list[str]) -> None:
        with path.open("w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=base + extra, extrasaction="ignore")
            w.writeheader()
            w.writerows(data)

    write(out, kept, ["tech_domain", "category"])
    write(Path(f"{stem}_dropped.csv"), dropped, ["reason"])
    write(Path(f"{stem}_review.csv"), review, ["reason"])

    total = len(rows)
    print(f"in     : {total:,} rows")
    print(f"keep   : {len(kept):,} ({len(kept)*100//total}%)  -> {out}")
    print(f"drop   : {len(dropped):,} ({len(dropped)*100//total}%)  -> {stem}_dropped.csv")
    print(f"review : {len(review):,} ({len(review)*100//total}%)  -> {stem}_review.csv\n")
    print("dropped, by reason:")
    for reason, n in collections.Counter(d["reason"] for d in dropped).most_common():
        print(f"   {n:6,}  {reason}")
    print("\nkept, by technology domain:")
    for dom, n in collections.Counter(k["tech_domain"] for k in kept).most_common():
        print(f"   {n:6,}  {dom}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

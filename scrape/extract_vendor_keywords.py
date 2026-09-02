#!/usr/bin/env python3
"""
Extract tech / cybersecurity keywords from vendor websites.

Pulls candidate product / solution / platform / use-case / technology labels from
three sources per vendor, in descending order of signal quality:

  1. sitemap.xml  - URL slugs are a free, CMS-independent taxonomy
  2. header nav   - the mega-menu, where Products/Solutions/Platform live
  3. footer nav   - often a flatter, more complete product sitemap than the header

Writes one tidy CSV of raw labels for downstream classification.

Usage:
    pip install -r requirements.txt
    python extract_vendor_keywords.py vendors.csv -o vendor_keywords_raw.csv

Input CSV needs a `url` column (and optionally `company`). Re-running resumes:
domains already present in the output file are skipped.
"""

from __future__ import annotations

import argparse
import csv
import re
import sys
import time
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
)
TIMEOUT = 20
POLITE_DELAY = 1.0          # seconds between requests to the same domain
MAX_LABELS_PER_VENDOR = 80

# URL path segments that mark a page as describing an offering.
BUCKETS: dict[str, tuple[str, ...]] = {
    "product":    ("product", "products"),
    "solution":   ("solution", "solutions"),
    "platform":   ("platform", "platforms"),
    "use_case":   ("use-case", "use-cases", "usecase", "usecases", "used-for"),
    "technology": ("technology", "technologies"),
    "service":    ("service", "services"),
    "capability": ("capability", "capabilities", "features", "modules"),
    "industry":   ("industry", "industries", "vertical", "verticals", "sector", "sectors"),
}
SEGMENT_TO_BUCKET = {seg: bucket for bucket, segs in BUCKETS.items() for seg in segs}

# Nav labels that are never product keywords.
STOP_LABELS = {
    "home", "about", "about us", "contact", "contact us", "careers", "career",
    "blog", "blogs", "news", "newsroom", "press", "events", "webinars", "login",
    "log in", "sign in", "sign up", "signup", "register", "search", "support",
    "privacy policy", "privacy", "terms", "terms of use", "cookie policy",
    "cookies", "sitemap", "partners", "investors", "leadership", "team",
    "our team", "get started", "request a demo", "book a demo", "demo",
    "free trial", "pricing", "resources", "documentation", "docs", "faq",
    "faqs", "testimonials", "case studies", "customers", "menu", "more",
    "read more", "learn more", "view all", "see all", "back to top", "skip to content",
}

# Canonical display forms for acronyms and initialisms. Keys are the slug tokens
# with punctuation stripped, so "sd-wan" and "sd_wan" both resolve to "SD-WAN".
# These are exactly the strings buyers type into search, so casing matters.
_ACRONYM_LIST = [
    "AI", "ML", "GenAI", "LLM", "MLOps", "AIOps", "MLSecOps", "API", "APIs", "SDK",
    "XDR", "EDR", "NDR", "MDR", "ITDR", "SIEM", "SOAR", "UEBA", "SOC", "SOC 2", "NOC",
    "CNAPP", "CSPM", "CWPP", "CIEM", "DSPM", "SSPM", "CASB", "CAASM", "EASM", "ASM",
    "CTEM", "BAS", "VAPT", "PTaaS", "RASP", "SAST", "DAST", "IAST", "SCA", "SBOM",
    "IaC", "WAF", "WAAP", "DDoS", "DLP", "ZTNA", "SASE", "SSE", "SWG", "NGFW", "NAC",
    "VPN", "PKI", "HSM", "PQC", "MFA", "SSO", "IAM", "CIAM", "PAM", "IGA", "NHI",
    "GRC", "TPRM", "DPDP", "GDPR", "HIPAA", "PCI", "PCI-DSS", "ISO", "OT", "ICS",
    "IoT", "IIoT", "IoMT", "M2M", "MDM", "UEM", "EMM", "BYOD", "VDI", "DEX",
    "ITSM", "ITOM", "ESM", "SD-WAN", "DNS", "DHCP", "IPAM", "DDI", "CDN", "TLS",
    "SSL", "GPU", "CPU", "HPC", "K8s", "CI/CD", "DevOps", "DevSecOps", "FinOps",
    "ERP", "CRM", "HCM", "HRMS", "SCM", "BPM", "RPA", "ECM", "DAM", "CMS", "DXP",
    "BI", "ETL", "ELT", "OLAP", "HTAP", "NoSQL", "SQL", "RAG", "KYC", "AML", "UPI",
    "GST", "TDS", "RBI", "BFSI", "SaaS", "PaaS", "IaaS", "DRaaS", "MSSP", "MSP",
    "VAR", "GIS", "LiDAR", "GPS", "RFID", "ANPR", "OCR", "AR", "VR", "5G", "DR",
    "CPaaS", "UCaaS", "DRM", "eKYC", "eSign", "PII", "PHI",
]
CANON = {re.sub(r"[^a-z0-9]", "", a.lower()): a for a in _ACRONYM_LIST}


def norm_domain(url: str) -> str:
    host = urlparse(url).netloc.lower()
    return host[4:] if host.startswith("www.") else host


def slug_to_label(slug: str) -> str:
    """'api-security' -> 'API Security'; 'sd-wan' -> 'SD-WAN'; 'iot' -> 'IoT'."""
    slug = re.sub(r"\.(html?|php|aspx?)$", "", slug, flags=re.I)
    words = [w for w in re.split(r"[-_+.\s]+", slug) if w]
    out: list[str] = []
    i = 0
    while i < len(words):
        # Greedy: try three-, then two-, then one-token acronym matches.
        for span in (3, 2, 1):
            if i + span > len(words):
                continue
            key = re.sub(r"[^a-z0-9]", "", "".join(words[i:i + span]).lower())
            if key in CANON:
                out.append(CANON[key])
                i += span
                break
        else:
            w = words[i]
            out.append(w if re.fullmatch(r"\d+", w) else w.capitalize())
            i += 1
    return " ".join(out).strip()


def clean_label(text: str) -> str | None:
    text = re.sub(r"\s+", " ", text or "").strip(" \t\n\r|·—–-")
    if not text or len(text) > 70 or len(text) < 2:
        return None
    if text.lower() in STOP_LABELS:
        return None
    if not re.search(r"[A-Za-z]", text):
        return None
    return text


class Session:
    """One requests session per vendor, rate-limited to POLITE_DELAY."""

    def __init__(self) -> None:
        self.s = requests.Session()
        self.s.headers["User-Agent"] = UA
        self._last = 0.0

    def get(self, url: str) -> requests.Response | None:
        wait = POLITE_DELAY - (time.monotonic() - self._last)
        if wait > 0:
            time.sleep(wait)
        try:
            r = self.s.get(url, timeout=TIMEOUT, allow_redirects=True)
            self._last = time.monotonic()
            return r if r.status_code == 200 else None
        except requests.RequestException:
            self._last = time.monotonic()
            return None


def sitemap_urls(sess: Session, base: str) -> list[str]:
    """Collect page URLs from sitemap.xml, following one level of sitemap index."""
    candidates = [
        urljoin(base, "/sitemap.xml"),
        urljoin(base, "/sitemap_index.xml"),
        urljoin(base, "/wp-sitemap.xml"),
        urljoin(base, "/sitemap-index.xml"),
    ]
    robots = sess.get(urljoin(base, "/robots.txt"))
    if robots is not None:
        candidates += re.findall(r"(?im)^\s*sitemap:\s*(\S+)", robots.text)

    seen: set[str] = set()
    pages: list[str] = []
    queue = list(dict.fromkeys(candidates))[:6]
    depth_budget = 12  # total sitemap documents to fetch per vendor

    while queue and depth_budget > 0:
        sm = queue.pop(0)
        if sm in seen:
            continue
        seen.add(sm)
        depth_budget -= 1
        r = sess.get(sm)
        if r is None:
            continue
        try:
            root = ET.fromstring(r.content)
        except ET.ParseError:
            continue
        tag = root.tag.split("}")[-1]
        locs = [e.text.strip() for e in root.iter() if e.tag.split("}")[-1] == "loc" and e.text]
        if tag == "sitemapindex":
            # Prefer child sitemaps that look like they hold offering pages.
            ranked = sorted(locs, key=lambda u: 0 if re.search(
                r"product|solution|platform|page|service|post", u, re.I) else 1)
            queue.extend(ranked[:8])
        else:
            pages.extend(locs)
        if len(pages) > 20000:
            break
    return pages


def from_sitemap(sess: Session, base: str) -> list[tuple[str, str, str]]:
    """-> [(bucket, label, url)] derived from URL slugs."""
    host = norm_domain(base)
    rows: list[tuple[str, str, str]] = []
    for u in sitemap_urls(sess, base):
        if norm_domain(u) != host:
            continue
        segs = [s for s in urlparse(u).path.strip("/").split("/") if s]
        if not segs or len(segs) > 4:
            continue
        bucket = next((SEGMENT_TO_BUCKET[s.lower()] for s in segs[:-1]
                       if s.lower() in SEGMENT_TO_BUCKET), None)
        if bucket is None:
            continue
        label = clean_label(slug_to_label(segs[-1]))
        if label:
            rows.append((bucket, label, u))
    # Shallower URLs first — they are the top-level offerings.
    rows.sort(key=lambda r: urlparse(r[2]).path.count("/"))
    return rows


def from_nav(sess: Session, base: str) -> list[tuple[str, str, str]]:
    """-> [(source, label, url)] from header and footer navigation."""
    r = sess.get(base)
    if r is None:
        return []
    soup = BeautifulSoup(r.text, "html.parser")
    for bad in soup(["script", "style", "noscript"]):
        bad.decompose()

    regions = [
        ("nav_header", "header a[href], nav a[href], [role=navigation] a[href], "
                       "[class*=mega] a[href], [class*=menu] a[href]"),
        ("nav_footer", "footer a[href], [class*=footer] a[href]"),
    ]
    rows: list[tuple[str, str, str]] = []
    for source, sel in regions:
        for a in soup.select(sel):
            label = clean_label(a.get_text(" ", strip=True))
            if not label:
                continue
            href = a.get("href", "")
            if href.startswith(("#", "mailto:", "tel:", "javascript:")):
                continue
            rows.append((source, label, urljoin(base, href)))
    return rows


def scrape_vendor(company: str, url: str) -> tuple[list[dict], dict | None]:
    base = url if url.startswith(("http://", "https://")) else "https://" + url
    base = f"{urlparse(base).scheme}://{urlparse(base).netloc}"
    host = norm_domain(base)
    sess = Session()
    out: list[dict] = []
    seen: set[str] = set()

    try:
        for bucket, label, u in from_sitemap(sess, base):
            key = label.lower()
            if key in seen:
                continue
            seen.add(key)
            out.append(dict(company=company, domain=host, source="sitemap",
                            bucket=bucket, label=label, url=u))

        for source, label, u in from_nav(sess, base):
            key = label.lower()
            if key in seen:
                continue
            seen.add(key)
            segs = [s.lower() for s in urlparse(u).path.strip("/").split("/") if s]
            bucket = next((SEGMENT_TO_BUCKET[s] for s in segs if s in SEGMENT_TO_BUCKET), "nav")
            out.append(dict(company=company, domain=host, source=source,
                            bucket=bucket, label=label, url=u))
    except Exception as exc:  # never let one vendor kill the run
        return out[:MAX_LABELS_PER_VENDOR], dict(company=company, url=url, error=repr(exc))

    if not out:
        return [], dict(company=company, url=url, error="no labels found (JS-rendered or blocked)")
    return out[:MAX_LABELS_PER_VENDOR], None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input", help="CSV with a 'url' column (optional 'company' column)")
    ap.add_argument("-o", "--out", default="vendor_keywords_raw.csv")
    ap.add_argument("-e", "--errors", default="vendor_keywords_errors.csv")
    ap.add_argument("-w", "--workers", type=int, default=8,
                    help="vendors scraped in parallel (default 8)")
    ap.add_argument("-n", "--limit", type=int, default=0, help="only first N vendors")
    args = ap.parse_args()

    with open(args.input, newline="", encoding="utf-8-sig") as fh:
        rows = list(csv.DictReader(fh))
    if not rows or "url" not in rows[0]:
        print("error: input CSV needs a 'url' column", file=sys.stderr)
        return 2

    targets = [(r.get("company") or norm_domain(r["url"]), r["url"].strip())
               for r in rows if r.get("url", "").strip()]
    if args.limit:
        targets = targets[: args.limit]

    out_path, err_path = Path(args.out), Path(args.errors)
    done: set[str] = set()
    if out_path.exists():
        with out_path.open(newline="", encoding="utf-8") as fh:
            done = {r["domain"] for r in csv.DictReader(fh)}
        print(f"resuming: {len(done)} domains already done")
    targets = [t for t in targets if norm_domain(
        t[1] if t[1].startswith("http") else "https://" + t[1]) not in done]

    fields = ["company", "domain", "source", "bucket", "label", "url"]
    new_out, new_err = not out_path.exists(), not err_path.exists()
    with out_path.open("a", newline="", encoding="utf-8") as of, \
         err_path.open("a", newline="", encoding="utf-8") as ef:
        ow = csv.DictWriter(of, fieldnames=fields)
        ew = csv.DictWriter(ef, fieldnames=["company", "url", "error"])
        if new_out:
            ow.writeheader()
        if new_err:
            ew.writeheader()

        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            futures = {pool.submit(scrape_vendor, c, u): (c, u) for c, u in targets}
            for i, fut in enumerate(as_completed(futures), 1):
                company, url = futures[fut]
                labels, err = fut.result()
                if labels:
                    ow.writerows(labels)
                if err:
                    ew.writerow(err)
                of.flush(); ef.flush()
                status = f"{len(labels):3d} labels" if labels else "FAILED    "
                print(f"[{i}/{len(targets)}] {status}  {company}", flush=True)

    print(f"\ndone -> {out_path}  (errors -> {err_path})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

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
import threading
import time
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

from tech_filter import classify

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
)
TIMEOUT = 20
POLITE_DELAY = 1.0          # seconds between requests to the same domain
MAX_LABELS_PER_VENDOR = 120

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
    "offering":   ("cloud", "compute", "storage", "network", "networking", "database",
                   "databases", "kubernetes", "security", "gpu", "infrastructure",
                   "software", "apps", "tools", "offerings"),
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
    "datasheets", "ebooks", "e-books", "reports", "videos", "podcasts", "whitepapers",
    "white papers", "knowledge base", "academy", "support portal", "partner portal",
    "product docs", "customer stories", "releases", "release notes", "news & press",
    "become a partner", "who we are", "community forum", "legal notices",
    "terms of service", "vulnerability disclosure policy", "marketing preference center",
    "overview", "models", "documentation", "book consultation", "talk to an expert",
    "speak to an engineer", "get started", "try aerospike", "features", "compare",
    "integrations", "changelog", "status", "trust center", "company", "our story",
    "sitemap.xml", "all rights reserved", "cookie settings", "accessibility",
    # social links harvested from footers
    "linkedin", "youtube", "instagram", "facebook", "twitter", "x-twitter", "x",
    "github", "reddit", "tiktok", "threads", "mastodon", "rss", "follow us",
    # section headers, not offerings
    "solutions", "all solutions", "industries", "all industries", "products",
    "all products", "platform", "platforms", "technology", "technologies",
    "security", "services", "capabilities", "use cases", "why us", "customers",
    "glossary", "terms & conditions", "terms and conditions", "privacy notice",
    "modern slavery statement", "product tours", "partner portal login",
    "customer portal", "status", "login to partner portal", "training",
    "certification", "certifications", "webinars", "events", "solution briefs",
}

# Localised copies of the same page: "Next Gen SIEM SOC Upgrade Es". Only collapsed
# when the un-suffixed label also exists for that vendor, so "Managed IT" survives.
LOCALE_SUFFIX = re.compile(
    r"\s+(it|es|de|fr|jp|pt|br|kr|cn|uk|au|in|nl|ru|tr|mx|ca|sg|latam|apac|emea|"
    r"anz|na|us|eu|za|ae|id|th|vn|pl|se|dk|no|fi)$", re.I)

# Decorative characters and call-to-action verbs that wrap real product names.
DECOR = re.compile(r"[\u2197\u2198\u2192\u2190\u2794\u00bb\u203a\u2022|]+")
STRIP_LEAD = re.compile(r"^(explore|discover|view|see|meet|our|the)\s+", re.I)
DROP_LEAD = re.compile(
    r"^(get|save|still|book|talk|try|download|read|watch|join|start|request|contact|"
    r"sign|log|subscribe|introducing|announcing|why|how|what|when|schedule|claim)\b", re.I)
MARKETING = re.compile(r"[?!%]|\bfree\b|\bsave up to\b|\d{2,}\s*%", re.I)

# A social link, not a product. Matches the platform name alone or dressed up as an
# icon class ("Linkedin-in", "Facebook-f") or a link label ("Go to X's Twitter Account"),
# but never a product that merely mentions a platform, such as "Facebook Messenger"
# or "Connectors Facebook Ads Advanced Account Connector".
SOCIAL = "facebook|linkedin|youtube|instagram|twitter|tiktok|threads|mastodon|reddit|github|x"
SOCIAL_LINK = re.compile(
    rf"^(?:go to .*?(?:'s)?\s+)?(?:on\s+)?(?:{SOCIAL})"
    rf"(?:[-\s](?:f|in|square|circle|play|logo|icon))?"
    rf"(?:\s*[:\-\u2013]\s*.*)?"          # "Facebook: open in a new window", "Instagram - US"
    rf"(?:\s*\([^)]*\))?(?:\s+(?:account|page|profile|channel|feed))?$", re.I)
SOCIAL_CTA = re.compile(r"^(follow|connect with|join|like) (us|me)\b", re.I)
# "<anything> on Instagram" is a link to a profile, not a product.
SOCIAL_SUFFIX = re.compile(rf"\bon (?:{SOCIAL})$", re.I)

# Title-case tidy-ups: a trailing "It" is the noun IT, and small words stay small.
MINOR = {"for", "and", "of", "the", "to", "in", "on", "with", "a", "an",
         "as", "at", "by", "or", "per", "via", "from"}


def polish_label(text: str) -> str:
    words = text.split()
    if len(words) > 1 and words[-1] == "It":
        words[-1] = "IT"                       # "Falcon For It" -> "... IT"
    for i in range(1, len(words)):
        if words[i].lower() in MINOR and words[i][:1].isupper() and words[i].isalpha():
            words[i] = words[i].lower()        # "Falcon For IT" -> "Falcon for IT"
    return " ".join(words)

# Non-page assets and sections that never describe an offering.
SKIP_EXT = re.compile(
    r"\.(webp|png|jpe?g|gif|svg|ico|pdf|zip|mp4|mp3|css|js|xml|woff2?|ttf)(\?|#|$)", re.I)
SKIP_PATH = re.compile(
    r"/(blog|news|press|resource|resources|support|doc|docs|documentation|legal|pricing|"
    r"event|events|webinar|webinars|academy|career|careers|about|partner|partners|"
    r"customer-stories|case-stud|demo|contact|login|signup|sign-up|hubfs|wp-content|"
    r"author|tag|category|privacy|terms|cookie)(/|$)", re.I)


def is_offering_url(url: str) -> bool:
    """Reject assets, blog posts, and other pages that never name a product."""
    if SKIP_EXT.search(url):
        return False
    return not SKIP_PATH.search(urlparse(url).path)


def canon_url(url: str) -> str:
    """Strip query, fragment and trailing slash so the same page dedupes."""
    pr = urlparse(url)
    return f"{pr.scheme}://{pr.netloc}{pr.path.rstrip('/')}".lower()


# Ranking for the per-vendor cap: keep real offerings, shed navigation chrome.
BUCKET_RANK = {
    "product": 0, "solution": 1, "use_case": 1, "platform": 2, "technology": 2,
    "offering": 2, "capability": 3, "service": 3, "nav": 4, "industry": 5,
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
    "EC2", "S3", "VPC", "RDS", "SLA", "SLO", "SKU", "CPG", "FSI", "SLG", "EBC",
    "SAP", "SaaS", "SMB", "SME", "OEM", "POS", "ATM", "CCTV", "VMS", "NVR",
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


def clean_label(text: str) -> tuple[str | None, str]:
    """Return (label, "") when usable, or (None, reason) so rejections are auditable."""
    raw = text
    text = DECOR.sub(" ", text or "")
    text = re.sub(r"\s+", " ", text).strip(" \t\n\r|·—–-")
    text = re.sub(r"\s+\bnew!?$", "", text, flags=re.I)
    text = STRIP_LEAD.sub("", text).strip()
    if not text or len(text) < 2:
        return None, "empty"
    if len(text) > 60:
        return None, "too long"
    if text.lower() in STOP_LABELS:
        return None, "stop word"
    if not re.search(r"[A-Za-z]", text):
        return None, "no letters"
    if len(text.split()) > 7:
        return None, "headline, not a product name"
    if DROP_LEAD.search(text):
        return None, "call to action"
    if MARKETING.search(text):
        return None, "marketing copy"
    if "logo" in text.lower():
        return None, "logo alt text"
    if text.endswith(".") and len(text.split()) > 3:
        return None, "sentence, not a product name"
    text = text.rstrip(".")
    if SOCIAL_LINK.match(text) or SOCIAL_CTA.match(text) or SOCIAL_SUFFIX.search(text):
        return None, "social link"
    return polish_label(text), ""


class _Rejects(threading.local):
    """Per-thread buffer of discarded labels, so the audit trail stays per vendor."""

    def __init__(self) -> None:
        self.buf: list[tuple[str, str, str, str]] = []

    def append(self, item: tuple[str, str, str, str]) -> None:
        self.buf.append(item)

    def drain(self) -> list[tuple[str, str, str, str]]:
        out, self.buf = self.buf, []
        return out


REJECTS = _Rejects()
SAVE_HTML = False        # set by --save-html; the pages are large


class Session:
    """One requests session per vendor, rate-limited to POLITE_DELAY."""

    def __init__(self) -> None:
        self.s = requests.Session()
        self.s.headers["User-Agent"] = UA
        self._last = 0.0
        self.outcomes: dict[str, str] = {}
        self.first_html: str | None = None      # homepage, kept for the audit trail
        self.sitemap_pages: list[str] = []

    def get(self, url: str) -> requests.Response | None:
        wait = POLITE_DELAY - (time.monotonic() - self._last)
        if wait > 0:
            time.sleep(wait)
        try:
            r = self.s.get(url, timeout=TIMEOUT, allow_redirects=True)
            self._last = time.monotonic()
            self.outcomes[url] = "ok" if r.status_code == 200 else f"HTTP {r.status_code}"
            if (r.status_code == 200 and self.first_html is None
                    and "html" in r.headers.get("content-type", "").lower()):
                self.first_html = r.text
            return r if r.status_code == 200 else None
        except requests.RequestException as exc:
            self._last = time.monotonic()
            detail = re.sub(r"\s+", " ", str(exc))[:120] or type(exc).__name__
            self.outcomes[url] = f"{type(exc).__name__}: {detail}"
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
    sitemap_urls_cache = sitemap_urls(sess, base)
    for u in sitemap_urls_cache:
        if norm_domain(u) != host:
            continue
        if not is_offering_url(u):
            REJECTS.append(("sitemap", slug_to_label(u.rstrip("/").split("/")[-1]), u,
                            "asset or non-offering section"))
            continue
        segs = [s for s in urlparse(u).path.strip("/").split("/") if s]
        if not segs or len(segs) > 4:
            continue
        bucket = next((SEGMENT_TO_BUCKET[s.lower()] for s in segs[:-1]
                       if s.lower() in SEGMENT_TO_BUCKET), None)
        if bucket is None:
            continue
        label, why = clean_label(slug_to_label(segs[-1]))
        if label:
            rows.append((bucket, label, u))
        else:
            REJECTS.append(("sitemap", slug_to_label(segs[-1]), u, why))
    # Shallower URLs first — they are the top-level offerings.
    sess.sitemap_pages = [u for u in sitemap_urls_cache]
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
            original = a.get_text(" ", strip=True)
            label, why = clean_label(original)
            if not label:
                if original:
                    REJECTS.append((source, original, urljoin(base, a.get("href", "")), why))
                continue
            href = a.get("href", "")
            if href.startswith(("#", "mailto:", "tel:", "javascript:")):
                continue
            full = urljoin(base, href)
            if not is_offering_url(full):
                REJECTS.append((source, label, full, "asset or non-offering section"))
                continue
            rows.append((source, label, full))
    return rows


def diagnose(sess: Session, base: str) -> str:
    """Explain an empty result: unreachable vs. bot-walled vs. JS-rendered."""
    home = sess.outcomes.get(base, sess.outcomes.get(base + "/", "not attempted"))
    if home == "ok":
        return "homepage fetched but no nav or sitemap labels found (likely JS-rendered nav)"
    if home.startswith("HTTP"):
        return f"homepage returned {home} (bot wall or geo block)"
    if home == "not attempted":
        return "homepage never fetched"
    return f"homepage unreachable - {home}"


def write_vendor_folder(d: Path, company: str, base: str, rows: list[dict],
                        review: list[dict], rejected: list[dict],
                        sess: "Session", error: dict | None) -> None:
    """One self-contained evidence folder per vendor."""
    try:
        d.mkdir(parents=True, exist_ok=True)
        with (d / "keywords.csv").open("w", newline="", encoding="utf-8") as fh:
            cols = ["label", "tech_domain", "category", "bucket", "source", "url"]
            w = csv.DictWriter(fh, fieldnames=cols)
            w.writeheader()
            w.writerows([{k: r[k] for k in cols} for r in rows])
        with (d / "needs_review.csv").open("w", newline="", encoding="utf-8") as fh:
            cols = ["label", "reason", "bucket", "source", "url"]
            w = csv.DictWriter(fh, fieldnames=cols)
            w.writeheader()
            w.writerows([{k: r[k] for k in cols} for r in review])
        with (d / "rejected.csv").open("w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=["source", "label", "url", "reason"])
            w.writeheader()
            w.writerows([{k: r[k] for k in ("source", "label", "url", "reason")}
                         for r in rejected])
        (d / "sitemap_urls.txt").write_text("\n".join(sess.sitemap_pages), encoding="utf-8")
        (d / "fetch_log.txt").write_text(
            "\n".join(f"{v}\t{k}" for k, v in sess.outcomes.items()), encoding="utf-8")
        (d / "summary.txt").write_text(
            f"company        : {company}\n"
            f"site           : {base}\n"
            f"homepage       : {sess.outcomes.get(base, 'not attempted')}\n"
            f"pages fetched  : {len(sess.outcomes)}\n"
            f"sitemap URLs   : {len(sess.sitemap_pages)}\n"
            f"tech keywords  : {len(rows)}\n"
            f"needs review   : {len(review)}\n"
            f"removed        : {len(rejected)}\n"
            f"error          : {(error or {}).get('error', '-')}\n",
            encoding="utf-8")
        if SAVE_HTML and sess.first_html:
            (d / "homepage.html").write_text(sess.first_html, encoding="utf-8", errors="replace")
    except OSError:
        pass


def scrape_vendor(company: str, url: str, raw_dir: Path | None = None) -> dict:
    """Scrape one vendor. Returns rows, rejects, a per-vendor summary and any error."""
    base = url if url.startswith(("http://", "https://")) else "https://" + url
    base = f"{urlparse(base).scheme}://{urlparse(base).netloc}"
    host = norm_domain(base)
    sess = Session()
    REJECTS.drain()          # discard anything left by the previous vendor on this thread

    # Same page often appears in both the sitemap and the nav. Keep one row each,
    # preferring the nav's human-written wording over the URL slug: a nav says
    # "Peer-to-Peer Architecture" where the slug only gives "P2p Architecture".
    by_url: dict[str, dict] = {}

    def add(source: str, bucket: str, label: str, u: str, prefer: bool) -> None:
        key = canon_url(u)
        cur = by_url.get(key)
        if cur is None:
            by_url[key] = dict(company=company, domain=host, source=source,
                               bucket=bucket, label=label, url=u)
            return
        if prefer and len(label.split()) >= len(cur["label"].split()):
            cur["label"], cur["source"] = label, source
        if cur["bucket"] in ("nav", "offering") and bucket not in ("nav", "offering"):
            cur["bucket"] = bucket

    rejected: list[dict] = []
    error = None
    try:
        for bucket, label, u in from_sitemap(sess, base):
            add("sitemap", bucket, label, u, prefer=False)
        for source, label, u in from_nav(sess, base):
            segs = [x.lower() for x in urlparse(u).path.strip("/").split("/") if x]
            bucket = next((SEGMENT_TO_BUCKET[x] for x in segs if x in SEGMENT_TO_BUCKET), "nav")
            add(source, bucket, label, u, prefer=True)
    except Exception as exc:  # never let one vendor kill the run
        error = dict(company=company, url=url, error=repr(exc))

    rejected += [dict(company=company, domain=host, source=src, label=lab, url=u, reason=why)
                 for src, lab, u, why in REJECTS.drain()]

    # Collapse localised copies: two or more labels sharing a base ("... Es",
    # "... Latam") become the base itself, even when the base has no page of its
    # own. A lone label is never rewritten, so "Managed IT" is safe.
    groups: dict[str, list[str]] = {}
    for key, r in by_url.items():
        groups.setdefault(LOCALE_SUFFIX.sub("", r["label"]).strip().lower(), []).append(key)
    for base_lc, keys in groups.items():
        if len(keys) == 1:
            continue
        exact = [k for k in keys if by_url[k]["label"].lower() == base_lc]
        winner = exact[0] if exact else keys[0]
        by_url[winner]["label"] = LOCALE_SUFFIX.sub("", by_url[winner]["label"]).strip()
        for k in keys:
            if k != winner:
                del by_url[k]

    # Drop labels repeated under different URLs.
    rows, seen_labels = [], set()
    for r in sorted(by_url.values(), key=lambda r: (BUCKET_RANK.get(r["bucket"], 4),
                                                    urlparse(r["url"]).path.count("/"))):
        key = r["label"].lower()
        if key in seen_labels:
            continue
        seen_labels.add(key)
        rows.append(r)

    # Keep only technology and cybersecurity terms. This runs BEFORE the cap so a
    # vendor's budget is spent on real offerings: CrowdStrike previously filled all
    # 120 slots with industries and menu items and lost actual products.
    tech, review = [], []
    for r in rows:
        verdict, detail, category = classify(r["label"], host)
        if verdict == "keep":
            tech.append({**r, "tech_domain": detail, "category": category})
        elif verdict == "review":
            review.append({**r, "reason": detail})
        else:
            rejected.append({**r, "reason": detail})
    capped, tech = tech[MAX_LABELS_PER_VENDOR:], tech[:MAX_LABELS_PER_VENDOR]
    rejected += [{**r, "reason": f"over the {MAX_LABELS_PER_VENDOR}-keyword cap"}
                 for r in capped]
    rows = tech

    if raw_dir is not None:
        write_vendor_folder(raw_dir / host, company, base, rows, review, rejected, sess, error)

    return dict(
        rows=rows,
        review=review,
        rejected=rejected,
        error=error,
        summary=dict(company=company, domain=host, url=base,
                     homepage=sess.outcomes.get(base, "not attempted"),
                     sitemap_urls_seen=len(sess.sitemap_pages),
                     pages_fetched=len(sess.outcomes),
                     keywords_kept=len(rows), needs_review=len(review),
                     rejected=len(rejected),
                     error=(error or {}).get("error", "")),
    )


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input", help="CSV with a 'url' column (optional 'company' column)")
    ap.add_argument("-o", "--out", default="vendor_keywords_raw.csv")
    ap.add_argument("-w", "--workers", type=int, default=8,
                    help="vendors scraped in parallel (default 8)")
    ap.add_argument("-n", "--limit", type=int, default=0, help="only first N vendors")
    ap.add_argument("--vendor-dir", "--raw-dir", dest="vendor_dir", default="",
                    help="write one evidence folder per vendor under this path, each with "
                         "keywords.csv, rejected.csv, sitemap_urls.txt, fetch_log.txt "
                         "and summary.txt")
    ap.add_argument("--save-html", action="store_true",
                    help="also save each homepage as HTML (adds 100-300 MB over 350 vendors)")
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

    out_path = Path(args.out)
    stem = out_path.with_suffix("")
    err_path = Path(f"{stem}_errors.csv")
    rej_path = Path(f"{stem}_removed.csv")
    sum_path = Path(f"{stem}_summary.csv")
    raw_dir = Path(args.vendor_dir) if args.vendor_dir else None
    global SAVE_HTML
    SAVE_HTML = args.save_html

    done: set[str] = set()
    if out_path.exists():
        with out_path.open(newline="", encoding="utf-8") as fh:
            done = {r["domain"] for r in csv.DictReader(fh)}
        print(f"resuming: {len(done)} domains already done")
    targets = [t for t in targets if norm_domain(
        t[1] if t[1].startswith("http") else "https://" + t[1]) not in done]

    specs = [
        (out_path, ["company", "domain", "source", "bucket", "label", "url",
                    "tech_domain", "category"], "rows"),
        (Path(f"{stem}_review.csv"),
         ["company", "domain", "source", "bucket", "label", "url", "reason"], "review"),
        (err_path, ["company", "url", "error"], "error"),
        (rej_path, ["company", "domain", "source", "label", "url", "reason"], "rejected"),
        (sum_path, ["company", "domain", "url", "homepage", "sitemap_urls_seen",
                    "pages_fetched", "keywords_kept", "needs_review", "rejected",
                    "error"], "summary"),
    ]
    handles, writers = [], {}
    for path, fields, key in specs:
        new = not path.exists()
        fh = path.open("a", newline="", encoding="utf-8")
        handles.append(fh)
        w = csv.DictWriter(fh, fieldnames=fields, extrasaction="ignore")
        if new:
            w.writeheader()
        writers[key] = (w, fh)

    try:
        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            futures = {pool.submit(scrape_vendor, c, u, raw_dir): (c, u) for c, u in targets}
            for i, fut in enumerate(as_completed(futures), 1):
                company, _ = futures[fut]
                res = fut.result()
                for key in ("rows", "review", "rejected"):
                    if res[key]:
                        writers[key][0].writerows(res[key])
                for key in ("error", "summary"):
                    if res[key]:
                        writers[key][0].writerow(res[key])
                for _, fh in writers.values():
                    fh.flush()
                n = len(res["rows"])
                status = f"{n:3d} keywords" if n else "no keywords"
                print(f"[{i}/{len(targets)}] {status}  {company}", flush=True)
    finally:
        for fh in handles:
            fh.close()

    print(f"\nkeywords  -> {out_path}")
    print(f"rejected  -> {rej_path}   (every discarded label, with the reason)")
    print(f"summary   -> {sum_path}   (one row per vendor: what was fetched and found)")
    print(f"errors    -> {err_path}")
    if raw_dir:
        print(f"per vendor-> {raw_dir}/<domain>/  (keywords.csv, rejected.csv, summary.txt, "
              f"sitemap_urls.txt, fetch_log.txt{', homepage.html' if SAVE_HTML else ''})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

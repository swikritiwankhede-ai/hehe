"""
Decide whether a label is a technology or cybersecurity term.

Kept separate from both the scraper and the post-processors so either can apply
the same rules: the scraper filters as it goes, and the post-processors can
replay updated rules over an earlier run without re-crawling.
"""

from __future__ import annotations

import re

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
    ("markdown or template syntax", re.compile(r"\]\s*\(|\{\{|\}\}|<[a-z]+>|\]\s*\[")),
    ("landing or overview page", re.compile(r"\boverview$", re.I)),
    ("demo or trial page", re.compile(
        r"\b(book a demo|request a demo|watch a demo|free trial|start trial|demos?)\b", re.I)),
    ("comparison or alternatives page", re.compile(
        r"(?<![\w-])(vs\.?|versus)(?![\w-])|^(compare|alternatives? to)\b|"
        r"\balternatives?$", re.I)),
    ("case study, guide or collateral", re.compile(
        r"\b(case stud(y|ies)|customer stor(y|ies)|guide to|'?s guide|dummies|"
        r"handbook|playbook|cheat sheet|benchmark report|state of the|"
        r"research report|tutorial|how-to)\b", re.I)),
    ("documentation or FAQ", re.compile(
        r"\b(faqs?|api docs|documentation|release notes|knowledge base|"
        r"user manual|developer docs|cli reference)\b", re.I)),
    ("partner programme or competency", re.compile(
        r"\b(competency|partner (program|programme|ecosystem|portal|loyalty)|"
        r"reseller program|certified partner|partner badge|find a reseller)\b", re.I)),
    ("calculator or estimator", re.compile(
        r"\b(roi calculator|cost calculator|tco calculator|price estimator|"
        r"savings calculator)\b", re.I)),
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


# A single generic word is a section header, not something anyone searches for:
# a vendor searching "Cloud" would match almost every sponsor. Specific one-word
# terms such as "Kubernetes", "SIEM" or "Docker" are unaffected.
TOO_GENERIC = {
    "cloud", "network", "networking", "security", "data", "storage", "compute",
    "analytics", "mobile", "mobility", "automation", "monitor", "monitoring",
    "deployment", "insight", "insights", "search", "api", "apis", "infrastructure",
    "software", "hardware", "digital", "integration", "integrations", "connectivity",
    "communications", "communication", "database", "databases", "server", "servers",
    "application", "applications", "apps", "devices", "device", "identity",
    "compliance", "governance", "risk", "payments", "payment", "commerce",
}

MINOR_WORDS = {"for", "and", "of", "the", "to", "in", "on", "with", "a", "an", "as",
               "at", "by", "or", "per", "via", "from", "your", "our", "is", "are"}


def looks_merged(label: str) -> bool:
    """True when a menu label ran into its own description.

    "Documentation Technical guides & API docs" is a link label glued to its
    subtitle. "Threat Detection, Investigation, and Response (TDIR)" is a real
    product term, so a comma alone is not enough - the tell is a lowercase word
    where a title-cased one belongs.
    """
    words = label.split()
    after_comma = re.findall(r",\s+([a-z]+)", label)
    if len(words) > 4 and any(w not in MINOR_WORDS for w in after_comma):
        return True
    lower = [w for w in words[1:]
             if w[:1].islower() and w.lower() not in MINOR_WORDS and w.isalpha()]
    return len(words) >= 6 and len(lower) >= 2


def classify(label: str, vendor_domain: str = "") -> tuple[str, str, str]:
    """-> (verdict, domain_or_reason, category). Verdict is keep, drop or review."""
    key = label.strip().lower()
    if key in TOO_GENERIC:
        return "drop", "single generic word, too broad to search on", ""
    if looks_merged(label):
        return "drop", "menu label merged with its description", ""
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



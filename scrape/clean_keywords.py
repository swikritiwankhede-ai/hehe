#!/usr/bin/env python3
"""
Apply the current filtering rules to an existing extractor output.

The scraper's rules improve as real sites reveal new kinds of noise. Rather than
re-crawling 350 sites each time, this replays the latest rules over a CSV that
has already been produced.

    python clean_keywords.py all352.csv -o all352_clean.csv

Reports what it removed and why, so the cleanup itself stays auditable.
"""

from __future__ import annotations

import argparse
import collections
import csv
import sys
from pathlib import Path

from extract_vendor_keywords import (LOCALE_SUFFIX, clean_label, canon_url,
                                     is_offering_url, slug_to_label, BUCKET_RANK)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input")
    ap.add_argument("-o", "--out", default="")
    ap.add_argument("--cap", type=int, default=120, help="max keywords per vendor")
    args = ap.parse_args()

    rows = list(csv.DictReader(open(args.input, newline="", encoding="utf-8")))
    out_path = Path(args.out or args.input.replace(".csv", "_clean.csv"))
    rej_path = Path(str(out_path).replace(".csv", "") + "_removed.csv")

    dropped: list[dict] = []
    kept_by_vendor: dict[str, dict[str, dict]] = collections.defaultdict(dict)

    for r in rows:
        if not is_offering_url(r["url"]):
            dropped.append(dict(r, reason="asset or non-offering section"))
            continue
        label, why = clean_label(r["label"])
        if label is None:
            dropped.append(dict(r, reason=why))
            continue
        r = dict(r, label=label)
        # one row per page, preferring the longer wording
        slot = kept_by_vendor[r["domain"]]
        key = canon_url(r["url"])
        if key not in slot or len(label.split()) > len(slot[key]["label"].split()):
            slot[key] = r

    final: list[dict] = []
    for domain, slot in kept_by_vendor.items():
        vendor_rows = list(slot.values())
        # Collapse localised copies: two or more labels sharing a base ("... Es",
        # "... Latam") become the base itself, even when the base has no page of
        # its own. A lone label is never rewritten, so "Managed IT" is safe.
        groups: dict[str, list[dict]] = collections.defaultdict(list)
        for v in vendor_rows:
            groups[LOCALE_SUFFIX.sub("", v["label"]).strip().lower()].append(v)
        survivors = []
        for base_lc, members in groups.items():
            if len(members) == 1:
                survivors.append(members[0])
                continue
            exact = [m for m in members if m["label"].lower() == base_lc]
            winner = exact[0] if exact else dict(
                members[0], label=LOCALE_SUFFIX.sub("", members[0]["label"]).strip())
            survivors.append(winner)
            for m in members:
                if m is not winner and not (exact and m is exact[0]):
                    dropped.append(dict(m, reason="localised duplicate"))
        # then drop labels repeated under different URLs
        seen, deduped = set(), []
        for v in sorted(survivors, key=lambda v: (BUCKET_RANK.get(v["bucket"], 4),
                                                  v["url"].count("/"))):
            if v["label"].lower() in seen:
                dropped.append(dict(v, reason="duplicate label"))
                continue
            seen.add(v["label"].lower())
            deduped.append(v)
        for v in deduped[args.cap:]:
            dropped.append(dict(v, reason=f"over the {args.cap}-label cap"))
        final += deduped[: args.cap]

    fields = ["company", "domain", "source", "bucket", "label", "url"]
    with out_path.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=fields)
        w.writeheader()
        w.writerows([{k: v[k] for k in fields} for v in
                     sorted(final, key=lambda v: (v["domain"], v["bucket"], v["label"]))])
    with rej_path.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=fields + ["reason"])
        w.writeheader()
        w.writerows([{k: v.get(k, "") for k in fields + ["reason"]} for v in dropped])

    print(f"in  : {len(rows):,} rows, {len(set(r['domain'] for r in rows))} vendors")
    print(f"out : {len(final):,} rows, {len(kept_by_vendor)} vendors  -> {out_path}")
    print(f"cut : {len(dropped):,} rows -> {rej_path}\n")
    for reason, n in collections.Counter(d["reason"] for d in dropped).most_common():
        print(f"   {n:6,}  {reason}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

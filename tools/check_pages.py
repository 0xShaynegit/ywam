"""Mechanical checks for every page. Run after any page edit.

Usage: python tools/check_pages.py
Exits non-zero and prints findings when a page violates a project rule.
"""
import glob
import hashlib
import os
import re
import sys

SKIP = {"pvtest.html"}

# Pages that intentionally inherit the CSS default --subpage-accent (indigo).
# Utility pages plus the already-built project-video page.
INHERITS_DEFAULT_ACCENT = {
    "donate.html",
    "join-staff.html",
    "privacy-policy.html",
    "terms.html",
    "project-video.html",
}

EM, EN = chr(0x2014), chr(0x2013)
findings = []


def add(page, msg):
    findings.append(f"{page}: {msg}")


pages = [p for p in sorted(glob.glob("*.html")) if p not in SKIP]

for page in pages:
    html = open(page, encoding="utf-8").read()

    if EM in html or EN in html:
        add(page, "contains an em or en dash")

    if "example.com" in html:
        add(page, "placeholder domain")

    if "Placeholder Road" in html:
        add(page, "placeholder street address")

    levels = [int(m) for m in re.findall(r"<h([1-6])[^>]*>", html)]
    if levels.count(1) != 1:
        add(page, f"expected exactly one h1, found {levels.count(1)}")
    for a, b in zip(levels, levels[1:]):
        if b > a + 1:
            add(page, f"heading level skips h{a} to h{b}")

    for tag in re.findall(r"<img[^>]*>", html):
        if "alt=" not in tag:
            add(page, "img without alt")
        if "width=" not in tag or "height=" not in tag:
            add(page, "img without explicit width/height")

    for ref in re.findall(
        r'(?:src|href)="((?!https?:|#|mailto:|tel:|data:)[^"]+\.[a-z0-9]{2,5})"', html
    ):
        if not os.path.exists(ref.split("?")[0]):
            add(page, f"broken asset ref {ref}")

    if re.search(r'href="/[^/]', html):
        add(page, "root-absolute href, must be relative")

    if re.search(r'href="mailto:', html):
        add(page, "plain mailto href, must use data-user/data-domain")

    for tag in re.findall(r'<a[^>]*target="_blank"[^>]*>', html):
        if "noopener" not in tag:
            add(page, "target=_blank without noopener")

    # Project pages must each pick their own accent, or they all collide on the
    # CSS default. Utility pages (donate, terms, join-staff) and the already
    # built project-video deliberately inherit indigo, so they are exempt.
    # Only the body opener declares a subpage; data-subpage-raise is a section
    # modifier and must not be mistaken for one.
    body = re.search(r"<body[^>]*>", html)
    if body and re.search(r"\bdata-subpage\b", body.group(0)):
        if page not in INHERITS_DEFAULT_ACCENT:
            if "--subpage-accent" not in body.group(0):
                add(page, "project page does not set --subpage-accent on <body>")

    # A page written in Thai must declare it. A few Thai words quoted inside an
    # English page (a school's Thai name, a language label) are fine, so this
    # only fires once Thai is a meaningful share of the text.
    thai_chars = len(re.findall(r"[฀-๿]", html))
    if thai_chars > 200 and 'lang="th"' not in html:
        add(page, f"{thai_chars} Thai characters but not lang=th")

# Duplicate images by content, not filename.
seen = {}
for img in glob.glob("images/*.webp"):
    digest = hashlib.md5(open(img, "rb").read()).hexdigest()
    seen.setdefault(digest, []).append(img)
for digest, group in seen.items():
    if len(group) > 1:
        findings.append("duplicate image bytes: " + ", ".join(sorted(group)))

# Oversized images.
for img in glob.glob("images/*.webp"):
    kb = os.path.getsize(img) / 1024
    hero = any(k in img for k in ("banner", "hero", "og-"))
    limit = 500 if hero else 150
    if kb > limit:
        findings.append(f"{img}: {kb:.0f}KB exceeds {limit}KB")

if findings:
    print(f"{len(findings)} finding(s):")
    for f in findings:
        print("  " + f)
    sys.exit(1)
print(f"{len(pages)} pages, all checks pass")

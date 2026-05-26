#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from html import escape
from pathlib import Path
from typing import Any, Dict

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_PATH = BASE_DIR / "data" / "universities.json"
OUTPUT_DIR = BASE_DIR / "universities"


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def clean_text(value: Any, fallback: str = "Not listed") -> str:
    if isinstance(value, str):
        value = value.strip()
    return escape(str(value)) if value else fallback


def build_link(url: str, label: str) -> str:
    if not url:
        return f"<span>{escape(label)}</span>"
    safe_url = escape(url, quote=True)
    safe_label = escape(label)
    return f'<a href="{safe_url}" target="_blank" rel="noopener noreferrer">{safe_label}</a>'


def to_detail_relative_path(path: str) -> str:
    if not path:
        return ""
    path = path.strip()
    if re.match(r"^(?:[a-z]+:|//)", path, re.IGNORECASE):
        return path
    return f"../{path.lstrip('./')}"


def render_social_links(social_links: Dict[str, Any]) -> str:
    items = []
    for platform, url in sorted((social_links or {}).items()):
        if not url:
            continue
        items.append(
            f"<li>{build_link(str(url), platform.replace('_', ' ').title())}</li>"
        )

    if not items:
        return "<li>No social links listed.</li>"
    return "".join(items)


def render_university_page(university: Dict[str, Any]) -> str:
    name = clean_text(university.get("name"), "Unknown University")
    city = clean_text(university.get("city"))
    status_raw = str(university.get("status") or "").strip().lower()
    status = "Public" if status_raw == "public" else "Private"
    description = clean_text(university.get("description"))
    tuition = clean_text(university.get("tuition"))
    admission = clean_text(university.get("admission_requirements"))
    website = str(university.get("website") or "").strip()
    logo = to_detail_relative_path(str(university.get("logo") or "").strip())

    contact = university.get("contact") or {}
    location = university.get("location") or {}
    scholarships = university.get("scholarships") or {}
    departments = university.get("departments") or []

    department_items = "".join(
        f"<li>{clean_text(department)}</li>" for department in departments if department
    ) or "<li>Not listed</li>"
    scholarship_status = "Available" if scholarships.get("available") else "Not available"
    scholarship_details = clean_text(scholarships.get("details"))

    logo_html = (
        f'<img class="logo" src="{escape(logo, quote=True)}" alt="{name} logo" loading="lazy" />'
        if logo
        else "<div class=\"logo-placeholder\">No logo</div>"
    )

    return f"""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{name} | Somali-UniGuide</title>
    <style>
      :root {{
        --primary: #0f766e;
        --primary-dark: #0f4c4a;
        --text: #0f172a;
        --muted: #64748b;
        --bg: #f8fafc;
        --card: #ffffff;
        --border: #e2e8f0;
      }}
      * {{ box-sizing: border-box; }}
      body {{
        margin: 0;
        font-family: "Inter", "Segoe UI", system-ui, sans-serif;
        color: var(--text);
        background: var(--bg);
        line-height: 1.6;
      }}
      .header {{
        background: linear-gradient(135deg, var(--primary), var(--primary-dark));
        color: #fff;
        padding: 2rem 0;
      }}
      .container {{
        width: min(1080px, 92%);
        margin: 0 auto;
      }}
      .back-link {{
        color: #fff;
        text-decoration: none;
        font-weight: 600;
      }}
      .title {{
        margin: 0.5rem 0 0;
      }}
      .subtitle {{
        margin: 0.4rem 0 0;
        color: rgba(255, 255, 255, 0.85);
      }}
      .grid {{
        display: grid;
        gap: 1.25rem;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        margin: 2rem 0 3rem;
      }}
      .card {{
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 1rem;
        padding: 1.25rem;
        box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
      }}
      .card h2 {{
        margin-top: 0;
        margin-bottom: 0.75rem;
        font-size: 1.1rem;
      }}
      .logo-wrap {{
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 160px;
        background: #fff;
      }}
      .logo {{
        max-width: 160px;
        max-height: 160px;
        width: 100%;
        height: auto;
        object-fit: contain;
      }}
      .logo-placeholder {{
        color: var(--muted);
      }}
      ul {{
        margin: 0;
        padding-left: 1.2rem;
      }}
      .muted {{
        color: var(--muted);
      }}
      a {{
        color: var(--primary);
      }}
    </style>
  </head>
  <body>
    <header class="header">
      <div class="container">
        <a class="back-link" href="../index.html">← Back to home</a>
        <h1 class="title">{name}</h1>
        <p class="subtitle">{city} · {escape(status)}</p>
      </div>
    </header>
    <main class="container">
      <div class="grid">
        <section class="card">
          <h2>Overview</h2>
          <p>{description}</p>
          <p class="muted"><strong>Status:</strong> {escape(status)}</p>
          <p class="muted"><strong>Tuition:</strong> {tuition}</p>
          <p class="muted"><strong>Website:</strong> {build_link(website, website or "Not listed")}</p>
        </section>
        <section class="card logo-wrap">
          {logo_html}
        </section>
        <section class="card">
          <h2>Departments</h2>
          <ul>{department_items}</ul>
        </section>
        <section class="card">
          <h2>Admission</h2>
          <p>{admission}</p>
          <p class="muted"><strong>Scholarships:</strong> {escape(scholarship_status)}</p>
          <p class="muted">{scholarship_details}</p>
        </section>
        <section class="card">
          <h2>Contact & Location</h2>
          <p><strong>Email:</strong> {clean_text(contact.get("email"))}</p>
          <p><strong>Phone:</strong> {clean_text(contact.get("phone"))}</p>
          <p><strong>Address:</strong> {clean_text(location.get("address"))}</p>
          <p><strong>Map:</strong> {build_link(str(location.get("map") or ""), "Open map")}</p>
        </section>
        <section class="card">
          <h2>Social Media</h2>
          <ul>{render_social_links(university.get("social_links") or {})}</ul>
        </section>
      </div>
    </main>
  </body>
</html>
"""


def main() -> int:
    with DATA_PATH.open("r", encoding="utf-8") as file:
        payload = json.load(file)

    universities = payload.get("universities", [])
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for existing_file in OUTPUT_DIR.glob("*.html"):
        existing_file.unlink()

    for university in universities:
        name = str(university.get("name") or "").strip()
        slug = slugify(name) if name else ""
        if not slug:
            continue
        output_file = OUTPUT_DIR / f"{slug}.html"
        output_file.write_text(render_university_page(university), encoding="utf-8")

    print(f"Generated {len(list(OUTPUT_DIR.glob('*.html')))} university pages.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
from __future__ import annotations

import json
import logging
import re
import sys
from datetime import date
from html import unescape
from pathlib import Path
from typing import Any, Dict, List, Set
from urllib.request import Request, urlopen

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_PATH = BASE_DIR / "data" / "universities.json"
SOURCES_PATH = BASE_DIR / "data" / "sources.json"

WIKIPEDIA_LIST_URL = "https://en.wikipedia.org/wiki/List_of_universities_in_Somalia"
MAX_RECTOR_LOOKUPS = 6
RECTOR_KEYWORDS = ("rector", "gudoomiye", "chancellor", "vice chancellor")

CURATED_FALLBACK_UNIVERSITIES: List[Dict[str, Any]] = [
    {
        "name": "Benadir University",
        "city": "Mogadishu",
        "status": "private",
        "website": "https://benadiruniversity.so",
        "description": "Private university in Mogadishu offering multidisciplinary undergraduate programs.",
        "departments": ["Medicine", "Engineering", "Business Administration"],
    },
    {
        "name": "Amoud University",
        "city": "Borama",
        "status": "public",
        "website": "https://amouduniversity.org",
        "description": "Established university in Borama known for health sciences and teacher education.",
        "departments": ["Medicine", "Education", "Agriculture"],
    },
    {
        "name": "Puntland State University",
        "city": "Galkayo",
        "status": "public",
        "website": "https://psu.edu.so",
        "description": "Public university serving Puntland with applied sciences and social sciences programs.",
        "departments": ["Engineering", "Economics", "Education"],
    },
    {
        "name": "Mogadishu University",
        "city": "Mogadishu",
        "status": "private",
        "website": "https://mu.edu.so",
        "description": "Private university in Mogadishu with broad faculties in technology, law, and business.",
        "departments": ["Computer Science", "Law", "Business Administration"],
    },
]

logging.basicConfig(level=logging.INFO, format="[scraper] %(message)s")


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def has_value(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return value.strip() != ""
    if isinstance(value, (list, dict)):
        return len(value) > 0
    return True


def normalize_university(raw: Dict[str, Any]) -> Dict[str, Any]:
    name = (raw.get("name") or "").strip()
    uni_id = (raw.get("id") or slugify(name)).strip()

    return {
        "id": uni_id,
        "name": name,
        "city": (raw.get("city") or "").strip(),
        "status": (raw.get("status") or "private").strip().lower(),
        "description": (raw.get("description") or "").strip(),
        "rector": (raw.get("rector") or "").strip(),
        "departments": sorted({dept.strip() for dept in raw.get("departments", []) if dept}),
        "tuition": (raw.get("tuition") or "").strip(),
        "scholarships": {
            "available": bool(raw.get("scholarships", {}).get("available")),
            "details": (raw.get("scholarships", {}).get("details") or "").strip(),
        },
        "admission_requirements": (raw.get("admission_requirements") or "").strip(),
        "website": (raw.get("website") or "").strip(),
        "contact": {
            "email": (raw.get("contact", {}).get("email") or "").strip(),
            "phone": (raw.get("contact", {}).get("phone") or "").strip(),
        },
        "location": {
            "address": (raw.get("location", {}).get("address") or "").strip(),
            "map": (raw.get("location", {}).get("map") or "").strip(),
        },
        "social_links": raw.get("social_links", {}) or {},
        "logo": (raw.get("logo") or "").strip(),
    }


def load_existing() -> Dict[str, Any]:
    if not DATA_PATH.exists():
        return {"metadata": {}, "universities": []}

    with DATA_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_sources() -> List[Dict[str, Any]]:
    if not SOURCES_PATH.exists():
        logging.info("No sources.json found. Skipping remote fetch.")
        return []

    with SOURCES_PATH.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)

    return payload.get("sources", [])


def fetch_url_text(url: str, timeout: int = 30) -> str:
    request = Request(url, headers={"User-Agent": "Somali-UniGuide-Scraper/1.0"})
    with urlopen(request, timeout=timeout) as response:
        return response.read().decode("utf-8", errors="ignore")


def strip_html(html: str) -> str:
    text = re.sub(
        r"<script\b[^>]*>.*?</script(?:\s+[^>]*)?>",
        " ",
        html,
        flags=re.IGNORECASE | re.DOTALL,
    )
    text = re.sub(
        r"<style\b[^>]*>.*?</style(?:\s+[^>]*)?>",
        " ",
        text,
        flags=re.IGNORECASE | re.DOTALL,
    )
    text = re.sub(r"<[^>]+>", " ", text)
    text = unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def extract_rector_from_text(text: str) -> str:
    for keyword in RECTOR_KEYWORDS:
        pattern = re.compile(
            rf"\b{re.escape(keyword)}\b\s*(?:is|:|\-|=|of)?\s*([A-Z][A-Za-z'\-.]+(?:\s+[A-Z][A-Za-z'\-.]+){{0,4}})",
            re.IGNORECASE,
        )
        match = pattern.search(text)
        if not match:
            continue
        candidate = match.group(1).strip(" ,.;:-")
        if len(candidate) < 5:
            continue
        if re.search(r"university|college|faculty|campus", candidate, re.IGNORECASE):
            continue
        return candidate
    return ""


def sanitize_name(name: str) -> str:
    cleaned = re.sub(r"\[[^\]]*\]", "", unescape(name or ""))
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" ,.;:-")
    return cleaned


def row_cells(html_row: str) -> List[str]:
    return re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", html_row, flags=re.IGNORECASE | re.DOTALL)


def extract_universities_from_html(html: str) -> List[Dict[str, Any]]:
    extracted: List[Dict[str, Any]] = []
    seen_ids: Set[str] = set()

    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", html, flags=re.IGNORECASE | re.DOTALL):
        cells = row_cells(row)
        if not cells:
            continue

        name = sanitize_name(strip_html(cells[0]))
        if "university" not in name.lower():
            continue

        city = sanitize_name(strip_html(cells[1])) if len(cells) > 1 else ""
        rector = extract_rector_from_text(strip_html(row))
        uni_id = slugify(name)
        if not uni_id or uni_id in seen_ids:
            continue

        seen_ids.add(uni_id)
        extracted.append({"id": uni_id, "name": name, "city": city, "rector": rector})

    if extracted:
        return extracted

    for anchor in re.findall(r"<a[^>]*>(.*?)</a>", html, flags=re.IGNORECASE | re.DOTALL):
        name = sanitize_name(strip_html(anchor))
        if "university" not in name.lower() or len(name) < 8:
            continue
        uni_id = slugify(name)
        if not uni_id or uni_id in seen_ids:
            continue
        seen_ids.add(uni_id)
        extracted.append({"id": uni_id, "name": name})

    return extracted


def fetch_source(source: Dict[str, Any]) -> List[Dict[str, Any]]:
    url = source.get("url")
    if not url:
        return []

    source_type = str(source.get("type") or "json").strip().lower()
    logging.info("Fetching %s", url)

    if source_type in {"html", "wikipedia_html", "list_html"}:
        html = fetch_url_text(url)
        return extract_universities_from_html(html)

    data = json.loads(fetch_url_text(url))
    if isinstance(data, dict) and "universities" in data:
        return data.get("universities", [])
    if isinstance(data, list):
        return data
    return []


def fetch_wikipedia_fallback() -> List[Dict[str, Any]]:
    try:
        html = fetch_url_text(WIKIPEDIA_LIST_URL, timeout=30)
        return extract_universities_from_html(html)
    except Exception as exc:  # noqa: BLE001
        logging.info("Wikipedia fallback unavailable: %s", exc)
        return []


def enrich_rector_from_website(university: Dict[str, Any]) -> Dict[str, Any]:
    if has_value(university.get("rector")):
        return university

    website = str(university.get("website") or "").strip()
    if not website.startswith(("http://", "https://")):
        return university

    try:
        website_html = fetch_url_text(website, timeout=12)
        rector = extract_rector_from_text(strip_html(website_html))
        if rector:
            university["rector"] = rector
    except Exception as exc:  # noqa: BLE001
        logging.info("Rector lookup failed (%s): %s", website, exc)

    return university


def deep_merge(existing: Dict[str, Any], update: Dict[str, Any]) -> Dict[str, Any]:
    merged: Dict[str, Any] = dict(existing)
    for key, value in update.items():
        current = merged.get(key)
        if isinstance(value, dict) and isinstance(current, dict):
            merged[key] = deep_merge(current, value)
        elif has_value(value) or isinstance(value, bool):
            merged[key] = value
    return merged


def merge_universities(existing: List[Dict[str, Any]], updates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    merged: Dict[str, Dict[str, Any]] = {uni["id"]: uni for uni in existing if uni.get("id")}

    for update in updates:
        uni_id = update.get("id")
        if not uni_id:
            continue
        current = merged.get(uni_id, {})
        merged[uni_id] = deep_merge(current, update)

    return list(merged.values())


def main() -> int:
    existing_payload = load_existing()
    existing_universities = [normalize_university(u) for u in existing_payload.get("universities", [])]
    existing_universities = sorted(existing_universities, key=lambda item: item.get("name", ""))
    known_ids = {u.get("id") for u in existing_universities if u.get("id")}

    sources = load_sources()
    updates: List[Dict[str, Any]] = []

    for source in sources:
        try:
            for entry in fetch_source(source):
                normalized = normalize_university(entry)
                if normalized["id"] and normalized["name"]:
                    updates.append(normalized)
                    known_ids.add(normalized["id"])
        except Exception as exc:  # noqa: BLE001
            logging.info("Source failed (%s): %s", source.get("url", "unknown"), exc)

    for entry in fetch_wikipedia_fallback() + CURATED_FALLBACK_UNIVERSITIES:
        normalized = normalize_university(entry)
        if not normalized["id"] or not normalized["name"] or normalized["id"] in known_ids:
            continue
        updates.append(normalized)
        known_ids.add(normalized["id"])

    for university in updates[:MAX_RECTOR_LOOKUPS]:
        enrich_rector_from_website(university)
    updates = [normalize_university(university) for university in updates]

    merged = merge_universities(existing_universities, updates) if updates else existing_universities
    merged = [normalize_university(item) for item in merged]
    merged = sorted(merged, key=lambda item: item.get("name", ""))

    today = date.today().isoformat()
    metadata = existing_payload.get("metadata", {})
    metadata["last_checked"] = today

    if merged != existing_universities:
        metadata["last_updated"] = today

    payload = {
        "metadata": metadata,
        "universities": merged,
    }

    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    with DATA_PATH.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    logging.info("Saved %s universities", len(merged))
    return 0


if __name__ == "__main__":
    sys.exit(main())

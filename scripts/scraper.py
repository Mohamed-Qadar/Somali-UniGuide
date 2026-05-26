#!/usr/bin/env python3
from __future__ import annotations

import json
import logging
import re
import sys
from datetime import date
from pathlib import Path
from typing import Any, Dict, List
from urllib.request import urlopen

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_PATH = BASE_DIR / "data" / "universities.json"
SOURCES_PATH = BASE_DIR / "data" / "sources.json"

logging.basicConfig(level=logging.INFO, format="[scraper] %(message)s")


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def normalize_university(raw: Dict[str, Any]) -> Dict[str, Any]:
    name = (raw.get("name") or "").strip()
    uni_id = (raw.get("id") or slugify(name)).strip()

    return {
        "id": uni_id,
        "name": name,
        "city": (raw.get("city") or "").strip(),
        "status": (raw.get("status") or "private").strip().lower(),
        "description": (raw.get("description") or "").strip(),
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


def fetch_source(source: Dict[str, Any]) -> List[Dict[str, Any]]:
    url = source.get("url")
    if not url:
        return []

    logging.info("Fetching %s", url)
    with urlopen(url, timeout=30) as response:
        data = json.loads(response.read().decode("utf-8"))

    if isinstance(data, dict) and "universities" in data:
        return data.get("universities", [])

    if isinstance(data, list):
        return data

    return []


def has_value(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return value.strip() != ""
    if isinstance(value, (list, dict)):
        return len(value) > 0
    return True


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
    sources = load_sources()

    updates: List[Dict[str, Any]] = []
    for source in sources:
        try:
            for entry in fetch_source(source):
                normalized = normalize_university(entry)
                if normalized["id"] and normalized["name"]:
                    updates.append(normalized)
        except Exception as exc:  # noqa: BLE001
            logging.info("Source failed (%s): %s", source.get("url", "unknown"), exc)

    merged = merge_universities(existing_universities, updates) if updates else existing_universities
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

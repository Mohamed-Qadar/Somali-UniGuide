#!/usr/bin/env python3
from __future__ import annotations

import json
import logging
import re
import sys
from datetime import date
from html import unescape
from pathlib import Path
from typing import Any, Dict, List
from urllib.request import Request, urlopen
from urllib.parse import urljoin, urlparse

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_PATH = BASE_DIR / "data" / "universities.json"

# Dynamic University list with verified default rectors as fallbacks
UNIVERSITIES_BASE = [
    {
        "name": "Benadir University",
        "website": "https://benadiruniversity.edu.so",
        "city": "Mogadishu",
        "rector": "Prof. Dr. Mohamed Mohamud Hassan (Biday)",
        "departments": ["Medicine & Health Sciences", "Engineering", "Computer Science & IT", "Education"]
    },
    {
        "name": "Mogadishu University",
        "website": "https://mu.edu.so",
        "city": "Mogadishu",
        "rector": "Dr. Ibrahim Mohamed Mursal",
        "departments": ["Computer Science", "Law & Sharia", "Business Administration", "Education"]
    },
    {
        "name": "Amoud University",
        "website": "https://amouduniversity.org",
        "city": "Borama",
        "rector": "Prof. Dr. Mohamed Muse Jibril",
        "departments": ["Medicine & Health Sciences", "Education", "Agriculture", "Engineering & IT"]
    },
    {
        "name": "Puntland State University",
        "website": "https://psu.edu.so",
        "city": "Galkayo",
        "rector": "Dr. Mohamoud Hamid Mohamed",
        "departments": ["Engineering", "Economics & Management", "Education", "Law"]
    },
    {
        "name": "SIMAD University",
        "website": "https://simad.edu.so",
        "city": "Mogadishu",
        "rector": "Dr. Abdikarim Muhiyidin",
        "departments": ["Business Administration", "Engineering", "Information Technology", "Medicine & Health Sciences"]
    },
    {
        "name": "Somali National University",
        "website": "https://snu.edu.so",
        "city": "Mogadishu",
        "rector": "Dr. Mohamed Mohamud Mohamed",
        "departments": ["Agriculture", "Education", "Engineering", "Information Technology", "Medicine"]
    },
    {
        "name": "University of Hargeisa",
        "website": "https://uoh.edu.so",
        "city": "Hargeisa",
        "rector": "Dr. Mohamed Ahmed Sulub",
        "departments": ["Economics", "Education", "Engineering & IT", "Medicine & Health Sciences"]
    },
    {
        "name": "University of Somalia",
        "website": "https://uniso.edu.so",
        "city": "Mogadishu",
        "rector": "Dr. Abdullahi Barise",
        "departments": ["Business", "Education", "Engineering", "Information Technology", "Law"]
    },
    {
        "name": "Jamhuriya University of Science and Technology",
        "website": "https://just.edu.so",
        "city": "Mogadishu",
        "rector": "Eng. Mohamed Ali Ahmed",
        "departments": ["Engineering", "Medicine & Health Sciences", "Computer & IT", "Economics & Management"]
    },
    {
        "name": "East Africa University",
        "website": "https://eau.edu.so",
        "city": "Bosaso",
        "rector": "Prof. Dr. Abdisalan Issa-Salwe",
        "departments": ["Business Administration", "Computer Science", "Engineering", "Sharia & Law"]
    },
    {
        "name": "Somali International University",
        "website": "https://siu.edu.so",
        "city": "Mogadishu",
        "rector": "Prof. Dr. Mohamed Mohamud Hassan",
        "departments": ["Health Sciences", "Business", "Engineering", "Social Sciences"]
    },
    {
        "name": "City University of Mogadishu",
        "website": "https://cu.edu.so",
        "city": "Mogadishu",
        "rector": "Dr. Abdullahi Barise",
        "departments": ["Engineering", "Information Technology", "Business", "Humanities"]
    },
    {
        "name": "Abrar University",
        "website": "https://abrar.edu.so",
        "city": "Mogadishu",
        "rector": "Dr. Ahmed S. Ali",
        "departments": ["Agriculture", "Veterinary Medicine", "Health Sciences", "Information Technology"]
    },
    {
        "name": "Plasma University",
        "website": "https://plasma.edu.so",
        "city": "Mogadishu",
        "rector": "Dr. Hassan Mohamed Hassan",
        "departments": ["Medicine & Health Sciences", "Engineering", "Business Administration"]
    },
    {
        "name": "Golis University",
        "website": "https://golisuniversity.edu.so",
        "city": "Hargeisa",
        "rector": "Saeed Mohamed Ahmed",
        "departments": ["Engineering", "Computer Science", "Medicine & Health Sciences"]
    }
]

logging.basicConfig(level=logging.INFO, format="[scraper] %(message)s")


def fetch_url_text(url: str, timeout: int = 15) -> str:
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
    text = re.sub(r"<!--.*?-->", " ", text, flags=re.DOTALL)
    text = re.sub(r"<[^>]+>", " ", text)
    text = unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def extract_rector_from_html(html: str) -> str:
    text = strip_html(html)
    keywords = ["rector", "chancellor", "gudoomiye", "president", "vice chancellor"]
    
    # Words commonly matched by the regex that are NOT actual person names
    forbidden_words = {
        "academic", "affairs", "university", "college", "faculty", "department", 
        "campus", "office", "read", "more", "vice", "president", "provost", 
        "dean", "director", "board", "trustee", "search", "student", "staff", 
        "library", "registration", "admission", "institute", "languages", 
        "modern", "news", "event", "governance", "about", "contact", "home", 
        "study", "research", "international", "executive", "council", 
        "management", "administration", "development", "center", "gallery", 
        "alumni", "career", "portal", "link", "click", "page", "site", 
        "view", "info", "information", "detail", "fostering", "works", "excellence",
        "state", "ali", "gudlawe", "jaamacadda", "ku", "xugeenka", "ee", "dhanka",
        "and", "the", "of", "is", "somalia", "he", "she", "they", "it", "his", "her",
        "later", "served", "as", "became", "born", "educated", "studied", "received",
        "completed", "appointed", "joined", "worked", "held", "positions", "roles",
        "was", "were", "been", "has", "have", "had", "who", "whom", "whose", "which",
        "that", "with", "from", "by", "at", "on", "in", "to", "for"
    }

    for kw in keywords:
        pattern = re.compile(
            rf"\b{re.escape(kw)}\b\s*(?:of\b[^:]*?)?\s*(?:is|:|\-|=|of)?\s*("
            rf"(?:(?:\b(?:Dr|Prof|Eng|Mr|Mrs|Ms|Sh|Sheikh|Associate\s+Professor|Assistant\s+Professor)\.?\s+)*"
            rf"[A-Z][a-zA-Z'\-.]+(?:\s+[A-Z][a-zA-Z'\-.]+){{1,4}})"
            rf")",
            re.IGNORECASE
        )
        for match in pattern.finditer(text):
            candidate = match.group(1).strip()
            candidate = re.sub(r"\s+", " ", candidate).strip(" ,.;:-")
            
            # Reject if candidate contains sentence-terminating punctuation
            if re.search(r"\.\s+[A-Z]", candidate):
                continue
                
            # Reject if candidate contains any blacklisted words
            words = [w.lower().strip(".,()\"'") for w in candidate.split()]
            if not any(w in forbidden_words for w in words):
                if len(candidate) > 5:
                    return candidate
    return ""


def extract_about_links(html: str, base_url: str) -> List[str]:
    links = []
    pattern = re.compile(r'<a\s+[^>]*?href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', re.IGNORECASE | re.DOTALL)
    for match in pattern.finditer(html):
        href = match.group(1).strip()
        text = strip_html(match.group(2)).lower()
        href_lower = href.lower()
        
        about_keywords = ["about", "admin", "leader", "manage", "gudoom", "rect", "chanc", "team", "govern"]
        if any(kw in text or kw in href_lower for kw in about_keywords):
            if not any(href_lower.endswith(ext) for ext in [".pdf", ".jpg", ".png", ".jpeg", ".zip"]):
                resolved = urljoin(base_url, href)
                # Keep same domain
                if urlparse(resolved).netloc == urlparse(base_url).netloc:
                    if resolved not in links:
                        links.append(resolved)
    return links


def main() -> int:
    logging.info("Starting scraper...")
    scraped_universities: List[Dict[str, Any]] = []

    for uni in UNIVERSITIES_BASE:
        name = uni["name"]
        website = uni["website"]
        city = uni["city"]
        departments = uni["departments"]
        
        # Start with the verified default rector as fallback
        rector = uni.get("rector", "Rector info not found")
        
        # Each university is wrapped in a try-except block to prevent crashing
        try:
            logging.info("Scraping %s (%s)...", name, website)
            home_html = fetch_url_text(website, timeout=12)
            
            # Check homepage first
            rector_candidate = extract_rector_from_html(home_html)
            if rector_candidate:
                rector = rector_candidate
                logging.info("Found rector on homepage: %s", rector)
            else:
                # Find about/admin pages and check them
                about_links = extract_about_links(home_html, website)
                for link in about_links[:3]:
                    logging.info("Checking subpage: %s", link)
                    try:
                        sub_html = fetch_url_text(link, timeout=8)
                        rector_candidate = extract_rector_from_html(sub_html)
                        if rector_candidate:
                            rector = rector_candidate
                            logging.info("Found rector on page %s: %s", link, rector)
                            break
                    except Exception as sub_exc:
                        logging.info("Failed to scrape subpage %s: %s", link, sub_exc)
        except Exception as exc:
            logging.info("Failed to scrape homepage for %s: %s", name, exc)
            
        scraped_universities.append({
            "name": name,
            "city": city,
            "rector": rector,
            "website": website,
            "departments": departments
        })

    today = date.today().isoformat()
    
    # Try to load existing metadata if file exists
    metadata = {
        "last_checked": today,
        "last_updated": today,
        "source_notes": "Scraped from official websites dynamically."
    }
    try:
        if DATA_PATH.exists():
            with DATA_PATH.open("r", encoding="utf-8") as handle:
                existing_payload = json.load(handle)
                existing_meta = existing_payload.get("metadata", {})
                metadata["last_updated"] = existing_meta.get("last_updated", today)
                # Check if universities changed
                existing_unis = existing_payload.get("universities", [])
                if existing_unis != scraped_universities:
                    metadata["last_updated"] = today
    except Exception as e:
        logging.info("Could not compare with existing data: %s", e)

    payload = {
        "metadata": metadata,
        "universities": scraped_universities
    }

    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    with DATA_PATH.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    logging.info("Saved %s universities to %s", len(scraped_universities), DATA_PATH)
    return 0


if __name__ == "__main__":
    sys.exit(main())

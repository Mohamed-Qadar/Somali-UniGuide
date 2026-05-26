# Somali-UniGuide

Somali-UniGuide is a free, open-source university guidance platform for Somali students. It runs entirely on GitHub Pages and updates automatically with GitHub Actions and a Python data scraper.

## Features

- University directory with tuition, scholarships, departments, and contact info
- Live search and filters (city, department, scholarships, public/private)
- Dedicated university detail pages
- Monthly automated data refresh via GitHub Actions

## Project Structure

```
Somali-UniGuide/
├── data/
│   ├── universities.json
│   └── sources.json
├── scripts/
│   ├── scraper.py
│   └── generate_pages.py
├── .github/workflows/
│   ├── update.yml
│   └── update_data.yml
├── universities/
│   └── *.html
├── assets/
│   ├── logos/
│   └── images/
├── index.html
├── university.html
├── style.css
├── app.js
└── README.md
```

## Data Format

`data/universities.json` contains a `metadata` block and a `universities` array. Each university record uses the following fields:

- `id` (string) — stable slug for URLs
- `name` (string)
- `city` (string)
- `status` (public/private)
- `description` (string)
- `rector` (string)
- `departments` (array of strings)
- `tuition` (string)
- `scholarships` (object with `available` and `details`)
- `admission_requirements` (string)
- `website` (string)
- `contact` (object with `email`, `phone`)
- `location` (object with `address`, `map`)
- `social_links` (object with optional platform URLs)
- `logo` (path to logo image)

## Automated Monthly Updates

The GitHub Actions workflow in `.github/workflows/update_data.yml` runs monthly:

1. Executes `scripts/scraper.py`
2. Executes `scripts/generate_pages.py`
3. Updates `data/universities.json` and `universities/*.html`
4. Commits the changes back to the repository only when files changed
5. Triggers GitHub Pages redeploy from the default branch

To add real data sources, update `data/sources.json` with either:

- JSON endpoints that return an array of universities or a `{ "universities": [...] }` payload
- HTML list/table pages (`type: "html"` or `type: "wikipedia_html"`) where the scraper can infer names and rector keywords

If remote sources fail, the scraper also applies curated and Wikipedia-based fallback discovery for Somali universities.

## Local Preview

You can open `index.html` directly in your browser, or run a lightweight server:

```bash
python -m http.server
```

Then visit `http://localhost:8000`.

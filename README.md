# Somali-UniGuide

Somali-UniGuide is a free, open-source university discovery platform for Somali students. It is designed to run entirely on GitHub Pages with a lightweight, responsive UI.

## Features

- Live search across universities, departments, and cities
- Dynamic filters for city, department, type, and scholarships
- Modern responsive cards with hover animations
- Detailed university view with admissions, tuition, and contacts
- Somalia university map powered by Leaflet + OpenStreetMap
- Smart recommendations based on interest, location, and scholarship needs
- Student reviews (stored locally in the browser)
- Admission deadline tracker with countdown alerts
- Multi-language support: Somali, English, Arabic

## Project Structure

```
.
├── index.html
├── styles.css
├── app.js
├── assets/
├── data/
│   ├── universities.json
│   ├── departments.json
│   ├── reviews.json
│   ├── deadlines.json
│   ├── metadata.json
│   └── sources.json
├── lang/
│   ├── en.json
│   ├── so.json
│   └── ar.json
└── scripts/
    └── scraper.py
```

## Running Locally

You can run the site using any static server. For example:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

## Data Notes

- `data/universities.json` holds university profiles used for search, filters, and the map.
- `data/reviews.json` contains starter reviews. New reviews are stored in the browser local storage.
- `data/deadlines.json` powers the admission deadline tracker.
- `lang/*.json` controls translations for the UI.

## Automation

A GitHub Actions workflow runs on the first of every month to refresh data:

- Runs `scripts/scraper.py`
- Updates `data/metadata.json` with a new timestamp
- Commits and pushes changes automatically

## Contributing

Pull requests and improvements are welcome. Keep changes beginner-friendly and lightweight so the project stays accessible.

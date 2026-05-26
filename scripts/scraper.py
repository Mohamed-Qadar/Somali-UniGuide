from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"


def load_json(path: Path, default):
    if not path.exists():
        return default
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def main() -> None:
    sources_path = DATA_DIR / "sources.json"
    metadata_path = DATA_DIR / "metadata.json"

    sources_data = load_json(sources_path, {"sources": []})
    sources = [source.get("name", "Unknown source") for source in sources_data.get("sources", [])]

    metadata = load_json(metadata_path, {})
    metadata["lastUpdated"] = datetime.now(timezone.utc).date().isoformat()
    metadata["generatedAt"] = datetime.now(timezone.utc).isoformat()
    metadata["sources"] = sources

    metadata_path.write_text(json.dumps(metadata, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

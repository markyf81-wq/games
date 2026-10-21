#!/usr/bin/env python3
"""Download the explicit reference manifest; never crawl or execute source pages."""

import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
REFERENCES = ROOT / "references"


def describe_file(path, expected_type):
    with path.open("rb") as source:
        signature = source.read(16)
    valid = {
        "pdf": signature.startswith(b"%PDF-"),
        "jpeg": signature.startswith(b"\xff\xd8\xff"),
        "gif": signature.startswith((b"GIF87a", b"GIF89a")),
        "png": signature.startswith(b"\x89PNG\r\n\x1a\n"),
    }
    if not valid.get(expected_type, False):
        raise ValueError(f"Expected {expected_type}; received a different file type")
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return {"bytes": path.stat().st_size, "sha256": digest.hexdigest()}


def download(record):
    relative = Path(record["local_path"])
    path = (REFERENCES / relative).resolve()
    if not path.is_relative_to(REFERENCES.resolve()):
        raise ValueError("Reference path must stay inside references/")
    result = {"id": record["id"], "url": record["url"], "local_path": str(relative)}
    try:
        if path.exists():
            result.update(describe_file(path, record["file_type"]))
            result["status"] = "available"
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            partial = path.with_name(path.name + ".part")
            try:
                subprocess.run([
                    "curl", "--fail", "--location", "--silent", "--show-error",
                    "--connect-timeout", "15", "--max-time", "180",
                    "--max-filesize", "125829120", "--retry", "1",
                    "--output", str(partial), record["url"],
                ], check=True, capture_output=True, text=True)
                result.update(describe_file(partial, record["file_type"]))
                partial.replace(path)
                result["status"] = "downloaded"
            finally:
                partial.unlink(missing_ok=True)
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        result["status"] = "failed"
        result["error"] = (getattr(error, "stderr", None) or str(error)).strip()
    print(f"{result['status']}: {record['id']}", flush=True)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--only", nargs="+", help="Download only these source IDs")
    args = parser.parse_args()
    sources = json.loads((REFERENCES / "sources.json").read_text())["sources"]
    known = {source["id"] for source in sources}
    if args.only and set(args.only) - known:
        parser.error("Unknown source IDs: " + ", ".join(sorted(set(args.only) - known)))
    selected = [source for source in sources if not args.only or source["id"] in args.only]
    with ThreadPoolExecutor(max_workers=3) as pool:
        results = list(pool.map(download, selected))
    inventory_path = REFERENCES / "downloads.local.json"
    existing = json.loads(inventory_path.read_text()) if inventory_path.exists() else {}
    inventory = {item["id"]: item for item in existing.get("files", [])}
    inventory.update({item["id"]: item for item in results})
    payload = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "files": [inventory[key] for key in sorted(inventory)],
    }
    partial_inventory = inventory_path.with_suffix(".json.part")
    partial_inventory.write_text(json.dumps(payload, indent=2) + "\n")
    partial_inventory.replace(inventory_path)
    failures = sum(result["status"] == "failed" for result in results)
    print(f"{len(results) - failures}/{len(results)} requested references available.")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())

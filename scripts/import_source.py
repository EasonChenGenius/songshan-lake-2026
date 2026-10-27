"""One-time import of the verified published static site into this repository.

The previous GitHub Pages deployment already contains the original Site's
static files. Importing that deployment avoids depending on the original
Site's bot-protected origin for future builds.
"""

import argparse
import hashlib
import json
import re
import time
from pathlib import Path
from urllib.request import Request, urlopen

BASE = "https://easonchengenius.github.io/songshan-lake-2026/"
MANIFEST = Path(__file__).with_name("source-manifest.json")
CHALLENGE = re.compile(rb"<script>\(function\(\)\{function c\(\).*?</script>", re.S)


def download(path):
    last_error = None
    for attempt in range(4):
        try:
            request = Request(BASE + path, headers={"User-Agent": "songshan-lake-source-import/1.0"})
            with urlopen(request, timeout=45) as response:
                if response.status != 200:
                    raise RuntimeError(f"HTTP {response.status}")
                return response.read()
        except Exception as error:
            last_error = error
            if attempt < 3:
                time.sleep(attempt + 1)
    raise RuntimeError(f"Failed to download {path}: {last_error}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="dist")
    args = parser.parse_args()
    root = Path(args.output)
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    for name, expected_hash in manifest.items():
        relative = Path(name)
        if relative.is_absolute() or ".." in relative.parts:
            raise ValueError(f"Unsafe path: {name}")
        payload = download(name)
        if name == "index.html":
            payload = CHALLENGE.sub(b"", payload)
        actual_hash = hashlib.sha256(payload).hexdigest()
        if actual_hash != expected_hash:
            raise RuntimeError(f"Content mismatch for {name}: {actual_hash}")
        destination = root / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(payload)
        print(f"Imported {name} ({len(payload)} bytes)", flush=True)
    (root / ".nojekyll").touch()
    (root / "404.html").write_bytes((root / "index.html").read_bytes())
    print(f"Verified {len(manifest)} source files", flush=True)


if __name__ == "__main__":
    main()

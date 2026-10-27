"""Mirror the already-published, public Songshan Lake site for GitHub Pages.

The source project is not available through this workflow. This is a verified
static-file mirror, not a replacement for the editable original source code.
"""
import json
import re
import sys
from collections import deque
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse

import requests

ORIGIN = "https://see-the-unseen-songshan-2026.cheneason985.chatgpt.site"
PREFIX = "/songshan-lake-2026"
HOST = urlparse(ORIGIN).netloc
DEST = Path("dist")
SESSION = requests.Session()
SESSION.headers["User-Agent"] = "Mozilla/5.0 (compatible; SiteArchive/1.0)"

TEXT_EXT = {".html", ".css", ".js", ".svg", ".json", ".txt"}
STATIC_EXT = TEXT_EXT | {
    ".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".ico",
    ".mp4", ".webm", ".mp3", ".wav", ".woff", ".woff2", ".ttf", ".otf", ".vtt"
}
RESOURCE_RE = re.compile(
    r"""(?<![\w])(?:https?://[a-z0-9.\-]+/|/|\./|\.\./)?"""
    r"""(?:[\w@%+.\-]+/)*[\w@%+.\-]+\."""
    r"""(?:css|js|png|jpg|jpeg|webp|avif|svg|gif|ico|mp4|webm|mp3|wav|woff2?|ttf|otf|json|vtt)"""
    r"""(?:\?[\w=&.\-]+)?""", re.I
)
CSS_URL_RE = re.compile(r"url\(\s*['\"]?([^)'\"\s]+)['\"]?\s*\)", re.I)

class Refs(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []
        self.required = set()
    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        for key in ("src", "href", "poster"):
            if d.get(key):
                self.urls.append(d[key])
        for key in ("srcset",):
            if d.get(key):
                self.urls.extend(part.strip().split(" ")[0] for part in d[key].split(","))
        if tag in ("script", "link"):
            ref = d.get("src") or d.get("href")
            if ref and (tag == "script" or d.get("rel") in ("stylesheet",)):
                self.required.add(ref)

def remote_url(ref, page_url):
    if not ref or ref.startswith(("data:", "blob:", "#", "javascript:", "mailto:")):
        return None
    url = urljoin(page_url, ref)
    parsed = urlparse(url)
    if parsed.netloc != HOST:
        return None
    path = unquote(parsed.path)
    if path == "/":
        return ORIGIN + "/"
    if Path(path).suffix.lower() not in STATIC_EXT:
        return None
    if ".." in Path(path).parts:
        return None
    return ORIGIN + path

def rewrite_links(text):
    text = text.replace(ORIGIN + "/", PREFIX + "/")
    # All pages are served beneath the repository's base path.
    text = re.sub(
        r"""(?<=["'(])/(assets|styles?\.css|main\.js|[a-z0-9_\-]+\.css)(?=[/'")?])""",
        lambda m: PREFIX + m.group(0), text, flags=re.I
    )
    return text

def valid(path, response):
    ctype = response.headers.get("content-type", "").lower().split(";")[0]
    data = response.content
    lower = data[:512].lstrip().lower()
    ext = path.suffix.lower()
    if ext in {".css", ".js", ".json", ".vtt"}:
        return not lower.startswith((b"<!doctype html", b"<html"))
    if ext in {".jpg", ".jpeg"}:
        return data.startswith(b"\xff\xd8\xff")
    if ext == ".png":
        return data.startswith(b"\x89PNG\r\n\x1a\n")
    if ext == ".webp":
        return data.startswith(b"RIFF") and data[8:12] == b"WEBP"
    if ext == ".mp4":
        return data[4:8] == b"ftyp"
    if ext == ".svg":
        return b"<svg" in data[:2048]
    if ext == ".html":
        return b"<html" in lower or b"<!doctype html" in lower
    return not (ctype == "text/html" or lower.startswith(b"<!doctype html"))

queue = deque([(ORIGIN + "/", True)])
seen = set()
errors = []
required_paths = set()
saved = {}
root_parser = Refs()

while queue:
    url, required = queue.popleft()
    if url in seen:
        continue
    if len(seen) > 300:
        sys.exit("Unexpected asset count exceeded 300; refusing recursive mirror")
    seen.add(url)
    path_str = urlparse(url).path.lstrip("/")
    file = Path(path_str or "index.html")
    try:
        res = SESSION.get(url, timeout=35)
        res.raise_for_status()
        if not valid(file, res):
            raise ValueError("Unexpected file signature or HTML fallback")
        output = DEST / file
        output.parent.mkdir(parents=True, exist_ok=True)
        if file.suffix.lower() in TEXT_EXT or file.name == "index.html":
            body = res.content.decode("utf-8", errors="replace")
            refs = []
            if file.name == "index.html":
                root_parser.feed(body)
                refs.extend(root_parser.urls)
                for v in root_parser.required:
                    target = remote_url(v, url)
                    if target:
                        required_paths.add(urlparse(target).path.lstrip("/"))
            if file.suffix.lower() in {".css", ".js"} or file.name == "index.html":
                refs.extend(m.group(0) for m in RESOURCE_RE.finditer(body))
                refs.extend(m.group(1) for m in CSS_URL_RE.finditer(body))
            for ref in refs:
                child = remote_url(ref, url)
                if child and child not in seen:
                    queue.append((child, False))
            output.write_text(rewrite_links(body), encoding="utf-8")
        else:
            output.write_bytes(res.content)
        saved[str(file)] = len(res.content)
        print("OK", file, len(res.content))
    except Exception as exc:
        errors.append({"url": url, "error": str(exc)})
        print("MISSING", url, str(exc), flush=True)
        if required or path_str in required_paths:
            sys.exit(f"Essential site file missing: {url} ({exc})")

if not (DEST / "index.html").exists():
    sys.exit("Homepage missing")
missing_critical = sorted(p for p in required_paths if p not in saved)
if missing_critical:
    sys.exit(f"Missing entrypoint dependencies: {missing_critical}")
(DEST / "404.html").write_text((DEST / "index.html").read_text(encoding="utf-8"))
(DEST / ".nojekyll").touch()
report = {"downloaded": len(saved), "total_bytes": sum(saved.values()), "missing": errors}
(DEST / "mirror-manifest.json").write_text(
    json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8"
)
print("MIRROR REPORT:", json.dumps(report, ensure_ascii=False))
if len(saved) < 20:
    sys.exit("Suspiciously few assets downloaded. Refusing incomplete deployment.")

import re,sys,requests
from pathlib import Path
from urllib.parse import urljoin,urlparse,unquote
from collections import deque
ORIGIN="https://see-the-unseen-songshan-2026.cheneason985.chatgpt.site"
BASE="/songshan-lake-2026"
out=Path("dist"); q=deque([ORIGIN+"/"]); seen=set(); errors=[]
s=requests.Session();s.headers["User-Agent"]="Mozilla/5.0"
rx=re.compile(r'''(?:(?:https?://[^\s"'<>\\)]+)|(?:/|\./|\.\./)?[\w@.%+/-]+)\.(?:js|css|png|jpg|jpeg|webp|avif|svg|gif|ico|mp4|webm|mp3|woff2?|ttf|otf|json|vtt)(?:\?[^\s"'<>\\)]*)?''',re.I)
def resolve(v,base):
 u=urljoin(base,v)
 if urlparse(u).netloc!=urlparse(ORIGIN).netloc:return None
 return u.split("#")[0].split("?")[0]
def rewrite(t):
 t=t.replace(ORIGIN+"/",BASE+"/")
 t=re.sub(r'''(["'\x60(=])(/(?:assets|media|images|videos|fonts|static|_next)/)''',lambda m:m.group(1)+BASE+m.group(2),t)
 t=re.sub(r'url\(\s*(/[^)]+)\)',lambda m:'url('+BASE+m.group(1)+')',t)
 return t
while q and len(seen)<800:
 u=q.popleft()
 if u in seen:continue
 seen.add(u)
 try:
  r=s.get(u,timeout=40);r.raise_for_status()
  p=unquote(urlparse(u).path).lstrip("/") or "index.html"
  dest=out/p;dest.parent.mkdir(parents=True,exist_ok=True)
  ctype=r.headers.get("content-type","")
  if "text" in ctype or "javascript" in ctype or "json" in ctype or dest.suffix.lower() in (".html",".js",".css",".svg"):
   t=r.content.decode("utf-8",errors="replace")
   for m in rx.finditer(t):
    ref=resolve(m.group(0),u)
    if ref and ref not in seen:q.append(ref)
   for m in re.finditer(r'''(?:src|href|poster)=["']([^"']+)["']''',t):
    ref=resolve(m.group(1),u)
    if ref and re.search(r'\.(?:js|css|png|jpg|jpeg|webp|svg|mp4|webm|woff2?)$',ref,re.I):q.append(ref)
   dest.write_text(rewrite(t) if dest.suffix.lower() in (".html",".js",".css") else t,encoding="utf-8")
  else:dest.write_bytes(r.content)
  print("OK",p,len(r.content))
 except Exception as e:errors.append((u,str(e)));print("ERR",u,e)
if not (out/"index.html").exists():sys.exit("Cannot mirror the site: homepage unavailable")
html=(out/"index.html").read_text()
if "<html" not in html.lower():sys.exit("Homepage response was not HTML")
for a in re.findall(r'''/songshan-lake-2026/[^"'<>]+\.(?:js|css)''',html):
 if not (out/a.replace(BASE+"/","",1)).exists():sys.exit("Missing required asset: "+a)
(out/"404.html").write_text(html)
(out/".nojekyll").touch()
print("Completed:",len(seen),"URLs;",len(errors),"warnings")

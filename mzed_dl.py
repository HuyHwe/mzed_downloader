#!/usr/bin/env python3
"""
mzed_dl.py - download MZed course videos you have access to, for personal offline viewing.

How it works:
  1. Uses your logged-in MZed session (cookies from your browser, or a cookies.txt file).
  2. Reads the course page to find every module, then each module page to find its Vimeo player.
  3. Asks Vimeo for the player config (with the mzed.com referer it requires) and downloads
     the best progressive MP4 + English subtitles. Falls back to yt-dlp (HLS/DASH) if no MP4.

Examples:
  ./mzed_dl.py https://www.mzed.com/courses/how-to-photograph-everyone --list
  ./mzed_dl.py https://www.mzed.com/courses/how-to-photograph-everyone
  ./mzed_dl.py how-to-photograph-everyone --modules 3-4 --quality 540
"""
import argparse
import html
import http.cookiejar
import json
import os
import random
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

BASE = "https://www.mzed.com"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36")
CHUNK = 1024 * 1024


# ---------------------------------------------------------------- helpers
def log(msg=""):
    print(msg, flush=True)


def die(msg):
    log(f"\n✖ {msg}")
    sys.exit(1)


def safe_name(s):
    s = re.sub(r'[\\/:*?"<>|\r\n\t]+', " ", s)
    return re.sub(r"\s+", " ", s).strip(" .")[:150] or "untitled"


def parse_ranges(spec):
    """'1-3,5' -> {1,2,3,5}"""
    out = set()
    for part in spec.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            a, b = part.split("-", 1)
            out.update(range(int(a), int(b) + 1))
        else:
            out.add(int(part))
    return out


def human(n):
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} TB"


# ---------------------------------------------------------------- session
def load_cookies(args):
    if args.cookies:
        jar = http.cookiejar.MozillaCookieJar(args.cookies)
        jar.load(ignore_discard=True, ignore_expires=True)
        log(f"✔ Loaded cookies from {args.cookies}")
        return jar
    try:
        from yt_dlp.cookies import extract_cookies_from_browser
    except ImportError:
        die("yt-dlp is not installed in this Python. Run ./setup.sh first, or use --cookies cookies.txt")
    log(f"… Reading MZed login cookies from {args.browser} "
        "(macOS may ask for your Keychain password - click 'Allow')")
    try:
        jar = extract_cookies_from_browser(args.browser, args.profile)
    except Exception as e:  # noqa: BLE001
        die(f"Could not read cookies from {args.browser}: {e}")
    # keep only mzed cookies - nothing else from your browser is used
    mz = http.cookiejar.CookieJar()
    for c in jar:
        if "mzed.com" in c.domain:
            mz.set_cookie(c)
    if not len(mz):
        die(f"No mzed.com cookies found in {args.browser}. Log in to mzed.com in that browser first.")
    log(f"✔ Found {len(mz)} mzed.com cookies")
    return mz


class Http:
    def __init__(self, jar):
        self.mzed = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
        self.plain = urllib.request.build_opener()  # Vimeo: never send MZed cookies there

    def get(self, url, referer=None, mzed=False, headers=None):
        h = {"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"}
        if referer:
            h["Referer"] = referer
        h.update(headers or {})
        req = urllib.request.Request(url, headers=h)
        return (self.mzed if mzed else self.plain).open(req, timeout=60)

    def text(self, url, **kw):
        with self.get(url, **kw) as r:
            return r.read().decode("utf-8", "ignore")


# ---------------------------------------------------------------- MZed pages
def course_slug(arg):
    m = re.search(r"/courses/([^/?#]+)", arg)
    return m.group(1) if m else arg.strip("/")


def list_modules(http_, slug):
    page = http_.text(f"{BASE}/courses/{slug}", mzed=True)
    logged_in = re.search(r"logout", page, re.I) is not None
    title = slug
    t = re.search(r"<title>(.*?)</title>", page, re.S)
    if t:
        parts = [p.strip() for p in html.unescape(t.group(1)).split("|")]
        if len(parts) >= 2:
            title = parts[1]
    nums = sorted({int(n) for n in re.findall(rf"/courses/{re.escape(slug)}/modules/(\d+)", page)})
    return title, nums, logged_in


def module_info(http_, slug, num):
    url = f"{BASE}/courses/{slug}/modules/{num}"
    page = http_.text(url, mzed=True)
    t = re.search(r'videoplayer__title">\s*([^<]+)', page)
    title = html.unescape(t.group(1)).strip() if t else f"Module {num}"
    player = find_player(http_, page, url)
    nxt =re.search(rf'id="next_module" value="/courses/{re.escape(slug)}/modules/(\d+)', page)
    return {"num": num, "url": url, "title": title, "player": player, "html": page,
            "next": int(nxt.group(1)) if nxt else None,
            "logged_in": re.search(r"logout", page, re.I) is not None}


def find_player(http_, page, page_url):
    """Locate the Vimeo player URL in a module page, tolerating different markup styles."""
    flat = html.unescape(page).replace("\\/", "/")
    src = None
    # 1) the #mzed-player iframe (any quote style, src or data-src)
    tag = re.search(r"<iframe[^>]*id=[\"']?mzed-player[^>]*>", flat, re.I)
    if tag:
        s = re.search(r"\b(?:data-)?src=[\"']([^\"']+)[\"']", tag.group(0), re.I)
        if s and s.group(1).strip():
            src = s.group(1).strip()
    # 2) any Vimeo player / video URL anywhere in the page (incl. inline JS / JSON)
    if not src:
        m = re.search(r"(?:https?:)?//player\.vimeo\.com/video/\d+[^\"'\s<>]*", flat)
        if m:
            src = m.group(0)
    if not src:
        m = re.search(r"(?:vimeo[_-]?id|vimeoId|data-vimeo-id)[\"']?\s*[:=]\s*[\"']?(\d{5,})", flat, re.I) \
            or re.search(r"vimeo\.com/(?:video/)?(\d{5,})", flat)
        if m:
            src = f"https://player.vimeo.com/video/{m.group(1)}"
    if not src:
        return None
    if src.startswith("//"):
        src = "https:" + src
    src = urllib.parse.urljoin(page_url, src)
    if "player.vimeo.com" not in src:
        # MZed-hosted redirect to the player: follow it with your session
        try:
            with http_.get(src, referer=page_url, mzed=True) as r:
                final = r.geturl()
                body = r.read().decode("utf-8", "ignore")
            if "player.vimeo.com" in final:
                return final
            m = re.search(r"https://player\.vimeo\.com/video/\d+[^\"'\s<>]*", html.unescape(body))
            return m.group(0) if m else None
        except Exception:  # noqa: BLE001
            return None
    return src


# ---------------------------------------------------------------- Vimeo
def vimeo_config(http_, player_url):
    page = http_.text(player_url, referer=BASE + "/")
    i = page.find("window.playerConfig")
    if i < 0:
        raise RuntimeError("Vimeo page had no playerConfig (embed blocked or layout changed)")
    i = page.index("{", i)
    cfg, _ = json.JSONDecoder().raw_decode(page[i:])
    return cfg


def pick_progressive(cfg, max_h):
    files = cfg.get("request", {}).get("files", {}).get("progressive") or []
    files = [f for f in files if f.get("url")]
    ok = [f for f in files if (f.get("height") or 0) <= max_h] or files
    return max(ok, key=lambda f: f.get("height") or 0) if ok else None


def download_file(http_, url, dest, refresh=None, retries=4):
    """Stream to dest.part with resume; refresh() returns a fresh URL if the signed one expired."""
    part = dest + ".part"
    for attempt in range(1, retries + 1):
        have = os.path.getsize(part) if os.path.exists(part) else 0
        headers = {"Range": f"bytes={have}-"} if have else {}
        try:
            with http_.get(url, referer=BASE + "/", headers=headers) as r:
                if have and r.status != 206:  # server ignored Range -> start over
                    have = 0
                total = have + int(r.headers.get("Content-Length") or 0)
                start, done = time.time(), have
                with open(part, "ab" if have else "wb") as f:
                    while True:
                        chunk = r.read(CHUNK)
                        if not chunk:
                            break
                        f.write(chunk)
                        done += len(chunk)
                        el = max(time.time() - start, 0.001)
                        speed = (done - have) / el
                        pct = f"{done * 100 / total:5.1f}%" if total else ""
                        sys.stdout.write(f"\r    {pct} {human(done)} / {human(total)}  {human(speed)}/s   ")
                        sys.stdout.flush()
            sys.stdout.write("\n")
            if total and os.path.getsize(part) < total:
                raise IOError("connection ended early")
            os.replace(part, dest)
            return
        except (urllib.error.URLError, IOError, TimeoutError) as e:
            sys.stdout.write("\n")
            code = getattr(e, "code", None)
            if code == 416:  # already complete
                os.replace(part, dest)
                return
            log(f"    ⚠ attempt {attempt} failed: {e}")
            if attempt == retries or code == 404:
                raise
            if code in (401, 403, 410) and refresh:
                log("    … link expired, asking Vimeo for a fresh one")
                url = refresh()
            time.sleep(5 * attempt)


def save_subtitles(http_, cfg, folder, name):
    """Best effort: Vimeo's caption links are sometimes dead (404). Never fails the lesson."""
    for tt in cfg.get("request", {}).get("text_tracks") or []:
        url = tt.get("url") or ""
        if url.startswith("/"):
            url = "https://player.vimeo.com" + url
        sub = os.path.join(folder, f"{name}.{tt.get('lang', 'en')}.vtt")
        if not url or os.path.exists(sub):
            continue
        try:
            with http_.get(url, referer=BASE + "/") as r:
                data = r.read()
            with open(sub, "wb") as f:
                f.write(data)
            log(f"    ✔ subtitles ({tt.get('label') or tt.get('lang')})")
        except Exception as e:  # noqa: BLE001
            log(f"    ⚠ subtitles unavailable from Vimeo ({e}) - video is fine")


def ytdlp_fallback(player_url, dest_noext):
    try:
        import yt_dlp
    except ImportError:
        raise RuntimeError("no progressive MP4 and yt-dlp not installed for HLS fallback")
    opts = {
        "outtmpl": dest_noext + ".%(ext)s",
        "format": "bv*+ba/b",
        "merge_output_format": "mp4",
        "http_headers": {"Referer": BASE + "/", "User-Agent": UA},
        "quiet": False,
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        ydl.download([player_url])


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser(description="Download MZed course videos (your own account, personal use).")
    ap.add_argument("course", help="course URL, module URL, or course slug")
    ap.add_argument("--browser", default="chrome",
                    help="browser you're logged into MZed with: chrome, safari, firefox, edge, brave, arc... (default chrome)")
    ap.add_argument("--profile", default=None, help="browser profile name, if not the default one")
    ap.add_argument("--cookies", help="use a Netscape cookies.txt file instead of reading the browser")
    ap.add_argument("-o", "--out", default=os.path.expanduser("~/Movies/MZed"), help="output folder (default ~/Movies/MZed)")
    ap.add_argument("-m", "--modules", help="only these module numbers, e.g. '1-3,5'")
    ap.add_argument("-q", "--quality", type=int, default=2160, help="max height: 360, 540, 720, 1080, 2160 (default best)")
    ap.add_argument("--delay", type=float, default=20, help="avg seconds to pause between lessons (default 20)")
    ap.add_argument("--no-subs", action="store_true", help="skip subtitle (.vtt) download")
    ap.add_argument("--list", action="store_true", help="only list modules and available qualities, download nothing")
    ap.add_argument("--debug", action="store_true", help="save each raw module page to ./debug/ for troubleshooting")
    args = ap.parse_args()

    http_ = Http(load_cookies(args))
    slug = course_slug(args.course)
    course_title, nums, logged_in = list_modules(http_, slug)
    if not logged_in:
        die("MZed doesn't see you as logged in. Log in at mzed.com in your browser "
            f"({args.browser}) and try again, or pass --browser / --cookies.")
    if not nums:
        nums = [1]
    wanted = parse_ranges(args.modules) if args.modules else None
    folder = os.path.join(args.out, safe_name(course_title))
    log(f"\n▶ {course_title}  ({len(nums)} modules found)  →  {folder}\n")

    queue, seen, downloaded_any, failures = list(nums), set(), False, []
    while queue:
        num = queue.pop(0)
        if num in seen:
            continue
        seen.add(num)
        if wanted and num not in wanted:
            continue
        try:
            info = module_info(http_, slug, num)
        except urllib.error.HTTPError as e:
            log(f"[{num:02d}] ✖ page error {e.code}")
            failures.append(num)
            continue
        if info["next"] and info["next"] not in seen and info["next"] not in queue:
            queue.append(info["next"])  # catch modules the course page didn't list
        name = f"{num:02d} - {safe_name(info['title'])}"
        if args.debug:
            dbg = os.path.join(os.path.dirname(os.path.abspath(__file__)), "debug")
            os.makedirs(dbg, exist_ok=True)
            p = os.path.join(dbg, f"module-{num}.html")
            with open(p, "w", encoding="utf-8") as f:
                f.write(info["html"])
            log(f"[{num:02d}] debug: raw page saved to {p}  (player found: {info['player']})")
        if not info["player"]:
            why = ("not logged in" if not info["logged_in"] else
                   "no video player found on this page (re-run with --debug and share debug/module-N.html)")
            log(f"[{num:02d}] ✖ {info['title']}: {why}")
            failures.append(num)
            continue

        dest = os.path.join(folder, name + ".mp4")
        try:
            cfg = vimeo_config(http_, info["player"])
            best = pick_progressive(cfg, args.quality)
            qual = f"{best['quality']}" if best else "HLS/DASH via yt-dlp"
            avail = ", ".join(sorted({f.get("quality", "?") for f in
                                      cfg["request"]["files"].get("progressive") or []}, reverse=True))
            log(f"[{num:02d}] {info['title']}  —  {qual}  (available: {avail or 'stream only'})")
            if args.list:
                continue
            if os.path.exists(dest):
                log("    ✔ already downloaded, skipping")
                continue
            if downloaded_any and args.delay > 0:
                pause = random.uniform(args.delay * 0.5, args.delay * 1.5)
                log(f"    … pausing {pause:.0f}s")
                time.sleep(pause)
            os.makedirs(folder, exist_ok=True)

            if best:
                def refresh(player=info["player"]):
                    return pick_progressive(vimeo_config(http_, player), args.quality)["url"]
                download_file(http_, best["url"], dest, refresh=refresh)
                if not args.no_subs:
                    save_subtitles(http_, cfg, folder, name)
            else:
                ytdlp_fallback(info["player"], os.path.join(folder, name))
                if not args.no_subs:
                    save_subtitles(http_, cfg, folder, name)
            downloaded_any = True
            log("    ✔ saved")
        except KeyboardInterrupt:
            die("Stopped. Run the same command again to resume where you left off.")
        except Exception as e:  # noqa: BLE001
            log(f"    ✖ failed: {e}")
            failures.append(num)

    log("")
    if failures:
        log(f"Done with problems on module(s): {', '.join(map(str, failures))}. Re-run to retry them.")
    else:
        log("✔ All done." if not args.list else "✔ Listing done (nothing downloaded).")


if __name__ == "__main__":
    main()

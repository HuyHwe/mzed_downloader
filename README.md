# MZed downloader

Downloads MZed course videos from **your own logged-in account** for personal offline viewing.

## One-time setup
```bash
cd ~/"mzed downloader"
./setup.sh
```

## Everyday use
1. Log in to mzed.com in Chrome (or another browser).
2. Copy the course URL, e.g. `https://www.mzed.com/courses/how-to-photograph-everyone`.
3. Preview, then download:
```bash
./mzed https://www.mzed.com/courses/how-to-photograph-everyone --list   # preview only
./mzed https://www.mzed.com/courses/how-to-photograph-everyone          # download all
```
Videos go to `~/Movies/MZed/<Course name>/01 - <Lesson>.mp4`.

## Options
| Option | Example | Meaning |
|---|---|---|
| `--browser` | `--browser safari` | Browser you're logged in with (chrome, safari, firefox, edge, brave, arc) |
| `--profile` | `--profile "Profile 1"` | Non-default Chrome profile |
| `--cookies` | `--cookies cookies.txt` | Use an exported cookies.txt instead of reading the browser |
| `-m` | `-m 1-3,5` | Only some modules |
| `-q` | `-q 540` | Max quality (360 / 540 / 720 / 1080 / 2160) |
| `-o` | `-o /Volumes/SSD/MZed` | Output folder |
| `--delay` | `--delay 40` | Average pause between lessons in seconds (default 20) |
| `--no-subs` | | Don't try to fetch subtitles |
| `--list` | | Show modules and qualities, download nothing |

## Good to know
- **Resume:** Ctrl+C anytime; run the same command again and it continues. Finished files are skipped.
- **Keychain prompt (Chrome/Brave/Edge/Arc):** macOS asks to let Python read "Chrome Safe Storage". Click *Allow*.
- **Safari:** give your Terminal app Full Disk Access (System Settings → Privacy & Security), or use Chrome.
- **"MZed doesn't see you as logged in":** log in again in the browser, or check `--browser` / `--profile`.
- **Subtitles** are best-effort. Vimeo's caption links are dead for some videos; the video still downloads.
- **Updating yt-dlp** (if Vimeo changes something): `./setup.sh` again.

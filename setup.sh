#!/bin/bash
# One-time setup: creates a private Python environment with yt-dlp inside this folder.
set -e
cd "$(dirname "$0")"
python3 -m venv .venv
.venv/bin/pip install --quiet --upgrade pip
.venv/bin/pip install --quiet --upgrade yt-dlp
chmod +x mzed_dl.py mzed
command -v ffmpeg >/dev/null || echo "Note: ffmpeg not found (only needed for the rare HLS fallback): brew install ffmpeg"
echo "✔ Setup done. Try:  ./mzed https://www.mzed.com/courses/how-to-photograph-everyone --list"

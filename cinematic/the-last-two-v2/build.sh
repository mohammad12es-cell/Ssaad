#!/usr/bin/env bash
# THE LAST TWO v2 — full native-4K build, resumable.
#   ./build.sh [MB]      MB = motion-blur/AA subframes per frame (default 3)
# Renders 15 one-second segments in 3 parallel workers (finished segments are skipped on re-run),
# then concatenates them, encodes the delivery master and muxes the synthesized score.
set -euo pipefail
cd "$(dirname "$0")"
MB=${1:-3}; SEG=segments; mkdir -p "$SEG" ../../output
for r in "0 120" "120 240" "240 360"; do set -- $r
  node render.mjs --segdir "$SEG" --from "$1" --to "$2" --mb "$MB" > "$SEG/log_$1.txt" 2>&1 &
done; wait
n=$(ls "$SEG"/seg*.mkv | grep -vc part); [ "$n" -eq 15 ] || { echo "only $n/15 segments"; exit 1; }
python3 audio.py "$SEG/audio.wav"
ls "$SEG"/seg*.mkv | grep -v part | sed "s|^$SEG/|file '|; s|$|'|" > "$SEG/list.txt"
# full-quality master (~150 MB) and a GitHub-sized copy (<100 MB)
ffmpeg -y -loglevel error -f concat -safe 0 -i "$SEG/list.txt" -i "$SEG/audio.wav" -map 0:v -map 1:a \
  -c:v libx264 -preset slow -tune film -crf 12 -pix_fmt yuv420p -r 24 -c:a aac -b:a 320k -ar 48000 -t 15 \
  -movflags +faststart -metadata title="The Last Two" "$SEG/the-last-two-v2-4k-master.mp4"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$SEG/list.txt" -i "$SEG/audio.wav" -map 0:v -map 1:a \
  -c:v libx264 -preset slow -tune film -b:v 46M -maxrate 60M -bufsize 90M -pix_fmt yuv420p -r 24 -c:a aac -b:a 320k -ar 48000 -t 15 \
  -movflags +faststart -metadata title="The Last Two" ../../output/the-last-two-v2-4k.mp4
echo "done"

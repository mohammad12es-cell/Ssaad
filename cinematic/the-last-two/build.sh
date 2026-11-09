#!/usr/bin/env bash
# Rebuild THE LAST TWO end to end: picture (3 parallel chunks) + score, muxed to exactly 15.000 s.
# usage: ./build.sh [MB]   (MB = motion-blur/AA subframes per frame, default 2)
set -euo pipefail
cd "$(dirname "$0")"
MB=${1:-2}; TMP=$(mktemp -d); OUT=../../output/the-last-two-cinematic.mp4
for i in 0 1 2; do node render.mjs --out "$TMP/p$i.mp4" --from $((i*120)) --to $(((i+1)*120)) --mb "$MB" & done; wait
python3 audio.py "$TMP/audio.wav"
printf "file '%s'\n" "$TMP/p0.mp4" "$TMP/p1.mp4" "$TMP/p2.mp4" > "$TMP/list.txt"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$TMP/list.txt" -i "$TMP/audio.wav" \
  -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -ar 48000 -t 15 -movflags +faststart \
  -metadata title="The Last Two" "$OUT"
rm -rf "$TMP"; echo "done -> $OUT"

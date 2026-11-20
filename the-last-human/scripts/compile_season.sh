#!/usr/bin/env bash
# Concatenate the 10 validated episodes into 5-minute season compilations (all three versions)
# and write season-long SRT files. Episodes are joined with stream copy (identical encoding params).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p output/season
for V in clean main_fa international_en; do
  case $V in clean) S=clean;; main_fa) S=FA;; international_en) S=EN;; esac
  L=build/concat_$V.txt; : > $L
  for i in $(seq -w 1 10); do echo "file '$PWD/output/episodes/$V/TLH_S01E${i}_${S}.mp4'" >> $L; done
  ffmpeg -y -loglevel error -f concat -safe 0 -i $L -c copy -movflags +faststart output/season/TLH_S01_COMPLETE_${S}.mp4
  echo "season $V: $(ffprobe -v error -show_entries format=duration -of csv=p=0 output/season/TLH_S01_COMPLETE_${S}.mp4)s"
done
npx tsx scripts/write_season_srt.ts

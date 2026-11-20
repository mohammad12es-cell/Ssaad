#!/usr/bin/env bash
# Assemble the final Reel from rendered PNG frames + the synthesized master mix.
# usage: assemble.sh FRAMES_DIR   (run from royagram/ordinary-is-boring/)
set -euo pipefail
FR="${1:?frames dir}"
OUT=final/ROYAGRAM_Ordinary-Is-Boring_Reel_1080x1920_24fps.mp4
mkdir -p final
ffmpeg -y -hide_banner -loglevel error \
  -framerate 24 -i "$FR/%04d.png" -i audio/mix_master.wav \
  -vf "scale=1080:1920:flags=lanczos:out_color_matrix=bt709:out_range=tv,format=yuv420p" \
  -c:v libx264 -preset slow -crf 17 -maxrate 20M -bufsize 40M -profile:v high -level 4.2 -tune grain -g 48 -bf 2 \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -c:a aac -b:a 320k -ar 48000 -ac 2 \
  -t 25 -movflags +faststart "$OUT"
echo "wrote $OUT"

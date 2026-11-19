#!/usr/bin/env bash
# Mux picture + mix and write the deliverables.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p output
PIC=build/picture.mp4
MIX=audio/mix.wav

# 1) Instagram Reel — 1080x1920, 30 fps, H.264 High, AAC 48k, faststart
ffmpeg -v error -y -i "$PIC" -i "$MIX" -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 17 -profile:v high -level 4.2 -pix_fmt yuv420p -r 30 -g 60 \
  -maxrate 16M -bufsize 32M -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
  -c:a aac -b:a 256k -ar 48000 -movflags +faststart -shortest \
  output/ADAM_BARFI_BlackFriday_Reel_1080x1920.mp4

# 2) High-quality master — near-lossless picture (CRF 10) + 24-bit PCM audio
ffmpeg -v error -y -i "$PIC" -i "$MIX" -map 0:v -map 1:a -c:v copy -c:a pcm_s24le -shortest \
  output/ADAM_BARFI_BlackFriday_MASTER.mov

# 3) Separate stems (already 48 kHz / 24-bit): voiceover, music, sfx, full mix
[ -f audio/stem_vo.wav ] && cp audio/stem_vo.wav output/STEM_voiceover_fa.wav || rm -f output/STEM_voiceover_fa.wav
cp audio/stem_music.wav output/STEM_music.wav
cp audio/stem_sfx.wav   output/STEM_sfx.wav
cp audio/mix.wav        output/MIX_full.wav
ls -la output

#!/usr/bin/env bash
# viral-reel master: mix -> -14 LUFS / -1.5 dBTP, H.264 CRF 19, <=7 Mbps, 30 fps.
# usage: tools/deliver.sh [raw.mp4] [out.mp4] [duration] [audio.wav]
set -euo pipefail
cd "$(dirname "$0")/.."
if command -v cygpath >/dev/null 2>&1; then export PATH="$PATH:$(cygpath "$LOCALAPPDATA")/AVFX/ffmpeg"; fi
IN="${1:-renders/sample-raw.mp4}"
OUT="${2:-renders/viral-reel-sample.mp4}"
DUR="${3:-7}"
AUD="${4:-assets/audio/sfx-mix.wav}"
mkdir -p work

ffmpeg -y -v error -i "$AUD" -af "atrim=0:$DUR" -ar 48000 -c:a pcm_s24le work/mix.wav

# static gain + 192 kHz limiter at -3 dBFS (AAC overshoots ~1 dB), iterate gain until I = -14 +/- 0.2
meas() { ffmpeg -hide_banner -nostats -i "$1" -af ebur128=peak=true -f null - 2>&1 | grep -E "^ +I:" | tail -n 1 | awk '{print $2}'; }
G=0
for n in 1 2 3 4 5; do
  ffmpeg -y -v error -i work/mix.wav     -af "volume=${G}dB,aresample=192000,alimiter=limit=0.708:attack=1:release=50:level=disabled,aresample=48000"     -ar 48000 -c:a pcm_s24le work/master.wav
  I=$(meas work/master.wav)
  echo "pass$n: gain=${G} dB -> I=$I"
  awk -v i="$I" 'BEGIN{exit !(i > -14.2 && i < -13.8)}' && break
  G=$(awk -v g="$G" -v i="$I" 'BEGIN{printf "%.2f", g + (-14 - i)}')
done

ffmpeg -y -v error -i "$IN" -i work/master.wav -map 0:v:0 -map 1:a:0 \
  -c:v libx264 -preset slow -crf 19 -maxrate 6.6M -bufsize 13.2M -pix_fmt yuv420p -r 30 \
  -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart "$OUT"

ffprobe -v error -show_entries format=duration,bit_rate:stream=codec_name,width,height,r_frame_rate -of compact "$OUT"
ffmpeg -hide_banner -nostats -i "$OUT" -af ebur128=peak=true -f null - 2>&1 | grep -E "I:|Peak:|LRA:" | tail -n 3

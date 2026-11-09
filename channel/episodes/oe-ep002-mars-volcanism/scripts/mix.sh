#!/usr/bin/env bash
# Final audio mix + H.264 encode with FFmpeg.
# Narration clips are placed at the timeline starts; the sound-design stem ducks under the voice.
set -euo pipefail
cd "$(dirname "$0")/.."
A=public/audio
DUR=$(python3 -I -c "import sys; sys.path.insert(0,'scripts'); from timeline import end; print(end('public/audio/vo.json'))")
OUT=${1:-../../../output/oddly_explained_ep002.mp4}
mapfile -t STARTS < <(python3 -I -c "
import sys; sys.path.insert(0,'scripts')
from timeline import build
for c in build('$A/vo.json'): print(int(round(c['start']*1000)))
")
inputs=(); filt=""; labels=""
for i in "${!STARTS[@]}"; do
  n=$((i+1)); inputs+=(-i "$A/vo$n.wav")
  filt+="[$((i+2)):a]aresample=48000,adelay=${STARTS[$i]}|${STARTS[$i]},pan=stereo|c0=c0|c1=c0[v$n];"
  labels+="[v$n]"
done
filt+="${labels}amix=inputs=${#STARTS[@]}:normalize=0,highpass=f=70,equalizer=f=180:t=q:w=1:g=2,equalizer=f=3500:t=q:w=1.2:g=2.5,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,asplit=2[vo][vokey];"
filt+="[1:a]volume=0.75[fx];[fx][vokey]sidechaincompress=threshold=0.04:ratio=5:attack=20:release=350[fxd];"
filt+="[vo][fxd]amix=inputs=2:normalize=0,atrim=0:$DUR,loudnorm=I=-14:TP=-1.5:LRA=9,aresample=48000[aout]"
ffmpeg -y -loglevel error -i build/video.mp4 -i "$A/fx.wav" "${inputs[@]}" \
  -filter_complex "$filt" -map 0:v -map "[aout]" \
  -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -r 30 -profile:v high -level 4.2 \
  -c:a aac -b:a 192k -ar 48000 -movflags +faststart -t $DUR "$OUT"
echo "wrote $OUT"

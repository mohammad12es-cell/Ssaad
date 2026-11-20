#!/usr/bin/env bash
# Render ONE episode end-to-end (independently of all others):
#   audio mix -> 3D picture (Remotion) -> subtitle layers (FA/EN, alpha) -> 3 deliverables -> SRTs -> validation
# usage: scripts/render_episode.sh 1 [--concurrency N]
set -euo pipefail
cd "$(dirname "$0")/.."
N=$1; NN=$(printf %02d "$N"); CONC=${CONC:-2}
B=build; mkdir -p $B/video $B/subs $B/audio output/episodes/{main_fa,international_en,clean} output/subtitles
BUNDLE=$B/bundle
echo "== EP$NN: bundle"; npx remotion bundle src/index.ts --out-dir $BUNDLE >/dev/null 2>&1
echo "== EP$NN: audio"; python3 src/audio/score.py "$N"
echo "== EP$NN: picture"; t0=$(date +%s)
npx remotion render $BUNDLE "Ep$NN" $B/video/ep${NN}_pic.mp4 --codec=h264 --crf=12 --muted --concurrency=$CONC --log=error
echo "   picture took $(( $(date +%s)-t0 ))s"
echo "== EP$NN: subtitle layers"
for L in FA EN; do npx remotion render $BUNDLE "Subs${L}${NN}" $B/subs/ep${NN}_${L}.mov --codec=prores --prores-profile=4444 --pixel-format=yuva444p10le --image-format=png --concurrency=4 --log=error; done
echo "== EP$NN: deliverables"
AUD="-i $B/audio/ep${NN}_mix.wav"
ENC="-c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -r 30 -movflags +faststart -c:a aac -b:a 256k -ar 48000"
LN="loudnorm=I=-14:TP=-1.5:LRA=11"
ffmpeg -y -loglevel error -i $B/video/ep${NN}_pic.mp4 $AUD -map 0:v -map 1:a -af "$LN" $ENC -t 30 output/episodes/clean/TLH_S01E${NN}_clean.mp4
ffmpeg -y -loglevel error -i $B/video/ep${NN}_pic.mp4 -i $B/subs/ep${NN}_FA.mov $AUD -filter_complex "[0:v][1:v]overlay=0:0:format=auto[v]" -map "[v]" -map 2:a -af "$LN" $ENC -t 30 output/episodes/main_fa/TLH_S01E${NN}_FA.mp4
ffmpeg -y -loglevel error -i $B/video/ep${NN}_pic.mp4 -i $B/subs/ep${NN}_EN.mov $AUD -filter_complex "[0:v][1:v]overlay=0:0:format=auto[v]" -map "[v]" -map 2:a -af "$LN" $ENC -t 30 output/episodes/international_en/TLH_S01E${NN}_EN.mp4
npx tsx scripts/write_srt.ts "$N"
python3 scripts/validate.py "$N"

#!/bin/bash
# Build the score, then reach -16 LUFS with ONE fixed gain + a transparent peak limiter,
# so the relative dynamics between chapters are preserved (no automatic gain riding).
set -e
cd "$(dirname "$0")/.."
python3 -I tools/score.py assets/score_raw.wav
I=$(ffmpeg -hide_banner -i assets/score_raw.wav -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" | tail -1 | awk '{print $2}')
G=$(python3 -c "print(round(-16.0 - ($I), 2))")
echo "raw integrated $I LUFS -> gain ${G} dB"
ffmpeg -hide_banner -loglevel error -y -i assets/score_raw.wav -af "volume=${G}dB,alimiter=limit=0.84:attack=3:release=60:level=false" -ar 48000 assets/score.wav
rm assets/score_raw.wav
ffmpeg -hide_banner -i assets/score.wav -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|LRA|Peak):" | tail -3

#!/usr/bin/env bash
# ODDLY EXPLAINED — build one video end to end.
# usage: ./build.sh videos/001-falling-asleep [--preview]
#   --preview  : quick 1/3-resolution contact sheet of the 3D layer only (minutes, for look-dev)
set -euo pipefail
cd "$(dirname "$0")"
VDIR=${1:?usage: ./build.sh videos/<id> [--preview]}
ID=$(python3 -c "import json;print(json.load(open('$VDIR/config.json'))['id'])")
NUM=$(basename "$VDIR" | cut -d- -f1)
BUILD=build/$NUM
OUT=${OUT:-../output/oddly-explained/$ID}
WORKERS=${WORKERS:-3}
mkdir -p "$BUILD"

if [[ "${2:-}" == "--preview" ]]; then
  node engine/render_frames.js --page "$VDIR/scene.html" --scale 0.33 --workers "$WORKERS" \
    --list "$(python3 -c "print(','.join(str(i) for i in range(0,900,30)))")" --out "$BUILD/preview3d"
  python3 engine/contact_sheet.py "$BUILD/preview3d" "$BUILD/preview3d/contact.jpg" --cols 10
  echo "preview: $BUILD/preview3d/contact.jpg"; exit 0
fi

echo "== 1/5 narration (Kokoro TTS + Whisper alignment)"; python3 engine/tts.py "$VDIR" "$BUILD/audio"
echo "== 2/5 score + sound design";                     python3 "$VDIR/sound.py" "$BUILD/audio"
echo "== 3/5 3D layer (900 frames, slowest step)";      node engine/render_frames.js --page "$VDIR/scene.html" --workers "$WORKERS" --out "$BUILD/frames3d"
echo "== 4/5 text layers, mix, subtitles";              python3 engine/compose.py "$VDIR" "$BUILD" "$OUT" --steps mix,srt,text
echo "== 5/5 encode + preview + QC";                    python3 engine/compose.py "$VDIR" "$BUILD" "$OUT" --steps encode,clean,preview,qc
echo "done -> $OUT"

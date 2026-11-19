#!/usr/bin/env bash
# Persian female voiceover, generated offline with Piper TTS
# (voice: fa_IR-magnoliasis-medium, female, ~220 Hz median pitch).
# One WAV per script line so each sentence can be placed on its scene.
#   pip install piper-tts
#   model: https://huggingface.co/rhasspy/piper-voices/tree/main/fa/fa_IR/magnoliasis/medium
# To use a recorded human voice instead, drop vo1.wav ... vo6.wav into audio/vo/
# (same order as voiceover_script.txt) and re-run 02_audio.py + render.
set -euo pipefail
cd "$(dirname "$0")/.."
MODEL=${PIPER_MODEL:-build/fa_IR-magnoliasis-medium.onnx}
mkdir -p audio/vo
i=1
while IFS= read -r line; do
  [ -z "$line" ] && continue
  echo "$line" | python3 -m piper -m "$MODEL" --length-scale 1.0 --noise-scale 0.6 --noise-w-scale 0.7 -f audio/vo/raw_vo$i.wav
  i=$((i+1))
done < audio/voiceover_script.txt
echo "voiceover lines -> audio/vo/raw_vo*.wav"

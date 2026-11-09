"""Generate narration with Kokoro (local neural TTS). Usage: python tts.py <model_dir> <out_dir>"""
import sys, json, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

LINES = [
    "What if a dinosaur died 115 million years ago... but scientists could still find traces of its blood today?",
    "That's exactly what researchers reported inside a fossilized dinosaur bone discovered in Brazil.",
    "Using advanced chemical analysis, they detected traces of heme, a molecule associated with hemoglobin, the protein that carries oxygen in blood.",
    "Even more surprising, they found microscopic structures that look like mineralized red blood cells inside the bone's ancient blood-vessel channels.",
    "But here's the catch: these aren't preserved drops of blood. And scientists still debate whether those structures are truly blood cells.",
    "A 115-million-year-old biological mystery, still waiting to be fully understood.",
]
model_dir, out = sys.argv[1], sys.argv[2]
k = Kokoro(f"{model_dir}/kokoro-v1.0.onnx", f"{model_dir}/voices-v1.0.bin")
voice = 0.6 * k.get_voice_style("am_onyx") + 0.4 * k.get_voice_style("am_michael")
speed = float(sys.argv[3]) if len(sys.argv) > 3 else 0.95
info = []
for i, line in enumerate(LINES):
    audio, sr = k.create(line, voice=voice, speed=speed, lang="en-us")
    # trim leading/trailing silence
    a = np.abs(audio); idx = np.where(a > 0.01)[0]
    audio = audio[max(0, idx[0] - 800): idx[-1] + 2400]
    sf.write(f"{out}/vo{i+1}.wav", audio, sr)
    info.append({"file": f"vo{i+1}.wav", "text": line, "duration": round(len(audio) / sr, 3)})
    print(i + 1, info[-1]["duration"])
json.dump(info, open(f"{out}/vo.json", "w"), indent=2)

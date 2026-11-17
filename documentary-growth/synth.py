import sys, wave, json, os
from piper import PiperVoice
from piper.config import SynthesisConfig
sys.path.insert(0, os.path.dirname(__file__)); from lines import LINES
model, out, ls = sys.argv[1], sys.argv[2], float(sys.argv[3])
os.makedirs(out, exist_ok=True)
v = PiperVoice.load(model)
cfg = SynthesisConfig(length_scale=ls, noise_scale=0.6, noise_w_scale=0.7)
d = {}
for i,t,p in LINES:
    with wave.open(f"{out}/{i}.wav","wb") as w: v.synthesize_wav(t.replace("...",""), w, syn_config=cfg)
    w = wave.open(f"{out}/{i}.wav"); d[i] = w.getnframes()/w.getframerate()
json.dump(d, open(f"{out}/dur.json","w"), indent=1)
print(sum(d.values()), sum(p for *_,p in LINES))

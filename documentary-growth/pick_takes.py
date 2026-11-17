"""Generate several takes per narration line (spelling variants x random seeds) and keep
the take whose Whisper transcript best matches the intended text. Audio-only respellings;
subtitles always use the original script text."""
import sys, os, wave, json, re, difflib, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lines import LINES
from trimdur import trimmed
from piper import PiperVoice
from piper.config import SynthesisConfig
from faster_whisper import WhisperModel

VARIANTS = {
 "q2": ["من کجام؟", "مَن کُجام؟", "من کجام"],
 "q4": ["من باید رشد کنم", "من باید رُشد کنم"],
 "s1": ["ورزش؟", "وَرزِش؟"],
 "s2": ["تحصیل؟", "تَحصیل؟", "تحصیل"],
 "s4": ["پول؟", "پول"],
 "q5": ["واقعن چی؟", "واقِعَن چی؟"],
 "q6": ["اصلن رشد یعنی چی؟", "اَصلَن رشد یعنی چی؟"],
 "a1": ["رسیدن به قله؟", "رسیدن به قُلّه؟"],
 "a2": ["یک دستاورد ورزشی؟", "یِک دَستاوَردِ وَرزِشی؟"],
 "a3": ["یک مدرک؟", "یِک مَدرَک؟"],
 "a4": ["یک حساب بانکی پر؟", "یک حسابِ بانکیِ پُر؟"],
 "e1": ["شاید خوشبختی مقصد نباشه", "شاید خوشبختی مَقصَد نباشه"],
 "e3": ["و شاید رشد واقعی،", "و شاید رشدِ واقعی،"],
}
LS = {"q1":1.12,"q2":1.1,"t1":1.08,"e5":1.15,"w1":1.1,"q6":1.05}  # slower on key phrases
def norm(s):
    s = re.sub(r"[ً-ْ‌\s،؟?.!…\-]", "", s)
    return s.replace("اً","ا").replace("اصلا","اصلن").replace("واقعا","واقعن").replace("ي","ی").replace("ك","ک")
model, out, base_ls, n = sys.argv[1], sys.argv[2], float(sys.argv[3]), int(sys.argv[4])
os.makedirs(out, exist_ok=True)
v = PiperVoice.load(model)
asr = WhisperModel("medium", device="cpu", compute_type="int8")
report = {}
for lid, text, _ in LINES:
    target = norm(text.replace("...", ""))
    best = None
    for spell in VARIANTS.get(lid, [text.replace("...", "")]):
        for k in range(n if lid in VARIANTS or True else 1):
            cfg = SynthesisConfig(length_scale=LS.get(lid, base_ls), noise_scale=0.55, noise_w_scale=0.6)
            tmp = f"{out}/_tmp.wav"
            with wave.open(tmp, "wb") as w: v.synthesize_wav(spell, w, syn_config=cfg)
            x, sr = trimmed(tmp)
            m = int(len(x)*16000/sr)
            y = np.interp(np.linspace(0, len(x)-1, m), np.arange(len(x)), x).astype(np.float32)
            y = np.concatenate([np.zeros(4000, np.float32), y, np.zeros(4000, np.float32)])
            segs, _ = asr.transcribe(y, language="fa", beam_size=5)
            hyp = "".join(s.text for s in segs)
            score = difflib.SequenceMatcher(None, target, norm(hyp)).ratio()
            if best is None or score > best[0]:
                best = (score, spell, hyp, x.copy(), sr)
            if score >= 0.999: break
        if best[0] >= 0.999: break
    score, spell, hyp, x, sr = best
    with wave.open(f"{out}/{lid}.wav", "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((np.clip(x, -1, 1)*32767).astype(np.int16).tobytes())
    report[lid] = dict(score=round(score, 3), spell=spell, heard=hyp.strip(), dur=round(len(x)/sr, 2))
    print(lid, report[lid], flush=True)
json.dump(report, open(f"{out}/report.json", "w"), ensure_ascii=False, indent=1)
print("speech total", round(sum(r["dur"] for r in report.values()), 1))

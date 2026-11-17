"""Tighten narration tempo (pitch preserved) and write the timing report used by the edit."""
import sys, os, json, subprocess, wave
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lines import LINES
from trimdur import trimmed
src, dst, tempo = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(dst, exist_ok=True)
rep = json.load(open(f"{src}/report.json"))
for lid, _, _ in LINES:
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"{src}/{lid}.wav", "-af", f"atempo={tempo}",
                    "-ar", "22050", f"{dst}/{lid}.wav"], check=True)
    x, sr = trimmed(f"{dst}/{lid}.wav")
    rep[lid]["dur"] = round(len(x) / sr, 3)
json.dump(rep, open(f"{dst}/report.json", "w"), ensure_ascii=False, indent=1)
print("speech", round(sum(r["dur"] for r in rep.values()), 2))

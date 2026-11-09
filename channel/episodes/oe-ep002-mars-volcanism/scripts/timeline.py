"""Shared timeline (mirrors src/timeline.ts): narration placement from clip durations."""
import json
LEAD = 0.3
GAPS = [0.7, 0.7, 0.8, 0.8, 0.9, 1.0]   # pause after each line
TAIL = 1.2                               # brand hold after the last line

def build(vo_json):
    vo = json.load(open(vo_json))
    t, out = LEAD, []
    for i, c in enumerate(vo):
        out.append({**c, "start": round(t, 3), "end": round(t + c["duration"], 3)})
        t += c["duration"] + (GAPS[i] if i < len(GAPS) else 0)
    return out

def end(vo_json):
    return round(build(vo_json)[-1]["end"] + TAIL, 2)

if __name__ == "__main__":
    import sys
    for c in build(sys.argv[1]): print(c["file"], c["start"], c["end"])
    print("END", end(sys.argv[1]))

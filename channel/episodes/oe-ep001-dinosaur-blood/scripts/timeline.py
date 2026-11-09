"""Shared timeline: narration placement derived from clip durations (mirrors src/timeline.ts)."""
import json
LEAD, GAP, END = 0.25, 0.10, 45.0

def build(vo_json):
    vo = json.load(open(vo_json))
    t, out = LEAD, []
    for c in vo:
        out.append({**c, "start": round(t, 3), "end": round(t + c["duration"], 3)})
        t += c["duration"] + GAP
    return out

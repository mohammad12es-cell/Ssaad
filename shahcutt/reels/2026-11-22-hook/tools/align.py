"""Word timing for the script: letter-level alignment of the script text to Whisper's words.
Whisper spells Persian loosely (بوجو for بودجه, مزاکره for مذاکره), so the match is done on letters, not words."""
import difflib, json, re

NORM = str.maketrans({"ي": "ی", "ك": "ک", "ة": "ه", "أ": "ا", "إ": "ا", "آ": "ا", "ؤ": "و", "ئ": "ی", "ذ": "ز", "ض": "ز", "ظ": "ز", "ص": "س", "ث": "س", "ط": "ت", "ح": "ه", "غ": "ق"})
DROP = re.compile(r"[ً-ْٰ‌‍\s«»،؛.,:!?؟\-\[\]()…]")


def letters(t):
    return DROP.sub("", t).translate(NORM)


def script_words(segments):
    """[(seg_id, word_text)] in reading order; caption text uses the segment's `text`."""
    return [(s["id"], w) for s in segments for w in s["text"].split()]


def snap_onsets(W, wav):
    """Whisper lets a word start inside the pause before it; move each start to the first voiced 10 ms frame."""
    import wave
    import numpy as np
    f = wave.open(wav); sr = f.getframerate(); x = np.frombuffer(f.readframes(f.getnframes()), np.int16).astype(np.float32) / 32768
    n = int(0.01 * sr); k = len(x) // n
    db = 20 * np.log10(np.sqrt((x[: k * n].reshape(k, n) ** 2).mean(1)) + 1e-9)
    db = np.convolve(db, np.ones(3) / 3, "same"); thr = db.max() - 30
    for w in W:
        a, b = int(w["s"] / 0.01), min(k - 1, int(w["e"] / 0.01))
        # a silent stretch (>= 80 ms) that starts within the word's first 100 ms is the pause before it
        # (a stretch later in the word is a stop closure, not a pause)
        i = a
        while i < min(a + 10, b) and db[i] >= thr: i += 1
        j = i
        while j < b and db[j] < thr: j += 1
        if i < a + 10 and j - i >= 8:
            # whole window silent: whisper parked the word in the pause; it is said just before the next word
            w["s"] = round(j * 0.01 - 0.02, 3) if j < b else round(max(w["s"], w["e"] - 0.14), 3)
    return W


def align(segments, whisper_json, shift=0.0, wav=None):
    W = [w for seg in json.load(open(whisper_json, encoding="utf-8")) for w in seg["words"]]
    if wav: W = snap_onsets(W, wav)
    # whisper letters with owner index
    wl, wo = [], []
    for i, w in enumerate(W):
        for ch in letters(w["w"]): wl.append(ch); wo.append(i)
    sw = script_words(segments)
    sl, so = [], []
    for j, (_, w) in enumerate(sw):
        for ch in letters(w): sl.append(ch); so.append(j)
    sm = difflib.SequenceMatcher(None, sl, wl, autojunk=False)
    m = {}  # script letter -> whisper letter
    for a, b, n in sm.get_matching_blocks():
        for k in range(n): m[a + k] = b + k
    out = []
    for j, (sid, w) in enumerate(sw):
        idx = [k for k in range(len(sl)) if so[k] == j and k in m]
        if idx:
            first, last = W[wo[m[idx[0]]]], W[wo[m[idx[-1]]]]
            # a script word that maps to the middle of a whisper word starts proportionally later
            wi0, wi1 = wo[m[idx[0]]], wo[m[idx[-1]]]
            l0 = [k for k in range(len(wl)) if wo[k] == wi0]; l1 = [k for k in range(len(wl)) if wo[k] == wi1]
            f0 = (m[idx[0]] - l0[0]) / max(1, len(l0)); f1 = (m[idx[-1]] - l1[0] + 1) / max(1, len(l1))
            s = first["s"] + f0 * (first["e"] - first["s"]); e = last["s"] + f1 * (last["e"] - last["s"])
            out.append({"seg": sid, "w": w, "s": round(s + shift, 3), "e": round(max(e, s + 0.08) + shift, 3)})
        else:
            out.append({"seg": sid, "w": w, "s": None, "e": None})
    # fill unmatched words by interpolation
    for i, o in enumerate(out):
        if o["s"] is None:
            p = next((out[k] for k in range(i - 1, -1, -1) if out[k]["s"] is not None), None)
            q = next((out[k] for k in range(i + 1, len(out)) if out[k]["s"] is not None), None)
            s = p["e"] if p else (q["s"] - 0.3); e = q["s"] if q else s + 0.3
            o["s"], o["e"] = round(s, 3), round(max(e, s + 0.1), 3)
    return out

import vo from '../public/audio/vo.json';

export const FPS = 30;
export const W = 1080;
export const H = 1920;

// Must match scripts/timeline.py
const LEAD = 0.3;
const GAPS = [0.7, 0.7, 0.8, 0.8, 0.9, 1.0];
const TAIL = 1.2;

type Word = {w: string; start: number; end: number};
type Raw = {file: string; text: string; duration: number; words: Word[]};
export type Clip = Raw & {start: number; end: number};

export const clips: Clip[] = (() => {
  let t = LEAD;
  return (vo as Raw[]).map((c, i) => {
    const clip = {...c, start: t, end: t + c.duration};
    t += c.duration + (GAPS[i] ?? 0);
    return clip;
  });
})();

export const END = Math.round((clips[clips.length - 1].end + TAIL) * 100) / 100;
export const TOTAL_FRAMES = Math.ceil(END * FPS);
/** Scene boundaries: cuts land just before each narration line. */
export const B = [0, ...clips.slice(1).map((c) => c.start - 0.15)];
export const f = (sec: number) => Math.round(sec * FPS);

/** Caption groups (≤4 words, break after punctuation), absolute word times. Brand line is not captioned. */
export type CapWord = {w: string; start: number; end: number};
export type CapGroup = {words: CapWord[]; start: number; end: number};
export const captions: CapGroup[] = clips.slice(0, -1).flatMap((c) => {
  const groups: CapGroup[] = [];
  let cur: CapWord[] = [];
  const flush = () => {
    if (cur.length) groups.push({words: cur, start: cur[0].start, end: cur[cur.length - 1].end});
    cur = [];
  };
  c.words.forEach((w, i) => {
    cur.push({w: w.w, start: c.start + w.start, end: c.start + w.end});
    const chars = cur.reduce((a, x) => a + x.w.length + 1, 0);
    const next = c.words[i + 1];
    if (/[,.?:;]$/.test(w.w) || cur.length >= 4 || (next && chars + next.w.length > 24)) flush();
  });
  flush();
  // hold each group until the next one starts (max +0.5 s)
  groups.forEach((g, i) => {
    const nx = groups[i + 1];
    g.end = nx ? Math.min(nx.start, g.end + 0.5) : g.end + 0.5;
  });
  return groups;
});

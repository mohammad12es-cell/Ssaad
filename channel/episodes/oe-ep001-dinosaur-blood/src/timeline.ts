import vo from '../public/audio/vo.json';

export const FPS = 30;
export const W = 1080;
export const H = 1920;
export const END = 45;
export const TOTAL_FRAMES = END * FPS;

// Must match scripts/timeline.py
const LEAD = 0.25;
const GAP = 0.1;

export type Clip = {file: string; text: string; duration: number; start: number; end: number};

export const clips: Clip[] = (() => {
  let t = LEAD;
  return (vo as {file: string; text: string; duration: number}[]).map((c) => {
    const clip = {...c, start: t, end: t + c.duration};
    t += c.duration + GAP;
    return clip;
  });
})();

// Scene boundaries: cuts land just before each narration line begins.
export const B = [0, ...clips.slice(1).map((c) => c.start - 0.15)];

export const f = (sec: number) => Math.round(sec * FPS);

// Concise subtitle phrases per narration line (timed proportionally to spoken length).
const PHRASES: string[][] = [
  ['What if a dinosaur died', '115 million years ago…', 'but scientists could still find', 'traces of its blood today?'],
  ["That's exactly what researchers reported", 'inside a fossilized dinosaur bone', 'discovered in Brazil.'],
  ['Using advanced chemical analysis,', 'they detected traces of heme —', 'a molecule associated with hemoglobin,', 'the protein that carries oxygen in blood.'],
  ['Even more surprising,', 'they found microscopic structures', 'that look like mineralized red blood cells', "inside the bone's ancient blood-vessel channels."],
  ["But here's the catch:", "these aren't preserved drops of blood.", 'And scientists still debate', 'whether those structures are truly blood cells.'],
  ['A 115-million-year-old', 'biological mystery,', 'still waiting to be fully understood.'],
];

// Weight ≈ spoken length: digits expanded, pauses after punctuation.
const weight = (s: string) => {
  const spoken = s.replace(/115/g, 'one hundred fifteen');
  let w = spoken.replace(/[^a-zA-Z]/g, '').length;
  if (/[…:]$/.test(s) || /\?$/.test(s)) w += 8;
  else if (/[,—.]$/.test(s)) w += 4;
  return w;
};

export type Sub = {text: string; start: number; end: number};
export const subtitles: Sub[] = clips.flatMap((c, i) => {
  const ph = PHRASES[i];
  const total = ph.reduce((a, p) => a + weight(p), 0);
  let t = c.start;
  return ph.map((p) => {
    const d = (weight(p) / total) * c.duration;
    const s = {text: p, start: t, end: t + d};
    t += d;
    return s;
  });
});

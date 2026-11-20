// Subtitle timing: speech cues follow the measured voice timing (voice.json); on-screen text cues use their own window.
import VOICE from "../data/voice.json";
import DIALOGUE from "../data/dialogue.json";
export type Cue = { id: string; start: number; end: number; text: string; hi: string[]; tag?: string; tagColor?: string; top: number };
const V = VOICE as any; const L = (DIALOGUE as any).lines as any[];
const TAG: Record<string, [string, string]> = { kael: ["KAEL", "#e8f0ff"], eve: ["E.V.E", "#5ff4ff"], vex: ["DR. VEX", "#ffc28a"], child: ["CHILD", "#ffd9a8"], system: ["SYSTEM", "#ff6a7a"] };
export const SUB_TOP = 1330; // safe zone: above platform UI (bottom ~420px) and clear of faces framed in the upper 2/3
export function cues(ep: number, lang: "fa" | "en"): Cue[] {
  const out: Cue[] = [];
  for (const l of L) {
    if (l.ep !== ep) continue;
    if (lang === "en" && l.kind === "onscreen") continue;           // English is already on screen
    if (lang === "fa" && l.subtitle === false) continue;             // covered by the on-screen translation
    const text = lang === "fa" ? l.fa : l.en; if (!text) continue;
    let start = l.start, end = l.end;
    if (l.kind === "speech") { const v = V[l.id]; start = v.start - 0.05; end = Math.min(29.95, v.start + Math.max(1.3, v.speech + 0.45)); }
    const [tag, tagColor] = l.kind === "onscreen" ? (lang === "fa" ? ["متن روی صفحه", "#9fb3c8"] : ["", ""]) : TAG[l.who] ?? ["", "#fff"];
    out.push({ id: l.id, start, end, text, hi: (lang === "fa" ? l.hi_fa : l.hi_en) ?? [], tag: tag || undefined, tagColor, top: SUB_TOP });
  }
  return out;
}
const ts = (s: number) => { const ms = Math.round(s * 1000); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, ss = Math.floor(ms / 1000) % 60, r = ms % 1000; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")},${String(r).padStart(3, "0")}`; };
export function srt(ep: number, lang: "fa" | "en", offset = 0, startIndex = 1) {
  return cues(ep, lang).map((c, i) => `${startIndex + i}\n${ts(c.start + offset)} --> ${ts(c.end + offset)}\n${lang === "fa" ? "‏" : ""}${c.tag && lang === "en" ? c.tag + ": " : ""}${c.text}\n`).join("\n");
}

// Bilingual subtitle layer (rendered on a transparent background and composited onto the clean master,
// so all three deliverables share frame-identical picture timing).
// Persian: Vazirmatn, dir="rtl" — shaping & bidi are done by Chrome's HarfBuzz/ICU, never by hand.
import React, { useState } from "react";
import { AbsoluteFill, useCurrentFrame, delayRender, continueRender, staticFile } from "remotion";
import { cues, Cue } from "../utils/subs";

const loadFonts = (() => {
  let p: Promise<void> | null = null;
  return () => (p ??= Promise.all([
    new FontFace("Vazirmatn", `url(${staticFile("fonts/Vazirmatn-Medium.ttf")})`, { weight: "500" }).load(),
    new FontFace("Vazirmatn", `url(${staticFile("fonts/Vazirmatn-Bold.ttf")})`, { weight: "700" }).load(),
  ]).then((fs) => { fs.forEach((f) => (document.fonts as any).add(f)); }).then(() => document.fonts.ready).then(() => undefined));
})();

const HL = "#5ff4ff";
function Highlighted({ text, hi }: { text: string; hi: string[] }) {
  if (!hi.length) return <>{text}</>;
  // split around highlight phrases while keeping logical (not visual) order — the browser handles RTL layout
  const parts: { s: string; h: boolean }[] = []; let rest = text;
  while (rest.length) {
    let best = -1, word = "";
    for (const w of hi) { const i = rest.indexOf(w); if (i >= 0 && (best < 0 || i < best)) { best = i; word = w; } }
    if (best < 0) { parts.push({ s: rest, h: false }); break; }
    if (best > 0) parts.push({ s: rest.slice(0, best), h: false });
    parts.push({ s: word, h: true }); rest = rest.slice(best + word.length);
  }
  return <>{parts.map((p, i) => p.h ? <span key={i} style={{ color: HL, textShadow: `0 0 18px ${HL}88` }}>{p.s}</span> : <React.Fragment key={i}>{p.s}</React.Fragment>)}</>;
}

export const Subtitles: React.FC<{ ep: number; lang: "fa" | "en" }> = ({ ep, lang }) => {
  const frame = useCurrentFrame(); const t = frame / 30;
  const [h] = useState(() => delayRender("subtitle fonts"));
  useState(() => { loadFonts().then(() => continueRender(h)); return 0; });
  const active = cues(ep, lang).filter((c) => t >= c.start && t < c.end);
  return (
    <AbsoluteFill style={{ backgroundColor: "transparent" }}>
      {active.map((c: Cue) => {
        const fade = Math.min(1, (t - c.start) / 0.18, (c.end - t) / 0.18);
        const fa = lang === "fa";
        return (
          <div key={c.id} style={{ position: "absolute", left: 90, right: 90, top: c.top, display: "flex", flexDirection: "column", alignItems: "center", opacity: fade, transform: `translateY(${(1 - fade) * 10}px)` }}>
            {c.tag && <div style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: 26, letterSpacing: 6, color: c.tagColor, marginBottom: 10, textShadow: "0 2px 10px #000" }}>{c.tag}</div>}
            <div dir={fa ? "rtl" : "ltr"} lang={fa ? "fa" : "en"} style={{
              fontFamily: fa ? "Vazirmatn, sans-serif" : "Rajdhani, sans-serif", fontWeight: fa ? 500 : 600,
              fontSize: fa ? 54 : 56, lineHeight: fa ? 1.6 : 1.25, color: "#ffffff", textAlign: "center",
              padding: fa ? "10px 34px 14px" : "12px 34px", borderRadius: 18, background: "rgba(6,6,16,0.58)",
              textShadow: "0 2px 6px rgba(0,0,0,0.9)", maxWidth: 900, unicodeBidi: "isolate",
              boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
            }}>
              <Highlighted text={c.text} hi={c.hi} />
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

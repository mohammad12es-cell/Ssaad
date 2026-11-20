import { writeFileSync } from "fs";
import { cues } from "../src/utils/subs";
const ts = (s: number) => { const ms = Math.round(s * 1000); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, ss = Math.floor(ms / 1000) % 60, r = ms % 1000; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")},${String(r).padStart(3, "0")}`; };
for (const lang of ["fa", "en"] as const) {
  let i = 1; const out: string[] = [];
  for (let ep = 1; ep <= 10; ep++) for (const c of cues(ep, lang)) out.push(`${i++}\n${ts(c.start + (ep - 1) * 30)} --> ${ts(c.end + (ep - 1) * 30)}\n${lang === "fa" ? "‏" : ""}${c.tag && lang === "en" ? c.tag + ": " : ""}${c.text}\n`);
  writeFileSync(`output/season/TLH_S01_COMPLETE.${lang}.srt`, "﻿" + out.join("\n"));
}
console.log("season srt written");

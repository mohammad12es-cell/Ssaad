// Write SRT subtitle files for one episode (or the whole season with offsets).
import { writeFileSync, mkdirSync } from "fs";
import { srt } from "../src/utils/subs";
const n = Number(process.argv[2]); mkdirSync("output/subtitles", { recursive: true });
const NN = String(n).padStart(2, "0");
for (const lang of ["fa", "en"] as const) writeFileSync(`output/subtitles/TLH_S01E${NN}.${lang}.srt`, "﻿" + srt(n, lang));
console.log("srt written", NN);

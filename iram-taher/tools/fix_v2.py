#!/usr/bin/env python3
"""v2 layout fixes (2026-11-23 client notes):
1. BLACK FRIDAY tag was 34 px from the left edge and reached ~2 px from it while swinging: now a one-line sign
   hung centre-top from the frame edge, ending above his head (hair top ~290 px), smaller swing.
2. Armenia arc was centred at x 440 while its title is centred at 540: arc centred and slightly smaller so its
   right end stays clear of the IRAM logo (x >= 858).
3. End-card logo: the source PNG is a cut-out from black, so on cream its dark facets turn see-through and the
   halo clean-up eroded it. The original logo now sits on its own dark-green plate with a gold border.
"""
import os
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
p = "index.html"; s = open(p, encoding="utf-8").read()
rep = [
("#tagWrap { position: absolute; left: 34px; top: 96px; width: 360px; height: 340px; transform-origin: 180px 0px; opacity: 0; }",
 "#tagWrap { position: absolute; left: 320px; top: 0; width: 440px; height: 290px; transform-origin: 220px 0px; opacity: 0; }"),
("#tagWrap .string { position: absolute; left: 178px; top: 0; width: 3px; height: 104px; background: var(--acc); }",
 "#tagWrap .string { position: absolute; left: 218px; top: 0; width: 3px; height: 118px; background: var(--acc); }"),
("#tag { position: absolute; left: 0; top: 98px; width: 360px; height: 214px;",
 "#tag { position: absolute; left: 0; top: 116px; width: 440px; height: 160px;"),
('#tag::before { content: ""; position: absolute; left: 166px; top: -14px;',
 '#tag::before { content: ""; position: absolute; left: 201px; top: -14px;'),
("#tag .en { font-weight: 900; font-size: 56px; line-height: 1; letter-spacing: 2px; direction: ltr; }",
 "#tag .en { font-weight: 900; font-size: 50px; line-height: 1; letter-spacing: 1px; direction: ltr; white-space: nowrap; text-align: center; }"),
("#tag .fa2 { margin-top: 14px; font-weight: 800; font-size: 34px; color: var(--ink); direction: rtl; }",
 "#tag .fa2 { margin-top: 12px; font-weight: 800; font-size: 32px; color: var(--ink); direction: rtl; }"),
("{ keyframes: [{ rotation: -9, duration: 0.18 }, { rotation: 6, duration: 0.3 }, { rotation: -3.5, duration: 0.32 }, { rotation: 2, duration: 0.34 }, { rotation: -1, duration: 0.4 }, { rotation: 0, duration: 0.5 }]",
 "{ keyframes: [{ rotation: -6, duration: 0.18 }, { rotation: 4.5, duration: 0.3 }, { rotation: -2.8, duration: 0.32 }, { rotation: 1.6, duration: 0.34 }, { rotation: -0.8, duration: 0.4 }, { rotation: 0, duration: 0.5 }]"),
("#route { position: absolute; left: 90px; top: 130px; width: 700px; height: 230px;",
 "#route { position: absolute; left: 240px; top: 140px; width: 600px; height: 197px;"),
("#endLogo { position: absolute; left: 140px; top: 560px; width: 800px; opacity: 0; }",
 "#endLogo { position: absolute; left: 110px; top: 500px; width: 860px; height: 350px; box-sizing: border-box; display: flex; align-items: center; justify-content: center;\n"
 "  background: linear-gradient(180deg, #0b2419, #06140d); border: 4px solid #dcad58; border-radius: 40px; box-shadow: 0 30px 60px rgba(6,20,13,.28); opacity: 0; }\n"
 "#endLogo img { width: 760px; display: block; }"),
('<img id="endLogo" src="assets/iram-logo-clean.png" alt="IRAM CO.">',
 '<div id="endLogo"><img src="assets/iram-logo.png" alt="IRAM CO."></div>'),
]
for a, b in rep:
    assert s.count(a) == 1, a[:80]
    s = s.replace(a, b)
open(p, "w", encoding="utf-8").write(s)
print("ok")

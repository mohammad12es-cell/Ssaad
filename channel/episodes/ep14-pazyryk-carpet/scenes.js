// Part 9: The Oldest Carpet Was Frozen in Ice (Pazyryk)
const ARCH = (id, x, y, s) => PERSON(id, x, y, s, { body: "#7a9a3a", hat: "cap" });
const PEDESTAL = (x, y, s, cls = "ped") => g(x, y, s, cls, `<rect x="-200" y="-40" width="400" height="200" fill="#e9e4d8" stroke="${K}" stroke-width="9"/><rect x="-230" y="-70" width="460" height="40" rx="8" fill="#d9d2c3" stroke="${K}" stroke-width="8"/>`);
const KNOT = (x, y, cls = "knot") => g(x, y, 1, cls, `<path d="M-14,0 Q0,-24 14,0 Q0,24 -14,0 Z" fill="#f2d27a" stroke="#5b1a1f" stroke-width="4"/>`);

put("g1", ICE(540, 1050, 1.1) + CARPET(540, 1050, 0.75) + HERO("h1", 860, 1880, 0.45));
put("g2", MOUND(540, 1550, 1.3) + CALENDAR(820, 760, 0.9, "1949", "cal") + ARCH("a2", 260, 1780, 0.7) + HERO("h2", 880, 1820, 0.55));
put("g3", MOUNTAINS(540, 1350, 1.0, "mtn") + LABEL(540, 780, "PAZYRYK, ALTAI", "lab3", 64, "#111", "#ffd400") + MOUND(540, 1550, 0.7) + HERO("h3", 900, 1880, 0.4));
put("g4", MOUND(540, 1550, 1.3) + `<g class="water">${[0, 1, 2, 3].map((k) => `<path d="M${380 + k * 100},${1180 + (k % 2) * 40} q12,30 0,44 q-12,-14 0,-44 Z" fill="#3f8fd6" stroke="${K}" stroke-width="4"/>`).join("")}</g>` + ICE(540, 1420, 0.55) + SNOW(250, 900, 0.9) + SNOW(830, 950, 0.8));
put("g5", ICE(540, 1100, 1.1) + CARPET(540, 1100, 0.7) + SPARK(200, 760, 0.9) + SPARK(900, 1400, 0.8) + HERO("h5", 860, 1880, 0.4));
put("g6", CARPET(540, 1100, 0.8) + LABEL(540, 700, "~2,500 YEARS", "lab6", 72, "#111", "#ffd400") + HERO("h6", 160, 1880, 0.45));
put("g7", CARPET(540, 1250, 0.6) + DEER(220, 850, 1.0, "mot") + RIDER(560, 980, 0.38, "mot") + g(880, 840, 0.9, "mot", `<path d="M-60,30 Q-70,-30 -10,-40 L30,-80 L40,-40 Q80,-20 60,30 Z" fill="#c9a24b" stroke="${K}" stroke-width="7"/><path d="M-10,-40 Q-60,-110 -90,-60 Q-60,-50 -20,-20" fill="#f2d27a" stroke="${K}" stroke-width="6"/>`));
put("g8", CARPET(540, 1150, 0.8) + Array.from({ length: 24 }, (_, k) => KNOT(330 + (k % 6) * 84, 960 + Math.floor(k / 6) * 120)).join("") + LABEL(540, 700, "1,000,000+ KNOTS", "lab8", 64, "#111", "#ffd400") + HERO("h8", 880, 1880, 0.4));
put("g9", CARPET(330, 1150, 0.5) + ARROW(500, 1150, 640, 1150, "a9") + COLUMN(800, 1500, 0.6, "col") + LABEL(800, 760, "PERSIA?", "lab9", 70, "#111", "#ffd400"));
put("g10", LABEL(300, 780, "PERSIA?", "lb10", 60, "#111", "#ffd400") + LABEL(780, 780, "LOCAL?", "lb10", 60, "#fff", "#2f5fa8") + SCALE(540, 1400, 1.0) + ARCH("a101", 200, 1800, 0.55) + ARCH("a102", 880, 1800, 0.55));
put("g11", CARPET(540, 1050, 0.65) + LABEL(450, 1520, "HAND-KNOTTED", "lab11", 62, "#fff", "#a8323a") + HERO("h11", 900, 1880, 0.4));
put("g12", PEDESTAL(540, 1500, 1.2) + CARPET(540, 1240, 0.6) + LABEL(540, 680, "HERMITAGE MUSEUM", "lab12", 58, "#111", "#ffd400") + HERO("h12", 160, 1880, 0.4));
put("g13", CARPET(300, 1150, 0.45, "c13") + CARPET(780, 1100, 0.5, "c13") + SHIP(540, 1600, 1.6, "ship") + HERO("h13", 160, 1880, 0.35));
put("g14", COLUMN(250, 1500, 0.6, "col14") + CARPET(700, 1150, 0.6) + SPARK(920, 820, 0.8) + HERO("h14", 540, 1880, 0.4));
put("g15", BUBBLE(790, 690) + CARPET(790, 690, 0.18, "c15") + HERO("h15", 470, 1800, 1.0));
function SHIP(x, y, s = 1, cls = "icon") { return g(x, y, s, cls, `<path d="M-90,0 L90,0 L60,50 L-60,50 Z" fill="#7a4a24" stroke="${K}" stroke-width="7"/><line x1="0" y1="0" x2="0" y2="-110" stroke="${K}" stroke-width="7"/><path d="M5,-105 L70,-25 L5,-25 Z" fill="#fff" stroke="${K}" stroke-width="6"/>`); }

// 1 hook
scene(1, "h1", "mO"); brows("h1", -16, 0.3); pop("#g1 .ice", 0.2, 0.5); tl.fromTo("#g1 .carpet", { opacity: 0 }, { opacity: 1, duration: 0.8 }, 1.0);
// 2 1949 Siberia
scene(2, "h2"); bob("a2", 2, 5); mouth("a2", "mG", S[1]); pop("#g2 .mound", at(2, 0.1), 0.4); pop("#g2 .cal", at(2, 0.8), 0.35); armR("a2", -100, at(2, 1.0));
// 3 Altai
scene(3, "h3"); pop("#g3 .mtn", at(3, 0.1), 0.45); pop("#g3 .lab3", at(3, 0.9), 0.4); pop("#g3 .mound", at(3, 1.4), 0.3);
// 4 water seeps in and freezes
enter(4); pop("#g4 .mound", at(4, 0.1), 0.3);
tl.fromTo("#g4 .water path", { y: -120, opacity: 0 }, { y: 120, opacity: 1, duration: 0.8, stagger: 0.2, ease: "power1.in" }, at(4, 0.4));
tl.to("#g4 .water", { opacity: 0, duration: 0.3 }, at(4, 1.8)); pop("#g4 .ice", at(4, 1.8), 0.4); popAll("#g4 .wx", at(4, 2.0), 0.2);
// 5 a wool carpet
scene(5, "h5", "mO"); pop("#g5 .ice", at(5, 0.1), 0.3); tl.to("#g5 .ice", { opacity: 0, duration: 0.8 }, at(5, 1.0)); sparkle("#g5 .spk", at(5, 1.4));
// 6 2,500 years
scene(6, "h6", "mO"); pop("#g6 .carpet", at(6, 0.1), 0.45); pop("#g6 .lab6", at(6, 0.9), 0.4);
// 7 motifs
enter(7); pop("#g7 .carpet", at(7, 0.1), 0.35); popAll("#g7 .mot", at(7, 0.5), 0.5, 0.4);
// 8 a million knots
scene(8, "h8", "mO"); pop("#g8 .carpet", at(8, 0.1), 0.35); popAll("#g8 .knot", at(8, 0.4), 0.05, 0.2); pop("#g8 .lab8", at(8, 1.8), 0.4);
// 9 made in Persia?
enter(9); pop("#g9 .carpet", at(9, 0.1), 0.35); pop("#g9 .a9", at(9, 0.7), 0.3); tl.fromTo("#g9 .col", { scaleY: 0, svgOrigin: "0 0" }, { scaleY: 1, svgOrigin: "0 0", duration: 0.8, ease: "power3.out" }, at(9, 1.0)); pop("#g9 .lab9", at(9, 1.6), 0.4);
// 10 debated
enter(10); mouth("a101", "mO", S[9]); mouth("a102", "mO", S[9]); popAll("#g10 .lb10", at(10, 0.2), 0.4);
tl.fromTo("#g10 .beam", { rotation: -10, svgOrigin: "0 -305" }, { rotation: 10, svgOrigin: "0 -305", duration: 0.5, yoyo: true, repeat: 5, ease: "sine.inOut" }, at(10, 0.6));
armR("a101", -140, at(10, 0.8)); armL("a102", 140, at(10, 1.2));
// 11 hand-knotted that early
scene(11, "h11", "mG"); pop("#g11 .carpet", at(11, 0.1), 0.4); pop("#g11 .lab11", at(11, 1.0), 0.4);
// 12 Hermitage
scene(12, "h12"); pop("#g12 .ped", at(12, 0.1), 0.4); pop("#g12 .carpet", at(12, 0.5), 0.4); pop("#g12 .lab12", at(12, 1.0), 0.4); armR("h12", -110, at(12, 1.2));
// 13 famous export
scene(13, "h13", "mG"); popAll("#g13 .c13", at(13, 0.1), 0.3); tl.fromTo("#g13 .ship", { x: -900 }, { x: 0, duration: 1.4, ease: "power2.out" }, at(13, 0.6));
// 14 outlasting an empire
scene(14, "h14", "mO"); pop("#g14 .col14", at(14, 0.1), 0.35); pop("#g14 .carpet", at(14, 0.4), 0.4);
tl.to("#g14 .col14", { rotation: -80, svgOrigin: "0 0", opacity: 0.4, duration: 0.9, ease: "bounce.out" }, at(14, 1.4)); sparkle("#g14 .spk", at(14, 2.0)); mouth("h14", "mG", at(14, 2.2));
// 15 CTA
scene(15, "h15", "mG"); brows("h15", -12, at(15, 0.2)); armR("h15", -125, at(15, 0.2));
pop("#g15 .bubble", at(15, 0.5), 0.45); hide("#g15 .dot", at(15, 0.9), 0.1); pop("#g15 .c15", at(15, 1.0), 0.4);

// Part 6: Persia's Ancient Hotel Chain (caravanserais)
const SHAHABBAS = (id, x, y, s) => PERSON(id, x, y, s, { robe: "long", hat: "crown", body: "#b3263a", beard: "#1b1b1b" });
const BANDIT = (id, x, y, s) => PERSON(id, x, y, s, { robe: "tunic", hat: "cap", body: "#4a4a4a", mask: "#2b2b2b" });
const DUNE = (x, y, s = 1, cls = "dune") => g(x, y, s, cls, `<path d="M-400,0 Q-200,-180 0,-60 Q200,-200 400,0 Z" fill="#f0d08a" stroke="${K}" stroke-width="8"/>`);
const STAR5 = (x, y, s = 1, cls = "star") => g(x, y, s, cls, `<path d="M0,-50 L14,-16 L50,-14 L22,8 L32,44 L0,24 L-32,44 L-22,8 L-50,-14 L-14,-16 Z" fill="#ffd400" stroke="${K}" stroke-width="6" stroke-linejoin="round"/>`);
const BED = (x, y, s = 1, cls = "bed") => g(x, y, s, cls, `<rect x="-120" y="-40" width="240" height="60" rx="10" fill="#b5562e" stroke="${K}" stroke-width="7"/><rect x="-110" y="-70" width="80" height="40" rx="12" fill="#fff" stroke="${K}" stroke-width="6"/><line x1="-110" y1="20" x2="-110" y2="60" stroke="${K}" stroke-width="10"/><line x1="110" y1="20" x2="110" y2="60" stroke="${K}" stroke-width="10"/>`);

put("g1", CARAVANSERAI(540, 1350, 1.1) + CAMEL(220, 1760, 0.75) + HERO("h1", 860, 1860, 0.55));
put("g2", DUNE(540, 1500, 1.4) + CAMEL(-200, 1720, 0.7, "c1") + CAMEL(-600, 1720, 0.7, "c2") + CAMEL(-1000, 1720, 0.7, "c3"));
put("g3", DUNE(260, 900, 0.7, "hz") + MOUNTAINS(760, 1000, 0.6, "hz") + BANDIT("bd3", 760, 1760, 0.85) + HERO("h3", 280, 1760, 0.85));
put("g4", CARAVANSERAI(540, 1450, 1.15) + SPARK(140, 820, 0.9) + SPARK(940, 900, 0.8) + HERO("h4", 880, 1880, 0.45));
put("g5", CARAVANSERAI(540, 1400, 1.25) + HERO("h5", 540, 1880, 0.4));
put("g6", CAMEL(300, 1760, 0.75, "cm6") + BED(520, 1000, 1.1) + PERSON("m6", 780, 1760, 0.7, { robe: "long", hat: "qajar", body: "#2a9d8f", beard: "#3a2a1a" }));
put("g7", JAR(160, 950, 1.1, "icon") + BARLEY(400, 950, 1.0, "icon") + g(640, 950, 1.0, "icon", `<path d="M0,-90 L75,-60 Q75,40 0,90 Q-75,40 -75,-60 Z" fill="#3fa7c9" stroke="${K}" stroke-width="8" stroke-linejoin="round"/><path d="M-30,0 L-8,24 L32,-24" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`) + SACK(880, 980, 1.0, "icon") + HERO("h7", 540, 1840, 0.6));
put("g8", SHAHABBAS("k8", 300, 1760, 0.9) + [0, 1, 2, 3].map((k) => g(560 + k * 130, 1000 + (k % 2) * 160, 0.32, "mini", CARAVANSERAI(0, 0, 1).replace(/class="serai"/, ""))).join(""));
put("g9", LABEL(540, 820, "999", "lab9", 160, "#111", "#ffd400", 420) + CROSS(540, 830, 1.4, "x9") + SHAHABBAS("k9", 270, 1760, 0.8) + HERO("h9", 820, 1760, 0.8));
put("g10", g(160, 1050, 0.3, "stop", CARAVANSERAI(0, 0, 1)) + g(540, 1050, 0.3, "stop", CARAVANSERAI(0, 0, 1)) + g(920, 1050, 0.3, "stop", CARAVANSERAI(0, 0, 1))
  + ARROW(260, 1000, 440, 1000, "a10") + ARROW(640, 1000, 820, 1000, "a10") + LABEL(350, 880, "1 DAY", "d10", 44, "#111", "#ffd400") + LABEL(730, 880, "1 DAY", "d10", 44, "#111", "#ffd400") + HERO("h10", 540, 1860, 0.55));
put("g11", SUN(900, 650, 1.0, "sun") + MOON(160, 650, 1.4, "moon") + g(800, 1450, 0.6, "dest", CARAVANSERAI(0, 0, 1)) + CAMEL(-200, 1760, 0.65, "c11"));
put("g12", CARAVANSERAI(540, 1250, 0.9) + LABEL(540, 680, "FREE CAMEL PARKING", "lab12", 54, "#fff", "#2f5fa8") + CAMEL(280, 1780, 0.55, "c12") + HERO("h12", 820, 1840, 0.55));
put("g13", CARAVANSERAI(540, 1350, 1.0) + LABEL(540, 760, "UNESCO 2023", "lab13", 72, "#111", "#ffd400") + [0, 1, 2, 3, 4].map((k) => STAR5(260 + k * 140, 1520, 0.9)).join(""));
put("g14", CARAVANSERAI(540, 1250, 0.9) + LABEL(540, 700, "HOTEL", "lab14", 80, "#111", "#ffd400") + BED(760, 1550, 0.9) + HERO("h14", 300, 1840, 0.55));
put("g15", BUBBLE(790, 690) + BED(790, 700, 0.8, "b15") + HERO("h15", 470, 1800, 1.0));

const walk = (sel, t, x, d) => { tl.fromTo(sel, { x: 0 }, { x, duration: d, ease: "none" }, t); tl.to(`${sel} .legs`, { scaleY: 0.9, svgOrigin: "0 -150", duration: 0.22, yoyo: true, repeat: Math.floor(d / 0.22), ease: "sine.inOut" }, t); };

// 1 hook
scene(1, "h1", "mO"); brows("h1", -16, 0.3); pop("#g1 .serai", 0.15, 0.5); pop("#g1 .camel", 0.8, 0.4); armR("h1", -120, 0.8);
// 2 caravans
enter(2); pop("#g2 .dune", at(2, 0.1), 0.4); ["c1", "c2", "c3"].forEach((c) => walk(`#g2 .${c}`, at(2, 0.2), 1500, dur(2) - 0.3));
// 3 dangers
scene(3, "h3", "mO"); popAll("#g3 .hz", at(3, 0.1), 0.4); slide("#bd3", at(3, 1.4), 600, 0, 0.6); mouth("bd3", "mF", S[2]); brows("bd3", 14, at(3, 1.4));
brows("h3", -18, at(3, 1.8)); shake("h3", at(3, 2.0), 3);
// 4 caravanserai
scene(4, "h4", "mG"); tl.fromTo("#g4 .serai", { y: 300, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "back.out(1.5)" }, at(4, 0.2)); sparkle("#g4 .spk", at(4, 1.0));
// 5 gate, walls, courtyard
scene(5, "h5"); tl.fromTo("#g5 .serai", { scale: 0.85, transformOrigin: "50% 100%" }, { scale: 1, transformOrigin: "50% 100%", duration: dur(5), ease: "sine.out" }, S[4]);
tl.to("#g5 .gate", { scaleX: 0, svgOrigin: "-75 0", duration: 0.6, ease: "power2.inOut" }, at(5, 1.0)); armR("h5", -110, at(5, 0.5));
// 6 camels and merchants
enter(6); mouth("m6", "mS", S[5]); pop("#g6 .bed", at(6, 1.2), 0.4); walk("#g6 .cm6", at(6, 0.1), 0, 0.01);
tl.to("#m6 .rig", { y: -30, duration: 0.2, yoyo: true, repeat: 1 }, at(6, 1.6)); mouth("m6", "mG", at(6, 1.6));
// 7 services
scene(7, "h7"); popAll("#g7 .icon", at(7, 0.2), 0.5); armR("h7", -120, at(7, 0.3)); mouth("h7", "mG", at(7, 2.0));
// 8 Shah Abbas network
enter(8); bob("k8", 8, 6); mouth("k8", "mS", S[7]); armR("k8", -100, at(8, 0.3)); popAll("#g8 .mini", at(8, 0.6), 0.35, 0.35); mouth("k8", "mG", at(8, 1.8));
// 9 999? not quite
scene(9, "h9", "mF"); mouth("k9", "mG", S[8]); pop("#g9 .lab9", at(9, 0.2), 0.45); armR("k9", -150, at(9, 0.3));
pop("#g9 .x9", at(9, 2.2), 0.3); mouth("k9", "mO", at(9, 2.3)); armL("h9", 60, at(9, 2.3)); brows("h9", 10, at(9, 2.2));
// 10 a day apart
scene(10, "h10"); popAll("#g10 .stop", at(10, 0.1), 0.3); popAll("#g10 .a10", at(10, 1.0), 0.3, 0.3); popAll("#g10 .d10", at(10, 1.4), 0.3, 0.3);
// 11 every evening, the next stop
enter(11); pop("#g11 .sun", at(11, 0.1)); walk("#g11 .c11", at(11, 0.2), 780, 2.0); pop("#g11 .dest", at(11, 0.4), 0.4);
hide("#g11 .sun", at(11, 1.8), 0.4); pop("#g11 .moon", at(11, 2.0), 0.4);
// 12 free camel parking
scene(12, "h12", "mG"); pop("#g12 .lab12", at(12, 0.3), 0.4); blink("h12", at(12, 1.4)); tl.to("#h12 .rig", { rotation: -5, svgOrigin: "0 0", duration: 0.2, yoyo: true, repeat: 3 }, at(12, 1.6));
// 13 UNESCO
enter(13); pop("#g13 .lab13", at(13, 0.4), 0.45); popAll("#g13 .star", at(13, 1.2), 0.18, 0.3);
// 14 hotels again
scene(14, "h14", "mG"); pop("#g14 .lab14", at(14, 0.3), 0.4); pop("#g14 .bed", at(14, 0.9), 0.4); armR("h14", -110, at(14, 0.5)); hop("h14", at(14, 1.6), 2);
// 15 CTA
scene(15, "h15", "mG"); brows("h15", -12, at(15, 0.2)); armR("h15", -125, at(15, 0.2));
pop("#g15 .bubble", at(15, 0.5), 0.45); hide("#g15 .dot", at(15, 0.9), 0.1); pop("#g15 .b15", at(15, 1.0), 0.4);

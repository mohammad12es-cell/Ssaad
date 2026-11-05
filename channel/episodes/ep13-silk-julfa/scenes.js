// Part 8: The Silk Network of New Julfa
const SHAHABBAS = (id, x, y, s) => PERSON(id, x, y, s, { robe: "long", hat: "crown", body: "#b3263a", beard: "#1b1b1b" });
const ARMENIAN = (id, x, y, s, c = "#2a9d8f") => PERSON(id, x, y, s, { robe: "long", hat: "cap", body: c, beard: "#3a2a1a" });
const ARMWOMAN = (id, x, y, s) => PERSON(id, x, y, s, { robe: "dress", hat: "scarf", body: "#6b3fa0", scarf: "#f2ead3" });
const CITYDOT = (x, y, name, cls = "cd") => g(x, y, 1, cls, `<circle r="22" fill="#e0404a" stroke="${K}" stroke-width="6"/><text x="0" y="-38" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="40" fill="#111" stroke="#fff" stroke-width="8" paint-order="stroke">${name}</text>`);
const ROUTE = (pts, cls = "route") => `<path class="${cls}" d="M${pts.map((p) => p.join(",")).join(" L")}" fill="none" stroke="#c9a24b" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1600" stroke-dashoffset="1600"/>`;

put("g1", SILK(540, 1000, 1.6, "silk") + SPARK(250, 850, 0.8) + SPARK(820, 1150, 0.7) + HERO("h1", 830, 1860, 0.5));
put("g2", ROUTE([[150, 900], [540, 1050], [930, 1250]], "route") + CITYDOT(150, 900, "EUROPE") + CITYDOT(540, 1050, "IRAN") + CITYDOT(930, 1250, "INDIA") + SILK(540, 1350, 0.8, "silk") + HERO("h2", 200, 1860, 0.5));
put("g3", SHAHABBAS("k3", 330, 1760, 0.9) + DOMEBLD(800, 1500, 0.8, "dome") + COIN(780, 900, 1.1, "cn") + COIN(880, 980, 0.9, "cn") + COIN(700, 1000, 0.9, "cn"));
put("g4", SCROLL(540, 1050, 0.8, "scroll") + SILK(540, 1050, 0.45, "s4") + CHESSKING(860, 1500, 0.6, "crownk") + SHAHABBAS("k4", 220, 1800, 0.7));
put("g5", SHAHABBAS("k5", 280, 1760, 0.85) + BUBBLE(720, 760, "bub5") + LABEL(720, 750, "TRADERS?", "lab5", 52, "#111", "#ffd400") + HERO("h5", 820, 1820, 0.6));
put("g6", CALENDAR(820, 760, 0.9, "1604", "cal") + ARROW(160, 1120, 920, 1120, "a6") + ARMENIAN("a61", 220, 1780, 0.6) + ARMWOMAN("a62", 420, 1780, 0.6) + ARMENIAN("a63", 620, 1780, 0.6, "#b5562e"));
put("g7", MOUNTAINS(540, 1300, 0.9, "mtn") + ARMENIAN("a71", 280, 1780, 0.65) + ARMWOMAN("a72", 520, 1780, 0.65) + ARMENIAN("a73", 760, 1780, 0.65, "#b5562e"));
put("g8", DOMEBLD(330, 1450, 0.8, "b8", "#e3c48f", true) + SHOP(760, 1450, 0.9, "b8", true) + LABEL(540, 780, "NEW JULFA", "lab8", 80, "#111", "#ffd400") + ARMENIAN("a8", 540, 1820, 0.55));
put("g9", ROUTE([[540, 1100], [180, 820]], "r9") + ROUTE([[540, 1100], [900, 860]], "r9") + ROUTE([[540, 1100], [920, 1400]], "r9") + ROUTE([[540, 1100], [160, 1400]], "r9")
  + CITYDOT(540, 1100, "ISFAHAN") + ARMENIAN("a9", 540, 1850, 0.5));
put("g10", ROUTE([[140, 800], [540, 1050], [800, 1150], [940, 1450]], "r10") + CITYDOT(140, 800, "AMSTERDAM", "c10") + CITYDOT(540, 1050, "ISFAHAN", "c10") + CITYDOT(800, 1150, "INDIA", "c10") + CITYDOT(940, 1450, "MANILA", "c10"));
put("g11", ENVELOPE(230, 860, 1.2, "i11") + SCROLL(540, 860, 0.55, "i11") + CAMEL(860, 1040, 0.55, "i11") + ARMENIAN("a11", 540, 1820, 0.75));
put("g12", LABEL(540, 820, "GREAT NETWORK", "lab12", 72, "#111", "#ffd400") + [0, 1, 2, 3, 4].map((k) => SILK(220 + k * 160, 1150, 0.4, "rolls", ["#e0407a", "#2a9d8f", "#ffd400", "#6b3fa0", "#3fa7c9"][k])).join("") + HERO("h12", 540, 1860, 0.55));
put("g13", DOMEBLD(540, 1500, 1.25, "church", "#e3c48f", true) + SPARK(240, 900, 0.8) + SPARK(860, 1000, 0.7) + HERO("h13", 900, 1880, 0.4));
put("g14", HEART(300, 1000, 2.2, "hrt") + ARROW(430, 1000, 620, 1000, "a14") + CITYDOT(800, 1000, "GLOBAL HUB", "c14") + ARMENIAN("a14p", 540, 1820, 0.75));
put("g15", BUBBLE(790, 690) + SILK(790, 690, 0.5, "s15") + HERO("h15", 470, 1800, 1.0));

const drawRoute = (sel, t, d = 1.2, stagger = 0.2) => tl.to(sel, { strokeDashoffset: 0, duration: d, stagger, ease: "power2.inOut" }, t);
const trek = (ids, t, x, d) => ids.forEach((id, k) => { tl.to(`#${id}`, { x, duration: d, ease: "none" }, t + k * 0.1); tl.to(`#${id} .rig`, { y: -16, duration: 0.25, yoyo: true, repeat: Math.floor(d / 0.25), ease: "sine.inOut" }, t + k * 0.1); });

// 1 hook
scene(1, "h1", "mO"); brows("h1", -14, 0.3); tl.fromTo("#g1 .silk", { scaleX: 0, transformOrigin: "50% 50%" }, { scaleX: 1, transformOrigin: "50% 50%", duration: 0.7, ease: "back.out(1.6)" }, 0.2); sparkle("#g1 .spk", 0.9);
// 2 demand
scene(2, "h2"); popAll("#g2 .cd", at(2, 0.1), 0.3); drawRoute("#g2 .route", at(2, 0.6), 1.4); pop("#g2 .silk", at(2, 1.6), 0.4);
// 3 silk money to Isfahan
enter(3); bob("k3", 3, 6); mouth("k3", "mG", S[2]); pop("#g3 .dome", at(3, 0.2), 0.4); tl.fromTo("#g3 .cn", { y: -500, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.2, ease: "bounce.out" }, at(3, 0.8)); armR("k3", -100, at(3, 0.6));
// 4 royal monopoly
enter(4); mouth("k4", "mS", S[3]); pop("#g4 .scroll", at(4, 0.1), 0.4); pop("#g4 .s4", at(4, 0.6), 0.35); pop("#g4 .crownk", at(4, 1.2), 0.4);
// 5 needed traders
scene(5, "h5", "mF"); bob("k5", 5, 5); mouth("k5", "mF", S[4]); brows("k5", 8, at(5, 0.2)); pop("#g5 .bub5", at(5, 0.4), 0.4); hide("#g5 .dot", at(5, 0.7), 0.1); pop("#g5 .lab5", at(5, 0.8), 0.35); armR("k5", -160, at(5, 0.9));
// 6 1604: forced move
enter(6); ["a61", "a62", "a63"].forEach((a) => { mouth(a, "mF", S[5]); brows(a, 10, at(6, 0.2)); });
pop("#g6 .cal", at(6, 0.1), 0.35); tl.fromTo("#g6 .a6", { scaleX: 0, svgOrigin: "160 1120" }, { scaleX: 1, svgOrigin: "160 1120", duration: 0.8, ease: "power2.out" }, at(6, 0.6));
trek(["a61", "a62", "a63"], at(6, 1.2), 300, dur(6) - 1.3);
// 7 a painful relocation (respectful, slow)
enter(7); ["a71", "a72", "a73"].forEach((a) => { mouth(a, "mF", S[6]); brows(a, 12, at(7, 0.2)); });
pop("#g7 .mtn", at(7, 0.1), 0.4); trek(["a71", "a72", "a73"], at(7, 0.3), 120, dur(7) - 0.4);
// 8 New Julfa
enter(8); mouth("a8", "mS", S[7]); popAll("#g8 .b8", at(8, 0.2), 0.4); pop("#g8 .lab8", at(8, 1.0), 0.4);
// 9 a network
enter(9); mouth("a9", "mG", S[8]); pop("#g9 .cd", at(9, 0.1), 0.3); drawRoute("#g9 .r9", at(9, 0.5), 0.9, 0.25);
// 10 Amsterdam to Manila
enter(10); popAll("#g10 .c10", at(10, 0.1), 0.45, 0.3); drawRoute("#g10 .r10", at(10, 0.3), 2.0);
// 11 letters, contracts, caravans
enter(11); bob("a11", 11, 6); mouth("a11", "mG", S[10]); popAll("#g11 .i11", at(11, 0.2), 0.5); armR("a11", -120, at(11, 0.3));
// 12 great network
scene(12, "h12", "mG"); pop("#g12 .lab12", at(12, 0.2), 0.4); popAll("#g12 .rolls", at(12, 0.7), 0.18, 0.3); armR("h12", -150, at(12, 0.5)); armL("h12", 150, at(12, 0.5));
// 13 the churches still stand
scene(13, "h13"); tl.fromTo("#g13 .church", { y: 200, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "back.out(1.4)" }, at(13, 0.1)); sparkle("#g13 .spk", at(13, 0.9));
// 14 from hardship to hub
enter(14); bob("a14p", 14, 6); mouth("a14p", "mS", S[13]); pop("#g14 .hrt", at(14, 0.3), 0.4); pop("#g14 .a14", at(14, 1.1), 0.3); pop("#g14 .c14", at(14, 1.5), 0.4); mouth("a14p", "mG", at(14, 1.6));
// 15 CTA
scene(15, "h15", "mG"); brows("h15", -12, at(15, 0.2)); armR("h15", -125, at(15, 0.2));
pop("#g15 .bubble", at(15, 0.5), 0.45); hide("#g15 .dot", at(15, 0.9), 0.1); pop("#g15 .s15", at(15, 1.0), 0.4);

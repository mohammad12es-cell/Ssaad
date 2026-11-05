// Part 4: The Great Hookah Boycott (Tobacco Protest, 1891-92)
const SHAH = (id, x, y, s) => PERSON(id, x, y, s, { robe: "long", hat: "qajar", body: "#1b2a4a", beard: "#1b1b1b" });
const BOSS = (id, x, y, s) => PERSON(id, x, y, s, { robe: "suit", hat: "tophat", body: "#2b2b3a" });
const MERCH = (id, x, y, s, c) => PERSON(id, x, y, s, { robe: "long", hat: "qajar", body: c, beard: "#3a2a1a" });
const FARMER = (id, x, y, s) => PERSON(id, x, y, s, { body: "#7a9a3a", hat: "cap" });
const LEAF = (x, y, s = 1, cls = "icon") => g(x, y, s, cls, `<path d="M0,90 Q-90,10 -40,-70 Q0,-110 40,-70 Q90,10 0,90 Z" fill="#6aa84f" stroke="${K}" stroke-width="7"/><path d="M0,85 L0,-70 M0,0 L-30,-30 M0,30 L30,0" fill="none" stroke="#3d6b2c" stroke-width="6"/>`);
const SHIP = (x, y, s = 1, cls = "icon") => g(x, y, s, cls, `<path d="M-90,0 L90,0 L60,50 L-60,50 Z" fill="#7a4a24" stroke="${K}" stroke-width="7"/><line x1="0" y1="0" x2="0" y2="-110" stroke="${K}" stroke-width="7"/><path d="M5,-105 L70,-25 L5,-25 Z" fill="#fff" stroke="${K}" stroke-width="6"/>`);
const CITY = (x, y, cls = "city") => g(x, y, 1, cls, `<circle r="26" fill="#1b2a4a" stroke="${K}" stroke-width="6"/>`);
const BILL = (x, y, s = 1, cls = "bill") => g(x, y, s, cls, `<rect x="-110" y="-150" width="220" height="300" fill="#fff" stroke="${K}" stroke-width="8"/>${[0, 1, 2].map((k) => `<line x1="-70" y1="${-90 + k * 50}" x2="70" y2="${-90 + k * 50}" stroke="#c9c2b2" stroke-width="10" stroke-linecap="round"/>`).join("")}<text x="0" y="110" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="56" fill="#d1343e">£££</text>`);

put("g1", QALYAN(540, 1350, 1.4) + NOSIGN(540, 1100, 1.6) + HERO("h1", 860, 1860, 0.5));
put("g2", SHAH("k2", 520, 1760, 0.95) + COIN(760, 1200, 1, "fall") + BANG(330, 820, 1.1));
put("g3", SHAH("k3", 230, 1760, 0.8) + SCROLL(540, 1150, 0.7) + BOSS("b3", 850, 1760, 0.8) + LABEL(540, 700, "50 YEARS", "lab3", 76, "#111", "#ffd400"));
put("g4", LEAF(160, 720, 0.9) + SACK(380, 780, 0.9, "icon") + SHOP(640, 800, 0.55, "icon") + SHIP(880, 760, 1.0) + BOSS("b4", 540, 1860, 0.7)
  + ARROW(170, 830, 420, 1090, "a4") + ARROW(390, 830, 500, 1080, "a4") + ARROW(640, 830, 580, 1080, "a4") + ARROW(880, 830, 660, 1090, "a4"));
put("g5", MERCH("m5", 300, 1760, 0.85, "#b5562e") + FARMER("f5", 780, 1760, 0.85) + BANG(300, 820, 1.0) + BANG(780, 820, 1.0));
put("g6", `<path class="net" d="M200,1500 L420,1150 L700,1300 L860,900 L560,760 L300,900 L420,1150" fill="none" stroke="#c9c2b2" stroke-width="10" stroke-dasharray="20 18"/>`
  + [[200, 1500], [420, 1150], [700, 1300], [860, 900], [560, 760], [300, 900]].map((p) => CITY(p[0], p[1]) + BANG(p[0] + 10, p[1] - 30, 0.7, "bg")).join(""));
put("g7", SCROLL(540, 1150, 1.0, "decree") + NOSIGN(540, 1150, 1.0, "ns7") + QALYAN(540, 1270, 0.45, "q7"));
put("g8", [0, 1, 2, 3, 4, 5].map((k) => QALYAN(240 + (k % 3) * 300, 1050 + Math.floor(k / 3) * 450, 0.55, "qg") + NOSIGN(240 + (k % 3) * 300, 950 + Math.floor(k / 3) * 450, 0.75, "ng")).join("") + HERO("h8", 900, 1890, 0.35));
put("g9", SHOP(270, 1300, 1.0) + SHUTTER(270, 1300, 1.05, "sh") + SHOP(800, 1300, 1.0) + SHUTTER(800, 1300, 1.05, "sh") + QALYAN(540, 1700, 0.6, "qa"));
put("g10", SIGNPOST(560, 1420, 0.8, "picket", "ON STRIKE!", "#ffd400", "#111", 64) + HERO("h10", 330, 1800, 0.75) + PERSON("p10", 760, 1800, 0.75, { body: "#2a9d8f", robe: "long", hat: "qajar", beard: "#3a2a1a" }));
put("g11", SCROLL(540, 1150, 0.9, "deal") + CROSS(540, 1150, 1.6, "x11") + LABEL(540, 700, "1892", "lab11", 90, "#111", "#ffd400"));
put("g12", SHAH("k12", 230, 1760, 0.8) + POUND(500, 1500, 1.3) + BOSS("b12", 850, 1760, 0.8) + LABEL(540, 760, "FOREIGN LOAN", "lab12", 64, "#fff", "#e0404a"));
put("g13", BILL(540, 700, 1.0) + HERO("h13", 540, 1820, 0.85));
put("g14", BOSS("b14", 760, 1760, 0.85) + MERCH("m14", 300, 1760, 0.7, "#b5562e") + FARMER("f14", 140, 1760, 0.7));
put("g15", BUBBLE(790, 690) + NOSIGN(790, 700, 0.5, "n15") + HERO("h15", 470, 1800, 1.0));

// 1 hook
scene(1, "h1", "mO"); brows("h1", -16, 0.3);
pop("#g1 .qalyan", 0.2, 0.45); pop("#g1 .nosign", 1.4, 0.4);
// 2 the Shah needs money
enter(2); bob("k2", 2, 6); mouth("k2", "mO", S[1]); brows("k2", 10, at(2, 0.2));
armL("k2", 40, at(2, 0.3)); armR("k2", -40, at(2, 0.3)); pop("#g2 .bang", at(2, 0.8), 0.3);
tl.fromTo("#g2 .fall", { y: -300, opacity: 1 }, { y: 400, opacity: 0, duration: 0.9, ease: "power2.in" }, at(2, 0.5));
// 3 the concession
enter(3); mouth("k3", "mS", S[2]); mouth("b3", "mG", S[2]);
pop("#g3 .scroll", at(3, 0.4), 0.45); pop("#g3 .lab3", at(3, 1.8), 0.4);
armR("k3", -60, at(3, 0.8)); armL("b3", 60, at(3, 0.8)); hop("b3", at(3, 2.2), 2, 30);
// 4 one company controls everything
enter(4); mouth("b4", "mG", S[3]); popAll("#g4 .icon", at(4, 0.2), 0.35); popAll("#g4 .a4", at(4, 1.6), 0.15);
armL("b4", 150, at(4, 1.8)); armR("b4", -150, at(4, 1.8));
// 5 furious
enter(5); mouth("m5", "mO", S[4]); mouth("f5", "mO", S[4]); brows("m5", 14, at(5, 0.2)); brows("f5", 14, at(5, 1.2));
shake("m5", at(5, 0.3), 4); shake("f5", at(5, 1.2), 4); pop("#g5 .bang", at(5, 0.3), 0.3);
armR("m5", -150, at(5, 0.4)); armL("f5", 150, at(5, 1.3));
// 6 protests spread
enter(6); tl.fromTo("#g6 .net", { opacity: 0 }, { opacity: 1, duration: 0.6 }, at(6, 0.2));
popAll("#g6 .city", at(6, 0.2), 0.25, 0.3); popAll("#g6 .bg", at(6, 0.5), 0.3, 0.3);
// 7 the decree
enter(7); pop("#g7 .decree", at(7, 0.2), 0.45); pop("#g7 .q7", at(7, 0.8), 0.3); pop("#g7 .ns7", at(7, 2.0), 0.4);
// 8 the country stops smoking
scene(8, "h8", "mO"); popAll("#g8 .qg", at(8, 0.1), 0.12, 0.3); popAll("#g8 .ng", at(8, 0.9), 0.15, 0.3);
// 9 shops close, hookahs away
enter(9);
tl.fromTo("#g9 .sh", { scaleY: 0, svgOrigin: "0 -170" }, { scaleY: 1, svgOrigin: "0 -170", duration: 0.5, stagger: 0.4, ease: "bounce.out" }, at(9, 0.3));
pop("#g9 .qa", at(9, 0.2), 0.3); tl.to("#g9 .qa", { x: 700, rotation: 20, opacity: 0, duration: 0.8, ease: "power2.in" }, at(9, 1.6));
// 10 hookah strike
scene(10, "h10", "mG"); bob("p10", 10, 8); mouth("p10", "mG", S[9]);
pop("#g10 .picket", at(10, 0.2), 0.4); armR("h10", -150, at(10, 0.2)); armR("p10", -150, at(10, 0.5));
tl.to("#g10 .picket", { rotation: 6, svgOrigin: "0 0", duration: 0.3, yoyo: true, repeat: 5, ease: "sine.inOut" }, at(10, 0.7));
// 11 cancelled
enter(11); pop("#g11 .deal", at(11, 0.1), 0.4); pop("#g11 .lab11", at(11, 0.4), 0.4); pop("#g11 .x11", at(11, 1.4), 0.3);
tl.to("#g11 .deal", { rotation: -15, scale: 0.8, transformOrigin: "50% 50%", duration: 0.4 }, at(11, 1.6));
// 12 compensation
enter(12); mouth("k12", "mF", S[11]); mouth("b12", "mG", S[11]); brows("k12", 10, at(12, 0.2));
tl.fromTo("#g12 .pound", { x: -260, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, ease: "power2.out" }, at(12, 0.6));
tl.to("#g12 .pound", { x: 220, duration: 0.6, ease: "power2.in" }, at(12, 1.6)); pop("#g12 .lab12", at(12, 2.2), 0.35);
// 13 the bill still came
scene(13, "h13", "mG"); armL("h13", 150, at(13, 0.2)); armR("h13", -150, at(13, 0.2)); hop("h13", at(13, 0.2), 2);
tl.fromTo("#g13 .bill", { y: -900, rotation: -20 }, { y: 0, rotation: 8, duration: 0.6, ease: "bounce.out" }, at(13, 1.4));
mouth("h13", "mO", at(13, 1.9)); brows("h13", -18, at(13, 1.9)); armL("h13", 0, at(13, 1.9)); armR("h13", 0, at(13, 1.9));
// 14 customers walk away
enter(14); mouth("b14", "mF", S[13]); mouth("m14", "mS", S[13]); mouth("f14", "mS", S[13]);
tl.to(["#m14", "#f14"], { x: -700, duration: 1.6, ease: "power1.in", stagger: 0.2 }, at(14, 0.6));
mouth("b14", "mO", at(14, 1.4)); brows("b14", -16, at(14, 1.4)); armL("b14", 60, at(14, 1.4));
// 15 CTA
scene(15, "h15", "mG"); brows("h15", -12, at(15, 0.2)); armR("h15", -125, at(15, 0.2));
pop("#g15 .bubble", at(15, 0.5), 0.45); hide("#g15 .dot", at(15, 0.9), 0.1); pop("#g15 .n15", at(15, 1.0), 0.4);

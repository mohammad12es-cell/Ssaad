// Part 2: The Coin That Beat Sparta (the daric)
const KING = (id, x, y, s) => PERSON(id, x, y, s, { robe: "long", hat: "crown", body: "#6b3fa0", beard: "#2b1a0f" });
const SPARTAN = (id, x, y, s) => PERSON(id, x, y, s, { robe: "armor", hat: "helmet", beard: "#5b3216" });
const GREEK = (id, x, y, s) => PERSON(id, x, y, s, { robe: "tunic", hat: "none", body: "#f4f0e6", beard: "#6b3e1f" });
const PEDESTAL = (x, y, s, cls = "ped") => g(x, y, s, cls, `<rect x="-150" y="-40" width="300" height="260" fill="#e9e4d8" stroke="${K}" stroke-width="9"/>
  <rect x="-180" y="-70" width="360" height="40" rx="8" fill="#d9d2c3" stroke="${K}" stroke-width="8"/>
  <rect x="-150" y="-420" width="300" height="350" rx="12" fill="rgba(180,220,255,0.25)" stroke="${K}" stroke-width="8"/>
  <path d="M-120,-400 L-60,-400 L-150,-250 Z" fill="rgba(255,255,255,0.7)"/>`);
const COINRAIN = (n, cls) => Array.from({ length: n }, (_, k) => COIN(120 + ((k * 173) % 860), 300 + ((k * 97) % 500), 0.8 + (k % 3) * 0.2, cls)).join("");

put("g1", DARIC(470, 1000, 1.4) + SPARK(200, 760, 1) + SPARK(760, 820, 0.8) + HELM(250, 1500) + HERO("h1", 820, 1840, 0.55));
function HELM(x, y) { return g(x, y, 0.9, "helm", `<path d="M-135,40 Q-140,-140 0,-140 Q140,-140 135,40 L95,40 L95,-20 L-95,-20 L-95,40 Z" fill="#d4a84a" stroke="${K}" stroke-width="9" stroke-linejoin="round"/><path d="M-110,-140 Q0,-280 110,-140 Q0,-190 -110,-140 Z" fill="#d1343e" stroke="${K}" stroke-width="8"/>`); }
put("g2", CALENDAR(820, 760, 0.95, "500 BC") + KING("k2", 480, 1760, 0.95) + BANG(380, 760, 1.2));
put("g3", LUMPS(260, 900, 1.6, "lp") + LUMPS(560, 820, 1.3, "lp") + LUMPS(840, 920, 1.7, "lp") + SCALE(560, 1380, 0.9) + HERO("h3", 230, 1820, 0.6));
put("g4", KING("k4", 330, 1760, 0.9) + DARIC(740, 1000, 1.0) + SPARK(560, 760, 1) + SPARK(950, 1220, 0.8) + SPARK(900, 760, 0.6));
put("g5", DARIC(540, 1020, 2.1) + HERO("h5", 860, 1880, 0.5));
put("g6", GREEK("gk6", 330, 1760, 0.9) + COIN(470, 1380, 1.3, "c6") + LABEL(720, 760, "“Archers!”", "lab6", 76, "#111", "#fff") + HERO("h6", 830, 1760, 0.75));
put("g7", COIN(540, 900, 2.6, "big7") + LABEL(540, 640, "PURE GOLD", "lab7", 64, "#111", "#ffd400")
  + PERSON("m71", 200, 1760, 0.6, { body: "#3fa7c9" }) + PERSON("m72", 540, 1800, 0.6, { body: "#b5562e" }) + PERSON("m73", 880, 1760, 0.6, { body: "#2a9d8f", robe: "long" })
  + ARROW(450, 1050, 260, 1250, "a7") + ARROW(540, 1080, 540, 1260, "a7") + ARROW(630, 1050, 820, 1250, "a7"));
put("g8", SPARTAN("sp8", 300, 1760, 0.9) + ARROW(470, 1250, 690, 1250, "a8") + KING("k8", 820, 1760, 0.8));
put("g9", CROSS(560, 760, 1.0, "x9") + SPARTAN("sp9", 560, 1000, 0.35) + SACK(500, 1600, 1.1, "s9") + COIN(560, 1450, 1, "c9") + GREEK("gk91", 760, 1760, 0.7) + GREEK("gk92", 950, 1760, 0.6) + KING("k9", 230, 1760, 0.8));
put("g10", ENVELOPE(760, 880, 1.6) + SPARTAN("sp10", 500, 1760, 0.95) + BANG(700, 1050, 1.1));
put("g11", COINRAIN(14, "rn") + SPARTAN("sp11", 540, 1780, 0.95) + LABEL(540, 700, "“Thousands of archers!”", "lab11", 60, "#111", "#fff"));
put("g12", DARIC(540, 950, 1.7) + HERO("h12", 540, 1860, 0.55));
put("g13", LABEL(540, 660, "MONEY ≥ ARMY?", "lab13", 80, "#111", "#ffd400") + DARIC(780, 1160, 0.9) + HELM(780, 1520) + HERO("h13", 300, 1780, 0.85));
put("g14", PEDESTAL(560, 1500, 1.15) + DARIC(560, 1150, 0.62) + SPARK(380, 900, 0.8) + SPARK(760, 1000, 0.7) + HERO("h14", 200, 1820, 0.6));
put("g15", BUBBLE(790, 690) + COIN(790, 700, 1.2, "c15", "?") + HERO("h15", 470, 1800, 1.0));

// 1 hook
scene(1, "h1", "mO");
tl.fromTo("#g1 .daric", { scale: 0, rotation: -200, transformOrigin: "50% 50%" }, { scale: 1, rotation: 0, transformOrigin: "50% 50%", duration: 0.8, ease: "back.out(1.6)" }, 0.2);
sparkle("#g1 .spk", 1.0);
pop("#g1 .helm", 1.6, 0.35); tl.to("#g1 .helm", { x: 500, y: -300, rotation: 60, opacity: 0, duration: 0.6, ease: "power2.in" }, 2.8);
brows("h1", -16, 0.4);
// 2 king's problem
enter(2); bob("k2", 2, 6); mouth("k2", "mF", S[1]); brows("k2", 10, at(2, 0.2));
pop("#g2 .cal", at(2, 0.2)); pop("#g2 .bang", at(2, 1.4), 0.3);
armR("k2", -160, at(2, 1.2)); shake("k2", at(2, 1.6), 3);
// 3 messy money
scene(3, "h3", "mF"); brows("h3", 10, at(3, 0.2));
popAll("#g3 .lp", at(3, 0.3), 0.3);
tl.fromTo("#g3 .beam", { rotation: -12, svgOrigin: "0 -305" }, { rotation: 12, svgOrigin: "0 -305", duration: 0.5, yoyo: true, repeat: 5, ease: "sine.inOut" }, at(3, 0.6));
armL("h3", 40, at(3, 0.8)); armR("h3", -40, at(3, 0.8));
// 4 the daric
enter(4); bob("k4", 4, 6); mouth("k4", "mS", S[3]);
tl.fromTo("#g4 .daric", { y: 400, scale: 0.2, opacity: 0, transformOrigin: "50% 50%" }, { y: 0, scale: 1, opacity: 1, transformOrigin: "50% 50%", duration: 0.7, ease: "back.out(1.7)" }, at(4, 0.6));
sparkle("#g4 .spk", at(4, 1.2)); armR("k4", -110, at(4, 0.6)); mouth("k4", "mG", at(4, 1.2));
// 5 archer on the coin
scene(5, "h5", "mS");
tl.fromTo("#g5 .daric", { scale: 0.7, transformOrigin: "50% 50%" }, { scale: 1.05, transformOrigin: "50% 50%", duration: dur(5), ease: "sine.out" }, S[4]);
mouth("h5", "mG", at(5, 2.4)); armR("h5", -120, at(5, 2.4)); blink("h5", at(5, 2.8));
// 6 "archers"
scene(6, "h6"); bob("gk6", 6, 6); mouth("gk6", "mG", S[5]);
pop("#g6 .c6", at(6, 0.2)); pop("#g6 .lab6", at(6, 1.2), 0.4); armR("gk6", -60, at(6, 0.2));
armL("h6", 60, at(6, 1.6)); mouth("h6", "mG", at(6, 1.6));
// 7 trusted everywhere
enter(7);
pop("#g7 .big7", at(7, 0.1), 0.45); pop("#g7 .lab7", at(7, 0.6), 0.35);
popAll("#g7 .a7", at(7, 1.2), 0.2);
["m71", "m72", "m73"].forEach((m, k) => { mouth(m, "mG", at(7, 1.6 + k * 0.2)); hop(m, at(7, 1.6 + k * 0.2), 1, 40); });
// 8 Sparta marches in
enter(8); mouth("sp8", "mF", S[7]); brows("sp8", 12, at(8, 0.1)); mouth("k8", "mO", S[7]); brows("k8", -14, at(8, 0.6));
slide("#sp8", at(8, 0.1), -500, 0, 1.0, "power2.out");
pop("#g8 .a8", at(8, 1.2), 0.35);
tl.to("#sp8 .rig", { y: -24, duration: 0.15, yoyo: true, repeat: 7 }, at(8, 0.1));
// 9 gold to Sparta's rivals
enter(9); mouth("k9", "mS", S[8]); pop("#g9 .x9", at(9, 0.3), 0.3);
tl.fromTo("#g9 .s9", { x: -260, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8, ease: "power2.out" }, at(9, 1.4));
pop("#g9 .c9", at(9, 1.8), 0.3);
mouth("gk91", "mG", at(9, 2.2)); mouth("gk92", "mG", at(9, 2.2)); hop("gk91", at(9, 2.3), 2, 40); hop("gk92", at(9, 2.4), 2, 40);
mouth("k9", "mG", at(9, 2.2)); armR("k9", -100, at(9, 1.4));
// 10 called home
enter(10); bob("sp10", 10, 6); mouth("sp10", "mF", S[9]);
pop("#g10 .env", at(10, 0.4), 0.4); pop("#g10 .bang", at(10, 1.0), 0.3);
mouth("sp10", "mO", at(10, 1.0)); brows("sp10", -18, at(10, 1.0));
tl.to("#sp10", { x: -700, duration: 0.9, ease: "power2.in" }, at(10, 2.2));
// 11 "thousands of archers"
enter(11); mouth("sp11", "mO", S[10]); brows("sp11", -18, at(11, 0.1));
tl.fromTo("#g11 .rn", { y: -900 }, { y: 0, duration: 0.7, stagger: 0.12, ease: "bounce.out" }, at(11, 0.1));
pop("#g11 .lab11", at(11, 1.6), 0.4); armL("sp11", 160, at(11, 0.3)); armR("sp11", -160, at(11, 0.3)); shake("sp11", at(11, 1.0), 6);
// 12 coins!
scene(12, "h12", "mG");
tl.fromTo("#g12 .daric", { scale: 0.3, transformOrigin: "50% 50%" }, { scale: 1, transformOrigin: "50% 50%", duration: 0.5, ease: "elastic.out(1, 0.5)" }, at(12, 0.2));
spin("#g12 .daric", at(12, 0.7), 0.8); armR("h12", -150, at(12, 0.3)); armL("h12", 150, at(12, 0.3)); hop("h12", at(12, 0.4), 2);
// 13 lesson
scene(13, "h13"); armR("h13", -100, at(13, 0.3)); brows("h13", -10, at(13, 0.3));
pop("#g13 .lab13", at(13, 0.2), 0.4); pop("#g13 .daric", at(13, 0.9), 0.4); pop("#g13 .helm", at(13, 1.4), 0.4);
tl.to("#g13 .helm", { scale: 0.5, transformOrigin: "50% 50%", duration: 0.4, ease: "power2.in" }, at(13, 2.2)); mouth("h13", "mG", at(13, 2.2));
// 14 museums
scene(14, "h14"); armR("h14", -140, at(14, 0.3));
pop("#g14 .ped", at(14, 0.1), 0.4); pop("#g14 .daric", at(14, 0.6), 0.4); sparkle("#g14 .spk", at(14, 1.0));
// 15 CTA
scene(15, "h15", "mG"); brows("h15", -12, at(15, 0.2)); armR("h15", -125, at(15, 0.2));
pop("#g15 .bubble", at(15, 0.5), 0.45); hide("#g15 .dot", at(15, 0.9), 0.1); pop("#g15 .c15", at(15, 1.0), 0.4);
spin("#g15 .c15", at(15, 1.5), 1.0);

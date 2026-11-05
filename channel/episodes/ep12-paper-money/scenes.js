// Part 7: Iran's Two-Month Paper Money (Tabriz, 1294)
const KHAN = (id, x, y, s) => PERSON(id, x, y, s, { robe: "long", hat: "crown", body: "#2f5fa8", beard: "#1b1b1b" });
const VIZIER = (id, x, y, s) => PERSON(id, x, y, s, { robe: "long", hat: "cap", body: "#6b3fa0", beard: "#6b6b6b" });
const CHEST = (x, y, s = 1, cls = "chest") => g(x, y, s, cls, `<rect x="-160" y="-110" width="320" height="200" rx="14" fill="#8a6232" stroke="${K}" stroke-width="9"/>
  <g class="lid"><path d="M-170,-110 Q-170,-200 0,-200 Q170,-200 170,-110 Z" fill="#a0632f" stroke="${K}" stroke-width="9"/></g><rect x="-25" y="-130" width="50" height="60" rx="8" fill="#c9a24b" stroke="${K}" stroke-width="7"/>`);
const FLY = (x, y, cls = "fly") => g(x, y, 1, cls, `<circle r="10" fill="${K}"/><ellipse cx="-10" cy="-14" rx="10" ry="16" fill="#cfe3f5" stroke="${K}" stroke-width="4"/><ellipse cx="10" cy="-14" rx="10" ry="16" fill="#cfe3f5" stroke="${K}" stroke-width="4"/>`);
const BREAD = (x, y, s = 1, cls = "bread") => g(x, y, s, cls, `<path d="M-130,30 Q-140,-60 0,-70 Q140,-60 130,30 Z" fill="#e0a24f" stroke="${K}" stroke-width="8"/><path d="M-60,-30 L-40,0 M0,-40 L15,-5 M60,-30 L75,0" stroke="#a8692a" stroke-width="8" stroke-linecap="round"/>`);
const HEARTBIG = (x, y, s = 1, cls = "trust") => HEART(x, y, s, cls);

put("g1", BANKNOTE(540, 860, 1.8, "note", "#b3263a") + CALENDAR(840, 1350, 0.8, "1294", "cal") + HERO("h1", 300, 1820, 0.75));
put("g2", KHAN("k2", 540, 1780, 1.0) + SPARK(330, 900, 0.7) + SPARK(760, 860, 0.7));
put("g3", CHEST(560, 1300, 1.4) + FLY(500, 1050) + FLY(620, 1000) + KHAN("k3", 220, 1800, 0.7));
put("g4", VIZIER("v4", 760, 1760, 0.85) + BUBBLE(760, 720, "bub4") + BANKNOTE(760, 700, 0.55, "n4", "#b3263a") + KHAN("k4", 260, 1760, 0.85));
put("g5", [0, 1, 2, 3, 4].map((k) => BANKNOTE(540, 1300 - k * 30, 1.3, "stack", "#b3263a")).join("") + LABEL(540, 760, "CHAO", "lab5", 96, "#111", "#ffd400") + HERO("h5", 880, 1880, 0.45));
put("g6", COIN(330, 1050, 2.2, "gs") + COIN(560, 1100, 1.8, "gs") + CROSS(440, 1070, 2.0, "x6") + BANKNOTE(760, 1450, 1.2, "n6", "#b3263a") + KHAN("k6", 230, 1800, 0.6));
put("g7", BANKNOTE(540, 800, 1.3, "n7", "#b3263a") + NOSIGN(540, 800, 1.5, "ns7") + PERSON("p7", 540, 1800, 0.85, { body: "#b5562e" }));
put("g8", SHOP(270, 1350, 1.0, "s8") + SHUTTER(270, 1350, 1.05, "sh") + SHOP(800, 1350, 1.0, "s8") + SHUTTER(800, 1350, 1.05, "sh") + PERSON("p8", 540, 1820, 0.6, { robe: "long", hat: "cap", body: "#2a9d8f", beard: "#3a2a1a" }));
put("g9", [200, 540, 880].map((x) => SHOP(x, 1200, 0.8, "s9") + SHUTTER(x, 1200, 0.84, "sh9")).join("") + CAMEL(540, 1760, 0.6, "cm9", true) + CROSS(540, 1600, 1.1, "x9"));
put("g10", BREAD(330, 1150, 1.2) + BANKNOTE(760, 1150, 0.9, "n10", "#b3263a") + PERSON("p10", 540, 1820, 0.8, { body: "#7a9a3a", hat: "cap" }));
put("g11", [0, 1, 2, 3, 4, 5].map((k) => BANKNOTE(200 + (k % 3) * 340, 900 + Math.floor(k / 3) * 260, 0.7, "fall", "#b3263a", "", ((k * 37) % 40) - 20)).join("") + KHAN("k11", 540, 1820, 0.75));
put("g12", BANKNOTE(540, 1000, 1.4, "n12", "#b3263a") + HEART(540, 760, 2.0, "trust") + HERO("h12", 540, 1860, 0.55));
put("g13", BANKNOTE(220, 1000, 0.7, "m1", "#b3263a") + COIN(540, 1000, 1.6, "m2") + PHONE(860, 1000, 0.6, "m3") + HEART(540, 1350, 2.6, "trust") + HERO("h13", 860, 1880, 0.4));
put("g14", CALENDAR(300, 900, 1.0, "1294", "c1") + ARROW(460, 900, 620, 900, "a14") + CALENDAR(780, 900, 1.0, "1890", "c2") + LABEL(540, 1180, "~600 YEARS", "lab14", 70, "#111", "#ffd400") + HERO("h14", 540, 1860, 0.55));
put("g15", BUBBLE(790, 690) + BANKNOTE(720, 690, 0.35, "n15", "#2f6b4f") + PHONE(870, 690, 0.3, "p15") + HERO("h15", 470, 1800, 1.0));

// 1 hook
scene(1, "h1", "mO"); brows("h1", -16, 0.3); pop("#g1 .note", 0.2, 0.5); pop("#g1 .cal", 1.0, 0.4);
tl.to("#g1 .note", { rotation: 360, scale: 0, transformOrigin: "50% 50%", duration: 0.7, ease: "power2.in" }, 3.3);
// 2 Gaykhatu
enter(2); bob("k2", 2, 6); mouth("k2", "mS", S[1]); sparkle("#g2 .spk", at(2, 0.3)); armR("k2", -60, at(2, 0.4));
// 3 empty treasury
enter(3); mouth("k3", "mO", S[2]); brows("k3", -16, at(3, 0.8));
pop("#g3 .chest", at(3, 0.1), 0.4); tl.to("#g3 .lid", { y: -60, rotation: -20, svgOrigin: "-170 -110", duration: 0.4, ease: "back.out(2)" }, at(3, 0.6));
tl.fromTo("#g3 .fly", { y: 80, opacity: 0 }, { y: -120, opacity: 1, duration: 1.2, stagger: 0.2, ease: "sine.out" }, at(3, 0.9));
// 4 the idea
enter(4); mouth("v4", "mG", S[3]); mouth("k4", "mF", S[3]); armR("v4", -120, at(4, 0.3));
pop("#g4 .bub4", at(4, 0.6), 0.4); hide("#g4 .dot", at(4, 1.0), 0.1); pop("#g4 .n4", at(4, 1.1), 0.35); mouth("k4", "mG", at(4, 2.2)); hop("k4", at(4, 2.3), 2, 30);
// 5 chao printed
scene(5, "h5", "mO"); tl.fromTo("#g5 .stack", { y: -400, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, stagger: 0.25, ease: "bounce.out" }, at(5, 0.2)); pop("#g5 .lab5", at(5, 1.6), 0.4);
// 6 gold banned
enter(6); mouth("k6", "mF", S[5]); popAll("#g6 .gs", at(6, 0.2), 0.3); pop("#g6 .x6", at(6, 1.4), 0.35); pop("#g6 .n6", at(6, 2.0), 0.4); armR("k6", -100, at(6, 1.4));
// 7 refuse at your peril
enter(7); mouth("p7", "mO", S[6]); brows("p7", -18, at(7, 0.4)); pop("#g7 .n7", at(7, 0.2), 0.35); pop("#g7 .ns7", at(7, 1.2), 0.35); shake("p7", at(7, 1.4), 4);
// 8 shops close
enter(8); mouth("p8", "mF", S[7]); popAll("#g8 .s8", at(8, 0.1), 0.2, 0.3);
tl.fromTo("#g8 .sh", { scaleY: 0, svgOrigin: "0 -170" }, { scaleY: 1, svgOrigin: "0 -170", duration: 0.5, stagger: 0.5, ease: "bounce.out" }, at(8, 1.0));
tl.to("#p8", { x: 700, duration: 1.2, ease: "power1.in" }, at(8, 2.2));
// 9 silent bazaar
enter(9); popAll("#g9 .s9", at(9, 0.1), 0.15, 0.3); tl.fromTo("#g9 .sh9", { scaleY: 0, svgOrigin: "0 -170" }, { scaleY: 1, svgOrigin: "0 -170", duration: 0.4, stagger: 0.25, ease: "bounce.out" }, at(9, 0.5));
pop("#g9 .cm9", at(9, 1.6), 0.35); pop("#g9 .x9", at(9, 2.3), 0.3);
// 10 no trust, no bread
enter(10); mouth("p10", "mF", S[9]); pop("#g10 .bread", at(10, 0.2), 0.35); pop("#g10 .n10", at(10, 0.6), 0.35);
armR("p10", -60, at(10, 0.8)); tl.to("#g10 .bread", { x: -300, opacity: 0, duration: 0.6, ease: "power2.in" }, at(10, 1.8)); mouth("p10", "mO", at(10, 2.0));
// 11 collapse
enter(11); mouth("k11", "mO", S[10]); brows("k11", -18, at(11, 0.2)); popAll("#g11 .fall", at(11, 0.1), 0.1, 0.25);
tl.to("#g11 .fall", { y: 1200, rotation: 90, duration: 1.0, stagger: 0.08, ease: "power2.in" }, at(11, 1.4)); armL("k11", 150, at(11, 1.4)); armR("k11", -150, at(11, 1.4));
// 12 belief
scene(12, "h12"); pop("#g12 .n12", at(12, 0.2), 0.35); pop("#g12 .trust", at(12, 1.2), 0.45);
tl.to("#g12 .trust", { scale: 1.15, transformOrigin: "50% 50%", duration: 0.3, yoyo: true, repeat: 3 }, at(12, 1.8)); armR("h12", -120, at(12, 1.2)); mouth("h12", "mG", at(12, 1.4));
// 13 money is trust
scene(13, "h13", "mG"); popAll("#g13 .m1, #g13 .m2, #g13 .m3", at(13, 0.1), 0.3); pop("#g13 .trust", at(13, 1.4), 0.5);
// 14 600 years
scene(14, "h14"); pop("#g14 .c1", at(14, 0.2), 0.35); pop("#g14 .a14", at(14, 0.8), 0.3); pop("#g14 .c2", at(14, 1.1), 0.35); pop("#g14 .lab14", at(14, 1.7), 0.4); mouth("h14", "mO", at(14, 1.7));
// 15 CTA
scene(15, "h15", "mG"); brows("h15", -12, at(15, 0.2)); armR("h15", -125, at(15, 0.2));
pop("#g15 .bubble", at(15, 0.5), 0.45); hide("#g15 .dot", at(15, 0.9), 0.1); pop("#g15 .n15", at(15, 1.0), 0.35); pop("#g15 .p15", at(15, 1.3), 0.35);

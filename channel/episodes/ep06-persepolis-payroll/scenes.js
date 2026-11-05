// Part 1: The Oldest Payslip in Iran (Persepolis tablets)
put("ov1", SPARK(620, 1060, 0.9) + SPARK(980, 1180, 0.7) + SPARK(900, 980, 0.6));
put("g2", COLUMN(700, 1700, 1.05, "col1") + COLUMN(940, 1700, 0.8, "col2") + HERO("h2", 300, 1720, 0.9));
put("ov3", BOX(850, 905, 0.85));
put("ov4", TAB(600, 1320, 0.55, "silver", -12, "silv") + SPARK(930, 1000, 0.8) + SPARK(640, 1110, 0.6));
put("g5", ARROW2(620, "arr") + DOC(780, 1260, 0.95) + HERO("h5", 330, 1760, 0.85));
put("ov6", [0, 1, 2, 3, 4].map((k) => COIN(150 + (k - 2) * 30, 1430, 0.9, "jc")).join("") + SPARK(320, 1380, 0.6));
put("ov7", BANG(700, 1400, 1.2) + SPARK(1000, 1520, 0.7) + SPARK(640, 1600, 0.5));
put("g8", Array.from({ length: 16 }, (_, k) => TAB(560 + (k % 4) * 120 + ((k * 37) % 30), 1720 - Math.floor(k / 4) * 120, 0.42, "clay", ((k * 47) % 30) - 15, "rain")).join("") + HERO("h8", 250, 1780, 0.8));
put("g9", TAB(560, 1040, 1.45, "clay", 0, "ledger") + BARLEY(700, 890, 0.85) + JAR(700, 1050, 0.75) + SHEEP(690, 1215, 0.8) + HERO("h9", 230, 1840, 0.6));
put("g10", PERSON("w10", 790, 1720, 0.85) + SACK(420, 1640, 1.2) + COIN(520, 1430, 1.2, "pay") + HERO("h10", 280, 1720, 0.85));
put("g11", PERSON("w11", 790, 1720, 0.85, { robe: "dress", hat: "scarf", body: "#2a9d8f" }) + SACK(560, 1660, 1.1) + HERO("h11", 260, 1720, 0.85));
put("g12", PERSON("w12", 800, 1720, 0.85, { robe: "dress", hat: "scarf", body: "#2a9d8f" }) + BABY(650, 1440, 1.0) + PLUS(440, 1060) + SACK(500, 1660, 0.9, "x1") + SACK(560, 1290, 0.8, "x2") + HEART(830, 860, 1.2) + HEART(960, 980, 0.9) + HERO("h12", 220, 1760, 0.7));
put("g14", PHONE(800, 980, 1.15) + POOF(800, 980) + TAB(290, 980, 0.9, "clay", -6, "keep") + SPARK(140, 760, 0.9) + SPARK(440, 1200, 0.7) + HERO("h14", 540, 1840, 0.6));
put("g15", BUBBLE(790, 690) + HERO("h15", 470, 1800, 1.0));

// 1 hook
cam(1, [540, 960, 1.0], [792, 1180, 1.45]);
sparkle("#ov1 .spk", 1.4);
// 2 columns rise
scene(2, "h2");
tl.fromTo("#g2 .col1", { scaleY: 0, svgOrigin: "0 0" }, { scaleY: 1, svgOrigin: "0 0", duration: 1.2, ease: "power3.out" }, at(2, 0.4));
tl.fromTo("#g2 .col2", { scaleY: 0, svgOrigin: "0 0" }, { scaleY: 1, svgOrigin: "0 0", duration: 1.2, ease: "power3.out" }, at(2, 1.3));
armR("h2", -105, at(2, 0.3)); brows("h2", -14, at(2, 0.3)); mouth("h2", "mG", at(2, 2.4));
// 3 stone boxes
cam(3, [746, 690, 1.7], [760, 1000, 1.35]);
tl.fromTo("#ov3", { y: 220, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "back.out(1.6)" }, at(3, 0.8));
tl.to("#ov3 .lid", { y: -70, rotation: -18, svgOrigin: "-122 -100", duration: 0.5, ease: "back.out(2)" }, at(3, 2.4));
tl.to("#ov3 .glow", { opacity: 1, duration: 0.3 }, at(3, 2.6));
// 4 gold & silver
cam(4, [792, 1234, 1.6], [792, 1234, 2.1], "power2.out");
pop("#ov4 .silv", at(4, 1.0), 0.4); sparkle("#ov4 .spk", at(4, 0.2));
// 5 imperial resume
scene(5, "h5");
armR("h5", -95, at(5, 0.2)); armL("h5", 95, at(5, 0.2)); brows("h5", -12, at(5, 0.2));
tl.fromTo("#g5 .arr", { scaleX: 0, svgOrigin: "540 620", opacity: 0 }, { scaleX: 1, svgOrigin: "540 620", opacity: 1, duration: 0.7, ease: "power3.out" }, at(5, 0.3));
pop("#g5 .doc", at(5, 2.2), 0.45);
popAll("#g5 .chk", at(5, 2.7), 0.25, 0.2);
armR("h5", -20, at(5, 2.2)); armL("h5", 20, at(5, 2.2)); mouth("h5", "mG", at(5, 3.0));
// 6 coins
cam(6, [300, 1300, 1.5], [143, 1560, 2.0]);
tl.set("#ov6 .jc", { opacity: 0 }, S[5]);
tl.fromTo("#ov6 .jc", { y: 0, opacity: 1 }, { keyframes: { y: [0, -260, -150] }, x: (k) => (k - 2) * 60, duration: 0.8, stagger: 0.15, ease: "power1.out" }, at(6, 1.0));
tl.to("#ov6 .jc", { rotation: 360, transformOrigin: "50% 50%", duration: 0.8, stagger: 0.15 }, at(6, 1.0));
sparkle("#ov6 .spk", at(6, 1.9));
// 7 clay tablets
cam(7, [700, 1500, 1.6], [872, 1687, 2.0], "power2.out");
pop("#ov7 .bang", at(7, 0.8), 0.3); sparkle("#ov7 .spk", at(7, 1.0));
// 8 thousands
scene(8, "h8", "mO"); brows("h8", -18, at(8, 0.2)); armL("h8", 150, at(8, 0.3)); armR("h8", -40, at(8, 0.3));
tl.fromTo("#g8 .rain", { y: -1500, opacity: 1 }, { y: 0, duration: 0.55, stagger: 0.16, ease: "bounce.out" }, at(8, 0.1));
// 9 rations ledger
scene(9, "h9"); armR("h9", -120, at(9, 0.2));
tl.fromTo("#g9 .ledger", { scale: 0.6, opacity: 0, transformOrigin: "50% 50%" }, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2)", transformOrigin: "50% 50%" }, at(9, 0.1));
popAll("#g9 .icon", at(9, 0.6), 0.8);
mouth("h9", "mG", at(9, 3.0));
// 10 wages
scene(10, "h10"); bob("w10", 10, 6); mouth("w10", "mF", S[9]);
tl.fromTo("#g10 .sack", { x: -60, opacity: 0 }, { x: 230, opacity: 1, duration: 0.8, ease: "power2.out" }, at(10, 0.3));
pop("#g10 .pay", at(10, 0.9), 0.35);
tl.to("#g10 .pay", { y: 60, x: 200, duration: 0.6, ease: "power2.in" }, at(10, 1.5));
mouth("w10", "mG", at(10, 1.4)); brows("w10", -14, at(10, 1.4)); hop("w10", at(10, 1.5));
armR("h10", -30, at(10, 0.3));
// 11 women
scene(11, "h11"); bob("w11", 11, 6); mouth("w11", "mS", S[10]);
pop("#g11 .sack", at(11, 0.6), 0.4);
armR("h11", -150, at(11, 1.2)); brows("h11", -12, at(11, 1.2)); mouth("h11", "mG", at(11, 1.3));
// 12 new mothers
scene(12, "h12", "mO"); bob("w12", 12, 5); mouth("w12", "mS", S[11]); brows("h12", -18, at(12, 0.4));
pop("#g12 .baby", at(12, 0.4), 0.4); pop("#g12 .plus", at(12, 1.3), 0.4);
pop("#g12 .x1", at(12, 1.7), 0.35); pop("#g12 .x2", at(12, 2.0), 0.35);
tl.fromTo("#g12 .heart", { scale: 0, y: 40, transformOrigin: "50% 50%" }, { scale: 1, y: -30, transformOrigin: "50% 50%", duration: 0.6, stagger: 0.3, ease: "back.out(2)" }, at(12, 2.6));
mouth("h12", "mG", at(12, 3.2)); shake("h12", at(12, 3.3));
// 13 pull back
cam(13, [379, 987, 1.8], [540, 960, 1.0], "power2.inOut");
// 14 phone vs clay
scene(14, "h14", "mF"); brows("h14", 8, at(14, 0.2));
pop("#g14 .phone", at(14, 0.1), 0.35);
hide("#g14 .phone", at(14, 1.5));
tl.to("#g14 .poof", { opacity: 1, duration: 0.05 }, at(14, 1.6));
tl.fromTo("#g14 .poof", { scale: 0.3, transformOrigin: "50% 50%" }, { scale: 1.3, transformOrigin: "50% 50%", duration: 0.5, ease: "power2.out" }, at(14, 1.6));
tl.to("#g14 .poof", { opacity: 0, duration: 0.3 }, at(14, 2.1));
armL("h14", 70, at(14, 1.6)); armR("h14", -70, at(14, 1.6));
pop("#g14 .keep", at(14, 2.4), 0.45); sparkle("#g14 .spk", at(14, 2.7));
mouth("h14", "mG", at(14, 2.6)); brows("h14", -12, at(14, 2.6)); armL("h14", 0, at(14, 2.8)); armR("h14", -100, at(14, 2.8));
// 15 CTA
scene(15, "h15", "mG"); brows("h15", -12, at(15, 0.2)); armR("h15", -125, at(15, 0.2));
pop("#g15 .bubble", at(15, 0.5), 0.45);
tl.fromTo("#g15 .dot", { y: 0 }, { y: -26, duration: 0.25, yoyo: true, repeat: 7, stagger: 0.12, ease: "sine.inOut" }, at(15, 1.0));

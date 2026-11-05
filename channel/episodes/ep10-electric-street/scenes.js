// Part 5: The Street Named After a Light Bulb (Amin al-Zarb, Tehran)
const MERCHANT = (id, x, y, s) => PERSON(id, x, y, s, { robe: "long", hat: "qajar", body: "#1b2a4a", beard: "#1b1b1b" });
const ELDER = (id, x, y, s) => PERSON(id, x, y, s, { body: "#7a4a24", hat: "cap", beard: "#f2f2f2" });
const TREE = (x, y, s = 1, cls = "icon") => g(x, y, s, cls, `<rect x="-16" y="-20" width="32" height="110" fill="#7a4a24" stroke="${K}" stroke-width="6"/><circle cx="0" cy="-70" r="80" fill="#6aa84f" stroke="${K}" stroke-width="7"/>`);
const HOUSE = (x, y, s = 1, cls = "icon") => g(x, y, s, cls, `<rect x="-90" y="-60" width="180" height="140" fill="#efdcb5" stroke="${K}" stroke-width="7"/><path d="M-110,-60 L0,-150 L110,-60 Z" fill="#b5562e" stroke="${K}" stroke-width="7" stroke-linejoin="round"/><path d="M-25,80 L-25,10 Q0,-25 25,10 L25,80 Z" fill="#6b5a44" stroke="${K}" stroke-width="6"/>`);
const CART = (x, y, s = 1, cls = "cart") => g(x, y, s, cls, `<rect x="-230" y="-30" width="460" height="40" fill="#a0632f" stroke="${K}" stroke-width="8"/><circle cx="-150" cy="40" r="50" fill="#fff" stroke="${K}" stroke-width="9"/><circle cx="150" cy="40" r="50" fill="#fff" stroke="${K}" stroke-width="9"/>`);

put("g1", SIGNPOST(700, 1700, 1.1, "sign", "?", "#fffaf0", "#111", 90) + BULB(700, 820, 0.8, "b1", false) + HERO("h1", 270, 1800, 0.8));
put("g2", LANTERN(300, 1000, 1.3) + LANTERN(780, 1150, 1.0) + MOON(820, 700, 1.5) + HERO("h2", 480, 1840, 0.65));
put("g3", MERCHANT("m3", 700, 1760, 0.95) + SACK(330, 1640, 1.1, "sk") + SACK(200, 1660, 0.9, "sk") + COIN(270, 1460, 1.1, "sk"));
put("g4", TREE(240, 760, 0.9) + HOUSE(480, 780, 0.9) + CROSS(360, 760, 1.2, "x4") + GENERATOR(700, 1560, 1.1) + MERCHANT("m4", 230, 1800, 0.72));
put("g5", ARROW(160, 800, 920, 800, "a5") + CART(430, 1600, 1.0) + GENERATOR(450, 1560, 1.0) + HERO("h5", 930, 1880, 0.45));
put("g6", CALENDAR(260, 820, 1.0, "1904", "cal") + BULB(760, 900, 1.2, "b6", false) + GENERATOR(560, 1650, 0.95));
put("g7", BULB(560, 860, 1.4, "b7") + LANTERN(250, 1300, 0.9) + CROSS(250, 1270, 0.9, "x7") + HERO("h7", 640, 1860, 0.65));
put("g8", SHOP(200, 1380, 0.95, "s8", true) + SHOP(520, 1380, 0.95, "s8", true) + HOUSE(840, 1340, 1.2, "s8") + BULB(200, 1000, 0.5, "bb") + BULB(520, 1000, 0.5, "bb") + BULB(840, 1060, 0.5, "bb") + HERO("h8", 540, 1880, 0.35));
put("g9", SIGNPOST(650, 1700, 1.15, "sign", "CHERAGH BARGH", "#fffaf0", "#111", 50) + BULB(650, 830, 0.6, "b9") + HERO("h9", 220, 1800, 0.75) + SPARK(420, 900, 0.8) + SPARK(900, 760, 0.7));
put("g10", BULB(820, 760, 0.7, "b10") + HERO("h10", 480, 2200, 1.6));
put("g11", SIGNPOST(330, 1700, 0.8, "old", "CHERAGH BARGH", "#fffaf0", "#111", 50) + SIGNPOST(760, 1700, 0.8, "new", "AMIR KABIR ST.", "#2f5fa8", "#fff", 50) + ARROW(470, 1080, 640, 1080, "a11"));
put("g12", ELDER("e12", 700, 1760, 0.9) + LABEL(700, 760, "“Cheragh Bargh!”", "lab12", 62, "#111", "#fff") + HERO("h12", 250, 1760, 0.8));
put("g13", COIN(120, 950, 1.4, "c13") + ARROW(200, 950, 320, 950, "a13") + BULB(430, 970, 0.75, "b13") + ARROW(540, 950, 680, 950, "a13") + SKYLINE(870, 1100, 0.5, "sky") + HERO("h13", 540, 1860, 0.6));
put("g14", SWITCH(330, 1150, 1.3) + BULB(700, 880, 1.0, "b14", false) + HERO("h14", 600, 1860, 0.7));
put("g15", BUBBLE(790, 690) + LABEL(790, 690, "?", "s15", 90, "#111", "#ffd400") + HERO("h15", 470, 1800, 1.0));

const lightUp = (sel, t) => { tl.to(`${sel} .glass`, { fill: "#ffe680", duration: 0.15 }, t); tl.fromTo(`${sel} .rays`, { opacity: 0, scale: 0.6, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, transformOrigin: "50% 50%", duration: 0.35, ease: "back.out(2)" }, t); };

// 1 hook
scene(1, "h1", "mO"); brows("h1", -16, 0.3); armR("h1", -110, 0.3);
pop("#g1 .sign", 0.2, 0.4); pop("#g1 .b1", 1.2, 0.35); lightUp("#g1 .b1", 1.7);
// 2 dark nights
scene(2, "h2", "mF"); brows("h2", 10, at(2, 0.2)); popAll("#g2 .lantern", at(2, 0.3), 0.4); pop("#g2 .wx", at(2, 0.2));
tl.to("#g2 .flame", { scaleY: 0.8, transformOrigin: "50% 100%", duration: 0.15, yoyo: true, repeat: 15 }, at(2, 0.6));
// 3 the merchant
enter(3); bob("m3", 3, 6); mouth("m3", "mS", S[2]); popAll("#g3 .sk", at(3, 0.5), 0.3); armL("m3", 40, at(3, 0.6)); blink("m3", at(3, 2.0));
// 4 gardens? no, a generator
enter(4); mouth("m4", "mG", S[3]); popAll("#g4 .icon", at(4, 0.2), 0.3); pop("#g4 .x4", at(4, 1.7), 0.3);
tl.fromTo("#g4 .gen", { y: 300, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "back.out(1.6)" }, at(4, 2.0));
armR("m4", -80, at(4, 2.2)); hop("m4", at(4, 2.4), 2, 30);
// 5 from abroad
scene(5, "h5", "mO"); brows("h5", -16, at(5, 0.4));
tl.fromTo("#g5 .a5", { scaleX: 0, svgOrigin: "160 800" }, { scaleX: 1, svgOrigin: "160 800", duration: 0.8, ease: "power2.out" }, at(5, 0.2));
tl.fromTo(["#g5 .cart", "#g5 .gen"], { x: -900 }, { x: 0, duration: 1.4, ease: "power2.out" }, at(5, 0.4));
// 6 lights on, ~1904
enter(6); pop("#g6 .cal", at(6, 0.1), 0.4); spin("#g6 .fly", at(6, 0.4), dur(6) - 0.4, 4); lightUp("#g6 .b6", at(6, 1.4));
// 7 no oil, no wick
scene(7, "h7", "mO"); brows("h7", -18, at(7, 0.2)); armL("h7", 140, at(7, 0.3)); armR("h7", -140, at(7, 0.3));
pop("#g7 .b7", at(7, 0.1), 0.4); pop("#g7 .lantern", at(7, 1.0), 0.3); pop("#g7 .x7", at(7, 1.6), 0.3);
// 8 shops glow
scene(8, "h8", "mG"); popAll("#g8 .s8", at(8, 0.1), 0.25, 0.3); popAll("#g8 .bb", at(8, 0.9), 0.4, 0.3);
// 9 Cheragh Bargh
scene(9, "h9", "mG"); armR("h9", -100, at(9, 0.3)); armL("h9", 100, at(9, 0.3));
pop("#g9 .sign", at(9, 0.2), 0.45); pop("#g9 .b9", at(9, 1.2), 0.3); sparkle("#g9 .spk", at(9, 1.5));
// 10 deadpan
enter(10); mouth("h10", "mF", S[9]); brows("h10", -10, at(10, 0.1)); armR("h10", -150, at(10, 0.6), 0.5); blink("h10", at(10, 1.4)); pop("#g10 .b10", at(10, 0.2), 0.3);
// 11 renamed
enter(11); pop("#g11 .old", at(11, 0.1), 0.4); pop("#g11 .a11", at(11, 0.9), 0.3); pop("#g11 .new", at(11, 1.3), 0.45);
tl.to("#g11 .old", { opacity: 0.45, duration: 0.5 }, at(11, 1.6));
// 12 old Tehranis still say it
scene(12, "h12", "mG"); bob("e12", 12, 5); mouth("e12", "mG", S[11]); pop("#g12 .lab12", at(12, 0.8), 0.4);
armR("e12", -120, at(12, 0.7)); shake("h12", at(12, 1.8), 3);
// 13 one merchant lit a city
scene(13, "h13"); pop("#g13 .c13", at(13, 0.2)); pop("#g13 .a13", at(13, 0.6), 0.3); pop("#g13 .b13", at(13, 0.9)); pop("#g13 .sky", at(13, 1.4), 0.4);
tl.to("#g13 .win", { fill: "#ffe680", duration: 0.1, stagger: 0.05 }, at(13, 1.9)); mouth("h13", "mG", at(13, 1.9));
// 14 flip the switch
scene(14, "h14"); armL("h14", 70, at(14, 0.4)); pop("#g14 .switch", at(14, 0.1), 0.4); pop("#g14 .b14", at(14, 0.3), 0.35);
tl.to("#g14 .toggle", { y: -60, duration: 0.15 }, at(14, 1.2)); lightUp("#g14 .b14", at(14, 1.3)); mouth("h14", "mG", at(14, 1.4)); blink("h14", at(14, 2.0));
// 15 CTA
scene(15, "h15", "mG"); brows("h15", -12, at(15, 0.2)); armR("h15", -125, at(15, 0.2));
pop("#g15 .bubble", at(15, 0.5), 0.45); hide("#g15 .dot", at(15, 0.9), 0.1); pop("#g15 .s15", at(15, 1.0), 0.4);

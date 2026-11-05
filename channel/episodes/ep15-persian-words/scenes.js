// Part 10: Your Wallet Speaks Persian (bazaar, caravan, check, cheque)
const CLERK = (id, x, y, s) => PERSON(id, x, y, s, { robe: "long", hat: "cap", body: "#2f5fa8", beard: "#6b4a24" });
const FARSI = (x, y, txt, cls = "fa", size = 96) => `<g transform="translate(${x},${y})"><g class="${cls}"><text x="0" y="0" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="${size}" fill="#2a9d8f" stroke="#fff" stroke-width="10" paint-order="stroke">${txt}</text></g></g>`;

put("g1", WALLET(540, 1050, 1.4) + BUBBLE(780, 680, "bub1") + HERO("h1", 230, 1860, 0.6));
put("g2", BIGTEXT(540, 820, "BAZAAR", "w2", 150) + ARROW(540, 900, 540, 1040, "a2") + FARSI(540, 1150, "bāzār", "fa2", 110) + SHOP(300, 1650, 0.8, "s2", true) + SHOP(780, 1650, 0.8, "s2", true));
put("g3", DOMEBLD(540, 1400, 1.0, "dome") + SHOP(170, 1450, 0.7, "s3", true) + SHOP(910, 1450, 0.7, "s3", true) + ARROW(270, 1100, 120, 900, "a3") + ARROW(810, 1100, 960, 900, "a3") + HERO("h3", 540, 1880, 0.4));
put("g4", BIGTEXT(540, 820, "CARAVAN", "w4", 140) + ARROW(540, 900, 540, 1040, "a4") + FARSI(540, 1150, "kārvān", "fa4", 110) + CAMEL(540, 1760, 0.65, "cm4"));
put("g5", CAMEL(-150, 1700, 0.6, "c1") + CAMEL(-500, 1700, 0.6, "c2") + PERSON("m5", -820, 1700, 0.55, { robe: "long", hat: "qajar", body: "#b5562e", beard: "#3a2a1a" }) + SUN(880, 700, 1.0));
put("g6", BIGTEXT(540, 900, "CHECK", "w6", 190) + CHEQUE(540, 1250, 0.9) + HERO("h6", 860, 1880, 0.45));
put("g7", CHECKER(540, 1150, 1.4) + CHESSKING(540, 1260, 0.9, "king") + HERO("h7", 160, 1880, 0.4));
put("g8", CHESSKING(330, 1500, 1.2, "king") + LABEL(720, 900, "SHAH = KING", "lab8", 70, "#111", "#ffd400") + PERSON("p8", 800, 1780, 0.6, { robe: "long", hat: "crown", body: "#6b3fa0", beard: "#1b1b1b" }));
put("g9", FARSI(540, 820, "shāh māt", "fa9", 120) + ARROW(540, 900, 540, 1040, "a9") + BIGTEXT(540, 1170, "CHECKMATE", "w9", 120) + CHESSKING(540, 1700, 0.8, "king"));
put("g10", CHECKER(600, 1100, 1.4, "cloth", 8) + COIN(460, 1010, 1.0, "cn") + COIN(600, 1130, 1.0, "cn") + COIN(740, 1010, 1.0, "cn") + CLERK("cl10", 140, 1840, 0.5));
put("g11", BIGTEXT(540, 820, "EXCHEQUER", "w11", 120) + CHECKER(540, 1250, 0.9, "cloth", 6) + CLERK("cl11", 880, 1820, 0.5));
put("g12", BIGTEXT(540, 820, "CHEQUE", "w12", 160) + CHEQUE(540, 1200, 1.2) + HERO("h12", 860, 1880, 0.4));
put("g13", CHEQUE(560, 950, 0.9) + LABEL(720, 1250, "“SHAH!”", "lab13", 90, "#111", "#ffd400") + HERO("h13", 280, 1820, 0.75));
put("g14", BIGTEXT(540, 800, "BAZAAR", "w14", 110) + BIGTEXT(540, 960, "CARAVAN", "w14", 110) + BIGTEXT(540, 1120, "CHECK", "w14", 110) + HERO("h14", 540, 1860, 0.5));
put("g15", BUBBLE(790, 690) + LABEL(790, 690, "?", "q15", 90, "#111", "#ffd400") + HERO("h15", 470, 1800, 1.0));

const word = (sel, t) => tl.fromTo(sel, { scale: 0, rotation: -8, transformOrigin: "50% 50%" }, { scale: 1, rotation: 0, transformOrigin: "50% 50%", duration: 0.45, ease: "back.out(2.5)" }, t);
const walk = (sel, t, x, d) => { tl.fromTo(sel, { x: 0 }, { x, duration: d, ease: "none" }, t); tl.to(`${sel} .legs`, { scaleY: 0.9, svgOrigin: "0 -150", duration: 0.22, yoyo: true, repeat: Math.floor(d / 0.22), ease: "sine.inOut" }, t); };

// 1 hook
scene(1, "h1", "mO"); brows("h1", -16, 0.3); pop("#g1 .wallet", 0.2, 0.45); pop("#g1 .bub1", 1.2, 0.4);
tl.to("#g1 .wallet", { rotation: 4, transformOrigin: "50% 50%", duration: 0.12, yoyo: true, repeat: 7 }, 1.6);
// 2 bazaar
enter(2); word("#g2 .w2", at(2, 0.1)); pop("#g2 .a2", at(2, 0.9), 0.3); word("#g2 .fa2", at(2, 1.2)); popAll("#g2 .s2", at(2, 1.8), 0.2);
// 3 markets at the centre
scene(3, "h3"); pop("#g3 .dome", at(3, 0.1), 0.4); popAll("#g3 .s3", at(3, 0.5), 0.2); popAll("#g3 .a3", at(3, 1.4), 0.2, 0.3);
// 4 caravan
enter(4); word("#g4 .w4", at(4, 0.1)); pop("#g4 .a4", at(4, 0.9), 0.3); word("#g4 .fa4", at(4, 1.2)); pop("#g4 .cm4", at(4, 1.9), 0.35);
// 5 crossing deserts
enter(5); pop("#g5 .wx", at(5, 0.1)); walk("#g5 .c1", at(5, 0.1), 1300, dur(5) - 0.2); walk("#g5 .c2", at(5, 0.1), 1300, dur(5) - 0.2);
tl.to("#m5", { x: 1300, duration: dur(5) - 0.2, ease: "none" }, at(5, 0.1));
// 6 check
scene(6, "h6", "mO"); word("#g6 .w6", at(6, 0.1)); pop("#g6 .cheque", at(6, 1.0), 0.4); brows("h6", -16, at(6, 0.3));
// 7 from chess
scene(7, "h7"); pop("#g7 .checker", at(7, 0.1), 0.4); tl.fromTo("#g7 .king", { y: -300, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "bounce.out" }, at(7, 0.8)); armR("h7", -110, at(7, 0.9));
// 8 shah = king
enter(8); bob("p8", 8, 5); mouth("p8", "mS", S[7]); pop("#g8 .king", at(8, 0.1), 0.4); pop("#g8 .lab8", at(8, 0.8), 0.4);
mouth("p8", "mO", at(8, 2.4)); brows("p8", -18, at(8, 2.4)); shake("p8", at(8, 2.5), 2);
// 9 shah mat -> checkmate
enter(9); word("#g9 .fa9", at(9, 0.1)); pop("#g9 .a9", at(9, 1.6), 0.3); word("#g9 .w9", at(9, 1.9)); pop("#g9 .king", at(9, 0.4), 0.3);
tl.to("#g9 .king", { rotation: 80, svgOrigin: "0 0", duration: 0.6, ease: "bounce.out" }, at(9, 2.5));
// 10 checkered cloth
enter(10); bob("cl10", 10, 5); mouth("cl10", "mS", S[9]); pop("#g10 .cloth", at(10, 0.1), 0.45);
tl.fromTo("#g10 .cn", { y: -400, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.3, ease: "bounce.out" }, at(10, 0.8)); armR("cl10", -80, at(10, 0.8));
// 11 the Exchequer
enter(11); mouth("cl11", "mG", S[10]); word("#g11 .w11", at(11, 0.1)); pop("#g11 .cloth", at(11, 0.8), 0.4);
// 12 cheque
scene(12, "h12", "mG"); word("#g12 .w12", at(12, 0.1)); pop("#g12 .cheque", at(12, 0.8), 0.4); armR("h12", -120, at(12, 0.8));
// 13 shouting king
scene(13, "h13", "mG"); pop("#g13 .cheque", at(13, 0.1), 0.4); armR("h13", -60, at(13, 0.3)); pop("#g13 .lab13", at(13, 1.8), 0.4); hop("h13", at(13, 1.9), 2);
// 14 recap
scene(14, "h14", "mG"); tl.fromTo("#g14 .w14", { x: -900 }, { x: 0, duration: 0.5, stagger: 0.5, ease: "back.out(1.6)" }, at(14, 0.2)); armL("h14", 150, at(14, 1.6)); armR("h14", -150, at(14, 1.6));
// 15 CTA
scene(15, "h15", "mG"); brows("h15", -12, at(15, 0.2)); armR("h15", -125, at(15, 0.2));
pop("#g15 .bubble", at(15, 0.5), 0.45); hide("#g15 .dot", at(15, 0.9), 0.1); pop("#g15 .q15", at(15, 1.0), 0.4);

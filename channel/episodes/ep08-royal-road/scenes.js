// Part 3: Persia Invented Express Delivery (the Royal Road)
const PARCEL = (x, y, s = 1, cls = "parcel") => g(x, y, s, cls, `<rect x="-90" y="-80" width="180" height="150" rx="8" fill="#c99a5b" stroke="${K}" stroke-width="8"/><path d="M-90,-30 L90,-30 M0,-80 L0,70" stroke="#8a6232" stroke-width="10"/>`);
const ROAD = (cls) => `<path class="${cls}" d="M120,1500 C300,1300 220,1100 460,1050 C700,1000 640,820 900,760" fill="none" stroke="#c9ae7c" stroke-width="44" stroke-linecap="round" stroke-dasharray="1400" stroke-dashoffset="1400"/>
  <path class="${cls}d" d="M120,1500 C300,1300 220,1100 460,1050 C700,1000 640,820 900,760" fill="none" stroke="#fff" stroke-width="8" stroke-dasharray="20 26" opacity="0"/>`;
const HISTORIAN = (id, x, y, s) => PERSON(id, x, y, s, { robe: "long", hat: "none", body: "#f4f0e6", beard: "#9aa6b5" });

put("g1", POSTOFFICE(540, 1300, 1.15) + HERO("h1", 860, 1860, 0.5));
put("g2", ROAD("rd") + STATION(900, 760, 0.8, "end") + STATION(120, 1500, 0.8, "end") + HERO("h2", 760, 1860, 0.55));
put("g3", ARROW2(1100, "arr", 230, 850) + LABEL(170, 960, "SARDIS", "lb", 52) + LABEL(910, 960, "SUSA", "lb", 52) + LABEL(540, 1250, "~2,700 km", "km", 80, "#111", "#ffd400") + HERO("h3", 540, 1860, 0.5));
put("g4", [160, 330, 500, 670, 840].map((x, k) => STATION(x + 40, 1000 + (k % 2) * 90, 0.8, "st")).join("") + LABEL(540, 1350, "100+ STATIONS", "lab4", 70, "#111", "#ffd400") + HERO("h4", 540, 1880, 0.45));
put("g5", RIDER(-200, 1500, 0.8, "r1") + RIDER(1300, 1500, 0.8, "r2", "#e0404a") + ENVELOPE(540, 900, 1.0));
put("g6", SCROLL(330, 1100, 0.7, "scroll") + SACK(760, 1150, 1.3, "tax") + COIN(860, 980, 1.0, "tc") + HERO("h6", 540, 1860, 0.55) + BANG(560, 850, 1.1));
put("g7", CALENDAR(780, 800, 1.0, "90 days", "cal") + HERO("h7", 300, 1780, 0.8));
put("g8", CALENDAR(780, 800, 1.0, "~7 days", "cal") + RIDER(-300, 1700, 0.9, "r8") + SPARK(560, 700, 0.9) + SPARK(980, 1000, 0.7));
put("g9", HISTORIAN("hd9", 330, 1760, 0.9) + SCROLL(700, 1150, 0.65, "scroll") + HERO("h9", 860, 1820, 0.55));
put("g10", SNOW(180, 700, 1.0) + RAIN(420, 700, 1.0) + SUN(660, 700, 1.0) + MOON(900, 700, 1.4) + RIDER(-300, 1650, 0.9, "r10"));
put("g11", POSTOFFICE(540, 1300, 1.15) + LABEL(540, 1520, "NEW YORK", "lab11", 70, "#111", "#ffd400") + HERO("h11", 860, 1880, 0.45));
put("g12", PERSON("c12", 780, 1760, 0.85, { body: "#3f6fd6", hat: "cap" }) + PARCEL(780, 1380, 0.8) + LABEL(780, 760, "LATE AGAIN", "lab12", 56, "#fff", "#e0404a") + HERO("h12", 280, 1760, 0.85));
put("g13", SACK(220, 1100, 1.2, "i13") + COIN(540, 1060, 1.8, "i13") + ENVELOPE(860, 1080, 1.1, "i13") + HERO("h13", 540, 1860, 0.55));
put("g14", PARCEL(540, 820, 1.0) + LABEL(540, 620, "EXPRESS", "lab14", 76, "#111", "#ffd400") + RIDER(-300, 1720, 0.95, "r14"));
put("g15", BUBBLE(790, 690) + PARCEL(790, 690, 0.7, "p15") + HERO("h15", 470, 1800, 1.0));

const gallop = (sel, t, x, d) => { tl.fromTo(sel, { x: 0 }, { x, duration: d, ease: "none" }, t); tl.to(`${sel} .legs`, { scaleY: 0.85, svgOrigin: "0 -120", duration: 0.12, yoyo: true, repeat: Math.floor(d / 0.12), ease: "sine.inOut" }, t); };

// 1 New York motto
scene(1, "h1", "mO"); brows("h1", -16, 0.3);
tl.fromTo("#g1 .po", { y: 120, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "back.out(1.6)" }, 0.15);
tl.fromTo("#g1 .inscr rect", { opacity: 0 }, { opacity: 1, duration: 0.1, stagger: 0.15 }, 0.9);
tl.to("#g1 .inscr rect", { fill: "#ffd400", duration: 0.2, stagger: 0.1 }, 2.4);
// 2 the Royal Road draws itself
scene(2, "h2"); armR("h2", -120, at(2, 0.3));
popAll("#g2 .end", at(2, 0.2), 0.3);
tl.to("#g2 .rd", { strokeDashoffset: 0, duration: 2.0, ease: "power2.inOut" }, at(2, 0.5));
tl.to("#g2 .rdd", { opacity: 1, duration: 0.3 }, at(2, 2.4));
// 3 distance
scene(3, "h3"); armL("h3", 95, at(3, 0.2)); armR("h3", -95, at(3, 0.2));
tl.fromTo("#g3 .arr", { scaleX: 0, svgOrigin: "540 1100" }, { scaleX: 1, svgOrigin: "540 1100", duration: 0.7, ease: "power3.out" }, at(3, 0.2));
popAll("#g3 .lb", at(3, 0.8), 0.3); pop("#g3 .km", at(3, 1.6), 0.4); mouth("h3", "mG", at(3, 1.6));
// 4 stations
scene(4, "h4"); popAll("#g4 .st", at(4, 0.2), 0.25); pop("#g4 .lab4", at(4, 1.6), 0.4);
// 5 relay hand-over
enter(5);
gallop("#g5 .r1", at(5, 0.1), 620, 1.4);
pop("#g5 .env", at(5, 1.3), 0.3); tl.to("#g5 .env", { x: 120, y: 200, duration: 0.5, ease: "power1.inOut" }, at(5, 1.7));
gallop("#g5 .r2", at(5, 1.6), -1700, 2.0);
tl.to("#g5 .env", { x: -900, duration: 1.6, ease: "power1.in" }, at(5, 2.2));
// 6 taxes and royal orders
scene(6, "h6", "mG"); pop("#g6 .scroll", at(6, 0.2)); pop("#g6 .tax", at(6, 0.7)); pop("#g6 .tc", at(6, 1.0), 0.3); pop("#g6 .bang", at(6, 1.4), 0.3);
armL("h6", 120, at(6, 0.2)); armR("h6", -120, at(6, 0.7));
// 7 three months on foot
scene(7, "h7", "mF"); brows("h7", 10, at(7, 0.2)); pop("#g7 .cal", at(7, 0.2), 0.4);
tl.to("#h7 .rig", { rotation: 4, svgOrigin: "0 0", duration: 0.5, yoyo: true, repeat: 5, ease: "sine.inOut" }, at(7, 0.3));
// 8 about a week
enter(8); pop("#g8 .cal", at(8, 0.2), 0.4); gallop("#g8 .r8", at(8, 0.5), 1700, 1.6); sparkle("#g8 .spk", at(8, 1.2));
// 9 Herodotus
scene(9, "h9"); bob("hd9", 9, 5); mouth("hd9", "mO", S[8]); brows("hd9", -14, at(9, 0.3));
pop("#g9 .scroll", at(9, 0.6), 0.4); armR("hd9", -70, at(9, 0.6)); mouth("hd9", "mS", at(9, 1.6)); mouth("h9", "mG", at(9, 1.8));
// 10 neither snow nor rain
enter(10); popAll("#g10 .wx", at(10, 0.2), 0.45, 0.35); gallop("#g10 .r10", at(10, 0.3), 1700, dur(10) - 0.4);
// 11 carved in New York
scene(11, "h11", "mG");
tl.fromTo("#g11 .inscr rect", { fill: "#8f887d" }, { fill: "#ffd400", duration: 0.15, stagger: 0.15 }, at(11, 0.6));
pop("#g11 .lab11", at(11, 1.8), 0.4); armR("h11", -120, at(11, 0.4));
// 12 late again
scene(12, "h12", "mF"); bob("c12", 12, 5); mouth("c12", "mS", S[11]);
pop("#g12 .parcel", at(12, 0.4), 0.35); pop("#g12 .lab12", at(12, 0.8), 0.35);
brows("h12", 10, at(12, 0.3)); armL("h12", 20, at(12, 0.3)); armR("h12", -20, at(12, 0.3)); mouth("h12", "mG", at(12, 2.4)); blink("h12", at(12, 2.6));
// 13 fast trade, taxes, news
scene(13, "h13"); popAll("#g13 .i13", at(13, 0.4), 0.6); armR("h13", -110, at(13, 0.4));
tl.to("#g13 .i13", { y: -30, duration: 0.2, yoyo: true, repeat: 3, stagger: 0.15 }, at(13, 2.2));
// 14 express shipping
enter(14); pop("#g14 .parcel", at(14, 0.2), 0.4); pop("#g14 .lab14", at(14, 0.5), 0.4); gallop("#g14 .r14", at(14, 0.8), 1700, 1.8);
// 15 CTA
scene(15, "h15", "mG"); brows("h15", -12, at(15, 0.2)); armR("h15", -125, at(15, 0.2));
pop("#g15 .bubble", at(15, 0.5), 0.45); hide("#g15 .dot", at(15, 0.9), 0.1); pop("#g15 .p15", at(15, 1.0), 0.4);

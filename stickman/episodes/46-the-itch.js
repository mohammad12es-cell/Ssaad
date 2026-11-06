EPISODE({ title: "The Itch", seed: 503, music: "happy" }, (E) => {
  E.pageNo(46).fig("inky", 500);
  E.cap("An itch… on my back 😖", 2.0).wait(0.4);
  E.to("#inky-upper", { keyframes: { rotation: [0, -8, 8, -8, 8, 0] }, transformOrigin: "50% 100%" }, 1.0).arms("inky", 120, -120, 0.2).wait(1.2).arms("inky", 0, 0);
  E.face("inky", "smile").draw("inky", { s: [[[0, 0], [0, -120]], PROPS._ring(0, -135, 16, 16, 10)], w: 7 }, 570, 1080, { id: "sc1", attach: "inky", s: 0.8 }).wait(0.3);
  E.cap("Back scratcher… too short 😩").face("inky", "sad").wait(1.6);
  E.hide("#sc1").draw("inky", { s: [[[0, 0], [0, -420]], PROPS._ring(0, -435, 16, 16, 10)], w: 7 }, 570, 1080, { id: "sc2", attach: "inky", s: 0.9 }).wait(0.3);
  E.cap("…too LONG 😑").to("#sc2", { rotation: -30, svgOrigin: "70 -170" }, 0.4).wait(1.6);
  E.hide("#sc2").music("sneaky").monster("mon", 1950).walk("mon", 760, 1.2).wait(1.2);
  E.face("inky", "o").arm("mon", "L", 30, 0.2).wait(0.3);
  E.to("#mon-armL", { keyframes: { rotation: [30, 50, 30, 50, 30] }, transformOrigin: "100% 0%" }, 1.0).sfx("rub", 1.0, 0.3).wait(0.6);
  E.music("dreamy").face("inky", "smile").cap("Ahhh… perfect 😌").hearts(500, 830, 2).wait(1.8);
  E.grin("mon").cap("Monster claws: useful 🤝", 2.6).wait(2.6).end(0.3);
});

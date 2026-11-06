EPISODE({ title: "Tickle War", seed: 459, music: "happy" }, (E) => {
  E.pageNo(42).fig("inky", 320).monster("mon", 1050);
  E.cap("Grumpy monster 😠", 1.6).wait(1.2);
  const feather = { s: [[[0, 0], [60, -120]], [[10, -20], [40, -40], [55, -90], [70, -130], [60, -80], [45, -50], [10, -20]]], f: [{ p: [[10, -20], [40, -40], [55, -90], [70, -130], [60, -80], [45, -50]], c: "#ffffff" }], w: 6 };
  E.face("inky", "smile").draw("inky", feather, 420, 1080, { id: "fe" }).wait(0.2);
  E.walk("inky", 760, 0.8).to("#fe", { x: 340 }, 0.8).wait(0.8);
  E.to("#fe", { keyframes: { rotation: [0, 20, -20, 20, -20, 0] }, svgOrigin: "760 1080" }, 0.8).sfx("blip", 1400, 0.2).wait(0.2);
  E.grin("mon").laugh("mon", 1.4).quake(8, 0.6).wait(1.0).cap("Ha HA HA 🤣").laugh("mon", 1.0).wait(1.4);
  E.walk("inky", 320, 0.6).to("#fe", { x: 0 }, 0.6).wait(0.8);
  E.music("sneaky").grin("mon", false).draw("mon", feather, 930, 1100, { id: "fe2", s: 2.6, flip: true, speed: 2600 }).wait(0.2);
  E.cap("…revenge 😈").face("inky", "o").wait(1.0);
  E.to("#fe2", { x: -400 }, 0.5).wait(0.5).to("#fe2", { keyframes: { rotation: [0, -15, 15, -15, 15, 0] }, svgOrigin: "530 1100" }, 0.8).sfx("blip", 1300, 0.2);
  E.to("#inky", { keyframes: { rotation: [0, -10, 10, -10, 10, -10, 0] }, transformOrigin: "50% 100%" }, 1.0).face("inky", "smile").sfx("ha", 0.4, 260).wait(1.2);
  E.music("bright").cap("Tickle war: draw 🪶", 2.6).hop("#inky", 40, 2).hop("#mon", 30, 2).wait(2.6).end(0.3);
});

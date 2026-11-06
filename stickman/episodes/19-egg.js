EPISODE({ title: "The Egg", seed: 206, music: "happy" }, (E) => {
  E.pageNo(19).fig("inky", 360);
  E.cap("Breakfast 🍳", 1.8).wait(0.2);
  E.draw("inky", "pan", 700, 1240, { id: "pan" }).draw("inky", "egg", 700, 1236, { id: "egg", s: 0.9 }).wait(0.5);
  E.face("inky", "smile").wait(0.6);
  E.to("#egg", { keyframes: { rotation: [0, -10, 10, -10, 10, 0] }, transformOrigin: "50% 100%" }, 0.6).sfx("blip", 800, 0.25).wait(0.9);
  E.cap("…it moved?").face("inky", "o").wait(1.0);
  E.to("#egg", { keyframes: { rotation: [0, -14, 14, -14, 14, 0] }, transformOrigin: "50% 100%" }, 0.6).sfx("blip", 900, 0.25).wait(0.7);
  const chick = { s: [PROPS._ring(0, -45, 42, 42, 18), [[30, -55], [55, -48], [30, -40]]], f: [{ p: PROPS._ring(0, -45, 42, 42, 18), c: "#ffe45c" }, { p: [[30, -55], [55, -48], [30, -40]], c: "#ff9f1c" }] };
  E.hide("#egg", 0.05).puff(700, 1180, 0.8).prop(chick, 700, 1236, { id: "chick" }).sfx("pop", 1200, 0.4);
  E.prop({ s: [[[12, -62], [12, -58]]], w: 10 }, 700, 1236, { id: "eye", layer: "chick" });
  E.wait(0.2).popIn("#chick").cap("…not breakfast 🐣").wait(1.6);
  E.music("bright");
  for (let i = 0; i < 3; i++) { E.to("#chick", { x: `-=${80}`, scale: 1 + (i + 1) * 0.7, transformOrigin: "50% 100%" }, 0.3); E.sfx("blip", 1000 - i * 200, 0.3).wait(0.7); }
  E.cap("It's growing 😳").sweat("inky").wait(1.4);
  E.to("#chick", { x: -300, scale: 3.6 }, 0.4).wait(0.4).squash("#inky", 0.3, 0.6).sfx("thud", 120, 0.3, 0.6).wait(0.4);
  E.hearts(460, 800, 2).cap("MOM?! 🐥", 2.8).wait(2.8).end(0.3);
});

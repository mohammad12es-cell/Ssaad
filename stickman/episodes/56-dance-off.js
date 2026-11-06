EPISODE({ title: "Dance-Off", seed: 613, music: "bright" }, (E) => {
  E.pageNo(56).fig("inky", 300).monster("mon", 1150).dog("dog", 720, { layer: "back" });
  E.cap("Dance-off 🕺", 1.8).wait(1.0);
  const move = (id, l, r) => E.arms(id, l, r, 0.15);
  [[80, -80], [-60, 60], [120, 0], [0, -120], [80, -80], [0, 0]].forEach(([l, r]) => { move("inky", l, r); E.hop("#inky", 30, 1).wait(0.3); });
  E.cap("Inky's moves 😎").wait(1.0);
  E.grin("mon");
  for (let i = 0; i < 6; i++) { E.to("#mon", { rotation: i % 2 ? 12 : -12, transformOrigin: "50% 100%" }, 0.2).sfx("thud", 120, 0.15, 0.4).wait(0.3); }
  E.to("#mon", { rotation: 0 }, 0.2).to("#mon", { rotation: 360, transformOrigin: "50% 50%" }, 0.6).cap("Monster spin 🌀").wait(1.4);
  E.cap("Judge's score… 🐶").wait(0.8);
  const card = (x, txt) => { E.draw(null, { s: [PROPS._rect(-60, -50, 60, 50)], f: [{ p: PROPS._rect(-60, -50, 60, 50), c: "#ffffff" }], w: 6 }, x, 900, { speed: 3000 }); E.text(txt, x, 925, { size: 70 }); };
  card(640, "10"); card(800, "10");
  E.sfx("ding", 0.4).wag("dog", 10).cap("…a tie! 🤝").wait(1.2);
  E.hop("#inky", 50, 2).hop("#mon", 40, 2).hop("#dog", 30, 2).cap("Everybody dance 🎶", 2.6).wait(2.6).end(0.3);
});

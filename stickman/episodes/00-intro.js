EPISODE({ title: "Intro", seed: 3, music: "bright" }, (E) => {
  E.fig("inky", 260);
  E.face("inky", "smile").wait(0.4);
  // Inky draws the title card
  const card = { s: [PROPS._rect(-430, -150, 430, 150)], f: [{ p: PROPS._rect(-430, -150, 430, 150), c: "#ffe45c" }], w: 12 };
  E.draw("inky", card, 760, 640, { speed: 2600 });
  const t1 = E.text("MARGIN MAN", 760, 680, { size: 150 });
  E.fromTo(t1, { scale: 0.4, transformOrigin: "50% 50%" }, { scale: 1, ease: "back.out(2.5)" }, 0.3).sfx("pop", 700, 0.4).wait(0.6);
  const t2 = E.text("Lost in the Notebook", 760, 870, { size: 72 });
  E.sfx("ding", 0.3).wait(0.6);
  E.hop("#inky", 70, 2).arms("inky", 80, -80, 0.2).wait(0.9);
  E.arms("inky", 0, 0).wait(0.4);
  E.monster("mon", 1380, { hidden: true });
  E.show("#mon", 0.1).to("#mon", { x: 1250 }, 0.4).laugh("mon").wait(0.9);
  E.face("inky", "o").sweat("inky").wait(1.1);
  E.end(0.6);
});

EPISODE({ title: "The Truce", seed: 327, music: "chase" }, (E) => {
  E.pageNo(30).fig("inky", 300).monster("mon", 1200);
  E.cap("Ambush! 🏹", 1.8).wait(0.4);
  E.draw("inky", "shield", 400, 1150, { id: "sh", s: 0.9, attach: "inky" }).wait(0.2);
  [0, 1, 2].forEach((i) => {
    E.prop("arrow", 1000, 1000 + i * 40, { id: "a" + i, flip: true, s: 0.9 });
    E.to("#a" + i, { x: -560, ease: "none" }, 0.3).sfx("whoosh", 0.2, 0.3).wait(0.3).sfx("thud", 400, 0.1, 0.5).shake("#inky", 6, 0.15).wait(0.25);
  });
  E.cap("Blocked 🛡️").face("inky", "smile").wait(1.4);
  E.grin("mon").draw("mon", "cannon", 950, 1250, { id: "can", s: 2.2, flip: true }).wait(0.2);
  E.cap("…a cannon 😨").face("inky", "o").sweat("inky").wait(1.4);
  E.music("bright").face("inky", "worry");
  const flag = { s: [[[0, 0], [0, -260]], PROPS._rect(0, -260, 120, -180)], f: [{ p: PROPS._rect(0, -260, 120, -180), c: "#ffffff" }] };
  E.draw("inky", flag, 460, 1150, { id: "flag", s: 0.9, attach: "inky" }).wait(0.2);
  E.to("#flag", { keyframes: { rotation: [0, -8, 8, -8, 0] }, svgOrigin: "460 1150" }, 0.8).cap("Truce? 🏳️").wait(1.6);
  E.laugh("mon").wait(0.3).shake("#can", 8, 0.3).sfx("slam", 0.8).wait(0.3);
  ["#e63946", "#ffe45c", "#5aa9e6", "#5fcf6a", "#ff9fb2", "#ff9f1c", "#e63946", "#5aa9e6", "#ffe45c", "#5fcf6a"].forEach((c, i) => {
    const d = E.el("rect", { x: 820, y: 1150, width: 22, height: 14, fill: c, opacity: 0 }, E.$("fx"));
    E.set(d, { opacity: 1 }).to(d, { keyframes: [{ x: -200 - i * 50, y: -400 + (i % 3) * 60, rotation: 200, duration: 0.5, ease: "power2.out" }, { y: 100 - (i % 4) * 10, duration: 1.0, ease: "power1.in" }] }, 1.5);
  });
  E.sfx("pop", 1300, 0.4).sfx("ding", 0.3).cap("…PARTY CANNON 🎉").face("inky", "smile").wait(1.8);
  E.hop("#inky", 50, 2).hop("#mon", 40, 2).cap("Truce accepted 🤝", 2.6).wait(2.6).end(0.3);
});

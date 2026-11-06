EPISODE({ title: "Coffee Flood", seed: 393, music: "happy" }, (E) => {
  E.pageNo(36).fig("inky", 520);
  E.cap("A quiet page… ☕", 1.8).wait(1.4);
  // a giant mug tips over at the top edge
  const mug = { s: [PROPS._rect(-170, -260, 170, 0), PROPS._ring(210, -130, 60, 80, 16)], f: [{ p: PROPS._rect(-170, -260, 170, 0), c: "#ffffff" }], w: 14 };
  E.prop(mug, 1250, 200, { id: "mug", s: 1.3 });
  E.to("#mug", { y: 200 }, 0.5).wait(0.5).to("#mug", { rotation: 100, svgOrigin: "1030 460" }, 0.5).sfx("whoosh", 0.4, 0.4).wait(0.5);
  const flood = E.el("rect", { id: "flood", x: -1000, y: 1400, width: 3200, height: 1000, fill: "#7b4a2a", opacity: 0.92 }, E.$("front"));
  E.music("chase").cap("COFFEE SPILL 😱").to("#flood", { attr: { y: 1240 } }, 0.6).sfx("splat", 0.8).sfx("rumble", 1.6, 0.6).face("inky", "o").wait(0.8);
  E.to("#flood", { attr: { y: 1120 } }, 2.0).wait(0.3);
  E.face("inky", "worry").draw("inky", "boat", 520, 1250, { id: "boat", speed: 2800 }).wait(0.2);
  E.to(["#boat", "#inky"], { y: "-=170" }, 0.6).wait(0.4);
  E.cap("Boat ⛵").face("inky", "smile").wait(0.6);
  E.to(["#boat", "#inky"], { keyframes: { y: ["-=10", "+=20", "-=20", "+=20", "-=10"] } }, 2.4).to("#flood", { attr: { y: 1060 } }, 2.0).wait(1.2);
  E.music("bright").monster("mon", 1950, { y: 1150 }).to("#mon", { x: 1200 }, 1.0).sfx("splat", 0.4).wait(1.0);
  E.cap("…swimming monster 🏊").scared("mon").wait(1.4);
  E.face("inky", "smile").arm("inky", "R", -60, 0.2).wait(0.4).to("#mon", { x: 820, y: 1000 }, 0.5).wait(0.6);
  E.hearts(700, 720, 2).cap("Captain Inky & crew ⛵", 2.8).wait(2.8).end(0.3);
});

EPISODE({ title: "Outro", seed: 999, music: "bright" }, (E) => {
  E.fig("inky", 300);
  E.cap("Thanks for watching! 💛", 2.2).wait(0.3);
  E.draw("inky", { s: [PROPS._rect(-260, -80, 260, 80)], f: [{ p: PROPS._rect(-260, -80, 260, 80), c: "#e63946" }], w: 10 }, 800, 900, { id: "btn", speed: 2600 }).wait(0.1);
  const t = E.text("SUBSCRIBE", 800, 925, { size: 84, color: "#ffffff" });
  E.wait(0.4);
  E.draw("inky", "bulb", 1150, 860, { id: "bell", s: 0.8 }).wait(0.3);
  E.walk("inky", 640, 0.8).wait(0.8).arm("inky", "R", -60, 0.15).wait(0.15);
  E.to(["#btn", t], { scale: 0.92, transformOrigin: "50% 50%" }, 0.1).sfx("pop", 900, 0.4).wait(0.2).to(["#btn", t], { scale: 1 }, 0.1);
  E.to("#bell", { keyframes: { rotation: [0, -20, 20, -20, 20, 0] }, transformOrigin: "50% 0%" }, 0.8).sfx("ding", 0.4).cap("New page every week ✏️").wait(1.4);
  E.arm("inky", "R", 0).hop("#inky", 60, 2).cap("See you next page! 👋", 2.6).wait(2.6).end(0.4);
});

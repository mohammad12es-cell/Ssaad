EPISODE({ title: "The Mirror", seed: 118, music: "dreamy" }, (E) => {
  E.pageNo(11).fig("inky", 360);
  E.draw("inky", "mirror", 720, 1250, { id: "mirror", speed: 2000 }).wait(0.2);
  const cp = E.el("clipPath", { id: "mclip" }, E.$("defs"));
  E.el("ellipse", { cx: 720, cy: 1020, rx: 104, ry: 164 }, cp);
  const g = E.el("g", { id: "mirrorIn", "clip-path": "url(#mclip)", opacity: 0 }, E.$("front"));
  E.el("g", { id: "reflWrap", transform: "translate(720,1200) scale(-0.62,0.62)" }, g);
  E.fig("refl", 0, { layer: "reflWrap", y: 0 });
  E.show("#mirrorIn", 0.3).cap("A mirror 🪞", 2.0).wait(2.0);
  // copying
  const both = (fn) => { fn("inky"); fn("refl"); };
  both((id) => E.arm(id, "R", -120, 0.2)); E.wait(0.3); both((id) => E.arm(id, "R", -90, 0.15)); E.wait(0.2); both((id) => E.arm(id, "R", -120, 0.15)); E.wait(0.3); both((id) => E.arm(id, "R", 0, 0.2));
  E.wait(0.5).hop("#inky", 60, 1).hop("#refl", 60, 1).wait(0.8);
  E.cap("Same moves 😄").face("inky", "smile").face("refl", "smile").wait(1.6);
  E.music("sneaky").face("inky", "o").wait(0.3);
  // the reflection keeps going on its own
  E.arm("refl", "R", -120, 0.2).arm("refl", "L", 120, 0.2).hop("#refl", 60, 3).cap("…hey? 🤨", 2.0).wait(2.2);
  E.face("refl", "o").arms("refl", 0, 0).wait(0.4);
  E.to("#mirrorIn", { opacity: 0 }, 0.15).fig("twin", 860, { hidden: true });
  E.show("#twin", 0.05).puff(860, 1100, 1).hop("#twin", 60, 1).wait(0.6);
  E.music("chase").cap("It got OUT 😱").wait(0.6);
  E.walk("twin", 1900, 1.4).wait(0.4).walk("inky", 1900, 1.6).wait(1.6);
  E.cap("Come back! 🪞", 2.4).wait(2.6).end(0.4);
});

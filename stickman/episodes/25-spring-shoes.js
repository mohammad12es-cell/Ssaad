EPISODE({ title: "Spring Shoes", seed: 272, music: "happy" }, (E) => {
  E.pageNo(25).fig("inky", 600);
  E.cap("Spring shoes 🦘", 1.8).wait(0.2);
  E.draw("inky", "spring", 575, 1250, { id: "s1", s: 0.7, attach: "inky" }).draw("inky", "spring", 625, 1250, { id: "s2", s: 0.7, attach: "inky" }).wait(0.2);
  E.to("#inky-upper", { y: -60 }, 0.2).to("#inky-legsWrap", { y: -60 }, 0.2).wait(0.4);
  const bounce = (h, d) => { E.to("#inky", { keyframes: [{ y: 1250 - h, duration: d / 2, ease: "power2.out" }, { y: 1250, duration: d / 2, ease: "power2.in" }] }, d); E.sfx("boing", 0.4).wait(d / 1.25); };
  bounce(80, 0.5); bounce(160, 0.6);
  E.face("inky", "smile").cap("Wheee 😄"); bounce(300, 0.8); bounce(420, 0.9);
  E.face("inky", "o").cap("…I can't stop 😰"); bounce(560, 1.0); bounce(700, 1.1);
  E.music("chase");
  E.to("#inky", { y: -900, ease: "power2.out" }, 0.8).sfx("boing", 0.5).wait(1.2);
  E.cap("…", 1.0).wait(1.0);
  // lands upside down
  E.set("#inky", { rotation: 180, transformOrigin: "50% 50%", y: -900 }).to("#inky", { y: 1250 - 480, ease: "power2.in" }, 0.6).wait(0.6);
  E.quake(14).sfx("slam", 0.9).wait(0.5);
  E.cap("…help 🙃").wait(1.6);
  E.music("bright").dog("dog", -400).walk("dog", 420, 0.9).wait(0.9).sfx("bark", 0.4);
  E.to("#inky", { rotation: 360, y: 1250, transformOrigin: "50% 50%" }, 0.5).wait(0.6).hide(["#s1", "#s2"], 0.1);
  E.to("#inky-upper", { y: 0 }, 0.2).to("#inky-legsWrap", { y: 0 }, 0.2).stars(600, 870, 1.6).wait(0.6);
  E.wag("dog", 8).cap("Good boy 🐶", 2.6).wait(2.6).end(0.3);
});

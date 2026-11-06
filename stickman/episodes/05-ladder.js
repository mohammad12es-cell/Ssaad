EPISODE({ title: "Grab the Caption", seed: 52, music: "happy" }, (E) => {
  E.pageNo(5).fig("inky", 380);
  E.cap("Hello! 👋", 30, { keep: true });
  const hello = E.capSel;
  E.wait(1.6).face("inky", "o").arm("inky", "R", -120, 0.25).wait(0.6);
  E.hop("#inky", 90, 1).wait(0.5).hop("#inky", 110, 1).wait(0.6);
  E.arm("inky", "R", 0).face("inky", "worry").wait(0.6);
  E.music("sneaky").face("inky", "smile").draw("inky", "ladder", 560, 1250, { s: 1.35, speed: 2600 }).wait(0.4);
  // climb
  E.to("#inky", { x: 560 }, 0.5).sfx("steps", 3, 0.16, 0.2).wait(0.5);
  E.to("#inky", { y: 690 }, 2.0, 0).sfx("steps", 10, 0.2, 0.2).wait(2.1);
  E.arm("inky", "R", -150, 0.25).wait(0.4);
  // he grabs it... and it falls
  E.to(hello, { keyframes: [{ y: 30, duration: 0.15 }, { y: 0, duration: 0.15 }] }, 0.3).wait(0.5);
  E.face("inky", "o").sfx("whoosh", 0.3, 0.3);
  E.to("#inky", { y: 1250, ease: "power2.in" }, 0.45).wait(0.45);
  E.quake(10).sfx("thud", 110, 0.35, 0.8).arm("inky", "R", 0, 0.1).wait(0.15);
  E.to(hello, { y: 820, ease: "bounce.out", rotation: 8 }, 0.7).wait(0.45);
  E.squash("#inky", 0.3, 0.55).sfx("slam", 0.8).wait(0.4);
  E.stars(560, 830, 2.2).face("inky", "sad").wait(1.2);
  E.music("sad").cap("…hello 😵", 3).wait(3.0).end(0.6);
});

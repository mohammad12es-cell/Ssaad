EPISODE({ title: "Balloon Ride", seed: 96, music: "bright" }, (E) => {
  E.pageNo(9).fig("inky", 380);
  E.cap("Balloon ride 🎈", 2.0).wait(0.6);
  E.draw("inky", "balloon", 450, 1080, { attach: "inky", id: "bal", s: 0.9 }).arm("inky", "R", -40, 0.2).wait(0.6);
  E.to("#inky", { y: 1050 }, 2.0, 0).to("#inky", { rotation: 3, transformOrigin: "50% 0%" }, 1.0, 0).wait(2.0);
  E.cap("Wheee! 😄").face("inky", "smile").to("#inky", { y: 820, x: 520 }, 2.2).wait(2.3);
  E.face("inky", "o").cap("…too high 😨").sweat("inky").wait(1.6);
  E.music("sneaky").sfx("pop", 300, 0.7).hide("#bal", 0.05).puff(560, 520, 1.4).wait(0.25);
  E.face("inky", "worry").to("#inky", { y: 900, rotation: 0 }, 0.4, 0).wait(0.4);
  E.cap("Parachute! 🪂").draw("inky", "sock", 520, 470, { s: 0.8, speed: 3200, id: "sock" }).wait(0.2);
  E.cap("…that's a sock 🧦").to("#sock", { y: 700 }, 0.5).to("#inky", { y: 1250, ease: "power2.in" }, 0.5).wait(0.5);
  E.quake(14, 0.35).sfx("slam", 0.9).squash("#inky", 0.3, 0.6).wait(0.3);
  E.stars(520, 880, 2.0).face("inky", "sad").wait(2.1);
  E.music("happy").face("inky", "smile").to("#sock", { x: 0, y: 440, rotation: 160, transformOrigin: "50% 50%" }, 0.4).wait(0.5);
  E.cap("At least it's warm 🧦", 2.8).hop("#inky", 30, 1).wait(2.9).end(0.4);
});

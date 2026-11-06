EPISODE({ title: "Dominoes", seed: 294, music: "happy" }, (E) => {
  E.pageNo(27).fig("inky", 300);
  E.cap("Domino run 🁢", 1.8).wait(0.1);
  const xs = [460, 560, 660, 760, 860, 960, 1060, 1160];
  xs.forEach((x, i) => E.draw("inky", "domino", x, 1250, { id: "d" + i, speed: 3600 }));
  E.wait(0.4).face("inky", "smile").arm("inky", "R", -30, 0.15).wait(0.3);
  xs.forEach((x, i) => { E.to("#d" + i, { rotation: 62, transformOrigin: "100% 100%", ease: "power2.in" }, 0.22); E.sfx("blip", 500 + i * 60, 0.2).wait(0.11); });
  E.wait(0.4).cap("Perfect 😎").hop("#inky", 40, 1).wait(1.2);
  E.music("sneaky").monster("mon", 1950).walk("mon", 1500, 0.9).wait(0.9);
  E.grin("mon").draw("mon", "domino", 1300, 1250, { id: "big", s: 3.2, speed: 3000 }).wait(0.3);
  E.cap("…uh oh").face("inky", "o").wait(0.8);
  E.to("#big", { rotation: -80, transformOrigin: "0% 100%", ease: "power2.in" }, 0.5).wait(0.5).quake(14).sfx("slam", 0.9);
  E.to(xs.map((_, i) => "#d" + i), { rotation: -62, transformOrigin: "0% 100%", stagger: -0.06 }, 0.2).wait(0.3);
  E.music("chase").cap("RUN 😱").draw("mon", "domino", 1450, 1250, { id: "huge", s: 7, speed: 5000, layer: "back" }).wait(0.1);
  E.walk("inky", -700, 1.0).to("#huge", { rotation: -85, transformOrigin: "0% 100%", ease: "power2.in" }, 0.9, 0.2).wait(1.1);
  E.quake(20, 0.5).sfx("slam", 1.0).laugh("mon").wait(1.0);
  E.cap("Domino-NO 😅", 2.6).wait(2.6).end(0.3);
});

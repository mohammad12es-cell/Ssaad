EPISODE({ title: "Snack Thief", seed: 74, music: "happy" }, (E) => {
  E.pageNo(7).fig("inky", 260);
  E.monster("mon", 1950);
  E.sfx("rumble", 0.8, 0.5).face("inky", "sad").cap("So hungry… 🍽️", 2.2).wait(2.3);
  const eat = (sel, x, y) => {
    E.to(sel, { x: x, y: y, scale: 0.3, transformOrigin: "50% 50%" }, 0.25).wait(0.25).hide(sel, 0.05);
    E.squash("#mon-body", 0.35, 0.85).sfx("crunch", 0.55).wait(0.5);
  };
  E.face("inky", "smile").draw("inky", "apple", 420, 1250, { id: "a1" }).wait(0.4);
  E.to("#mon", { x: 900 }, 0.5).sfx("whoosh", 0.3, 0.3).wait(0.5);
  eat("#a1", 380, -170);
  E.laugh("mon").face("inky", "o").cap("HEY! 😠").wait(1.6);

  E.music("sneaky").face("inky", "worry").draw("inky", "cake", 440, 1250, { id: "cake" }).wait(0.4);
  eat("#cake", 360, -120);
  E.grin("mon").cap("Again?! 🎂").wait(1.8);

  E.draw("inky", "burger", 520, 1250, { s: 1.7, id: "burger", speed: 2400 }).wait(0.3);
  E.cap("Fine. BIGGER 🍔").wait(0.6);
  E.to("#burger", { x: 300, y: -60 }, 0.35).wait(0.3).hide("#burger", 0.05);
  E.to("#mon-body", { scaleX: 1.35, transformOrigin: "50% 100%" }, 0.4).sfx("crunch", 0.6).sfx("burp", 0.5).wait(1.2);
  E.music("dreamy").to("#mon-body", { scaleY: 1.15, scaleX: 1.4, y: 30, transformOrigin: "50% 100%" }, 0.6).to("#mon-eyes", { scaleY: 0.12, transformOrigin: "50% 50%" }, 0.4).sfx("thud", 80, 0.5, 0.8).wait(0.9);
  E.zzz(1000, 820, 4.5).cap("Food coma 😴", 2.2).wait(2.3);
  E.music("bright").face("inky", "smile").draw("inky", "apple", 360, 1250, { s: 0.5, id: "a2" }).wait(0.3);
  E.to("#a2", { y: -170 }, 0.3).wait(0.3).hide("#a2", 0.05).sfx("crunch", 0.4).hop("#inky", 40, 1);
  E.cap("Finally 🍎", 2.6).wait(2.6).end(0.4);
});

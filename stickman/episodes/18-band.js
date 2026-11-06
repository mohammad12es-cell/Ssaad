EPISODE({ title: "The Band", seed: 195, music: "happy" }, (E) => {
  E.pageNo(18).fig("inky", 360);
  E.monster("mon", 1950);
  E.cap("Rock star 🎸", 1.8).wait(0.2);
  E.draw("inky", "guitar", 400, 1170, { id: "gtr", s: 0.75, rot: -55, attach: "inky" }).wait(0.3);
  const strum = (n) => { for (let i = 0; i < n; i++) { E.arm("inky", "R", i % 2 ? 10 : -25, 0.1); E.sfx("blip", 520 + (i % 4) * 120, 0.25).wait(0.2); } E.arm("inky", "R", 0, 0.1); };
  strum(8);
  E.music("sneaky").walk("mon", 1150, 1.0).wait(1.0);
  E.draw("mon", "drum", 980, 1250, { id: "drum" }).wait(0.2);
  for (let i = 0; i < 4; i++) { E.quake(8, 0.2).sfx("thud", 90, 0.3, 0.9).squash("#drum", 0.2, 0.9).wait(0.28); }
  E.cap("Too loud 🥁").face("inky", "worry").wait(1.0);
  E.face("inky", "smile").draw("inky", "headphones", 360, 920, { id: "hp", s: 0.85, attach: "inky" }).wait(0.4);
  strum(6);
  E.cap("Can't hear you 🎧").wait(1.2);
  E.grin("mon").draw("mon", "drum", 1300, 1250, { id: "drum2", s: 1.9, speed: 2600 }).wait(0.2);
  E.quake(18, 0.4).sfx("slam", 1.0).sfx("thud", 60, 0.6, 1.0).to("#inky", { x: 180 }, 0.3).wait(0.2).to("#hp", { y: -500, rotation: 200, opacity: 0, transformOrigin: "50% 50%" }, 0.5).wait(0.8);
  E.face("inky", "o").cap("BOOM 💥").wait(1.2);
  E.music("bright").dog("dog", -400).walk("dog", 560, 1.0).wait(1.0);
  E.sfx("bark", 0.4).wait(0.3).sfx("bark", 0.4).cap("…a howling dog? 🐶").wag("dog", 14).wait(1.2);
  E.face("inky", "smile").grin("mon");
  ["#inky", "#mon", "#dog"].forEach((s) => E.hop(s, 50, 3));
  strum(6);
  E.cap("World tour 🎸🥁🐶", 2.6).wait(2.6).end(0.3);
});

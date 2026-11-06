EPISODE({ title: "Bedtime", seed: 162, music: "dreamy" }, (E) => {
  E.pageNo(15).fig("inky", 300);
  E.cap("Nap time 😴", 1.8).wait(0.2);
  E.draw("inky", "bed", 640, 1250, { id: "bed", speed: 2400 }).wait(0.3);
  E.to("#inky", { x: 815, y: 1155, rotation: -90, transformOrigin: "50% 100%" }, 0.5).sfx("thud", 160, 0.2, 0.3).wait(0.6);
  E.zzz(560, 1000, 2.2).wait(2.4);
  E.monster("mon", 1950).walk("mon", 1200, 1.2).wait(1.3);
  E.music("sneaky").grin("mon").draw("mon", "clock", 1000, 1250, { id: "clock", s: 0.9 }).wait(0.2);
  E.cap("RING RING ⏰").sfx("ding", 0.4).sfx("ding", 0.4).shake("#clock", 10, 0.8).wait(0.3).sfx("ding", 0.4).wait(0.5);
  E.to("#inky", { x: 560, y: 1250, rotation: 0 }, 0.3).face("inky", "o").wait(0.3).hop("#inky", 80, 1).wait(0.6);
  E.face("inky", "worry").draw("inky", "hammer", 640, 1060, { id: "ham", s: 0.8, attach: "inky" }).wait(0.1);
  E.to("#ham", { rotation: 80, svgOrigin: "640 1060" }, 0.2).wait(0.2).quake(10).sfx("slam", 0.8).to("#clock", { scaleY: 0.15, transformOrigin: "50% 100%" }, 0.1).wait(0.5);
  E.hide("#ham").cap("Fixed 🔨").face("inky", "smile").wait(1.2);
  E.to("#inky", { x: 815, y: 1155, rotation: -90 }, 0.4).wait(0.5).zzz(560, 1000, 1.5).wait(0.8);
  E.draw("mon", "drum", 1050, 1250, { id: "drum", s: 1.1 }).wait(0.2);
  for (let i = 0; i < 4; i++) { E.quake(10, 0.2).sfx("thud", 90, 0.3, 0.9).squash("#drum", 0.2, 0.9).wait(0.28); }
  E.cap("BOOM BOOM 🥁").to("#inky", { x: 560, y: 1250, rotation: 0 }, 0.3).face("inky", "o").wait(1.2);
  E.music("dreamy").face("inky", "smile").cap("Plan B: a second bed 🛏️").draw("inky", "bed", 1250, 1250, { id: "bed2", s: 0.9, speed: 2400 }).wait(0.3);
  E.walk("mon", 1260, 0.6).wait(0.6).to("#mon-body", { scaleY: 0.8, y: -60, transformOrigin: "50% 100%" }, 0.3).to("#mon-eyes", { scaleY: 0.12, transformOrigin: "50% 50%" }, 0.4).wait(0.4);
  E.to("#inky", { x: 815, y: 1155, rotation: -90 }, 0.4).wait(0.4);
  E.zzz(560, 1000, 3).zzz(1200, 880, 3).cap("Peace 😴", 3).wait(3.0).end(0.3);
});

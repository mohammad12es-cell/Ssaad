EPISODE({ title: "The Rain Cloud", seed: 41, music: "sad" }, (E) => {
  E.pageNo(4).fig("inky", 300);
  E.prop("cloud", 300, 740, { id: "cloud" });
  ["r1", "r2", "r3"].forEach((id, i) => E.prop("rain", 250 + i * 50, 770 + (i % 2) * 20, { id, layer: "cloud" }));
  const rain = (d) => E.to(["#r1", "#r2", "#r3"], { keyframes: Array.from({ length: Math.round(d / 0.3) }, (_, i) => ({ y: i % 2 ? 0 : 60, duration: 0.3, ease: "none" })) }, d);
  rain(5.4);
  E.face("inky", "sad").cap("His own rain cloud 🌧️", 2.4).wait(2.6);

  E.music("happy").draw("inky", "umbrella", 372, 1090, { s: 1.25, attach: "inky", id: "umb" });
  E.face("inky", "smile").cap("Umbrella ☂️").wait(1.4);
  E.to("#cloud", { x: 70, y: 210 }, 0.6, 0).wait(0.9);
  E.face("inky", "o").cap("…UNDER it?! 😩").sfx("gulp", 0.3).wait(2.0);

  E.music("sneaky").face("inky", "worry").draw("inky", "dryer", 520, 1020, { s: 1.2, attach: "inky", id: "dry" });
  E.face("inky", "smile").cap("Hair dryer 😎").sfx("rumble", 1.6, 0.6);
  E.to("#cloud", { keyframes: { x: [70, 95, 60, 95, 70] } }, 1.6);
  E.to("#cloud", { scale: 0.3, transformOrigin: "50% 50%" }, 1.6, 0.2);
  E.to(["#r1", "#r2", "#r3"], { opacity: 0 }, 0.3, 0.3).wait(2.2);

  E.music("bright").hide(["#umb", "#dry"]).cap("…now it's tiny ☁️").wait(0.3);
  E.to("#cloud", { x: 110, y: -40 }, 0.6).wait(0.7);
  E.hearts(420, 520, 1).cap("A pet! ❤️").wait(2.0);
  E.walk("inky", 640, 1.6);
  E.to("#cloud", { x: 450, y: -40 }, 1.6).wait(1.8);
  // one last drop
  E.prop("rain", 640, 770, { id: "drop", hidden: true, s: 0.6 });
  E.fromTo("#drop", { opacity: 1, y: 0 }, { y: 130, ease: "power1.in" }, 0.35).wait(0.35).hide("#drop", 0.05);
  E.sfx("pop", 400, 0.4).face("inky", "sad").cap("…still raining 😑", 2.6).wait(2.6).end(0.6);
});

EPISODE({ title: "Gone Fishing", seed: 173, music: "dreamy" }, (E) => {
  E.pageNo(16).fig("inky", 420);
  E.prop("pond", 820, 1252, { id: "pond", s: 1.3 });
  E.cap("Gone fishing 🎣", 2.0).wait(0.2);
  const rod = { s: [[[0, 0], [170, -230]], [[170, -230], [300, 150]]], w: 8 };
  E.draw("inky", rod, 490, 1080, { id: "rod", attach: "inky" }).wait(0.5);
  const tug = (n = 3) => { E.to("#rod", { keyframes: Array.from({ length: n * 2 }, (_, i) => ({ rotation: i % 2 ? 0 : -6, duration: 0.12 })), svgOrigin: "70 -170" }, n * 0.24); E.sfx("blip", 500, 0.2).wait(n * 0.24 / 1.25); };
  E.wait(0.8); tug(3); E.wait(0.3);
  E.prop("boot", 790, 1260, { id: "boot", hidden: true });
  E.show("#boot", 0.05).to("#boot", { y: -260 }, 0.4).sfx("whoosh", 0.3, 0.3).wait(0.6).cap("A boot 👢").face("inky", "sad").wait(1.6);
  E.hide("#boot", 0.2).wait(0.6); tug(4); E.wait(0.2);
  E.prop("fish", 790, 1240, { id: "fish", hidden: true, s: 0.4 });
  E.show("#fish", 0.05).to("#fish", { y: -280 }, 0.4).wait(0.6).cap("A tiny fish 🐟").face("inky", "smile").wait(1.4);
  E.hide("#fish", 0.2).wait(0.5).music("chase");
  tug(6);
  E.cap("Something BIG 😤").sweat("inky").wait(0.4); tug(4);
  // the whole pond comes up and lands on him
  E.to("#pond", { y: -420, x: -200, rotation: -25, transformOrigin: "50% 50%", ease: "power2.out" }, 0.6).sfx("whoosh", 0.5, 0.5).wait(0.6);
  E.to("#pond", { y: -60, x: -400, rotation: 0, scaleX: 0.9, ease: "power2.in" }, 0.35).wait(0.35);
  E.sfx("splat", 0.9).quake(10).squash("#inky", 0.3, 0.7).hide("#rod", 0.1);
  E.prop("rain", 400, 900, { id: "d1", hidden: true, s: 1.6 }).prop("rain", 450, 1000, { id: "d2", hidden: true, s: 1.4 });
  E.show(["#d1", "#d2"], 0.05).to(["#d1", "#d2"], { y: 220, opacity: 0 }, 0.6).wait(0.3);
  E.to("#pond", { opacity: 0 }, 0.6, 0.3).wait(0.6);
  E.music("dreamy").face("inky", "o").cap("Caught the whole lake 🌊", 2.8).wait(2.8).end(0.3);
});

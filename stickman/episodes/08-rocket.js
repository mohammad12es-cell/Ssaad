EPISODE({ title: "The Rocket", seed: 85, music: "bright" }, (E) => {
  E.pageNo(8).fig("inky", 300);
  E.cap("Next stop: the Moon 🌙", 2.2).wait(1.6);
  E.draw("inky", "rocket", 700, 1250, { s: 1.4, id: "rocket", speed: 2400 }).wait(0.3);
  E.walk("inky", 700, 1.0).wait(1.0).hide("#inky", 0.15).sfx("slam", 0.4).wait(0.4);
  E.prop("flame", 700, 1250, { id: "flame", hidden: true, s: 1.3, layer: "back" });
  E.cap("3… 2… 1…", 2.0).sfx("rumble", 2.2, 0.6);
  E.to("#rocket", { keyframes: { x: [0, 6, -6, 6, -6, 6, -6, 0] } }, 1.8).wait(1.8);
  E.show("#flame", 0.05).cap("🚀🚀🚀").sfx("whoosh", 0.9, 0.6);
  E.to(["#rocket", "#flame"], { y: -1700, ease: "power2.in" }, 1.2).wait(1.4);
  E.music("sad").cap("…", 1.6).wait(1.8);
  E.sfx("blip", 1200, 0.3, false).wait(0.5);
  // crash back down, nose first
  E.set("#rocket", { y: -1500, rotation: 180, transformOrigin: "50% 50%" }).hide("#flame", 0.01);
  E.to("#rocket", { y: 0, ease: "power2.in" }, 0.6).wait(0.6);
  E.quake(16, 0.4).sfx("slam", 1.0).puff(700, 1220, 2).wait(0.5);
  E.set("#inky", { x: 880, opacity: 1 }).wait(0.1);
  E.stars(880, 870, 2.0).face("inky", "sad").wait(2.0);
  E.music("bright").face("inky", "smile").cap("Plan B 🌙").wait(0.4);
  const moon = { s: [[...PROPS._ring(0, -80, 80, 80, 18, -Math.PI / 2, Math.PI / 2), ...PROPS._ring(-25, -80, 60, 80, 14, Math.PI / 2, -Math.PI / 2)]], f: [{ p: [...PROPS._ring(0, -80, 80, 80, 18, -Math.PI / 2, Math.PI / 2), ...PROPS._ring(-25, -80, 60, 80, 14, Math.PI / 2, -Math.PI / 2)], c: "#ffe45c" }] };
  E.draw("inky", moon, 1000, 1250, { s: 1.2, id: "moon" }).wait(0.2);
  E.walk("inky", 1000, 0.8).wait(0.8).to("#inky", { y: 1060 }, 0.3).sfx("boing", 0.35).wait(0.4);
  E.arms("inky", 80, -80).hop("#inky", 40, 2).cap("Moon: reached ✅", 2.8).wait(2.8).end(0.4);
});

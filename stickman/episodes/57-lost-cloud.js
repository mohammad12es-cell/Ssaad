EPISODE({ title: "Lost Cloud", seed: 624, music: "sad" }, (E) => {
  E.pageNo(57).fig("inky", 300);
  E.cap("My pet cloud is missing ☁️😢", 2.2).face("inky", "sad").wait(2.2);
  const poster = { s: [PROPS._rect(-120, -320, 120, -120), [[0, -120], [0, 0]]], f: [{ p: PROPS._rect(-120, -320, 120, -120), c: "#ffffff" }] };
  E.draw("inky", poster, 520, 1250, { id: "post", speed: 2600 }).wait(0.1);
  E.text("LOST", 520, 1000, { size: 60, color: "#e63946" });
  E.prop("cloud", 520, 1080, { id: "pc", s: 0.35 });
  E.cap("LOST: one small cloud").wait(1.6);
  E.walk("inky", 800, 1.4).wait(1.4).to("#inky", { scaleX: -1, transformOrigin: "50% 50%" }, 0.15).wait(0.5).to("#inky", { scaleX: 1 }, 0.15).wait(0.5);
  E.music("sneaky").monster("mon", 1950).walk("mon", 1250, 1.4).wait(0.3);
  E.prop("cloud", 1950, 600, { id: "pet", s: 0.45 });
  E.to("#pet", { x: -700 }, 1.4, -0.42).wait(1.2);
  E.prop("rain", 1250, 640, { id: "pr", s: 0.9, hidden: true });
  E.show("#pr", 0.05).to("#pr", { keyframes: { y: [0, 60, 0, 60, 0, 60] } }, 1.2).sfx("splat", 0.3).cap("…found it 😂").wait(1.0);
  E.to("#mon-brows", { rotation: 10, transformOrigin: "50% 50%" }, 0.2).cap("Grumpy wet monster 😠💧").wait(1.6);
  E.music("bright").face("inky", "smile").hearts(900, 800, 2);
  E.to("#pet", { x: -1200, y: 0 }, 1.0).hide("#pr", 0.1).wait(1.2);
  E.cap("Welcome home, buddy ☁️", 2.6).hop("#inky", 40, 2).wait(2.6).end(0.3);
});

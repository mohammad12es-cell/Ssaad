EPISODE({ title: "Science Fair", seed: 602, music: "happy" }, (E) => {
  E.pageNo(55).fig("inky", 360);
  const volc = { s: [[[-200, 0], [-40, -260], [40, -260], [200, 0]]], f: [{ p: [[-200, 0], [-40, -260], [40, -260], [200, 0]], c: "#a0785a" }] };
  E.cap("Science fair: volcano 🌋", 2.0).wait(0.2).draw("inky", volc, 800, 1250, { id: "vol", speed: 2600 }).wait(0.4);
  E.cap("Add a little ink…").draw("inky", "bucket", 560, 1250, { id: "buck", s: 0.7 }).wait(0.2);
  E.to("#buck", { x: 230, y: -300, rotation: 120, transformOrigin: "50% 50%" }, 0.5).wait(0.6).hide("#buck", 0.2);
  E.music("chase").shake("#vol", 8, 1.0).sfx("rumble", 1.2, 0.6).cap("…uh oh 😳").face("inky", "o").wait(1.2);
  ["b1", "b2", "b3", "b4", "b5"].forEach((id, i) => E.blot(id, 800, { y: 990, s: 0.5, hidden: true, seed: 3 + i }));
  E.sfx("splat", 0.9);
  ["b1", "b2", "b3", "b4", "b5"].forEach((id, i) => { E.set("#" + id, { opacity: 1 }).to("#" + id, { keyframes: [{ x: 800 + (i - 2) * 160, y: 600 - (i % 2) * 80, duration: 0.4, ease: "power2.out" }, { x: 800 + (i - 2) * 260, y: 1250, duration: 0.5, ease: "power2.in" }] }, 0.9, i * 0.08); });
  E.wait(1.2).cap("ERUPTION 💥").quake(12).wait(1.2);
  E.music("bright").cap("…they're cute though 🥹");
  ["b1", "b2", "b3", "b4", "b5"].forEach((id) => E.hop("#" + id, 50, 2));
  E.wait(1.4).face("inky", "smile").hearts(360, 830, 1);
  E.cap("First prize 🏅", 2.6).wait(2.6).end(0.3);
});

EPISODE({ title: "Pizza Night", seed: 580, music: "happy" }, (E) => {
  E.pageNo(53).fig("inky", 200).fig("pal", 1250, { color: "#e63946" }).monster("mon", 1480);
  const pizza = { s: [PROPS._ring(0, -20, 150, 40, 24), [[-150, -20], [150, -20]], [[0, -60], [0, 20]], [[-100, -48], [100, 8]], [[100, -48], [-100, 8]]], f: [{ p: PROPS._ring(0, -20, 150, 40, 24), c: "#ffc857" }] };
  E.cap("Pizza night 🍕", 1.8).wait(0.2).draw("inky", pizza, 720, 1250, { id: "pz", speed: 2600 }).wait(0.4);
  E.cap("8 slices, 3 friends…").wait(1.4);
  const slice = (id, x) => { E.prop({ s: [[[0, 0], [-50, -20], [50, -20], [0, 0]]], f: [{ p: [[0, 0], [-50, -20], [50, -20]], c: "#ffc857" }] }, 720, 1230, { id, hidden: true }); E.set("#" + id, { opacity: 1 }).to("#" + id, { x: x - 720, y: -140 }, 0.4).sfx("blip", 700, 0.2).wait(0.35); };
  slice("s1", 300); slice("s2", 1150); slice("s3", 1380);
  E.wait(0.4).hide(["#s1", "#s2", "#s3"], 0.3).sfx("crunch", 0.5).wait(0.6);
  E.cap("…last slice 😏").to("#pz", { scale: 0.3, transformOrigin: "50% 100%" }, 0.3).wait(0.6);
  E.music("chase");
  E.walk("inky", 560, 0.6).walk("pal", 880, 0.6).walk("mon", 1050, 0.6).wait(0.6);
  E.cap("MINE 😤").shake("#art", 6, 0.4).wait(0.6);
  E.music("bright").dog("dog", -700).to("#dog", { x: 720 }, 0.4).wait(0.3).to("#pz", { opacity: 0 }, 0.1).to("#dog", { x: -800 }, 0.5, 0.2).sfx("bark", 0.4).wait(0.8);
  E.face("inky", "o").face("pal", "o").scared("mon").cap("…the dog won 🐶🍕", 2.8).wait(2.8).end(0.3);
});

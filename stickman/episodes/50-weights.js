EPISODE({ title: "Gym Day", seed: 547, music: "happy" }, (E) => {
  E.pageNo(50).fig("inky", 420);
  const bar = (w) => ({ s: [[[-w, 0], [w, 0]], PROPS._rect(-w - 20, -50, -w + 10, 50), PROPS._rect(w - 10, -50, w + 20, 50)], f: [{ p: PROPS._rect(-w - 20, -50, -w + 10, 50), c: "#1d1d2b" }, { p: PROPS._rect(w - 10, -50, w + 20, 50), c: "#1d1d2b" }] });
  E.cap("Gym day 💪", 1.6).wait(0.2).draw("inky", bar(150), 420, 1200, { id: "big", speed: 2600 }).wait(0.3);
  E.arms("inky", 60, -60, 0.2).to("#inky-upper", { y: 20 }, 0.2).cap("Hnnngh 😣").sweat("inky").wait(0.4);
  E.to("#big", { keyframes: { y: [0, -10, 0, -10, 0] } }, 0.8).wait(1.2);
  E.arms("inky", 0, 0).to("#inky-upper", { y: 0 }, 0.2).face("inky", "sad").cap("…can't 😩").wait(1.2);
  E.face("inky", "smile").draw("inky", bar(30), 700, 1200, { id: "tiny", s: 0.5 }).wait(0.2);
  E.walk("inky", 700, 0.6).wait(0.6).to("#tiny", { y: -230 }, 0.3).arm("inky", "R", -150, 0.3).cap("Personal best 🏆").wait(1.4);
  E.music("bright").dog("dog", -700).walk("dog", 330, 1.2).wait(1.2);
  E.to("#big", { y: -200 }, 0.4).sfx("boing", 0.35).wag("dog", 10).cap("…the dog lifted it 🐶").wait(0.6);
  E.to("#big", { keyframes: { y: [-200, -260, -200, -260, -200] } }, 1.0).wait(1.2);
  E.face("inky", "o").cap("Show-off 😑", 2.6).wait(2.6).end(0.3);
});

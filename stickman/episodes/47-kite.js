EPISODE({ title: "The Kite", seed: 514, music: "bright" }, (E) => {
  E.pageNo(47).fig("inky", 300);
  const kite = { s: [[[0, -120], [70, 0], [0, 110], [-70, 0], [0, -120]], [[0, 110], [20, 160], [-10, 200], [15, 250]]], f: [{ p: [[0, -120], [70, 0], [0, 110], [-70, 0]], c: "#ff9f1c" }] };
  E.cap("Kite day 🪁", 1.6).wait(0.2).draw("inky", kite, 520, 1100, { id: "kite", s: 0.7 }).wait(0.4);
  E.cap("…no wind 😐").to("#kite", { y: 80, rotation: 30, transformOrigin: "50% 50%" }, 0.4).wait(1.4);
  E.face("inky", "smile").draw("inky", "fan", 100, 1250, { id: "fan", s: 0.9 }).wait(0.2).sfx("rumble", 3.0, 0.5);
  E.to("#kite", { x: 500, y: -500, rotation: -10 }, 1.2).cap("Fan power 🌀").wait(1.2);
  E.draw(null, { s: [[[370, 1080], [1020, 600]]], w: 4 }, 0, 0, { id: "str" }).wait(0.4);
  E.to("#kite", { x: 700, y: -650 }, 0.6).to("#str", { opacity: 0 }, 0.1).wait(0.4);
  E.music("chase").to("#inky", { x: 800, y: 900, rotation: 20, transformOrigin: "50% 0%" }, 1.0).face("inky", "o").cap("TOO MUCH WIND 😱").wait(1.0);
  E.to(["#inky"], { x: 1800, y: 500 }, 1.0).to("#kite", { x: 1800, y: -900 }, 1.0).sfx("whoosh", 1.0, 0.5).wait(1.2);
  E.music("bright").cap("…bye 🪁", 1.6).wait(1.6);
  E.set("#inky", { x: -700, y: 500, rotation: 0 }).to("#inky", { keyframes: [{ x: 100, y: 1000, duration: 0.6 }, { x: 300, y: 1250, duration: 0.4, ease: "power2.in" }] }, 1.0).wait(1.0);
  E.sfx("thud", 120, 0.3, 0.6).stars(300, 870, 1.6).cap("Round page saves the day 🌍", 2.6).wait(2.6).end(0.3);
});

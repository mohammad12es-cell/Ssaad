EPISODE({ title: "Spooky", seed: 558, music: "sneaky" }, (E) => {
  E.pageNo(51).fig("inky", 300).monster("mon", 1200);
  E.cap("Time to scare the monster 👻", 2.2).face("inky", "smile").wait(2.2);
  const sheet = { s: [[[-80, -60], [-80, -400], ...PROPS._ring(0, -400, 80, 80, 14, Math.PI, 2 * Math.PI).slice(1), [80, -60], [50, -80], [25, -55], [0, -80], [-25, -55], [-50, -80], [-80, -60]], PROPS._ring(-28, -380, 12, 16, 10), PROPS._ring(28, -380, 12, 16, 10)], f: [{ p: [[-80, -60], [-80, -400], ...PROPS._ring(0, -400, 80, 80, 14, Math.PI, 2 * Math.PI).slice(1), [80, -60]], c: "#ffffff" }, { p: PROPS._ring(-28, -380, 12, 16, 10), c: "#1d1d2b" }, { p: PROPS._ring(28, -380, 12, 16, 10), c: "#1d1d2b" }] };
  E.draw("inky", sheet, 300, 1290, { id: "sheet", attach: "inky", speed: 2600 }).wait(0.3);
  E.walk("inky", 880, 1.4).wait(1.4).to("#inky", { y: 1200 }, 0.2).to("#inky", { y: 1250 }, 0.2, 0.2).cap("BOOOO 👻").sfx("rumble", 0.8, 0.5).wait(0.4);
  E.scared("mon").hop("#mon", 120, 1).cap("…it worked 😱").wait(1.6);
  E.music("bright").dog("dog", -700).walk("dog", 700, 1.2).wait(1.2);
  E.to("#sheet", { x: -300, y: 120, rotation: -60, transformOrigin: "50% 100%" }, 0.5).sfx("whoosh", 0.4, 0.3).wait(0.5);
  E.face("inky", "o").cap("…busted 😅").wait(1.0);
  E.grin("mon").laugh("mon", 1.0).wait(1.2);
  E.face("inky", "smile").cap("Okay, that was funny 😂", 2.6).hop("#inky", 30, 1).wait(2.6).end(0.3);
});

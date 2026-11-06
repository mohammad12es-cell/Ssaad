EPISODE({ title: "Toll Bridge", seed: 525, music: "sneaky" }, (E) => {
  E.pageNo(48).fig("inky", 160);
  E.prop("hole", 700, 1252, { id: "pit", s: 2.2 }).prop("bridge", 700, 1250, { id: "br" }).monster("mon", 700, { y: 1234 });
  E.cap("A bridge… with a troll 👹", 2.0).wait(2.0);
  E.walk("inky", 380, 1.0).wait(1.0).arm("mon", "L", 40, 0.2).cap("\"PAY THE TOLL\"").wait(1.4);
  const coin = { s: [PROPS._ring(0, -30, 30)], f: [{ p: PROPS._ring(0, -30, 30), c: "#ffd23f" }] };
  E.draw("inky", coin, 460, 1100, { id: "c1", s: 0.7 }).to("#c1", { x: 120, y: -40 }, 0.3).wait(0.5);
  E.cap("…not enough 😤").to("#mon", { keyframes: { x: [700, 690, 710, 700] } }, 0.3).wait(1.2);
  E.draw("inky", coin, 460, 1100, { id: "c2", s: 2.2 }).wait(0.2).cap("Big coin 🪙").wait(1.0);
  E.cap("…still no 😠").laugh("mon").wait(1.4);
  E.music("bright").face("inky", "smile").draw("inky", "cake", 470, 1250, { id: "cake", s: 0.9 }).wait(0.2);
  E.to("#mon-eyes", { scale: 1.2, transformOrigin: "50% 50%" }, 0.2).grin("mon").cap("…CAKE? 🎂").wait(0.8);
  E.to("#cake", { x: 230, y: -160, scale: 0.3, transformOrigin: "50% 50%" }, 0.3).wait(0.3).hide("#cake", 0.05).sfx("crunch", 0.5).squash("#mon-body", 0.3, 0.85).wait(0.6);
  E.to("#mon", { x: 1150 }, 0.6).hearts(1150, 780, 1).wait(0.6).walk("inky", 1000, 1.6).wait(1.6);
  E.cap("Toll paid 🍰", 2.6).hop("#inky", 40, 1).wait(2.6).end(0.3);
});

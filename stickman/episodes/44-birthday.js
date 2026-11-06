EPISODE({ title: "Surprise!", seed: 481, music: "dreamy" }, (E) => {
  E.pageNo(44).fig("inky", -600);
  E.dark(false);
  E.fig("pal", 700, { color: "#e63946", layer: "back" }).dog("dog", 920, { layer: "back" }).monster("mon", 1220, { layer: "back" });
  E.dark(true, 0.01).wait(0.2);
  E.cap("Just got home…", 1.8).walk("inky", 300, 1.6).wait(1.8);
  E.cap("…why is it so dark?").wait(1.4);
  E.music("bright").dark(false, 0.05).sfx("pop", 1200, 0.5).sfx("ding", 0.4);
  ["#pal", "#dog", "#mon"].forEach((s) => E.hop(s, 80, 1));
  E.cap("SURPRISE! 🎉").face("inky", "o").wait(1.2);
  E.draw("mon", "cake", 520, 1250, { id: "cake", s: 1.1 }).wait(0.2);
  E.cap("Happy birthday, Inky 🎂").face("inky", "smile").hearts(300, 830, 2).wait(1.6);
  E.cap("Make a wish 🕯️").arms("inky", -60, 60, 0.3).wait(1.2);
  E.prop({ s: [[[-8, -200], [0, -225], [8, -200]]], f: [{ p: [[-8, -200], [0, -225], [8, -200]], c: "#ff9f1c" }], w: 4 }, 520, 1250, { id: "flame", s: 1.1 });
  E.arms("inky", 0, 0).to("#flame", { opacity: 0 }, 0.2, 0.3).sfx("whoosh", 0.3, 0.3).wait(0.8);
  ["#inky", "#pal", "#dog", "#mon"].forEach((s) => E.hop(s, 60, 2));
  E.cap("Best page ever ❤️", 2.8).wait(2.8).end(0.3);
});

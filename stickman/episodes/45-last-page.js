EPISODE({ title: "The Last Page", seed: 492, music: "dreamy" }, (E) => {
  E.pageNo(58).fig("inky", 120);
  const end = E.text("THE END", 1000, 1080, { size: 140 });
  E.walk("inky", 560, 2.0).wait(2.0);
  E.face("inky", "sad").cap("The last page? 😢", 2.0).wait(2.0);
  E.music("bright").fig("pal", -700, { color: "#e63946" }).dog("dog", -900).blot("pet", -1100, { s: 0.8 }).monster("mon", 1950);
  E.walk("pal", 420, 1.4).walk("dog", 220, 1.4).to("#pet", { x: 40 }, 1.4).walk("mon", 1420, 1.4).wait(1.5);
  E.cap("Everyone came 🥹").face("inky", "smile").hearts(560, 820, 1).wait(1.6);
  E.grin("mon").erase(end, 1000, 1050, { w: 220, from: [1420, 900] }).wait(0.3);
  E.cap("…the monster erased THE END 😮").wait(1.4);
  E.face("inky", "smile").cap("Then let's keep going ✏️").wait(0.6);
  E.draw("inky", { s: [PROPS._rect(-260, -90, 260, 60)], f: [{ p: PROPS._rect(-260, -90, 260, 60), c: "#ffe45c" }], w: 10 }, 1000, 1050, { speed: 2600 }).wait(0.1);
  E.text("TO BE CONTINUED…", 1000, 1070, { size: 64 });
  E.sfx("ding", 0.4).wait(0.6);
  ["#inky", "#pal", "#dog", "#pet", "#mon"].forEach((s) => E.hop(s, 70, 2));
  E.hearts(560, 760, 3).cap("See you in the next notebook 📓", 3.2).wait(3.2).end(0.4);
});

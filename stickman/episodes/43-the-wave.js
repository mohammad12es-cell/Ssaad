EPISODE({ title: "The Wave", seed: 470, music: "bright" }, (E) => {
  E.pageNo(43);
  E.fig("inky", 120).fig("pal", 330, { color: "#e63946" }).dog("dog", 560).blot("pet", 760, { s: 0.9 }).monster("mon", 1100);
  E.cap("The gang's all here 🎉", 2.0).face("inky", "smile").face("pal", "smile").wait(2.0);
  E.cap("Ready? Stadium wave! 🙌").wait(1.0);
  const row = ["#inky", "#pal", "#dog", "#pet", "#mon"];
  for (let k = 0; k < 3; k++) { row.forEach((s, i) => E.to(s, { keyframes: [{ y: "-=90", duration: 0.18, ease: "power2.out" }, { y: "+=90", duration: 0.18, ease: "power2.in" }] }, 0.36, i * 0.14)); E.sfx("pop", 700 + k * 150, 0.25).wait(1.0); }
  E.cap("Again, BIGGER 😄").wait(0.8);
  row.forEach((s, i) => E.to(s, { keyframes: [{ y: "-=220", duration: 0.25, ease: "power2.out" }, { y: "+=220", duration: 0.25, ease: "power2.in" }] }, 0.5, i * 0.16));
  E.sfx("boing", 0.4).wait(1.2);
  E.music("chase").cap("…the PAGE joined in 😱").wait(0.3);
  E.to("#art", { keyframes: { y: [0, -40, 30, -30, 20, 0], rotation: [0, 2, -2, 2, -1, 0] }, svgOrigin: "540 1250" }, 1.4).sfx("rumble", 1.4, 0.7).wait(1.4);
  row.forEach((s, i) => E.to(s, { rotation: i % 2 ? 80 : -80, transformOrigin: "50% 100%" }, 0.3, i * 0.06));
  E.sfx("slam", 0.8).wait(0.8);
  E.music("bright").cap("Best wave ever 🌊", 2.6).wait(2.6).end(0.3);
});

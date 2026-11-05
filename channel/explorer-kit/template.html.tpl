<!doctype html>
<html lang="en" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="assets/gsap.min.js"></script>
    <style>
      @font-face { font-family: "Fredoka"; font-weight: 700; src: url("assets/fredoka-latin-700-normal.woff2") format("woff2"); }
      :root { --paper: #fbf8f1; --ink: #111111; --navy: #1b2a4a; --gold: #ffd400; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: var(--paper); }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; font-family: "Fredoka", sans-serif;
        background: radial-gradient(circle at 30% 20%, #ffffff 0%, var(--paper) 60%, #f3eee2 100%); }
      .clip { position: absolute; inset: 0; }
      svg.stage { width: 1080px; height: 1920px; }
      .photo { overflow: hidden; background: #fff; }
      .cam { position: absolute; left: 0; top: 0; width: 1080px; height: 1919px; transform-origin: 0 0; }
      .cam img, .cam svg { position: absolute; left: 0; top: 0; width: 1080px; height: 1919px; }
      .cap { inset: auto 0 auto 0; top: 120px; height: 300px; display: flex; justify-content: center; align-items: flex-start; pointer-events: none; }
      .card { max-width: 1010px; text-align: center; background: var(--navy); color: #fff; font-weight: 700;
        font-size: 66px; line-height: 1.18; padding: 22px 40px 26px; border-radius: 34px; border: 7px solid var(--ink);
        box-shadow: 0 10px 0 rgba(0,0,0,0.25); }
      .hl { color: var(--gold); }
      .hl2 { color: #cfd8e3; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="__TOTAL__" data-width="1080" data-height="1920">
      __CLIPS__
      <audio id="sound" src="assets/audio.wav" data-start="0" data-duration="__TOTAL__" data-volume="1"></audio>
    </div>
    <script>
      const S = __SCENES__;
      const TOTAL = __TOTAL__;
      const tl = gsap.timeline({ paused: true });
    </script>
    <script src="assets/lib.js"></script>
    <script src="scenes.js"></script>
    <script>
      for (let i = 1; i <= S.length; i++)
        tl.fromTo(`#c${i} .card`, { y: -40, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, i === 1 ? 0.05 : S[i - 1] + 0.05);
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>

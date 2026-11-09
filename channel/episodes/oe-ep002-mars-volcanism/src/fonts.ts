import {continueRender, delayRender, staticFile} from 'remotion';

const faces: [string, string, string][] = [
  ['OE Display', 'fonts/InterDisplay-Black.otf', '900'],
  ['OE Display', 'fonts/InterDisplay-Bold.otf', '700'],
  ['OE Display', 'fonts/InterDisplay-Medium.otf', '500'],
  ['OE Mono', 'fonts/JetBrainsMono-Medium.ttf', '500'],
];

if (typeof document !== 'undefined') {
  const handle = delayRender('fonts');
  Promise.all(
    faces.map(([family, file, weight]) => {
      const ff = new FontFace(family, `url(${staticFile(file)})`, {weight});
      return ff.load().then((loaded) => document.fonts.add(loaded));
    }),
  )
    .then(() => continueRender(handle))
    .catch((e) => {
      console.error(e);
      continueRender(handle);
    });
}

export const DISPLAY = '"OE Display", "Inter Display", sans-serif';
export const MONO = '"OE Mono", "JetBrains Mono", monospace';

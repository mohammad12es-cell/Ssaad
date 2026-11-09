// Render preview stills at given seconds: node scripts/stills.mjs <outdir> 1 5 12 ...
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
const [out, ...secs] = process.argv.slice(2);
const browserExecutable = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const chromiumOptions = {gl: 'swangle'};
const composition = await selectComposition({serveUrl, id: 'Episode001', browserExecutable, chromiumOptions});
for (const s of secs) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(Number(s) * 30));
  const t0 = Date.now();
  await renderStill({composition, serveUrl, frame, output: `${out}/f_${String(s).padStart(5, '0')}.png`, browserExecutable, chromiumOptions, scale: 0.5});
  console.log('frame', frame, Date.now() - t0, 'ms');
}

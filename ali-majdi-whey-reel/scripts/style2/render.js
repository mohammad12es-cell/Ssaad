const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const fs=require('fs'),{spawn}=require('child_process'),path=require('path');
(async()=>{
  const [t0,t1,out]=[parseFloat(process.argv[2]),parseFloat(process.argv[3]),process.argv[4]];
  const html=fs.readFileSync(process.argv[5]||'overlay.html','utf8').replace('__CAPTIONS__',fs.readFileSync('captions.json','utf8'));
  fs.writeFileSync('overlay_built.html',html);
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1080,height:1920}});
  p.on('console',m=>console.log('PAGE',m.text())); p.on('pageerror',e=>console.log('ERR',e.message));
  await p.goto('file://'+path.resolve('overlay_built.html')); await p.evaluate(()=>document.fonts.ready);
  const ff=spawn('ffmpeg',['-v','error','-y','-f','image2pipe','-framerate','30','-c:v','png','-i','-','-c:v','qtrle','-pix_fmt','argb',out]);
  const f0=Math.round(t0*30),f1=Math.round(t1*30);
  for(let f=f0;f<f1;f++){
    await p.evaluate(t=>render(t),f/30);
    const buf=await p.screenshot({omitBackground:true,type:'png'});
    if(!ff.stdin.write(buf)) await new Promise(r=>ff.stdin.once('drain',r));
  }
  ff.stdin.end(); await new Promise(r=>ff.on('close',r)); await b.close(); console.log('overlay done',f1-f0);
})();

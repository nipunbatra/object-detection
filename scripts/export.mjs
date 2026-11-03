// Export the lecture to PDF: one completed page per slide, and one page per reveal.
//   python3 scripts/serve.py            (in another terminal)
//   node scripts/export.mjs             writes exports/object-detection.pdf and exports/object-detection-builds.pdf
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import puppeteer from 'puppeteer';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),base=process.env.DECK_URL||'http://127.0.0.1:8780';
const executablePath=process.env.PUPPETEER_EXECUTABLE_PATH||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(p=>fs.existsSync(p));
const b=await puppeteer.launch({headless:true,executablePath,args:['--no-sandbox']});
const out=path.join(root,'exports');fs.mkdirSync(out,{recursive:true});
try{
 for(const [query,name] of [['print','object-detection.pdf'],['print=builds','object-detection-builds.pdf']]){
  const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.setViewport({width:1280,height:720});await p.goto(`${base}/?${query}`,{waitUntil:'networkidle0'});
  await p.waitForFunction(()=>window.deckReady);await p.evaluate(()=>document.fonts.ready);await p.emulateMediaType('print');
  const state=await p.evaluate(()=>({pages:document.querySelectorAll('.scene').length,maths:lecture.mathsErrors,overflow:[...document.querySelectorAll('.scene')].filter(s=>{const c=s.querySelector('.content');return c.scrollHeight>c.clientHeight+4;}).map(s=>s.id)}));
  if(errors.length||state.maths.length||state.overflow.length)throw new Error(JSON.stringify({query,errors,...state}));
  await p.pdf({path:path.join(out,name),preferCSSPageSize:true,printBackground:true,margin:{top:0,right:0,bottom:0,left:0},timeout:300000});
  console.log(`${name}: ${state.pages} pages, ${(fs.statSync(path.join(out,name)).size/1e6).toFixed(1)} MB`);await p.close();
 }
}finally{await b.close();}

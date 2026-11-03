// How much text each reveal shows at once: slide words (not code, not the part strip), the story line, SVG labels.
//   python3 scripts/serve.py            (in another terminal)
//   node scripts/density.mjs            writes qa/density.json; fails if a state breaks a limit below
// A state over WARN words is worth a look; one over MAX words, a story line over LINE words or a code block over
// CODE lines should be split or trimmed (Nipun: one move per slide, and the body must not repeat the story line).
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import puppeteer from 'puppeteer';
const WARN=70,MAX=100,LINE=30,CODE=12;
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),base=process.env.DECK_URL||'http://127.0.0.1:8780';
const executablePath=process.env.PUPPETEER_EXECUTABLE_PATH||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(p=>fs.existsSync(p));
const b=await puppeteer.launch({headless:true,executablePath,args:['--no-sandbox']});
const rows=[];
try{
 const p=await b.newPage();await p.setViewport({width:1280,height:800,deviceScaleFactor:1});await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 await p.goto(`${base}/?all`,{waitUntil:'networkidle0'});await p.waitForFunction(()=>window.deckReady,{timeout:30000});
 const slides=await p.evaluate(()=>lecture.allSlides.map(s=>({id:s.id,builds:s.builds,optional:!!s.optional})));
 for(const s of slides)for(let k=1;k<=s.builds;k++){
  await p.evaluate((id,k)=>lecture.goTo(id,k),s.id,k);
  rows.push({id:s.id,build:k,optional:s.optional,...await p.evaluate(()=>{
   const sc=document.querySelector('.scene.current'),vis=el=>el.checkVisibility({opacityProperty:true,visibilityProperty:true}),words=t=>(t.match(/\S+/g)||[]).length;
   let body=0,svg=0;const tw=document.createTreeWalker(sc.querySelector('.content'),NodeFilter.SHOW_TEXT);
   for(let n;(n=tw.nextNode());){const el=n.parentElement;if(!el||el.closest('pre,.katex,.act-strip')||!vis(el))continue;if(el.closest('svg'))svg+=words(n.textContent);else body+=words(n.textContent);}
   const line=[...sc.querySelectorAll('.prompt [data-only]')].find(vis),code=[...sc.querySelectorAll('.content pre')].filter(vis).map(x=>x.textContent.split('\n').filter(l=>l.trim()).length);
   return {body,line:line?words(line.textContent):0,svg,codeLines:Math.max(0,...code)};
  })});
 }
}finally{await b.close();}
for(const r of rows)r.words=Math.round(r.body+r.line+r.svg/2);
fs.mkdirSync(path.join(root,'qa'),{recursive:true});fs.writeFileSync(path.join(root,'qa','density.json'),JSON.stringify(rows)+'\n');
const main=rows.filter(r=>!r.optional),sorted=main.map(r=>r.words).sort((a,c)=>a-c),q=f=>sorted[Math.floor(f*(sorted.length-1))];
const over=rows.filter(r=>r.words>MAX||r.line>LINE||r.codeLines>CODE),warn=rows.filter(r=>r.words>WARN&&!over.includes(r));
console.log(`main route: ${main.length} states; words per state median ${q(.5)}, 90th percentile ${q(.9)}, max ${sorted.at(-1)}`);
console.log(`over ${WARN} words (look at these): ${warn.map(r=>`${r.id}/${r.build} (${r.words})`).join(', ')||'none'}`);
console.log(`over a limit: ${over.map(r=>`${r.id}/${r.build} (${r.words} words, line ${r.line}, code ${r.codeLines})`).join(', ')||'none'}`);
if(over.length)process.exitCode=1;

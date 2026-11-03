// Render every authored state of the lecture, check its geometry, and save a screenshot of each.
//   python3 scripts/serve.py            (in another terminal)
//   node scripts/verify.mjs             writes qa/browser-checks.json, qa/screenshots/, manifest.json, speaker-notes.md
// Puppeteer: any installation Node can resolve (a node_modules symlink works); set PUPPETEER_EXECUTABLE_PATH for Chrome.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import puppeteer from 'puppeteer';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),base=process.env.DECK_URL||'http://127.0.0.1:8780';
const executablePath=process.env.PUPPETEER_EXECUTABLE_PATH||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(p=>fs.existsSync(p));
const only=process.argv.slice(2);  // optional slide ids: check just these
const b=await puppeteer.launch({headless:true,executablePath,args:['--no-sandbox']});
const out=path.join(root,'qa'),shots=path.join(out,'screenshots');fs.mkdirSync(shots,{recursive:true});
if(!only.length)for(const name of fs.readdirSync(shots))if(name.endsWith('.jpg'))fs.unlinkSync(path.join(shots,name));
let passed=false;
try{
 const p=await b.newPage(),errors=[],failures=[],checks=[];let captures=0;
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await p.setViewport({width:1280,height:800,deviceScaleFactor:1});await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 await p.goto(`${base}/?all`,{waitUntil:'networkidle0'});await p.waitForFunction(()=>window.deckReady,{timeout:30000});
 const state=await p.evaluate(()=>({meta:lecture.meta,slides:lecture.allSlides,mathsErrors:lecture.mathsErrors}));errors.push(...state.mathsErrors.map(e=>JSON.stringify(e)));
 const names=state.slides;
 for(let i=0;i<names.length;i++){
  const s=names[i];if(only.length&&!only.includes(s.id))continue;
  for(let k=1;k<=s.builds;k++){
   await p.evaluate((id,k)=>lecture.goTo(id,k),s.id,k);
   const faults=await p.evaluate(()=>{
    const el=document.querySelector('.scene.current'),r=el.getBoundingClientRect(),c=el.querySelector('.content'),scale=r.width/1280,f=[];
    for(const x of el.querySelectorAll('h2,p,pre,.display,table,li')){
     if(getComputedStyle(x).visibility==='hidden')continue;const z=x.getBoundingClientRect();if(!z.width||!z.height)continue;
     if(z.left<r.left+60*scale-1||z.right>r.right-60*scale+1||z.top<r.top||z.bottom>r.bottom)f.push('outside margins: '+x.textContent.trim().slice(0,95));
    }
    if(c.scrollHeight>c.clientHeight+4)f.push(`content height overflow by ${c.scrollHeight-c.clientHeight}px`);
    // centred content that is too tall spills upward too, which scrollHeight does not report
    const cr=c.getBoundingClientRect();for(const ch of c.children){const z=ch.getBoundingClientRect();if(z.height&&(z.top<cr.top-2||z.bottom>cr.bottom+2))f.push(`content block outside the content area by ${Math.round(Math.max(cr.top-z.top,z.bottom-cr.bottom))}px`);}
    for(const box of el.querySelectorAll('.formula-scroll,.diagram-scroll,.table-scroll'))if(getComputedStyle(box).visibility!=='hidden'&&box.scrollWidth>box.clientWidth+2)f.push('content wider than its box: '+box.textContent.trim().slice(0,70));
    for(const img of el.querySelectorAll('img'))if(!img.complete||!img.naturalWidth)f.push('missing image '+img.getAttribute('src'));
    // an HTML tag inside an SVG string makes the parser leave the SVG: the rest lands beside it
    for(const d of el.querySelectorAll('.diagram-scroll'))if(d.querySelector(':scope>svg')&&d.children.length>1)f.push('stray content after an SVG: '+d.textContent.trim().slice(0,60));
    for(const im of el.querySelectorAll('svg image')){if(!im.getAttribute('href'))f.push('SVG image without href');if(getComputedStyle(im.ownerSVGElement).overflow==='visible')f.push('a photo SVG paints outside its frame');}
    for(const pre of el.querySelectorAll('pre'))if(getComputedStyle(pre).visibility!=='hidden'&&pre.scrollWidth>pre.clientWidth+2)f.push('code width overflow');
    for(const svg of el.querySelectorAll('svg[viewBox]'))for(const t of svg.querySelectorAll('text')){
     if(getComputedStyle(t).visibility==='hidden')continue;const v=svg.viewBox.baseVal,z=t.getBBox();
     if(z.x<v.x-1||z.y<v.y-1||z.x+z.width>v.x+v.width+1||z.y+z.height>v.y+v.height+1)f.push('SVG text outside viewBox: '+t.textContent);
    }
    return [...new Set(f)];
   });
   if(faults.length)failures.push({id:s.id,build:k,faults});
   await (await p.$('.scene.current')).screenshot({path:path.join(shots,`${String(i+1).padStart(3,'0')}-${s.id}-${k}.jpg`),type:'jpeg',quality:85});captures++;
  }
 }
 if(!only.length){
  const check=(name,pass)=>{checks.push({name,pass});if(!pass)failures.push({check:name});};
  const multi=names.find(s=>s.builds>1);await p.evaluate(id=>lecture.goTo(id,1),multi.id);await p.keyboard.press('ArrowRight');check('right arrow advances',await p.evaluate(()=>lecture.current.build===2));await p.keyboard.press('ArrowLeft');check('left arrow returns',await p.evaluate(()=>lecture.current.build===1));
  await p.click('[data-action="finish"]');check('complete reveals final state',await p.evaluate(()=>lecture.current.build===lecture.slides[lecture.current.index].builds));await p.click('[data-action="reset"]');check('reset restores first state',await p.evaluate(()=>lecture.current.build===1));
  await p.click('[data-action="notes"]');check('speaker notes available',await p.$eval('#notes',e=>!e.hidden&&e.textContent.includes('Expected')));await p.click('[data-action="notes"]');
  await p.keyboard.press('f');check('F starts presenting',await p.evaluate(()=>document.body.classList.contains('presenting')));await p.keyboard.press('f');check('F stops presenting',await p.evaluate(()=>!document.body.classList.contains('presenting')));
  await p.goto(`${base}/?all#${multi.id}/2`,{waitUntil:'networkidle0'});await p.waitForFunction(()=>window.deckReady);check('fresh deep link',await p.evaluate(id=>lecture.current.id===id&&lecture.current.build===2,multi.id));
  await p.goto(`${base}/?present#title`,{waitUntil:'networkidle0'});await p.waitForFunction(()=>window.deckReady);check('old ?present#title link opens the cover',await p.evaluate(()=>lecture.current.id==='title'));
  await p.setViewport({width:390,height:844});await p.goto(`${base}/?reading`,{waitUntil:'networkidle0'});await p.waitForFunction(()=>window.deckReady);
  check('mobile reading has no page overflow',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));check('reading has all scenes',await p.$$eval('.scene',(e,count)=>e.length===count,names.length));
  const manifest={...state.meta,coreSlides:names.filter(s=>!s.optional).length,optionalSlides:names.filter(s=>s.optional).length,totalStates:names.reduce((a,s)=>a+s.builds,0),slides:names.map(s=>({id:s.id,title:s.title,section:s.section,chapter:s.chapter,builds:s.builds,optional:!!s.optional}))};
  fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  const strip=h=>String(h??'').replace(/<[^>]+>/g,'');
  const notes=[`# ${state.meta.title}: speaker notes`,`\nPlanned main route: ${state.meta.minutes} minutes, including student responses. Optional slides are outside this budget.\n`,'## Pacing\n\n| Part | Minutes |\n|---|---:|\n'+state.meta.sections.filter(s=>s.minutes>0).map(s=>`| ${s.title} | ${s.minutes} |`).join('\n')+'\n'];
  for(const s of names){notes.push(`## ${s.id}: ${strip(s.title)}${s.optional?' (optional)':''}\n`);const no=s.notes||{};const asks=Array.isArray(no.ask)?no.ask:[no.ask];const exp=Array.isArray(no.expected)?no.expected:[no.expected];
   (s.prompts||[]).forEach((line,i)=>notes.push(`**Build ${i+1}:** ${strip(line)}\n\n- Ask: ${strip(asks[i]||'')}\n- Expected: ${strip(exp[i]||exp.at(-1)||'')}\n`));
   for(const [k,l] of [['point','Point here'],['misconception','Common misconception'],['demo','Notebook'],['transition','Transition']])if(no[k])notes.push(`**${l}:** ${strip(no[k])}\n`);if(s.source)notes.push(`**Source:** ${strip(s.source)}\n`);}
  fs.writeFileSync(path.join(root,'speaker-notes.md'),notes.join('\n'));
 }
 const report={passed:!errors.length&&!failures.length,renderedStates:captures,errors,failures,checks,scope:'Every authored state captured at 1280 × 720. Geometry checks do not replace looking at the screenshots.'};
 if(!only.length)fs.writeFileSync(path.join(out,'browser-checks.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({passed:report.passed,renderedStates:captures,errors:errors.slice(0,5),failures:failures.slice(0,40)},null,1));passed=report.passed;await p.close();
}finally{await b.close();}
if(!passed)process.exitCode=1;

import {esc} from './author.js';
const params=new URLSearchParams(location.search),reading=params.has('reading'),printing=params.has('print');
const moduleURL=new URL('content.js',location.href);
const content=await import(moduleURL.href),meta=content.meta,allSlides=content.slides;
if(!meta||!Array.isArray(allSlides)||!allSlides.length)throw new Error('Missing lecture metadata or slides');
const ids=new Set();for(const s of allSlides){if(!s.id||ids.has(s.id))throw new Error('Duplicate/missing slide ID: '+s.id);ids.add(s.id);s.builds=s.builds||s.prompts?.length||1;}
const full=reading||printing||params.has('all'),slides=allSlides.filter(s=>full||!s.optional);
const macros={'\\E':'\\mathbb{E}','\\KL':'\\mathrm{KL}','\\N':'\\mathcal{N}','\\ELBO':'\\mathrm{ELBO}','\\pcol':'\\textcolor{##0F766E}{#1}','\\qcol':'\\textcolor{##8B2CDE}{#1}','\\dcol':'\\textcolor{##245EDB}{#1}','\\ncol':'\\textcolor{##AA4E08}{#1}','\\lcol':'\\textcolor{##BE123C}{#1}'};
const stage=document.querySelector('#lecture');
const notesRows=s=>{
  const n=s.notes||{},rows=[];const asks=Array.isArray(n.ask)?n.ask:[n.ask||s.prompts?.[0]||''];
  asks.forEach((ask,i)=>{rows.push([`Build ${i+1}: ask`,ask]);rows.push(['Expected',Array.isArray(n.expected)?n.expected[i]||n.expected.at(-1):n.expected||'']);});
  for(const [k,label] of [['point','Point here'],['misconception','Common misconception'],['demo','Notebook demonstration'],['transition','Transition']])if(n[k])rows.push([label,n[k]]);
  return rows;
};
const notesHTML=s=>`<dl>${notesRows(s).map(([k,v])=>`<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>${s.source?`<p class="note-source">Source: ${s.source}</p>`:''}`;
stage.innerHTML=slides.map((s,i)=>{
 const sec=meta.sections?.find(x=>x.id===s.section)?.title||s.section||meta.title;
 const prompts=s.prompts||[''];return `<section class="scene" id="${esc(s.id)}" data-scene-id="${esc(s.id)}" data-builds="${s.builds}" data-optional="${!!s.optional}"><header><p class="kicker">${meta.number||''} · ${esc(sec)}${s.optional&&!/^Appendix/.test(sec)?' · optional extension':''}${s.chapter?` · <span class="chapter">${esc(s.chapter)}</span>`:''}</p><h2>${s.title}</h2>${s.notebook?`<a class="nb-link" href="${esc(s.notebook.href)}" target="_blank" rel="noopener">${esc(s.notebook.label||'Run it in the notebook')}</a>`:''}</header><div class="content">${s.body||''}</div><div class="prompt">${prompts.map((p,j)=>`<div data-only="${j+1}">${p}</div>`).join('')}</div><footer class="footer"><span class="source">${s.source||''}</span><span class="page-number">${i+1} / ${slides.length}</span></footer><details class="read-notes"><summary>Speaker notes</summary>${notesHTML(s)}</details></section>`;
}).join('');
const mathsErrors=[];
for(const el of document.querySelectorAll('[data-tex]')){try{katex.render(el.dataset.tex,el,{displayMode:el.dataset.display==='true',throwOnError:true,macros,trust:false});}catch(error){mathsErrors.push({tex:el.dataset.tex,error:error.message});el.classList.add('math-error');}}
for(const parent of stage.querySelectorAll('.content, .content div, .prompt')){
 const alternates=[...parent.children].filter(el=>el.hasAttribute('data-only'));
 if(alternates.length>1){const slot=document.createElement('div');slot.className='state-slot';parent.insertBefore(slot,alternates[0]);alternates.forEach(el=>slot.append(el));}
}
// Optional live figures: a lecture may export mount(stage,{reading,printing,builds}) to bind widgets after rendering.
if(typeof content.mount==='function'){try{await content.mount(stage,{reading,printing,builds:printing&&params.get('print')==='builds'});}catch(error){console.error(error);mathsErrors.push({tex:'mount',error:String(error)});}}
// Name each figure, widget, table, equation and code block after its slide, so the path of an element
// selected in a browser's annotation tool says which slide it is on (e.g. div#priors--figure1).
for(const scene of stage.querySelectorAll('.scene')){const count={};for(const el of scene.querySelectorAll('.widget,.diagram-scroll,.table-scroll,.formula-scroll,pre.code,figure')){if(el.id)continue;const kind=el.matches('.widget')?'widget':el.matches('.table-scroll')?'table':el.matches('.formula-scroll')?'maths':el.matches('pre')?'code':'figure';count[kind]=(count[kind]||0)+1;el.id=`${scene.id}--${kind}${count[kind]}`;}}
const elements=[...stage.querySelectorAll('.scene')];
function matches(spec,b){return String(spec).split(',').some(part=>{const [lo,hi]=part.split('-').map(Number);return hi===undefined?b===lo:b>=lo&&b<=hi;});}
function apply(el,b){el.dataset.build=b;el.querySelectorAll('[data-at]').forEach(x=>x.classList.toggle('reveal-hidden',b<Number(x.dataset.at)));el.querySelectorAll('[data-only]').forEach(x=>x.classList.toggle('reveal-hidden',!matches(x.dataset.only,b)));}
let current=0,build=1;
const fit=()=>document.documentElement.style.setProperty('--scale',Math.min(innerWidth/1280,innerHeight/720));
function goTo(id,b=1,hash=true){const i=typeof id==='number'?Math.max(0,Math.min(slides.length-1,id)):slides.findIndex(s=>s.id===id);if(i<0)return;current=i;build=Math.max(1,Math.min(slides[i].builds,Number(b)||1));elements.forEach((e,j)=>e.classList.toggle('current',i===j));apply(elements[i],build);document.querySelector('#position').textContent=`${i+1}/${slides.length} · ${build}/${slides[i].builds}`;document.querySelector('#notes').innerHTML=`<h3>${slides[i].title}</h3>${notesHTML(slides[i])}`;if(hash)history.replaceState(null,'',`#${slides[i].id}/${build}`);}
function fromHash(){const [id,b]=location.hash.slice(1).split('/');goTo(slides.some(s=>s.id===id)?id:0,b||1,false);}
function next(){if(build<slides[current].builds)goTo(current,build+1);else if(current<slides.length-1)goTo(current+1,1);}
function prev(){if(build>1)goTo(current,build-1);else if(current>0)goTo(current-1,slides[current-1].builds);}
function toggle(id){const e=document.querySelector(id);e.hidden=!e.hidden;}
const reset=()=>goTo(current,1);
// Present: full screen, the controls fade out and the cursor hides after a moment without the mouse; F toggles it,
// Esc (or the browser's own exit) leaves it. Where a browser has no full-screen API (iPhone), it still hides the chrome.
const root=document.documentElement,fsElement=()=>document.fullscreenElement||document.webkitFullscreenElement;
let wake=null,idleTimer=0;
function wakeControls(){document.body.classList.remove('idle');clearTimeout(idleTimer);idleTimer=setTimeout(()=>{if(!document.querySelector('.controls:hover'))document.body.classList.add('idle');},2500);}
function setPresenting(on){document.body.classList.toggle('presenting',on);const b=document.querySelector('[data-action="present"]');if(b){b.textContent=on?'Exit':'Present';b.setAttribute('aria-pressed',on);}if(on){navigator.wakeLock?.request('screen').then(l=>{wake=l;},()=>{});wakeControls();}else{wake?.release().catch(()=>{});wake=null;clearTimeout(idleTimer);document.body.classList.remove('idle');}fit();}
function present(){
 if(document.body.classList.contains('presenting')){if(fsElement())(document.exitFullscreen||document.webkitExitFullscreen).call(document);setPresenting(false);return;}
 document.querySelector('#notes').hidden=true;document.querySelector('#overview').hidden=true;setPresenting(true);
 const request=root.requestFullscreen||root.webkitRequestFullscreen;if(request)Promise.resolve(request.call(root)).catch(()=>{});
}
for(const type of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(type,()=>{if(!fsElement()&&document.body.classList.contains('presenting'))setPresenting(false);});
addEventListener('pointermove',e=>{if(e.pointerType==='mouse'&&document.body.classList.contains('presenting'))wakeControls();});
addEventListener('pointerdown',()=>{if(document.body.classList.contains('presenting'))wakeControls();});
// Swipe sideways to step through the reveals on a touch screen, unless the swipe starts on a control or a live figure.
let touch=null;
addEventListener('touchstart',e=>{touch=!reading&&!printing&&e.touches.length===1&&!e.target.closest('a,button,input,select,textarea,.widget,.panel')?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null;},{passive:true});
addEventListener('touchend',e=>{if(!touch)return;const t=e.changedTouches[0],dx=t.clientX-touch.x,dy=t.clientY-touch.y;touch=null;if(Math.abs(dx)>50&&Math.abs(dx)>1.5*Math.abs(dy))dx<0?next():prev();},{passive:true});
document.querySelector('#overview').innerHTML=`<h3>${esc(meta.title)}</h3><p>${meta.minutes} minute planned main route</p><dl>${(meta.sections||[]).filter(s=>s.minutes>0).map(s=>`<dt>${esc(s.title)}</dt><dd>${s.minutes} minutes</dd>`).join('')}</dl><ol>${slides.map((s,i)=>`${s.chapter&&s.chapter!==slides[i-1]?.chapter?`<li class="ov-chapter">${esc(s.chapter)}</li>`:''}<li><a href="#${s.id}/1" data-jump="${i}">${s.title}${s.optional?' (optional)':''}</a></li>`).join('')}</ol>`;
document.querySelector('#overview').addEventListener('click',e=>{const a=e.target.closest('[data-jump]');if(a){e.preventDefault();goTo(Number(a.dataset.jump),1);toggle('#overview');}});
document.querySelector('.controls').addEventListener('click',e=>{if(reading||printing)return;const a=e.target.closest('[data-action]')?.dataset.action;({next,prev,reset,notes:()=>toggle('#notes'),scenes:()=>toggle('#overview'),present,finish:()=>goTo(current,slides[current].builds)})[a]?.();});
addEventListener('keydown',e=>{
 if(reading||printing||e.target.closest('input,textarea,select')||e.metaKey||e.ctrlKey||e.altKey)return;
 if(['ArrowRight',' ','PageDown'].includes(e.key)){e.preventDefault();e.shiftKey?goTo(current+1,1):next();}
 else if(['ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();e.shiftKey?goTo(current-1,1):prev();}
 else if(e.key==='Home')goTo(0,1);else if(e.key==='End')goTo(slides.length-1,slides.at(-1).builds);
 else if(e.key.toLowerCase()==='n')toggle('#notes');else if(e.key.toLowerCase()==='o')toggle('#overview');else if(e.key.toLowerCase()==='r')reset();else if(e.key.toLowerCase()==='f')present();
 else if(e.key==='Escape'){document.querySelector('#notes').hidden=true;document.querySelector('#overview').hidden=true;if(document.body.classList.contains('presenting')&&!fsElement())setPresenting(false);}
});
addEventListener('hashchange',fromHash);addEventListener('resize',fit);fit();
if(reading||printing){
 document.body.classList.add(reading?'reading':'print');elements.forEach((el,i)=>apply(el,slides[i].builds));
 if(printing&&params.get('print')==='builds'){
  elements.forEach((el,i)=>{for(let b=1;b<slides[i].builds;b++){const clone=el.cloneNode(true);clone.id=`${slides[i].id}-build-${b}`;const prefix=`${slides[i].id}-${b}-`;for(const n of clone.querySelectorAll('[id]')){const old=n.id;n.id=prefix+old;for(const a of clone.querySelectorAll('[marker-end],[marker-start],[clip-path]'))for(const k of ['marker-end','marker-start','clip-path'])if(a.getAttribute(k)===`url(#${old})`)a.setAttribute(k,`url(#${prefix+old})`);}apply(clone,b);clone.querySelector('.page-number').textContent+=` · ${b}/${slides[i].builds}`;el.before(clone);}el.querySelector('.page-number').textContent+=` · ${slides[i].builds}/${slides[i].builds}`;});
 }
 document.querySelector('#read-link').href='./';document.querySelector('#read-link').textContent='Slides';
}else fromHash();
document.title=meta.title+(meta.series?' · '+meta.series:'');
window.lecture={meta,slides:slides.map(({body,...s})=>s),allSlides:allSlides.map(({body,...s})=>s),goTo,next,prev,reset,finish:()=>goTo(current,slides[current].builds),get current(){return {id:slides[current].id,index:current,build};},mathsErrors,notesRows};
await document.fonts.ready;window.deckReady=true;

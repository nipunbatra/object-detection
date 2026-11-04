// Figures drawn on the photos, the chart kit, and the three live figures (IoU, cell inspector, NMS).
// Every box, score and cell comes from data/science.json (scripts/science.py); nothing here invents a number.
import {palette,esc} from './shared/author.js';

export const MUTED='#68717B',AX='#AAB3BC',PAPER=palette.paper;
export const COL={target:palette.p,guess:palette.q,loss:palette.loss,data:palette.data,amber:palette.noise,green:palette.d,ink:palette.ink};
/** Fixed decimals with a true minus sign and no "−0.00". */
export const num=(v,n=2)=>{const s=Number(v).toFixed(n);return (/^-0(\.0*)?$/.test(s)?s.slice(1):s).replace('-','−');};
/** Thousands separators, as the slides write large counts. */
export const big=v=>Number(v).toLocaleString('en-US');
let uid=0;

/** A photo in its own pixel coordinates, with SVG drawn on top. view=[x,y,w,h] crops it. */
export function photo(name,W,H,inner,alt,{view=null,cls=''}={}){
 const vb=view?view.join(' '):`0 0 ${W} ${H}`;
 return `<div class="diagram-scroll photo-fig ${cls}"><svg viewBox="${vb}" role="img" aria-label="${esc(alt)}"><image href="figures/${name}.jpg" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none"/>${inner}</svg></div>`;
}
/** A rectangle from corners (x1, y1, x2, y2). */
export const rect=(b,{stroke=COL.guess,w=4,dash='',fill='none',op=1,extra=''}={})=>
 `<rect x="${(+b[0]).toFixed(1)}" y="${(+b[1]).toFixed(1)}" width="${(b[2]-b[0]).toFixed(1)}" height="${(b[3]-b[1]).toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="${w}"${dash?` stroke-dasharray="${dash}"`:''}${op<1?` opacity="${op}"`:''} ${extra}/>`;
/** A text label on a filled tab, as detectors draw their class and score. */
export function pill(x,y,text,{fill=COL.guess,color='#fff',size=26,anchor='start',below=false,maxX=Infinity}={}){
 const w=String(text).replace(/<[^>]+>/g,'').length*size*.56+18,h=size*1.35;
 let x0=anchor==='end'?x-w:anchor==='middle'?x-w/2:x,y0=below?y:y-h;
 x0=Math.max(0,Math.min(x0,maxX-w));if(y0<0)y0=y;  // stay inside the photo: slide left, or drop inside the box
 return `<g><rect x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="5" fill="${fill}"/><text x="${(x0+9).toFixed(1)}" y="${(y0+h*.74).toFixed(1)}" fill="${color}" font-size="${size}" font-weight="600">${text}</text></g>`;
}
/** Plain SVG text; content must already be safe. */
export const label=(x,y,s,{fill=MUTED,size=24,anchor='start',weight='',halo=false}={})=>
 `<text x="${(+x).toFixed(1)}" y="${(+y).toFixed(1)}" fill="${fill}" font-size="${size}" text-anchor="${anchor}"${weight?` font-weight="${weight}"`:''}${halo?` style="paint-order:stroke;stroke:${PAPER};stroke-width:7px;stroke-linejoin:round"`:''}>${s}</text>`;
export const line=(x1,y1,x2,y2,{stroke=MUTED,w=2,dash='',extra=''}={})=>`<line x1="${(+x1).toFixed(1)}" y1="${(+y1).toFixed(1)}" x2="${(+x2).toFixed(1)}" y2="${(+y2).toFixed(1)}" stroke="${stroke}" stroke-width="${w}"${dash?` stroke-dasharray="${dash}"`:''} ${extra}/>`;
/** An arrow with a head at (x2, y2). */
export function arrow(x1,y1,x2,y2,{stroke=COL.ink,w=3,head=14,both=false}={}){
 const a=Math.atan2(y2-y1,x2-x1),h=(x,y,t)=>`<path d="M${x},${y} L${(x-head*Math.cos(t-.42)).toFixed(1)},${(y-head*Math.sin(t-.42)).toFixed(1)} L${(x-head*Math.cos(t+.42)).toFixed(1)},${(y-head*Math.sin(t+.42)).toFixed(1)}Z" fill="${stroke}"/>`;
 return line(x1,y1,x2,y2,{stroke,w})+h(x2,y2,a)+(both?h(x1,y1,a+Math.PI):'');
}
/** Grid lines every s pixels over a W x H photo. */
export function gridLines(W,H,s,{stroke='#ffffff',w=1.2,op=.55}={}){
 let g='';for(let x=s;x<W;x+=s)g+=line(x,0,x,H,{stroke,w});for(let y=s;y<H;y+=s)g+=line(0,y,W,y,{stroke,w});
 return `<g opacity="${op}">${g}</g>`;
}
export const cell=(r,c,s,{fill=COL.target,op=.45,stroke='none',w=0}={})=>`<rect x="${c*s}" y="${r*s}" width="${s}" height="${s}" fill="${fill}" fill-opacity="${op}" stroke="${stroke}" stroke-width="${w}"/>`;
/** A heat map of one score per cell (rows x cols), drawn as tinted squares. */
export function heat(map,s,{color=COL.guess,max=1,min=.02}={}){
 let g='';map.forEach((row,r)=>row.forEach((v,c)=>{if(v>=min)g+=cell(r,c,s,{fill:color,op:Math.min(.85,.12+.73*v/max)});}));return g;
}
export const svg=(W,H,inner,alt,cls='plot wsvg')=>`<svg class="${cls}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(alt)}">${inner}</svg>`;
export const fig=(W,H,inner,alt)=>`<div class="diagram-scroll">${svg(W,H,inner,alt)}</div>`;
export const widget=(name,alt)=>`<div class="widget" data-widget="${name}" role="group" aria-label="${esc(alt)}"></div>`;

/** One plotting panel with fixed axes. */
export function panel(o){
 const ox=o.ox??0,oy=o.oy??0,W=o.W??600,H=o.H??320,L=o.L??64,R=o.R??14,T=o.T??30,B=o.B??56,fs=o.fs??21;
 const {xMin,xMax}=o,yMin=o.yMin??0,yMax=o.yMax;
 const x=v=>ox+L+(v-xMin)/(xMax-xMin)*(W-L-R),y=v=>oy+H-B-(v-yMin)/(yMax-yMin)*(H-T-B);
 const tick=v=>String(+Number(v).toFixed(2)).replace('-','−');
 let axes=line(ox+L,oy+H-B,ox+W-R,oy+H-B,{stroke:AX})+line(ox+L,oy+T,ox+L,oy+H-B,{stroke:AX});
 for(const v of o.ticksX||[])axes+=label(x(v),oy+H-B+26,(o.fmtX||tick)(v),{size:fs,anchor:'middle'});
 for(const v of o.ticksY||[])axes+=label(ox+L-10,y(v)+7,(o.fmtY||tick)(v),{size:fs,anchor:'end'});
 if(o.xLabel)axes+=label(ox+W-R,oy+H-8,o.xLabel,{size:fs,anchor:'end'});
 if(o.yLabel)axes+=label(ox+L+8,oy+T-8,o.yLabel,{size:fs});
 return {x,y,axes};
}

// ---------------------------------------------------------------------------------------- live figures
const svgPoint=(svgEl,e)=>{const p=svgEl.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svgEl.getScreenCTM().inverse());};
const area=b=>Math.max(0,b[2]-b[0])*Math.max(0,b[3]-b[1]);
export function iouParts(a,b){const i=[Math.max(a[0],b[0]),Math.max(a[1],b[1]),Math.min(a[2],b[2]),Math.min(a[3],b[3])],I=area(i),U=area(a)+area(b)-I;return {i,I,U,iou:I/U};}

/** Drag the purple box over the dog (or its corner to resize it) and watch the IoU. */
function iouPlay(el,ctx,S){
 const {W,H}=S.photo,gt=S.dog.xyxy,start=[...S.iou_practice.guess];
 const draw=b=>{const p=iouParts(gt,b);return `${rect(gt,{stroke:COL.target,w:5})}${p.I>0?rect(p.i,{stroke:'none',w:0,fill:COL.guess,op:.28}):''}${rect(b,{stroke:COL.guess,w:5,extra:'data-drag="move" style="cursor:move" fill="#8B2CDE" fill-opacity=".04"'})}<circle cx="${b[2]}" cy="${b[3]}" r="14" fill="${COL.guess}" stroke="#fff" stroke-width="3" data-drag="size" style="cursor:nwse-resize"/>`;};
 const readout=b=>{const p=iouParts(gt,b);return `<div class="kv"><dt>overlap</dt><dd>${big(Math.round(p.I))} px²</dd><dt>union</dt><dd>${big(Math.round(p.U))} px²</dd><dt>IoU</dt><dd><b class="q">${num(p.iou,3)}</b></dd></div>`;};
 // the two answers to the slide's question, each with the reason its IoU comes out as it does
 const A=S.iou_answers,kept=gt[3]-A.headless.box[1],why={loose:`Loose, but the whole dog is inside. The box covers ${big(area(A.loose.box))} px², twice the dog box’s ${big(area(gt))} px², so IoU = 1/2.`,
  headless:`Snug on the body, but the whole head is cut off. The box lies inside the dog’s box and keeps ${kept} of its ${gt[3]-gt[1]} px of height, so IoU = ${kept}/${gt[3]-gt[1]} = ${num(A.headless.iou,2)}.`};
 if(ctx.printing){el.innerHTML=`<div class="columns" style="grid-template-columns:1.6fr 1fr">${photo('cat-dog',W,H,draw(start),'The dog box and a guess')}<div class="w-panel">${readout(start)}<p class="w-hint" style="margin-top:14px">IoU ${num(A.loose.iou,2)} that looks fine. ${why.loose}</p><p class="w-hint" style="margin-top:8px">IoU ${num(A.headless.iou,2)} that looks wrong. ${why.headless}</p></div></div>`;return;}
 el.innerHTML=`<div class="columns" style="grid-template-columns:1.6fr 1fr"><div class="w-fig">${photo('cat-dog',W,H,'<g class="live"></g>','Drag the purple box; its IoU with the teal box updates')}</div><div class="w-panel"><div class="w-out"></div><p class="w-hint" style="margin-top:14px">Drag the purple box, or its corner dot. Teal is our box for the dog.</p><div class="w-controls" style="margin-top:12px"><button type="button" class="w-reset">Reset</button><button type="button" class="w-snap">Snap onto the dog</button></div><div class="w-controls" style="margin-top:8px"><button type="button" class="w-ans" data-k="loose">IoU 0.5 that looks fine</button><button type="button" class="w-ans" data-k="headless">IoU 0.7 that looks wrong</button></div><p class="w-hint w-why" style="margin-top:10px"></p></div></div>`;
 const svgEl=el.querySelector('svg'),g=el.querySelector('.live'),out=el.querySelector('.w-out'),note=el.querySelector('.w-why');
 let b=[...start],drag=null;
 const show=(k='')=>{g.innerHTML=draw(b);out.innerHTML=readout(b);note.textContent=why[k]||'';};
 svgEl.addEventListener('pointerdown',e=>{const t=e.target.closest('[data-drag]');if(!t)return;e.preventDefault();svgEl.setPointerCapture(e.pointerId);drag={kind:t.dataset.drag,p:svgPoint(svgEl,e),b:[...b]};});
 svgEl.addEventListener('pointermove',e=>{if(!drag)return;const p=svgPoint(svgEl,e),dx=p.x-drag.p.x,dy=p.y-drag.p.y,o=drag.b;
  if(drag.kind==='move'){const w=o[2]-o[0],h=o[3]-o[1],x=Math.max(0,Math.min(W-w,o[0]+dx)),y=Math.max(0,Math.min(H-h,o[1]+dy));b=[x,y,x+w,y+h];}
  else b=[o[0],o[1],Math.max(o[0]+20,Math.min(W,o[2]+dx)),Math.max(o[1]+20,Math.min(H,o[3]+dy))];
  show();});
 const end=()=>{drag=null;};svgEl.addEventListener('pointerup',end);svgEl.addEventListener('pointercancel',end);
 el.querySelector('.w-reset').addEventListener('click',()=>{b=[...start];show();});
 el.querySelector('.w-snap').addEventListener('click',()=>{b=[...gt];show();});
 for(const btn of el.querySelectorAll('.w-ans'))btn.addEventListener('click',()=>{b=[...A[btn.dataset.k].box];show(btn.dataset.k);});
 show();
}

/** Point at any cell of the 30 x 20 grid to see the record the network wrote there. */
function cellInspector(el,ctx,S){
 const {W,H}=S.photo,s=S.grid.stride,recs=S.grid.records;
 const at=(r,c)=>recs[r*S.grid.cols+c];
 const best=S.grid.records.reduce((m,x)=>{(m[x[0]]??=[])[x[1]]=x[7];return m;},[]);
 const base=gridLines(W,H,s,{op:.45})+heat(best,s,{color:COL.guess,min:.05});
 const info=(r,c)=>{const x=at(r,c),box=[x[2],x[3],x[4],x[5]];const top=[[x[6],x[7]],[x[8],x[9]],[x[10],x[11]]];
  return {box,html:`<p><b>Cell: row ${r}, column ${c}</b></p><p class="muted">centre (${(c+.5)*s}, ${(r+.5)*s}) px</p><table style="font-size:20px;margin-top:8px"><tbody>${top.map(([n,p])=>`<tr><td>${esc(n)}</td><td style="text-align:right">${num(p,p<.01?4:3)}</td></tr>`).join('')}</tbody></table><p class="muted" style="margin-top:8px">its box: (${box.map(v=>Math.round(v)).join(', ')})</p>`};};
 const draw=(r,c)=>{const {box}=info(r,c);return cell(r,c,s,{fill:'none',op:0,stroke:'#fff',w:5})+rect(box,{stroke:COL.guess,w:4,dash:'10 6'})+`<circle cx="${(c+.5)*s}" cy="${(r+.5)*s}" r="7" fill="#fff" stroke="${COL.guess}" stroke-width="3"/>`;};
 if(ctx.printing){el.innerHTML=`<div class="columns" style="grid-template-columns:1.6fr 1fr">${photo('cat-dog',W,H,base+draw(10,18),'Cell (10, 18) and its box')}<div class="w-panel">${info(10,18).html}</div></div>`;return;}
 el.innerHTML=`<div class="columns" style="grid-template-columns:1.6fr 1fr"><div class="w-fig">${photo('cat-dog',W,H,base+'<g class="live"></g>','Point at a cell to read its record')}</div><div class="w-panel"><div class="w-out"></div><p class="w-hint" style="margin-top:12px">Move over the photo. Purple shade: the cell’s best class score.</p></div></div>`;
 const svgEl=el.querySelector('svg'),g=el.querySelector('.live'),out=el.querySelector('.w-out');
 const show=(r,c)=>{g.innerHTML=draw(r,c);out.innerHTML=info(r,c).html;};
 svgEl.addEventListener('pointermove',e=>{const p=svgPoint(svgEl,e),c=Math.floor(p.x/s),r=Math.floor(p.y/s);if(r>=0&&r<S.grid.rows&&c>=0&&c<S.grid.cols)show(r,c);});
 show(10,18);
}

/** The street photo's real candidates: move the two thresholds, or step through the greedy loop. */
function nmsPlay(el,ctx,S){
 const W=1280,H=704,C=S.nms_street;
 const col={person:COL.guess,bicycle:COL.amber,car:COL.data,dog:COL.target};
 const run=(sc,thr,aware,steps=Infinity)=>{
  const left=C.filter(k=>k.score>=sc).sort((a,b)=>b.score-a.score),keep=[],gone=new Set();let n=0;
  for(const k of left){if(gone.has(k))continue;if(n>=steps)break;keep.push(k);n++;for(const j of left)if(j!==k&&!gone.has(j)&&!keep.includes(j)&&(!aware||j.name===k.name)&&iouParts(k.box,j.box).iou>thr)gone.add(j);}
  return {left,keep,gone};
 };
 const draw=({left,keep,gone})=>left.map(k=>keep.includes(k)?'':gone.has(k)?rect(k.box,{stroke:MUTED,w:2,dash:'6 6',op:.6}):rect(k.box,{stroke:col[k.name]||COL.ink,w:2,op:.55})).join('')+keep.map(k=>rect(k.box,{stroke:col[k.name]||COL.ink,w:5})+pill(k.box[0],k.box[1],`${esc(k.name)} ${num(k.score)}`,{fill:col[k.name]||COL.ink,size:22})).join('');
 const view=[60,300,1160,404];
 if(ctx.printing){el.innerHTML=photo('street',W,H,draw(run(.25,.7,true)),'NMS on the street photo',{view});return;}
 el.innerHTML=`<div class="w-fig">${photo('street',W,H,'<g class="live"></g>','Candidates kept and removed by NMS',{view})}</div><div class="w-controls"><label>score ≥ <input class="w-sc" type="range" min="0.05" max="0.95" step="0.05" value="0.25"><span class="w-readout w-sc-out"></span></label><label>IoU &gt; <input class="w-thr" type="range" min="0" max="1" step="0.05" value="0.7"><span class="w-readout w-thr-out"></span></label><button type="button" class="w-aware" aria-pressed="true">per class</button><button type="button" class="w-step">Step</button><button type="button" class="w-all">All</button></div><div class="w-count" style="font-size:19px;color:var(--muted);font-variant-numeric:tabular-nums"></div>`;
 const g=el.querySelector('.live'),sc=el.querySelector('.w-sc'),thr=el.querySelector('.w-thr'),aw=el.querySelector('.w-aware'),cnt=el.querySelector('.w-count');
 let steps=Infinity;
 const show=()=>{const a=aw.getAttribute('aria-pressed')==='true',res=run(+sc.value,+thr.value,a,steps);g.innerHTML=draw(res);
  el.querySelector('.w-sc-out').textContent=num(sc.value);el.querySelector('.w-thr-out').textContent=num(thr.value);
  const done=steps===Infinity||res.keep.length+res.gone.size>=res.left.length;
  cnt.textContent=`${res.left.length} candidates above the score threshold → ${done?'':'so far '}${res.keep.length} kept, ${res.gone.size} removed${done?'':` (round ${res.keep.length})`}`;};
 for(const i of [sc,thr]){i.addEventListener('input',()=>{steps=Infinity;show();});i.addEventListener('change',()=>i.blur());}
 aw.addEventListener('click',()=>{aw.setAttribute('aria-pressed',aw.getAttribute('aria-pressed')==='true'?'false':'true');aw.textContent=aw.getAttribute('aria-pressed')==='true'?'per class':'all classes together';steps=Infinity;show();});
 el.querySelector('.w-step').addEventListener('click',()=>{steps=steps===Infinity?1:steps+1;show();});
 el.querySelector('.w-all').addEventListener('click',()=>{steps=Infinity;show();});
 show();
}

/** Drag a box over the courtyard: the cell that holds its centre lights up and writes the box's target record. */
function targetPlay(el,ctx,S){
 const {W,H}=S.photo,objs={dog:S.dog.xyxy,cat:S.cat.xyxy},grids=[[320,'3 × 2'],[160,'6 × 4'],[32,'30 × 20']];
 let s=320,name='dog',b=[...objs.dog],drag=null;
 const rec=b=>{const cx=(b[0]+b[2])/2,cy=(b[1]+b[3])/2,r=Math.floor(cy/s),c=Math.floor(cx/s);
  return {cx,cy,r,c,v:[1,cx/s-c,cy/s-r,(b[2]-b[0])/s,(b[3]-b[1])/s,name==='cat'?1:0,name==='dog'?1:0]};};
 const draw=b=>{const {cx,cy,r,c}=rec(b),x0=c*s,y0=r*s,coarse=s>=160;
  return gridLines(W,H,s,{stroke:'#fff',w:coarse?4:1.5,op:.85})+`<rect x="${x0}" y="${y0}" width="${s}" height="${s}" fill="${COL.target}" fill-opacity=".32" stroke="#fff" stroke-width="${coarse?6:3}"/>`+
   line(x0,cy,cx,cy,{stroke:COL.ink,w:3,dash:'8 6'})+line(cx,y0,cx,cy,{stroke:COL.ink,w:3,dash:'8 6'})+
   rect(b,{stroke:COL.target,w:5,extra:'data-drag="move" style="cursor:move" fill="#0F766E" fill-opacity=".06"'})+
   `<circle cx="${cx}" cy="${cy}" r="10" fill="${COL.target}" stroke="#fff" stroke-width="3" pointer-events="none"/>`+
   `<circle cx="${b[2]}" cy="${b[3]}" r="14" fill="${COL.target}" stroke="#fff" stroke-width="3" data-drag="size" style="cursor:nwse-resize"/>`;};
 const keys=['object?','b<sub>x</sub>','b<sub>y</sub>','b<sub>w</sub>','b<sub>h</sub>','cat','dog'];
 const readout=b=>{const {r,c,v}=rec(b),n=(W/s)*(H/s);
  return `<p><b>cell (${r}, ${c})</b> holds the centre and writes:</p><div class="ycol sm">${v.map((x,i)=>`<span>${keys[i]}</span><div class="t">${i&&i<5?num(x,2):x}</div>`).join('')}</div>`+
   `<p class="w-hint" style="margin-top:8px">The other ${big(n-1)} cells: object? 0, the rest “?”.</p>`;};
 const controls=`<div class="w-controls">${grids.map(([z,t])=>`<button type="button" class="w-grid" data-s="${z}" aria-pressed="${z===s}">${t}</button>`).join('')}</div>`+
  `<div class="w-controls" style="margin-top:6px"><button type="button" class="w-obj" data-o="dog">the dog</button><button type="button" class="w-obj" data-o="cat">the cat</button></div>`;
 if(ctx.printing){el.innerHTML=`<div class="columns" style="grid-template-columns:1.5fr 1fr">${photo('cat-dog',W,H,draw(b),'The dog’s box on the 3 by 2 grid, its cell shaded')}<div class="w-panel">${readout(b)}</div></div>`;return;}
 el.innerHTML=`<div class="columns" style="grid-template-columns:1.5fr 1fr"><div class="w-fig">${photo('cat-dog',W,H,'<g class="live"></g>','Drag the box; the cell that holds its centre lights up')}</div><div class="w-panel"><div class="w-out"></div>${controls}</div></div>`;
 const svgEl=el.querySelector('svg'),g=el.querySelector('.live'),out=el.querySelector('.w-out');
 const show=()=>{g.innerHTML=draw(b);out.innerHTML=readout(b);for(const t of el.querySelectorAll('.w-grid'))t.setAttribute('aria-pressed',String(+t.dataset.s===s));};
 svgEl.addEventListener('pointerdown',e=>{const t=e.target.closest('[data-drag]');if(!t)return;e.preventDefault();svgEl.setPointerCapture(e.pointerId);drag={kind:t.dataset.drag,p:svgPoint(svgEl,e),b:[...b]};});
 svgEl.addEventListener('pointermove',e=>{if(!drag)return;const p=svgPoint(svgEl,e),dx=p.x-drag.p.x,dy=p.y-drag.p.y,o=drag.b;
  if(drag.kind==='move'){const w=o[2]-o[0],h=o[3]-o[1],x=Math.max(0,Math.min(W-w,o[0]+dx)),y=Math.max(0,Math.min(H-h,o[1]+dy));b=[x,y,x+w,y+h];}
  else b=[o[0],o[1],Math.max(o[0]+24,Math.min(W,o[2]+dx)),Math.max(o[1]+24,Math.min(H,o[3]+dy))];
  show();});
 const end=()=>{drag=null;};svgEl.addEventListener('pointerup',end);svgEl.addEventListener('pointercancel',end);
 for(const t of el.querySelectorAll('.w-grid'))t.addEventListener('click',()=>{s=+t.dataset.s;show();});
 for(const t of el.querySelectorAll('.w-obj'))t.addEventListener('click',()=>{name=t.dataset.o;b=[...objs[name]];show();});
 show();
}

/** AP on real detections: YOLOv8n's person boxes on the eight photos, ranked by score, against the annotated people.
 Move the IoU an overlap needs and how far down the list to keep; the curve, its envelope and AP follow. */
function apPlay(el,ctx,S){
 const D=S.ap_play,G=D.gt,dets=D.dets,nG=G.length,thrs=D.thresholds;
 const run=t=>{const claimed=new Set();let tp=0,fp=0;
  const rows=dets.map(d=>{let best=0,bi=-1;G.forEach((g,i)=>{if(g.photo!==d.photo||claimed.has(i))return;const v=iouParts(g.box,d.box).iou;if(v>best){best=v;bi=i;}});
   const hit=bi>=0&&best>=t-1e-9;if(hit){claimed.add(bi);tp++;}else fp++;return {hit,iou:best,score:d.score,photo:d.photo,tp,fp,p:tp/(tp+fp),r:tp/nG};});
  const env=rows.map(x=>x.p);for(let i=env.length-2;i>=0;i--)env[i]=Math.max(env[i],env[i+1]);
  let s=0;for(let i=0;i<=100;i++){const k=rows.findIndex(x=>x.r>=i/100);s+=k<0?0:env[k];}
  return {rows,env,ap:s/101};};
 const res=thrs.map(run),mean=res.reduce((a,x)=>a+x.ap,0)/res.length;
 const P=panel({W:520,H:320,L:62,B:52,T:34,R:16,xMin:0,xMax:1,yMin:0,yMax:1.05,ticksX:[0,.5,1],ticksY:[0,.5,1],xLabel:'recall',yLabel:'precision',fs:19});
 const plot=(R,k)=>{let d=`M${P.x(0)},${P.y(R.env[0])}`;R.rows.forEach((x,i)=>{d+=` L${P.x(x.r)},${P.y(R.env[i])}`;if(i+1<R.rows.length)d+=` L${P.x(x.r)},${P.y(R.env[i+1])}`;});
  const last=R.rows[R.rows.length-1],cur=R.rows[k-1];
  return P.axes+`<path d="${d} L${P.x(last.r)},${P.y(0)} L${P.x(0)},${P.y(0)}Z" fill="${COL.guess}" fill-opacity=".14"/>`+
   `<polyline points="${R.rows.map(x=>`${P.x(x.r).toFixed(1)},${P.y(x.p).toFixed(1)}`).join(' ')}" fill="none" stroke="${MUTED}" stroke-width="1.5" stroke-dasharray="5 4"/>`+
   `<path d="${d}" fill="none" stroke="${COL.guess}" stroke-width="3.5"/><circle cx="${P.x(cur.r)}" cy="${P.y(cur.p)}" r="10" fill="${cur.hit?COL.green:COL.loss}" stroke="#fff" stroke-width="3"/>`;};
 const chips=(R,k)=>R.rows.map((x,i)=>`<rect x="${4+i*16}" y="8" width="13" height="26" rx="3" fill="${x.hit?COL.green:COL.loss}" opacity="${i<k?1:.28}"><title>#${i+1}, score ${num(x.score)}: ${x.hit?'TP':'FP'} (best IoU ${num(x.iou)})</title></rect>`).join('')+
  `<path d="M${4+(k-1)*16+6.5},40 l-7,12 h14Z" fill="${COL.ink}"/>`+label(4,74,'rank 1',{size:16})+label(4+(R.rows.length-1)*16+13,74,`rank ${R.rows.length}`,{size:16,anchor:'end'});
 const bars=t=>{const bw=30,gap=6,h=120,x0=10,y0=12;let g='';res.forEach((x,i)=>{const bh=x.ap*h,on=Math.abs(thrs[i]-t)<1e-9;
   g+=`<rect x="${x0+i*(bw+gap)}" y="${y0+h-bh}" width="${bw}" height="${bh}" fill="${on?COL.guess:'#C9D0D7'}"/>`+label(x0+i*(bw+gap)+bw/2,y0+h+20,num(thrs[i]).replace(/^0/,''),{size:14,anchor:'middle',fill:on?COL.ink:MUTED});});
  const my=y0+h-mean*h;return g+line(x0-4,my,x0+10*(bw+gap),my,{stroke:COL.ink,w:2,dash:'6 4'})+label(x0+10*(bw+gap)+2,my+5,`mean ${num(mean,3)}`,{size:15,fill:COL.ink});};
 const readout=(R,k,t)=>{const c=R.rows[k-1];return `<dl class="kv"><dt>top ${k}</dt><dd>TP ${c.tp}, FP ${c.fp}</dd><dt>precision</dt><dd>${num(c.p)}</dd><dt>recall</dt><dd>${num(c.r)}</dd><dt>AP at IoU ${num(t)}</dt><dd><b class="q">${num(R.ap)}</b></dd></dl>`;};
 const view=(t,k)=>{const R=res[thrs.findIndex(x=>Math.abs(x-t)<1e-9)];return {plot:plot(R,k),chips:chips(R,k),bars:bars(t),out:readout(R,k,t)};};
 const svgs=(v)=>`${fig(520,320,v.plot,'Precision against recall, the envelope and the area under it')}${fig(620,80,v.chips,'The ranked detections, green for true positives and red for false positives')}`;
 if(ctx.printing){const v=view(.85,17);el.innerHTML=`<div class="columns" style="grid-template-columns:1.1fr 1fr"><div class="w-fig">${svgs(v)}</div><div class="w-panel">${v.out}${fig(490,160,v.bars,'AP at each IoU threshold')}</div></div>`;return;}
 el.innerHTML=`<div class="columns" style="grid-template-columns:1.1fr 1fr"><div class="w-fig"></div><div class="w-panel"><div class="w-controls" style="flex-direction:column;align-items:flex-start;gap:6px"><label>IoU needed ≥ <input class="w-t" type="range" min="0.5" max="0.95" step="0.05" value="0.5"><span class="w-readout w-t-out"></span></label><label>keep the top <input class="w-k" type="range" min="1" max="${dets.length}" step="1" value="17"><span class="w-readout w-k-out"></span></label></div><div class="w-out"></div><div class="w-bars"></div></div></div>`;
 const fig_=el.querySelector('.w-fig'),out=el.querySelector('.w-out'),bar=el.querySelector('.w-bars'),ti=el.querySelector('.w-t'),ki=el.querySelector('.w-k');
 const show=()=>{const t=+ti.value,k=+ki.value,v=view(t,k);fig_.innerHTML=svgs(v);out.innerHTML=v.out;bar.innerHTML=fig(490,160,v.bars,'AP at each IoU threshold');el.querySelector('.w-t-out').textContent=num(t);el.querySelector('.w-k-out').textContent=k;};
 for(const i of [ti,ki]){i.addEventListener('input',show);i.addEventListener('change',()=>i.blur());}
 show();
}

export function mount(stage,ctx,S){
 const fns={'iou-play':iouPlay,'cell-inspector':cellInspector,'nms-play':nmsPlay,'target-play':targetPlay,'ap-play':apPlay};
 for(const el of stage.querySelectorAll('.widget[data-widget]')){const f=fns[el.dataset.widget];if(!f)throw new Error('Unknown widget '+el.dataset.widget);f(el,ctx,S);}
}

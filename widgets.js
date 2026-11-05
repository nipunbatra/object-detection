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
 const base=gridLines(W,H,s,{op:.55});
 const info=(r,c)=>{const x=at(r,c),box=[x[2],x[3],x[4],x[5]];const top=[[x[6],x[7]],[x[8],x[9]],[x[10],x[11]]];
  return {box,html:`<p><b>cell (${r}, ${c})</b> writes a box, dashed, and 80 class scores, one per COCO class, each from 0 to 1:</p>${scoreStrip(S.grid.top[r*S.grid.cols+c],S.cell.names,{W:460,bh:70,size:17,alt:`Cell (${r}, ${c})’s 80 class scores`})}<p style="margin-top:4px"><span class="muted">highest:</span> ${top.map(([n,p])=>`${esc(n)} ${p<.01?'&lt; 0.01':num(p,2)}`).join(' · ')}</p>`};};
 const draw=(r,c)=>{const {box}=info(r,c);return cell(r,c,s,{fill:'none',op:0,stroke:'#fff',w:5})+rect(box,{stroke:COL.guess,w:4,dash:'10 6'})+`<circle cx="${(c+.5)*s}" cy="${(r+.5)*s}" r="7" fill="#fff" stroke="${COL.guess}" stroke-width="3"/>`;};
 const picks=S.grid.samples,where={dog:'the dog',cat:'the cat',plant:'a plant',wall:'the wall',floor:'the floor'};
 if(ctx.printing){el.innerHTML=`<div class="columns" style="grid-template-columns:1.6fr 1fr">${photo('cat-dog',W,H,base+draw(10,18),'Cell (10, 18) and its box')}<div class="w-panel">${info(10,18).html}</div></div>`;return;}
 el.innerHTML=`<div class="columns" style="grid-template-columns:1.6fr 1fr"><div class="w-fig">${photo('cat-dog',W,H,base+'<g class="live"></g>','Point at a cell to read its record')}</div><div class="w-panel"><div class="w-controls">${picks.map(([k,[r,c]])=>`<button type="button" class="w-pick" data-r="${r}" data-c="${c}">${where[k]}</button>`).join('')}</div><div class="w-out" style="margin-top:12px"></div><p class="w-hint" style="margin-top:12px">Or move over the photo to pick any cell.</p></div></div>`;
 const svgEl=el.querySelector('svg'),g=el.querySelector('.live'),out=el.querySelector('.w-out');
 const show=(r,c)=>{g.innerHTML=draw(r,c);out.innerHTML=info(r,c).html;for(const b of el.querySelectorAll('.w-pick'))b.setAttribute('aria-pressed',String(+b.dataset.r===r&&+b.dataset.c===c));};
 for(const b of el.querySelectorAll('.w-pick'))b.addEventListener('click',()=>show(+b.dataset.r,+b.dataset.c));
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
  return `<p><b>cell (${r}, ${c})</b> holds the centre. Its ground truth:</p><div class="ycol sm">${v.map((x,i)=>`<span>${keys[i]}</span><div class="t">${i&&i<5?num(x,2):x}</div>`).join('')}</div>`+
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

/** Tabs placed one by one at the first spot that hits no earlier tab: above a box's left or right end, below it,
 inside its top corners, or beside it. items: {box, text, fill}; bounds [x, y, w, h] keeps tabs in view. */
export function tabs(items,{size=28,bounds=null}={}){
 const placed=[],h=size*1.35;let out='';
 for(const it of items){const b=it.box,w=String(it.text).replace(/<[^>]+>/g,'').length*size*.56+18;
  const spots=[[b[0],b[1]-h],[b[2]-w,b[1]-h],[b[0],b[3]],[b[2]-w,b[3]],[b[0],b[1]],[b[2]-w,b[1]],[b[2]+4,b[1]],[b[0]-w-4,b[1]]];
  const fits=([x,y])=>(!bounds||(x>=bounds[0]&&y>=bounds[1]&&x+w<=bounds[0]+bounds[2]&&y+h<=bounds[1]+bounds[3]))&&!placed.some(q=>x<q[0]+q[2]&&q[0]<x+w&&y<q[1]+q[3]&&q[1]<y+h);
  const s=spots.find(fits)||spots[0];placed.push([s[0],s[1],w,h]);
  out+=`<g><rect x="${s[0].toFixed(1)}" y="${s[1].toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="5" fill="${it.fill}"/><text x="${(s[0]+9).toFixed(1)}" y="${(s[1]+h*.74).toFixed(1)}" fill="#fff" font-size="${size}" font-weight="600">${it.text}</text></g>`;}
 return out;}
/** A cell's 80 class scores as 80 bars, one per COCO class in COCO's order, each as tall as its score (1 = the
 dashed line). top holds the cell's highest scores as [class index, score]; every other class scores under 0.001
 (science.py checks), too little to see. box, if given, puts the four box numbers in front. */
export function scoreStrip(top,names,{W=1100,bh=110,box=null,size=19,alt='A cell’s 80 class scores as bars'}={}){
 const sc=Array(80).fill(0);top.forEach(([i,v])=>sc[i]=v);
 const x0=box?300:44,bw=(W-x0-14)/80,yb=34+bh,best=top[0][0];let g='';
 if(box)box.forEach((v,i)=>{const x=6+i*70;g+=`<rect x="${x}" y="${yb-62}" width="62" height="62" rx="6" fill="#fff" stroke="${COL.guess}" stroke-width="3"/>`+
  label(x+31,yb-37,`b<tspan dy="5" font-size="${Math.round(size*.7)}">${'xywh'[i]}</tspan>`,{size,anchor:'middle',fill:COL.guess,weight:700})+label(x+31,yb-10,v,{size:size-2,anchor:'middle',fill:COL.ink});});
 if(box)g+=label(6,yb-76,'the box, in cell units',{size:size-2,fill:COL.guess,weight:650});
 g+=line(x0,34,W-14,34,{stroke:'#AAB3BC',w:1.2,dash:'5 4'})+label(x0-8,40,'1',{size:size-3,anchor:'end'})+line(x0,yb,W-14,yb,{stroke:'#AAB3BC',w:1.5})+label(x0-8,yb+5,'0',{size:size-3,anchor:'end'});
 sc.forEach((v,i)=>{const h=Math.max(4,v*bh);g+=`<rect x="${(x0+i*bw+bw*.14).toFixed(1)}" y="${(yb-h).toFixed(1)}" width="${(bw*.72).toFixed(1)}" height="${h.toFixed(1)}" fill="${i===best&&v>=.01?COL.guess:'#8C96A0'}"/>`;});
 const bx=x0+best*bw+bw/2,bv=sc[best];
 const mid=(x0+W-14)/2,lx=bv>=.01?Math.min(Math.max(bx,x0+70),W-84):mid;
 g+=label(lx,bv>=.01?yb-bv*bh-8:yb-22,bv>=.01?`${names[best]} ${num(bv,2)}`:`highest: ${names[best]}, under 0.01`,{size,anchor:'middle',fill:bv>=.01?COL.guess:COL.ink,weight:650,halo:true});
 g+=label(x0,yb+24,names[0],{size:size-3})+label(W-14,yb+24,names[79],{size:size-3,anchor:'end'})+label((x0+W-14)/2,yb+24,'80 classes, in COCO’s order',{size:size-3,anchor:'middle'});
 return fig(W,yb+34,g,alt);}

/** The teaching example's verdicts at IoU threshold t: for each box in score order, the dog it claims (or -1). */
export function teachMatch(T,t=.5){const c=new Set();return T.dets.map((d,i)=>{let bj=-1,bv=0;T.iou[i].forEach((x,j)=>{if(!c.has(j)&&x>=t-1e-9&&x>bv){bv=x;bj=j;}});if(bj>=0)c.add(bj);return bj;});}
/** The teaching photo's boxes: the dogs (teal; amber with "FN" when missed and fn is set), then the detections up to
 rank upto. Judged boxes are green (TP) or red (FP); unjudged ones purple with their rank; boxes under the score cut
 are grey and unlabelled. current thickens one box. */
export function teachSVG(T,{upto=T.dets.length,judge=true,t=.5,cut=0,current=-1,fn=false,dogs=true,size=30}={}){
 const m=teachMatch(T,t),kept=T.dets.map((d,i)=>i<upto&&d.score>=cut-1e-9),found=new Set(m.filter((j,i)=>kept[i]&&j>=0));
 let g='';const tb=[];
 T.dets.forEach((d,i)=>{if(i>=upto)return;const on=kept[i],col=!on?'#9AA3AD':!judge?COL.guess:m[i]>=0?COL.green:COL.loss;
  g+=rect(d.box,{stroke:col,w:i===current?8:on?4.5:3,dash:on?'':'10 8',op:on?1:.75});
  if(on)tb.push({box:d.box,text:judge?`${m[i]>=0?'TP':'FP'} ${num(d.score,2)}`:`#${d.rank} ${num(d.score,2)}`,fill:col});});
 if(dogs)T.gt.forEach((d,j)=>{const miss=fn&&!found.has(j);g=rect(d.box,{stroke:miss?COL.amber:COL.target,w:miss?5:3,dash:'12 7'})+g;
  tb.push({box:d.box,text:miss?`${d.id}: FN`:d.id,fill:miss?COL.amber:COL.target});});
 return g+tabs(tb,{size,bounds:T.view});}

/** The crowd photo with every person's centre: choose the grid; a cell holding two or more centres turns red,
 because one record per cell can describe only one of those people. */
function crowdGrid(el,ctx,S){
 const W=1280,H=704,C=S.crowd_cells,cents=C.centres,boxes=C.boxes,grids=[[3,2],[5,3],[10,6],[20,11],[40,22]];
 const run=([n,m])=>{const cw=W/n,ch=H/m,cells=new Map();cents.forEach((q,i)=>{const k=`${Math.floor(q[1]/ch)},${Math.floor(q[0]/cw)}`;if(!cells.has(k))cells.set(k,[]);cells.get(k).push(i);});return {cw,ch,cells};};
 const draw=g=>{const [n,m]=g,{cw,ch,cells}=run(g),thin=n>=20;let s='';
  for(let i=1;i<n;i++)s+=line(i*cw,0,i*cw,H,{stroke:'#fff',w:thin?1.2:4});for(let j=1;j<m;j++)s+=line(0,j*ch,W,j*ch,{stroke:'#fff',w:thin?1.2:4});
  const shared=new Set();for(const [k,ids] of cells){const [r,c]=k.split(',').map(Number),bad=ids.length>1;if(bad)ids.forEach(i=>shared.add(i));
   s+=`<rect x="${c*cw}" y="${r*ch}" width="${cw}" height="${ch}" fill="${bad?COL.loss:COL.target}" fill-opacity="${bad?.32:.22}" stroke="${bad?COL.loss:COL.target}" stroke-width="${bad?5:2}"/>`;}
  boxes.forEach((b,i)=>{const col=shared.has(i)?COL.loss:COL.target;s+=rect(b,{stroke:col,w:3})+`<circle cx="${cents[i][0]}" cy="${cents[i][1]}" r="9" fill="${col}" stroke="#fff" stroke-width="3"/>`;});
  const crowded=[...cells.values()].filter(x=>x.length>1),lost=crowded.reduce((a,x)=>a+x.length-1,0);
  const tail=`<dt>red cells</dt><dd>${crowded.length}</dd><dt>people with no record</dt><dd><b class="${lost?'miss':'hit'}">${lost}</b></dd></dl>`;
  return {s,out:`<dl class="kv"><dt>people</dt><dd>${cents.length}</dd>${tail}`,print:`<dl class="kv"><dt>grid</dt><dd>${n} × ${m}</dd>${tail}`};};
 const buttons=`<div class="w-controls">${grids.map((g,i)=>`<button type="button" class="w-g" data-i="${i}" aria-pressed="${i===0}">${g[0]} × ${g[1]}</button>`).join('')}</div>`;
 if(ctx.printing){el.innerHTML=`<div class="columns" style="grid-template-columns:1fr 1fr">${[grids[0],grids[4]].map(g=>{const v=draw(g);return `<div>${photo('crowd',W,H,v.s,`The crowd on a ${g[0]} by ${g[1]} grid; cells holding several centres in red`)}<div class="w-panel" style="margin-top:8px">${v.print}</div></div>`;}).join('')}</div>`;return;}
 el.innerHTML=`<div class="columns" style="grid-template-columns:1.6fr 1fr"><div class="w-fig">${photo('crowd',W,H,'<g class="live"></g>','The crowd with every person’s centre; cells holding several centres in red')}</div><div class="w-panel">${buttons}<div class="w-out" style="margin-top:12px"></div><p class="w-hint" style="margin-top:10px">Red: a cell holding two or more centres. Its one record can describe only one of those people.</p></div></div>`;
 const g_=el.querySelector('.live'),out=el.querySelector('.w-out');
 const show=i=>{const v=draw(grids[i]);g_.innerHTML=v.s;out.innerHTML=v.out;for(const b of el.querySelectorAll('.w-g'))b.setAttribute('aria-pressed',String(+b.dataset.i===i));};
 for(const b of el.querySelectorAll('.w-g'))b.addEventListener('click',()=>show(+b.dataset.i));
 show(0);
}

/** The teaching example, live: move the score cut and the IoU a box needs. Every kept box turns TP or FP, every dog
 left unclaimed is FN; the counts, precision, recall, AP and the point on the precision-recall curve follow. */
function prPlay(el,ctx,S){
 const T=S.teach,[W,H]=T.size,n=T.gt.length;
 const state=(cut,t)=>{const m=teachMatch(T,t),k=T.dets.filter(d=>d.score>=cut-1e-9).length,tp=m.slice(0,k).filter(j=>j>=0).length;
  const curve=[];let a=0,b=0;m.forEach(j=>{j>=0?a++:b++;curve.push([a/n,a/(a+b)]);});
  let ap=0,prev=0;curve.forEach(([r],i)=>{ap+=(r-prev)*Math.max(...curve.slice(i).map(q=>q[1]));prev=r;});
  return {k,tp,fp:k-tp,fn:n-tp,curve,ap};};
 const plot=(s)=>{const P=panel({W:330,H:272,L:52,B:58,T:28,R:12,xMin:0,xMax:1,yMin:0,yMax:1.05,ticksX:[0,.5,1],ticksY:[0,.5,1],xLabel:'recall',yLabel:'precision',fs:16});
  let g=P.axes+`<polyline points="${s.curve.map(([r,p])=>`${P.x(r).toFixed(1)},${P.y(p).toFixed(1)}`).join(' ')}" fill="none" stroke="${COL.guess}" stroke-width="2.5"/>`;
  s.curve.forEach(([r,p],i)=>{g+=`<circle cx="${P.x(r).toFixed(1)}" cy="${P.y(p).toFixed(1)}" r="${i===s.k-1?10:4.5}" fill="${i===s.k-1?COL.ink:COL.guess}" stroke="#fff" stroke-width="2"/>`;});
  return `<div class="diagram-scroll"><svg class="plot wsvg" viewBox="0 0 330 272" style="max-width:300px" role="img" aria-label="Precision against recall, with the current threshold marked">${g}</svg></div>`;};
 const read=(s,t)=>{const pr=s.k?`${s.tp}/${s.k} = ${num(s.tp/s.k,2)}`:'no boxes kept',row=(a,b)=>`<span style="color:var(--muted)">${a}</span><span>${b}</span>`;
  return `<div style="display:grid;grid-template-columns:auto 1fr;gap:4px 16px;font-size:20px;line-height:1.35;font-variant-numeric:tabular-nums">${row('kept',`${s.k} of ${T.dets.length} boxes`)}${row('TP · FP · FN',`<b class="hit">${s.tp}</b> · <b class="miss">${s.fp}</b> · <b style="color:${COL.amber}">${s.fn}</b>`)}${row('precision',pr)}${row('recall',`${s.tp}/${n} = ${num(s.tp/n,2)}`)}${row(`AP, IoU ≥ ${num(t,2)}`,num(s.ap,2))}</div>`;};
 if(ctx.printing){const s=state(.5,.5);el.innerHTML=`<div class="columns" style="grid-template-columns:1.5fr 1fr"><div>${photo('dog-park',W,H,teachSVG(T,{cut:.5,fn:true}),'Boxes kept at score 0.5, marked TP or FP; missed dogs marked FN',{view:T.view})}<p class="w-hint" style="margin-top:8px">keep scores ≥ 0.50, IoU ≥ 0.50</p></div><div class="w-panel">${read(s,.5)}${plot(s)}</div></div>`;return;}
 el.innerHTML=`<div class="columns" style="grid-template-columns:1.5fr 1fr"><div class="w-fig">${photo('dog-park',W,H,'<g class="live"></g>','Boxes kept at the chosen score, marked TP or FP; missed dogs marked FN',{view:T.view})}`+
  `<div class="w-controls" style="margin-top:10px"><label>keep scores ≥ <input class="w-cut" type="range" min="0.05" max="1" step="0.05" value="0.5"><span class="w-readout w-cut-out"></span></label><label>IoU ≥ <input class="w-t" type="range" min="0.5" max="0.95" step="0.05" value="0.5"><span class="w-readout w-t-out"></span></label></div></div>`+
  `<div class="w-panel"><div class="w-out"></div><div class="w-plot" style="margin-top:10px"></div></div></div>`;
 const g=el.querySelector('.live'),out=el.querySelector('.w-out'),pl=el.querySelector('.w-plot'),cut=el.querySelector('.w-cut'),th=el.querySelector('.w-t');
 const show=()=>{const c=Math.round(+cut.value*100)/100,t=Math.round(+th.value*100)/100,s=state(c,t);g.innerHTML=teachSVG(T,{cut:c,t,fn:true});out.innerHTML=read(s,t);pl.innerHTML=plot(s);
  el.querySelector('.w-cut-out').textContent=num(c,2);el.querySelector('.w-t-out').textContent=num(t,2);};
 cut.addEventListener('input',show);th.addEventListener('input',show);show();
}

export function mount(stage,ctx,S){
 const fns={'iou-play':iouPlay,'cell-inspector':cellInspector,'nms-play':nmsPlay,'target-play':targetPlay,'ap-play':apPlay,'crowd-grid':crowdGrid,'pr-play':prPlay};
 for(const el of stage.querySelectorAll('.widget[data-widget]')){const f=fns[el.dataset.widget];if(!f)throw new Error('Unknown widget '+el.dataset.widget);f(el,ctx,S);}
}

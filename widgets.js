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
 if(ctx.printing){el.innerHTML=`<div class="columns" style="grid-template-columns:1.6fr 1fr">${photo('cat-dog',W,H,draw(start),'The dog box and a guess')}<div class="w-panel">${readout(start)}</div></div>`;return;}
 el.innerHTML=`<div class="columns" style="grid-template-columns:1.6fr 1fr"><div class="w-fig">${photo('cat-dog',W,H,'<g class="live"></g>','Drag the purple box; its IoU with the teal box updates')}</div><div class="w-panel"><div class="w-out"></div><p class="w-hint" style="margin-top:14px">Drag the purple box, or its corner dot. Teal is our box for the dog.</p><div class="w-controls" style="margin-top:12px"><button type="button" class="w-reset">Reset</button><button type="button" class="w-snap">Snap onto the dog</button></div></div></div>`;
 const svgEl=el.querySelector('svg'),g=el.querySelector('.live'),out=el.querySelector('.w-out');
 let b=[...start],drag=null;
 const show=()=>{g.innerHTML=draw(b);out.innerHTML=readout(b);};
 svgEl.addEventListener('pointerdown',e=>{const t=e.target.closest('[data-drag]');if(!t)return;e.preventDefault();svgEl.setPointerCapture(e.pointerId);drag={kind:t.dataset.drag,p:svgPoint(svgEl,e),b:[...b]};});
 svgEl.addEventListener('pointermove',e=>{if(!drag)return;const p=svgPoint(svgEl,e),dx=p.x-drag.p.x,dy=p.y-drag.p.y,o=drag.b;
  if(drag.kind==='move'){const w=o[2]-o[0],h=o[3]-o[1],x=Math.max(0,Math.min(W-w,o[0]+dx)),y=Math.max(0,Math.min(H-h,o[1]+dy));b=[x,y,x+w,y+h];}
  else b=[o[0],o[1],Math.max(o[0]+20,Math.min(W,o[2]+dx)),Math.max(o[1]+20,Math.min(H,o[3]+dy))];
  show();});
 const end=()=>{drag=null;};svgEl.addEventListener('pointerup',end);svgEl.addEventListener('pointercancel',end);
 el.querySelector('.w-reset').addEventListener('click',()=>{b=[...start];show();});
 el.querySelector('.w-snap').addEventListener('click',()=>{b=[...gt];show();});
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

export function mount(stage,ctx,S){
 const fns={'iou-play':iouPlay,'cell-inspector':cellInspector,'nms-play':nmsPlay};
 for(const el of stage.querySelectorAll('.widget[data-widget]')){const f=fns[el.dataset.widget];if(!f)throw new Error('Unknown widget '+el.dataset.widget);f(el,ctx,S);}
}

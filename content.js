// Object detection, Lecture 22 of ES 667. One photo carries the lecture: a cat and a dog in a courtyard.
// Every number comes from data/science.json, which scripts/science.py computes from real YOLOv8n and DETR outputs.
import {m,eq,at,only,cols,code,table,flow,palette,esc,highlight} from './shared/author.js';
import {photo,rect,pill,label,line,arrow,gridLines,cell,heat,fig,svg,widget,panel,num,big,COL,MUTED,iouParts,teachSVG,scoreStrip,mount as mountWidgets} from './widgets.js';

const S=await fetch(new URL('./data/science.json',import.meta.url),{cache:'no-cache'}).then(r=>r.json());
export const mount=(stage,ctx)=>mountWidgets(stage,ctx,S);
const R=String.raw;
const p=s=>`<p class="lead">${s}</p>`;
const small=s=>`<p class="caption">${s}</p>`;
const stack=(...a)=>`<div class="equation-stack">${a.join('')}</div>`;
const ps=s=>`<p class="small">${s}</p>`;
const bt=v=>big(v).replaceAll(',','{,}');   // a thousands comma inside TeX, without KaTeX's list spacing
const sm=(...a)=>`<div class="equation-stack eq-sm">${a.join('')}</div>`;
/** The kinds on every loss slide, coloured as in the figures and as \pcol, \qcol, \lcol in the formulas: the target y
 *  (teal), the network’s prediction ŷ (purple), and the loss (red). */
const kt=s=>`<span class="kt">${s}</span>`,kp=s=>`<span class="kp">${s}</span>`,kl=s=>`<span class="kl">${s}</span>`;
/** Code shown one line per click: rows are [build, line], build 0 for a line always shown; the line of the current click is tinted. */
const codeSteps=rows=>`<pre class="code code-steps"><code>${rows.map(([b,l])=>`<span class="cl"${b?` data-at="${b}"`:''}>${highlight(l)||' '}</span>`).join('')}</code></pre>`;
/** Reveals inside an SVG figure: an HTML wrapper would break out of the SVG, so use a group. */
const gat=(b,svgInner)=>`<g data-at="${b}">${svgInner}</g>`,gonly=(b,svgInner)=>`<g data-only="${b}">${svgInner}</g>`;
const tgt=s=>`<span class="target">${s}</span>`,gss=s=>`<span class="guess">${s}</span>`,lss=s=>`<span class="loss">${s}</span>`;
const {W,H}=S.photo,DOG=S.dog.xyxy,CAT=S.cat.xyxy,W2=1280,H2=704;
const YOLO_SRC='YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.';
const DETR_SRC='DETR (facebook/detr-resnet-50, Hugging Face) run on this photo by scripts/run_models.py.';
const PHOTO_SRC='The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.';

export const meta={
 id:'object-detection',number:22,title:'Object detection',series:'ES 667 Deep Learning',
 subtitle:'From one label to a set of objects',minutes:130,notebook:'object-detection.ipynb',
 sections:[
  {id:'map',title:'Lecture map',minutes:1},
  {id:'why',title:'Part 1 · Why detect objects?',minutes:12},
  {id:'task',title:'Part 2 · From one label to a list',minutes:9},
  {id:'boxes',title:'Part 3 · Boxes and IoU',minutes:16},
  {id:'onebox',title:'Part 4 · One box, then many',minutes:7},
  {id:'dense',title:'Part 5 · A candidate at every place',minutes:32},
  {id:'nms',title:'Part 6 · One box per object: NMS',minutes:16},
  {id:'scales',title:'Part 7 · Three grids for three sizes',minutes:9},
  {id:'eval',title:'Part 8 · Measuring a detector',minutes:24},
  {id:'wrap',title:'Wrap-up',minutes:4},
  {id:'detr',title:'Appendix A · DETR: slots matched to objects',minutes:0},
  {id:'optional',title:'Appendix B · More depth',minutes:0},
 ],
};
export const slides=[];

// ------------------------------------------------------------------------------------------------ slide helper
/** Numbered sections; the notebook has one section per part, with the anchor part-k (part-A for the appendix). */
const CHAPTERS=[
 ['1.1','Where detectors work'],['1.2','One output for all of them'],['1.3','What makes it hard'],
 ['2.1','A label or a list?'],['2.2','Why a list is awkward'],
 ['3.1','Four numbers for a box'],['3.2','Comparing two boxes: IoU'],
 ['4.1','One object, one box'],
 ['5.1','Sliding windows, and what is wrong with them'],['5.2','YOLO, part 1: the ground-truth table'],['5.3','YOLO, part 2: predict, compare, train'],['5.4','The real grid, and its boxes'],
 ['6.1','Non-maximum suppression'],['6.2','Thresholds and classes'],
 ['7.1','Three grids'],['7.2','Boxes that turn'],
 ['8.1','Right or wrong?'],['8.2','Precision and recall'],['8.3','The precision–recall curve, and AP'],['8.4','Stricter IoU, and mAP'],
 ['9.1','The whole lecture'],
 ['A.1','Several objects, several slots'],['A.2','Slots that read the image'],['A.3','Matching slots to objects'],['A.4','Two answers'],
];
const PARTS=['Why detect?','A list','Boxes, IoU','One box, many','Dense grid','NMS','Three grids','Measuring'];
const COLAB='https://colab.research.google.com/github/nipunbatra/object-detection/blob/main/object-detection.ipynb';
let chapter=null;
const chap=k=>{chapter=CHAPTERS.find(c=>c[0]===k);if(!chapter)throw new Error('Unknown section '+k);};
/** The bottom bar carries one story line per build; questions and answers live in the notes. */
function S_(id,section,title,o){
 const builds=o.builds||1;
 for(const k of ['lines','ask','expected'])if(!Array.isArray(o[k])||o[k].length!==builds)throw new Error(`${id}: ${k} needs ${builds} entries`);
 const ch=section==='optional'||section==='map'||o.part?null:chapter;
 const part=ch?ch[0].split('.')[0]:o.part||null;
 const nb=o.nb===null||!part||part==='9'?null:{href:`${COLAB}#scrollTo=part-${part}`,label:/^[A-Z]$/.test(part)?`▶ Notebook, appendix ${part}`:`▶ Notebook, part ${part}`};
 slides.push({id,section,title,builds,body:o.body,prompts:o.lines,chapter:ch?`${ch[0]} ${ch[1]}`:'',notebook:nb,
  notes:{ask:o.ask,expected:o.expected,point:o.point||'',misconception:o.misconception||'',transition:o.transition||'',demo:o.demo||''},
  source:o.source||'',optional:!!o.optional});
}
const O=(id,title,o)=>S_(id,'optional',title,{...o,optional:true,lines:o.lines||o.ask});
/** Appendix A slides: outside the main route (shown with ?all, in the reading view and in the PDFs). */
const A_=(id,section,title,o)=>S_(id,section,title,{...o,optional:true});
const strip=k=>`<div class="act-strip" role="img" aria-label="Part ${k} of ${PARTS.length}">${PARTS.map((t,i)=>`<span class="${i+1<k?'done':i+1===k?'now':''}">${i+1} · ${t}</span>`).join('')}</div>`;
/** A part's opening slide: where we are, what this part does, and how. */
function partBreak(k,section,title,lead,how,o){
 S_(`part-${k}`,section,`Part ${k} · ${title}`,{part:String(k),builds:1,
  body:`<div class="part-break">${strip(k)}${p(lead)}<ol class="steps">${how.map(x=>`<li>${x}</li>`).join('')}</ol></div>`,
  lines:[o.line],ask:[o.ask],expected:[o.expected],transition:o.transition});
}
/** A part's closing slide: what we did, one short line each; the bottom line says what comes next. */
function recap(k,section,did,next,o){
 S_(`recap-${k}`,section,`Part ${k} in one slide`,{builds:1,nb:null,
  body:`<div class="part-break">${strip(k)}${o.flow||''}<ol class="steps">${did.map(x=>`<li>${x}</li>`).join('')}</ol></div>`,
  lines:[`<b>Next:</b> ${next}`],ask:[o.ask],expected:[o.expected],point:o.point||'',transition:o.transition});
}

/** A flowchart: rows of steps joined by arrows, left to right. rows: [{name, at, steps:[{t, n, hi}]}]; t may hold
 '\n', n is a small note under it (where the lecture covers it), hi tints the step, at reveals the row on that click.
 loop: [row, from, to, label] draws a return arrow under the row; out: [row, step, label] labels the arrow into a step. */
function chart(rows,{W=1120,bh=96,gx=42,gy=26,fs=20,loop=null,out=null,alt='A flowchart'}={}){
 const all=[];let y=0;const pos=[];
 rows.forEach(row=>{const g=[];
  if(row.name){g.push(label(0,y+fs,esc(row.name),{size:fs*.9,fill:MUTED,weight:700}));y+=fs*1.5;}
  const n=row.steps.length,bw=(W-gx*(n-1))/n,ps=[];
  row.steps.forEach((s,i)=>{const x=i*(bw+gx),ls=s.t.split('\n'),lh=fs*1.22,th=ls.length*lh+(s.n?fs*.9:0),y0=y+(bh-th)/2+fs*.92;
   g.push(`<rect x="${x.toFixed(1)}" y="${y}" width="${bw.toFixed(1)}" height="${bh}" rx="12" fill="${s.hi?'#F1E8FC':'#fff'}" stroke="${s.hi?COL.guess:'#AAB3BC'}" stroke-width="${s.hi?3.5:2}"/>`);
   ls.forEach((l,j)=>g.push(label(x+bw/2,y0+j*lh,esc(l),{size:fs,fill:COL.ink,anchor:'middle',weight:s.hi?650:''})));
   if(s.n)g.push(label(x+bw/2,y0+ls.length*lh+1,esc(s.n),{size:fs*.78,fill:MUTED,anchor:'middle'}));
   if(i)g.push(arrow(x-gx+5,y+bh/2,x-5,y+bh/2,{stroke:COL.ink,w:2.5,head:11}));
   ps.push([x,bw]);});
  pos.push([y,ps]);y+=bh+gy;all.push(row.at?gat(row.at,g.join('')):g.join(''));});
 let H=y-gy+4;
 if(loop){const [r,a,b,tx]=loop,[yr,ps]=pos[r],xa=ps[a][0]+ps[a][1]/2,xb=ps[b][0]+ps[b][1]/2,yb=yr+bh,yl=yb+30;
  all.push(line(xa,yb,xa,yl,{stroke:COL.ink,w:2.5})+line(xa,yl,xb,yl,{stroke:COL.ink,w:2.5})+arrow(xb,yl,xb,yb+3,{stroke:COL.ink,w:2.5,head:11})+label((xa+xb)/2,yl+fs+3,esc(tx),{size:fs*.85,fill:COL.ink,anchor:'middle',weight:600}));H=Math.max(H,yl+fs+10);}
 if(out){const [r,i,tx]=out,[yr,ps]=pos[r];all.push(label(ps[i][0]-gx/2,yr+bh/2-10,esc(tx),{size:fs*.8,fill:COL.ink,anchor:'middle',weight:600}));}
 return fig(W,Math.ceil(H),all.join(''),alt);
}

// ------------------------------------------------------------------------------------------------ figures
const fsz=(view,px=21,shown=560)=>Math.round(px*view[2]/shown);   // SVG font size that shows at about px
const dogView=[330,30,530,610];
const gtBox=(b,lbl,{w=5,size=26,dash='',maxX=W2}={})=>rect(b,{stroke:COL.target,w,dash})+(lbl?pill(b[0],b[1],lbl,{fill:COL.target,size,maxX}):'');
const prBox=(b,lbl,{w=5,size=26,dash='',fill=COL.guess,maxX=W2}={})=>rect(b,{stroke:fill,w,dash})+(lbl?pill(b[0],b[1],lbl,{fill,size,maxX}):'');
const courtyard=(inner,alt,o={})=>photo('cat-dog',W,H,inner,alt,o);
const finals=S.finals['cat-dog'];
const finalBoxes=(size=26)=>finals.map(k=>prBox(k.box,`${k.name} ${num(k.score)}`,{size,maxX:W,fill:k.name==='dog'||k.name==='cat'?COL.guess:COL.amber})).join('');
/** The cat-and-dog masks from YOLOv8n-seg, for the segmentation rung. */
const masks=()=>S.seg.masks.map(mk=>`<polygon points="${mk.polygon.map(q=>q.join(',')).join(' ')}" fill="${mk.name==='dog'?COL.guess:COL.target}" fill-opacity=".45" stroke="#fff" stroke-width="3"/>`).join('');

// ================================================================================================ cover and route
S_('title','map','Object detection: from one label to a set of objects',{builds:1,nb:null,
 body:`<div class="cover" style="grid-template-columns:1fr 1.35fr"><div>${p('A detector looks at a photo and returns a list: one entry per object, each a class and a box. How can a network with a fixed-size output return a list whose length changes from photo to photo?')}<p class="who">ES 667 Deep Learning · Lecture 22<br>Nipun Batra · IIT Gandhinagar</p></div>${courtyard(finalBoxes(30),'The courtyard photo with YOLOv8n’s four detections: cat, dog and two potted plants')}</div>`,
 lines:['The real output of a small detector, YOLOv8n, on today’s photo: four objects, each with a class, a score and a box.'],
 ask:['What did the detector return for this photo?'],expected:['Four entries: a cat, a dog and two potted plants, each with a box and a score.'],
 point:'Point at one entry at a time: class, score, box. Keep this photo in view; every later number comes from it.',
 transition:'Why would anyone want such a list? Six jobs.',source:YOLO_SRC});

// ================================================================================================ Part 1
partBreak(1,'why','Why detect objects?','A camera becomes useful when it can say what is where. Start with six jobs that need exactly that.',[
 'For each of six photos, say what you would want to know, then see the answer.','See that every answer has the same shape, and what it is used for.','Three things that make the job hard.'],
 {line:'Six jobs that need the same kind of answer, and three reasons it is hard to give.',ask:'Where have you seen a computer draw boxes around things?',expected:'Phone cameras (faces), driver-assistance demos, traffic cameras, photo apps that find people or pets.',transition:'The first job: a street.'});
chap('1.1');
const street=S.finals.street,colOf=n=>n==='person'?COL.guess:n==='dog'?COL.target:n==='car'?COL.data:COL.amber;
const HAND_SRC='Boxes drawn by us (data/applications.json): COCO has no such class, so no detector here can find it. '+PHOTO_SRC;
/** One job: the photo and a question first; then, in the question's place, the list's use and one fact from the world. */
function app(id,title,{name,boxes,alt,view=null,question,find,use,world,lines,ask,expected,point='',transition,source}){
 S_(id,'why',title,{builds:2,
  body:cols(photo(name,W2,H2,gat(2,boxes),alt,{view}),
   only(1,p(question))+only(2,stack(`<dl class="kv"><dt>find</dt><dd>${find}</dd><dt>use</dt><dd>${use}</dd></dl>`,small(world))),'1.5fr 1fr'),
  lines,ask,expected,point,transition,source});
}
const persons=S.finals.crowd.filter(k=>k.name==='person'),cdb=S.finals['cat-dog-bird'],animals=cdb.filter(k=>k.name==='cat'||k.name==='dog');
const [parcel]=S.apps.boxes.parcel.map(x=>x[1]),[crack]=S.apps.boxes.defect.map(x=>x[1]),cellBoxes=S.apps.boxes.cells.map(x=>x[1]);
app('app-road','On the road: who is where?',{name:'street',view:[40,300,1200,404],
 boxes:street.map(k=>prBox(k.box,`${k.name} ${num(k.score)}`,{size:24,w:4,fill:colOf(k.name)})).join(''),
 alt:'A campus street; YOLOv8n boxes four people, a car, a bicycle and a dog',
 question:'What must the car know before it brakes or steers?',
 find:'people, cyclists, vehicles, animals',use:'brake or steer; follow each one from frame to frame',
 world:'US cars that brake automatically for pedestrians had 27% fewer pedestrian crashes, but no fewer on dark, unlit roads (IIHS, 2022).',
 lines:['A car’s camera sees this campus street.',
  `YOLOv8n: ${street.filter(k=>k.name==='person').length} people, a car, a bicycle and a dog, each boxed and scored. The car acts on this list.`],
 ask:['What does the car need to know?','What does the detector give it?'],
 expected:['Who is on the road, and where each one is.',`${street.length} entries: four people, a car, a bicycle, a dog, each with a box and a score.`],
 point:'IIHS (2022), “Pedestrian crash avoidance systems cut crashes, but not in the dark”. In India, AI traffic cameras flag riders without helmets and triple riding: Kerala installed 726 road cameras, 675 of them AI-capable, in 2023 (The South First).',
 transition:'A crowd.',source:YOLO_SRC});
app('app-crowd','In a crowd: how many people?',{name:'crowd',view:[60,340,1160,340],
 boxes:persons.map(k=>rect(k.box,{stroke:COL.guess,w:4})).join(''),
 alt:'People walking on a campus path, each boxed by YOLOv8n',
 question:'How many people are on this path?',
 find:'people',use:'count them; warn when a place gets too crowded',
 world:'Stations, stadiums and large gatherings count people camera by camera to spot dangerous crowding early.',
 lines:['A busy campus path. Count the people before the next click.',`YOLOv8n boxes ${persons.length} people. The count is the list’s length, and each entry also says where.`],
 ask:['How many people are there?','How does the detector’s answer give the count?'],
 expected:[`${persons.length}.`,`It is the number of person entries in the list: ${persons.length}.`],
 point:`YOLOv8n also boxes ${S.finals.crowd.length-persons.length} bags (backpacks and handbags), not drawn here. Very dense crowds are usually counted by density estimation instead of boxes, because heads hide one another: Maha Kumbh 2025 used AI-enabled CCTV to estimate people per square metre (PIB, 2024).`,
 transition:'A camera in the wild.',source:YOLO_SRC});
app('app-wild','At a camera trap: which animals walked past?',{name:'cat-dog-bird',
 boxes:animals.map(k=>prBox(k.box,`${k.name} ${num(k.score)}`,{size:30,w:5})).join(''),
 alt:'A courtyard with a cat, a dog and a small bird; YOLOv8n boxes the cat and the dog',
 question:'Which animals walked past this camera?',
 find:'animals by species, people, vehicles',use:'count each species; skip the empty photos',
 world:'In an Arctic study of 548,627 camera-trap photos, a workflow built on MegaDetector left only 4 to 9% for people to check (Celis et al., 2024).',
 lines:['A camera trap takes a photo whenever something moves.',`YOLOv8n: a cat (${num(animals.find(k=>k.name==='cat').score)}) and a dog (${num(animals.find(k=>k.name==='dog').score)}). Did it find every animal? We come back to this.`],
 ask:['Which animals are in the photo?','Did the detector find them all?'],
 expected:['A cat, a dog, and a small yellow bird on the branch.','No: the bird is missing (section 1.3).'],
 point:`YOLOv8n also boxed two potted plants (${cdb.filter(k=>k.name==='potted plant').map(k=>num(k.score)).join(', ')}), not drawn: this job ignores them. Celis et al., Ecological Informatics 81 (2024) 102578: 46 cameras in Finnmark and Yamal; manual checking cut to 9.2% and 3.9% of the photos.`,
 transition:'A microscope.',source:YOLO_SRC});
app('app-cells','Under a microscope: count the cells',{name:'cells',
 boxes:cellBoxes.map(b=>gtBox(b,'',{w:5})).join(''),
 alt:'Twelve stained cells on a microscope slide, each with a box drawn by hand',
 question:'How many cells are there, and of which kinds?',
 find:'cells, by type',use:'count them; crop each one and classify its type',
 world:'Cell detectors learn from lists like this: the 2018 Data Science Bowl’s 841 images carry 37,333 nuclei, each marked by hand (Nature Methods, 2019).',
 lines:['Stained cells under a microscope, photographed for a lab.',`${cellBoxes.length} cells. These teal boxes are ours: COCO has no class “cell”, so no detector in this lecture knows one.`],
 ask:['What would a lab want from this photo?','Who drew these boxes, and why does it matter?'],
 expected:['How many cells, where each is, and what type each one is.','We did, from the colours, checked by eye. Such hand-made lists are the training data a cell detector would learn from.'],
 point:'Teal boxes are annotations (made by people); purple boxes are a model’s output. The lecture keeps these colours throughout.',
 transition:'A warehouse.',source:HAND_SRC});
app('app-parcel','In a warehouse: where is the parcel?',{name:'parcel',
 boxes:gtBox(parcel,'parcel',{w:6,size:30})+`<circle cx="${(parcel[0]+parcel[2])/2}" cy="${(parcel[1]+parcel[3])/2}" r="11" fill="${COL.target}" stroke="#fff" stroke-width="4"/>`,
 alt:'A cardboard parcel on a conveyor belt, boxed by hand, with its centre marked',
 question:'What must the arm know to pick the parcel up?',
 find:'parcels, sacks, envelopes',use:'aim the gripper at the box; count parcels per hour',
 world:'A harder relative: the SKU-110K photos of shop shelves hold about 147 boxed products each, packed edge to edge (Goldman et al., 2019).',
 lines:['A robot arm waits at the end of this conveyor belt.',`One entry: a parcel, ${parcel[2]-parcel[0]} × ${parcel[3]-parcel[1]} pixels. The arm aims at the box’s centre, the dot.`],
 ask:['What does the arm need to know?','Where should it aim?'],
 expected:['Where the parcel is, and roughly how big.',`At the centre of the box, (${(parcel[0]+parcel[2])/2}, ${(parcel[1]+parcel[3])/2}).`],
 transition:'A factory.',source:HAND_SRC});
app('app-crack','On a production line: is anything wrong?',{name:'defect',view:[280,60,760,460],
 boxes:gtBox(crack,'crack',{w:5,size:28}),
 alt:'A machined aluminium part; a hairline crack on its arm is boxed by hand',
 question:'Is anything wrong with this part?',
 find:'cracks, scratches, dents, missing holes',use:'reject the part; show the inspector where to look',
 world:'Inspection data sets look like this list: NEU-DET labels six kinds of steel-surface defect, 300 photos of each, every defect boxed.',
 lines:['A part fresh from the machine. Look closely.',`A hairline crack on the arm, in a box ${crack[2]-crack[0]} × ${crack[3]-crack[1]} pixels: the inspector knows exactly where to look.`],
 ask:['Is anything wrong with the part?','What does the box add to “defective”?'],
 expected:['A thin crack runs along the top of the arm.','Where the defect is: a person can check it, and the factory can see which machine step causes it.'],
 transition:'Six jobs side by side.',source:HAND_SRC});
chap('1.2');
const thumb=(name,inner,cap,view)=>`<figure>${photo(name,W2,H2,inner,cap,{view})}<figcaption>${cap}</figcaption></figure>`;
S_('apps-common','why','Six jobs, one kind of answer',{builds:2,
 body:`<div class="three thumb">${[
  thumb('street',street.map(k=>rect(k.box,{stroke:colOf(k.name),w:7})).join(''),`road · <b>${street.length}</b> objects`,[40,104,1200,600]),
  thumb('crowd',persons.map(k=>rect(k.box,{stroke:COL.guess,w:7})).join(''),`crowd · <b>${persons.length}</b> people`,[60,124,1160,580]),
  thumb('cat-dog-bird',animals.map(k=>rect(k.box,{stroke:COL.guess,w:8})).join(''),`camera trap · <b>${animals.length}</b> animals`,[0,64,1280,640]),
  thumb('cells',cellBoxes.map(b=>rect(b,{stroke:COL.target,w:8})).join(''),`microscope · <b>${cellBoxes.length}</b> cells`,[0,0,1280,640]),
  thumb('parcel',rect(parcel,{stroke:COL.target,w:8}),'warehouse · <b>1</b> parcel',[180,100,1000,500]),
  thumb('defect',rect(crack,{stroke:COL.target,w:8}),'factory · <b>1</b> crack',[100,20,1120,560])].map((t,i)=>i<3?t:at(2,t)).join('')}</div>`,
 lines:['Three jobs from everyday photos: 7 objects, 11 people, 2 animals. Purple: a detector’s answer.','Three more: 12 cells, 1 parcel, 1 crack (teal: our annotation). Every answer has the same shape: a list, one entry per object, each a class and a box.'],
 ask:['What do the first three answers have in common?','What changes from one job to the next, and what stays the same?'],
 expected:['Each is a list of objects, each with a class and a box (and a score).','The classes, the training photos and the length of the list change; the shape of the answer does not.'],
 point:'One kind of model can serve all six jobs: only the class names and the training data change.',
 transition:'What is the list used for?',source:YOLO_SRC+' Cells, parcel and crack: our annotation.'});
const uses=[
 ['count',thumb('crowd',persons.map(k=>rect(k.box,{stroke:COL.guess,w:6})).join(''),`<b>count</b> · ${persons.length} people`,[60,300,1160,387])],
 ['locate',thumb('parcel',rect(parcel,{stroke:COL.target,w:6})+`<circle cx="${(parcel[0]+parcel[2])/2}" cy="${(parcel[1]+parcel[3])/2}" r="14" fill="${COL.target}" stroke="#fff" stroke-width="5"/>`,'<b>locate</b> · grip at the box’s centre',[100,180,990,330])],
 ['track',thumb('street',rect(street.find(k=>k.name==='bicycle').box,{stroke:COL.amber,w:6}),'<b>track</b> · link each box to the next frame’s',[40,300,1200,400])],
 ['crop',thumb('cells',rect(cellBoxes[7],{stroke:COL.target,w:7}),'<b>crop</b> · then name the cell’s type',[0,160,1280,427])]];
S_('list-uses','why','What the list is used for',{builds:4,
 body:`<div class="two-two thumb">${uses.map(([,t],i)=>at(i+1,t)).join('')}</div>`,
 lines:['Count: the number of entries of a class. Eleven people; twelve cells.','Locate: the box says where to act. The arm grips at the parcel’s centre; a car brakes for the person in its lane.','Track: in a video, run the detector on every frame and link each box to the box that overlaps it most in the next frame.','Crop: cut out each box and pass it to a second model: read a number plate, identify a face, name a cell’s type.'],
 ask:['How would you count people from the list?','What does a robot do with a box?','How could you follow one cyclist through a video?','Why crop before recognising?'],
 expected:['Count the person entries.','It aims at it: the box gives the position and the size.','Detect in every frame and link boxes that overlap most from one frame to the next.','The second model then sees one object, large, instead of a whole scene.'],
 point:'Detection is usually the first stage of a pipeline: counting, tracking, grasping or recognising all start from its boxes.',
 transition:'Why is this harder than classification?',source:YOLO_SRC+' Cells and parcel: our annotation.'});
chap('1.3');
const scBox=n=>S.annotations.scale.filter(x=>x[0]===n).map(x=>x[1]);
const farPed=scBox('person').find(b=>b[2]-b[0]<20),bus=scBox('bus')[0],cyc=scBox('person').find(b=>b[2]-b[0]>20);
S_('hard-sizes','why','Hard, 1: a bus and a distant person in one photo',{builds:2,
 body:cols(photo('scale',W2,H2,gtBox(bus,`bus · ${bus[2]-bus[0]} px wide`,{size:30})+gat(2,gtBox(farPed,'',{w:4})+pill(farPed[0]-4,farPed[1],`${farPed[2]-farPed[0]} px`,{fill:COL.target,size:28,anchor:'end'})),'A bus in the foreground and a pedestrian far down the road',{view:[220,150,1060,470]}),
  stack(p(`The bus is ${bus[2]-bus[0]} pixels wide.`),at(2,p(`The far pedestrian: ${farPed[2]-farPed[0]} pixels, ${Math.round((bus[2]-bus[0])/(farPed[2]-farPed[0]))} times narrower.`))),'1.5fr 1fr'),
 lines:['A bus in the foreground of a street photo.','And a pedestrian far down the same road. A classifier looks for one main thing; a detector must box both, at very different sizes.'],
 ask:['How wide is the bus?','How much smaller is the pedestrian, and why does it matter?'],
 expected:[`${bus[2]-bus[0]} pixels.`,`About ${Math.round((bus[2]-bus[0])/(farPed[2]-farPed[0]))} times narrower: a feature that sees the whole bus is far too coarse for the pedestrian.`],
 point:'Part 7 shows how a detector handles this: predictions from three grids of different cell sizes.',
 transition:'Small objects are easy to miss.',source:'Boxes: our annotation (data/annotations.json). '+PHOTO_SRC});
const B=S.bird,birdView=[440,60,220,140];
S_('hard-small','why','Hard, 2: small objects are easy to miss',{builds:3,
 body:cols(`<div class="state-slot"><div data-only="1">${photo('cat-dog-bird',W2,H2,cdb.map(k=>prBox(k.box,`${k.name==='potted plant'?'plant':k.name} ${num(k.score)}`,{size:26,w:4,fill:k.name==='potted plant'?COL.amber:COL.guess})).join(''),'YOLOv8n’s four detections: a cat, a dog and two plants')}</div><div data-only="2-3">${photo('cat-dog-bird',W2,H2,gtBox(B.gt,'',{w:2.5})+prBox(B.best.box,'',{w:2,dash:'5 3'})+pill(B.best.box[0],B.best.box[1]-2,`bird ${num(B.best.score,3)}`,{fill:COL.guess,size:14}),'The bird, zoomed: our box and YOLOv8n’s best bird box',{view:birdView})}</div></div>`,
  stack(only(1,p('YOLOv8n’s four detections: cat, dog, two plants.')),at(2,p(`The bird is ${B.w} × ${B.h} pixels. One cell did draw a box on it, IoU <b>${num(B.iou,3)}</b> with ours, but scored it <b>${num(B.best.score,3)}</b>.`)),
   at(2,small('Below the usual cut-off of 0.25, so the box is thrown away.')),at(3,p(`Its next guess for that cell: ${B.runner_up[0]}, ${num(B.runner_up[1],3)}, also small and yellow.`))),'1.4fr 1fr'),
 lines:['Back to the camera trap. YOLOv8n reports a cat, a dog and two plants. Where is the bird?','Zoom in. One cell boxed the bird almost perfectly but was unsure what it was, so the box was dropped.','With so few pixels the network has little detail to go on, so small objects get low, unsure scores.'],
 ask:['Which animal is missing?','Did the network fail to see the bird at all?','Why would a small object get a low score?'],
 expected:['The bird on the branch.',`No: it drew a good box (IoU ${num(B.iou,2)}) but was unsure of the class (${num(B.best.score,3)}).`,'It covers few pixels, so the network has little detail to go on.'],
 point:'Part 8 returns to this bird: lowering the score cut-off finds it.',
 transition:'Objects also overlap.',source:YOLO_SRC});
const CA=S.class_aware,cp=S.apps.cells_pair.map(i=>cellBoxes[i]);
S_('hard-overlap','why','Hard, 3: objects overlap',{builds:2,
 body:stack(`<div class="image-pair">${at(1,`<figure>${photo('street',W2,H2,prBox(CA.person.box,'',{w:3})+prBox(CA.bicycle.box,'',{w:3,fill:COL.amber}),'A cyclist: a person box and a bicycle box',{view:[650,360,170,200],cls:'short'})}<figcaption>a cyclist: a person and a bicycle</figcaption></figure>`)}${at(2,`<figure>${photo('cells',W2,H2,cp.map(b=>gtBox(b,'',{w:5})).join(''),'Two touching cells, each boxed',{view:[310,150,290,250],cls:'short'})}<figcaption>two touching cells</figcaption></figure>`)}</div>`),
 lines:['A cyclist is two objects in one place: a person box and a bicycle box, one largely on top of the other. Both are correct.','Two touching cells: their boxes overlap too. A detector must keep both entries, and yet must not report one object twice.'],
 ask:['How many objects is a cyclist?','What is the risk when two boxes overlap?'],
 expected:['Two: a person and a bicycle, in nearly the same place.','A detector might treat them as one object and drop one; or report one object twice.'],
 point:`Overlap returns in Part 6: removing duplicate boxes without removing real neighbours. In Part 3’s measure, the cyclist’s two boxes have IoU ${num(CA.iou,2)} and the two cells ${num(S.apps.cells_pair_iou,2)}.`,
 transition:'Part 1 in one slide.',source:YOLO_SRC+' Cells: our annotation.'});
recap(1,'why',['Detection answers what is where: one (class, box, score) per object.','The same kind of answer works for six very different jobs.','The list is used to count, locate, track and crop.','Hard: sizes vary 40×; small objects get unsure scores; objects overlap.'],
 'why a classifier cannot give this list, and what a network would have to output.',
 {ask:'In one sentence, what does a detector return?',expected:'A list with one entry per object: its class, its box and a score.',
  point:'The long tail: Karpathy (Tesla, ScaledML 2020) showed stop signs held by road workers, on school buses and half hidden by leaves; each kind needed its own labelled examples before the detector handled it.',transition:'Part 2.'});

// ================================================================================================ Part 2
partBreak(2,'task','From one label to a list','A classifier answers with one word. We need a list. Why is a list hard for a network?',[
 'What a classifier says about one photo, and what we want instead.','Two awkward facts about the list: its length changes, and its order means nothing.','The route through the rest of the lecture.'],
 {line:'A classifier gives one label for the whole photo; detection needs one entry per object.',ask:'What does a classifier output for a photo with two animals?',expected:'One label (a probability for each class), for the whole photo.',transition:'One photo, one label.'});
chap('2.1');
S_('one-label','task','What is in this photo?',{builds:3,
 body:cols(courtyard('','A golden retriever and a tabby cat in a sunlit courtyard'),
  at(2,`<div class="table-sm">${table(['ImageNet class','probability'],S.classifier.top5.map(x=>[esc(x.label),num(x.p,3)]))}</div>`)+
  at(3,small(`Its 118 dog classes together hold ${num(S.classifier.dog_classes,2)}; the five cat classes, ${num(S.classifier.cat_classes,2)}.`)),'1.25fr 1fr'),
 lines:['Look at the photo. In one sentence, what is in it?',
  'A classifier answers with one label for the whole photo. ResNet-50, trained on ImageNet: golden retriever, 0.19. Every row is a guess about the same single label.',
  'The cat appears only as a weak runner-up, tiger cat at 0.013. The answer cannot say “a dog and a cat”, how many, or where.'],
 ask:['What is in this photo?','What did the classifier return?','What is missing from its answer?'],
 expected:['A dog and a cat, and some potted plants.','One label, golden retriever, with probability 0.19; the other rows are alternatives for the same label.','The second animal, the number of animals, and where each one is.'],
 point:'The probabilities are low because ImageNet splits dogs into 118 breeds; the sum over breeds is 0.39.',
 misconception:'A higher probability for “cat” would not help: a softmax over classes picks one answer for the whole image.',
 transition:'What answer do we want instead?',source:'ResNet-50 with torchvision’s IMAGENET1K_V2 weights, run on this photo (scripts/run_models.py).'});
S_('want','task','What we want: a list, one entry per object',{builds:3,
 body:cols(courtyard(gat(2,gtBox(DOG,'dog',{size:30}))+gat(3,gtBox(CAT,'cat',{size:30})),'The dog and the cat, each with a box'),
  `<div class="table-sm">${table(['class','box: left, top, right, bottom (pixels)'],[[at(2,'dog'),at(2,`(${DOG.join(', ')})`)],[at(3,'cat'),at(3,`(${CAT.join(', ')})`)]])}</div>`+
  at(3,small('The boxes are our annotation of this photo, in pixels from its top-left corner.')),'1.25fr 1fr'),
 lines:['Detection answers with a list. Each entry is one object: a class, and a box around it.',
  'First entry: dog. Its box has left edge 407, top 83, right 768 and bottom 588, in pixels.',
  'Second entry: cat. Each object gets one entry, so a photo with five objects gets five.'],
 ask:['What should a detector return?','What four numbers fix the dog’s box?','How long is the list for this photo?'],
 expected:['A list of (class, box) entries, one per object.','Its left, top, right and bottom edges: 407, 83, 768, 588.','Two entries if we list only animals; COCO’s classes would add the potted plants.'],
 point:'These are our ground-truth boxes. A larger detector proposed them; we checked each one by eye (data/annotations.json).',
 transition:'Detection sits on a ladder of tasks.',source:PHOTO_SRC});
S_('ladder','task','Four tasks, four kinds of answer',{builds:4,
 body:`<div class="four thumb">${[
  ['1','Classification: one label','golden retriever',''],
  ['2','Localisation: one label, one box','dog + box',gtBox(DOG,'dog',{size:40,w:8})],
  ['3','Detection: a class and a box per object','2 entries',gtBox(DOG,'dog',{size:40,w:8})+gtBox(CAT,'cat',{size:40,w:8})],
  ['4','Segmentation: which pixels (Lecture 23)','2 masks',masks()]].map(([b,cap,_,inner])=>at(Number(b),`<figure>${courtyard(inner,cap)}<figcaption>${cap}</figcaption></figure>`)).join('')}</div>`,
 lines:['Classification: one label for the whole photo.','Localisation: one object, its label and one box.','Detection: every object, each with a class and a box. Today’s task.','Segmentation: which pixels belong to each object. The masks here are from a real YOLOv8n-seg run; this is next lecture.'],
 ask:['What does classification return?','What does localisation add?','What does detection add to localisation?','What would segmentation add to detection?'],
 expected:['One label.','One box for one object.','Any number of objects.','A pixel mask instead of a box.'],
 transition:'How long is the list?',source:'Masks: YOLOv8n-seg run on the photo (scripts/run_models.py). '+PHOTO_SRC});
chap('2.2');
const countThumb=(name,n,cap)=>`<figure>${photo(name,W2,H2,S.finals[name].filter(k=>['person','cat','dog','car','bicycle'].includes(k.name)).map(k=>rect(k.box,{stroke:COL.guess,w:7})).join(''),cap)}<figcaption><b>${n}</b> · ${cap}</figcaption></figure>`;
S_('how-many','task','The number of objects changes from photo to photo',{builds:4,
 body:`<div class="four thumb">${at(1,countThumb('cat',1,'one cat'))}${at(2,countThumb('two-dogs',2,'two dogs'))}${at(3,countThumb('street',7,'a street'))}${at(4,countThumb('crowd',11,'a path of people'))}</div>`,
 lines:['One cat: a list of one.','Two dogs: a list of two.','A street: seven.','A busy path: eleven people. The length of the answer depends on the photo.'],
 ask:['How long is this answer?','And this one?','And here?','What does this mean for the network’s output?'],
 expected:['One.','Two.','Seven.','The output must be able to hold one object, or eleven, or none.'],
 point:'Every box here is YOLOv8n’s, after the clean-up step of Part 6. The crowd photo also has bags, not boxed here.',
 transition:'And the list has no natural order.',source:YOLO_SRC});
S_('no-order','task','A list with no order: a set',{builds:2,
 body:cols(`<div class="state-slot">${[1,2].map(b=>`<div data-only="${b}">${photo('two-dogs',W2,H2,gtBox(S.annotations['two-dogs'][0][1],b===1?'1':'2',{size:48,w:7})+gtBox(S.annotations['two-dogs'][1][1],b===1?'2':'1',{size:48,w:7}),'Two dogs numbered in two different orders')}</div>`).join('')}</div>`,
  stack(eq(R`Y=\{(c_1,\pcol{b_1}),\,\dots,\,(c_N,\pcol{b_N})\}`),at(2,p('Number the dogs either way and the answer is the same. What must not change is which class goes with which box.')))
  ,'1.3fr 1fr'),
 lines:['Number the two dogs: left one first.','Or right one first. Both lists describe the same scene: the answer is a set of N (class, box) pairs, N varies, and order means nothing.'],
 ask:['Which dog is number 1?','What must stay together when we reorder?'],
 expected:['Neither: any order is correct.','Each class with its own box.'],
 point:'Keep this photo: in Part 4 the order causes a real problem for the loss.',
 transition:'Now compare with what a network outputs.',source:PHOTO_SRC});
const tensorBlocks=(n,col,lbl,x0,y0,cw=26,gap=4)=>{let s='';for(let i=0;i<n;i++)s+=`<rect x="${x0+i*(cw+gap)}" y="${y0}" width="${cw}" height="${cw}" rx="3" fill="${col}" fill-opacity=".85"/>`;return s+label(x0,y0-12,lbl,{size:22,fill:col,weight:600});};
S_('fixed-shape','task','A network’s output has a fixed shape',{builds:3,
 body:stack(fig(1000,250,
   tensorBlocks(20,COL.ink,'a classifier: always 1,000 numbers (20 drawn), for every photo',20,40)+
   `<g data-at="2">${label(20,140,'the answer we need: N entries, N = 1, 2, 7, 11, … in any order',{size:22,fill:COL.target,weight:600})}${[1,2,7,11].map((n,i)=>{let s='';for(let j=0;j<n;j++)s+=`<rect x="${20+i*250+j*20}" y="${160}" width="16" height="40" rx="3" fill="${COL.target}" fill-opacity=".8"/>`;return s+label(20+i*250,228,`N = ${n}`,{size:20});}).join('')}</g>`,
   'A fixed row of outputs above, lists of different lengths below'),
  at(3,`<p class="callout">Today’s question: <b>how can a fixed-size output describe a set of any size, in no order?</b></p>`)),
 lines:['A classifier’s last layer always has the same number of outputs: 1,000 for ImageNet, for every photo.',
  'We need a list whose length changes with the photo, and whose order means nothing.',
  'That is the question of the lecture.'],
 ask:['How many numbers does an ImageNet classifier output for a photo with two animals?','How many entries do we need for the crowd photo?','What two properties of the answer clash with a fixed output?'],
 expected:['1,000: the same as for any photo.','Eleven, for the people alone.','Its length varies and it has no order.'],
 point:'CS231n (Stanford, 2016 and 2017) frames detection the same way: one object needs 4 numbers, two need 8, four need 16, so detection needs a variable-sized output.',
 transition:'The route through the rest of the lecture.'});
const routeRows=[['3','Boxes and IoU','four numbers for a box; IoU to compare two'],['4','One box, then many','one box works; two animals break it'],
 ['5','A candidate at every place','every grid cell writes a box and class scores'],['6','NMS','keep one box per object'],['7','Three grids','small and large objects'],['8','Measuring','precision, recall and AP']];
S_('route','task','Today’s route: build a detector step by step',{builds:2,
 body:`<ol class="steps route">${routeRows.map(([k,t,d],i)=>`<li data-at="${i<2?1:2}" value="${k}"><b>${t}</b>: ${d}</li>`).join('')}</ol>`,
 lines:['First the tools; then a network that outputs boxes, to see where a fixed output breaks.',
  'Then YOLO’s answer: a candidate at every place, cleaned up by NMS, at three sizes; and how to measure it.'],
 ask:['What tools will every later part need?','How will the network’s fixed output turn into a list of any length?'],
 expected:['A box format and an overlap measure (IoU).','Every place writes a candidate; a score filter and NMS keep one box per object, so the list’s length is decided after the network.'],
 point:'DETR, the set-prediction answer, is in Appendix A: open the deck with ?all, or read it in the reading view.',
 transition:'Part 3: boxes and IoU.'});

// ================================================================================================ Part 3
partBreak(3,'boxes','Describe a box, compare two boxes','Every later step needs two small tools.',[
 'Write a box as four numbers, in two common formats, and see how a labelled photo is stored.','Measure how well two boxes agree: intersection over union, IoU, computed by hand.','Try IoU live, then write it in six lines of PyTorch.'],
 {line:'Two tools: four numbers for a box, and IoU to compare two boxes.',ask:'Why do we need a way to compare two boxes?',expected:'To score predictions against annotations: for the loss, for removing duplicates, and for evaluation.',transition:'Positions in a photo.'});
chap('3.1');
S_('pixels','boxes','Positions in a photo: pixels from the top-left corner',{builds:2,
 body:cols(courtyard(arrow(14,14,320,14,{stroke:'#fff',w:5,head:22})+arrow(14,14,14,300,{stroke:'#fff',w:5,head:22})+label(332,46,'x',{size:38,fill:'#fff',weight:700})+label(26,330,'y',{size:38,fill:'#fff',weight:700})+`<circle cx="14" cy="14" r="10" fill="#fff"/>`+
   gat(2,`<circle cx="${DOG[0]}" cy="${DOG[1]}" r="11" fill="${COL.target}" stroke="#fff" stroke-width="4"/>`+pill(DOG[0]+16,DOG[1]+8,`(${DOG[0]}, ${DOG[1]})`,{fill:COL.target,size:30,below:true})+`<circle cx="${DOG[2]}" cy="${DOG[3]}" r="11" fill="${COL.target}" stroke="#fff" stroke-width="4"/>`+pill(DOG[2]-10,DOG[3]-12,`(${DOG[2]}, ${DOG[3]})`,{fill:COL.target,size:30,anchor:'end'})),'Pixel axes on the photo; x to the right, y downwards'),
  stack(p(`The photo is ${W} pixels wide and ${H} tall. A point is (x, y): x counts right from the left edge, y counts <b>down</b> from the top.`),at(2,p(`Two corners of the dog: top-left (${DOG[0]}, ${DOG[1]}), bottom-right (${DOG[2]}, ${DOG[3]}).`))),'1.25fr 1fr'),
 lines:['Positions are counted in pixels from the top-left corner. Unlike on a school graph, y grows downwards.','Two corners of the dog’s box. The bottom-right one has the larger y, because it is lower in the photo.'],
 ask:['Where is the origin, and which way does y grow?','Which corner has the larger y?'],
 expected:['Top-left; y grows downwards, unlike a school graph.','The bottom-right corner: it is lower in the photo.'],
 transition:'Two corners are four numbers: a box.',source:PHOTO_SRC});
const dogEdges=b=>{const f=fsz(dogView,22,420);const L=(x1,y1,x2,y2,t,tx,ty,anchor='middle')=>line(x1,y1,x2,y2,{stroke:COL.target,w:6})+label(tx,ty,t,{size:f,fill:COL.target,weight:700,anchor,halo:true});
 return `<g data-at="2">${L(DOG[0],0,DOG[0],H,`x₁ = ${DOG[0]}`,DOG[0]+10,340,'start')}</g><g data-at="3">${L(0,DOG[1],W,DOG[1],`y₁ = ${DOG[1]}`,DOG[0]+10,DOG[1]+36,'start')}</g><g data-at="4">${L(DOG[2],0,DOG[2],H,`x₂ = ${DOG[2]}`,DOG[2]-10,340,'end')}</g><g data-at="5">${L(0,DOG[3],W,DOG[3],`y₂ = ${DOG[3]}`,DOG[0]+10,DOG[3]-14,'start')}</g>`;};
S_('corners','boxes','A box is four numbers: its left, top, right and bottom edges',{builds:5,
 body:cols(courtyard(dogEdges(),'The four edges of the dog’s box, one at a time',{view:dogView}),
  stack(p('Corner format:'),eq(R`(x_1,\,y_1,\,x_2,\,y_2)`),at(5,eq(R`=(${DOG.join(',\\,')})`)),at(5,small('(x₁, y₁) is the top-left corner, (x₂, y₂) the bottom-right. torchvision uses this format.'))),'1fr 1fr'),
 lines:['A box is the region between two vertical and two horizontal lines. Draw them one at a time.',`Left edge: every point of the dog has x at least ${DOG[0]}.`,`Top edge: y at least ${DOG[1]}, the tips of the ears.`,`Right edge: x at most ${DOG[2]}, the nose.`,`Bottom edge: y at most ${DOG[3]}, the paws. Four numbers: (${DOG.join(', ')}).`],
 ask:['How many numbers fix an axis-aligned box?','What is x₁?','What is y₁?','What is x₂?','What is y₂, and which part of the dog sets it?'],
 expected:['Four.',String(DOG[0]),String(DOG[1]),String(DOG[2]),`${DOG[3]}, the paws.`],
 point:'Axis-aligned boxes only: a rotated object still gets an upright box.',transition:'The same box in a second format.',source:PHOTO_SRC});
const wArrow=arrow(DOG[0],DOG[3]+28,DOG[2],DOG[3]+28,{stroke:COL.target,w:4,both:true})+label((DOG[0]+DOG[2])/2,DOG[3]+20,`w = ${S.dog.w}`,{size:30,fill:COL.target,weight:700,anchor:'middle',halo:true});
const hArrow=arrow(DOG[2]+24,DOG[1],DOG[2]+24,DOG[3],{stroke:COL.target,w:4,both:true})+label(DOG[2]+34,(DOG[1]+DOG[3])/2,`h = ${S.dog.h}`,{size:30,fill:COL.target,weight:700,halo:true});
const centreDot=`<circle cx="${S.dog.cx}" cy="${S.dog.cy}" r="11" fill="${COL.target}" stroke="#fff" stroke-width="4"/>`+label(S.dog.cx+18,S.dog.cy-14,'centre',{size:30,fill:'#fff',weight:700});
S_('width-height','boxes','The box’s size: width and height',{builds:2,
 body:cols(courtyard(gtBox(DOG,'',{w:4})+gat(1,wArrow)+gat(2,hArrow),'Width and height of the dog’s box',{view:[330,30,590,640],cls:'short'}),
  stack(at(1,eq(R`w=x_2-x_1=${DOG[2]}-${DOG[0]}=${S.dog.w}`)),at(2,eq(R`h=y_2-y_1=${DOG[3]}-${DOG[1]}=${S.dog.h}`))),'0.85fr 1.15fr'),
 lines:[`Width: the right edge minus the left edge, ${DOG[2]} − ${DOG[0]} = ${S.dog.w} pixels.`,`Height: the bottom minus the top, ${DOG[3]} − ${DOG[1]} = ${S.dog.h}. Bottom minus top, because y grows downwards.`],
 ask:['What is the width?','What is the height?'],
 expected:[`${S.dog.w} pixels.`,`${S.dog.h} pixels.`],
 misconception:'w and h are the full width and height, not half of them.',transition:'Where is the middle of the box?',source:PHOTO_SRC});
S_('centre','boxes','The same box as a centre and a size',{builds:2,
 body:cols(courtyard(gtBox(DOG,'',{w:4})+wArrow+hArrow+centreDot,'Width, height and centre of the dog’s box',{view:[330,30,590,640],cls:'short'}),
  sm(eq(R`c_x=x_1+\tfrac{w}{2}=${DOG[0]}+\tfrac{${S.dog.w}}{2}=${S.dog.cx}`),eq(R`c_y=y_1+\tfrac{h}{2}=${DOG[1]}+\tfrac{${S.dog.h}}{2}=${S.dog.cy}`),
   at(2,eq(R`(c_x,c_y,w,h)=(${S.dog.cx},\,${S.dog.cy},\,${S.dog.w},\,${S.dog.h})`))),'0.85fr 1.15fr'),
 lines:['The centre is halfway across and halfway down: start at the left edge and add half the width; start at the top and add half the height.',`Same box, second format: centre (${S.dog.cx}, ${S.dog.cy}), size ${S.dog.w} × ${S.dog.h}. Either format can be computed from the other.`],
 ask:['Where is the centre?','How would you get x₁ back from the centre format?'],
 expected:[`(${S.dog.cx}, ${S.dog.cy}).`,`x₁ = c_x − w/2 = ${S.dog.cx} − ${S.dog.w/2} = ${DOG[0]}.`],
 transition:'Pixels depend on the photo’s size.',source:PHOTO_SRC});
const nrm=S.dog.norm;
S_('normalised','boxes','Divide by the photo’s size: numbers between 0 and 1',{builds:3,
 body:stack(eq(R`\Big(\tfrac{c_x}{W},\,\tfrac{c_y}{H},\,\tfrac{w}{W},\,\tfrac{h}{H}\Big)=\Big(\tfrac{${S.dog.cx}}{${W}},\,\tfrac{${S.dog.cy}}{${H}},\,\tfrac{${S.dog.w}}{${W}},\,\tfrac{${S.dog.h}}{${H}}\Big)`),
  at(2,eq(R`=(${nrm.map(v=>num(v,3)).join(',\\,')})`)),
  at(3,p(`Halve the photo to 480 × 320: every pixel number halves, the normalised numbers do not change. The dog’s centre is 61% of the way across and 52% of the way down, at any resolution.`))),
 lines:['Divide horizontal numbers by the photo’s width, vertical ones by its height.',`The dog: (${nrm.map(v=>num(v,3)).join(', ')}). Every number is between 0 and 1.`,'These numbers survive resizing, which is why label files and many networks use them.'],
 ask:['What do we divide c_x by? And h?','What does 0.789 say about the dog?','Why prefer normalised numbers?'],
 expected:['c_x by the width W; h by the height H.','Its box covers 79% of the photo’s height.','They do not depend on the photo’s resolution.'],
 transition:'What a labelled photo looks like on disk.'});
const LF=S.label_file,lfLine=k=>`${k.id} ${k.norm.map(v=>num(v,3)).join(' ')}`;
S_('label-file','boxes','A labelled photo on disk: one line per object',{builds:2,
 body:cols(courtyard(gtBox(DOG,'dog',{size:30})+gtBox(CAT,'cat',{size:30}),'The courtyard photo with its two annotated boxes'),
  stack(p('<span class="mono">cat-dog.txt</span>, next to <span class="mono">cat-dog.jpg</span>:'),code(LF.map(lfLine).join('\n'),'text'),
   at(2,`<div class="table-sm tight">${table(['',`class`,m('c_x'),m('c_y'),m('w'),m('h')],[['line 1',`${LF[0].id} = ${LF[0].name}`,...LF[0].norm.map(v=>num(v,3))],['line 2',`${LF[1].id} = ${LF[1].name}`,...LF[1].norm.map(v=>num(v,3))]])}</div>`)),'1.15fr 1fr'),
 lines:['A training photo is stored with a small text file: one line per object. This is the YOLO format, for our two annotated animals.',`A class number (COCO counts from 0: ${LF[1].id} is cat, ${LF[0].id} is dog), then the normalised centre and size. A detector learns to write these lines.`],
 ask:['How many lines does this photo’s label file have?','What is the first number on each line?'],
 expected:['Two: one per annotated object.','The class index: 16 for dog, 15 for cat in COCO’s list of 80.'],
 point:'Formats differ: COCO json stores (x, y, w, h) from the top-left corner in pixels; torchvision uses pixel corners. A swapped format still trains, badly: draw a few labels on their photos before training (Appendix B). Karpathy’s first step for any network is to look hard at the data (A Recipe for Training Neural Networks, 2019). COCO, YOLOv8n’s training set: 80 categories, over 200,000 labelled images, 1.5 million labelled objects.',
 transition:'Now compare two boxes.',source:'Our annotation of the photo (data/annotations.json), written in the YOLO label format.'});
chap('3.2');
const guess=S.iou_practice.guess;
const farP=S.annotations.street.find(x=>x[0]==='person'&&x[1][2]-x[1][0]<30)[1];
const shifted=b=>[b[0]+60,b[1]+40,b[2]+60,b[3]+40];
S_('compare','boxes','Two boxes for one dog: how well do they agree?',{builds:2,
 body:cols(courtyard(gtBox(DOG,'ours',{size:28})+prBox(guess,'a guess',{size:28})+gat(2,line(S.dog.cx,S.dog.cy,S.dog.cx+60,S.dog.cy+40,{stroke:COL.loss,w:6})+label(S.dog.cx+70,S.dog.cy+20,'72 px',{size:30,fill:'#fff',weight:700})),'Our box and a guess moved 60 px right and 40 px down',{view:dogView}),
  stack(p('Teal: our box. Purple: a guess, moved 60 px right and 40 px down.'),at(2,p('Idea 1: the distance between the centres, √(60² + 40²) = 72 px.'))),'1fr 1.1fr'),
 lines:['Teal is our box for the dog. Purple is a guess, moved 60 px right and 40 px down. How good is the guess?',
  'One idea: measure how far apart the centres are. Here 72 px. Is that a lot?'],
 ask:['Is the purple box a good guess?','How far apart are the centres?'],
 expected:['Roughly: it covers most of the dog but misses part of it.','√(60² + 40²) ≈ 72 pixels.'],
 transition:'Is 72 px a lot? It depends on the box.',source:PHOTO_SRC});
S_('compare-small','boxes','The same slip on a small object',{builds:2,
 body:cols(photo('street',W2,H2,gtBox(farP,'',{w:3})+gat(2,prBox(shifted(farP),'',{w:3})),'The same shift on a tiny person: the boxes no longer touch',{view:[520,380,180,140]}),
  stack(p(`A person far down the street, ${farP[2]-farP[0]} px wide.`),at(2,p('Move the box by the same 60 px right and 40 px down: it no longer touches the person.'))),'1.1fr 1fr'),
 lines:[`A person far down the street: ${farP[2]-farP[0]} pixels wide.`,'The same 72-pixel slip misses the person entirely. A small error for the dog is a miss here, so compare overlap instead of distance.'],
 ask:['How wide is this person?','Why is centre distance a poor score?'],
 expected:[`${farP[2]-farP[0]} pixels.`,'It ignores the box’s size: the same distance is small for a large box and fatal for a small one.'],
 transition:'Compare the areas instead.',source:PHOTO_SRC});
const iouDiagram=()=>{const A=[60,60,400,300],B=[230,150,560,380],I=[230,150,400,300];
 return fig(620,440,
  `<g data-at="2"><path d="M60,60 H400 V150 H560 V380 H230 V300 H60 Z" fill="${COL.loss}" fill-opacity=".14"/>${label(240,428,'A ∪ B: everything shaded',{size:26,fill:COL.loss,weight:700})}</g>`+
  `<g data-at="1">${rect(I,{stroke:'none',w:0,fill:COL.guess,op:.35})}${label(315,232,'A ∩ B',{size:26,fill:COL.ink,anchor:'middle',weight:700})}</g>`+rect(A,{stroke:COL.target,w:5})+rect(B,{stroke:COL.guess,w:5})+label(70,50,'A',{size:30,fill:COL.target,weight:700})+label(536,410,'B',{size:30,fill:COL.guess,weight:700}),'Two overlapping boxes, their intersection and their union');};
S_('iou-def','boxes','Intersection over union (IoU)',{builds:3,
 body:cols(iouDiagram(),stack(at(1,p('Intersection: the area covered by both boxes.')),at(2,p('Union: the area covered by at least one of them.')),
  at(3,eq(R`\mathrm{IoU}(A,B)=\frac{\text{area}(A\cap B)}{\text{area}(A\cup B)}`)),at(3,small('Identical boxes: IoU = 1. Boxes that do not touch: IoU = 0.'))),'1fr 1fr'),
 lines:['The intersection: the region inside both boxes.','The union: the region inside either box.','IoU divides the first by the second. It is a fraction of area, so it does not care how big the boxes are.'],
 ask:['What is the intersection?','What is the union?','What is IoU when the two boxes are the same? When they are apart?'],
 expected:['The overlap: area inside both.','Everything inside at least one box.','1 and 0.'],
 transition:'Compute it for the dog and the guess.'});
const ip=S.iou_practice,IB=ip.inter_box;
const iouFig=b=>courtyard(gtBox(DOG,'A',{size:28})+prBox(guess,'B',{size:28})+(b>=3?rect(IB,{stroke:'none',w:0,fill:COL.guess,op:.35}):'')+
 (b>=1?line(guess[0],0,guess[0],H,{stroke:COL.ink,w:3,dash:'8 6'}):'')+(b>=2?line(0,guess[1],W,guess[1],{stroke:COL.ink,w:3,dash:'8 6'}):'')+(b>=3?line(DOG[2],0,DOG[2],H,{stroke:COL.ink,w:3,dash:'8 6'})+line(0,DOG[3],W,DOG[3],{stroke:COL.ink,w:3,dash:'8 6'}):''),'The overlap rectangle of the two boxes',{view:dogView});
S_('iou-overlap','boxes','IoU, step 1: the overlap rectangle',{builds:3,
 body:cols(`<div class="state-slot">${[1,2,3].map(b=>`<div data-only="${b}">${iouFig(b)}</div>`).join('')}</div>`,
  sm(at(1,eq(R`\text{left}=\max(${DOG[0]},\,${guess[0]})=${IB[0]}`)),at(2,eq(R`\text{top}=\max(${DOG[1]},\,${guess[1]})=${IB[1]}`)),
   at(3,eq(R`\text{right}=\min(${DOG[2]},\,${guess[2]})=${IB[2]}`)),at(3,eq(R`\text{bottom}=\min(${DOG[3]},\,${guess[3]})=${IB[3]}`))),'0.9fr 1.1fr'),
 lines:['The overlap starts where both boxes have started: the larger of the two left edges.','Likewise its top is the larger of the two tops.','It ends where the first box ends: the smaller right edge and the smaller bottom edge. The shaded rectangle is the overlap.'],
 ask:['Why the larger of the two left edges?','What is the top of the overlap?','Why the smaller right edge?'],
 expected:['A point is in both boxes only if it is right of both left edges.',String(IB[1]),'A point must be left of both right edges.'],
 transition:'Next, its width, height and area.',source:PHOTO_SRC});
const dim=(x1,y1,x2,y2,t,tx,ty,anchor)=>arrow(x1,y1,x2,y2,{stroke:COL.ink,w:4,both:true})+label(tx,ty,t,{size:30,fill:COL.ink,weight:700,anchor,halo:true});
const overlapSize=courtyard(gtBox(DOG,'A',{size:28})+prBox(guess,'B',{size:28})+rect(IB,{stroke:'none',w:0,fill:COL.guess,op:.35})+
 [[IB[0],0,IB[0],H],[0,IB[1],W,IB[1]],[IB[2],0,IB[2],H],[0,IB[3],W,IB[3]]].map(([x1,y1,x2,y2])=>line(x1,y1,x2,y2,{stroke:COL.ink,w:3,dash:'8 6'})).join('')+
 gat(1,dim(IB[0],IB[3]-30,IB[2],IB[3]-30,`${ip.iw} px`,(IB[0]+IB[2])/2,IB[3]-44,'middle'))+gat(2,dim(IB[0]+45,IB[1],IB[0]+45,IB[3],`${ip.ih} px`,IB[0]+59,(IB[1]+IB[3])/2+10,'start'))+
 gat(3,label((IB[0]+IB[2])/2+30,(IB[1]+IB[3])/2-60,`${big(ip.inter)} px²`,{size:34,fill:COL.ink,weight:700,anchor:'middle',halo:true})),'The overlap’s width and height, measured between its edges',{view:dogView});
S_('iou-overlap-area','boxes','IoU, step 2: the overlap’s area',{builds:3,
 body:cols(overlapSize,
  sm(`<div class="table-sm tight fit">${table(['','left','top','right','bottom'],[['overlap',...IB]])}</div>`,
   at(1,eq(R`\text{width}=\text{right}-\text{left}=${IB[2]}-${IB[0]}=${ip.iw}`)),
   at(2,eq(R`\text{height}=\text{bottom}-\text{top}=${IB[3]}-${IB[1]}=${ip.ih}`)),
   at(3,eq(R`\text{area}=\text{width}\times\text{height}=${ip.iw}\times${ip.ih}=${bt(ip.inter)}`))),'0.9fr 1.1fr'),
 lines:['Measure the overlap the way we measured the dog’s box. Width first: its right edge minus its left edge.',
  'Then the height: bottom minus top. A negative width or height would mean the boxes do not touch, and the overlap is 0.',
  `So the two boxes share ${big(ip.inter)} square pixels. This is the top of the IoU fraction.`],
 ask:['How wide is the overlap?','How tall is the overlap?','What is the overlap’s area?'],
 expected:[`${IB[2]} − ${IB[0]} = ${ip.iw} pixels.`,`${IB[3]} − ${IB[1]} = ${ip.ih} pixels.`,`${ip.iw} × ${ip.ih} = ${big(ip.inter)} px².`],
 misconception:'Clamp the width and height at zero: two boxes far apart would otherwise give a “negative overlap” whose product can be positive.',
 transition:'Now the union.',source:PHOTO_SRC});
S_('iou-union','boxes','IoU, step 3: the union, then the ratio',{builds:3,
 body:stack(at(1,eq(R`\text{area}(A)=(${DOG[2]}-${DOG[0]})\times(${DOG[3]}-${DOG[1]})=${S.dog.w}\times${S.dog.h}=${bt(ip.area_a)}`)),
  at(1,eq(R`\text{area}(B)=(${guess[2]}-${guess[0]})\times(${guess[3]}-${guess[1]})=${guess[2]-guess[0]}\times${guess[3]-guess[1]}=${bt(ip.area_b)}`)),
  at(2,eq(R`\text{union}=${bt(ip.area_a)}+${bt(ip.area_b)}-${bt(ip.inter)}=${bt(ip.union)}`)),
  at(3,eq(R`\mathrm{IoU}=\frac{${bt(ip.inter)}}{${bt(ip.union)}}=${num(ip.iou,3)}`))),
 lines:['Each box’s own area. The guess has the same size as our box; it is only moved.','Adding the two areas counts the overlap twice, so subtract it once.',`IoU = ${num(ip.iou,3)}. A move of 60 px right and 40 px down cost more than a third of the score.`],
 ask:['What is each area?','Why subtract the overlap?','What is the IoU?'],
 expected:[`${big(ip.area_a)} px² each.`,'It was counted in both areas.',num(ip.iou,3)],
 transition:'What do different IoU values look like?'});
const gallery=S.iou_gallery.map(g=>{const b=[DOG[0]+g.shift,DOG[1],DOG[2]+g.shift,DOG[3]],hit=g.iou>=.5;return `<figure>${courtyard(gtBox(DOG,'',{w:7})+prBox(b,'',{w:7}),`IoU ${g.iou}`,{view:[300,40,640,600]})}<figcaption>IoU ${g.iou} · moved ${g.shift} px<span data-at="2" class="${hit?'hit':'miss'}"> · ${hit?'hit':'miss'}</span></figcaption></figure>`;}).join('');
S_('iou-feel','boxes','What IoU values look like',{builds:2,
 body:`<div class="four thumb">${gallery}</div>`,
 lines:['The guess slides sideways. At 0.9 the boxes nearly agree; at 0.5 the guess has moved a third of the dog’s width; at 0.3, half of it.',`Most benchmarks call IoU ≥ 0.5 a hit. A trained detector does much better on this dog: ${num(S.iou_real.iou,3)}.`],
 ask:['Which of these would you accept as finding the dog?','How does a trained detector compare?'],
 expected:['Most people accept 0.7 and reject 0.3; 0.5 is the usual cut-off.',`Its box has IoU ${num(S.iou_real.iou,3)}.`],
 point:'For a sideways move s of a box of width w, IoU = (w − s)/(w + s): IoU 0.5 needs s = w/3.',
 transition:'Try it yourself.',source:YOLO_SRC});
const ans=S.iou_answers;
S_('iou-play','boxes','Try it: drag a box over the dog',{builds:1,
 body:widget('iou-play','Drag a box and watch its IoU with the dog’s box'),
 lines:['Drag the purple box. Can you find a box with IoU 0.5 that looks good? One with IoU 0.7 that looks bad? The two lower buttons show one of each.'],
 ask:['Which box scores about 0.5 yet looks fine, and which scores 0.7 yet looks wrong?'],
 expected:[`A loose box round the whole dog, twice its area: IoU ${num(ans.loose.iou,2)}. A snug box with the head cut off: IoU ${num(ans.headless.iou,2)}. IoU counts pixels; it does not know the head matters.`],
 point:'Shrink the box inside the dog: IoU falls even though every purple pixel is on the dog. IoU punishes too small as much as too big. “Snap onto the dog” gives IoU 1.',
 transition:'In code, IoU is computed for many pairs at once.'});
const cRing=(x,y)=>`<circle cx="${x}" cy="${y}" r="10" fill="#fff" stroke="${COL.ink}" stroke-width="3"/>`,cDot=(x,y)=>`<circle cx="${x}" cy="${y}" r="11" fill="${COL.ink}" stroke="#fff" stroke-width="3"/>`;
const cTag=(x,y,t,o={})=>label(x,y,t,{size:24,fill:COL.ink,weight:650,halo:true,...o});
// our box a and the guess b drawn to scale on paper, with what each line of box_iou computes (photo coordinates; the viewBox frames them)
const iouCodeFig=`<div class="diagram-scroll"><svg class="plot wsvg" viewBox="340 20 660 660" role="img" aria-label="Our box a and the guess b, with what each line of box_iou computes">`+
 gat(4,rect(IB,{stroke:'none',w:0,fill:COL.guess,op:.3})+cTag((IB[0]+IB[2])/2,(IB[1]+IB[3])/2,`inter = ${big(ip.inter)}`,{anchor:'middle'}))+
 rect(DOG,{stroke:COL.target,w:5})+rect(guess,{stroke:COL.guess,w:5})+
 cTag(DOG[0],DOG[1]-14,`a = (${DOG.join(', ')})`,{fill:COL.target})+cTag(guess[2]-18,guess[3]+34,`b = (${guess.join(', ')})`,{fill:COL.guess,anchor:'end'})+
 gat(2,cRing(DOG[0],DOG[1])+cDot(IB[0],IB[1])+cTag(IB[0]+16,IB[1]+38,`lt = (${IB[0]}, ${IB[1]})`))+
 gat(3,cRing(guess[2],guess[3])+cDot(IB[2],IB[3])+cTag(IB[2]-16,IB[3]-18,`rb = (${IB[2]}, ${IB[3]})`,{anchor:'end'}))+
 gat(5,cTag(DOG[0]+10,DOG[1]+30,`area_a = ${big(ip.area_a)}`,{fill:COL.target,size:22})+cTag(guess[2]-10,guess[3]-6,`area_b = ${big(ip.area_b)}`,{fill:COL.guess,size:22,anchor:'end'}))+
 gat(6,`<path d="M${DOG[0]},${DOG[1]} H${DOG[2]} V${guess[1]} H${guess[2]} V${guess[3]} H${guess[0]} V${DOG[3]} H${DOG[0]} Z" fill="none" stroke="${COL.ink}" stroke-width="4" stroke-dasharray="12 8"/>`+cTag(guess[2]+14,300,'union')+cTag(guess[2]+14,332,big(ip.union)))+
 gat(7,cTag(guess[2]+14,420,'IoU',{fill:COL.guess})+cTag(guess[2]+14,458,num(ip.iou,3),{fill:COL.guess,size:34}))+'</svg></div>';
S_('iou-code','boxes','IoU in code: every pair at once',{builds:8,
 body:cols(`<div class="code-sm">${codeSteps([[1,'def box_iou(a, b):  # a: (N, 4), b: (M, 4)'],
  [2,'    lt = torch.max(a[:, None, :2], b[:, :2])'],[3,'    rb = torch.min(a[:, None, 2:], b[:, 2:])'],
  [4,'    inter = (rb - lt).clamp(min=0).prod(-1)'],[5,'    area_a = (a[:, 2:] - a[:, :2]).prod(-1)'],[5,'    area_b = (b[:, 2:] - b[:, :2]).prod(-1)'],
  [6,'    union = area_a[:, None] + area_b - inter'],[7,'    return inter / union'],[0,''],
  [8,`a = torch.tensor([[${DOG.join('., ')}.]])`],[8,`b = torch.tensor([[${guess.join('., ')}.]])`],[8,`box_iou(a, b)        # tensor([[${num(ip.iou,4)}]])`]])}</div>`,
  iouCodeFig,'1.12fr 1fr'),
 lines:['IoU for two lists of boxes in corner format: N boxes in a, M in b. We try it on one pair, our box and the guess.',
  'Line 2 is step 1’s max: the larger of the two top-left corners. The None in a[:, None] lets every box in a meet every box in b.',
  'Line 3 takes the smaller of the two bottom-right corners.',
  'Subtract the corners for the width and height, set a negative one to 0, and multiply: the overlap.',
  'Each box’s own area, the same way: bottom-right minus top-left, multiplied.',
  'The union, as in step 3: both areas added, minus the overlap they both contain.',
  `Divide: ${big(ip.inter)} / ${big(ip.union)} = ${num(ip.iou,3)}.`,
  `Run it on our pair: ${num(ip.iou,4)}, as by hand. With 31 boxes in a and 2 in b, it returns a 31 × 2 matrix: every pair at once.`],
 ask:['What shapes do a and b have?','Why max for the top-left corner?','Why min for the bottom-right?','What does clamp(min=0) do?','What are the two areas here?','Why subtract inter?','What does it return for our pair?','What shape does box_iou return for 31 boxes against 2?'],
 expected:['(N, 4) and (M, 4): one row of corners per box.','A point in both boxes is right of both left edges and below both tops.','It must also be left of both right edges and above both bottoms.','It sets a negative width or height to 0, so boxes that do not touch have overlap 0.',`${big(ip.area_a)} px² each: ${S.dog.w} × ${S.dog.h}.`,'The overlap lies inside both boxes, so adding the two areas counts it twice.',num(ip.iou,3),'(31, 2): every pair.'],
 point:'torchvision.ops.box_iou does the same, down to its union line, area1[:, None] + area2 - inter. Broadcasting does the pairing: (N, 1, 2) against (M, 2) gives (N, M, 2).',
 demo:'Notebook part 3 runs box_iou on the two boxes and checks it against torchvision.ops.box_iou.',
 transition:'Part 3 in one slide.',source:'The two boxes from step 1: our annotation of the dog and the guess moved 60 px right and 40 px down.'});
recap(3,'boxes',[`A box is four numbers: corners (${DOG.join(', ')}), or centre and size; a label file holds one line per object.`,`IoU = overlap ÷ union: 1 for the same box, 0 for boxes apart. The 60-px guess: ${num(ip.iou,3)}.`,'IoU ≥ 0.5 is the usual “found it”.'],
 'ask a network for one box, then several, and see where it breaks.',
 {flow:chart([{steps:[{t:'two boxes,\n4 numbers each'},{t:'overlap: the\ninner edges'},{t:'overlap area,\nw × h'},{t:'union = A + B\n− overlap'},{t:'IoU = overlap\n÷ union',hi:1}]}],{alt:'IoU in steps: two boxes, the overlap’s edges, its area, the union, then overlap over union'}),
  ask:'What is the IoU of two identical boxes, and of two boxes that do not touch?',expected:'1 and 0.',transition:'Part 4.'});

// ================================================================================================ Part 4
partBreak(4,'onebox','One box is easy; several are not','One object: a classifier with four more outputs for the box. Two objects show why detection needs more.',[
 'Add a box head to a classifier.','Write the answer as numbers, with “?” where there is nothing to learn.','The loss: compare only where it counts.','Two animals, one box: it hedges.'],
 {line:'One object is easy: a classifier with four more outputs. Two objects show why detection needs more than that.',ask:'What could go wrong with two objects and one box output?',expected:'The network cannot know which object to describe; it may average them.',transition:'One object first.'});
chap('4.1');
S_('one-object','onebox','One object: a box head beside the class head',{builds:3,
 body:flow([
  {id:'img',x:10,y:110,w:150,h:90,label:'photo',role:'data'},
  {id:'cnn',x:220,y:110,w:170,h:90,label:'CNN',sub:'backbone',role:'ink'},
  {id:'vec',x:450,y:110,w:150,h:90,label:'features',sub:'one vector',role:'ink'},
  {id:'cls',x:690,y:20,w:290,h:90,label:'class head',sub:'cat, dog or nothing',role:'q'},
  {id:'box',x:690,y:200,w:290,h:90,label:'box head',sub:'4 numbers: the box',role:'p'}],
  [{from:'img',to:'cnn'},{from:'cnn',to:'vec'},{from:'vec',to:'cls',role:'q'},{from:'vec',to:'box',role:'p'}],{width:1000,height:310,label:'A classifier with an extra head that outputs four box numbers'}),
 lines:['Start from a classifier: a CNN turns the photo into one feature vector, and a layer turns that into class scores.','Add a second small layer on the same vector: four numbers for the box.','Train both at once, comparing each output with the annotation.'],
 ask:['What does the box head output?','Which part is shared?','What could the box loss be?'],
 expected:['Four numbers: the box’s centre and size, b_x, b_y, b_w, b_h.','The CNN and its feature vector.','Any distance between the four predicted and four true numbers, such as the sum of absolute differences.'],
 transition:'What exactly should the network learn to write?'});
const SG=S.single;
const yvec=(vals,cls)=>`<div class="yvec">${[['object?',vals[0]],[m('b_x'),vals[1]],[m('b_y'),vals[2]],[m('b_w'),vals[3]],[m('b_h'),vals[4]],['cat',vals[5]],['dog',vals[6]]].map(([k,v],i)=>`${i===1||i===5?'<i></i>':''}<div class="${Array.isArray(cls)?cls[i]:cls}"><small>${k}</small>${v}</div>`).join('')}</div>`;
const catDot=`<circle cx="${SG.norm[0]*W2}" cy="${SG.norm[1]*H2}" r="13" fill="${COL.target}" stroke="#fff" stroke-width="5"/>`,corner01=label(18,58,'(0, 0)',{size:50,fill:COL.ink,weight:700,halo:true})+label(W2-18,H2-22,'(1, 1)',{size:50,fill:COL.ink,weight:700,anchor:'end',halo:true});
S_('target-y','onebox','Write the answer as numbers: the target for one photo',{builds:3,
 body:stack(cols(photo('cat',W2,H2,gtBox(SG.box,'cat',{size:44,w:8})+catDot+corner01,'The single-cat photo with its box, its centre, and the corners (0, 0) and (1, 1)',{cls:'short'}),yvec([1,...SG.norm.map(v=>num(v,2)),1,0],'t'),'0.62fr 1.38fr'),
  at(2,cols(photo('cat',W2,H2,'','A patch of empty floor',{view:[40,370,560,320],cls:'short'}),yvec([0,'?','?','?','?','?','?'],'q')+at(3,small('Only “object?” is learned here: each ? is left out of the loss.')),'0.62fr 1.38fr'))),
 lines:['The answer as numbers: object? 1, then the box as fractions of the photo (0 at the top-left, 1 at the bottom-right), then cat 1, dog 0.',
  'A photo of empty floor: object? is 0. The box and the class have no right answer, so we write “?”: don’t care.',
  'Only entries with a right answer are learned: for the floor, just object?.'],
 ask:['What are the seven target numbers for the cat photo?','What should the box be for a photo with no object?','Which entries does the loss use for the floor photo?'],
 expected:[`1; then about (${SG.norm.map(v=>num(v,2)).join(', ')}); then cat 1, dog 0.`,'Nothing: there is no box, so we do not care what the network writes there.','Only “object?”, with target 0.'],
 point:'This is how Andrew Ng introduces localisation (Deep Learning Specialization, Course 4, Week 3): y = (p_c, b_x, b_y, b_h, b_w, c_1, c_2, c_3), with “?” for every entry after p_c = 0.',
 transition:'The loss: compare where it counts.',source:'Our annotation of the single-cat photo (data/annotations.json). '+PHOTO_SRC});
// the loss on two made-up predictions: for each case the network's ŷ, the target y and the squared differences
const LD=S.loss_demo,f2=v=>Number.isInteger(v)?String(v):num(v,2),KEYS7=['object?',m('b_x'),m('b_y'),m('b_w'),m('b_h'),'cat','dog'];
/** One record as a row of boxes, appearing at build b: kind p (the network’s ŷ), t (the target y), l (a loss term) or
 *  q (“?”, or skipped), coloured as in the formulas. head puts the entry names in the boxes. */
const lossRow=(label,vals,kinds,b,head=false)=>`<div class="loss-row" data-at="${b}"><span class="sl">${label}</span><div class="yvec sm kinds${head?'':' bare'}">`+
 vals.map((v,i)=>`${i===1||i===5?'<i></i>':''}<div class="${Array.isArray(kinds)?kinds[i]:kinds}">${head?`<small>${KEYS7[i]}</small>`:''}${v}</div>`).join('')+'</div></div>';
const lossLabs=yWord=>[kp(`network ${m('\\hat y')}`),kt(`${yWord} ${m('y')}`),kl(m('(\\hat y-y)^2'))],[labP,labT,labL]=lossLabs('target'),skip=k=>[k,...Array(6).fill('q')];
S_('loss-y','onebox','The loss: compare only where it counts',{builds:5,
 body:stack(cols(lossRow(labP,LD.cat.pred.map(String),'p',1,true)+lossRow(labT,LD.cat.target.map(f2),'t',1)+lossRow(labL,LD.cat.sq.map(v=>num(v,2)),'l',2),
   stack(small('cat photo: an object, so all seven count'),at(2,`<div class="eq-sm">${eq(R`\lcol{\mathcal L}=\textstyle\sum_{i=1}^{7}(\qcol{\hat y_i}-\pcol{y_i})^2=\lcol{${num(LD.cat.loss,2)}}`)}</div>`)),'1.62fr 1fr'),
  cols(lossRow(labP,LD.floor.pred.map(String),'p',3)+lossRow(labT,[0,'?','?','?','?','?','?'],skip('t'),3)+lossRow(labL,[f2(LD.floor.loss),'·','·','·','·','·','·'],skip('l'),4),
   stack(at(3,small('empty floor: only object? counts')),at(4,`<div class="eq-sm">${eq(R`\lcol{\mathcal L}=(\qcol{\hat y_1}-\pcol{y_1})^2=(\qcol{${LD.floor.pred[0]}}-\pcol{0})^2=\lcol{${num(LD.floor.loss,2)}}`)}</div>`)),'1.62fr 1fr'),
  at(5,small('In practice: cross-entropy for object? and the classes, and an L1 or squared loss for the box.'))),
 lines:[`Say the network writes ${kp('these seven numbers')} for the cat photo; they are made up for this example. Line them up with ${kt('the target')}.`,
  `There is an object, so all seven are compared: square each difference and add them up. The loss is ${kl(num(LD.cat.loss,2))}.`,
  `For a patch of empty floor ${kp('the network still writes seven numbers')}. ${kt('The target')} has object? = 0 and “?” everywhere else.`,
  `Only object? is compared: (${LD.floor.pred[0]} − 0)² = ${kl(num(LD.floor.loss,2))}. Whatever the network writes under a “?” costs nothing.`,
  'Real detectors pick a better loss for each kind of entry, but the rule stays the same: skip the “?”.'],
 ask:['Which numbers come from the network, and which from the annotation?','What is the loss for the cat photo?','Does the network write “?” for the floor?','Which entries count for the empty floor, and what is the loss?','What does a real detector use for the class entries?'],
 expected:['The network writes ŷ, all seven numbers, every time; the target y comes from the annotation.',`(0.9 − 1)² + (0.6 − 0.67)² + … + (0.2 − 0)² ≈ ${num(LD.cat.loss,2)}.`,'No: it always writes seven numbers. The “?” is in the target.',
  `Only object?: (${LD.floor.pred[0]} − 0)² = ${num(LD.floor.loss,2)}. The other six are skipped.`,'Cross-entropy, as in classification.'],
 point:'The two predictions are made up for this example; the cat photo’s target is its real one. Ng (Course 4, Week 3, Object Localization) uses squared error in both cases for simplicity, then says that in practice the classes use log-likelihood, p_c a logistic loss, and the box squared error.',
 transition:'Now two animals.',source:'Our annotation of the single-cat photo (data/annotations.json); the two predictions are made up for this example.'});
const ab=S.average_box;
S_('two-objects','onebox','Two animals, one box: which one should it draw?',{builds:3,
 body:cols(courtyard(gtBox(DOG,'dog',{size:30})+gtBox(CAT,'cat',{size:30})+gat(2,prBox(ab.box,'',{w:6,dash:'14 8'})+pill(ab.box[0]+6,ab.box[3]-8,'the average',{fill:COL.guess,size:30})),'The dog box, the cat box, and their average'),
  stack(p('The annotation lists both animals. The head has room for one box.'),
   at(2,stack(p('Its safest single answer lies in between: the average box.'),
    `<div class="eq-sm">${eq(R`\lcol{\mathcal L}(\qcol{\hat b})=\tfrac12\|\qcol{\hat b}-\pcol{b_\text{dog}}\|^2+\tfrac12\|\qcol{\hat b}-\pcol{b_\text{cat}}\|^2`)}${eq(R`\text{smallest at }\qcol{\hat b}=\tfrac12(\pcol{b_\text{dog}}+\pcol{b_\text{cat}})`)}</div>`)),
   at(3,`<div class="eq-sm">${eq(R`\mathrm{IoU}(\qcol{\text{avg}},\pcol{\text{dog}})=${num(ab.iou_dog,3)}`)}${eq(R`\mathrm{IoU}(\qcol{\text{avg}},\pcol{\text{cat}})=${num(ab.iou_cat,3)}`)}</div>`)),'1.25fr 1fr'),
 lines:['One box head, two animals. Which should it draw?',`If half the annotations list the dog first and half the cat, the squared error is smallest for ${kp('the average')} of ${kt('the two boxes')}: the network learns to hedge.`,'A box between two objects describes neither of them.'],
 ask:['Which animal should the single box describe?','What does a squared-error loss learn when the target flips between two boxes?','Does the average box find either animal?'],
 expected:['There is no right answer: the task is ill-posed.','The average of the two boxes, the value that minimises the expected squared error.',`No: IoU ${num(ab.iou_dog,2)} and ${num(ab.iou_cat,2)}, both far below 0.5.`],
 misconception:'More training does not fix it: the hedge is the optimum of this loss for this task.',
 transition:'Part 4 in one slide.',source:PHOTO_SRC});
recap(4,'onebox',['One object: a CNN with a class head and a box head writes a 7-number record.','The target uses “?” wherever there is nothing to learn, and the loss skips those entries.',
 `Two animals, one record: it learns the average box, which finds neither (IoU ${num(ab.iou_dog,2)}, ${num(ab.iou_cat,2)}).`],
 'give every place in the photo its own record.',
 {flow:chart([{steps:[{t:'photo'},{t:'CNN'},{t:'record: object?,\nbox, classes',hi:1},{t:'compare with\nthe target'},{t:'loss; skip “?”\nif no object'}]}],{alt:'One box: photo, CNN, a record of object?, box and classes, compared with the target, then the loss'}),
  ask:'Why does one record fail for two animals?',expected:'It can describe only one object, so it hedges between them.',transition:'Part 5.'});
// ================================================================================================ Part 5
partBreak(5,'dense','A candidate at every place','Tie each output to a place: a grid of cells over the photo, each writing one record.',[
 'Slide a classifier over the photo, and see what is wrong with that.','YOLO, part 1: from a person’s boxes to the ground-truth table, step by step.','YOLO, part 2: the network’s table, compared cell by cell; the loss; training.','The real grid: read its boxes out and keep the confident ones; the whole algorithm.'],
 {line:'Every cell of a grid writes a record. We work out its target and its loss, then read its box back out.',ask:'If every place in the image has its own output, which outputs should describe the dog?',expected:'The ones at, or near, the dog’s location.',transition:'Start from a tool we already have: a classifier.'});
chap('5.1');
const G=S.grid,CELL=S.cell,s32=G.stride,WN=S.windows;
const grid=(inner,alt,o={})=>courtyard(gridLines(W,H,s32,{op:.5})+inner,alt,o);
const crops=[['dog',[DOG[0],DOG[1],DOG[2]-DOG[0],DOG[3]-DOG[1]]],['cat',[CAT[0],CAT[1],CAT[2]-CAT[0],CAT[3]-CAT[1]]],['nothing',[776,370,184,260]]];
S_('crop-classifier','dense','Start from a tool we have: a classifier for crops',{builds:2,
 body:stack(`<div class="three thumb crops">${crops.map(([n,v])=>`<figure>${courtyard('',`A crop labelled ${n}`,{view:v,cls:'short'})}<figcaption><b>${n}</b></figcaption></figure>`).join('')}</div>`,
  at(2,p('Train a classifier on many crops like these. Shown one crop, it answers: dog, cat, or nothing.'))),
 lines:['Three crops cut from the courtyard: a dog, a cat, and floor with nothing on it.','It cannot say where anything is in a whole photo. Can we use it to find objects anyway?'],
 ask:['What label does each crop get?','What can such a classifier not do on its own?'],
 expected:['Dog, cat, nothing.','Say where objects are in a large photo, or find two of them.'],
 point:'Andrew Ng’s detection lectures start the same way: a car classifier trained on closely cropped car images, then slid over the image.',
 transition:'Slide it over the photo.',source:PHOTO_SRC});
// sliding windows, as Ng teaches them: one window, moved a step at a time; every place it can go; then a bigger window
const CW=S.convwin,SH=WN.shift,WS=WN.size,nAcross=(W-WS)/SH+1,nDown=(H-WS)/SH+1,big2=WN.big,[bigA,bigD]=WN.big_n;
const winAt=(x,y,s=WS)=>[x,y,x+s,y+s],win0=winAt(0,0),win1=winAt(SH,0),winDog=winAt(448,128),winBig=winAt(352,96,big2);
/** A crop of the courtyard, the classifier, and its answer, left to right. */
const cropPipe=(b,answer,col=COL.ink)=>fig(570,210,
 `<svg x="4" y="14" width="180" height="180" viewBox="${b[0]} ${b[1]} ${b[2]-b[0]} ${b[3]-b[1]}"><image href="figures/cat-dog.jpg" width="${W}" height="${H}" preserveAspectRatio="none"/></svg>`+
 `<rect x="4" y="14" width="180" height="180" fill="none" stroke="${b[2]-b[0]>WS?COL.amber:COL.guess}" stroke-width="5"/>`+arrow(196,104,252,104,{w:3,head:12})+
 `<rect x="260" y="66" width="112" height="76" rx="10" fill="#fff" stroke="${COL.ink}" stroke-width="2.5"/>`+label(316,113,'CNN',{size:26,anchor:'middle',fill:COL.ink,weight:700})+
 arrow(380,104,424,104,{w:3,head:12})+label(434,114,answer,{size:30,fill:col,weight:700}),`A crop goes into the classifier, which answers ${answer}`);
const winDots=Array.from({length:nDown},(_,r)=>Array.from({length:nAcross},(_,c)=>`<circle cx="${WS/2+c*SH}" cy="${WS/2+r*SH}" r="6" fill="${COL.guess}" stroke="#fff" stroke-width="2"/>`).join('')).join('');
S_('sliding','dense','Slide the classifier over the photo',{builds:5,
 body:cols(courtyard(gonly(1,rect(win0,{stroke:COL.guess,w:8}))+
   gonly(2,rect(win0,{stroke:COL.guess,w:4,dash:'14 9',op:.75})+rect(win1,{stroke:COL.guess,w:8})+arrow(win0[2],win0[3]+26,win1[2],win0[3]+26,{stroke:COL.guess,w:4,head:12})+label(win1[2]+12,win0[3]+36,`${SH} px`,{size:32,fill:COL.guess,weight:700,halo:true}))+
   gonly(3,rect(winDog,{stroke:COL.guess,w:8})+pill(winDog[0],winDog[1],'dog',{fill:COL.guess,size:34}))+gonly(4,rect(win0,{stroke:COL.guess,w:4,op:.6})+winDots)+
   gonly(5,rect(winBig,{stroke:COL.amber,w:8})+pill(winBig[0],winBig[1],'dog',{fill:COL.amber,size:34})),
  'A 224-pixel window at the top-left, one step to the right, on the dog, at every place it can go; then a bigger window'),
  `<div class="state-slot">${only(1,cropPipe(win0,'nothing'))}${only(2,cropPipe(win1,'nothing'))}${only(3,cropPipe(winDog,'dog',COL.guess))}`+
  `${only(4,stack(`<div class="big-number">${nAcross} × ${nDown} = ${nAcross*nDown}</div>`,p('crops, one per dot: each is a full run of the classifier')))}`+
  `${only(5,stack(cropPipe(winBig,'dog',COL.amber),p(`${big2} × ${big2} windows, shrunk to ${WS} × ${WS}: ${bigA} × ${bigD} = ${bigA*bigD} more crops`)))}</div>`,'1.2fr 1fr'),
 lines:[`Put a ${WS} × ${WS} window in the top-left corner, crop it, and give the crop to the classifier: nothing there.`,
  `Move the window ${SH} pixels to the right and classify again: nothing. Two neighbouring crops share ${Math.round(WN.shared*100)}% of their pixels.`,
  'Keep sliding, across and then down, a row at a time. When the window sits on the dog, the classifier says dog.',
  `One window size gives ${nAcross} × ${nDown} = ${nAcross*nDown} crops, one per dot: ${nAcross*nDown} full runs of the classifier for one photo.`,
  'Objects come in many sizes, so slide a bigger window too, shrinking each crop to the classifier’s size. Every window size adds another full set of runs.'],
 ask:['What does the first crop show?','How much do two neighbouring crops overlap?','Which crops say dog?','How many crops for one window size?','Why slide a bigger window as well?'],
 expected:['Wall and plants: nothing.',`They share ${WS-SH} of their ${WS} columns: ${Math.round(WN.shared*100)}% of their pixels.`,'The ones that sit on the dog.',
  `(${W} − ${WS}) ÷ ${SH} + 1 = ${nAcross} across, (${H} − ${WS}) ÷ ${SH} + 1 = ${nDown} down: ${nAcross*nDown}.`,'An object can be bigger than the window, like this dog.'],
 point:'Ng’s sliding windows (Course 4, Week 3, “Object Detection”): a car classifier trained on closely cropped images, slid with a stride, then with a medium and a large window, each crop resized to the classifier’s input. He notes the cost: with a ConvNet every crop is a full forward pass. OverFeat (2013) worked this way.',
 transition:'What is wrong with this?',source:PHOTO_SRC});
// what is wrong with sliding windows: slow, repeated work, and boxes that are only the windows
const SW=CW.best_dog,BW=WN.best_dog,shareBox=[win1[0],0,win0[2],WS];
const cons=[`It is slow: ${nAcross*nDown} crops, each a full run of the CNN (${Math.round(CW.t_crops)} s for VGG16 on a laptop).`,
 `It repeats work: neighbouring crops share ${Math.round(WN.shared*100)}% of their pixels.`,
 `Its box is only the window: the surest window holds the dog’s head (IoU ${num(SW.iou,2)}).`,
 `Fitting better costs more crops: the best ${WS}-pixel window reaches only IoU ${num(BW.iou,2)}.`];
S_('sliding-cons','dense','What is wrong with sliding windows?',{builds:4,
 body:cols(`<div class="state-slot">${only(1,courtyard(winDots,'Every place the 224-pixel window goes: 336 crops'))}`+
   `${only(2,courtyard(rect(shareBox,{stroke:'none',w:0,fill:COL.loss,op:.4})+rect(win0,{stroke:COL.guess,w:6})+rect(win1,{stroke:COL.guess,w:6,dash:'14 9'}),'Two neighbouring windows; the pixels they share are shaded'))}`+
   `${only('3-4',courtyard(gtBox(DOG,'dog',{size:28,w:6})+rect(SW.box,{stroke:COL.guess,w:7,dash:'16 9'})+pill(SW.box[0],SW.box[1],`dog ${num(SW.p,2)}`,{fill:COL.guess,size:30,below:true})+
     gat(4,rect(BW.box,{stroke:COL.amber,w:7,dash:'16 9'})),'The dog’s box, the window VGG16 is surest about, then the best-fitting window',{view:dogView}))}</div>`,
  `<ol class="steps cons">${cons.map((t,i)=>`<li data-at="${i+1}">${t}</li>`).join('')}</ol>`,'1.1fr 1fr'),
 lines:[`First, speed: one window size already means ${nAcross*nDown} separate runs of the classifier. VGG16 needs ${Math.round(CW.t_crops)} s for them on a laptop, for one photo.`,
  `Second, repeated work: two neighbouring crops share ${Math.round(WN.shared*100)}% of their pixels, yet each crop is processed from scratch.`,
  `Third, the box is only the window. The window VGG16 is surest about holds just the dog’s head: IoU ${num(SW.iou,2)} with the dog’s box.`,
  `Even the best-placed window reaches IoU ${num(BW.iou,2)}. Fitting better needs more sizes and shapes: more crops still. We want one pass that writes the box.`],
 ask:['How many classifier runs does one window size need?','Why is most of that work repeated?','Why is the surest window a poor box?','What would fix both problems?'],
 expected:[`${nAcross*nDown}: one per crop.`,`Neighbouring crops overlap: ${WS-SH} of their ${WS} columns are the same pixels.`,
  'The classifier says “dog” for any crop with enough dog in it, and a window cannot change its shape to fit.','One pass over the whole photo that writes the boxes directly.'],
 point:`Ng lists the same costs: every crop is a full ConvNet pass; a coarse stride gives poor boxes and a fine one costs even more; and the best box may not even be square. His convolutional trick for the speed (one pass gives all 336 answers, ${num(CW.t_onepass,1)} s instead of ${Math.round(CW.t_crops)} s) is in Appendix B.`,
 transition:'YOLO: grid the photo, and let every cell write a box.',source:'VGG16 (torchvision, ImageNet) run on this photo by scripts/run_models.py; timed on a laptop CPU. '+PHOTO_SRC});
chap('5.2');
// Ng's teaching grid: 3 x 2 cells of 320 px on the courtyard; every cell writes Part 4's 7-number record
const N3=S.ng3,s3=N3.size,CC=S.centre_cells,NG=S.ng,dot=(c,col)=>`<circle cx="${c[0]}" cy="${c[1]}" r="11" fill="${col}" stroke="#fff" stroke-width="4"/>`;
const grid3=(inner,alt,o={})=>courtyard(gridLines(W,H,s3,{stroke:'#fff',w:5,op:.95})+inner,alt,o);
const rec7=(vals,cls)=>`<div class="yvec sm">${[['object?',vals[0]],[m('b_x'),vals[1]],[m('b_y'),vals[2]],[m('b_w'),vals[3]],[m('b_h'),vals[4]],['cat',vals[5]],['dog',vals[6]]].map(([k,v],i)=>`${i===1||i===5?'<i></i>':''}<div class="${cls}"><small>${k}</small>${v}</div>`).join('')}</div>`;
/** One record as Ng writes it: a column, a label and a value per row. */
const ycol=(vals,cls)=>`<div class="ycol">${[['object?',vals[0]],[m('b_x'),vals[1]],[m('b_y'),vals[2]],[m('b_w'),vals[3]],[m('b_h'),vals[4]],['cat',vals[5]],['dog',vals[6]]].map(([k,v])=>`<span>${k}</span><div class="${cls}">${v}</div>`).join('')}</div>`;
const cellName=(r,c)=>label(c*s3+14,r*s3+44,`(${r}, ${c})`,{size:36,fill:COL.ink,weight:700,halo:true});
const allNames=[0,1].flatMap(r=>[0,1,2].map(c=>cellName(r,c))).join('');
S_('grid-3x2','dense','YOLO, “You Only Look Once”: cut the photo into cells',{builds:3,
 body:cols(grid3(allNames+gat(2,cell(0,0,s3,{fill:COL.amber,op:.35}))+gat(3,[[0,1],[0,2],[1,0],[1,1],[1,2]].map(([r,c])=>cell(r,c,s3,{fill:COL.amber,op:.35})).join('')),'The courtyard photo cut into 320-pixel cells, 3 across and 2 down; one cell shaded, then all of them'),
  `<div class="state-slot">${only(1,`<div class="eq-sm">${eq(R`\text{cells of }320\times320\text{ pixels}`)}${eq(R`${W}\div320=3\text{ across},\quad ${H}\div320=2\text{ down}`)}</div>`)}`+
  `${only(2,`<p class="caption">every cell gets a record:</p>${ycol(['','','','','','',''],'q')}`)}`+
  `${only(3,`<div class="eq-sm">${eq(R`\text{ground truth: }2\times3\times7\ \leftarrow\ \text{a person’s boxes}`)}${eq(R`\text{prediction: }2\times3\times7\ \leftarrow\ \text{the network}`)}</div>`)}</div>`,'1fr 1fr'),
 lines:['YOLO, “You Only Look Once”: look at the whole photo once, not 336 times. Cut it into cells of 320 × 320 pixels: the photo becomes 3 × 2 cells.',
  'Each cell gets Part 4’s record, a vector of 7 numbers about that cell: object?, the box b_x, b_y, b_w, b_h, and a cat and a dog score.',
  'We fill this 2 × 3 × 7 table twice: from a person’s boxes, the ground truth, and from the network, the prediction. Training makes the two agree.'],
 ask:['What does the name YOLO say?','What does a cell’s record hold?','Which two tables will we compare?'],
 expected:['One look: a single pass of one network over the whole photo, instead of a classifier run on 336 crops.','Part 4’s 7 numbers: object?, b_x, b_y, b_w, b_h, cat, dog.','The ground truth, built from a person’s boxes, and the network’s prediction.'],
 point:'Redmon et al., “You Only Look Once: Unified, Real-Time Object Detection” (2016). The cell size is our choice: 320-pixel cells give a coarse 3 × 2 grid that is easy to draw; YOLOv8 uses 32-pixel cells, 30 × 20 of them on this photo (5.4). Ng draws a 3 × 3 grid and uses 19 × 19 in practice.',
 transition:'Part 1: the ground truth, step by step.',source:PHOTO_SRC});
// ground truth, step 1: a person draws a box around each animal and names it
S_('gt-annotate','dense','Step 1: a person draws a box around each animal',{builds:3,
 body:cols(courtyard(gat(2,gtBox(DOG,'dog',{size:32,w:7}))+gat(3,gtBox(CAT,'cat',{size:32,w:7})),'The courtyard photo; then a hand-drawn box for the dog; then one for the cat'),
  `<div class="table-sm">${table(['object','box: left, top, right, bottom'],[[at(2,'dog'),at(2,`${DOG.join(', ')}`)],[at(3,'cat'),at(3,`${CAT.join(', ')}`)]])}</div>`,'1.3fr 1fr'),
 lines:['The ground truth starts with people, not with the network. A person looks at the photo and marks every object we want found.',
  `First the dog: a tight box around it, (${DOG.join(', ')}) in pixels, and its class.`,
  `Then the cat: (${CAT.join(', ')}). These two boxes and two names are all the person provides.`],
 ask:['Who makes the ground truth?','What exactly does the person record for the dog?','What does the person not have to think about?'],
 expected:['People: annotators drawing boxes, before any training.','A class, dog, and four numbers: the box’s left, top, right and bottom edges.','The grid, the cells and the records: those follow from these boxes by a fixed rule.'],
 point:'These are our own hand-checked boxes for this photo (data/annotations.json). Data sets such as COCO were labelled the same way, by people drawing boxes; Part 3 showed a label file.',
 transition:'Step 2: lay the grid over the boxes.',source:'Our annotation of the courtyard photo (data/annotations.json). '+PHOTO_SRC});
// ground truth, step 2: the grid over the boxes; each box's centre lies in one cell, which will carry that box's record
const dimCells=keep=>[0,1].flatMap(r=>[0,1,2].map(c=>keep.some(([a,b])=>a===r&&b===c)?'':cell(r,c,s3,{fill:'#000',op:.45}))).join('');
const ownCell=([r,c],col)=>`<rect x="${c*s3+7}" y="${r*s3+7}" width="${s3-14}" height="${s3-14}" fill="none" stroke="${col}" stroke-width="12"/>`;
const bigDot=(c,col)=>`<circle cx="${c[0]}" cy="${c[1]}" r="18" fill="${col}" stroke="#fff" stroke-width="6"/>`;
const diag=b=>line(b[0],b[1],b[2],b[3],{stroke:'#fff',w:3,dash:'10 8'})+line(b[2],b[1],b[0],b[3],{stroke:'#fff',w:3,dash:'10 8'});
const tag=([r,c],t,col)=>pill(c*s3+20,r*s3+s3-20,t,{fill:col,size:30});
const partsOfDog=[[0,1],[0,2],[1,2]];
S_('centre-cell','dense','Step 2: the grid over the boxes, and each box’s centre',{builds:3,
 body:cols(grid3(allNames+gonly(1,dimCells([N3.dog_cell]))+gonly(2,dimCells([N3.dog_cell,...partsOfDog]))+gonly(3,dimCells([N3.dog_cell,N3.cat_cell]))+
   gtBox(DOG,'')+diag(DOG)+bigDot(CC.dog.centre,COL.target)+ownCell(N3.dog_cell,COL.amber)+tag(N3.dog_cell,'the dog’s centre',COL.amber)+
   gonly(2,partsOfDog.map(rc=>tag(rc,'no centre',COL.loss)).join(''))+
   gat(3,gtBox(CAT,'')+diag(CAT)+bigDot(CC.cat.centre,COL.target)+ownCell(N3.cat_cell,COL.amber)+tag(N3.cat_cell,'the cat’s centre',COL.amber)),
  'The grid over the annotated boxes: the dog’s centre lies in one cell; three other cells show parts of the dog but no centre; then the cat’s centre and its cell'),
  stack(`<div class="eq-sm">${eq(R`\text{dog’s centre }(588,\,336)\ \to\ \text{cell }(1,1)`)}</div>`,
   at(2,`<div class="eq-sm">${eq(R`\text{cells }(0,1),(0,2),(1,2):\ \text{no centre}`)}</div>`),
   at(3,`<div class="eq-sm">${eq(R`\text{cat’s centre }(217,\,452)\ \to\ \text{cell }(1,0)`)}</div>`)),'1.35fr 1fr'),
 lines:['Step 2: lay the grid over the boxes. The dog’s centre, where its box’s diagonals cross, lies in cell (1, 1). That cell will carry the dog’s record.',
  'Cells (0, 1), (0, 2) and (1, 2) show parts of the dog but not its centre. They will say “no object”, so the dog is written down only once.',
  'The cat’s centre lies in cell (1, 0), which will carry the cat’s record. The other four cells hold no centre.'],
 ask:['How do we find the dog’s cell?','Why do the other cells showing the dog get “no object”?','How many cells hold a centre?'],
 expected:['Take the box’s centre, then row ⌊336/320⌋ = 1 and column ⌊588/320⌋ = 1: cell (1, 1).','So that each object is written down exactly once, in one place fixed by where it is.','Two: (1, 1) for the dog and (1, 0) for the cat.'],
 point:'Ng: “assign the object to the grid cell containing its midpoint”; a cell holding parts of both cars but neither midpoint gets p_c = 0. The centre is where the box’s diagonals cross. This is YOLOv1’s rule (Redmon et al., 2016).',
 transition:'Step 3: write each box in its cell’s units.',source:'Our annotation of the courtyard photo (data/annotations.json). '+PHOTO_SRC});
// Ng's worked example: the box measured inside its cell, (0, 0) at the cell's top-left corner and (1, 1) at its bottom-right
const bLab=(k,v,size)=>`b<tspan dy="${Math.round(size*.25)}" font-size="${Math.round(size*.68)}">${k}</tspan><tspan dy="${-Math.round(size*.25)}"> ≈ ${v}</tspan>`;
const cellZoom=(cl,bx,c,view,o)=>{const [r0,c0]=cl,x0=c0*s3,y0=r0*s3,f=fsz(view,21,o.shown),[cx,cy]=c,
  hal={halo:true,weight:700};
 return courtyard(gridLines(W,H,s3,{stroke:'#fff',w:4,op:.9})+`<rect x="${x0}" y="${y0}" width="${s3}" height="${s3}" fill="#fff" fill-opacity=".14" stroke="#fff" stroke-width="7"/>`+gtBox(bx,'',{w:5})+
  label(x0+6,y0-12,'(0, 0)',{size:f,fill:COL.ink,...hal})+label(x0+s3-8,y0+s3-12,'(1, 1)',{size:f,fill:COL.ink,anchor:'end',...hal})+
  gat(o.at[0],line(x0,cy,cx,cy,{stroke:COL.ink,w:4,dash:'10 7'})+line(cx,y0,cx,cy,{stroke:COL.ink,w:4,dash:'10 7'})+label(o.bxAt[0],o.bxAt[1],bLab('x',o.b[0],f),{size:f,fill:COL.ink,...hal,anchor:'middle'})+label(o.byAt[0],o.byAt[1],bLab('y',o.b[1],f),{size:f,fill:COL.ink,...hal,anchor:o.byAnchor||'start'}))+
  dot(c,COL.target)+
  gat(o.at[1],arrow(bx[0],o.wY,bx[2],o.wY,{stroke:COL.target,w:5,head:16,both:true})+label((bx[0]+bx[2])/2,o.wY-12,bLab('w',o.b[2],f),{size:f,fill:COL.target,...hal,anchor:'middle'})+
   arrow(o.hX,bx[1],o.hX,bx[3],{stroke:COL.target,w:5,head:16,both:true})+label(o.hX+(o.hAnchor==='end'?-12:12),o.hLabY,bLab('h',o.b[3],f),{size:f,fill:COL.target,...hal,anchor:o.hAnchor||'start'})),
  o.alt,{view});};
const n2=v=>num(v,2),cb=N3.cat.map(n2),db=N3.dog.map(n2),catC=CC.cat.centre,dogC=CC.dog.centre,[cw,ch]=[S.cat.cxcywh[2],S.cat.cxcywh[3]];
const catView=[0,280,360,360];
S_('cell-box','dense','Step 3: the cat’s box, in its cell’s units',{builds:4,
 body:cols(cellZoom(N3.cat_cell,CAT,catC,catView,{shown:420,at:[2,3],b:cb,bxAt:[catC[0]/2,catC[1]+30],byAt:[catC[0]-12,(s3+catC[1])/2+8],byAnchor:'end',wY:575,hX:300,hAnchor:'end',hLabY:520,
   alt:'The cat’s cell enlarged: its corners (0, 0) and (1, 1), the cat’s centre, then the box’s width and height'}),
  stack(`<div class="eq-sm">${eq(R`\text{cell }(1,0):\ x\ \text{from }0\text{ to }320,\ y\ \text{from }320\text{ to }640`)}</div>`,
   at(2,`<div class="eq-sm">${eq(R`b_x=\frac{${Math.round(catC[0])}-0}{320}\approx${cb[0]},\quad b_y=\frac{${Math.round(catC[1])}-320}{320}\approx${cb[1]}`)}</div>`),
   at(3,`<div class="eq-sm">${eq(R`b_w=\frac{${cw}}{320}\approx${cb[2]},\quad b_h=\frac{${ch}}{320}\approx${cb[3]}`)}</div>`),
   at(4,rec7([1,...cb,1,0],'t'))),'0.82fr 1.18fr'),
 lines:['Measure the box inside its cell. The cat’s cell gets its own coordinates: (0, 0) at its top-left corner and (1, 1) at its bottom-right.',
  'The cat’s centre is 217 pixels from the cell’s left edge and 132 below its top: b_x ≈ 0.68 and b_y ≈ 0.41 of a cell.',
  'The size is counted in cells too. The cat is 209 pixels wide, 0.65 of a cell, and 311 pixels tall, 0.97 of a cell.',
  'So the ground truth for cell (1, 0) is object? 1, the box (0.68, 0.41, 0.65, 0.97), cat 1 and dog 0.'],
 ask:['Where is (0, 0) for this cell, in pixels?','Where is the cat’s centre inside its cell?','How big is the cat, in cells?','What is the whole record of the cat’s cell?'],
 expected:['At the cell’s top-left corner, pixel (0, 320).',`About ${cb[0]} across and ${cb[1]} down.`,`${cb[2]} of a cell wide, ${cb[3]} tall.`,`(1, ${cb.join(', ')}, 1, 0).`],
 point:'Ng’s example: the cell’s top-left is (0, 0) and its bottom-right (1, 1); his car’s centre is at about (0.4, 0.3), its width about 0.9 of a cell and its height about 0.5. (In the video he says b_h for the 0.9; the forum notes the slip.)',
 transition:'The dog’s box is bigger than its cell.',source:PHOTO_SRC});
const dogView2=[300,56,520,584];
S_('dog-box','dense','Step 3: the dog’s box, bigger than its cell',{builds:3,
 body:cols(cellZoom(N3.dog_cell,DOG,dogC,dogView2,{shown:440,at:[1,2],b:db,bxAt:[(s3+dogC[0])/2,dogC[1]+34],byAt:[dogC[0]+14,dogC[1]-2],wY:560,hX:790,hAnchor:'end',hLabY:240,
   alt:'The dog’s cell enlarged: the dog’s centre near the cell’s top edge, and its box much bigger than the cell'}),
  stack(`<div class="eq-sm">${eq(R`b_x=\frac{${Math.round(dogC[0])}-320}{320}\approx${db[0]},\quad b_y=\frac{${Math.round(dogC[1])}-320}{320}\approx${db[1]}`)}</div>`,
   at(2,`<div class="eq-sm">${eq(R`b_w=\frac{${S.dog.w}}{320}\approx${db[2]},\quad b_h=\frac{${S.dog.h}}{320}\approx${db[3]}`)}</div>`),
   at(3,rec7([1,...db,0,1],'t'))),'0.82fr 1.18fr'),
 lines:['The dog’s centre is 268 pixels from its cell’s left edge and only 16 below its top: b_x ≈ 0.84 and b_y ≈ 0.05.',
  'The dog is wider and taller than its cell: b_w ≈ 1.13 and b_h ≈ 1.58 cells. A box may spill out of its cell, but its centre may not.',
  'So the ground truth for cell (1, 1) is object? 1, the box (0.84, 0.05, 1.13, 1.58), cat 0 and dog 1.'],
 ask:['Why is b_y so small?','Can b_w be bigger than 1? Can b_x?','What is the whole record of the dog’s cell?'],
 expected:['The dog’s centre is just below the cell’s top edge.','b_w, yes: the dog is wider than a cell. b_x, no: the centre always lies inside its own cell.',`(1, ${db.join(', ')}, 0, 1).`],
 point:'Ng: b_x and b_y lie between 0 and 1, while b_h and b_w can be greater than 1 when the object spans several cells. The YOLO paper keeps them in range with a sigmoid for the centre and an exponential for the size.',
 transition:'Step 4: the whole table.',source:PHOTO_SRC});
const tgtRow=(name,vals,cls,b)=>`<span class="sl">${name}</span>`+vals.map(v=>`<div class="${cls}"><span data-at="${b}">${v}</span></div>`).join('');
const isCell=(rc,cl)=>rc[0]===cl[0]&&rc[1]===cl[1];
S_('target-photo','dense','Step 4: the whole ground-truth table',{builds:3,
 body:cols(grid3(allNames+cell(...N3.dog_cell,s3,{fill:COL.target,op:.3})+cell(...N3.cat_cell,s3,{fill:COL.target,op:.3})+gtBox(DOG,'',{w:4})+gtBox(CAT,'',{w:4})+dot(dogC,COL.target)+dot(catC,COL.target),'The six cells; the two that hold a centre are shaded'),
  `<div class="slotgrid tgt"><span></span>${['object?',m('b_x'),m('b_y'),m('b_w'),m('b_h'),'cat','dog'].map(k=>`<b>${k}</b>`).join('')}`+
   [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2]].map(rc=>isCell(rc,N3.dog_cell)?tgtRow(`cell (${rc.join(', ')})`,[1,...db,0,1],'t',1):isCell(rc,N3.cat_cell)?tgtRow(`cell (${rc.join(', ')})`,[1,...cb,1,0],'t',1):tgtRow(`cell (${rc.join(', ')})`,[0,'?','?','?','?','?','?'],'q',2)).join('')+'</div>'+
   at(3,`<div class="eq-sm">${eq(R`6\times7=42\ \text{numbers: the target}`)}</div>`),'0.8fr 1.2fr'),
 lines:['The ground-truth table, one record per cell. Cells (1, 0) and (1, 1) hold the cat’s and the dog’s records, written in step 3.',
  'The other four cells hold no centre, not even (0, 1) with the dog’s head: object? 0, and “?” everywhere else.',
  'Six records of seven numbers: this table is what the network should learn to output for this photo.'],
 ask:['Which two rows are filled in first?','What do the other four cells hold?','How many numbers is the target?'],
 expected:['Cells (1, 0) and (1, 1): the cat’s and the dog’s.','Object? = 0; the box and the classes are “?”, left out of the loss.','6 × 7 = 42.'],
 point:'Ng writes this target as a 3 × 3 × 8 block for his 3 × 3 grid and three classes; ours is 2 × 3 × 7.',
 transition:'Try it: move a box and watch the table.',source:'Our annotation of the courtyard photo (data/annotations.json). '+PHOTO_SRC});
S_('target-play','dense','Try it: move a box, and watch its ground truth change',{builds:1,
 body:widget('target-play','Drag a box over the photo; the cell that holds its centre lights up and its record is written out'),
 lines:['Drag the box or its corner dot. The cell holding the centre lights up with its ground-truth record. Try the finer grids: the same box, counted in smaller cells.'],
 ask:['What happens to the record when the centre crosses a grid line?'],
 expected:['Another cell takes over, and b_x or b_y jumps from near 1 to near 0.'],
 point:'b_x and b_y always stay between 0 and 1. b_w and b_h grow as the cells shrink: the dog is 1.13 cells wide on the 3 × 2 grid and 11.3 on the 30 × 20 grid of 5.3.',
 transition:'The same steps in code.',source:PHOTO_SRC});
// building the target in code, one line per click: the loop's first object is the dog, then the cat
const tcRows=[[1,'def build_target(boxes, classes, s=320):'],
 [1,'    y = torch.zeros(2, 3, 7)  # object? 0 everywhere'],
 [2,'    for (x1, y1, x2, y2), k in zip(boxes, classes):'],
 [3,'        cx, cy = (x1 + x2) / 2, (y1 + y2) / 2'],
 [4,'        r, c = int(cy // s), int(cx // s)'],
 [5,'        y[r, c, 0] = 1               # object?'],
 [6,'        y[r, c, 1] = cx / s - c      # b_x'],
 [6,'        y[r, c, 2] = cy / s - r      # b_y'],
 [7,'        y[r, c, 3] = (x2 - x1) / s   # b_w'],
 [7,'        y[r, c, 4] = (y2 - y1) / s   # b_h'],
 [8,'        y[r, c, 5 + k] = 1           # cat or dog'],
 [8,'    return y']];
const [tdr,tdc]=N3.dog_cell,[tcr,tcc]=N3.cat_cell;
const tcFig=grid3(allNames+[0,1].flatMap(r=>[0,1,2].map(c=>cell(r,c,s3,{fill:MUTED,op:.22}))).join('')+
 gat(4,cell(tdr,tdc,s3,{fill:COL.target,op:.38}))+gat(8,cell(tcr,tcc,s3,{fill:COL.target,op:.38}))+
 gat(2,gtBox(DOG,'')+pill(DOG[0],DOG[1],'dog',{fill:COL.target,size:30,below:true}))+gat(3,dot(dogC,COL.target))+
 gat(6,line(tdc*s3,dogC[1],dogC[0],dogC[1],{stroke:COL.ink,w:5,dash:'12 8'})+line(dogC[0],tdr*s3,dogC[0],dogC[1],{stroke:COL.ink,w:5,dash:'12 8'}))+
 gat(7,arrow(DOG[0],560,DOG[2],560,{stroke:COL.target,w:6,head:18,both:true})+arrow(DOG[2]+28,DOG[1],DOG[2]+28,DOG[3],{stroke:COL.target,w:6,head:18,both:true}))+
 gat(8,gtBox(CAT,'')+pill(CAT[0],CAT[1],'cat',{fill:COL.target,size:30})+dot(catC,COL.target)),
 'The six cells start empty; then the dog’s box, its centre, its cell, the box measured in the cell; then the cat',{cls:'short'});
const sv=(...st)=>st.map(([b,v])=>`<span data-only="${b}">${v}</span>`).join('');
const tcRec=rec7([sv(['1-4','0'],['5-8','1']),sv(['1-5','0'],['6-8',db[0]]),sv(['1-5','0'],['6-8',db[1]]),sv(['1-6','0'],['7-8',db[2]]),sv(['1-6','0'],['7-8',db[3]]),'0',sv(['1-7','0'],['8','1'])],'t');
S_('target-code','dense','The ground-truth table in code, one line at a time',{builds:8,
 body:cols(`<div class="code-xs">${codeSteps(tcRows)}</div>`,stack(tcFig,`<p class="caption">y[1, 1], the dog’s cell:</p>${tcRec}`),'1.2fr 1fr'),
 lines:['The ground truth in code. Every cell starts as “no object”: a 2 × 3 × 7 block of zeros. The “?” entries stay 0; the loss skips them.',
  'Loop over the annotated objects, each a box and a class. First the dog: box (407, 83, 768, 588), class 1.',
  'Its centre is the middle of the box: (588, 336).',
  'Divide by the cell size, 320, and round down: row 1, column 1. Only this cell will describe the dog.',
  'Set object? to 1 in that cell.',
  `The centre inside the cell: b_x = 588 / 320 − 1 ≈ ${db[0]} and b_y = 336 / 320 − 1 ≈ ${db[1]}.`,
  `The size in cells: b_w = 361 / 320 ≈ ${db[2]} and b_h = 505 / 320 ≈ ${db[3]}.`,
  'Mark the class, dog. The loop does the same for the cat in cell (1, 0), and the other four cells stay all zeros.'],
 ask:['Why start from zeros?','How many times does the loop run here?','Where is the dog’s centre?','Which cell holds it?','Which entry is set first?','Why subtract c and r?','Why can b_w exceed 1?','What does the whole target look like?'],
 expected:['Most cells hold no centre, so object? = 0 is their right target, and their other entries are skipped anyway.','Twice: once for the dog, once for the cat.','(588, 336), the middle of its box.',
  'Row ⌊336/320⌋ = 1, column ⌊588/320⌋ = 1.','object? = 1, in cell (1, 1) only.','cx / s counts cells from the photo’s left edge; subtracting c leaves the position inside the cell, between 0 and 1.',
  'It counts cells, and the dog is wider than one cell.','Two cells with full records and four with object? 0: the six records of the last slide.'],
 point:'The tensor has no “?”: the entries we do not care about are zeros, and the loss reads only object? where object? is 0. Real YOLO code does the same with a mask. Run on our two boxes, this function gives exactly the numbers of the last slides.',
 transition:'Part 2: what the network predicts.',source:'Our annotation of the courtyard photo (data/annotations.json). '+PHOTO_SRC});
chap('5.3');
// prediction: a small CNN (the toy trained on this photo) turns the photo into a 2 x 3 x 7 table, one record per cell
/** A block of numbers drawn as a box: a front face w x h at (x, y), and depth d going back and up. */
const vol=(x,y,w,h,d,{stroke=COL.ink,fill='#fff'}={})=>`<g><path d="M${x},${y} l${d},${-.6*d} h${w} l${-d},${.6*d}Z" fill="#E9ECEF" stroke="${stroke}" stroke-width="2"/>`+
 `<path d="M${x+w},${y} l${d},${-.6*d} v${h} l${-d},${.6*d}Z" fill="#DCE0E5" stroke="${stroke}" stroke-width="2"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="2"/></g>`;
const PAIR=[COL.data,COL.green,COL.amber,COL.guess,COL.target,COL.loss],TY=S.toy;   // one colour per cell, row by row
const structFig=(()=>{const TW=240,sc=TW/W,TH=H*sc,cs=s3*sc,ty=70,cy=ty+TH/2,u=52,bx=900,by=cy-u,d=44,ly=ty+TH+34,g=[];
 const tint=(x0,y0,size,op,stroke)=>[0,1].flatMap(r=>[0,1,2].map(c=>`<rect x="${x0+c*size}" y="${y0+r*size}" width="${size}" height="${size}" fill="${PAIR[r*3+c]}" fill-opacity="${op}" stroke="${stroke}" stroke-width="2"/>`)).join('');
 const lab=(x,t)=>label(x,ly,t,{size:18,anchor:'middle',fill:COL.ink,weight:600});
 g.push(`<g transform="translate(0,${ty}) scale(${sc})"><image href="figures/cat-dog.jpg" width="${W}" height="${H}" preserveAspectRatio="none"/>${gridLines(W,H,s3,{stroke:'#fff',w:10,op:.95})}</g>`+lab(TW/2,`${TY.input[1]} × ${TY.input[0]} × 3`));
 g.push(arrow(TW+12,cy,TW+46,cy,{w:3,head:12})+vol(TW+56,cy-32,96,64,10)+lab(TW+108,'80 × 120 × 16')+arrow(TW+176,cy,TW+206,cy,{w:3,head:12})+vol(TW+216,cy-24,72,48,18)+lab(TW+260,'40 × 60 × 32')+
  arrow(TW+316,cy,TW+346,cy,{w:3,head:12})+vol(TW+356,cy-16,48,32,30)+lab(TW+390,'20 × 30 × 64')+label(TW+226,ty-22,'three 3 × 3 convolutions, stride 2',{size:18,anchor:'middle',fill:MUTED})+
  arrow(TW+446,cy,bx-14,cy,{w:3,head:12})+label((TW+446+bx-14)/2,cy-34,'average each cell,',{size:18,anchor:'middle',fill:MUTED})+label((TW+446+bx-14)/2,cy-12,'then a 1 × 1 conv',{size:18,anchor:'middle',fill:MUTED}));
 g.push(`<path d="M${bx},${by} l${d},${-.6*d} h${3*u} l${-d},${.6*d}Z" fill="#E9ECEF" stroke="${COL.ink}" stroke-width="2"/><path d="M${bx+3*u},${by} l${d},${-.6*d} v${2*u} l${-d},${.6*d}Z" fill="#DCE0E5" stroke="${COL.ink}" stroke-width="2"/>`+
  [0,1].flatMap(r=>[0,1,2].map(c=>`<rect x="${bx+c*u}" y="${by+r*u}" width="${u}" height="${u}" fill="#fff" stroke="${COL.ink}" stroke-width="2"/>`)).join('')+lab(bx+3*u/2,'2 × 3 × 7')+label(bx+3*u+d+8,by+u-.3*d+7,'7',{size:20,fill:COL.ink,weight:700}));
 g.push(gat(2,tint(0,ty,cs,.42,'#fff')+tint(bx,by,u,.6,COL.ink)));
 const [r1,c1]=N3.dog_cell;
 g.push(gat(3,`<rect x="${c1*cs}" y="${ty+r1*cs}" width="${cs}" height="${cs}" fill="none" stroke="${COL.ink}" stroke-width="5"/><rect x="${bx+c1*u}" y="${by+r1*u}" width="${u}" height="${u}" fill="none" stroke="${COL.ink}" stroke-width="5"/>`));
 return `<div class="diagram-scroll"><svg class="plot wsvg" viewBox="0 0 ${bx+3*u+d+40} ${Math.ceil(ly+12)}" style="overflow:hidden" role="img" aria-label="A small CNN turns the photo into a 2 by 3 table of 7-number records, each output position paired with one cell">${g.join('')}</svg></div>`;})();
S_('grid-structure','dense','Prediction: a CNN outputs a table of the same shape',{builds:4,
 body:stack(structFig,at(4,`<div class="eq-sm">${eq(R`\text{object?},\,b_x,\,b_y,\,\text{cat},\,\text{dog}=\sigma(t)\in(0,1),\qquad b_w,\,b_h=e^{\,t}>0`)}</div>`)),
 lines:['Part 2, the prediction. A small CNN shrinks the photo three times, averages each cell’s region, and writes 7 numbers there: a 2 × 3 × 7 table.',
  'Convolutions keep the photo’s layout, so output position (r, c) belongs to cell (r, c): top-left to top-left. The colours show the six pairs.',
  'So the network’s record for cell (1, 1) is compared with the ground truth for cell (1, 1), and so on for all six cells.',
  'Its last step puts each number in range: a sigmoid keeps object?, b_x, b_y and the class scores between 0 and 1; an exponential keeps b_w and b_h positive.'],
 ask:['What shape is the network’s output?','Which output position goes with the bottom-left cell?','Why can we compare the two tables position by position?','Why squash the raw numbers?'],
 expected:['2 × 3 × 7, the shape of the ground-truth table.','(1, 0), the bottom-left one: the layout is kept.','Both have one record per cell, in the same layout.','So each one means what the record says: a score between 0 and 1, a centre inside its cell, a size above 0. Ng mentions the same sigmoid and exponential.'],
 point:`This small network has ${big(TY.params)} weights; we train it on this one photo in a few seconds (scripts/run_models.py toy). Ng draws 100 × 100 × 3 → ConvNet → 3 × 3 × 8. Real YOLOs shrink the photo 32 times and keep 30 × 20 positions (5.4).`,
 transition:'Line the two tables up.',source:'A small CNN trained on this photo by scripts/run_models.py. '+PHOTO_SRC});
// line the tables up: the untrained network's records against the ground truth, Part 4's loss per cell, then all six
const TS0=TY.snaps['0'],TG=TY.target,n2t=v=>num(v,2),ex=v=>Number.isInteger(v)?String(v):num(v,2),sq=v=>num(v,v<.01?3:2),KEYS=['object?',m('b_x'),m('b_y'),m('b_w'),m('b_h'),'cat','dog'];
const sqd=(p,t)=>p.map((v,i)=>(v-t[i])**2);
const recTable=rows=>`<div class="table-sm xtight rec-table">${table(['',...KEYS],rows)}</div>`;
const [dr_,dc_]=N3.dog_cell,dogT=TG[dr_][dc_],dogP=TS0.table[dr_][dc_],emT=TG[0][0],emP=TS0.table[0][0];
const cellLossLabels=[0,1].flatMap(r=>[0,1,2].map(c=>label(c*s3+s3/2,r*s3+s3/2+18,sq(TS0.cell_loss[r][c]),{size:54,anchor:'middle',fill:COL.loss,weight:700,halo:true}))).join('');
const [labP5,labT5,labL5]=lossLabs('truth');
S_('align-loss','dense','Line the two tables up: the loss, cell by cell',{builds:4,
 body:cols(grid3(allNames+gonly('1-2',ownCell(N3.dog_cell,COL.amber))+gonly(3,ownCell([0,0],COL.amber))+gat(4,cellLossLabels),'The six cells: the dog’s cell, then an empty cell, then every cell’s loss written inside it',{cls:'short'}),
  `<div class="state-slot">${only('1-2',stack(`<p class="caption">cell (1, 1)</p>`+recTable([[labP5,...dogP.map(v=>kp(n2t(v)))],[labT5,...dogT.map(v=>kt(ex(v)))],[at(2,labL5),...sqd(dogP,dogT).map(v=>at(2,kl(sq(v))))]]),
    at(2,`<div class="eq-sm">${eq(R`\textstyle\sum_{i=1}^{7}(\qcol{\hat y_i}-\pcol{y_i})^2=\lcol{${num(TS0.cell_loss[dr_][dc_],2)}}`)}</div>`)))}`+
   `${only(3,stack(`<p class="caption">cell (0, 0)</p>`+recTable([[labP5,...emP.map(v=>kp(n2t(v)))],[labT5,...emT.map((v,i)=>i?'?':kt(ex(v)))],[labL5,kl(sq((emP[0]-emT[0])**2)),...Array(6).fill('·')]]),
    `<div class="eq-sm">${eq(R`(\qcol{\hat o}-\pcol{0})^2\approx\lcol{${sq(TS0.cell_loss[0][0])}}`)}</div>`))}`+
   `${only(4,`<div class="eq-sm">${eq(R`\lcol{\mathcal{L}}=\text{sum of the six}\approx\lcol{${num(TY.loss0,2)}}`)}</div>`)}</div>`,'0.9fr 1.1fr'),
 lines:[`Before training the network knows nothing: scores and positions near 0.5, sizes near 1. Line up ${kp('its record')} for cell (1, 1) with ${kt('the ground truth')}.`,
  `Part 4’s loss for this cell: square the seven differences and add them up, ${kl(num(TS0.cell_loss[dr_][dc_],2))}. The network is far from the dog’s record.`,
  `An empty cell, (0, 0): only object? counts, (ô − 0)² ≈ ${kl(sq(TS0.cell_loss[0][0]))}. The “?” entries are skipped.`,
  `Every cell’s loss, written in its cell. Their sum, ${kl(num(TY.loss0,2))}, is the one number that training pushes down.`],
 ask:['Which record do we compare with the ground truth for cell (1, 1)?','Which difference is largest, and why?','Why only one entry in cell (0, 0)?','Which cells contribute most to the loss?'],
 expected:['The network’s record at output position (1, 1).',(()=>{const d=sqd(dogP,dogT),k=d.indexOf(Math.max(...d)),nm=['object?','b_x','b_y','b_w','b_h','cat','dog'][k];return `${nm}: the truth is ${ex(dogT[k])}, the untrained network says ${n2t(dogP[k])}.`;})(),'The truth there is “no object”: the box and classes are “?”, so they are skipped.','The two cells with a centre, (1, 0) and (1, 1): the network has not learnt their records yet.'],
 point:'The untrained network is our small CNN with its random starting weights (seed 0). Its sigmoid outputs start near 0.5 and its exponential ones near 1; Ng’s squared-error loss treats every number alike.',
 transition:'Training pushes the loss down.',source:'A small CNN trained on this photo by scripts/run_models.py. '+PHOTO_SRC});
// training: the loss over 300 steps, and cell (1, 1)'s record at steps 0, 50 and 300
const lossFig=(()=>{const top=Math.ceil(TY.loss0),P=panel({W:520,H:330,L:62,B:54,T:30,R:24,xMin:0,xMax:TY.steps,yMin:0,yMax:top,ticksX:[0,100,200,300],ticksY:[0,top/2,top],xLabel:'training step',yLabel:'loss',fs:19});
 const at5=st=>TY.loss[st/5],mark=(st,b,[dx,dy,anchor])=>gat(b,`<circle cx="${P.x(st).toFixed(1)}" cy="${P.y(at5(st)).toFixed(1)}" r="9" fill="${COL.loss}" stroke="#fff" stroke-width="3"/>`+label(P.x(st)+dx,P.y(at5(st))+dy,`step ${st}`,{size:18,fill:COL.ink,anchor}));
 return fig(520,330,P.axes+`<polyline points="${TY.loss.map((v,i)=>`${P.x(i*5).toFixed(1)},${P.y(v).toFixed(1)}`).join(' ')}" fill="none" stroke="${COL.loss}" stroke-width="3"/>`+mark(0,1,[22,16,'start'])+mark(50,2,[10,-30,'start'])+mark(TY.steps,3,[-14,-12,'end']),'The loss falling over 300 training steps');})();
const snapRow=(st,b)=>[at(b,kp(`${m('\\hat y')}, step ${st}`)),...TY.snaps[String(st)].table[dr_][dc_].map(v=>at(b,kp(n2t(v))))];
S_('train-toy','dense','Training: the predicted table moves toward the ground truth',{builds:3,
 body:cols(lossFig,stack(`<p class="caption">cell (1, 1)</p>`+recTable([[labT5,...dogT.map(v=>kt(ex(v)))],snapRow(0,1),snapRow(50,2),snapRow(TY.steps,3)])),'0.95fr 1.05fr'),
 lines:[`Gradient descent on that loss, using this one photo: ${TY.steps} small steps. The loss starts at ${kl(num(TY.loss0,2))}.`,
  `By step 50 the record for cell (1, 1) has moved toward the dog’s: object? ${n2t(TY.snaps['50'].table[dr_][dc_][0])}, b_h ${n2t(TY.snaps['50'].table[dr_][dc_][4])}, dog ${n2t(TY.snaps['50'].table[dr_][dc_][6])}.`,
  `By step ${TY.steps} the loss is ${kl(num(TY.loss_end,3))} and ${kp('the record')} reads almost exactly ${kt('the dog’s ground truth')}.`],
 ask:['What does each step change?','Which numbers move first?','Has this network learnt to find dogs?'],
 expected:['All the network’s weights, a little, in the direction that lowers the loss.','The box numbers and the class scores come close by step 50; object? takes longest.','No: it has memorised one photo. A real detector trains on many thousands of photos so that new ones come out right.'],
 point:'Adam, learning rate 0.01, on this one photo: the network memorises it, which is enough to show the mechanics. YOLOv8 was trained on COCO’s 118,000 photos.',
 transition:'The same loss for all cells at once, in code.',source:'A small CNN trained on this photo by scripts/run_models.py.'});
const emptyCells=[[0,0],[0,1],[0,2],[1,2]];
const lossRows=[[2,'m = y[..., 0] == 1'],[2,'loss = ((p[..., 0] - y[..., 0])**2).sum()'],[2,'loss += ((p[m, 1:] - y[m, 1:])**2).sum()']];
S_('loss-grid','dense','The loss for all cells at once, in symbols and in code',{builds:2,
 body:cols(grid3(allNames+cell(...N3.dog_cell,s3,{fill:COL.target,op:.3})+cell(...N3.cat_cell,s3,{fill:COL.target,op:.3})+emptyCells.map(([r,c])=>cell(r,c,s3,{fill:MUTED,op:.3})).join(''),'The two cells with a centre in teal, the four empty cells in grey',{cls:'short'}),
  stack(`<div class="eq-sm">${eq(R`\lcol{\mathcal{L}}=\sum_{\text{cells}}\Big[(\qcol{\hat o}-\pcol{o})^2+\pcol{o}\sum_{i=2}^{7}(\qcol{\hat y_i}-\pcol{y_i})^2\Big]`)}</div>`,at(2,`<div class="code-xs">${codeSteps(lossRows)}</div>`),
   at(2,small(`${kp('p')}: the network’s 2 × 3 × 7 table; ${kt('y')}: the ground truth; m: its cells with a centre`))),'0.95fr 1.05fr'),
 lines:[`Written once for all cells: object? is compared in every cell; the other six numbers only where the ground truth’s object?, ${kt('o')}, is 1.`,
  'In code: a mask m marks the cells with a centre. These three lines are the loss the small network was trained with.'],
 ask:['What does the factor o do?','What are p and y in the code?'],
 expected:['It switches the box and class terms off in cells with no object: o = 0 there.','p is the network’s 2 × 3 × 7 table, y the ground-truth table.'],
 point:'YOLOv1 weighted the box terms by 5 and the empty cells’ object? terms by 0.5, because empty cells far outnumber the others. Appendix B works the loss through with the real network’s numbers.',
 transition:'One record per cell: is that always enough?',source:PHOTO_SRC});
// one record per cell: the crowd photo on a grid of the viewer's choosing (widgets.js, crowdGrid)
const CRC=S.crowd_cells,[,,,lost3]=CRC.by_grid[0];
S_('two-in-a-cell','dense','Two centres in one cell? Try smaller cells',{builds:1,
 body:widget('crowd-grid','The crowd photo with every person’s box and centre; choose the grid, and cells holding two or more centres turn red'),
 lines:[`A cell writes one record. On a 3 × 2 grid the ${CRC.centres.length} people’s centres fall in just ${CRC.centres.length-lost3} cells, so ${lost3} people get no record. Try smaller cells.`],
 ask:['How many people get no record on the 3 × 2 grid? And on 40 × 22?'],
 expected:[`${lost3} of ${CRC.centres.length} on 3 × 2. None on 40 × 22: with 32-pixel cells every centre has a cell of its own.`],
 point:'The cell size is our choice, and smaller cells make two centres in one cell rare. YOLOv1 cut its 448-pixel input into 7 × 7 cells of 64 pixels; YOLOv8 uses cells of 32, 16 and 8 pixels (Part 7). Objects whose centres nearly coincide can still share a cell; the next design handles that.',
 transition:'Or keep the big cells, and give each cell two boxes.',source:'Our annotation of the crowd photo (data/annotations.json). '+PHOTO_SRC});
// another design: two boxes in every cell, each with a template shape. A person stands in front of a car, so both
// centres fall in one cell (figures/person-car.jpg, made for these slides; the boxes are in data/person-car.json)
const PC=S.pc,[PW,PH]=PC.size,pcs=PC.cell,pcB=PC.boxes,pcC=PC.centres,pcWH=k=>[pcB[k][2]-pcB[k][0],pcB[k][3]-pcB[k][1]];
const PC_SRC='A photo generated for these slides (SOURCES.md); our boxes, checked by eye (data/person-car.json).';
const pcPhoto=(inner,alt)=>photo('person-car',PW,PH,gridLines(PW,PH,pcs,{stroke:'#fff',w:6,op:.95})+inner,alt);
const pcObjs=['person','car'].map(k=>gtBox(pcB[k],'',{w:7})+dot(pcC[k],COL.target)).join('');
const pcCell=`<rect x="${pcs+8}" y="${pcs+8}" width="${pcs-16}" height="${pcs-16}" fill="none" stroke="${COL.amber}" stroke-width="14"/>`+pill(pcs+22,2*pcs-22,'cell (1, 1)',{fill:COL.amber,size:38});
const pcTags=pill(pcB.person[0],pcB.person[1],'person',{fill:COL.target,size:38})+pill(pcB.car[0],pcB.car[1],'car',{fill:COL.target,size:38});
const centred=(c,[w,h])=>[c[0]-w/2,c[1]-h/2,c[0]+w/2,c[1]+h/2],TALL=PC.anchors.tall,WIDE=PC.anchors.wide,tallC=COL.guess,wideC=COL.data;
const fmt1=v=>String(+(+v).toFixed(1));
/** One cell with the two template shapes centred on it, to scale. */
const tmplFig=(()=>{const u=150,x0=100,y0=34,c=[x0+u/2,y0+u/2],tb=centred(c,TALL.map(v=>v/pcs*u)),wb=centred(c,WIDE.map(v=>v/pcs*u));
 return fig(470,236,`<rect x="${x0}" y="${y0}" width="${u}" height="${u}" fill="#FFF6DB" stroke="${COL.amber}" stroke-width="5"/>`+rect(tb,{stroke:tallC,w:5,dash:'12 7'})+rect(wb,{stroke:wideC,w:5,dash:'12 7'})+
  label(c[0],y0-10,'box 1: tall',{size:20,anchor:'middle',fill:tallC,weight:700})+label(wb[2]+10,c[1]+7,'box 2: wide',{size:20,fill:wideC,weight:700})+label(c[0],y0+u+30,'one cell',{size:19,anchor:'middle',fill:'#8A6D1A',weight:650}),
  'One cell with two template shapes centred on it: a tall one, 0.4 by 1 cell, and a wide one, 2 by 0.8 cells');})();
S_('two-boxes','dense','Another design: two boxes in every cell',{builds:3,
 body:cols(pcPhoto(pcObjs+pcTags+pcCell,'A person standing in front of a car, on a 3 by 2 grid of 416-pixel cells; both centres lie in cell (1, 1)'),
  `<div class="state-slot">${only(1,stack(`<div class="table-sm xtight">${table(['','box','centre','cell'],['person','car'].map(k=>[k,pcB[k].join(', '),`(${pcC[k].map(fmt1).join(', ')})`,`(${PC.cells[k].join(', ')})`]))}</div>`,
    `<div class="eq-sm">${eq(R`\text{centre}=\text{the middle of the box}`)}${eq(R`\text{cell}=\big(\lfloor y\div${pcs}\rfloor,\ \lfloor x\div${pcs}\rfloor\big)`)}</div>`))}`+
  `${only('2-3',stack(tmplFig,`<div class="eq-sm">${eq(R`\text{box 1: }${TALL.join(R`\times`)}\text{ px}=0.4\times1\text{ cell}`)}${eq(R`\text{box 2: }${WIDE.join(R`\times`)}\text{ px}=2\times0.8\text{ cells}`)}</div>`,
    at(3,`<div class="eq-sm">${eq(R`2\text{ boxes}\times7\text{ numbers}=14\text{ numbers per cell}`)}</div>`)))}</div>`,'1.15fr 1fr'),
 lines:['A person stands in front of a car. On 416-pixel cells, 3 × 2 of them, both centres fall in cell (1, 1), whose one record can hold only one.',
  'Another design gives every cell two boxes, each with a template shape chosen before training: box 1 is tall, box 2 is wide.',
  'Each box has its own 7-number record: object?, b_x, b_y, b_w, b_h, person, car. So a cell now writes 2 × 7 = 14 numbers.'],
 ask:['Why can one record per cell not describe this photo?','How big are the two templates, in cells?','How big is the whole table now?'],
 expected:['Both centres fall in cell (1, 1), and one record holds one object.',`Tall: ${TALL.join(' × ')} pixels, 0.4 × 1 cell. Wide: ${WIDE.join(' × ')} pixels, 2 × 0.8 cells.`,'2 × 3 cells × 14 numbers = 84.'],
 point:'YOLOv1 gave each cell two boxes; YOLOv2 to v5 gave each cell several template shapes, called anchor boxes. Two objects of the same shape in one cell, or three objects, still collide, which fine grids make rare. YOLOv8 dropped the templates and writes one box per cell, on three grids (Part 7).',
 transition:'Which object goes in which box?',source:PC_SRC});
// which box gets which object: centre each template on the object's box and compare their shapes by IoU (areas to the nearest thousand pixels)
const PI=PC.iou,kpx=v=>big(Math.round(v/1000)*1000);
/** Overlap, union and IoU of an object's box with each template, both centred on the same point. */
const shapeCols=k=>{const [w,h]=pcWH(k),A=w*h;return ['tall','wide'].map(tn=>{const [tw,th]=PC.anchors[tn],ow=Math.min(w,tw),oh=Math.min(h,th),O=ow*oh,T=tw*th;
 if(Math.abs(O/(A+T-O)-PI[k][tn])>.005)throw new Error(`shape IoU ${k} ${tn}`);
 return {ovl:`${ow} × ${oh} ≈ ${kpx(O)}`,uni:O===A?`${tw} × ${th} ≈ ${kpx(T)}`:O===T?`${w} × ${h} ≈ ${kpx(A)}`:`${kpx(A)} + ${kpx(T)} − ${kpx(O)} ≈ ${kpx(A+T-O)}`,iou:`<b>${num(PI[k][tn],2)}</b>`};});};
const shapeTab=(k,b)=>{const c=shapeCols(k);return `<div class="table-sm xtight">${table(['',`tall, ${TALL.join(' × ')}`,`wide, ${WIDE.join(' × ')}`],[['overlap','ovl'],['union','uni'],['IoU','iou']].map(([n,f])=>[n,at(b[0],c[0][f]),at(b[1],c[1][f])]))}</div>`;};
const tmplOn=(k,which,col)=>{const b=centred(pcC[k],PC.anchors[which]);return rect(b,{stroke:col,w:8,dash:'22 13'})+pill(b[0],b[3]+6,which,{fill:col,size:36,below:true});};
const pcOne=(k,op)=>`<g opacity="${op}">${gtBox(pcB[k],'',{w:7})+dot(pcC[k],COL.target)}</g>`;
const [pw_,ph_]=pcWH('person'),[cw_,ch_]=pcWH('car');
S_('anchor-person','dense','Which box gets the person? The template that fits best',{builds:2,
 body:cols(pcPhoto(pcOne('car',.3)+pcOne('person',1)+gonly(1,tmplOn('person','tall',tallC))+gonly(2,tmplOn('person','wide',wideC)),'The person’s box with the tall template centred on it, then the wide one'),
  stack(small(`the person’s box: ${pw_} × ${ph_} ≈ ${kpx(pw_*ph_)} pixels`),shapeTab('person',[1,2]),at(2,`<div class="eq-sm">${eq(R`\text{person}\ \to\ \text{box 1, tall}`)}</div>`)),'1.05fr 1fr'),
 lines:[`Which box gets the person? Centre each template on the person’s box, so that only shapes count. The person fits inside the tall one: IoU ${num(PI.person.tall,2)}.`,
  `The wide template overlaps the person only ${pw_} × ${WIDE[1]} pixels and makes a big union: IoU ${num(PI.person.wide,2)}. The tall template fits better, so the person goes to box 1.`],
 ask:['Why is the overlap with the tall template the person’s whole box?','Which box does the person go to?'],
 expected:['The person, 115 × 409, fits inside the tall template, 166 × 416: so the overlap is the person and the union is the template.',`Box 1, the tall one: IoU ${num(PI.person.tall,2)} against ${num(PI.person.wide,2)}.`],
 point:'Centring both boxes on one point compares shape only; Part 3’s IoU does the rest. Our two templates were picked by hand for this photo; YOLOv2 to v5 pick theirs by k-means on the training boxes.',
 transition:'And the car?',source:PC_SRC});
S_('anchor-car','dense','The car goes to the wide box, and both are kept',{builds:2,
 body:cols(pcPhoto(gonly(1,pcOne('person',.3)+pcOne('car',1)+tmplOn('car','tall',tallC)+tmplOn('car','wide',wideC))+gat(2,pcObjs+pill(pcB.person[0],pcB.person[1],'box 1: person',{fill:tallC,size:36})+pill(pcB.car[0],pcB.car[1],'box 2: car',{fill:wideC,size:36})),
   'The car’s box with both templates centred on it; then each object in its box'),
  stack(small(`the car’s box: ${cw_} × ${ch_} ≈ ${kpx(cw_*ch_)} pixels`),shapeTab('car',[1,1]),
   at(2,`<div class="table-sm xtight">${table(['cell (1, 1)','object?',`${m('b_x')}, ${m('b_y')}, ${m('b_w')}, ${m('b_h')}`,'person','car'],[['box 1, tall','1','the person’s','1','0'],['box 2, wide','1','the car’s','0','1']])}</div>`)),'1.05fr 1fr'),
 lines:[`The car is the other way round. The wide template fits inside it, IoU ${num(PI.car.wide,2)}; the tall one reaches only ${num(PI.car.tall,2)}. The car goes to box 2.`,
  'So cell (1, 1)’s ground truth holds both: box 1 the person’s record and box 2 the car’s, each box in the cell’s units. No object is lost.'],
 ask:['Which box does the car go to?','What would cell (1, 1) hold if only the person were there?'],
 expected:[`Box 2, the wide one: IoU ${num(PI.car.wide,2)} against ${num(PI.car.tall,2)}.`,'Box 1: the person’s record. Box 2: object? 0, and “?” for the rest.'],
 point:'Each box’s record is written as before: the centre and size in the cell’s units, then the classes. YOLOv2 to v5 also predict small corrections to each template’s size. A box whose template matches no object learns object? = 0.',
 transition:'Back to one box per cell, on the real grid.',source:PC_SRC});
chap('5.4');
// the real grid, cells of 32 pixels: the dog's ground truth worked out number by number, then the trained network's record read back
const dogCell=CC.dog.cell,[dcr,dcc]=dogCell,x0c=dcc*s32,y0c=dcr*s32,ngd=NG.dog.map((v,i)=>num(v,i<2?2:1)),dIn=G.dog_centre_in_cells.map(v=>num(v,2));
const zv=[544,288,96,96],zf=fsz(zv,21,520);   // the dog's cell enlarged, with the eight cells around it
/** Text for the enlarged views, with a thin halo: label()'s halo is sized for whole photos. */
const zlab=(x,y,s,{fill=COL.ink,anchor='start'}={})=>`<text x="${(+x).toFixed(2)}" y="${(+y).toFixed(2)}" fill="${fill}" font-size="${zf}" font-weight="700" text-anchor="${anchor}" style="paint-order:stroke;stroke:#fff;stroke-width:.9px;stroke-linejoin:round">${s}</text>`;
const zdot=(c,col)=>`<circle cx="${c[0]}" cy="${c[1]}" r="1.8" fill="${col}" stroke="#fff" stroke-width=".7"/>`;
const zoom32=(inner,alt)=>courtyard(gridLines(W,H,s32,{w:.35,op:.9})+`<rect x="${x0c}" y="${y0c}" width="${s32}" height="${s32}" fill="#fff" fill-opacity=".12" stroke="#fff" stroke-width="1.1"/>`+inner,alt,{view:zv});
const fineFig=`<div class="state-slot"><div data-only="1-3">${grid(gat(2,gtBox(DOG,'',{w:4})+diag(DOG))+gat(3,cell(...dogCell,s32,{fill:COL.amber,op:.95})+pill(x0c+s32+6,y0c,`cell (${dcr}, ${dcc})`,{fill:COL.amber,size:24,below:true}))+gat(2,dot(dogC,COL.target)),
  'YOLOv8n’s 30 by 20 grid on the courtyard photo; then the dog’s box and its centre; then the cell that holds the centre')}</div>`+
 `<div data-only="4">${zoom32(line(x0c,dogC[1],dogC[0],dogC[1],{stroke:COL.ink,w:.6,dash:'1.6 1.1'})+line(dogC[0],y0c,dogC[0],dogC[1],{stroke:COL.ink,w:.6,dash:'1.6 1.1'})+
   zdot([x0c,y0c],COL.ink)+zdot([x0c+s32,y0c+s32],COL.ink)+zdot(dogC,COL.target)+zlab(x0c+.8,y0c-1.6,'(0, 0)')+zlab(x0c+s32-.8,y0c+s32+zf+.4,'(1, 1)',{anchor:'end'})+
   zlab((x0c+dogC[0])/2,dogC[1]+zf+.6,bLab('x',ngd[0],zf),{anchor:'middle'})+zlab(dogC[0]+1.4,(y0c+dogC[1])/2+1.4,bLab('y',ngd[1],zf)),
  'The dog’s cell enlarged: (0, 0) at its top-left corner, (1, 1) at its bottom-right, and the dog’s centre inside it')}</div>`+
 `<div data-only="5">${grid(gtBox(DOG,'',{w:4})+cell(...dogCell,s32,{fill:COL.amber,op:.95})+dot(dogC,COL.target)+
   arrow(DOG[0],560,DOG[2],560,{stroke:COL.target,w:5,head:16,both:true})+label((DOG[0]+DOG[2])/2,548,bLab('w',ngd[2],21),{size:21,fill:COL.target,weight:700,halo:true,anchor:'middle'})+
   arrow(790,DOG[1],790,DOG[3],{stroke:COL.target,w:5,head:16,both:true})+label(778,240,bLab('h',ngd[3],21),{size:21,fill:COL.target,weight:700,halo:true,anchor:'end'}),
  'The dog’s box with its width and height, counted in 32-pixel cells',{view:dogView})}</div></div>`;
const nw=s=>`<span style="white-space:nowrap">${s}</span>`;
const fineTab=`<div class="table-sm xtight">${table(['','across, x','down, y'],[
 [at(2,'centre'),at(2,nw(`(${DOG[0]} + ${DOG[2]}) ÷ 2 = ${fmt1(dogC[0])}`)),at(2,nw(`(${DOG[1]} + ${DOG[3]}) ÷ 2 = ${fmt1(dogC[1])}`))],
 [at(3,'÷ 32'),at(3,`${fmt1(dogC[0])} ÷ 32 ≈ ${dIn[0]}`),at(3,`${fmt1(dogC[1])} ÷ 32 ≈ ${dIn[1]}`)],
 [at(3,'round down'),at(3,`column ${dcc}`),at(3,`row ${dcr}`)],
 [at(4,'inside the cell'),at(4,nw(`${m('b_x')} = ${dIn[0]} − ${dcc} = ${ngd[0]}`)),at(4,nw(`${m('b_y')} = ${dIn[1]} − ${dcr} = ${ngd[1]}`))],
 [at(5,'size'),at(5,`${DOG[2]} − ${DOG[0]} = ${S.dog.w}`),at(5,`${DOG[3]} − ${DOG[1]} = ${S.dog.h}`)],
 [at(5,'size ÷ 32'),at(5,`${m('b_w')} ≈ ${ngd[2]}`),at(5,`${m('b_h')} ≈ ${ngd[3]}`)]])}</div>`;
S_('fine-grid','dense','In practice: small cells of 32 pixels',{builds:5,
 body:cols(fineFig,stack(`<div class="eq-sm">${eq(R`${W}\div32=${G.cols}\text{ across},\ \ ${H}\div32=${G.rows}\text{ down}`)}</div>`,fineTab),'0.9fr 1.1fr'),
 lines:[`Real YOLOs use small cells. YOLOv8n’s are 32 × 32 pixels, so our ${W} × ${H} photo becomes ${G.cols} × ${G.rows} = ${G.cols*G.rows} cells. Same rules, smaller cells.`,
  `The dog’s annotated box is (${DOG.join(', ')}). Its centre lies halfway along each side, (${fmt1(dogC[0])}, ${fmt1(dogC[1])}), which we rounded to (588, 336) earlier.`,
  `In cells, the centre is ${fmt1(dogC[0])} ÷ 32 ≈ ${dIn[0]} across and ${fmt1(dogC[1])} ÷ 32 ≈ ${dIn[1]} down. Round down: column ${dcc}, row ${dcr}. The dog’s cell is (${dcr}, ${dcc}).`,
  `Inside that cell, what is left after rounding down: b_x = ${ngd[0]} and b_y = ${ngd[1]} of a cell, measured from its top-left corner, (0, 0).`,
  `The size counts cells too: ${S.dog.w} pixels is about ${ngd[2]} cells wide, and ${S.dog.h} pixels about ${ngd[3]} cells tall. A big object spans many small cells.`],
 ask:['How many cells does YOLOv8n’s grid have on our photo?','Where is the centre of the box (407, 83, 768, 588)?','Which cell holds it?','What are b_x and b_y?','Why is b_w now about 11, when it was 1.13 on the 3 × 2 grid?'],
 expected:[`${G.cols} × ${G.rows} = ${G.cols*G.rows}: ${W} ÷ 32 across and ${H} ÷ 32 down.`,`((407 + 768) ÷ 2, (83 + 588) ÷ 2) = (${fmt1(dogC[0])}, ${fmt1(dogC[1])}).`,`(${dcr}, ${dcc}): row ⌊${dIn[1]}⌋ = ${dcr} and column ⌊${dIn[0]}⌋ = ${dcc}, counting from 0.`,
  `The parts after the decimal point: ${ngd[0]} and ${ngd[1]}, both between 0 and 1.`,`The same ${S.dog.w} pixels, counted in 32-pixel cells instead of 320-pixel ones.`],
 point:'YOLOv8n also reads two finer grids, of 16- and 8-pixel cells, for small objects (Part 7). Its record has no object? number: four box numbers and a score for each of 80 COCO classes (Appendix B).',
 transition:'At test time: what the trained network writes in that cell.',source:PHOTO_SRC});
// what a cell writes: four box numbers and 80 class scores, each a sigmoid, one per COCO class; no "object?" number
const NAMES=CELL.names,topAt=([r,c])=>G.top[r*G.cols+c],wallRC=G.samples.find(s=>s[0]==='wall')[1],logit=q=>Math.log(q/(1-q));
const pDog=CELL.p_dog,pCat=CELL.p_cat,tDog=logit(pDog),tCat=logit(pCat),wallTop=topAt(wallRC)[0];
S_('scores-80','dense','What a cell writes: a box and 80 class scores',{builds:3,
 body:stack(`<p class="caption">cell (${dcr}, ${dcc}), on the dog:</p>`+scoreStrip(topAt(dogCell),NAMES,{bh:96,box:NG.pred.map((v,i)=>num(v,i<2?2:1)),alt:'The dog’s cell writes four box numbers and 80 class scores; only the dog score is high'}),
  `<div class="state-slot">${only(2,`<div class="eq-sm">${eq(R`\text{score}=\sigma(t)=\frac{1}{1+e^{-t}}:\qquad \text{dog }\sigma(${num(tDog,2)})\approx${num(pDog,2)},\qquad \text{cat }\sigma(${num(tCat,2)})\approx${num(pCat,4)}`)}</div>`+small('80 separate yes/no answers, so they need not add up to 1'))}`+
  `${only(3,`<p class="caption">cell (${wallRC.join(', ')}), on the wall:</p>`+scoreStrip(topAt(wallRC),NAMES,{bh:50,alt:'A cell on the wall: all 80 class scores near 0'}))}</div>`),
 lines:['What does a cell write? 84 numbers: 4 for its box, then 80 class scores, one for each of the 80 classes YOLOv8n learned from COCO, in a fixed order.',
  `Each score is one yes/no answer between 0 and 1: is this cell’s box that class? A sigmoid squashes each raw output: dog ${num(tDog,2)} becomes ${num(pDog,2)}, cat ${num(tCat,2)} becomes ${num(pCat,4)}.`,
  'No object? number: on the wall all 80 answers are near 0, which means nothing is here. A box’s score is its highest class score; its class is that class.'],
 ask:['How many numbers does a cell write, and why 80 scores?','Why do the 80 scores not add up to 1?','How does YOLOv8n say “nothing here” without an object? number?'],
 expected:['84: four for the box and one score for each of COCO’s 80 classes.','Each comes from its own sigmoid: a separate yes/no answer per class, not a share of 1.',`All 80 scores are near 0; the highest on this wall cell is ${NAMES[wallTop[0]]}, ${num(wallTop[1],4)}. The score filter drops such boxes.`],
 point:'COCO’s 80 classes run from person, bicycle and car to hair drier and toothbrush; cat and dog are numbers 16 and 17. In training each score gets binary cross-entropy against 1 for the true class in an object’s cells and 0 for the other 79, and 0 for all 80 everywhere else (Appendix B). YOLOv5 and earlier had a separate objectness score; YOLOv8 folds it into the class scores. Bars below 0.001 are too short to see: no cell has a ninth-highest score above 0.001.',
 transition:'Now read the box numbers back into pixels.',source:YOLO_SRC});
// test time: the trained YOLOv8n's numbers for cell (10, 18), in cell units, turned back into pixels one step per click
const PBX=CELL.pred_box,pcxy=CELL.cxcywh,pb=NG.pred.map((v,i)=>num(v,i<2?2:1));
const mul=(a,b)=>{const v=+a*b,r=Math.round(v);return [r,Math.abs(v-r)<1e-9?'=':'≈'];};
const [dxp,dxs]=mul(pb[0],s32),[dyp,dys]=mul(pb[1],s32),[wpx,wsg]=mul(pb[2],s32),[hpx,hsg]=mul(pb[3],s32);
const cxp=x0c+dxp,cyp=y0c+dyp,decEdges=[cxp-wpx/2,cyp-hpx/2,cxp+wpx/2,cyp+hpx/2];
if(decEdges.some((v,i)=>Math.abs(v-PBX[i])>1))throw new Error('decode: the rounded steps drift from YOLOv8n’s box');
const decRows=[[`corner of cell (${dcr}, ${dcc})`,`${dcc} × 32 = ${x0c}`,`${dcr} × 32 = ${y0c}`],
 [`plus ${m('b')} × 32`,`${pb[0]} × 32 ${dxs} ${dxp}`,`${pb[1]} × 32 ${dys} ${dyp}`],
 ['centre',`${x0c} + ${dxp} = ${cxp}`,`${y0c} + ${dyp} = ${cyp}`],
 [`size: ${m('b')} × 32`,`${pb[2]} × 32 ${wsg} ${wpx}`,`${pb[3]} × 32 ${hsg} ${hpx}`],
 ['left, top: centre − half',`${cxp} − ${wpx/2} = ${decEdges[0]}`,`${cyp} − ${hpx/2} = ${decEdges[1]}`],
 ['right, bottom: centre + half',`${cxp} + ${wpx/2} = ${decEdges[2]}`,`${cyp} + ${hpx/2} = ${decEdges[3]}`]];
/** The decoding table: rows[i] appears at build show[i] (0: shown from the start). */
const decTab=show=>`<div class="table-sm xtight">${table(['','across, x','down, y'],decRows.map((r,i)=>show[i]===undefined?null:r.map(v=>show[i]?at(show[i],v):v)).filter(Boolean))}</div>`;
const decRec=`<div class="table-sm xtight">${table([m('b_x'),m('b_y'),m('b_w'),m('b_h'),'dog'],[[...pb,num(CELL.p_dog,2)]])}</div>`+small('and 79 more class scores, all below 0.01');
S_('decode','dense','At test time: read the centre back out of the cell',{builds:3,
 body:cols(zoom32(cell(...dogCell,s32,{fill:COL.guess,op:.28})+gat(2,zdot([x0c,y0c],COL.ink)+zlab(x0c-1,y0c-1.6,`(${x0c}, ${y0c})`,{anchor:'end'}))+
   gat(3,line(x0c,y0c,pcxy[0],y0c,{stroke:COL.guess,w:.7,dash:'1.6 1.1'})+line(pcxy[0],y0c,pcxy[0],pcxy[1],{stroke:COL.guess,w:.7,dash:'1.6 1.1'})+zlab((x0c+pcxy[0])/2,y0c-1.6,`${dxp}`,{fill:COL.guess,anchor:'middle'})+
    zlab(pcxy[0]+1.4,(y0c+pcxy[1])/2+1.4,`${dyp}`,{fill:COL.guess})+zdot(pcxy,COL.guess)+zlab(pcxy[0]+1.4,pcxy[1]+zf+1,`(${cxp}, ${cyp})`,{fill:COL.guess})),
   'The dog’s cell enlarged; its top-left corner; then the centre, 12 pixels right and 12 down from it'),
  stack(`<p class="caption">cell (${dcr}, ${dcc}) writes:</p>`+decRec,decTab([2,3,3])),'0.95fr 1.05fr'),
 lines:[`At test time there is no annotation. Cell (${dcr}, ${dcc}) wrote these four box numbers, and of its 80 class scores the highest is dog, ${num(CELL.p_dog,2)}.`,
  `To read the box in pixels, undo the cell units. Start at the cell’s top-left corner: ${dcc} cells of 32 pixels across, ${x0c}, and ${dcr} cells down, ${y0c}.`,
  `Then step b_x and b_y of a cell from that corner: ${pb[0]} × 32 ${dxs} ${dxp} pixels right and ${pb[1]} × 32 ${dys} ${dyp} down. The centre is (${cxp}, ${cyp}).`],
 ask:['What does the network write in the dog’s cell?',`Where is the top-left corner of cell (${dcr}, ${dcc}), in pixels?`,'Where is the box’s centre?'],
 expected:[`Four box numbers, about (${pb.join(', ')}), and 80 class scores: dog ${num(CELL.p_dog,2)}, the rest below 0.01.`,`(${dcc} × 32, ${dcr} × 32) = (${x0c}, ${y0c}).`,`(${x0c} + ${dxp}, ${y0c} + ${dyp}) = (${cxp}, ${cyp}).`],
 point:'YOLOv8n actually writes, for each cell, the distances from the cell’s centre to the box’s four edges (Appendix B). We turn them into b_x, b_y, b_w and b_h, the form of our ground truth, so reading the box back mirrors writing it. The numbers are its real output at cell (10, 18).',
 transition:'Then the size, and the box’s edges.',source:YOLO_SRC});
S_('decode-box','dense','Then the size, and the box’s edges',{builds:3,
 body:cols(grid(cell(...dogCell,s32,{fill:COL.guess,op:.6})+gonly(1,arrow(PBX[0],pcxy[1],PBX[2],pcxy[1],{stroke:COL.guess,w:5,head:16,both:true})+arrow(pcxy[0],PBX[1],pcxy[0],PBX[3],{stroke:COL.guess,w:5,head:16,both:true})+
   label((PBX[0]+pcxy[0])/2,pcxy[1]-12,`${wpx} px`,{size:22,fill:COL.guess,weight:700,halo:true,anchor:'middle'})+label(pcxy[0]+12,(PBX[1]+pcxy[1])/2,`${hpx} px`,{size:22,fill:COL.guess,weight:700,halo:true}))+
   gat(2,prBox(PBX,'',{w:5})+pill(PBX[0],PBX[1],`dog ${num(CELL.p_dog,2)}`,{fill:COL.guess,size:26}))+gat(3,gtBox(DOG,'',{w:4,dash:'12 8'}))+dot(pcxy,COL.guess),
   'The width and height drawn through the centre; then the box they make; then our annotation, dashed',{view:dogView}),
  stack(decTab([undefined,undefined,0,1,2,2]),at(3,`<div class="eq-sm">${eq(R`\mathrm{IoU}(\text{box},\ \text{our annotation})\approx${num(CELL.iou,2)}`)}</div>`)),'0.95fr 1.05fr'),
 lines:[`The size is in cells too: ${pb[2]} cells is ${pb[2]} × 32 ${wsg} ${wpx} pixels wide, and ${pb[3]} cells is ${hpx} pixels tall.`,
  `Each edge lies half the size from the centre: left ${cxp} − ${wpx/2} = ${decEdges[0]} and right ${decEdges[2]}, top ${cyp} − ${hpx/2} = ${decEdges[1]} and bottom ${decEdges[3]}.`,
  `That box sits on the dog: IoU ${num(CELL.iou,2)} with our annotation. The network wrote (${pb.join(', ')}); the ground truth was (${ngd.join(', ')}).`],
 ask:['How wide is the box, in pixels?','Where are the box’s left and top edges?','How close is the box to our annotation?'],
 expected:[`${pb[2]} × 32 ${wsg} ${wpx}.`,`${cxp} − ${wpx} ÷ 2 = ${decEdges[0]} and ${cyp} − ${hpx} ÷ 2 = ${decEdges[1]}.`,`IoU ${num(CELL.iou,2)}: almost the same box. Only the top edge differs much, ${decEdges[1]} against ${DOG[1]}.`],
 point:`Our rounded steps give (${decEdges.join(', ')}); the exact output is (${PBX.map(v=>num(v,1)).join(', ')}). The network writes numbers in every cell, never “?”: next, which cells to believe.`,
 transition:'Every cell writes a box like this. Pick a few.',source:YOLO_SRC});
S_('cell-inspector','dense','Every cell writes a box and 80 scores: pick one',{builds:1,
 body:widget('cell-inspector','Pick a cell of the 30 by 20 grid, or point at one, to see the box it writes and its highest class scores'),
 lines:['Pick a cell: its box, and its 80 class scores as bars. Near the dog the dog bar stands tall; on the wall all 80 lie flat.'],
 ask:['What does a cell on the wall write?'],expected:['A box of some kind, but every class score is near 0.'],
 point:'Every cell always writes a box: the network has no way to write “?”. The scores decide which boxes we believe, on the next slide.',
 transition:'All 600 cells at once.',source:YOLO_SRC});
const AXc='#AAB3BC';
// one cell's record, drawn as a strip: four box numbers, then 80 thin bars, one per class (Appendix B)
const recStrip=fig(690,170,[0,1,2,3].map(i=>`<rect x="${10+i*70}" y="40" width="62" height="62" rx="6" fill="#fff" stroke="${COL.guess}" stroke-width="3"/>`+label(41+i*70,80,`b<tspan dy="6" font-size="15">${'xywh'[i]}</tspan>`,{size:22,anchor:'middle',fill:COL.guess,weight:700})).join('')+
 Array.from({length:80},(_,i)=>`<rect x="${(300+i*4.1).toFixed(1)}" y="40" width="3" height="62" fill="${AXc}"/>`).join('')+
 label(10,26,'4 box numbers',{size:20,fill:COL.guess,weight:650})+label(300,26,'80 class scores, one per COCO class',{size:20,fill:COL.ink,weight:650})+label(300,128,'person',{size:16})+label(300+79*4.1+3,128,'toothbrush',{size:16,anchor:'end'}),'One cell’s record: four box numbers and eighty class scores');
// the score filter, worked on five sample cells and then on all 600; NMS (Part 6) removes the duplicates that remain
const recs=G.records,recAt=([r,c])=>recs[r*G.cols+c],SAMP=G.samples.map(([k,rc])=>[k,recAt(rc)]),kept32=recs.filter(x=>x[7]>=.25);
const cand=S.nms_courtyard,fine1=cand.candidates.filter(k=>k.stride!==s32);
const candBoxes=(list,op=1)=>list.map(k=>rect(k.box,{stroke:k.name==='potted plant'?COL.amber:COL.guess,w:2.5,op})).join('');
const sc2=v=>v<.01?'&lt; 0.01':num(v,2),nm2=n=>n==='potted plant'?'plant':n==='dining table'?'table':n,sKept=x=>x[7]>=.25;
const sampTag=([k,x])=>{const left=k==='plant';return pill(left?x[1]*s32-4:(x[1]+1)*s32+4,x[0]*s32,k,{fill:COL.ink,size:24,below:true,anchor:left?'end':'start'});};
const sampFig=b=>SAMP.map(([k,x])=>(b===3&&sKept(x)?rect(x.slice(2,6),{stroke:COL.guess,w:5}):'')+cell(x[0],x[1],s32,{fill:b===3?(sKept(x)?COL.green:COL.loss):COL.amber,op:.95,stroke:'#fff',w:2})).join('')+SAMP.map(sampTag).join('');
const filterRows=[[1,'# boxes: (600, 4)   scores: (600, 80)'],[2,'score = scores.amax(1)   # best of 80'],[3,'keep = score >= 0.25'],[4,'boxes, scores = boxes[keep], scores[keep]']];
S_('candidates','dense','600 cells, up to 600 boxes: keep the confident ones',{builds:5,
 body:cols(`<div class="state-slot"><div data-only="1">${courtyard(recs.map(x=>rect(x.slice(2,6),{stroke:COL.guess,w:1.5,op:.35})).join(''),'The box written by every one of the 600 cells')}</div>`+
   `<div data-only="2">${courtyard(gridLines(W,H,s32,{op:.35})+sampFig(2),'Five sample cells: on the dog, the cat, a plant, the wall and the floor')}</div><div data-only="3">${courtyard(gridLines(W,H,s32,{op:.35})+sampFig(3),'The three sample cells that pass keep their boxes; the wall and floor cells are dropped')}</div>`+
   `<div data-only="4-5">${courtyard(candBoxes(cand.candidates.filter(k=>k.stride===s32))+fine1.map(k=>rect(k.box,{stroke:COL.amber,w:3,dash:'8 6'})).join(''),'The 31 boxes that score at least 0.25; the small plant’s, from a finer grid, dashed')}</div></div>`,
  stack(`<div class="code-xs">${codeSteps(filterRows)}</div>`,
   `<div class="state-slot">${only(1,stack(`<div class="big-number">${G.cols*G.rows}</div>`,p('cells, each writing a box, 4 numbers, and 80 class scores')))}`+
   `${only('2-3',`<div class="table-sm xtight">${table(['cell','on the','best score','keep?'],SAMP.map(([k,x])=>[`(${x[0]}, ${x[1]})`,k,`${nm2(x[6])} ${sc2(x[7])}`,at(3,sKept(x)?'<span class="hit">yes</span>':'<span class="miss">no</span>')]))}</div>`)}`+
   `${only('4-5',stack(`<div class="big-number">${kept32.length}</div>`,ps(`of ${G.cols*G.rows} cells pass: ${kept32.filter(x=>x[6]==='dog').length} dog, ${kept32.filter(x=>x[6]==='cat').length} cat, ${kept32.filter(x=>x[6]==='potted plant').length} plant. A finer grid adds ${fine1.length} small plant, dashed (Part 7): ${cand.n_candidates} boxes.`),
     at(5,ps('<b>A score filter, not NMS:</b> each object still has about ten boxes.'))))}</div>`),'1.1fr 1fr'),
 lines:['Decode every cell the same way: 600 cells, so up to 600 boxes. The network never writes “?”, so cells on the wall and the floor write boxes too.',
  `Which boxes do we believe? Score each box by its cell’s highest class score. Five sample cells: dog ${sc2(SAMP[0][1][7])}, cat ${sc2(SAMP[1][1][7])}, plant ${sc2(SAMP[2][1][7])}; wall and floor below 0.01.`,
  'Keep a box only if its score is at least 0.25, Ultralytics’ default. The dog, cat and plant cells pass; the wall and floor cells are dropped.',
  `Over all 600 cells, ${kept32.length} pass: 10 on the dog, 10 on the cat, 10 on the big plant. A finer grid adds one small plant (Part 7): ${cand.n_candidates} boxes.`,
  'This was a score filter, not NMS. Each object still has about ten boxes, from neighbouring cells that see the same object; Part 6 removes the extras.'],
 ask:['Does a cell on the wall write a box?','What score does each box get?','Which of the five sample boxes survive?','How many boxes pass over the whole photo?','Is this NMS?'],
 expected:['Yes: every cell always writes one, with 80 class scores.','Its cell’s highest class score: the best of the 80.','The dog’s, the cat’s and the plant’s; the wall and floor scores are below 0.01.',`${kept32.length} of the 600 cells, plus one from a finer grid: ${cand.n_candidates}.`,
  'No. The score filter looks at each box alone. NMS compares boxes with each other and removes the duplicates; it comes in Part 6.'],
 point:'Drop the low scores first, then remove duplicates for each class. YOLOv8 trains about ten cells per object as positives, which is why each object has about ten confident boxes. The 31st box comes from YOLOv8n’s 16-pixel grid (Part 7).',
 transition:'The whole algorithm, step by step.',source:YOLO_SRC});
const trainSteps=['Ground truth: each box’s centre picks a cell, which gets the box and class.','Every other cell: object? 0.','Prediction: one CNN pass, a table of the same shape.','Part 4’s loss, cell by cell; gradient descent.'],
 testSteps=['One CNN pass: a record per cell.','Turn each record’s box back into pixels.','Keep the boxes that score at least 0.25.','Remove duplicates with NMS (Part 6).'];
S_('yolo-steps','dense','YOLO, the whole algorithm',{builds:2,
 body:`<div class="compare"><div class="b"><h3>Training, for each photo</h3><ol class="steps algo">${trainSteps.map(t=>`<li>${t}</li>`).join('')}</ol></div>`+
  `<div class="a" data-at="2"><h3>Test time, for a new photo</h3><ol class="steps algo">${testSteps.map(t=>`<li>${t}</li>`).join('')}</ol></div></div>`,
 lines:['Training, for every photo in the set: build the ground-truth table from people’s boxes, predict a table, compare cell by cell, lower the loss.',
  `Test time: one pass, every cell writes a record, decode the boxes, keep the confident ones (${cand.n_candidates} here), and remove the duplicates.`],
 ask:['Which step of training uses the annotation?','Which step of test time is still missing?'],
 expected:['Building the target: the centre cell and the box in cell units come from the annotated boxes.','Removing duplicates: non-maximum suppression, Part 6.'],
 point:'Ng’s “YOLO Algorithm” video has the same two halves: build the training target cell by cell (his has two anchors), then at test time drop the low-probability boxes and run NMS for each class.',
 transition:'Part 5 in one slide.'});
recap(5,'dense',['Sliding windows are slow, repeat work, and their boxes are only the windows.',
 `Test time: decode every cell’s box; the score filter keeps ${cand.n_candidates}, about ten per object.`],
 'each object has about ten boxes; keep one.',
 {flow:chart([{name:'training',steps:[{t:'people\ndraw boxes',n:'5.2'},{t:'centre picks\na cell',n:'5.2'},{t:'box in the\ncell’s units',n:'5.2'},{t:'network writes\na table',n:'5.3'},{t:'loss, cell\nby cell',n:'5.3',hi:1}]},{name:'test time',steps:[{t:'new photo'},{t:'network writes\na table',n:'5.4'},{t:'decode boxes\nto pixels',n:'5.4'},{t:'keep scores\n≥ 0.25',n:'5.4',hi:1},{t:'many boxes\nper object'}]}],{bh:76,fs:19,alt:'YOLO in two rows: training from people’s boxes to the loss; test time from a new photo to the score filter'}),
  ask:'Why are there about ten boxes per object at test time?',expected:'Cells next to an object’s centre see nearly the same object, so several of them are confident.',transition:'Part 6.'});

// ================================================================================================ Part 6
partBreak(6,'nms','One box per object: non-maximum suppression','Ten boxes for one dog. Keep the best and delete the ones that overlap it heavily.',[
 'Run the greedy recipe on the dog’s ten real boxes, then on two dogs.','See what the IoU threshold trades off, and why classes are kept apart.','Try it live; write it in eight lines; then the whole detector in code.'],
 {line:'NMS keeps the highest-scoring box and removes boxes that overlap it.',ask:'Of ten overlapping dog boxes, which one would you keep?',expected:'The one with the highest score.',transition:'The dog’s ten boxes.'});
chap('6.1');
const dr=cand.dog_round,dogTen=[dr.keep,...dr.removed];
S_('dupes','nms','Ten boxes for one dog',{builds:2,
 body:cols(courtyard(dogTen.map(k=>rect(k.box,{stroke:COL.guess,w:2.5})).join('')+gat(2,rect(dr.keep.box,{stroke:COL.guess,w:7})+pill(dr.keep.box[0],dr.keep.box[1],`dog ${num(dr.keep.score,3)}`,{fill:COL.guess,size:30})),'Ten nearly identical dog boxes; the highest-scoring one is highlighted',{view:dogView}),
  stack(`<div class="table-sm xtight">${table(['cell (row, col)','dog score'],dogTen.map((k,i)=>[`(${k.row}, ${k.col})`,i===0?`<b>${num(k.score,3)}</b>`:num(k.score,3)]))}</div>`,small('dog score: the cell’s class score for “dog”, between 0 and 1')),'1fr 1fr'),
 lines:['The ten cells whose dog score passed 0.25: each cell’s own estimate that its box holds a dog, from 0.889 down to 0.766. Their boxes nearly coincide.','They describe one dog. Keep the most confident box, from cell (9, 19), and delete the rest.'],
 ask:['How many dogs are here?','Which box would you keep?'],
 expected:['One.','The highest-scoring: cell (9, 19), 0.889.'],
 point:'Each score is one of the cell’s 80 class scores, the one for dog, from YOLOv8n’s sigmoid output (5.4). It is the score the 0.25 filter used.',
 transition:'The recipe, in general.',source:YOLO_SRC});
S_('nms-recipe','nms','Non-maximum suppression: the greedy recipe',{builds:4,
 body:`<ol class="steps">${['Sort the boxes by score, highest first.','Keep the top box.','Delete every remaining box of the same class whose IoU with it is above a threshold (0.7 here).','Repeat from step 2 with what is left, until nothing is left.'].map((x,i)=>`<li data-at="${i+1}">${x}</li>`).join('')}</ol>`,
 lines:['Sort by score.','The best box is kept: no other box can beat it.','Boxes that overlap it heavily describe the same object: delete them. Boxes that overlap little may be other objects: keep them for now.','Then repeat on what is left. Non-maximum suppression removes every box that is not a local maximum.'],
 point:'Andrew Ng’s version: first drop boxes with p_c ≤ 0.6, then delete boxes with IoU ≥ 0.5 with the kept one, separately for each class. Ultralytics’ defaults are a score cut-off of 0.25 and an IoU threshold of 0.7.',
 ask:['Why sort first?','Is the top box ever deleted?','Why only same-class boxes?','When does the loop stop?'],
 expected:['So that each kept box is the best of its neighbourhood.','No: it is kept immediately.','A person on a bicycle overlaps the bicycle; both are real objects.','When no boxes are left.'],
 transition:'Run it on the dog’s ten boxes.'});
S_('nms-dog','nms','NMS on the dog’s ten boxes',{builds:4,
 body:`<div class="table-sm tight">${table(['cell','dog score','IoU with the kept box','fate'],dogTen.map((k,i)=>[`(${k.row}, ${k.col})`,num(k.score,3),i===0?at(2,'kept box'):at(3,num(k.iou,3)),i===0?at(2,'<span class="hit">keep</span>'):at(4,'<span class="miss">delete (&gt; 0.7)</span>')]))}</div>`,
 lines:['Step 1: the ten boxes sorted by score.','Step 2: keep the top one, cell (9, 19).','Step 3: each other box’s IoU with it. All are above 0.9: these boxes are the same box, drawn by neighbouring cells.','Every IoU is above the 0.7 threshold, so all nine go and one dog box remains.'],
 ask:['Which box is kept first?','How similar are the other boxes to it?','Which boxes are deleted?','How many dog boxes remain?'],
 expected:['Cell (9, 19), score 0.889.',`Very: IoU from ${num(Math.min(...dr.removed.map(k=>k.iou)),2)} to ${num(Math.max(...dr.removed.map(k=>k.iou)),2)}.`,'All nine: every IoU is above 0.7.','One.'],
 transition:'Two objects of the same class.',source:YOLO_SRC});
const T2=S.nms_two_dogs,[r1,r2]=T2.rounds;
const tdPhoto=(inner,alt)=>photo('two-dogs',W2,H2,inner,alt,{view:[120,120,1060,520]});
const keptPill=k=>rect(k.box,{stroke:COL.guess,w:7})+pill(k.box[0],k.box[1],`dog ${num(k.score,3)}`,{fill:COL.guess,size:30});
S_('nms-two-dogs','nms','Two dogs: why the loop keeps the second one',{builds:3,
 body:cols(`<div class="state-slot"><div data-only="1">${tdPhoto(T2.candidates.map(k=>rect(k.box,{stroke:COL.guess,w:2})).join(''),'Twenty dog boxes on two dogs')}</div><div data-only="2">${tdPhoto(T2.left_after_1.map(k=>rect(k.box,{stroke:COL.guess,w:2})).join('')+keptPill(r1.keep),'Round 1: the left dog kept, its twins deleted')}</div><div data-only="3">${tdPhoto(keptPill(r1.keep)+keptPill(r2.keep),'Round 2: both dogs kept, one box each')}</div></div>`,
  `<div class="state-slot">${only(1,p(`${T2.n} dog boxes with score ≥ 0.25.`))}${only(2,p(`Round 1 keeps ${num(r1.keep.score,3)} on the left dog and deletes its ${r1.removed.length} twins (IoU ≥ ${num(Math.min(...r1.removed.map(k=>k.iou)),2)}). The right dog’s boxes have IoU <b>${num(Math.max(...T2.left_after_1.map(k=>k.iou)),1)}</b> with it: untouched.`))}${only(3,p(`Round 2 keeps ${num(r2.keep.score,3)} on the right dog and deletes its ${r2.removed.length} twins, leaving one box per dog.`))}</div>`,'1.4fr 1fr'),
 lines:['Two dogs in one photo: about ten boxes on each.','Round 1 works on the left dog only: the right dog’s boxes do not overlap the kept box, so they stay.','Round 2 keeps the right dog. Keeping only the single best box overall would have lost a dog; the loop keeps one per object.'],
 ask:['How many dog boxes are there before NMS?','Why does round 1 leave the right dog’s boxes alone?','How many boxes remain, and why is the loop needed?'],
 expected:[String(T2.n),'Their IoU with the kept box is 0, below the threshold: they may be another dog.','Two: one per dog. Keeping only the best box overall would lose the second dog.'],
 transition:'All three classes in the courtyard.',source:YOLO_SRC});
S_('nms-all','nms','All 31 boxes → 4 detections',{builds:2,
 body:cols(`<div class="state-slot"><div data-only="1">${courtyard(candBoxes(cand.candidates),'Thirty-one candidates before NMS')}</div><div data-only="2">${courtyard(finalBoxes(30),'Four detections after NMS')}</div></div>`,
  stack(p('Before: 31 boxes.'),at(2,p(`After: ${cand.kept.length}. ${cand.kept.map(k=>`${k.name} ${num(k.score,3)}`).join(', ')}.`)),at(2,small('Our eight-line loop keeps exactly what Ultralytics’ own post-processing keeps (checked in scripts/science.py).'))),'1.3fr 1fr'),
 lines:['The same loop runs on every class: 10 cat boxes become one, 10 plant boxes become one.','Four detections: cat, the big potted plant, dog, and a small plant on a finer grid. A fixed 12,600 records became a set of four.'],
 ask:['How many detections remain?','Why does the small plant survive?'],
 expected:['Four.','It is far from every kept box: its IoU with the big plant is 0.'],
 transition:'What does the threshold change?',source:YOLO_SRC});
chap('6.2');
const crowdK=S.nms_crowd.kept,same=(a,b)=>a.every((v,i)=>Math.abs(v-b[i])<.01);
const extra=crowdK['0.95'].filter(b=>!crowdK['0.7'].some(x=>same(x,b))),lost=crowdK['0.7'].filter(b=>!crowdK['0.0'].some(x=>same(x,b)));
const crowdFig=(list,mark,markCol)=>photo('crowd',W2,H2,list.map(b=>rect(b,{stroke:COL.guess,w:4})).join('')+mark.map(b=>rect(b,{stroke:markCol,w:8,dash:'14 8'})).join(''),'People kept by NMS on the path',{view:[60,340,1160,340]});
S_('nms-threshold','nms','The IoU threshold is a trade-off',{builds:3,
 body:stack(`<div class="state-slot"><div data-only="1">${crowdFig(crowdK['0.7'],[],COL.guess)}</div><div data-only="2">${crowdFig(crowdK['0.95'],extra,COL.amber)}</div><div data-only="3">${crowdFig(crowdK['0.0'],lost,COL.loss)}</div></div>`,
  `<div class="state-slot">${only(1,p(`Threshold 0.7: ${S.nms_crowd.by_threshold['0.7']} boxes, one per person.`))}${only(2,p(`Too high, 0.95: ${S.nms_crowd.by_threshold['0.95']} boxes. Two duplicates (amber) survive.`))}${only(3,p(`Too low, 0.0: ${S.nms_crowd.by_threshold['0.0']} boxes. Two real people (red) are deleted.`))}</div>`),
 lines:[`The crowd photo: ${S.nms_crowd.n_candidates} person candidates. NMS at 0.7 keeps eleven boxes, one per person.`,'Raise the threshold to 0.95 and NMS deletes only near-identical boxes: two duplicates slip through.','Lower it to 0 and any touching box is deleted, real neighbours included. No single threshold suits every scene.'],
 ask:['How many people does NMS keep at 0.7?','What goes wrong at 0.95?','What goes wrong at 0?'],
 expected:['Eleven.','Duplicates survive: 13 boxes.','Real people are deleted for touching a neighbour: 9 boxes.'],
 point:'Typical thresholds are 0.45 to 0.7. Crowded scenes motivated Soft-NMS (lower the score instead of deleting) and NMS-free detectors such as DETR.',
 transition:'One more rule: classes.',source:YOLO_SRC});
const ca=S.class_aware;
S_('class-aware','nms','Boxes of different classes do not suppress each other',{builds:3,
 body:cols(photo('street',W2,H2,prBox(ca.person.box,`person ${num(ca.person.score)}`,{size:15,w:3})+prBox(ca.bicycle.box,'',{size:15,w:3,fill:COL.amber})+pill(ca.bicycle.box[0],ca.bicycle.box[3]+2,`bicycle ${num(ca.bicycle.score)}`,{fill:COL.amber,size:15,below:true})+gonly(2,line(ca.bicycle.box[0],ca.bicycle.box[1],ca.bicycle.box[2],ca.bicycle.box[3],{stroke:COL.loss,w:3})+line(ca.bicycle.box[2],ca.bicycle.box[1],ca.bicycle.box[0],ca.bicycle.box[3],{stroke:COL.loss,w:3})),'A cyclist: the person box and the bicycle box overlap',{view:[650,360,170,200]}),
  stack(eq(R`\mathrm{IoU}(\text{person},\text{bicycle})=${num(ca.iou,3)}`),at(2,p('Classes ignored, threshold 0.3: the bicycle is deleted.')),
   at(3,p('Class-aware NMS, the usual choice (torchvision’s batched_nms): both survive.'))),'0.9fr 1.1fr'),
 lines:['A cyclist: a person box and a bicycle box. They overlap, and both are right.','If NMS ignored classes, the bicycle would overlap the higher-scoring person by more than 0.3 and be deleted.','Run NMS separately for each class and both are kept. That is why step 3 of the recipe says “of the same class”.'],
 ask:['How much do the two boxes overlap?','What would class-agnostic NMS at 0.3 do?','What does class-aware NMS do?'],
 expected:[num(ca.iou,3),'Delete the bicycle.','Keep both: they are compared only within their own class.'],
 transition:'Try the thresholds yourself.',source:YOLO_SRC});
S_('nms-play','nms','Try it: thresholds on the street photo',{builds:1,
 body:widget('nms-play','Move the score and IoU thresholds and step through NMS on the street photo'),
 lines:['Move the score threshold, then the IoU threshold; try “all classes together” and watch the bicycle; Step runs one round of the loop.'],
 ask:['At which IoU threshold do duplicates start to survive?'],expected:['Near 0.95 for this photo: below that, each object keeps one box.'],
 transition:'NMS in code.',source:YOLO_SRC});
// NMS in code on the courtyard's 31 boxes, one line per click: round 1 keeps the cat box and drops its twins; the loop does the rest
const NR=cand.rounds,R1=NR[0],kKey=k=>k.box.join(),gone1=new Set(R1.removed.map(kKey)),short2=n=>n==='potted plant'?'plant':n;
const cCol=k=>k.name==='potted plant'?COL.amber:COL.guess,thin=k=>rect(k.box,{stroke:cCol(k),w:2.5}),thick=(k,lab)=>rect(k.box,{stroke:cCol(k),w:7})+(lab?pill(k.box[0],k.box[1],`${short2(k.name)} ${num(k.score,3)}`,{fill:cCol(k),size:28,maxX:W}):'');
const notR1=cand.candidates.filter(k=>kKey(k)!==kKey(R1.keep)),rest1=Math.max(...notR1.filter(k=>!gone1.has(kKey(k))).map(k=>iouParts(R1.keep.box,k.box).iou));
const r1Lo=Math.min(...R1.removed.map(k=>k.iou)),r1Hi=Math.max(...R1.removed.map(k=>k.iou));
const nmsFig=b=>courtyard(b<=3?cand.candidates.map(thin).join('')+(b>=2?pill(R1.keep.box[0],R1.keep.box[1],`1st: cat ${num(R1.keep.score,3)}`,{fill:COL.guess,size:28}):''):
 b<=5?notR1.map(thin).join('')+thick(R1.keep,false)+(b===5?label(R1.keep.box[2]+12,R1.keep.box[3]-40,`${R1.removed.length} twins: IoU ≥ ${num(r1Lo,2)}`,{size:30,fill:COL.ink,weight:700,halo:true}):''):
 b===6?notR1.filter(k=>!gone1.has(kKey(k))).map(thin).join('')+thick(R1.keep,false):cand.kept.map(k=>thick(k,b===8)).join(''),`NMS on the courtyard’s boxes, step ${b}`);
S_('nms-code','nms','NMS in code, one line at a time',{builds:8,
 body:cols(`<div class="code-xs">${codeSteps([[1,'def nms(boxes, scores, thr=0.7):'],[2,'    order = scores.argsort(descending=True)'],[3,'    keep = []'],[3,'    while order.numel() > 0:'],
   [4,'        i, rest = order[:1], order[1:]'],[4,'        keep.append(i)'],[5,'        ious = box_iou(boxes[i], boxes[rest])[0]'],[6,'        order = rest[ious <= thr]'],[8,'    return torch.cat(keep)']])}</div>`,
  `<div class="state-slot">${[1,2,3,4,5,6,7,8].map(b=>`<div data-only="${b}">${nmsFig(b)}</div>`).join('')}</div>`,'1.05fr 1fr'),
 lines:[`The greedy loop of 6.1 as a function. Its input: the ${cand.n_candidates} boxes that passed the score filter, with their scores.`,
  `Sort by score, best first. The best of all is a cat box, ${num(R1.keep.score,3)}.`,
  'keep starts empty. The loop runs while any box is left in order.',
  'Take the first box in order and keep it. Everything after it is rest.',
  `IoU of the kept box with every box in rest, all at once: its ${R1.removed.length} twins score ${num(r1Lo,2)} or more, and every other box ${rest1<.005?'about 0':`at most ${num(rest1,2)}`}.`,
  `Keep only the boxes with IoU ≤ 0.7: the cat’s ${R1.removed.length} twins go, and nothing else is touched.`,
  `The loop repeats: a plant box drops ${NR[1].removed.length} twins, the dog box ${NR[2].removed.length}, the small plant none. order is now empty.`,
  `Return the ${cand.kept.length} kept boxes, one per object. torchvision.ops.nms returns the same four.`],
 ask:['What goes into nms?','Why sort first?','When does the loop stop?','Is the top box ever deleted?','Which boxes overlap the kept cat box heavily?','Which line deletes the duplicates?','How many rounds does the loop run here?','How would you make it class-aware?'],
 expected:['The boxes that passed the score filter, and their scores.','So that each kept box is the best one left in its neighbourhood.','When no boxes are left in order.','No: it is kept as soon as it is first in line.',`Its ${R1.removed.length} twins, IoU ${num(r1Lo,2)} to ${num(r1Hi,2)}.`,'order = rest[ious <= thr].',`${NR.length}: one per object.`,'Run it once per class, or use torchvision.ops.batched_nms, which does exactly that.'],
 point:'This nms ignores classes; on these boxes it keeps the same four as class-aware NMS (checked in scripts/science.py). order[:1] keeps i a one-element index, so boxes[i] has the (1, 4) shape that box_iou expects.',
 demo:'Notebook part 6 runs this function on the courtyard’s 31 candidates and checks it against torchvision.ops.nms.',
 transition:'The dense answer, end to end.',source:YOLO_SRC});
// the whole dense detector as a strip of real thumbnails: photo, one pass, 12,600 records, a box per cell, the score filter, NMS
const pipeFig=(()=>{const TW=170,sc=TW/W,TH=H*sc,y0=40,g=[];
 const th=(x,inner)=>`<g transform="translate(${x},${y0}) scale(${sc})"><image href="figures/cat-dog.jpg" width="${W}" height="${H}" preserveAspectRatio="none"/>${inner}</g>`+rect([x,y0,x+TW,y0+TH],{stroke:'#C9D0D7',w:1.5});
 const cap=(x,w,a,b,col=COL.ink)=>label(x+w/2,y0+TH+30,a,{size:19,anchor:'middle',fill:col,weight:700})+label(x+w/2,y0+TH+54,b,{size:16,anchor:'middle',fill:MUTED});
 const arr=x=>arrow(x+4,y0+TH/2,x+28,y0+TH/2,{stroke:COL.ink,w:2.5,head:10});
 const recs32=G.records;
 g.push(gat(1,th(0,'')+cap(0,TW,'photo',`${W} × ${H}`)+arr(TW)+`<rect x="200" y="${y0+TH/2-40}" width="100" height="80" rx="10" fill="#fff" stroke="${COL.ink}" stroke-width="2.5"/>`+label(250,y0+TH/2-6,'CNN',{size:20,anchor:'middle',fill:COL.ink,weight:700})+label(250,y0+TH/2+18,'+ head',{size:16,anchor:'middle',fill:MUTED})+cap(200,100,'one pass','learned')+arr(300)+
  th(330,gridLines(W,H,32,{stroke:'#fff',w:4,op:.75}))+cap(330,TW,`${big(G.total)} records`,'same shape for any photo')));
 g.push(gat(2,arr(330+TW)+th(530,recs32.map(x=>rect([x[2],x[3],x[4],x[5]],{stroke:COL.guess,w:5,op:.35})).join(''))+cap(530,TW,'a box per cell','decode')+arr(530+TW)+
  th(730,cand.candidates.map(k=>rect(k.box,{stroke:cCol(k),w:10})).join(''))+cap(730,TW,`${cand.n_candidates} boxes`,'score ≥ 0.25')+arr(730+TW)+
  th(930,cand.kept.map(k=>rect(k.box,{stroke:cCol(k),w:16})).join(''))+cap(930,TW,`${cand.kept.length} objects`,'NMS',COL.target)));
 g.push(gat(3,line(200,y0-14,300,y0-14,{stroke:COL.target,w:4})+label(250,y0-22,'learned',{size:17,anchor:'middle',fill:COL.target,weight:700})+line(530,y0-14,930+TW,y0-14,{stroke:MUTED,w:4})+label((530+930+TW)/2,y0-22,'fixed rules, no weights',{size:17,anchor:'middle',fill:MUTED,weight:700})));
 return `<div class="diagram-scroll"><svg class="plot wsvg" viewBox="0 0 1104 ${Math.ceil(y0+TH+64)}" style="overflow:hidden" role="img" aria-label="Photo, one pass of the CNN, 12,600 records, a box per cell, 31 boxes after the score filter, 4 objects after NMS">${g.join('')}</svg></div>`;})();
S_('dense-recap','nms','The dense answer, end to end',{builds:3,
 body:stack(pipeFig,at(3,p(`The output never changes shape. The score filter and NMS decide how many objects come out: here ${cand.kept.length}, for the crowd 11, for an empty wall 0.`))),
 lines:[`Photo in, one pass of the CNN and its head, and out come ${big(G.total)} records, the same number for every photo this size.`,
  'Fixed rules turn them into detections: decode every record into a box, drop the low scores, and remove duplicates with NMS.',
  'Only the CNN and head have learned weights. This is answer A to the lecture’s question: outputs tied to places, then one box per object.'],
 ask:['What comes out of the network for any photo?','Which steps cut the boxes down?','Which steps have learned weights?'],
 expected:[`${big(G.total)} records, one per cell, always.`,`The score filter (${cand.n_candidates} left), then NMS (${cand.kept.length} left).`,'Only the CNN and the head; decoding, filtering and NMS are fixed rules.'],
 transition:'The same pipeline in code.',source:YOLO_SRC});
// the whole detector in code, one line per click, with what each line does to the courtyard photo
const bestMap=(()=>{const m=Array.from({length:G.rows},()=>Array(G.cols).fill(0));for(const x of G.records)m[x[0]][x[1]]=x[7];return m;})();
const lCol=k=>k.name==='potted plant'?COL.amber:k.name==='cat'?COL.data:COL.guess;
const detFig=b=>courtyard(b===2?gridLines(W,H,32,{op:.6}):b===3?G.records.map(x=>rect([x[2],x[3],x[4],x[5]],{stroke:COL.guess,w:1.5,op:.35})).join(''):b===4?gridLines(W,H,32,{op:.35})+heat(bestMap,s32,{color:COL.guess,min:.02}):
 b===5?cand.candidates.map(k=>rect(k.box,{stroke:COL.guess,w:2.5})).join(''):b===6?cand.candidates.map(k=>rect(k.box,{stroke:lCol(k),w:2.5})).join(''):b>=7?cand.kept.map(k=>rect(k.box,{stroke:lCol(k),w:7})+(b===8?pill(k.box[0],k.box[1],`${short2(k.name)} ${num(k.score,3)}`,{fill:lCol(k),size:28,maxX:W}):'')).join(''):'',`What the detector holds after line ${b}`);
S_('detect-code','nms','The whole detector at test time, one line at a time',{builds:8,
 body:cols(`<div class="code-xs">${codeSteps([[1,'def detect(x, net):'],[2,'    y = net(x)[0][0]              # (84, 12600)'],[3,'    box = xyxy(y[:4].T)           # (12600, 4)'],
   [4,'    score, label = y[4:].max(0)   # (12600,)'],[5,`    k = score >= 0.25             # ${cand.n_candidates} True`],[6,'    box, score, label = box[k], score[k], label[k]'],
   [7,`    k = batched_nms(box, score, label, 0.7)  # ${cand.kept.length}`],[8,'    return box[k], score[k], label[k]']])}</div>`,
  `<div class="state-slot">${[1,2,3,4,5,6,7,8].map(b=>`<div data-only="${b}">${detFig(b)}</div>`).join('')}</div>`,'1.1fr 1fr'),
 lines:['Parts 5 and 6 in one function. x is the photo as a tensor, and net is the trained YOLOv8n.',
  `One pass of the network: 84 numbers for each of the ${big(G.total)} cells, whatever the photo shows.`,
  `Turn each cell’s centre and size into corners: ${big(G.total)} boxes, one per cell. Our grid’s 600 are drawn.`,
  'For each cell, its best class and that class’s score. The scores are high only near the animals and the plants.',
  `A mask of the cells whose best score is at least 0.25: ${cand.n_candidates} of ${big(G.total)}.`,
  `Keep those rows only: ${cand.n_candidates} boxes, each with its score and its class.`,
  `NMS within each class: ${cand.kept.length} boxes remain, one per object.`,
  'Return them: the four detections of the lecture’s first slide. No line depends on how many objects there are.'],
 ask:['What are the inputs?','What shape is y?','What does xyxy do?','What does max(0) return?','How many cells pass the mask?','Why index box, score and label with the same mask?','Why batched_nms rather than nms?','Which lines decide how many objects come back?'],
 expected:['The photo tensor and the trained network.',`(84, ${big(G.total)}): 84 numbers per cell.`,'It turns (c_x, c_y, w, h) into corners (x₁, y₁, x₂, y₂).','For each cell, its largest class score and the index of that class.',String(cand.n_candidates),'So each kept box keeps its own score and class.','It runs NMS separately for each class, so a person never removes their bicycle.','The score mask and batched_nms.'],
 point:'xyxy is torchvision.ops.box_convert(b, "cxcywh", "xyxy"); batched_nms is torchvision.ops.batched_nms. Ultralytics’ own post-processing does the same steps (checked in scripts/science.py).',
 demo:'Notebook part 6 runs this function on the courtyard photo.',
 transition:'Part 6 in one slide.',source:YOLO_SRC});
recap(6,'nms',['Neighbouring cells see the same object, so each object gets about ten confident boxes.',`NMS keeps the best box and deletes boxes of its class with IoU above 0.7, then repeats: ${cand.n_candidates} boxes became ${cand.kept.length}.`],
 'small and large objects: three grids.',
 {flow:chart([{steps:[{t:'boxes, sorted\nby score'},{t:'keep the\ntop box',hi:1},{t:'delete same-class\nboxes, IoU > 0.7'},{t:'any boxes\nleft?'},{t:'one box\nper object'}]}],{loop:[0,3,1,'yes: repeat with the rest'],out:[0,4,'no'],alt:'Non-maximum suppression as a loop: sort, keep the top box, delete its same-class overlaps, repeat while boxes are left'}),
  ask:'Why does NMS repeat instead of keeping only the single best box?',expected:'There may be several objects; each round keeps the best box of one of them.',transition:'Part 7.'});
// ================================================================================================ Part 7
partBreak(7,'scales','Small and large objects: three grids',`A 32-pixel cell is coarse for a person ${farPed[2]-farPed[0]} pixels wide. YOLOv8 predicts from three grids at once.`,[
 'See the range of sizes in one street photo, now with the grid.',`Count the cells of the three grids: where ${big(G.total)} came from, and which grid found each object.`,'Boxes that turn: when an axis-aligned box is not enough.'],
 {line:'YOLOv8 uses three grids with different cell sizes, and every cell writes the same record.',ask:`What could go wrong for a ${farPed[2]-farPed[0]}-pixel-wide person on a 32-pixel grid?`,expected:'It is under half a cell; two such people could share one cell, and one cell must describe both.',transition:'Sizes in one photo.'});
chap('7.1');
const SC=S.levels.scale,busCells=Math.round((bus[2]-bus[0])/32),ratio=Math.round((bus[2]-bus[0])/(farPed[2]-farPed[0]));
S_('sizes','scales','Part 1’s street again, with the 32-pixel grid',{builds:2,
 body:cols(photo('scale',W2,H2,gtBox(bus,`bus · ${bus[2]-bus[0]} px wide`,{size:30})+gtBox(cyc,'',{w:4})+pill(cyc[0],cyc[1],`${cyc[2]-cyc[0]} px`,{fill:COL.target,size:28})+gtBox(farPed,'',{w:4})+pill(farPed[0]-4,farPed[1],`${farPed[2]-farPed[0]} px`,{fill:COL.target,size:28,anchor:'end'})+gat(2,gridLines(W2,H2,32,{op:.6})),'A bus, a cyclist and a far pedestrian',{view:[220,150,1060,470]}),
  stack(p(`The bus is ${bus[2]-bus[0]} px wide; the cyclist ${cyc[2]-cyc[0]} px; the far pedestrian ${farPed[2]-farPed[0]} px.`),at(2,p('On a 32-px grid the pedestrian is under half a cell.'))),'1.5fr 1fr'),
 lines:['Part 1’s street again: a bus, a cyclist and a far pedestrian.',`Draw the 32-px grid. The bus spans about ${busCells} cells; the pedestrian sits inside one. A coarse grid suits big objects; small ones need finer cells.`],
 ask:['How many times wider is the bus than the far pedestrian?','What is the problem for small objects on a coarse grid?'],
 expected:[`About ${ratio} times.`,'A cell may contain several small objects but writes one record; and its features are dominated by a large surrounding region.'],
 transition:'Three grids.',source:PHOTO_SRC});
const tri=(n,s,W_,H_)=>`${n}: ${W_/s} × ${H_/s} = ${big(W_*H_/s/s)}`;
S_('three-grids','scales','Three grids: cells of 8, 16 and 32 pixels',{builds:2,
 body:`<div class="table-sm">${table(['grid (cell size)','courtyard, 960 × 640','street, 1280 × 704','built from'],[
   ['8 px',`120 × 80 = ${big(9600)}`,`160 × 88 = ${big(14080)}`,'early layers: sharp, local'],
   ['16 px',`60 × 40 = ${big(2400)}`,`80 × 44 = ${big(3520)}`,'middle layers'],
   ['32 px',`30 × 20 = ${big(600)}`,`40 × 22 = ${big(880)}`,'deep layers: wide view'],
   ['<b>all</b>',at(2,`<b>${big(12600)}</b>`),at(2,`<b>${big(18480)}</b>`),'']])}</div>`,
 lines:['YOLOv8 reads three feature maps from different depths of the CNN: cells of 8, 16 and 32 pixels. Every cell writes the same 84-number record.','Add them up: 12,600 for the courtyard, the number we decoded in Part 5. A bigger photo gets more cells: 18,480 for the street.'],
 ask:['How many cells does the 8-px grid have for the courtyard?','Where did 12,600 come from?'],
 expected:['120 × 80 = 9,600.','9,600 + 2,400 + 600.'],
 point:'Why not use only the fine grid? Its cells come from early layers whose features see only a small region: too little context for large objects. Feature pyramids (FPN, 2017) mix deep and early features so that even the fine grid knows what it is looking at.',
 transition:'Which grid found what?'});
const strideCol={8:COL.loss,16:COL.amber,32:COL.guess};
S_('which-grid','scales','Which grid found each object? The real answer',{builds:2,
 body:cols(photo('scale',W2,H2,SC.map(k=>prBox(k.box,`${k.stride} px`,{size:26,w:4,fill:strideCol[k.stride]})).join(''),'Each final detection coloured by the grid that produced it',{view:[220,150,1060,470]}),
  stack(`<div class="table-sm tight">${table(['object','grid'],SC.map(k=>[k.name,`<span style="color:${strideCol[k.stride]};font-weight:650">${k.stride} px</span>`]))}</div>`,at(2,small('Street photo: dog and near person from 32 px; car, cyclist and bicycle from 16 px; the far person from 8 px.'))),'1.5fr 1fr'),
 lines:['After NMS, look up which grid each kept box came from: the bus from 32 px, the cyclist from 16 px, the far pedestrian from 8 px.','The street photo agrees: large from coarse, small from fine. Training assigns each object to cells whose grid suits its size.'],
 ask:['Which grid found the bus? The far pedestrian?','Who decided this?'],
 expected:['32 px; 8 px.','Training: an object’s positive cells are chosen where its box fits best, which for small objects is the fine grid.'],
 transition:'Boxes that turn.',source:YOLO_SRC});
chap('7.2');
// axis-aligned against oriented boxes: the slanted crack on the part, then long ships moored side by side
const OB=S.obb,CK=OB.crack,crackView=[548,118,140,126];
const poly=(pts,{stroke=COL.guess,w=3,fill='none',op=0,dash=''}={})=>`<polygon points="${pts.map(q=>q.join(',')).join(' ')}" fill="${fill}" fill-opacity="${op}" stroke="${stroke}" stroke-width="${w}"${dash?` stroke-dasharray="${dash}"`:''}/>`;
S_('obb-crack','scales','Boxes that turn: axis-aligned or oriented?',{builds:3,
 body:cols(photo('defect',W2,H2,rect(CK.aabb,{stroke:COL.target,w:1.4})+gat(2,poly(CK.corners,{stroke:COL.guess,w:1.4,fill:COL.guess,op:.07})),'The crack on the part: the axis-aligned box around it, then an oriented box that turns with it',{view:crackView}),
  stack(`<div class="eq-sm">${eq(R`\text{axis-aligned: }(x_1,y_1,x_2,y_2)=(${CK.aabb.join(',')})`)}</div>`,
   at(2,`<div class="eq-sm">${eq(R`\text{oriented: }(c_x,c_y,w,h,\theta)=(${CK.cx},${CK.cy},${CK.w},${CK.h},${CK.deg}^\circ)`)}</div>`),
   at(3,`<div class="eq-sm">${eq(R`\frac{${CK.aabb[2]-CK.aabb[0]}\times${CK.aabb[3]-CK.aabb[1]}}{${CK.w}\times${CK.h}}\approx${num(CK.ratio,1)},\qquad\mathrm{IoU}\approx${num(CK.iou,2)}`)}</div>`)),'1fr 1.1fr'),
 lines:['Every box so far had its edges parallel to the photo’s sides: an axis-aligned box, four numbers. Around this thin, slanted crack it is mostly metal.',
  'An oriented box adds one number, the angle θ: (c_x, c_y, w, h, θ). It turns with the crack and hugs it.',
  `The axis-aligned box is ${num(CK.ratio,1)} times bigger: about ${Math.round(100*(1-1/CK.ratio))}% of it is not crack. The two boxes’ IoU is only ${num(CK.iou,2)}.`],
 ask:['How much of the axis-aligned box is crack?','How many numbers does an oriented box need?','When does the angle not matter?'],
 expected:[`About 1/${num(CK.ratio,1)} of it; the rest is metal.`,'Five: the centre, the width, the height and the angle.','When objects are upright, like our cat and dog: their axis-aligned boxes are already tight.'],
 point:`Our oriented box for the crack: centre (${CK.cx}, ${CK.cy}), ${CK.w} × ${CK.h} pixels at ${CK.deg}°; the axis-aligned box is the tightest one around its corners. Part 1’s hand-drawn box, (578, 142, 668, 214), is a little looser. Oriented boxes are also written as their four corners, eight numbers, as in the DOTA aerial data set.`,
 transition:'Where the angle really matters: packed, slanted objects.',source:'Our oriented box on the course-owned photo (see SOURCES.md).'});
const SHP=OB.ships,shipI=SHP.aabb[0],shipJ=SHP.aabb[1],shipOv=[shipJ[0],Math.max(shipI[1],shipJ[1]),shipI[2],Math.min(shipI[3],shipJ[3])];
const shipFig=fig(470,330,`<rect x="0" y="0" width="470" height="330" fill="#DCE7EE"/>`+SHP.corners.map(q=>poly(q,{stroke:'#5B6670',w:2,fill:'#8C99A6',op:.9})).join('')+
 gat(1,SHP.corners.map(q=>poly(q,{stroke:COL.guess,w:4})).join(''))+gat(2,rect(shipOv,{stroke:'none',w:0,fill:COL.loss,op:.3})+SHP.aabb.map(b=>rect(b,{stroke:COL.target,w:3,dash:'12 8'})).join('')),
 'Four long ships side by side at 45 degrees: their oriented boxes do not touch; their axis-aligned boxes overlap heavily');
S_('obb-ships','scales','Packed, slanted objects need the angle',{builds:3,
 body:cols(shipFig,stack(`<div class="eq-sm">${eq(R`\mathrm{IoU}(\text{oriented boxes})=${num(SHP.iou_obb,0)}`)}</div>`,
   at(2,`<div class="eq-sm">${eq(R`\mathrm{IoU}(\text{axis-aligned boxes})\approx${num(SHP.iou_aabb,2)}`)}</div>`),
   at(3,`<div class="eq-sm">${eq(R`\text{YOLOv8-OBB, per cell: }(c_x,c_y,w,h,\theta)`)}</div>`)),'1fr 1.1fr'),
 lines:['Seen from above, four ships moored side by side at 45°. Their oriented boxes do not touch: IoU 0 between neighbours.',
  `Their axis-aligned boxes overlap a lot: IoU ${num(SHP.iou_aabb,2)} between neighbours. NMS at 0.5 would keep one ship and delete the next as a duplicate.`,
  'So detectors for aerial photos, scene text and documents predict the angle too: YOLOv8-OBB writes (c_x, c_y, w, h, θ) for every cell.'],
 ask:['Do the ships overlap?','Why do their axis-aligned boxes overlap?','What must change in IoU and NMS for oriented boxes?'],
 expected:['No: a strip of water separates them, and their oriented boxes do not touch.','Each slanted ship needs a big square box, which reaches over its neighbours.','IoU becomes the area of the overlap of two rotated rectangles, a polygon, over their union; NMS then uses that IoU.'],
 point:'The ships are drawn shapes, 280 × 40 pixels, 64 pixels apart along the quay; the IoUs are computed exactly (scripts/science.py). Oriented boxes bring their own trouble: 0° and 180° are the same box, and a 90° turn swaps w and h, so the loss must allow for that. DOTA (aerial images) and ICDAR (scene text) are the usual benchmarks.',
 transition:'Part 7 in one slide.'});
recap(7,'scales',[`One grid cannot suit a ${bus[2]-bus[0]}-px bus and a ${farPed[2]-farPed[0]}-px pedestrian.`,`YOLOv8 predicts from grids of 8, 16 and 32-px cells: ${big(G.total)} records.`,'Every cell writes the same 84-number record; NMS runs on all of them.','Small objects come from the fine grid, large ones from the coarse.','Slanted, packed objects need an oriented box: (c_x, c_y, w, h, θ).'],
 'measure how good the detections are.',
 {flow:chart([{steps:[{t:'photo'},{t:'CNN'},{t:'grids of 8,\n16 and 32 px',hi:1},{t:`${big(G.total)} records`},{t:'score filter,\nthen NMS'}]}],{alt:'Three grids: photo, CNN, grids of 8, 16 and 32 pixels, all their records, then the score filter and NMS'}),
  ask:'Which grid would you expect to find Part 1’s small bird?',expected:`The finest, 8 px: its best box did come from a stride-${S.bird.best.stride} cell.`,transition:'Part 8.'});

// ================================================================================================ Part 8
partBreak(8,'eval','Measuring a detector','Compare the detector’s boxes with the annotation: which are right, which are wrong, what was missed. Then summarise it all in one number.',[
 'A teaching example, five dogs and eight boxes: judge each box TP or FP, and find the misses, FN.','Precision and recall at one score threshold; move the threshold and watch both change, live.','Every threshold at once: the precision–recall curve and its area, AP; then stricter IoU, and mAP.'],
 {line:'We judge a detector against an annotation, box by box, then summarise.',ask:'A detector returned 8 boxes for 5 dogs. Is that good?',expected:'It depends: how many of the 5 dogs are among them, and how many of the 8 boxes are wrong?',transition:'A teaching example.'});
chap('8.1');
// a teaching example (data/dog-park.json): five annotated dogs and eight made-up boxes whose scores interleave right and wrong
const TE=S.teach,teD=TE.dets,teN=TE.gt.length,TE_SRC='A photo generated for these slides (SOURCES.md); our dog boxes; the eight detections are made up for teaching (data/dog-park.json).';
const tePhoto=(inner,alt,o={})=>photo('dog-park',TE.size[0],TE.size[1],inner,alt,{view:TE.view,...o});
const teBest=i=>{const row=TE.iou[i],v=Math.max(...row);return {v,j:row.indexOf(v)};};
const teWhy=i=>{const {v,j}=teBest(i),d=TE.gt[j].id;return TE.hit[i]?`finds dog ${d}`:v>0?`under 0.5 (dog ${d})`:`no dog (${teD[i].what.replace('the ','')})`;};
const teIoU=i=>{const {v}=teBest(i);return v>0?num(v,2):'0';};
const teVerdict=i=>TE.hit[i]?'<span class="hit">TP</span>':'<span class="miss">FP</span>';
S_('eval-setup','eval','A teaching example: five dogs, eight boxes',{builds:2,
 body:cols(`<div class="state-slot"><div data-only="1">${tePhoto(teachSVG(TE,{upto:0}),'Five annotated dogs, A to E')}</div><div data-only="2">${tePhoto(teachSVG(TE,{judge:false}),'The five dogs and the eight boxes of a made-up detector, each with its rank and score')}</div></div>`,
  `<div class="state-slot">${only(1,`<div class="table-sm xtight">${table(['dog','what'],TE.gt.map(g=>[g.id,g.name]))}</div>`)}${only(2,stack(`<div class="table-sm xtight">${table(['box','score'],teD.map(d=>[`#${d.rank}`,num(d.score,2)]))}</div>`,small('Sorted by score, highest first.')))}</div>`,'1.6fr 1fr'),
 lines:['A teaching example. The annotation: five dogs, A to E, each with a box drawn by a person. Dog E is the small one far away, by the tree.',
  'A detector returned eight boxes, each with a dog score, sorted from 0.95 down to 0.20. Which of them are right?'],
 ask:['How many dogs are annotated?','How many boxes did the detector return?'],
 expected:['Five: A to E.','Eight, each with a score.'],
 point:'The dog boxes are ours (YOLOv8l proposals checked by eye). The eight detections are invented so that every kind of mistake appears once or twice. Real detections on real photos, with the same rules, are in Appendix B.',
 transition:'When is a box right?',source:TE_SRC});
// the rule on two boxes: #1 on dog B passes the IoU test; #6 holds dog D but is far too big, and fails it
const bV=[440,185,370,300],bF=fsz(bV,21,560),dzV=[880,330,440,370],dzF=fsz(dzV,21,560),teB=TE.gt[1].box,teDg=TE.gt[3].box;
S_('tp-rule','eval','When is a box right? IoU ≥ 0.5 with a dog',{builds:2,
 body:cols(`<div class="state-slot"><div data-only="1">${tePhoto(gtBox(teB,'',{w:2.5,dash:'8 5'})+rect(teD[0].box,{stroke:COL.green,w:4})+pill(teD[0].box[0],teD[0].box[1],`#1 TP, IoU ${num(TE.iou[0][1],2)}`,{fill:COL.green,size:bF}),'Dog B with box 1: IoU 0.88, a true positive',{view:bV})}</div>`+
   `<div data-only="2">${tePhoto(gtBox(teDg,'',{w:2.5,dash:'8 5'})+rect(teD[5].box,{stroke:COL.loss,w:4})+pill(teD[5].box[0],teD[5].box[1],`#6 FP, IoU ${num(TE.iou[5][3],2)}`,{fill:COL.loss,size:dzF}),'Dog D with box 6, far too big: IoU 0.40, a false positive',{view:dzV})}</div></div>`,
  `<ol class="steps algo"><li>Go through the boxes in score order.</li><li>A box is a <b>true positive (TP)</b> if its IoU with a dog is at least 0.5. That dog is found.</li><li data-at="2">Every other box is a <b>false positive (FP)</b>.</li></ol>`,'0.95fr 1.05fr'),
 lines:[`Go through the boxes in score order. Box #1 overlaps dog B with IoU ${num(TE.iou[0][1],2)}, at least 0.5: a true positive (TP). Dog B is found.`,
  `Box #6 holds dog D, but it is far too big: IoU ${num(TE.iou[5][3],2)}, below 0.5. A false positive (FP), however close it is to a dog.`],
 ask:['Why is box #1 a true positive?','Box #6 contains dog D. Why is it a false positive?'],
 expected:['Its IoU with dog B is 0.88, at least 0.5.','Its IoU with D is only 0.40: the box is so much bigger than the dog that the union swamps the overlap.'],
 point:'IoU ≥ 0.5 is the usual rule (Pascal VOC, and COCO’s AP50); 8.4 makes it stricter. Each dog can be found only once: if a second box ever landed on a dog already found, it would also count as a false positive, but NMS (Part 6) removes nearly all such duplicates before we measure. This is a third kind of matching, after training assignment and NMS: predictions against annotations.',
 transition:'Now every box, in order.',source:TE_SRC});
S_('eval-walk','eval','Judge every box, in score order',{builds:8,
 body:cols(`<div class="state-slot">${teD.map((d,i)=>`<div data-only="${i+1}">${tePhoto(teachSVG(TE,{upto:i+1,current:i}),`Boxes 1 to ${i+1} judged`)}</div>`).join('')}</div>`,
  `<div class="table-sm xtight">${table(['box','score','IoU','','why'],teD.map((d,i)=>[`#${d.rank}`,num(d.score,2),at(i+1,teIoU(i)),at(i+1,teVerdict(i)),at(i+1,teWhy(i))]))}</div>`,'1.4fr 1fr'),
 lines:[`Box #1, score 0.95: IoU ${num(TE.iou[0][1],2)} with dog B, at least 0.5. A true positive: B is found.`,
  `#2, 0.90: IoU ${num(TE.iou[1][0],2)} with dog A. A true positive: A is found.`,
  '#3, 0.80: it sits on the bag. IoU 0 with every dog: a false positive, however sure the detector is.',
  `#4, 0.70: IoU ${num(TE.iou[3][2],2)} with dog C. A true positive.`,
  '#5, 0.60: the bench. IoU 0 with every dog: another false positive.',
  `#6, 0.45: it holds dog D but is far too big, IoU ${num(TE.iou[5][3],2)}. Below 0.5, so a false positive, and D is not found yet.`,
  `#7, 0.35: IoU ${num(TE.iou[6][3],2)} with D, at least 0.5. A true positive: D is found.`,
  '#8, 0.20: a bush. A false positive. In all: 4 true positives and 4 false positives.'],
 ask:['Which dog does box #1 find?','And #2?','Why is #3 wrong, though it scores 0.80?','And #4?','Why is #5 wrong?','#6 contains dog D. Why is it wrong?','Why is #7 right, after #6 failed?','How many TP and FP in all?'],
 expected:['Dog B: IoU 0.88.','Dog A, IoU 0.81.','It is on the bag: IoU 0 with every dog. A high score does not make a box right.','Dog C, IoU 0.76.','It is on the bench: IoU 0 with every dog.','Its IoU with D is 0.40, under 0.5: far too big a box.','Its IoU with D is 0.68, above 0.5.','4 TP (#1, #2, #4, #7) and 4 FP (#3, #5, #6, #8).'],
 transition:'What did the boxes miss?',source:TE_SRC});
S_('eval-fn','eval','What was missed: FN. And why there is no TN',{builds:2,
 body:cols(tePhoto(teachSVG(TE,{fn:true}),'All eight boxes judged; dog E, which no box found, marked as a false negative'),
  stack(`<div class="table-sm">${table(['','a dog there','no dog there'],[['box drawn','<span class="hit">TP 4</span>','<span class="miss">FP 4</span>'],['no box',`<span style="color:${COL.amber};font-weight:650">FN 1</span>`,at(2,'TN: not counted')]])}</div>`),'1.4fr 1fr'),
 lines:['Dog E, far away by the tree, got no box at all: a false negative (FN), a miss. In all, 4 TP, 4 FP and 1 FN.',
  'A true negative would be “no box, and no dog”: every empty patch of grass, endlessly many. Detection never counts them, so it uses precision and recall, not accuracy.'],
 ask:['Which dog is a false negative, and why?','Why can we not count true negatives?'],
 expected:['Dog E: no box found it.','“No dog, no box” holds for every empty place in the photo: there is no fixed number of them.'],
 point:'Dog D shows that a box near a dog is not enough: had #7 been missing, #6 alone would have left D a false negative, as well as being a false positive itself.',
 transition:'Turn the counts into two numbers.',source:TE_SRC});
chap('8.2');
const cAt=TE.cuts.at(-1),pn=v=>String(+(+v).toFixed(2));
const venn=()=>fig(800,380,
 `<circle cx="310" cy="215" r="150" fill="${COL.guess}" fill-opacity=".12" stroke="${COL.guess}" stroke-width="4"/><circle cx="490" cy="215" r="150" fill="${COL.target}" fill-opacity=".12" stroke="${COL.target}" stroke-width="4"/>`+
 label(250,40,'our 8 boxes',{size:30,fill:COL.guess,weight:700,anchor:'middle'})+label(550,40,'the 5 dogs',{size:30,fill:COL.target,weight:700,anchor:'middle'})+
 label(230,228,`FP ${cAt.fp}`,{size:40,fill:COL.loss,weight:700,anchor:'middle'})+label(400,228,`TP ${cAt.tp}`,{size:40,fill:COL.green,weight:700,anchor:'middle'})+label(570,228,`FN ${cAt.fn}`,{size:40,fill:COL.amber,weight:700,anchor:'middle'}),
 'Two overlapping circles: our boxes and the dogs really there; the overlap is the true positives');
S_('pr-def','eval','Precision and recall: two questions',{builds:2,
 body:cols(venn(),stack(eq(R`\text{precision}=\frac{\mathrm{TP}}{\mathrm{TP}+\mathrm{FP}}=\frac{${cAt.tp}}{${cAt.tp}+${cAt.fp}}=${pn(cAt.p)}`),small('Of the boxes we reported, how many are right?'),
  at(2,eq(R`\text{recall}=\frac{\mathrm{TP}}{\mathrm{TP}+\mathrm{FN}}=\frac{${cAt.tp}}{${cAt.tp}+${cAt.fn}}=${pn(cAt.r)}`)),at(2,small('Of the dogs really there, how many did we find?'))),'1.2fr 1fr'),
 lines:[`Precision looks at what we reported, the left circle: ${cAt.tp} of our ${cAt.kept} boxes are right, so precision is ${cAt.tp}/${cAt.kept} = ${pn(cAt.p)}.`,
  `Recall looks at what was really there, the right circle: we found ${cAt.tp} of the ${teN} dogs, so recall is ${cAt.tp}/${teN} = ${pn(cAt.r)}.`],
 ask:['What does precision divide by?','What does recall divide by?'],
 expected:['Everything reported: TP + FP, our 8 boxes.','Everything really there: TP + FN, the 5 dogs.'],
 misconception:'Neither alone is enough: a box on every patch of grass gives recall 1; one sure box gives precision 1.',
 transition:'Change the score threshold, and both change.',source:TE_SRC});
const cutRow=(c,b)=>[`≥ ${num(c.cut,2)}`,String(c.kept),String(c.tp),String(c.fp),String(c.fn),`${c.tp}/${c.kept} = ${pn(c.p)}`,`${c.tp}/${teN} = ${pn(c.r)}`].map(v=>at(b,v));
S_('pr-threshold','eval','Raise or lower the score threshold',{builds:3,
 body:stack(`<div class="state-slot">${TE.cuts.map((c,i)=>`<div data-only="${i+1}">${tePhoto(teachSVG(TE,{cut:c.cut,fn:true}),`Boxes kept at a score threshold of ${c.cut}, marked TP or FP; dogs missed marked FN`,{cls:'mid'})}</div>`).join('')}</div>`,
  `<div class="table-sm xtight">${table(['keep scores','kept','TP','FP','FN','precision','recall'],TE.cuts.map((c,i)=>cutRow(c,i+1)))}</div>`),
 lines:[`Keep only boxes scoring at least 0.85: #1 and #2, both right. Precision 2/2 = 1, but recall only 2/5 = 0.4: dogs C, D and E are missed.`,
  'Lower it to 0.5: five boxes, three right. Precision 3/5 = 0.6, recall 3/5 = 0.6. More dogs found, and more mistakes made.',
  'Lower it to 0.1: all eight boxes. Recall rises to 4/5 = 0.8 and precision falls to 4/8 = 0.5. The threshold trades one for the other.'],
 ask:['What are precision and recall at 0.85?','What changes at 0.5?','Why can recall never reach 1 here?'],
 expected:['1 and 0.4: every kept box is right, but three dogs are missed.','Two more dogs could be found, but two wrong boxes come in: 0.6 and 0.6.','Dog E has no box at all; no threshold can find it.'],
 transition:'Try any threshold.',source:TE_SRC});
S_('pr-play','eval','Try it: move the threshold, watch TP, FP and FN',{builds:1,
 body:widget('pr-play','Move the score threshold and the IoU a box needs; boxes turn TP or FP, missed dogs turn FN, and precision, recall and the curve follow'),
 lines:['Move the score threshold: boxes appear and disappear, each marked TP or FP, missed dogs FN. Watch the point move along the precision–recall curve. Then ask for a stricter IoU.'],
 ask:['At which IoU does box #7 stop counting?'],expected:['At 0.70: its IoU with dog D is 0.68, so D becomes a miss and #7 a false positive.'],
 transition:'Every threshold at once: the curve.',source:TE_SRC});
chap('8.3');
// the curve: one row per rank, then one point per row; AP is the area under its envelope
const teC=TE.curve,f3=v=>num(v,2).replace(/\.?0+$/,'')||'0';
const teCurve=(k,{env=false,rects=false,W:pw=520,H:ph=400}={})=>{const P=panel({W:pw,H:ph,L:66,B:58,T:36,xMin:0,xMax:1,yMin:0,yMax:1.05,ticksX:[0,.2,.4,.6,.8,1],ticksY:[0,.5,1],xLabel:'recall',yLabel:'precision',fs:19});
 let s=P.axes;const pts=teC.slice(0,k);
 if(rects){let prev=0;teC.forEach((c,i)=>{if(c.r>prev){s+=`<rect x="${P.x(prev).toFixed(1)}" y="${P.y(TE.env[i]).toFixed(1)}" width="${(P.x(c.r)-P.x(prev)).toFixed(1)}" height="${(P.y(0)-P.y(TE.env[i])).toFixed(1)}" fill="${COL.guess}" fill-opacity=".16" stroke="${COL.guess}" stroke-width="1.5"/>`+label((P.x(prev)+P.x(c.r))/2,P.y(TE.env[i]/2)+7,f3(TE.env[i]),{size:18,anchor:'middle',fill:COL.ink,weight:650});prev=c.r;}});}
 if(k>1)s+=`<polyline points="${pts.map(c=>`${P.x(c.r).toFixed(1)},${P.y(c.p).toFixed(1)}`).join(' ')}" fill="none" stroke="${COL.guess}" stroke-width="${env?2:3}"${env?' stroke-dasharray="6 5"':''}/>`;
 if(env){const e=[];let prev=0;teC.forEach((c,i)=>{if(c.r>prev){e.push([prev,TE.env[i]],[c.r,TE.env[i]]);prev=c.r;}});s+=`<polyline points="${e.map(([r,q])=>`${P.x(r).toFixed(1)},${P.y(q).toFixed(1)}`).join(' ')}" fill="none" stroke="${COL.guess}" stroke-width="4"/>`;}
 if(!env&&!rects)pts.forEach((c,i)=>{const under=!TE.hit[i]&&teC[i+1]&&teC[i+1].r===c.r,dy=TE.hit[i]?-10:under?6:27,dx=TE.hit[i]?12:under?-14:0;s+=`<circle cx="${P.x(c.r).toFixed(1)}" cy="${P.y(c.p).toFixed(1)}" r="8" fill="${TE.hit[i]?COL.green:COL.loss}" stroke="#fff" stroke-width="2"/>`+label(P.x(c.r)+dx,P.y(c.p)+dy,`#${i+1}`,{size:17,fill:COL.ink,anchor:TE.hit[i]?'start':under?'end':'middle',halo:true});});
 return fig(pw,ph,s,'Precision against recall for the eight ranked boxes');};
/** A table cell that shows a on the first click and b from the second, in the same place. */
const sw=(a,b)=>`<div class="state-slot">${only(1,a)}${only('2-3',b)}</div>`;
S_('pr-curve','eval','Every threshold at once: the precision–recall curve',{builds:3,
 body:cols(`<div class="table-sm xtight">${table(['box','score','',sw('TP so far','precision'),sw('FP so far','recall, ÷ 5')],teD.map((d,i)=>[`#${d.rank}`,num(d.score,2),teVerdict(i),sw(String(teC[i].tp),`${teC[i].tp}/${i+1} = ${num(teC[i].p,2)}`),sw(String(teC[i].fp),num(teC[i].r,1))]))}</div>`,
  `<div data-at="3">${teCurve(8)}</div>`,'1.15fr 1fr'),
 lines:['Every threshold at once: go down the boxes in score order and count the true and false positives so far.',
  `Precision at each row: TP so far ÷ boxes so far. Recall: TP so far ÷ ${teN} dogs. Each row is one threshold: keep the boxes down to it.`,
  'Plot each row as a point, recall across and precision up: the precision–recall curve. Lowering the threshold walks it right: more dogs, less precision.'],
 ask:['What are TP and FP after box #4?','Precision and recall after #4?','What does each point stand for?'],
 expected:['3 TP and 1 FP.',`3/4 = 0.75 and 3/5 = 0.6.`,'The detector with its threshold just below that box’s score.'],
 transition:'One number for the whole curve.',source:TE_SRC});
S_('ap-area','eval','Average precision: the area under the curve',{builds:3,
 body:cols(`<div class="state-slot"><div data-only="1">${teCurve(8,{env:true})}</div><div data-only="2-3">${teCurve(8,{env:true,rects:true})}</div></div>`,
  stack(p('First smooth the zig-zag: at each recall, take the best precision we can still reach further down the list. The curve now only steps down.'),
   at(2,`<div class="eq-sm">${eq(R`\mathrm{AP}=0.2\times1+0.2\times1+0.2\times0.75+0.2\times0.57`)}</div>`),
   at(3,`<div class="eq-sm">${eq(R`\mathrm{AP}\approx${num(TE.ap,2)}`)}</div>`)),'1fr 1fr'),
 lines:['Smooth the zig-zag: at each recall, take the best precision still reachable by lowering the threshold. That is the envelope, solid; the raw curve is dashed.',
  'Average precision (AP) is the area under it: four strips of recall 0.2, at heights 1, 1, 0.75 and 0.57.',
  `AP = 0.2 × (1 + 1 + 0.75 + 0.57) ≈ ${num(TE.ap,2)}. Recall never passes 0.8, because dog E has no box, so nothing is added beyond it.`],
 ask:['Why use the best precision at this recall or beyond?','What are the strips?','When would AP be 1?'],
 expected:['Nobody would pick a threshold whose precision is beaten by a lower threshold with more recall.','Each true positive adds 1/5 of recall: a strip 0.2 wide, as tall as the envelope there.','Only if every dog is found, and every true positive comes before every false positive.'],
 point:`This is the all-point area (Pascal VOC, 2010 onwards). COCO reads the envelope at 101 recall values instead: ${num(TE.ap_coco101,3)} here, nearly the same.`,
 transition:'The same computation in code.',source:TE_SRC});
const BY=S.benchmark.yolo,BD=S.benchmark.detr;
// AP in code on the eight ranked boxes, one line per click; the table fills in column by column
const widthR=teC.map((c,i)=>c.r-(i?teC[i-1].r:0));
const apRows=[[1,`hits = torch.tensor([${TE.hit.map(h=>h?1:0).join(',')}]).bool()`],[2,'tp = hits.cumsum(0)  # true positives so far'],[3,'fp = (~hits).cumsum(0)  # false positives so far'],
 [4,'p = tp / (tp + fp)  # precision'],[5,`r = tp / ${teN}  # recall: ${teN} dogs`],[6,'for i in range(len(p) - 2, -1, -1):'],[6,'    p[i] = max(p[i], p[i + 1])  # envelope'],
 [7,'w = r.diff(prepend=torch.zeros(1))  # widths'],[8,`ap = (w * p).sum()  # ${num(TE.ap,3)}`]];
const apTable=table(['box',at(1,'hit'),at(2,'tp'),at(3,'fp'),at(4,'p'),at(5,'r'),at(6,'envelope'),at(7,'w')],
 teD.map((d,i)=>[`#${d.rank}`,at(1,TE.hit[i]?'1':'0'),at(2,String(teC[i].tp)),at(3,String(teC[i].fp)),at(4,f3(teC[i].p)),at(5,f3(teC[i].r)),at(6,f3(TE.env[i])),at(7,f3(widthR[i]))]));
S_('ap-code','eval','AP in code, one line at a time',{builds:8,
 body:cols(`<div class="code-xs">${codeSteps(apRows)}</div>`,stack(`<div class="table-sm xtight">${apTable}</div>`,at(8,`<div class="eq-sm">${eq(R`\mathrm{AP}=0.2\,(1+1+0.75+0.57)\approx${num(TE.ap,2)}`)}</div>`)),'1.05fr 1fr'),
 lines:['AP in code, on the eight ranked boxes: write each one as a hit (1) or a miss (0), in score order.',
  'Count the true positives so far, row by row.','And the false positives so far.',
  'Precision at each row: the true positives over everything kept up to that row.',`Recall at each row: the true positives over the ${teN} dogs.`,
  'The envelope: walk up from the bottom and keep the best precision seen so far, so the curve only steps down.',
  'The recall each row adds: the width of its strip. Only the four hits add any.',
  `Multiply each width by its height and add: ${num(TE.ap,2)}, the area of the last slide.`],
 ask:['What goes into the computation?','What is tp after box #4?','What is fp after box #6?','What is the precision at box #3?','What is the recall at box #7?','Why walk from the bottom up?','Which rows add recall?','What is AP?'],
 expected:['Only the hits and misses, in score order, and the number of dogs.','3: boxes 1, 2 and 4 were hits.','3: boxes 3, 5 and 6 were misses.','2/3: two hits among three boxes.','4/5 = 0.8.',
  'So each row gets the best precision reachable at its recall or beyond.','Boxes 1, 2, 4 and 7, the hits.',num(TE.ap,2)],
 point:'The same function gives any AP in this lecture: only the hits list and the number of objects change.',
 transition:'Stricter IoU.',source:TE_SRC});
chap('8.4');
/** Bars of AP values, one per label, with an optional dashed line at their mean. */
const apBars=(vals,labs,{hi=-1,mean=null,md=3,W:bw0=640,H:bh0=190}={})=>{const n=vals.length,pw=bw0-110,bw=(pw-20)/n,h=bh0-64,y0=24,my=mean===null?0:y0+h-mean*h;
 let g=(mean===null?'':line(16,my,pw+6,my,{stroke:COL.ink,w:2,dash:'7 5'}))+vals.map((v,i)=>`<rect x="${(20+i*bw+5).toFixed(1)}" y="${(y0+h-v*h).toFixed(1)}" width="${(bw-10).toFixed(1)}" height="${(v*h).toFixed(1)}" fill="${i===hi?COL.guess:'#C9D0D7'}"/>`+
  label(20+i*bw+bw/2,y0+h-v*h-6,num(v,2),{size:15,anchor:'middle',fill:COL.ink,halo:true})+label(20+i*bw+bw/2,y0+h+24,labs[i],{size:16,anchor:'middle',fill:MUTED})).join('');
 if(mean!==null)g+=label(pw+12,my+6,`mean ${num(mean,md)}`,{size:16,fill:COL.ink,weight:650});
 return fig(bw0,bh0,g,'Bars of AP values');};
const dV=[950,360,350,330],dF=fsz(dV,21,420),teDd=TE.gt[3].box,i7=6;
const chips7=fig(620,100,TE.thresholds.map((th,i)=>{const ok=TE.iou[i7][3]>=th-1e-9,c=ok?COL.green:COL.loss;return `<rect x="${5+i*61}" y="6" width="55" height="44" rx="6" fill="${c}" fill-opacity=".16" stroke="${c}" stroke-width="2.5"/>`+
 label(5+i*61+27.5,35,ok?'TP':'FP',{size:19,anchor:'middle',fill:c,weight:700})+label(5+i*61+27.5,80,num(th).replace(/^0/,''),{size:17,anchor:'middle',fill:COL.ink});}).join(''),
 'Box 7 is a true positive at IoU thresholds up to 0.65 and a false positive from 0.70');
S_('map-iou','eval','Stricter IoU: AP at ten thresholds',{builds:3,
 body:cols(tePhoto(gtBox(teDd,'',{w:3,dash:'10 6'})+rect(teD[i7].box,{stroke:COL.guess,w:4})+pill(teD[i7].box[0],teD[i7].box[1],`#7, IoU ${num(TE.iou[i7][3],2)}`,{fill:COL.guess,size:dF}),'Dog D with box 7, which overlaps it with IoU 0.68',{view:dV}),
  `<div class="state-slot">${only(1,stack(`<div class="eq-sm">${eq(R`\mathrm{IoU}(\#7,\ \text{dog D})\approx${num(TE.iou[i7][3],2)}`)}</div>`,chips7))}`+
  `${only('2-3',stack(apBars(TE.ap_by,TE.thresholds.map(th=>num(th).replace(/^0/,'')),{mean:TE.ap_mean,md:2}),at(3,`<div class="eq-sm">${eq(R`\mathrm{AP}_{[.5:.95]}=\tfrac1{10}\sum_t\mathrm{AP}_t\approx${num(TE.ap_mean,2)}`)}</div>`)))}</div>`,'0.62fr 1.38fr'),
 lines:[`Box #7 overlaps dog D with IoU ${num(TE.iou[i7][3],2)}: a true positive if we ask for 0.5, a false positive from 0.7 up, and then D is a miss.`,
  `Recompute AP at each of COCO’s ten IoU thresholds, 0.5 to 0.95. Loose boxes stop counting one by one, and AP falls from ${num(TE.ap_by[0],2)} to 0.`,
  `COCO’s headline AP is the average of the ten: ${num(TE.ap_mean,2)}. AP50, ${num(TE.ap_by[0],2)}, asks only for rough boxes; the average rewards tight ones.`],
 ask:['At which thresholds is box #7 a true positive?','Why does AP fall as the threshold rises?','What does averaging over thresholds reward?'],
 expected:['0.50 to 0.65: its IoU, 0.68, is at least those.','Boxes whose IoU is below the threshold turn into false positives, and their dogs into misses.','Tight boxes: a box that is only roughly right counts at 0.5 but not at 0.9.'],
 point:`AP50 = ${num(TE.ap_by[0],2)} and AP75 = ${num(TE.ap_by[5],2)} here. The mean is taken over the unrounded APs, ${num(TE.ap_mean,3)} ≈ ${num(TE.ap_mean,2)}; the rounded bars average ${num(TE.ap_by.reduce((a,b)=>a+b,0)/TE.ap_by.length,3)}. COCO calls the average AP (or AP@[.50:.95]); it also reports AP for small, medium and large objects. A real 13-pixel pedestrian, a pixel off, is in Appendix B.`,
 transition:'More than one class: mAP.',source:TE_SRC});
const clsAP=Object.entries(BY.per_class).sort((a,b)=>b[1].ap-a[1].ap);
S_('map','eval','mAP: average the AP over the classes',{builds:3,
 body:cols(stack(apBars(clsAP.map(([,v])=>v.ap),clsAP.map(([k])=>k),{mean:BY.map}),`<div class="eq-sm">${eq(R`\mathrm{mAP}=\frac1C\sum_{c=1}^{C}\mathrm{AP}_c=${num(BY.map,3)}`)}</div>`),
  stack(at(2,`<div class="eq-sm">${eq(R`\text{IoU }0.5\text{ only: every class }1,\ \ \mathrm{mAP}_{50}=${num(BY.map50,3)}`)}</div>`),
   at(3,`<div class="table-sm xtight">${table(['YOLOv8n','mAP@0.5','AP@[.5:.95]'],[[`our 8 photos, 7 classes, ${S.benchmark.n_gt} objects`,num(BY.map50,3),num(BY.map,3)],['COCO validation, 5,000 photos, 80 classes (published)','not given','0.373']])}</div>`)),'1.15fr 1fr'),
 lines:[`One AP per class, then their mean: mAP. YOLOv8n on our eight photos ranges from ${num(clsAP.at(-1)[1].ap,2)} for bicycles to 1 for buses and cars: mAP ${num(BY.map,3)}.`,
  `At IoU 0.5 alone every class scores 1, so mAP@0.5 is ${num(BY.map50,3)}. On clean photos only the strict average tells detectors apart.`,
  'COCO’s 5,000 cluttered photos and 80 classes give YOLOv8n 0.373. Our handful of clean photos is a sanity check, not a benchmark.'],
 ask:['What does mAP average over?','Why is mAP@0.5 exactly 1 here?','Why is COCO’s number so much lower than ours?'],
 expected:['Classes (and, for COCO, also the ten IoU thresholds).','Every object of every class is found, ranked above every false box, with IoU above 0.5.','COCO has 80 classes and crowded, cluttered, small objects; our eight photos are clean and easy. A handful of photos is not a benchmark.'],
 point:'Our numbers come from our own evaluator (scripts/science.py) on our annotations; the COCO number is from the Ultralytics YOLOv8 documentation. DETR on the same photos: Appendix A.',
 transition:'In code.',source:'Our evaluator on data/annotations.json; COCO number: Ultralytics YOLOv8 documentation.'});
S_('eval-code','eval','Evaluation in code',{builds:1,
 body:`<div class="code-sm">`+code(`from torchmetrics.detection import MeanAveragePrecision
metric = MeanAveragePrecision(iou_type="bbox")
metric.update(preds=[{"boxes": boxes, "scores": scores, "labels": labels}],
              target=[{"boxes": gt_boxes, "labels": gt_labels}])
res = metric.compute()          # res["map"] = AP@[.5:.95], res["map_50"] = AP@0.5`)+'</div>',
 lines:['Libraries do the matching, ranking and averaging. The notebook also has a twenty-line version that reproduces the walk-through.'],
 ask:['Which number is COCO’s headline “AP”?'],expected:['map: the mean over IoU 0.5 to 0.95 and over classes.'],
 demo:'Notebook part 8 evaluates YOLOv8n on the eight photos with the hand-written evaluator.',
 transition:'Three uses of IoU.'});

S_('iou-uses','eval','Three uses of IoU, easy to confuse',{builds:3,
 body:`<div class="table-sm">${table(['IoU used for','pairs','when'],[['assignment','cells ↔ annotated objects','training'],['NMS','predictions ↔ predictions','test time'],['evaluation','predictions ↔ annotated objects','measuring']].map((r,i)=>r.map(c=>at(i+1,c))))}</div>`,
 lines:['Training: pair cells with annotated objects. YOLOv8 ranks the cells by how well their boxes fit, measured with IoU.','Test time: NMS compares predictions with each other. Overlap above 0.7 means a duplicate.','Measuring: a detection is right if its IoU with an annotation is at least 0.5. All three pairings use the same measure.'],
 ask:['What does IoU pair up in training?','In NMS?','In evaluation?'],
 expected:['Cells, through their predicted boxes, with annotated objects.','Predictions with predictions.','Predictions with annotated objects.'],
 point:'Only assignment and evaluation use the annotations; NMS sees predictions only.',
 transition:'Part 8 in one slide.'});
recap(8,'eval',['A box is a TP if its IoU with an object is at least 0.5; every other box is an FP; every object no box found is an FN. There are no TNs.',
 'Precision TP/(TP + FP) and recall TP/(TP + FN) trade off as the score threshold moves; the PR curve shows every threshold, and AP is its area.'],
 'the whole lecture, in one picture.',
 {flow:chart([{steps:[{t:'boxes, sorted\nby score'},{t:'IoU ≥ 0.5 with\nan object?'},{t:'yes: TP\nno: FP',hi:1},{t:'objects never\nfound: FN'},{t:'precision,\nrecall'},{t:'PR curve,\nAP, mAP'}]}],{fs:19,alt:'Evaluation in steps: boxes by score, the IoU test, TP or FP, unclaimed objects as FN, precision and recall, then the PR curve, AP and mAP'}),
  ask:'Why does detection use precision and recall instead of accuracy?',expected:'Accuracy needs true negatives, and “no object, no box” has no fixed count.',transition:'The whole lecture.'});

// ================================================================================================ wrap-up
chap('9.1');
S_('pipeline','wrap','The whole lecture, as one flowchart',{builds:3,
 body:chart([{name:'training: learn from photos people have boxed',steps:[{t:'photos with\npeople’s boxes'},{t:'ground-truth\ntable',n:'5.2'},{t:'network’s\ntable',n:'5.3'},{t:'loss, cell\nby cell',n:'4 · 5.3'},{t:'adjust\nthe weights'}]},
  {name:'test time: find the objects in a new photo',at:2,steps:[{t:'new photo'},{t:'network: three\ngrids of cells',n:'5.3 · 7'},{t:'box + scores\nin every cell',n:'5.4'},{t:'keep scores\n≥ 0.25',n:'5.4'},{t:'NMS: one box\nper object',n:'6 · IoU, 3'},{t:'detections'}]},
  {name:'measuring: compare with an annotation',at:3,steps:[{t:'detections vs\nannotations'},{t:'IoU ≥ 0.5 match:\nTP, FP, FN',n:'8.1'},{t:'precision,\nrecall',n:'8.2'},{t:'PR curve,\nAP',n:'8.3'},{t:'mean over\nclasses: mAP',n:'8.4'}]}],{fs:18,bh:80,gy:20,alt:'The lecture as three rows: training from boxed photos to the loss; test time from a new photo to detections; measuring from detections to mAP'}),
 lines:['Training: people box objects in photos; each box’s centre picks a cell; the network learns to write the same table, cell by cell.',
  'Test time: one pass writes a box and scores in every cell of three grids; the score filter and NMS leave one box per object.',
  'Measuring: match the detections to an annotation by IoU, count TP, FP and FN, and summarise them as precision, recall, AP and mAP.'],
 ask:['Where do the training targets come from?','Where is the number of detections decided?','What does the measuring row need that test time does not?'],
 expected:['From people’s boxes: each box’s centre picks a cell, which gets the box in its units (5.2).','After the network: the score filter and NMS.','An annotation of the test photos, to match the detections against.'],
 point:'The notes under each step say where the lecture covered it. Appendix A gives DETR, which replaces the score filter and NMS by matching a fixed set of slots to objects.',
 transition:'The lecture in one slide.'});
S_('summary','wrap','The lecture in one slide',{builds:1,
 body:stack(p('<b>The question:</b> a network’s output has a fixed shape; detection needs a list of any length.'),
  `<div class="sum3"><div class="st"><h3>Train</h3><ul><li>People draw boxes.</li><li>Each centre picks a cell, which gets the box and class.</li><li>Loss: the network’s table against it.</li></ul></div>`+
  `<div class="sd"><h3>Detect</h3><ul><li>Every cell of three grids writes a box and scores.</li><li>Keep scores ≥ 0.25.</li><li>NMS removes duplicates.</li></ul></div>`+
  `<div class="sm"><h3>Measure</h3><ul><li>IoU ≥ 0.5 with an object: TP; else FP. Misses: FN.</li><li>Precision and recall.</li><li>PR curve, its area AP; mean over classes: mAP.</li></ul></div></div>`),
 lines:['Every cell writes a box; the score filter and NMS decide how many survive.'],
 ask:['How does a fixed-size output give a list of any length?'],expected:['Every cell writes a box; the score filter and NMS decide how many boxes survive.'],
 point:'Next lecture: masks, keypoints and boxes found from words (Beyond Boxes). Appendix A gives the other answer to the question, DETR; Appendix B has more depth, real detections, and the six jobs of Part 1 revisited.',
 transition:'End of the main route.'});

// ================================================================================================ Appendix A: DETR
A_('part-A','detr','Appendix A · DETR: a fixed set of slots, matched to objects',{part:'A',builds:1,
 body:`<div class="part-break">${p('Another way to output a list: a fixed set of slots, matched to objects before the loss, so no NMS is needed.')}<ol class="steps">${['Why slots are hard: too few for a crowd, and no order.','Follow a photo through DETR to 100 predictions, and see where two queries looked.','Watch duplicates vanish inside the decoder.','Build the matching cost one cell at a time, solve the matching, and compute the loss.'].map(x=>`<li>${x}</li>`).join('')}</ol></div>`,
 lines:['The other answer to the lecture’s question: DETR, 100 slots that read the image with attention, matched to objects instead of cleaned up by NMS.'],
 ask:['Why not simply give the head several box outputs?'],expected:['Then you must choose how many, and decide which output answers for which object.'],transition:'Start with K slots.'});
chap('A.1');
// K slots: the target for our photo, one row per slot (dog, cat, then three spare slots)
const slotGrid=()=>{const rows=[['dog',S.dog.norm],['cat',S.cat.norm],null,null,null];
 return `<div class="slotgrid"><span></span><b>class</b>${[m('c_x'),m('c_y'),m('w'),m('h')].map(k=>`<b>${k}</b>`).join('')}`+
  rows.map((r,i)=>`<span class="sl">slot ${i+1}</span>`+(r?[r[0],...r[1].map(v=>num(v,3))].map(v=>`<div class="t"><span data-at="2">${v}</span></div>`).join('')
   :['no object','?','?','?','?'].map(v=>`<div class="q"><span data-at="3">${v}</span></div>`).join(''))).join('')+'</div>';};
A_('k-slots','detr','Give the head K slots',{builds:4,
 body:cols(courtyard(gtBox(DOG,'dog',{size:44,w:7})+gtBox(CAT,'cat',{size:44,w:7})+gat(2,pill(DOG[0],DOG[3],'slot 1',{fill:COL.target,size:44})+pill(CAT[0],CAT[3],'slot 2',{fill:COL.target,size:44})),'Our photo: the dog goes in slot 1, the cat in slot 2'),
  stack(slotGrid(),at(4,`<div class="eq-sm">${eq(R`K\times(C+1+4)=5\times(80+1+4)=${5*(80+1+4)}`)}</div>`)),'0.8fr 1.2fr'),
 lines:['Give the head K slots instead of one. Each slot holds a record like the one-object target: a class and four box numbers. Here K = 5.',
  'The target for our photo puts the dog in one slot and the cat in another, with their boxes in normalised units.',
  'The three spare slots need a way to say “nothing here”: one more class, no object. Their boxes have no right answer, so they are “?”.',
  'However many objects a photo has, the output keeps one size: K slots, each with C class scores, a no-object score and four box numbers.'],
 ask:['What does each slot write?','Why the dog in slot 1 and not slot 4?','What should a spare slot predict?','How many numbers for K = 5 and C = 80?'],
 expected:['A class and four box numbers, like the one-object head.','No reason: the slots have no order. That choice comes back as Problem 2.','The class “no object”. Its box is left out of the loss.','5 × (80 + 1 + 4) = 425.'],
 transition:'What if a photo has more objects than slots?',source:'Our annotation of the courtyard photo (data/annotations.json). '+PHOTO_SRC});
const NC=S.annotations.crowd.length;
A_('slots-crowd','detr','Problem 1: more objects than slots',{builds:2,
 body:cols(photo('crowd',W2,H2,S.annotations.crowd.map(x=>x[1]).sort((u,v)=>u[0]-v[0]).map((b,i)=>gtBox(b,String(i+1),{size:30,w:5})).join(''),'The crowd photo with its 11 annotated people, numbered from left to right'),
  only(1,stack(`<div class="big-number">${NC}</div>`,p('people in the photo'),`<div class="big-number">5</div>`,p('slots, if K = 5')))+
  only(2,stack(`<div class="big-number">100</div>`,p('slots, if K = 100'),`<div class="big-number">${100-NC}</div>`,p('of them say “no object” here'))),'1.5fr 1fr'),
 lines:[`Problem 1: the crowd photo has ${NC} people. A head with K = 5 slots can report at most 5 of them, however well it is trained.`,
  `So make K larger than any photo needs, say 100. Here ${NC} slots would hold a person, and the other ${100-NC} would say “no object”.`],
 ask:[`How many of the ${NC} people can a 5-slot head report?`,'How large should K be?'],
 expected:['At most 5.','Larger than the number of objects in any photo you expect.'],
 point:'K is fixed when the network is built, so it must cover the most crowded photo you expect; the spare slots learn “no object”.',
 transition:'Problem 2 is harder: which object goes in which slot?',source:'Our annotation of the crowd photo (data/annotations.json). '+PHOTO_SRC});
const sl=S.slots,two=S.annotations['two-dogs'];
A_('slot-order','detr','Problem 2: which dog belongs in slot 1?',{builds:4,
 body:cols(photo('two-dogs',W2,H2,prBox(two[0][1],'slot 1',{size:40,w:6})+prBox(two[1][1],'slot 2',{size:40,w:6})+gat(2,pill(two[1][1][0],two[1][1][3]+4,'listed 1st',{fill:COL.target,size:40,below:true})+pill(two[0][1][0],two[0][1][3]+4,'listed 2nd',{fill:COL.target,size:40,below:true})),'Two perfect slots on the two dogs; the annotation lists the right dog first'),
  stack(at(2,`<div class="eq-sm">${eq(R`\text{by position: }\ ${sl.perfect_one}+${sl.perfect_one}=\lcol{${sl.perfect}}`)}</div>`),at(3,`<div class="eq-sm">${eq(R`\text{by object: }\ 0+0=0`)}</div>`),
   at(4,p('Same perfect answer, two losses. The loss must not depend on the list’s order.'))),'1.3fr 1fr'),
 lines:['Suppose the head is perfect: slot 1 boxes the left dog exactly, slot 2 the right dog. Nothing could be more right.',
  `But the annotator happened to list the right dog first. Compare slot k with entry k: each slot is a whole dog away from its entry, ${sl.perfect_one} in normalised units.`,
  'Compare each slot with the dog it actually boxed: both differences are 0.',
  'Nothing about the prediction changed, only the order of the list. A loss that pairs outputs with targets by position punishes a perfect answer.'],
 ask:['Are the two slots’ boxes correct?','What is the loss if slot k is compared with entry k?','And if each slot is compared with its own dog?','What must the loss do instead?'],
 expected:['Yes, exactly: they are the annotated boxes.',`${sl.perfect}: ${sl.perfect_one} for each slot, mostly the half-photo gap between the two centres.`,'0.','Pair each output with the object it describes, whatever the list order.'],
 point:'The L1 sums are over normalised (c_x, c_y, w, h). The list order here is made up for the example: whoever labels a photo lists its objects in some order, and nothing makes it match the slots.',
 transition:'Two ways to pair outputs with objects.',source:'Our annotation of the two-dog photo (data/annotations.json). '+PHOTO_SRC});
A_('two-fixes','detr','Two ways to decide which output answers for which object',{builds:2,
 body:`<div class="compare">${at(1,`<div class="a"><h3>A · by place</h3><ul><li>Each output owns a place in the image</li><li>Outputs at the dog’s place answer for the dog</li></ul><p class="caption">Parts 5 to 7: YOLO</p></div>`)}${at(2,`<div class="b"><h3>B · by matching</h3><ul><li>Keep free slots</li><li>Before the loss, match slots to objects one to one, at the lowest total cost</li></ul><p class="caption">the rest of this appendix: DETR</p></div>`)}</div>`,
 lines:['Fix A gives every output a fixed place in the image, and whatever is there is its job, so order cannot matter.','Fix B keeps free slots and, before each loss, matches them to objects at the lowest total cost, so order cannot matter either.'],
 ask:['How does fix A remove the order problem?','How does fix B?'],
 expected:['An output answers for the object at its place; there is nothing to order.','The pairing is chosen by cost, not by position in the list.'],
 transition:'DETR: fix B, step by step.'});
chap('A.2');
const D=S.detr;
A_('slots-again','detr','Back to the slots, with three changes',{builds:3,
 body:`<ol class="steps">${['<b>100 slots</b>, more than almost any photo has objects; each may say “no object”.','<b>Each slot reads the whole image</b> with cross-attention, as the VLM lectures did.','<b>Match before the loss</b>: pair slots with objects so that the total cost is lowest.'].map((x,i)=>`<li data-at="${i+1}">${x}</li>`).join('')}</ol>`,
 lines:['Problem 1 was capacity: use K = 100 slots. Unused slots predict a 92nd class, “no object”.','A slot needs a way to look at the photo: give it a learned query vector that attends to the image features.','Problem 2 was order: before computing the loss, find the cheapest one-to-one pairing of slots and objects. Order in the annotation list stops mattering.'],
 ask:['How many slots does DETR use?','How does a slot see the image?','How is the order problem solved?'],
 expected:['100.','Cross-attention from its query to the image features.','By matching slots to objects before the loss.'],
 transition:'Follow a photo through DETR.'});
A_('detr-pipeline','detr','DETR, from photo to 100 predictions',{builds:4,
 body:flow([
  {id:'img',x:0,y:110,w:150,h:96,label:'photo',sub:'1200 × 800',role:'data'},
  {id:'cnn',x:190,y:110,w:170,h:96,label:'CNN',sub:'ResNet-50',role:'ink'},
  {id:'tok',x:400,y:110,w:170,h:96,label:'950 tokens',sub:'25 × 38',role:'ink'},
  {id:'enc',x:400,y:290,w:170,h:96,label:'encoder',sub:'self-attention',role:'ink'},
  {id:'q',x:610,y:0,w:170,h:84,label:'100 queries',sub:'learned',role:'q'},
  {id:'dec',x:610,y:200,w:170,h:96,label:'decoder',sub:'6 layers',role:'q'},
  {id:'cls',x:830,y:130,w:170,h:84,label:'class',sub:'91 + no object',role:'p'},
  {id:'box',x:830,y:270,w:170,h:84,label:'box',sub:'cx, cy, w, h',role:'p'}],
  [{from:'img',to:'cnn'},{from:'cnn',to:'tok'},{from:'tok',to:'enc',fromSide:'bottom',toSide:'top'},{from:'enc',to:'dec',role:'q'},{from:'q',to:'dec',fromSide:'bottom',toSide:'top',role:'q'},{from:'dec',to:'cls',role:'p'},{from:'dec',to:'box',role:'p'}],{width:1000,height:400,label:'DETR: CNN, encoder, decoder with queries, two heads'}),
 lines:['A ResNet-50 turns the photo, resized to 1200 × 800, into a 25 × 38 grid; each position becomes a token of 256 numbers. 950 tokens.',
  'A transformer encoder lets the 950 tokens attend to each other, so each token knows about the rest of the photo.',
  'The decoder starts from 100 learned query vectors. In each of 6 layers, the queries attend to each other, then to the 950 image tokens (cross-attention).',
  'Two small heads read each of the 100 outputs: a class among 91 COCO ids plus “no object”, and a box as normalised (c_x, c_y, w, h).'],
 ask:['How many image tokens are there?','What does the encoder add?','What reads the image in the decoder?','What does each of the 100 outputs give?'],
 expected:['25 × 38 = 950.','Context: each token attends to all the others.','The 100 queries, through cross-attention to the tokens.','A class (or no object) and a normalised box.'],
 point:`The grid is ${D.grid[1]} × ${D.grid[0]} because 800/32 = 25 and 1200/32 = 37.5, rounded up.`,
 transition:'What is a query?',source:DETR_SRC});
A_('queries','detr','A query is learned once and reused for every photo',{builds:2,
 body:cols(stack(p('<b>Stored:</b> 100 query vectors, 256 numbers each. Parameters, trained like weights; the same 100 for every photo.')),
  at(2,stack(p('<b>Computed:</b> what each query writes depends on the photo, because it reads the photo through cross-attention.'),small('As in the VLM lectures: stored query slots, computed per-image summaries.'))),'1fr 1fr'),
 lines:['The 100 queries are stored parameters: 100 × 256 numbers learned in training, identical for every photo.','Their outputs are computed: the same query writes a dog box for one photo and “no object” for another, depending on what it read.'],
 ask:['Do the queries change from photo to photo?','Then how can query 71 output a dog here and nothing elsewhere?'],
 expected:['No: they are fixed after training.','Its output depends on what cross-attention reads from this photo.'],
 transition:'DETR on the courtyard.'});
const qcol=n=>n==='dog'?COL.guess:n==='cat'?COL.target:n==='potted plant'?COL.amber:'#D7DCE1';
const qStrip=()=>`<div class="qstrip">${D.names.map((n,i)=>`<span style="background:${qcol(n)}" title="query ${i}${n?': '+n:''}">${n?i:''}</span>`).join('')}</div>`;
const detrObjs=D.objects.filter(q=>q.p>=0.5);
const dBox=q=>[(q.box[0]-q.box[2]/2)*W,(q.box[1]-q.box[3]/2)*H,(q.box[0]+q.box[2]/2)*W,(q.box[1]+q.box[3]/2)*H];
A_('detr-output','detr','DETR on the courtyard: 100 slots, most of them empty',{builds:3,
 body:cols(stack(qStrip(),small(`Grey: “no object”. ${D.n_none_90} of the 100 slots give it more than 0.9.`),
   at(2,`<div class="table-sm xtight">${table(['query','class','p','p(no object)'],detrObjs.slice(0,5).map(q=>[String(q.q),q.name,num(q.p,3),num(q.p_none,3)]))}</div>`)),
  stack(at(3,courtyard(detrObjs.filter(q=>q.p>=0.9).map(q=>prBox(dBox(q),`q${q.q} ${q.name==='potted plant'?'plant':q.name}`,{size:28,w:4,fill:qcol(q.name),maxX:W})).join(''),'DETR’s confident predictions on the courtyard',{cls:'short'}))),'1fr 1.25fr'),
 lines:['One square per query, numbered 0 to 99. Coloured if the query names an object; grey if it says “no object”.','The busy ones: query 71 says dog (0.999), query 61 cat (0.999), others plants. Their numbers are arbitrary: training decided which slot does what.','Their boxes: one per object. No duplicates to remove, and no NMS.'],
 ask:['How many queries say “no object”?','Which query found the dog?','Does DETR need NMS here?'],
 expected:[`${D.n_none_90} with probability above 0.9.`,'Query 71.','No: each object has one query.'],
 transition:'Where did query 71 look?',source:DETR_SRC});
const attnHeat=q=>{const A=D.attention[q],mx=Math.max(...A.flat()),cs=W/1200*32;let g='';A.forEach((row,r)=>row.forEach((v,c)=>{const o=v/mx;if(o>.06)g+=`<rect x="${(c*cs).toFixed(1)}" y="${(r*cs).toFixed(1)}" width="${cs.toFixed(1)}" height="${cs.toFixed(1)}" fill="${COL.loss}" fill-opacity="${Math.min(.85,o).toFixed(2)}"/>`;}));return `<rect width="${W}" height="${H}" fill="#000" fill-opacity=".35"/>`+g;};
A_('detr-attention','detr','Where two queries looked',{builds:2,
 body:`<div class="image-pair">${at(1,`<figure>${courtyard(attnHeat('71'),'Cross-attention of query 71, the dog')}<figcaption>query 71 → dog</figcaption></figure>`)}${at(2,`<figure>${courtyard(attnHeat('61'),'Cross-attention of query 61, the cat')}<figcaption>query 61 → cat</figcaption></figure>`)}</div>`,
 lines:['Query 71’s cross-attention in the last decoder layer, averaged over its 8 heads: where its weights over the 950 tokens went. Bright = much attention.','Query 61, the cat: its attention sits on the cat. Each query attends mostly to the parts of the photo that fix its box: the extremities more than the middle.'],
 ask:['Where does query 71 attend?','Why the edges and extremities rather than the middle?'],
 expected:['On the dog.','The box needs the extreme points (head, paws, tail); the class is already clear from the encoder’s context.'],
 point:'Carion et al. (2020) report the same: decoder attention highlights object extremities.',
 transition:'How do duplicates disappear without NMS?',source:DETR_SRC});
const DL=S.detr_layers,lq=(i,k)=>DL.trace[k][i],px2=b=>[(b[0]-b[2]/2)*W2,(b[1]-b[3]/2)*H2,(b[0]+b[2]/2)*W2,(b[1]+b[3]/2)*H2];
const layerFig=i=>photo('two-dogs',W2,H2,prBox(px2(lq(i,0).box),'',{w:5})+pill(px2(lq(i,0).box)[0],px2(lq(i,0).box)[1],`q90 plant ${num(lq(i,0).p,3)}`,{fill:COL.guess,size:24})+(lq(i,1).p_none<.5?prBox(px2(lq(i,1).box),'',{w:5,fill:COL.amber,dash:'10 6'})+pill(px2(lq(i,1).box)[0],px2(lq(i,1).box)[3]+2,`q25 plant ${num(lq(i,1).p,3)}`,{fill:COL.amber,size:24,below:true}):pill(px2(lq(i,1).box)[0],px2(lq(i,1).box)[3]+2,`q25 no object ${num(lq(i,1).p_none,3)}`,{fill:MUTED,size:24,below:true})),`Queries 90 and 25 after decoder layer ${i+1}`,{view:[600,110,420,330]});
A_('detr-layers','detr','Duplicates disappear inside the decoder',{builds:3,
 body:cols(`<div class="state-slot"><div data-only="1">${layerFig(0)}</div><div data-only="2-3">${layerFig(1)}</div></div>`,
  stack(only(1,p(`After layer 1: queries 90 and 25 both say “potted plant” for the same pot (IoU ${num(DL.iou_layer1,3)}).`)),at(2,p(`After layer 2: query 25 says “no object” (${num(lq(1,1).p_none,3)}); query 90 keeps the plant.`)),
   at(3,p('Queries attend to each other in every decoder layer, so one can see that another already has the pot. Training rewards exactly one of them per object (next slides).'))),'1.2fr 1fr'),
 lines:['DETR’s heads can read the queries after any decoder layer. After layer 1, two queries describe the same pot in the two-dogs photo.',
  'After layer 2, query 25 has dropped out: “no object” at 0.975. The duplicate was removed by the network, not by a post-processing rule.',
  'This works because training never rewards two queries for one object. That comes from the matching.'],
 ask:['What do queries 90 and 25 say after layer 1?','And after layer 2?','What lets a query know another has the pot?'],
 expected:['Both: potted plant, on the same pot.','Query 25: no object; query 90: potted plant.','Self-attention among the queries in each decoder layer.'],
 point:'DETR trains a loss on every layer’s predictions (auxiliary losses), which is why every layer’s output can be read with the same heads.',
 transition:'Training: which query should learn which object?',source:DETR_SRC});
chap('A.3');
const MT=S.match;
A_('match-why','detr','Training: which prediction should learn which dog?',{builds:2,
 body:cols(photo('two-dogs',W2,H2,gtBox(two[0][1],'left dog',{size:40,w:6})+gtBox(two[1][1],'right dog',{size:40,w:6})),
  stack(p('Two targets. 100 predictions. In Part 4, comparing slot k with list entry k punished a correct answer.'),at(2,p('Instead: give every (prediction, target) pair a <b>cost</b>, then choose the one-to-one pairing with the lowest total.'))),'1.3fr 1fr'),
 lines:['Training photo: two annotated dogs. DETR made 100 predictions. Which prediction is compared with which dog?','Score every pairing with a cost: low when the prediction has the right class and a box close to the target’s. Then pick, among all one-to-one pairings, the cheapest.'],
 ask:['How many predictions and how many targets?','What should make a pairing cheap?'],
 expected:['100 predictions, 2 targets.','The right class with high probability, and a box close to the target box.'],
 transition:'The cost needs one more box measure.',source:PHOTO_SRC});
const giouFig=()=>{const A=[40,60,240,260],B=[280,100,420,240],F=[700,120,840,260];
 return fig(880,330,rect(A,{stroke:COL.target,w:4})+label(50,50,'target',{size:28,fill:COL.target,weight:650})+
  rect(B,{stroke:COL.guess,w:4})+label(290,90,'near miss',{size:28,fill:COL.guess,weight:650})+
  rect(F,{stroke:COL.guess,w:4})+label(710,110,'far miss',{size:28,fill:COL.guess,weight:650})+
  `<g data-at="2">${rect([40,60,420,260],{stroke:COL.amber,w:3,dash:'8 6'})}${rect([40,60,840,260],{stroke:COL.loss,w:3,dash:'3 6'})}</g>`+
  label(230,312,`GIoU ${num(giou(A,B),2)}`,{size:30,anchor:'middle',fill:COL.ink,weight:650})+label(770,312,`GIoU ${num(giou(A,F),2)}`,{size:30,anchor:'middle',fill:COL.ink,weight:650}),'A near miss and a far miss: same IoU, different GIoU');};
function giou(a,b){const p=iouParts(a,b),c=(Math.max(a[2],b[2])-Math.min(a[0],b[0]))*(Math.max(a[3],b[3])-Math.min(a[1],b[1]));return p.iou-(c-p.U)/c;}
A_('giou','detr','One more measure: generalised IoU',{builds:3,
 body:cols(giouFig(),stack(ps('Any two boxes that do not touch have IoU 0: a near miss scores the same as a far miss.'),
  at(2,`<div class="eq-sm">${eq(R`\mathrm{GIoU}=\mathrm{IoU}-\frac{\text{area}(C)-\text{area}(A\cup B)}{\text{area}(C)}`)}</div>`),at(2,small('C: the smallest box enclosing both. The emptier C is, the lower the score; GIoU runs from −1 to 1.')),
  at(3,ps(`DETR’s right-dog query against the left dog: IoU 0, GIoU ${num(MT.giou[0][1],3)}.`))),'1.15fr 1fr'),
 lines:['IoU cannot tell a near miss from a far miss: both are 0. A loss built on IoU gives no direction to move.','Generalised IoU subtracts the empty fraction of the smallest box C that encloses both. Far apart, C is mostly empty and GIoU approaches −1.',`Real example: query 98 predicts the right dog; against the left dog its IoU is 0 but its GIoU is ${num(MT.giou[0][1],3)}.`],
 ask:['What is the IoU of any two non-overlapping boxes?','What does the second term measure?','What is GIoU for identical boxes?'],
 expected:['0.','How much of the enclosing box is empty.','1: IoU is 1 and C equals the union.'],
 point:'GIoU: Rezatofighi et al., 2019. The two example values on the left are for the drawn boxes.',
 transition:'The cost of one pairing.'});
const c00={cls:MT.class[0][0],l1:MT.l1[0][0],g:MT.giou[0][0],t:MT.total[0][0]};
A_('cost-one','detr','The cost of one pairing: query 61 and the left dog',{builds:4,
 body:stack(eq(R`\lcol{C}=-\,\qcol{p(\text{class})}\;+\;5\,\big\|\qcol{\hat b}-\pcol{b}\big\|_1\;-\;2\,\mathrm{GIoU}(\qcol{\hat b},\pcol{b})`),
  at(2,eq(R`\text{class: }-\qcol{p(\text{dog})}=${num(c00.cls,3)}`)),
  at(3,eq(R`\text{box, L1: }|\qcol{${num(MT.q_boxes[0][0],3)}}-\pcol{${num(MT.target_boxes[0][0],3)}}|+\dots=${num(c00.l1,3)},\quad\times5=${num(5*c00.l1,3)}`)),
  at(3,eq(R`\text{box, }\mathrm{GIoU}(\qcol{\hat b},\pcol{b})=${num(c00.g,3)},\quad\times(-2)=${num(-2*c00.g,3)}`)),
  at(4,eq(R`\lcol{C}=${num(c00.cls,3)}+${num(5*c00.l1,3)}-${num(2*c00.g,3)}=\lcol{${num(c00.t,2)}}`))),
 lines:['DETR’s matching cost has three parts: minus the probability of the target’s class, the L1 distance between boxes, and minus the GIoU. Weights 1, 5 and 2.','Query 61 gives “dog” probability 0.999: the class part is −0.999.',`Its normalised box differs from the left dog’s by ${num(c00.l1,3)} in total (L1), and GIoU is ${num(c00.g,3)}.`,`Total ${num(c00.t,2)}. Low cost = good pairing; negative is fine, only comparisons matter.`],
 ask:['Which part rewards the right class?','What are the L1 distance and GIoU here?','What is the total?','Is a negative cost a problem?'],
 expected:['−p(class): a higher probability lowers the cost.',`${num(c00.l1,3)} and ${num(c00.g,3)}.`,num(c00.t,2),'No: only which pairing is cheapest matters.'],
 point:'Weights from DETR’s code (set_cost_class 1, set_cost_bbox 5, set_cost_giou 2). Boxes are normalised (c_x, c_y, w, h).',
 transition:'Every pairing.',source:DETR_SRC});
const qh=MT.queries.map((q,j)=>`q${q} (${MT.q_names[j]==='potted plant'?'plant':MT.q_names[j]})`);
const costCell=(i,j,b)=>{const v=num(MT.total[i][j],2),hit=MT.assignment[i]===j;return b>=3&&hit?`<b class="hit">${v}</b>`:v;};
A_('cost-matrix','detr','Fill the table: the cost of every pairing',{builds:3,
 body:stack(`<div class="state-slot">${[1,2,3].map(b=>`<div data-only="${b}"><div class="table-sm">${table(['',...qh],MT.targets.map((t,i)=>[t,...MT.queries.map((_,j)=>i<b?costCell(i,j,b):'?')]))}</div></div>`).join('')}</div>`,
  at(3,p(`Cheapest pairing: left dog ↔ q61, right dog ↔ q98, total ${num(MT.total[0][0]+MT.total[1][1],2)}. Every other query is matched to nothing and learns “no object”.`))),
 point:`q2’s box also sits on the left dog (cost ${num(MT.total[0][3],2)}), but it says “no object”: the class term makes q61 cheaper.`,
 lines:['Row 1: the left dog against four of the queries. q61 is cheapest; q2 is second: its box is on the left dog too.','Row 2: the right dog. q98 is cheapest.','Choose one query per dog with the lowest total: q61 and q98. Here each dog’s cheapest query is different, so the choice is easy. It is not always.'],
 ask:['Which query is cheapest for the left dog?','For the right dog?','Which queries learn “no object”?'],
 expected:[`q61, ${num(MT.total[0][0],2)}.`,`q98, ${num(MT.total[1][1],2)}.`,'All 98 others, including q2 and q90.'],
 transition:'When is the choice not easy?',source:DETR_SRC});
const GR=S.greedy;
A_('greedy','detr','Why not let each object grab its cheapest slot?',{builds:3,
 body:cols(`<div class="state-slot">${[[1,[[0,0],[1,1]],'miss'],[2,[[0,1],[1,0]],'hit']].map(([b,pick,cls])=>`<div data-only="${b===1?'1':'2-3'}"><div class="table-sm">${table(['','q1','q2'],['left dog','right dog'].map((t,i)=>[t,...[0,1].map(j=>pick.some(([a,c])=>a===i&&c===j)?`<b class="${cls}">${GR.cost[i][j]}</b>`:String(GR.cost[i][j]))]))}</div></div>`).join('')}</div>`,
  stack(at(1,p(`Greedy: the left dog takes its cheapest, q1 (${GR.cost[0][0]}). The right dog must take q2 (${GR.cost[1][1]}). Total <b class="miss">${GR.greedy_total}</b>.`)),
   at(2,p(`Better: left dog → q2 (${GR.cost[0][1]}), right dog → q1 (${GR.cost[1][0]}). Total <b class="hit">${GR.best_total}</b>.`)),
   at(3,p('Trying every pairing is hopeless with 100 queries. The <b>Hungarian algorithm</b> (Kuhn, 1955) finds the cheapest one-to-one pairing in polynomial time: <span class="mono">scipy.optimize.linear_sum_assignment</span>.'))),'0.8fr 1.2fr'),
 lines:['A made-up two-by-two case. Greedy: the left dog grabs q1, its cheapest at 1; the right dog is stuck with q2 at 9. Total 10.','The other pairing costs 2 + 2 = 4. Grabbing the cheapest first was wrong for the total.','The best pairing must be found globally. The Hungarian algorithm does it efficiently; scipy has it.'],
 ask:['What does greedy pick, and what does it cost?','What is the best total?','How many pairings are there for 2 objects and 100 queries?'],
 expected:['q1 for the left dog, q2 for the right: 10.','4.','100 × 99 = 9,900; for 20 objects about 10³⁹. Enumeration is out; Hungarian runs in O(n³).'],
 point:'These four costs are invented to show the failure; the DETR costs on the previous slide had no conflict.',
 transition:'After matching: the loss.'});
const ML=S.match_loss,mp=ML.pairs[0];
A_('match-loss','detr','After matching: the loss',{builds:3,
 body:sm(at(1,eq(R`\qcol{\text{q61}}\to\pcol{\text{left dog}}\text{: }\ -\log\qcol{${num(MT.q_p[0],3)}}+5\times${num(mp.l1,3)}+2\times(1-${num(mp.giou,3)})`)),
  at(1,eq(R`=${num(mp.ce,3)}+${num(5*mp.l1,3)}+${num(2*mp.giou_loss,3)}=\lcol{${num(mp.ce+5*mp.l1+2*mp.giou_loss,3)}}`)),
  at(2,eq(R`\qcol{\text{q2}}\to\pcol{\text{no object}}\text{: }\ 0.1\times(-\log\qcol{${num(ML.unmatched.p_none,3)}})=\lcol{${num(-0.1*Math.log(ML.unmatched.p_none),4)}}`)),
  at(3,eq(R`\qcol{\text{q90 (a plant)}}\to\pcol{\text{no object}}\text{: }\ 0.1\times(-\log\qcol{${num(ML.unmatched_plant.p_none,3)}})=\lcol{${num(ML.unmatched_plant.weighted,3)}}`))),
 point:'Our target list holds only the two dogs, so the loss would teach q90 to call the pot nothing. What is annotated decides what is learned; COCO does label potted plants.',
 lines:['A matched query learns its object: cross-entropy for the class, plus L1 and 1 − GIoU for the box. q61 is already almost perfect: tiny loss.','An unmatched query learns “no object”, its cross-entropy weighted by 0.1 because most queries are empty. q2 already says no object: almost no loss.',`q90 named a real plant, but plants are not in this target list, so it pays ${num(ML.unmatched_plant.weighted,2)} for being right.`],
 ask:['What does a matched query learn?','What does an unmatched query learn, and why the weight 0.1?','Why is q90 penalised?'],
 expected:['Its object’s class and box.','“No object”; 0.1 keeps the ~98 empty queries from dominating.','It found an object the annotation leaves out.'],
 transition:'Why does this remove duplicates?',source:DETR_SRC});
chap('A.4');
A_('why-no-nms','detr','Why DETR needs no NMS',{builds:2,
 body:`<div class="compare">${at(1,`<div class="b"><h3>DETR · one-to-one</h3><ul><li>Each object is matched to exactly one query</li><li>A second query on the same object is trained to say “no object”</li><li>So the trained network outputs one box per object</li></ul></div>`)}${at(2,`<div class="a"><h3>YOLO · one-to-many</h3><ul><li>About ten cells per object are trained as positives</li><li>All ten learn to fire</li><li>So NMS must delete nine of them</li></ul></div>`)}</div>`,
 lines:['Matching is one-to-one: in every training step, a duplicate query is told “no object”. The network learns not to duplicate, using self-attention among queries.','The dense detector trained ten cells per object on purpose (more positives, more signal) and pays for it with NMS.'],
 ask:['What happens in training to a second query that predicts an already-matched object?','Why does YOLO train several cells per object?'],
 expected:['It is matched to nothing, so its target is “no object”.','More positives give more training signal and robustness; the price is duplicates.'],
 point:'YOLOv10 (2024) trains both: a one-to-many head for signal and a one-to-one head used at test time, so it too runs without NMS.',
 transition:'DETR in code.'});
A_('detr-code','detr','DETR in code: matching, then inference',{builds:2,
 body:`<div class="code-sm">`+stack(code(`from scipy.optimize import linear_sum_assignment
cost = (-prob[:, gt_labels]                                 # (100, N)
        + 5 * torch.cdist(pred_boxes, gt_boxes, p=1)
        - 2 * generalized_box_iou(to_xyxy(pred_boxes), to_xyxy(gt_boxes)))
q_idx, gt_idx = linear_sum_assignment(cost.detach())        # one query per object`),
  at(2,code(`model = DetrForObjectDetection.from_pretrained("facebook/detr-resnet-50")
out = model(**processor(images=img, return_tensors="pt"))
dets = processor.post_process_object_detection(out, threshold=0.9,
                                               target_sizes=[img.size[::-1]])`)))+'</div>',
 lines:['The cost matrix is three lines: class, L1 and GIoU for every (query, object) pair. One call solves the matching. The loss then uses the matched pairs.','At test time there is nothing to match: run the model, keep the queries whose best class beats a threshold. There is no NMS step.'],
 ask:['What shape is the cost matrix for 100 queries and N objects?','What replaces NMS at test time?'],
 expected:['(100, N).','A threshold on each query’s class probability.'],
 demo:'Notebook appendix A runs DETR on the two-dogs photo, builds this cost matrix and checks the matching against brute force.',
 transition:'Two answers side by side.'});
A_('two-answers','detr','Two answers to one question',{builds:2,
 body:stack(`<div class="table-sm tight">${table(['','dense (YOLOv8)','set (DETR)'],[
  ['outputs','one record per cell: 12,600','100 learned slots'],
  ['who answers for an object','cells near it, by place','the matched query'],
  ['training targets','one-to-many: ~10 cells','one-to-one: Hungarian matching'],
  ['at test time','score filter + NMS','threshold only'],
  ['on our courtyard','4 detections','5 objects at p ≥ 0.9'],
  [`our 8 photos, AP@[.5:.95]`,num(BY.map,3),num(BD.map,3)].map(c=>at(2,c)),
  ['COCO validation, AP (published)','0.373','0.420'].map(c=>at(2,c))])}</div>`),
 lines:['The main difference is how outputs are assigned to objects in training: by place, several per object, or by matching, one per object.','Both solve the lecture’s question with a fixed tensor plus a way to say “nothing here”, and both score well on our photos.'],
 ask:['Where does each method decide which output answers for which object?','What plays the role of “no object” in YOLO?'],
 expected:['YOLO: by cell position in training; DETR: by Hungarian matching in training.','Low class scores, removed by the score filter.'],
 point:'DETR trained for 500 epochs on COCO; Deformable DETR, DINO and RT-DETR made such models faster to train and real-time.',
 transition:'End of Appendix A. Appendix B: more depth.'});

// ================================================================================================ Appendix B: more depth
// Ng's convolutional sliding windows, taken off Part 5's main route: one pass gives every window's answer
// Ng's trick, step 1: his toy classifier as blocks of numbers; its dense layers become convolutions
const fcFig=(()=>{const cy=172,ly=cy+108,lab=(x,t)=>label(x,ly,t,{size:21,anchor:'middle',fill:COL.ink,weight:600}),
  arr=(x1,x2,t,t2='')=>arrow(x1,cy,x2,cy,{w:3,head:12})+label((x1+x2)/2,cy-(t2?40:16),t,{size:18,anchor:'middle',fill:MUTED})+(t2?label((x1+x2)/2,cy-16,t2,{size:18,anchor:'middle',fill:MUTED}):''),
  bar=(x,h)=>`<rect x="${x}" y="${cy-h/2}" width="24" height="${h}" rx="4" fill="#fff" stroke="${COL.ink}" stroke-width="2"/>`,
  one=(x,d)=>vol(x,cy-8,16,16,d,{stroke:COL.guess,fill:COL.guess}),
  outs=x=>['cat','dog','nothing'].map((t,i)=>label(x,cy-24+i*28,t,{size:19,fill:COL.ink})).join('');
 return fig(1180,300,vol(10,cy-63,126,126,8)+lab(77,'14 × 14 × 3')+arr(154,244,'conv 5 × 5')+vol(254,cy-45,90,90,24)+lab(311,'10 × 10 × 16')+
  arr(378,468,'max pool 2')+vol(478,cy-23,45,45,24)+lab(512,'5 × 5 × 16')+
  gonly(1,arr(557,667,'dense')+bar(677,170)+lab(689,'400'))+gonly('2-3',arr(557,667,'conv 5 × 5','400 filters')+one(677,60)+lab(712,'1 × 1 × 400'))+
  gonly('1-2',arr(765,855,'dense')+bar(865,170)+lab(877,'400')+arr(955,1035,'softmax')+bar(1045,66)+lab(1057,'3'))+
  gonly(3,arr(765,855,'conv 1 × 1')+one(865,60)+lab(900,'1 × 1 × 400')+arr(955,1035,'conv 1 × 1')+one(1045,14)+lab(1062,'1 × 1 × 3'))+outs(1094),
  'A toy classifier: a 14 by 14 by 3 crop, a 5 by 5 convolution, a max pool, two dense layers of 400 units and 3 answers; then each dense layer rewritten as a convolution');})();
O('fc-conv','One pass for every window, step 1: dense layers as convolutions',{builds:3,
 body:stack(fcFig,`<div class="state-slot">${only(2,`<div class="eq-sm">${eq(R`\text{one filter: }5\times5\times16=400\ \text{weights, as for one dense unit}`)}</div>`)}${only(3,`<div class="eq-sm">${eq(R`\text{every layer is a convolution}`)}</div>`)}</div>`),
 lines:['A toy classifier for 14 × 14 crops, drawn as blocks of numbers: a convolution, a max pool, two dense layers of 400 units, then 3 answers.',
  'Write the first dense layer as 400 filters of 5 × 5 × 16. Each one covers the whole block, so it sees all 400 inputs, like one dense unit.',
  'The other two dense layers become 1 × 1 convolutions. The weights and the answers do not change, but a network of convolutions accepts a bigger image.'],
 ask:['How many numbers does the 5 × 5 × 16 block hold?','What does one 5 × 5 × 16 filter compute on that block?','What changes if the input is bigger than 14 × 14?'],
 expected:['5 × 5 × 16 = 400.','A weighted sum of all 400 numbers plus a bias: exactly one dense unit.','A dense layer would break, since it expects exactly 400 inputs. Convolutions just slide further and give more outputs.'],
 point:'Ng, “Convolutional Implementation of Sliding Windows” (Course 4, Week 3): 14 × 14 × 3 → 10 × 10 × 16 → 5 × 5 × 16 → FC 400 → FC 400 → softmax, turned into 400 filters of 5 × 5 × 16, then 1 × 1 convolutions. He has 4 outputs (pedestrian, car, motorcycle, background); we use 3 to match our classifier.',
 transition:'Now give it a bigger image.'});
// Ng's trick, step 2: a 16 x 16 image through the same layers; each 14 x 14 window's footprint, coloured as Ng colours them
const NGW=[[0,0,COL.data],[2,0,COL.green],[0,2,COL.amber],[2,2,COL.guess]];
const swFig=(()=>{const F=[{x:20,y:40,n:16,u:12},{x:330,y:64,n:12,u:12},{x:610,y:64,n:6,u:24},{x:940,y:82,n:2,u:54}],sz=[14,10,5,1];
 const face=f=>{let g=`<rect x="${f.x}" y="${f.y}" width="${f.n*f.u}" height="${f.n*f.u}" fill="#fff" stroke="${COL.ink}" stroke-width="2"/>`;
  for(let i=1;i<f.n;i++)g+=line(f.x+i*f.u,f.y,f.x+i*f.u,f.y+f.n*f.u,{stroke:'#D5DAE0',w:1})+line(f.x,f.y+i*f.u,f.x+f.n*f.u,f.y+i*f.u,{stroke:'#D5DAE0',w:1});return g;};
 const foot=([dx,dy,c],k)=>F.map((f,i)=>{const s=i<2?1:.5,x=f.x+dx*s*f.u,y=f.y+dy*s*f.u,ins=1.5*k;
  return i===3?`<rect x="${x+4}" y="${y+4}" width="${f.u-8}" height="${f.u-8}" rx="6" fill="${c}" fill-opacity=".85"/>`:
   `<rect x="${x+ins}" y="${y+ins}" width="${sz[i]*f.u-2*ins}" height="${sz[i]*f.u-2*ins}" fill="${c}" fill-opacity=".08" stroke="${c}" stroke-width="3.5"/>`;}).join('');
 // the last clicks: all four windows on the input, the 12 x 12 pixels they all share shaded, and the four answers
 const f0=F[0],f3=F[3],all=`<rect x="${f0.x+2*f0.u}" y="${f0.y+2*f0.u}" width="${12*f0.u}" height="${12*f0.u}" fill="${MUTED}" fill-opacity=".25"/>`+
  NGW.map(([dx,dy,c],k)=>`<rect x="${f0.x+dx*f0.u+1.5*k}" y="${f0.y+dy*f0.u+1.5*k}" width="${14*f0.u-3*k}" height="${14*f0.u-3*k}" fill="none" stroke="${c}" stroke-width="3.5"/>`+
   `<rect x="${f3.x+dx/2*f3.u+4}" y="${f3.y+dy/2*f3.u+4}" width="${f3.u-8}" height="${f3.u-8}" rx="6" fill="${c}" fill-opacity=".85"/>`).join('');
 const arr=(x1,x2,y,t,t2='')=>arrow(x1,y,x2,y,{w:3,head:12})+label((x1+x2)/2,y-(t2?38:14),t,{size:19,anchor:'middle',fill:MUTED})+(t2?label((x1+x2)/2,y-14,t2,{size:19,anchor:'middle',fill:MUTED}):''),
  lab=(f,s)=>label(f.x+f.n*f.u/2,272,s,{size:21,anchor:'middle',fill:COL.ink,weight:600});
 return fig(1180,290,F.map(face).join('')+arr(226,318,136,'conv 5 × 5')+arr(488,598,136,'max pool 2')+arr(768,928,136,'conv 5 × 5,','then 1 × 1s')+
  lab(F[0],'16 × 16 × 3')+lab(F[1],'12 × 12 × 16')+lab(F[2],'6 × 6 × 16')+lab(F[3],'2 × 2 × 3')+
  gonly(1,foot(NGW[0],0))+gonly(2,`<g opacity=".35">${foot(NGW[0],0)}</g>`+foot(NGW[1],1))+gonly('3-4',all),
  'A 16 by 16 image through the same layers: each 14 by 14 window, 2 pixels apart, keeps its own footprint in every layer and ends in one of the 2 by 2 outputs');})();
O('conv-windows','One pass for every window, step 2: four answers at once',{builds:4,
 body:stack(swFig,at(4,`<div class="eq-sm">${eq(R`28\xrightarrow{\text{conv }5\times5}24\xrightarrow{\text{pool }2}12\xrightarrow{\text{conv }5\times5}8:\quad 8\times8=64\ \text{windows}`)}</div>`)),
 lines:['Give the same network a 16 × 16 image. The top-left 14 × 14 window flows through exactly as before and ends in the top-left output.',
  'The window 2 pixels to the right moves 2 cells in the first layer and 1 after pooling. Its answer is the top-right output.',
  'Four windows, four answers, from one pass. Where the windows overlap, each convolution is computed once instead of four times.',
  'A bigger example: a 28 × 28 image gives 8 × 8 answers, 64 windows 2 pixels apart. The step is 2 because of the max pool.'],
 ask:['Where does the top-left window’s answer end up?','Where does the window 2 pixels to the right end up?','How many times is each overlapping pixel processed?','Why are the windows 2 pixels apart?'],
 expected:['In the top-left of the 2 × 2 output.','In the top-right output: 2 cells to the right after the convolution, 1 after the 2 × 2 pool.','Once, instead of once per window that contains it.','The 2 × 2 max pool halves the size, so one output step is 2 input pixels.'],
 point:'Ng colours the four windows blue, green, orange and purple and follows them to the four outputs (Sermanet et al., OverFeat, 2014). In his drawing the 400-deep layers are flat squares; so are ours.',
 transition:'The same trick on our photo.'});
// the trick on our photo: VGG16 with its dense layers as convolutions gives one answer per 224-px window, 32 px apart
const cwHeat=(map,col)=>map.flatMap((row,r)=>row.map((v,c)=>v>=.1?`<rect x="${WS/2-SH/2+c*SH}" y="${WS/2-SH/2+r*SH}" width="${SH}" height="${SH}" fill="${col}" fill-opacity="${(.82*v).toFixed(2)}"/>`:'')).join('');
const cwLattice=(()=>{let g='';const x0=WS/2-SH/2,y0=x0,x1=x0+CW.cols*SH,y1=y0+CW.rows*SH;
 for(let i=0;i<=CW.cols;i++)g+=line(x0+i*SH,y0,x0+i*SH,y1,{stroke:'#fff',w:1.5});for(let j=0;j<=CW.rows;j++)g+=line(x0,y0+j*SH,x1,y0+j*SH,{stroke:'#fff',w:1.5});return `<g opacity=".8">${g}</g>`;})();
O('conv-photo','The same trick on our photo: all 336 windows in one pass',{part:'B',builds:3,
 body:cols(courtyard(cwLattice+gonly(1,rect(win0,{stroke:COL.guess,w:7})+`<rect x="${WS/2-SH/2}" y="${WS/2-SH/2}" width="${SH}" height="${SH}" fill="${COL.guess}"/>`)+
   gat(2,cwHeat(CW.dog,COL.guess)+cwHeat(CW.cat,COL.amber)),'One answer per 224-pixel window, drawn at the window’s centre: purple where VGG16 says dog, orange where it says cat'),
  stack(`<div class="big-number">${CW.cols} × ${CW.rows}</div>`,p('answers from one pass of VGG16'),
   at(2,`<div class="chips"><span class="chip" style="color:${COL.guess}">dog score</span><span class="chip" style="color:${COL.amber}">cat score</span></div>`),
   at(3,`<dl class="kv"><dt>one pass</dt><dd>${num(CW.t_onepass,1)} s</dd><dt>${CW.n} crops</dt><dd>${Math.round(CW.t_crops)} s</dd><dt>same answer</dt><dd>${CW.agree} of ${CW.n}</dd></dl>`)),'1.35fr 1fr'),
 lines:[`On our photo: VGG16, an ImageNet classifier for ${WS} × ${WS} crops, with its dense layers written as convolutions. One pass gives ${CW.cols} × ${CW.rows} answers.`,
  'Each answer belongs to one window and is drawn at the window’s centre. Windows over the dog say dog; windows over the cat say cat.',
  `On this laptop one pass takes ${num(CW.t_onepass,1)} s; the ${CW.n} separate crops take ${Math.round(CW.t_crops)} s. The two agree on ${CW.agree} of the ${CW.n} windows.`],
 ask:['How many answers does one pass give?','Which windows say dog?','Why do a few windows disagree with their crop?'],
 expected:[`${CW.cols} × ${CW.rows} = ${CW.n}: the same windows as the ${CW.n} crops.`,'Every window that holds a good part of the dog, even just its head.','VGG16 pads its convolutions with zeros: a crop sees zeros at its edges, while in the whole photo the same window sees its neighbours’ pixels.'],
 point:`VGG16 (IMAGENET1K_V1) on the CPU, the crops run in batches of 16; its three dense layers become a 7 × 7 convolution and two 1 × 1 convolutions. The dog score adds up ImageNet’s 118 dog breeds and the cat score its 5 cat classes. “Same answer”: both say dog, both say cat, or both say neither, at 0.5. Ng’s toy has no padding, so there the two are exactly equal.`,
 transition:'Their boxes are still only the windows: Part 5 goes on from there.',source:'VGG16 (torchvision, ImageNet) run on this photo by scripts/run_models.py; timed on a laptop CPU. '+PHOTO_SRC});
O('opt-yolov1','YOLOv1 (2016): one responsible cell per object',{builds:1,
 body:stack(eq(R`7\times7\ \text{cells}\times(2\times5+20)=7\times7\times30`),p('Each cell: two boxes, each (x, y, w, h, confidence), and one set of 20 class probabilities (PASCAL VOC). Only the cell containing an object’s centre is responsible for it; x, y are offsets inside that cell, w, h fractions of the image.'),small('Confidence was trained toward the IoU between the box and the truth. A cell could hold at most one object’s class.')),
 ask:['Why did YOLOv1 struggle with flocks of birds?'],expected:['Each cell had one class vector: several small objects with centres in one cell could not all be described.']});
const C0=CELL.centre,T0=CELL.target_ltrb;
const ltrbFig=(vals,stroke,b,from=1)=>{const [l,t,r,bb]=vals,[cx,cy]=C0;const f=fsz(dogView,21,420);
 const A=(k,x2,y2,txt,tx,ty,anchor)=>`<g data-at="${from+k}">${arrow(cx,cy,x2,y2,{stroke,w:5,head:18})}${label(tx,ty,txt,{size:f,fill:stroke,weight:700,anchor,halo:true})}</g>`;
 return A(0,cx-l,cy,`l = ${num(l,1).replace('.0','')}`,cx-l/2,cy-14,'middle')+A(1,cx,cy-t,`t = ${num(t,1).replace('.0','')}`,cx+12,cy-t/2,'start')+A(2,cx+r,cy,`r = ${num(r,1).replace('.0','')}`,cx+r/2,cy+38,'middle')+A(3,cx,cy+bb,`b = ${num(bb,1).replace('.0','')}`,cx+12,cy+bb/2+30,'start');};
O('opt-ltrb','YOLOv8’s box: four distances from the cell centre',{part:'B',builds:5,
 body:cols(grid(gtBox(DOG,'',{w:4})+cell(10,18,s32,{fill:COL.guess,op:.7})+`<circle cx="${C0[0]}" cy="${C0[1]}" r="9" fill="#fff" stroke="${COL.ink}" stroke-width="3"/>`+ltrbFig(T0,COL.target,null,2),'Arrows from the cell centre to the four sides of the dog’s box',{view:dogView}),
  sm(eq(R`\text{centre}=(18.5\times32,\ 10.5\times32)=(${C0[0]},\,${C0[1]})`),
   at(2,eq(R`l=${C0[0]}-${DOG[0]}=${T0[0]}`)),at(3,eq(R`t=${C0[1]}-${DOG[1]}=${T0[1]}`)),at(4,eq(R`r=${DOG[2]}-${C0[0]}=${T0[2]}`)),at(5,eq(R`b=${DOG[3]}-${C0[1]}=${T0[3]}`))),'1fr 1.1fr'),
 lines:['Stand at the centre of cell (10, 18): column 18 and row 10, plus a half, times 32 pixels.',`Left: how far to the box’s left edge. ${C0[0]} − ${DOG[0]} = ${T0[0]} pixels.`,`Top: ${C0[1]} − ${DOG[1]} = ${T0[1]}.`,`Right: ${DOG[2]} − ${C0[0]} = ${T0[2]}.`,`Bottom: ${DOG[3]} − ${C0[1]} = ${T0[3]}. Like standing in a room and measuring the distance to each wall: four numbers fix the box.`],
 ask:['Where is the centre of cell (10, 18)?','What is l?','What is t?','What is r?','How would you get the box back from (l, t, r, b)?'],
 expected:[`(${C0.join(', ')}).`,String(T0[0]),String(T0[1]),String(T0[2]),`x₁ = ${C0[0]} − l, y₁ = ${C0[1]} − t, x₂ = ${C0[0]} + r, y₂ = ${C0[1]} + b.`],
 point:'This is the anchor-free form of FCOS (2019) and YOLOv8 (2023). YOLOv1 (2016) instead predicted the centre’s offset inside the cell and the box’s width and height: optional slide.',
 source:PHOTO_SRC});
O('record-84','YOLOv8n’s record: 80 classes, and no “object?”',{builds:3,
 body:cols(grid(cell(...CC.dog.cell,s32,{fill:COL.guess,op:.8}),'The grid with the dog’s cell highlighted',{cls:'short'}),
  stack(recStrip,at(2,p('No “object?” number: a cell with nothing in it gives every class a low score.')),at(3,`<div class="eq-sm">${eq(R`${G.cols}\times${G.rows}\times(4+80)=${bt(G.cols*G.rows*84)}\ \text{numbers}`)}</div>`)),'1fr 1.15fr'),
 lines:['YOLOv8n knows the 80 COCO classes, so its record has the 4 box numbers and 80 class scores: 84 numbers per cell.',
  'It drops “object?”: a cell says “nothing here” by giving every class a low score.',
  'The whole output, for any photo this size: 30 × 20 × 84 numbers, written in one pass.'],
 ask:['How many numbers does each cell write?','How does a cell say “nothing here”?','How many numbers does the whole grid write?'],
 expected:['84: 4 for the box and 80 class scores.','By giving all 80 classes a low score.',`${G.cols} × ${G.rows} × 84 = ${big(G.cols*G.rows*84)}.`],
 point:'YOLOv1 to YOLOv5 kept an object score like Ng’s p_c; YOLOv8 folds it into the class scores.',
 transition:'Now what the trained network wrote at the dog’s cell.',source:PHOTO_SRC});
const NGK=['x','y','w','h'].map(k=>`b<tspan dy="6" font-size="14">${k}</tspan>`);  // b_x, b_y, b_w, b_h as SVG text
/** A cell's record drawn the same way every time: four box numbers, then 80 class bars (dog is index 16). */
const recordFig=({boxes,bars,marks=null,boxAt=1,alt,heading='80 class scores (dog is tall)',keys=['l','t','r','b']})=>{const x0=330,bw=8.2,y0=236,hh=170;let g='';
 boxes.forEach(({vals,col,name},row)=>{const y=60+row*(boxes.length>1?92:0)+(boxes.length>1?0:30);
  g+=`<g data-at="${boxAt}">`+label(16,y-10,name,{size:20,fill:col,weight:650})+vals.map((v,i)=>`<rect x="${16+i*72}" y="${y}" width="64" height="${boxes.length>1?62:100}" rx="6" fill="#fff" stroke="${col}" stroke-width="3"/>${label(48+i*72,y+(boxes.length>1?26:40),keys[i],{size:20,anchor:'middle',fill:col,weight:700})}${label(48+i*72,y+(boxes.length>1?52:80),v,{size:19,anchor:'middle',fill:COL.ink})}`).join('')+'</g>';});
 bars.forEach(({vals,col})=>vals.forEach((v,i)=>{g+=`<rect x="${(x0+i*bw).toFixed(1)}" y="${(y0-v*hh).toFixed(1)}" width="${(bw-1.8).toFixed(1)}" height="${Math.max(1.5,v*hh).toFixed(1)}" fill="${i===16?col:'#AAB3BC'}"/>`;}));
 if(marks)g+=marks;
 g+=line(x0,y0,x0+80*bw,y0,{stroke:AXc})+label(x0,36,heading,{size:20,fill:COL.ink,weight:600})+label(x0,y0+28,'person',{size:17})+label(x0+80*bw,y0+28,'toothbrush',{size:17,anchor:'end'})+label(x0+16*bw+3,y0+28,'dog',{size:18,fill:COL.ink,weight:650,anchor:'middle'});
 return fig(1000,270,g,alt);};
const dogMark=`<line x1="${330+16*8.2-3}" y1="${236-170}" x2="${330+17*8.2+1}" y2="${236-170}" stroke="${COL.target}" stroke-width="4"/>`+label(330+17*8.2+6,236-170+6,'target 1',{size:18,fill:COL.target,weight:650});
O('prediction-record','What the trained network wrote at cell (10, 18)',{builds:2,
 body:stack(recordFig({keys:NGK,boxes:[{vals:NG.dog.map(v=>num(v,3)),col:COL.target,name:'target'},{vals:NG.pred.map(v=>num(v,3)),col:COL.guess,name:'prediction'}],bars:[{vals:CELL.scores,col:COL.guess}],marks:dogMark,boxAt:2,alt:'Predicted record against the target'}),
  `<div class="state-slot">${only(1,ps(`Dog: ${kp(num(CELL.p_dog,3))} (${kt('target&nbsp;1')}). Cat ${kp(num(CELL.top[1][1],4))}, skateboard ${kp(num(CELL.top[2][1],5))}; the other 77 are smaller still (${kt('targets&nbsp;0')}).`))}${only(2,ps(`Box: ${kp('the prediction')} is close to ${kt('the target')}. Its centre sits a little higher, and the box is a little taller.`))}</div>`),
 lines:['The real network’s scores at this cell: dog a little below its target of 1, every other class near its target of 0.','Its box, in cell units, is close to the target too. The loss turns all these differences into one number to reduce.'],
 ask:['How far is each class score from its target?','Which box number is furthest off?'],
 expected:[`Dog: 1 − ${num(CELL.p_dog,3)} = ${num(1-CELL.p_dog,3)} too low; the others are near 0, their target.`,`b_h: ${NG.pred[3]} against ${NG.dog[3]}, ${NG.l1_terms[3]} cells.`],
 point:`YOLOv8n’s box at this cell is (${CELL.cxcywh.join(', ')}) in pixels, centre and size; divided into cell units as on the previous slides.`,
 transition:'The class part of the loss.',source:YOLO_SRC});
const bcePlot=()=>{const P=panel({W:560,H:380,L:66,B:58,T:34,xMin:0,xMax:1,yMin:0,yMax:4.8,ticksX:[0,.25,.5,.75,1],ticksY:[0,1,2,3,4],xLabel:'p, the score of the right answer',yLabel:'−log p'});
 let pts=[];for(let i=1;i<=200;i++){const x=Math.max(.009,i/200);pts.push(`${P.x(x).toFixed(1)},${P.y(-Math.log(x)).toFixed(1)}`);}
 const mark=(x,txt,dx,dy,anchor='start')=>`<circle cx="${P.x(x).toFixed(1)}" cy="${P.y(-Math.log(x)).toFixed(1)}" r="8" fill="${COL.loss}" stroke="#fff" stroke-width="2"/>`+label(P.x(x)+dx,P.y(-Math.log(x))+dy,txt,{size:21,fill:COL.ink,weight:650,anchor});
 return fig(560,380,P.axes+`<polyline points="${pts.join(' ')}" fill="none" stroke="${COL.loss}" stroke-width="3"/>`+gat(2,mark(.1,num(-Math.log(.1),2),14,-6)+mark(.5,num(-Math.log(.5),2),10,-16)+mark(CELL.p_dog,num(CELL.bce_dog,3),0,-22,'middle')),'The loss −log p falls from very large near p = 0 to zero at p = 1');};
O('bce','Scoring one yes/no answer: binary cross-entropy',{builds:2,
 body:cols(stack(eq(R`\text{yes }(\pcol{y}=1):\quad \lcol{-\log\qcol{p}}`),eq(R`\text{no }(\pcol{y}=0):\quad \lcol{-\log(1-\qcol{p})}`),small(`${kp('p')}: the score the network gave this class; ${kt('y')}: the target, 1 or 0. Natural logarithms.`)),bcePlot(),'1fr 1.1fr'),
 lines:['A class score answers one yes/no question. If the answer is yes, the loss is −log p; if no, −log(1 − p), the same curve mirrored.',`For a yes: sure and right costs almost nothing; unsure (0.5) costs ${num(-Math.log(.5),2)}; sure and wrong (0.1) costs ${num(-Math.log(.1),2)}. Our dog cell, ${num(CELL.p_dog,3)}: ${num(CELL.bce_dog,3)}.`],
 ask:['What is the loss for a yes answered with p = 1?','Why does the curve shoot up near p = 0?'],
 expected:['0: −log 1 = 0.','Being confidently wrong is punished hardest: −log p grows without bound as p → 0.'],
 point:'The two cases are one formula: BCE(p, y) = −[y log p + (1 − y) log(1 − p)].',
 transition:'Apply it to all 80 questions at our cell.'});
O('loss-cells','The loss at two cells: the dog’s, and an empty one',{part:'B',builds:3,
 body:sm(eq(R`\text{dog’s cell, classes: }\underbrace{-\log\qcol{${num(CELL.p_dog,3)}}}_{\text{dog: }\pcol{y=1}}+\underbrace{\textstyle\sum_{79}-\log(1-\qcol{p_c})}_{\text{the rest: }\pcol{y=0}}=${num(CELL.bce_dog,3)}+${num(CELL.bce_others,4)}=\lcol{${num(CELL.bce_total,3)}}`),
  at(2,eq(R`\text{dog’s cell, box: }${NG.pred.map((v,i)=>R`|\qcol{${num(v,2)}}-\pcol{${num(NG.dog[i],2)}}|`).join('+')}=\lcol{${num(NG.l1,2)}}\ \text{cells}`)),
  at(3,eq(R`\text{empty cell }(${CELL.bg_row},${CELL.bg_col})\text{: }\textstyle\sum_{80}-\log(1-\qcol{p_c})=\lcol{${num(CELL.bg_bce,4)}}\ \ (\text{all }\pcol{y=0}),\ \ \text{no box}`))),
 lines:['At the dog’s cell, the class part: dog is a yes, so −log 0.871. The other 79 are near-certain noes and add almost nothing.',
  `The box part: the L1 distance between ${kp('the predicted')} and ${kt('the target')} box numbers, in cells.`,
  'At an empty cell there is no box to compare, only the class part, and it is tiny: every class there is already near 0.'],
 ask:['Where does most of the dog cell’s class loss come from?','How is the box part computed?','Why is there no box term at an empty cell?'],
 expected:['From the dog question: −log 0.871 = 0.139.',`Four absolute differences, network against target: ${NG.l1_terms.map(v=>num(v,2)).join(' + ')} ≈ ${num(NG.l1,2)}.`,'There is no object there, so no box to compare with.'],
 point:'Ng’s localiser used squared errors throughout; detectors today use binary cross-entropy for the classes and an L1 or IoU-based box loss.',
 transition:'Put the pieces together.'});
O('loss-total','The loss for the whole photo, on the real grid',{part:'B',builds:3,
 body:stack(eq(R`\lcol{\mathcal{L}}=\underbrace{\sum_{\text{all 600 cells}}\ \sum_{c=1}^{80}\mathrm{BCE}(\qcol{p_c},\pcol{y_c})}_{\text{class: every cell}}\;+\;\underbrace{\sum_{\text{object cells}}\mathcal{L}_\text{box}(\qcol{\hat b},\pcol{b})}_{\text{box: 2 cells here}}`),
  at(2,`<div class="eq-sm">${eq(R`600\times80=${bt(48000)}\ \text{class terms},\qquad 2\ \text{box terms}`)}</div>`),
  at(3,p('One number for the photo; gradient descent lowers it.'))),
 lines:['The loss for the photo: class terms from every cell, box terms only from the cells that hold an object.',
  'Count them for our photo. The 598 empty cells still matter: they learn to say nothing.',
  'Every cell uses the same weights, so every cell learns from every object in every photo.'],
 ask:['Which cells add class terms? Box terms?','How many class terms are there?','Why does every cell learn from the dog?'],
 expected:['Every cell; only the object cells.','600 × 80 = 48,000.','The weights are shared: the same layers write every cell’s record.'],
 point:'Real detectors weight the two parts and average over objects: YOLOv1 used 5 for the box terms and 0.5 for empty cells. YOLOv8’s loss has the same structure over its three grids.',
 transition:'At test time there are no annotations: read the boxes out.'});
O('opt-two-stage','Two-stage detectors: propose, then classify',{builds:1,
 body:stack(p('<b>Stage 1</b>, a region proposal network: about 2,000 boxes that might contain something. <b>Stage 2</b>: crop features for each proposal (RoI pooling), classify it and refine its box.'),p('R-CNN (2014) ran a CNN per proposal; Fast R-CNN (2015) shared one CNN pass; Faster R-CNN (2015) learned the proposals too. Mask R-CNN adds a mask per proposal: Lecture 23.'),small('torchvision’s fasterrcnn_resnet50_fpn returns post-processed detections: its NMS is already inside.')),
 ask:['What does the first stage output?'],expected:['Class-agnostic candidate boxes (proposals), to be classified by the second stage.']});
O('opt-focal','Focal loss: quiet the easy background',{builds:1,
 body:stack(eq(R`\lcol{\mathrm{FL}(p_t)}=-(1-p_t)^{\gamma}\log p_t,\qquad p_t=\begin{cases}\qcol{p}&\pcol{y}=1\\1-\qcol{p}&\pcol{y}=0\end{cases}`),p(`A background cell (${kt('y = 0')}) with ${kp(`p = ${num(CELL.bg_max,3)}`)}: p<sub>t</sub> = ${num(1-CELL.bg_max,3)}, so with γ = 2 its loss is multiplied by (1 − p<sub>t</sub>)² ≈ 10⁻⁶. Easy examples nearly vanish; hard ones keep their weight.`),small('RetinaNet (Lin et al., 2017) made one-stage detectors as accurate as two-stage ones this way.')),
 ask:['Which examples does focal loss down-weight?'],expected:['Easy ones, where p_t is close to 1: mostly background.']});
O('opt-formats','Box formats in practice',{builds:1,
 body:`<div class="table-sm">${table(['where','format','the dog'],[['torchvision','corners, pixels',`(${DOG.join(', ')})`],['COCO json','(x, y, w, h), top-left, pixels',`(${DOG[0]}, ${DOG[1]}, ${S.dog.w}, ${S.dog.h})`],['YOLO label file','normalised (c<sub>x</sub>, c<sub>y</sub>, w, h)',`(${nrm.map(v=>num(v,3)).join(', ')})`],['DETR output','normalised (c<sub>x</sub>, c<sub>y</sub>, w, h)','same as YOLO']])}</div>`,
 ask:['Why do format bugs often go unnoticed?'],expected:['Every format is four numbers; a model still trains, just badly. Draw your boxes on the image before training.']});
O('opt-letterbox','Resizing and padding move the boxes too',{builds:1,
 body:stack(p('Detectors often resize a photo to a fixed size and pad the rest (letterboxing). The boxes must get the same treatment: scale every coordinate by the resize factor, then add the padding offset.'),eq(R`960\times640\ \to\ 640\times427\ (r=\tfrac23),\ \text{pad 106 px above}:\quad y'=\tfrac23\,y+106`),small('Our photos are multiples of 32 on both sides, so this lecture ran the models without padding.')),
 ask:['What happens to the dog’s y₁ = 83 after this letterbox?'],expected:['⅔ × 83 + 106 ≈ 161.']});
O('opt-detr-family','After DETR',{builds:1,
 body:`<ul class="steps"><li><b>Deformable DETR</b> (2021): each query attends to a few sampled points per feature level; trains about 10× faster.</li><li><b>DINO, RT-DETR</b> (2022 and 2023): better queries and matching; real-time DETRs.</li><li><b>YOLOv10</b> (2024): one-to-many and one-to-one heads; NMS-free YOLO.</li><li><b>Open vocabulary</b> (OWL-ViT, Grounding DINO): classes given as text, matched with CLIP-like embeddings (the language-grounded vision lecture).</li></ul>`,
 ask:['What did DETR’s successors mainly improve?'],expected:['Training speed and small objects (deformable attention, multi-scale features, better query initialisation).']});

// real detections: the same evaluation on YOLOv8n's real boxes (moved from Part 8, which now uses a teaching example)
const ES=S.eval_street,stG=ES.gt;
O('street-eval','Real detections: people in the street photo',{part:'B',builds:3,
 body:stack(photo('street',W2,H2,stG.map(b=>gtBox(b,'',{w:4})).join('')+gat(2,ES.rows.filter(r=>r.hit).map(r=>prBox(r.box,'TP',{size:22,w:3,fill:COL.green})).join(''))+gat(3,ES.rows.filter(r=>!r.hit).map(r=>rect(r.box,{stroke:COL.loss,w:2.5})).join('')),'Annotated people, and YOLOv8n’s detections marked true or false positives',{view:[60,322,1140,308]}),
  `<div class="state-slot">${only(1,ps(`Teal: the 4 annotated people. YOLOv8n’s person detections after NMS, down to score 0.01: ${ES.rows.length}.`))}${only(2,ps(`The 4 most confident (${ES.rows.filter(r=>r.hit).map(r=>num(r.score,3)).join(', ')}) each claim a different person, IoU ${ES.rows.filter(r=>r.hit).map(r=>num(r.iou,2)).join(', ')}: <span class="hit">4 TP</span>.`))}${only(3,ps(`The other ${ES.rows.length-4} (scores ${num(ES.rows[4].score,3)} down to ${num(ES.rows.at(-1).score,3)}) sit on the car’s windscreen, IoU 0 with every person: <span class="miss">${ES.rows.length-4} FP</span>. No person is missed: 0 FN.`))}</div>`),
 lines:['We keep every person detection down to a score of 0.01, so that the wrong ones show up too.','The four most confident boxes each land on a different person.','The rest sit on the car’s windscreen, where nobody is.'],
 ask:['How many annotated people?','Which detections are true positives?','What are the low-scoring boxes?'],
 expected:['Four.','The top four, each with IoU above 0.9.','False positives on the car: the network half-sees a driver.'],
 transition:'Turn the counts into precision and recall.',source:YOLO_SRC});
O('pr-street','The street’s people at two score cut-offs',{part:'B',builds:2,
 body:stack(`<div class="table-sm">${table(['keep scores ≥','TP','FP','FN','precision','recall'],[['0.25','4','0','0','4/4 = 1','4/4 = 1'],[at(2,'0.01'),at(2,'4'),at(2,String(ES.rows.length-4)),at(2,'0'),at(2,`4/${ES.rows.length} = ${num(4/ES.rows.length,2)}`),at(2,'4/4 = 1')]])}</div>`),
 lines:['With the usual 0.25 score cut-off, the street photo is perfect: four people found, nothing extra. Precision 1, recall 1.',`Keep everything down to 0.01 and the ${ES.rows.length-4} windscreen boxes join: recall stays 1, precision drops to ${num(4/ES.rows.length,2)}. The cut-off trades one for the other.`],
 ask:['What are precision and recall at 0.25?','What happens at 0.01?'],
 expected:['Both 1.',`Precision falls to ${num(4/ES.rows.length,2)}; recall stays 1.`],
 transition:'Now the other direction: Part 1’s bird.'});
const BE=S.bird_eval,lo=BE['0.05'],hi=BE['0.25'];
O('bird-threshold','Back to the bird: a lower cut-off finds it',{part:'B',builds:2,
 body:cols(photo('cat-dog-bird',W2,H2,gtBox(B.gt,'',{w:2.5})+gat(2,prBox(B.best.box,'',{w:2})+pill(B.best.box[0],B.best.box[1]-2,`bird ${num(B.best.score,3)}`,{fill:COL.guess,size:14})),'The bird with our box, and YOLOv8n’s box once the cut-off is 0.05',{view:birdView}),
  stack(`<div class="table-sm tight">${table(['keep scores ≥','found','TP','FP','FN','precision','recall'],[['0.25',hi.found.join(', '),String(hi.tp),String(hi.fp),String(hi.fn),num(hi.precision,2),`${hi.tp}/${hi.tp+hi.fn}`],[at(2,'0.05'),at(2,lo.found.join(', ')),at(2,String(lo.tp)),at(2,String(lo.fp)),at(2,String(lo.fn)),at(2,num(lo.precision,2)),at(2,`${lo.tp}/${lo.tp+lo.fn}`)]])}</div>`),'0.8fr 1.4fr'),
 lines:[`At the usual 0.25: the cat and the dog are found, the bird (${num(B.best.score,3)}) is missed. Precision 1, recall ${hi.tp}/${hi.tp+hi.fn}.`,`At 0.05 the bird’s box gets through: recall ${lo.tp}/${lo.tp+lo.fn}, and nothing false comes with it. On the street, going lower brought eight false people.`],
 ask:['What do precision and recall say at 0.25?','Should we always lower the cut-off?'],
 expected:[`Precision 1, recall ${hi.tp}/${hi.tp+hi.fn}: everything reported was right, but the bird was missed.`,'It depends on what a miss costs against a false alarm: a camera trap counting rare birds wants recall; a car that brakes for every false person wants precision.'],
 point:'Only the seven annotated classes count here; the potted plants are ignored, as in the benchmark.',
 transition:'AP on all the real person boxes.',source:YOLO_SRC});
const APP=S.ap_play;
O('ap-play','Try it: AP on real detections',{part:'B',builds:1,
 body:widget('ap-play','Move the sliders: the IoU an overlap needs, and how far down the ranked list to keep'),
 lines:[`YOLOv8n’s ${APP.dets.length} person detections on our eight photos, ranked by score, against ${APP.gt.length} people. Raise the IoU threshold: from 0.85, loose boxes turn into false positives.`],
 ask:['At which IoU threshold does AP first drop below 1?'],expected:['At 0.85: a few boxes overlap their person with an IoU between 0.80 and 0.85.'],
 point:`The AP here reads the envelope at 101 recall values, as COCO does. The mean of the ten thresholds is ${num(APP.ap,3)}, the person AP of the next slides.`,
 transition:'One of those boxes, up close.',source:YOLO_SRC});
// COCO's AP averages ten IoU thresholds: Part 1's 13-pixel pedestrian, a pixel off, is right at 0.85 and wrong at 0.90
const AE=S.ap_example,aeView=[AE.gt[0]-22,AE.gt[1]-12,(AE.gt[2]-AE.gt[0])+44,(AE.gt[3]-AE.gt[1])+24];
const thrRow=fig(620,100,APP.thresholds.map((t,i)=>{const ok=AE.iou>=t,c=ok?COL.green:COL.loss;return `<rect x="${5+i*61}" y="6" width="55" height="44" rx="6" fill="${c}" fill-opacity=".16" stroke="${c}" stroke-width="2.5"/>`+
 label(5+i*61+27.5,35,ok?'TP':'FP',{size:19,anchor:'middle',fill:c,weight:700})+label(5+i*61+27.5,80,num(t).replace(/^0/,''),{size:17,anchor:'middle',fill:COL.ink});}).join(''),
 'At IoU thresholds up to 0.85 this box is a true positive; at 0.90 and 0.95 it is a false positive');
O('map-iou-real','Real detections: COCO’s ten IoU thresholds on a 13-pixel pedestrian',{part:'B',builds:3,
 body:cols(photo('scale',W2,H2,gtBox(AE.gt,'',{w:.7})+rect(AE.box,{stroke:COL.guess,w:.7,dash:'1.6 1.1'}),'Part 1’s far pedestrian, about 13 pixels wide: our box and YOLOv8n’s box nearly coincide',{view:aeView,cls:'short'}),
  `<div class="state-slot">${only(1,stack(`<div class="eq-sm">${eq(R`\mathrm{IoU}(\text{YOLOv8n},\text{ours})\approx${num(AE.iou,2)}`)}</div>`,thrRow))}`+
  `${only('2-3',stack(apBars(APP.ap_by,APP.thresholds.map(t=>num(t).replace(/^0/,'')),{mean:APP.ap}),at(3,`<div class="eq-sm">${eq(R`\mathrm{AP}_{[.5:.95]}=\tfrac1{10}\sum_t\mathrm{AP}_t=${num(APP.ap,3)}`)}</div>`)))}</div>`,'0.62fr 1.38fr'),
 lines:[`Part 1’s 13-pixel pedestrian: YOLOv8n’s box is a pixel off, IoU ${num(AE.iou,2)}. A true positive up to a threshold of 0.85; a false positive at 0.90 and 0.95.`,
  `Person AP at each of COCO’s ten thresholds: 1 up to 0.80, then ${APP.ap_by.slice(7).join(', ')}, as boxes that are slightly loose stop counting.`,
  `COCO’s headline AP averages the ten: ${num(APP.ap,3)}. It rewards boxes that are tight, not just roughly right.`],
 ask:['Why does a one-pixel slip matter so much here?','Why does AP fall only at the strict thresholds?','What does averaging over thresholds reward?'],
 expected:['The pedestrian is 13 pixels wide: one pixel is almost a tenth of its width.','Every person is found with IoU above 0.8; only some boxes are tighter than 0.85, 0.90 or 0.95.','Tight boxes: a box that is only roughly right counts at 0.5 but not at 0.9.'],
 point:'COCO calls this AP (or AP@[.50:.95]); AP50 and AP75 are the values at 0.50 and 0.75. Small objects suffer most, because a pixel is a large share of their size; COCO also reports AP for small, medium and large objects.',
 transition:'Average over the classes too.',source:YOLO_SRC});

// the six jobs of Part 1, revisited
const everyday=[['road','far pedestrians are tiny','the fine grid (Part 7); follow boxes across frames'],
 ['crowd','people stand close and overlap','check the NMS threshold (Part 6)'],
 ['camera trap','small animals get unsure scores, like the bird','a lower cut-off (Part 8); more photos of small animals']];
const specialist=[['microscope','cell types','cells touch','label cells, fine-tune; NMS must keep touching cells'],
 ['warehouse','parcel','many sizes','label parcels, fine-tune the same detector'],
 ['factory','crack, scratch, dent','thin, small defects','higher resolution, the fine grid; measure recall']];
O('apps-again','Back to the six jobs: the three everyday ones',{builds:2,
 body:`<div class="table-sm">${table(['job','what is hard','what to do'],everyday.map(([j,h,d])=>[j,h,at(2,d)]))}</div>`,
 lines:['A pretrained COCO detector already knows these classes. What is hard in each job?','What remains is tuning: the grids, the NMS threshold, the score cut-off.'],
 ask:['What makes each of these jobs hard?','What would you change for each?'],
 expected:['Tiny far pedestrians; people who overlap; small animals with unsure scores.','Rely on the fine grid; check the NMS threshold; lower the score cut-off.'],
 transition:'The three specialist jobs.'});
O('apps-new','Back to the six jobs: the three new ones',{builds:2,
 body:`<div class="table-sm">${table(['job','new classes','what is hard','what to do'],specialist.map(([j,c,h,d])=>[j,c,h,at(2,d)]))}</div>`,
 lines:['COCO has none of these classes, so no pretrained detector finds them as it is.','Label a few hundred photos with boxes, fine-tune the same detector, and measure precision and recall on photos it has not seen.'],
 ask:['Could a COCO detector do these jobs as it is?','What would you do first for the microscope job?'],
 expected:['No: their classes are not among COCO’s 80.','Annotate cells with boxes, fine-tune a pretrained detector on them, and measure precision and recall.'],
 point:'Fine-tuning starts from COCO weights: the CNN already knows edges, textures and shapes; only the heads must learn the new classes.',
 transition:'Next lecture.'});
O('next','Next: beyond boxes',{builds:1,
 body:cols(courtyard(masks(),'Masks for the cat and the dog'),stack(p('A box is a rough answer. Next lecture: which pixels belong to each object (masks), keypoints, depth, and boxes found from words: “the dog on the right”.'),
  p('<a href="https://nipunbatra.github.io/attention/beyond-boxes/">Beyond Boxes</a> · <a href="https://nipunbatra.github.io/attention/language-grounded-vision/">Language-grounded vision</a>'),
  p(`Practice: <a href="${COLAB}">the notebook</a> runs every number in this lecture. Appendices: <a href="?all#part-A/1">A, DETR</a> · <a href="?all#opt-yolov1/1">B, more depth</a>.`)),'1.2fr 1fr'),
 lines:['Boxes are the coarsest description of where an object is. Next: masks, keypoints, and finding objects named in words.'],
 ask:['What does a mask give that a box does not?'],expected:['Exactly which pixels are the object.'],
 transition:'End of the main route.',source:'Masks: YOLOv8n-seg run on the photo (scripts/run_models.py).'});


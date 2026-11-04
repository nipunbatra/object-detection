// Object detection, Lecture 22 of ES 667. One photo carries the lecture: a cat and a dog in a courtyard.
// Every number comes from data/science.json, which scripts/science.py computes from real YOLOv8n and DETR outputs.
import {m,eq,at,only,cols,code,table,flow,palette,esc,highlight} from './shared/author.js';
import {photo,rect,pill,label,line,arrow,gridLines,cell,heat,fig,svg,widget,panel,num,big,COL,MUTED,iouParts,mount as mountWidgets} from './widgets.js';

const S=await fetch(new URL('./data/science.json',import.meta.url),{cache:'no-cache'}).then(r=>r.json());
export const mount=(stage,ctx)=>mountWidgets(stage,ctx,S);
const R=String.raw;
const p=s=>`<p class="lead">${s}</p>`;
const small=s=>`<p class="caption">${s}</p>`;
const stack=(...a)=>`<div class="equation-stack">${a.join('')}</div>`;
const ps=s=>`<p class="small">${s}</p>`;
const bt=v=>big(v).replaceAll(',','{,}');   // a thousands comma inside TeX, without KaTeX's list spacing
const sm=(...a)=>`<div class="equation-stack eq-sm">${a.join('')}</div>`;
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
 subtitle:'From one label to a set of objects',minutes:118,notebook:'object-detection.ipynb',
 sections:[
  {id:'map',title:'Lecture map',minutes:1},
  {id:'why',title:'Part 1 · Why detect objects?',minutes:12},
  {id:'task',title:'Part 2 · From one label to a list',minutes:9},
  {id:'boxes',title:'Part 3 · Boxes and IoU',minutes:16},
  {id:'onebox',title:'Part 4 · One box, then many',minutes:13},
  {id:'dense',title:'Part 5 · A candidate at every place',minutes:26},
  {id:'nms',title:'Part 6 · One box per object: NMS',minutes:16},
  {id:'scales',title:'Part 7 · Three grids for three sizes',minutes:6},
  {id:'eval',title:'Part 8 · Measuring a detector',minutes:14},
  {id:'wrap',title:'Wrap-up',minutes:5},
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
 ['4.1','One object, one box'],['4.2','Several objects, several slots'],
 ['5.1','From sliding windows to one pass'],['5.2','YOLO: a record in every cell'],['5.3','In practice, and the loss'],['5.4','Reading boxes back out'],
 ['6.1','Non-maximum suppression'],['6.2','Thresholds and classes'],
 ['7.1','Three grids'],
 ['8.1','Right or wrong?'],['8.2','Precision, recall, AP'],
 ['9.1','Summary'],
 ['A.1','Slots that read the image'],['A.2','Matching slots to objects'],['A.3','Two answers'],
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
  body:`<div class="part-break">${strip(k)}<ol class="steps">${did.map(x=>`<li>${x}</li>`).join('')}</ol></div>`,
  lines:[`<b>Next:</b> ${next}`],ask:[o.ask],expected:[o.expected],point:o.point||'',transition:o.transition});
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
const routeRows=[['3','Boxes and IoU','four numbers for a box; IoU to compare two'],['4','One box, then many','one box works; several break the loss'],
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
recap(3,'boxes',[`A box is four numbers: corners (${DOG.join(', ')}), or centre and size.`,
 'A label file holds one line per object: a class and four numbers.',`IoU = overlap ÷ union: 1 for the same box, 0 for boxes apart. The 60-px guess: ${num(ip.iou,3)}.`,'IoU ≥ 0.5 is the usual “found it”.'],
 'ask a network for one box, then several, and see where it breaks.',
 {ask:'What is the IoU of two identical boxes, and of two boxes that do not touch?',expected:'1 and 0.',transition:'Part 4.'});

// ================================================================================================ Part 4
partBreak(4,'onebox','One box is easy; several are not','A network can output four numbers for one box. Asking it for several boxes shows the real problem.',[
 'Add a box head to a classifier; write the target it learns, with and without an object.','Ask the same head for two animals, and see it hedge.','Give it K slots: count and order break the loss.'],
 {line:'One box is plain regression. Several boxes raise a new question: which output answers for which object?',ask:'What could go wrong with two objects and one box output?',expected:'The network cannot know which object to describe; it may average them.',transition:'One object first.'});
chap('4.1');
S_('one-object','onebox','One object: a box head beside the class head',{builds:3,
 body:flow([
  {id:'img',x:10,y:110,w:150,h:90,label:'photo',role:'data'},
  {id:'cnn',x:220,y:110,w:170,h:90,label:'CNN',sub:'backbone',role:'ink'},
  {id:'vec',x:450,y:110,w:150,h:90,label:'features',sub:'one vector',role:'ink'},
  {id:'cls',x:690,y:20,w:290,h:90,label:'class head',sub:'C scores → cross-entropy',role:'q'},
  {id:'box',x:690,y:200,w:290,h:90,label:'box head',sub:'4 numbers → L1 loss',role:'p'}],
  [{from:'img',to:'cnn'},{from:'cnn',to:'vec'},{from:'vec',to:'cls',role:'q'},{from:'vec',to:'box',role:'p'}],{width:1000,height:310,label:'A classifier with an extra head that outputs four box numbers'}),
 lines:['A classifier: a CNN turns the photo into one feature vector; a linear layer turns it into class scores.','Add a second small layer on the same vector that outputs four numbers: the box.','Train both at once: cross-entropy for the class, and a loss that compares the four box numbers with the annotation’s.'],
 ask:['What does the box head output?','Which part is shared?','What could the box loss be?'],
 expected:['Four numbers, for example a normalised (c_x, c_y, w, h).','The CNN and its feature vector.','Any distance between the four predicted and four true numbers, such as the sum of absolute differences.'],
 transition:'What exactly should the network learn to write?'});
const SG=S.single;
const yvec=(vals,cls)=>`<div class="yvec">${[['object?',vals[0]],[m('c_x'),vals[1]],[m('c_y'),vals[2]],[m('w'),vals[3]],[m('h'),vals[4]],['cat',vals[5]],['dog',vals[6]]].map(([k,v],i)=>`${i===1||i===5?'<i></i>':''}<div class="${cls}"><small>${k}</small>${v}</div>`).join('')}</div>`;
S_('target-y','onebox','Write the answer as numbers: the target for one photo',{builds:3,
 body:stack(cols(photo('cat',W2,H2,gtBox(SG.box,'cat',{size:44,w:8}),'The single-cat photo with its box',{cls:'short'}),yvec([1,...SG.norm.map(v=>num(v,3)),1,0],'t'),'0.62fr 1.38fr'),
  at(2,cols(photo('cat',W2,H2,'','A patch of empty floor',{view:[40,370,560,320],cls:'short'}),yvec([0,'?','?','?','?','?','?'],'q')+at(3,small('Only “object?” is learned here: each <b>?</b> is left out of the loss.')),'0.62fr 1.38fr'))),
 lines:['For two classes, a localiser writes seven numbers: is there an object, its box, and which class. Here: 1, the cat’s box, cat 1, dog 0.',
  'A photo of empty floor. “Object?” is 0. Its box and class have no right answer, so the target there is “?”.',
  'The loss counts only entries with a right answer: for the floor, just the first. A detector meets this “?” at most places in a photo.'],
 ask:['What are the seven target numbers for the cat photo?','What should the box be for a photo with no object?','Which entries does the loss use for the floor photo?'],
 expected:[`1; then (${SG.norm.map(v=>num(v,3)).join(', ')}); then cat 1, dog 0.`,'Nothing: there is no box, so we do not care what the network writes there.','Only “object?”, with target 0.'],
 point:'This is how Andrew Ng introduces localisation (Deep Learning Specialization, Course 4, Week 3): y = (p_c, b_x, b_y, b_h, b_w, c_1, c_2, c_3), with “?” for every entry after p_c = 0.',
 transition:'Train the box part, with numbers.',source:'Our annotation of the single-cat photo (data/annotations.json). '+PHOTO_SRC});
const gn=[(guess[0]+guess[2])/2/W,(guess[1]+guess[3])/2/H,(guess[2]-guess[0])/W,(guess[3]-guess[1])/H];
S_('box-loss','onebox','Training the box head: compare four numbers',{builds:3,
 body:stack(eq(R`\mathcal{L}_\text{box}=\sum_{k=1}^{4}\big|\,\qcol{\hat b_k}-\pcol{b_k}\,\big|`),
  at(2,`<div class="table-sm">${table(['',m('c_x'),m('c_y'),m('w'),m('h')],[[tgt('target (the dog)'),...nrm.map(v=>tgt(num(v,3)))],[gss('prediction (the guess)'),...gn.map(v=>gss(num(v,3)))],['|difference|',...gn.map((v,i)=>num(Math.abs(v-nrm[i]),3))]])}</div>`),
  at(3,eq(R`\mathcal{L}_\text{box}=${gn.map((v,i)=>num(Math.abs(v-nrm[i]),3)).join('+')}=\lcol{${num(gn.reduce((s,v,i)=>s+Math.abs(v-nrm[i]),0),3)}}`))),
 lines:['The L1 box loss: for each of the four numbers, the absolute difference between prediction and target; add them.','Take the 60-px guess from Part 3 as the prediction, in normalised units. The centre is off; the size is right.',`Loss ${num(gn.reduce((s,v,i)=>s+Math.abs(v-nrm[i]),0),3)}. It is zero only if all four numbers match; gradient descent moves the four outputs toward the target.`],
 ask:['What does the loss add up?','Which numbers differ here?','When is the loss zero?'],
 expected:['Four absolute differences.','The centre (c_x and c_y); width and height match.','When all four predicted numbers equal the target’s.'],
 point:'Normalised units keep the four terms on one scale; the notebook trains exactly this head on single-object images.',
 transition:'Now two animals.'});
const ab=S.average_box;
S_('two-objects','onebox','Two animals, one box: which one should it draw?',{builds:3,
 body:cols(courtyard(gtBox(DOG,'dog',{size:30})+gtBox(CAT,'cat',{size:30})+gat(2,prBox(ab.box,'',{w:6,dash:'14 8'})+pill(ab.box[0]+6,ab.box[3]-8,'the average',{fill:COL.guess,size:30})),'The dog box, the cat box, and their average'),
  stack(p('The annotation lists both animals. The head has room for one box.'),
   at(2,p('Its safest single answer lies in between: the average box.')),
   at(3,`<div class="eq-sm">${eq(R`\mathrm{IoU}(\text{avg},\text{dog})=${num(ab.iou_dog,3)}`)}${eq(R`\mathrm{IoU}(\text{avg},\text{cat})=${num(ab.iou_cat,3)}`)}</div>`)),'1.25fr 1fr'),
 lines:['One box head, two animals. Which should it draw?','If some annotations list the dog first and some the cat, a squared error is smallest for the average of the two boxes: the network learns to hedge.','A box between two objects describes neither of them.'],
 ask:['Which animal should the single box describe?','What does a squared-error loss learn when the target flips between two boxes?','Does the average box find either animal?'],
 expected:['There is no right answer: the task is ill-posed.','The average of the two boxes, the value that minimises the expected squared error.',`No: IoU ${num(ab.iou_dog,2)} and ${num(ab.iou_cat,2)}, both far below 0.5.`],
 misconception:'More training does not fix it: the hedge is the optimum of this loss for this task.',
 transition:'Give the head more than one output.',source:PHOTO_SRC});
chap('4.2');
// K slots: the target for our photo, one row per slot (dog, cat, then three spare slots)
const slotGrid=()=>{const rows=[['dog',S.dog.norm],['cat',S.cat.norm],null,null,null];
 return `<div class="slotgrid"><span></span><b>class</b>${[m('c_x'),m('c_y'),m('w'),m('h')].map(k=>`<b>${k}</b>`).join('')}`+
  rows.map((r,i)=>`<span class="sl">slot ${i+1}</span>`+(r?[r[0],...r[1].map(v=>num(v,3))].map(v=>`<div class="t"><span data-at="2">${v}</span></div>`).join('')
   :['no object','?','?','?','?'].map(v=>`<div class="q"><span data-at="3">${v}</span></div>`).join(''))).join('')+'</div>';};
S_('k-slots','onebox','Give the head K slots',{builds:4,
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
S_('slots-crowd','onebox','Problem 1: more objects than slots',{builds:2,
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
S_('slot-order','onebox','Problem 2: which dog belongs in slot 1?',{builds:4,
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
S_('two-fixes','onebox','Two ways to decide which output answers for which object',{builds:2,
 body:`<div class="compare">${at(1,`<div class="a"><h3>A · by place</h3><ul><li>Each output owns a place in the image</li><li>Outputs at the dog’s place answer for the dog</li></ul><p class="caption">Parts 5 to 7: YOLO and most fast detectors</p></div>`)}${at(2,`<div class="b"><h3>B · by matching</h3><ul><li>Keep free slots</li><li>Before the loss, match slots to objects one to one, at the lowest total cost</li></ul><p class="caption">Appendix A, optional</p></div>`)}</div>`,
 lines:['Fix A gives every output a fixed place in the image, and whatever is there is its job, so order cannot matter.','Fix B keeps free slots and, before each loss, matches them to objects at the lowest total cost, so order cannot matter either.'],
 ask:['How does fix A remove the order problem?','How does fix B?'],
 expected:['An output answers for the object at its place; there is nothing to order.','The pairing is chosen by cost, not by position in the list.'],
 transition:'Part 4 in one slide.'});
recap(4,'onebox',['One box: a box head, an L1 loss; with no object, the box target is “?”.',
 `Two animals, one box: it learns the average box, which matches neither (IoU ${num(ab.iou_dog,2)}, ${num(ab.iou_cat,2)}).`,
 `K slots: too few for a crowd, and pairing by list order punishes a perfect answer (${num(sl.perfect,2)} instead of 0).`,
 'Fix A: tie each output to a place in the photo.'],
 'fix A, a grid of cells, each writing a box and class scores.',
 {ask:'Why did the same correct prediction cost 100 times more?',expected:'Because the loss paired outputs with targets by list position, and the list happened to be in the other order.',transition:'Part 5.'});
// ================================================================================================ Part 5
partBreak(5,'dense','A candidate at every place','Tie each output to a place: a grid of cells over the photo, each writing one record.',[
 'From sliding windows to one CNN pass.','YOLO: a grid, and Part 4’s record in every cell.','In practice: a fine grid, and the loss cell by cell.','At test time every cell gives a box; keep the confident ones.'],
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
// sliding: a 224-px window on the dog, the same window stepping 32 px along a row, then other sizes and shapes (examples)
const win0=[440,130,440+WN.size,130+WN.size],slideRow=[0,1,2,3,4].map(i=>[win0[0]+i*WN.shift,win0[1],win0[2]+i*WN.shift,win0[3]]);
const winShapes=[[507,255,667,415],[477,115,697,555],[367,225,807,445]];
S_('sliding','dense','Slide the classifier over the photo',{builds:3,
 body:cols(courtyard(gonly(1,rect(win0,{stroke:COL.guess,w:6}))+gonly(2,slideRow.map((b,i)=>rect(b,{stroke:COL.guess,w:i?3:6,op:i?.7:1})).join(''))+gonly(3,winShapes.map(b=>rect(b,{stroke:COL.amber,w:6,dash:'14 8'})).join('')),'A window on the dog, the same window moved 32 pixels at a time, and windows of other sizes and shapes'),
  stack(at(1,p(`Crop a ${WN.size} × ${WN.size} window and classify it: dog.`)),
   at(2,`<div class="eq-sm">${eq(R`\tfrac{${W}}{${WN.shift}}\times\tfrac{${H}}{${WN.shift}}=${WN.cols}\times${WN.rows}=${WN.positions}\ \text{places}`)}</div>`),
   at(3,`<div class="eq-sm">${eq(R`${WN.positions}\times\underbrace{${WN.sizes}}_{\text{sizes}}\times\underbrace{${WN.shapes}}_{\text{shapes}}=${bt(WN.crops)}\ \text{crops}`)}</div>`)),'1.2fr 1fr'),
 lines:[`Put a ${WN.size}-pixel window on the photo, crop it and classify it. This one says “dog”.`,
  `Move the window ${WN.shift} pixels at a time, across and down: ${WN.cols} places across, ${WN.rows} down.`,
  `Objects come in many sizes and shapes, so try ${WN.sizes} sizes and ${WN.shapes} shapes at every place. Each crop is a full run of the classifier.`],
 ask:['What does the classifier say about this window?','How many places are there?','How many classifier runs per photo?'],
 expected:['Dog.',`${W} ÷ ${WN.shift} = ${WN.cols} across, ${H} ÷ ${WN.shift} = ${WN.rows} down: ${big(WN.positions)}.`,`${big(WN.positions)} × ${WN.sizes} × ${WN.shapes} = ${big(WN.crops)}.`],
 point:'Detectors around 2013 worked like this (OverFeat). R-CNN (2014) classified about 2,000 proposed crops per image and needed about 47 seconds per image at test time (CS231n, 2017): Appendix B, two-stage detectors. The sizes and shapes drawn are examples.',
 transition:'Look at two neighbouring windows.',source:PHOTO_SRC});
const wA=[380,120,380+WN.size,120+WN.size],wB=[380+WN.shift,120,380+WN.shift+WN.size,120+WN.size];
S_('shared-work','dense','Neighbouring windows see almost the same pixels',{builds:2,
 body:cols(courtyard(rect([wB[0],wA[1],wA[2],wA[3]],{stroke:'none',w:0,fill:COL.guess,op:.2})+rect(wA,{stroke:COL.guess,w:5})+rect(wB,{stroke:COL.amber,w:5,dash:'12 7'}),'Two windows 224 pixels wide, 32 pixels apart, sharing most of their pixels',{view:[300,40,460,360]}),
  stack(p(`Two windows ${WN.size} px wide, ${WN.shift} px apart. Columns they share:`),
   `<div class="eq-sm">${eq(R`\frac{${WN.size}-${WN.shift}}{${WN.size}}=\frac{${WN.size-WN.shift}}{${WN.size}}=${num(WN.shared,2)}`)}</div>`,
   at(2,p(`${big(WN.crops)} runs, each redoing work its neighbours already did.`))),'1.1fr 1fr'),
 lines:['Classify neighbouring windows separately and the features of their shared pixels are computed again and again.',
  'If that shared work were done once, all the runs could collapse into one. A small example shows how a CNN does it.'],
 ask:['How much do neighbouring windows overlap?','Where is the waste?'],
 expected:[`${WN.size-WN.shift} of every ${WN.size} columns: ${Math.round(WN.shared*100)}%.`,'The features of the shared pixels are computed once for every window that contains them.'],
 point:'Ng calls the fix the convolutional implementation of sliding windows (after OverFeat, Sermanet et al., 2014): build the classifier from convolutions only, and the whole photo is classified at every position in one pass.',
 transition:'A small example.',source:PHOTO_SRC});
// Ng's example: a classifier built from convolutions takes a 14 x 14 crop to one answer, and a 16 x 16 image to 2 x 2 answers
const ngFig=(()=>{const u=13,x0=24,y0=34,col=[COL.guess,COL.target,COL.amber,COL.data],off=[[0,0],[2,0],[0,2],[2,2]],ox=420;
 const sq=n=>{let g='';for(let i=0;i<=n;i++)g+=line(x0+i*u,y0,x0+i*u,y0+n*u,{stroke:'#C9D0D7',w:1})+line(x0,y0+i*u,x0+n*u,y0+i*u,{stroke:'#C9D0D7',w:1});return g;};
 const out=(n,coloured)=>{const s=64,oy=y0+(16*u-n*s)/2;let g='';for(let r=0;r<n;r++)for(let c=0;c<n;c++){const i=r*2+c;g+=`<rect x="${ox+c*s}" y="${oy+r*s}" width="${s-6}" height="${s-6}" rx="6" fill="${coloured?col[i]:'#fff'}" fill-opacity="${coloured?.8:1}" stroke="${coloured?col[i]:COL.ink}" stroke-width="3"/>`;}return g;};
 const mid=arrow(x0+16*u+30,y0+8*u,ox-24,y0+8*u,{stroke:COL.ink,w:3,head:16})+label((x0+16*u+30+ox-24)/2,y0+8*u-14,'the same layers',{size:20,anchor:'middle',fill:COL.ink});
 return fig(560,290,gonly(1,sq(14)+rect([x0,y0,x0+14*u,y0+14*u],{stroke:COL.guess,w:4})+label(x0,y0+16*u+28,'a 14 × 14 crop',{size:21,fill:COL.ink,weight:650})+out(1,false)+label(ox,y0+16*u+28,'1 answer',{size:21,fill:COL.ink,weight:650}))+
  gonly('2-3',sq(16)+label(x0,y0+16*u+28,'a 16 × 16 image',{size:21,fill:COL.ink,weight:650})+out(2,false)+label(ox,y0+16*u+28,'2 × 2 answers',{size:21,fill:COL.ink,weight:650}))+
  gat(3,off.map(([dx,dy],i)=>rect([x0+dx*u+1.5*i,y0+dy*u+1.5*i,x0+(dx+14)*u-1.5*i,y0+(dy+14)*u-1.5*i],{stroke:col[i],w:3})).join('')+out(2,true))+mid,
  'A classifier for 14 by 14 crops gives one answer; on a 16 by 16 image the same layers give four, one for each 14 by 14 window');})();
S_('conv-windows','dense','A small example: the same classifier on a bigger image',{builds:3,
 body:cols(ngFig,sm(eq(R`14\xrightarrow{\text{conv }5\times5}10\xrightarrow{\text{pool }2}5\xrightarrow{\text{conv }5\times5}1`),
  at(2,eq(R`16\xrightarrow{\text{conv }5\times5}12\xrightarrow{\text{pool }2}6\xrightarrow{\text{conv }5\times5}2`)),
  at(3,eq(R`\text{window step}=\text{pooling step}=2\ \text{px}`))),'1.25fr 1fr'),
 lines:['A classifier built only from convolutions and pooling turns a 14 × 14 crop into one answer. Each 5 × 5 convolution trims 4 from the size.',
  'Feed the same layers a 16 × 16 image. Nothing in the network changes, yet the output grows to 2 × 2: four answers.',
  'Each answer is the classifier on one 14 × 14 window, the windows 2 pixels apart. The pixels they share are processed once.'],
 ask:['What does a 5 × 5 convolution do to a 14 × 14 input?','How many answers does a 16 × 16 image give?','Which window does the top-right answer belong to?'],
 expected:['It gives 10 × 10: 14 − 5 + 1 = 10.','2 × 2 = 4: 16 − 5 + 1 = 12, halved to 6, and 6 − 5 + 1 = 2.','The window 2 pixels to the right of the first: columns 2 to 15, rows 0 to 13.'],
 point:'Andrew Ng’s example (Deep Learning Specialization, Course 4, Week 3: convolutional implementation of sliding windows); the last layers are convolutions, so they accept any input size. The sizes are his, not YOLOv8’s.',
 transition:'Do the windows’ boxes fit the dog?'});
const BW=S.windows.best_dog;
S_('window-boxes','dense','A window’s box is not the dog’s box',{builds:2,
 body:cols(courtyard(gtBox(DOG,'dog',{size:28,w:6})+rect(BW.box,{stroke:COL.guess,w:6,dash:'14 8'}),'The dog’s box and the best 224-pixel window, which sits inside it',{view:dogView}),
  stack(p('The best 224-pixel window lies inside the dog:'),`<div class="eq-sm">${eq(R`\mathrm{IoU}=\frac{224\times224}{${S.dog.w}\times${S.dog.h}}=${num(BW.iou,3)}`)}</div>`,at(2,p('Let each place write its own box instead.'))),'1fr 1.1fr'),
 lines:['Even the best 224-pixel window fits the dog badly: the dog is 361 × 505 pixels, so the window sits inside it, and windows only sit every 32 pixels.',
  'Ng’s next step: stop cutting fixed windows, and let the network write a box of any size at each place. That is YOLO.'],
 ask:['What is the best IoU any 224-pixel window gets with the dog?','How can we get a box that fits?'],
 expected:[`${num(BW.iou,3)}: the window lies inside the dog, so IoU = 224² ÷ (361 × 505).`,'Let each place write a box, as Part 4’s localiser did for the whole photo.'],
 point:'Ng makes this point before YOLO: sliding windows cannot output accurate boxes, because their places and shapes are fixed in advance.',
 transition:'YOLO: a grid, and a record in every cell.',source:PHOTO_SRC});
chap('5.2');
// Ng's teaching grid: 3 x 2 cells of 320 px on the courtyard; every cell writes Part 4's 7-number record
const N3=S.ng3,s3=N3.size,CC=S.centre_cells,NG=S.ng,dot=(c,col)=>`<circle cx="${c[0]}" cy="${c[1]}" r="10" fill="${col}" stroke="#fff" stroke-width="4"/>`;
const grid3=(inner,alt,o={})=>courtyard(gridLines(W,H,s3,{stroke:'#fff',w:5,op:.95})+inner,alt,o);
const rec7=(vals,cls)=>`<div class="yvec sm">${[['object?',vals[0]],[m('b_x'),vals[1]],[m('b_y'),vals[2]],[m('b_w'),vals[3]],[m('b_h'),vals[4]],['cat',vals[5]],['dog',vals[6]]].map(([k,v],i)=>`${i===1||i===5?'<i></i>':''}<div class="${cls}"><small>${k}</small>${v}</div>`).join('')}</div>`;
const cellName=(r,c)=>label(c*s3+14,r*s3+44,`(${r}, ${c})`,{size:36,fill:COL.ink,weight:700,halo:true});
S_('grid-3x2','dense','YOLO: a grid on the photo, and Part 4’s record in every cell',{builds:2,
 body:cols(grid3([0,1].flatMap(r=>[0,1,2].map(c=>cellName(r,c))).join(''),'The courtyard photo with a 3 by 2 grid of 320-pixel cells'),
  stack(rec7(['','','','','','',''],'q'),at(2,`<div class="eq-sm">${eq(R`\underbrace{3\times2}_{\text{cells}}\times\underbrace{7}_{\text{numbers}}=42`)}</div>`)),'1fr 1fr'),
 lines:['Andrew Ng’s start: put a coarse grid on the photo, here 3 × 2 cells of 320 pixels, and give every cell Part 4’s one-object record.',
  'The record has 7 numbers: object?, a box, and a score each for cat and dog. Six cells of seven numbers: a 2 × 3 × 7 block.'],
 ask:['How many cells, and how big is each?','How many numbers make the whole answer?'],
 expected:[`3 × 2 = 6 cells, each ${W} ÷ 3 = 320 pixels wide and ${H} ÷ 2 = 320 tall.`,'2 × 3 × 7 = 42.'],
 point:'Ng draws a 3 × 3 grid and uses 19 × 19 in practice. We draw 3 × 2 so that the cells of our 960 × 640 photo are square. Rows and columns count from 0.',
 transition:'Which cell should describe the dog?',source:PHOTO_SRC});
const divRound=(name,c,cl,s)=>eq(R`\text{${name}: }${c[0]}\div${s}=${num(c[0]/s,2)},\ \ ${c[1]}\div${s}=${num(c[1]/s,2)}`)+eq(R`\Rightarrow\ \text{row }${cl[0]},\ \text{column }${cl[1]}`);
S_('centre-cell','dense','Which cell answers for the dog? The one that holds its centre',{builds:2,
 body:cols(grid3(gtBox(DOG,'dog',{size:30})+gtBox(CAT,'cat',{size:30})+cell(...N3.dog_cell,s3,{fill:COL.target,op:.28})+dot(CC.dog.centre,COL.target)+gat(2,cell(...N3.cat_cell,s3,{fill:COL.target,op:.28})+dot(CC.cat.centre,COL.target)),'The cell that contains each box’s centre is shaded'),
  sm(divRound('dog',CC.dog.centre,N3.dog_cell,s3),at(2,divRound('cat',CC.cat.centre,N3.cat_cell,s3))),'1.1fr 1fr'),
 lines:[`The rule: the cell that holds an object’s centre answers for it. Divide the dog’s centre by 320 and round down: cell (${N3.dog_cell.join(', ')}).`,
  `The cat’s centre falls in cell (${N3.cat_cell.join(', ')}). Each object gets exactly one cell, fixed by where it is, so the list order no longer matters.`],
 ask:['Which cell holds the dog’s centre?','Why does this rule solve Part 4’s order problem?'],
 expected:[`(${N3.dog_cell.join(', ')}): row ${N3.dog_cell[0]}, column ${N3.dog_cell[1]}.`,'Each object’s cell is fixed by where the object is, not by its place in the annotation list.'],
 point:'Ng: “assign the object to the grid cell containing its midpoint.” This is YOLOv1’s rule (Redmon et al., 2016).',
 transition:'Write the dog’s box from that cell’s point of view.',source:PHOTO_SRC});
// the dog's centre inside its 320-px cell, enlarged
const [bx3,by3]=[CC.dog.centre[0]-N3.dog_cell[1]*s3,CC.dog.centre[1]-N3.dog_cell[0]*s3];
const cellInset=(()=>{const L=170,x0=16,y0=30,px=x0+N3.dog[0]*L,py=y0+N3.dog[1]*L;
 return fig(330,236,`<rect x="${x0}" y="${y0}" width="${L}" height="${L}" fill="${COL.target}" fill-opacity=".12" stroke="${COL.target}" stroke-width="3"/>`+
  line(x0,py,px,py,{stroke:COL.ink,w:3,dash:'7 5'})+line(px,y0,px,py,{stroke:COL.ink,w:3,dash:'7 5'})+`<circle cx="${px}" cy="${py}" r="9" fill="${COL.target}" stroke="#fff" stroke-width="3"/>`+
  label(x0+6,py+28,`b<tspan dy="5" font-size="14">x</tspan><tspan dy="-5"> = ${N3.dog[0]}</tspan>`,{size:19,fill:COL.ink,weight:650})+label(px-8,y0+L/2,`b<tspan dy="5" font-size="14">y</tspan><tspan dy="-5"> = ${N3.dog[1]}</tspan>`,{size:19,fill:COL.ink,weight:650,anchor:'end'})+
  label(x0,y0-10,`(${N3.dog_cell[1]*s3}, ${N3.dog_cell[0]*s3})`,{size:17,fill:MUTED})+label(x0+L,y0+L+22,`(${(N3.dog_cell[1]+1)*s3}, ${(N3.dog_cell[0]+1)*s3})`,{size:17,fill:MUTED,anchor:'end'})+
  label(x0+L+16,y0+L/2,`cell (${N3.dog_cell.join(', ')}),`,{size:18,fill:COL.ink})+label(x0+L+16,y0+L/2+24,'enlarged',{size:18,fill:COL.ink}),'The dog’s cell enlarged, with the dog’s centre inside it');})();
const cellsArrow=arrow(DOG[0],DOG[3]+28,DOG[2],DOG[3]+28,{stroke:COL.target,w:5,both:true})+label((DOG[0]+DOG[2])/2,DOG[3]+20,`${N3.dog[2]} cells`,{size:34,fill:COL.target,weight:700,anchor:'middle',halo:true})+
 arrow(DOG[2]+26,DOG[1],DOG[2]+26,DOG[3],{stroke:COL.target,w:5,both:true})+label(DOG[2]+36,(DOG[1]+DOG[3])/2,`${N3.dog[3]}`,{size:34,fill:COL.target,weight:700,halo:true})+label(DOG[2]+36,(DOG[1]+DOG[3])/2+38,'cells',{size:34,fill:COL.target,weight:700,halo:true});
S_('cell-box','dense','The dog’s box, measured in cells',{builds:2,
 body:cols(grid3(gtBox(DOG,'',{w:5})+cell(...N3.dog_cell,s3,{fill:COL.target,op:.25})+dot(CC.dog.centre,COL.target)+gat(2,cellsArrow),'The dog’s box with its cell shaded; its width and height counted in cells'),
  `<div class="state-slot">${only(1,stack(`<div class="narrow">${cellInset}</div>`,`<div class="eq-sm">${eq(R`b_x=\frac{${CC.dog.centre[0]}-${N3.dog_cell[1]*s3}}{${s3}}=\frac{${bx3}}{${s3}}=${N3.dog[0]}`)}${eq(R`b_y=\frac{${CC.dog.centre[1]}-${N3.dog_cell[0]*s3}}{${s3}}=\frac{${by3}}{${s3}}=${N3.dog[1]}`)}</div>`))}${only(2,`<div class="eq-sm">${eq(R`b_w=\frac{${S.dog.w}}{${s3}}=${N3.dog[2]}`)}${eq(R`b_h=\frac{${S.dog.h}}{${s3}}=${N3.dog[3]}`)}</div>`)}</div>`,'1fr 1fr'),
 lines:['b_x and b_y say where the dog’s centre sits inside its cell: 0 at the cell’s left or top edge, 1 at its right or bottom edge.',
  'b_w and b_h give the size, counted in cells. The box is not confined to its cell: the dog is wider than one cell and about 1.6 cells tall.'],
 ask:['Where is the dog’s centre inside its cell?','Why can b_w be larger than 1?'],
 expected:[`b_x = ${bx3} ÷ ${s3} = ${N3.dog[0]} across, b_y = ${by3} ÷ ${s3} = ${N3.dog[1]} down: near the cell’s top right.`,'It counts cells, and the dog is wider than one cell.'],
 point:'Ng’s encoding: b_x and b_y between 0 and 1 inside the cell, b_w and b_h as multiples of the cell, so they can be more than 1.',
 transition:'The target for the whole photo.',source:PHOTO_SRC});
const tgtRow=(name,vals,cls,b)=>`<span class="sl">${name}</span>`+vals.map(v=>`<div class="${cls}"><span data-at="${b}">${v}</span></div>`).join('');
const isCell=(rc,cl)=>rc[0]===cl[0]&&rc[1]===cl[1];
S_('target-photo','dense','The target for the whole photo, cell by cell',{builds:3,
 body:cols(grid3([0,1].flatMap(r=>[0,1,2].map(c=>cellName(r,c))).join('')+cell(...N3.dog_cell,s3,{fill:COL.target,op:.25})+gat(2,cell(...N3.cat_cell,s3,{fill:COL.target,op:.25})),'The six cells; the two that hold a centre are shaded'),
  `<div class="slotgrid tgt"><span></span>${['object?',m('b_x'),m('b_y'),m('b_w'),m('b_h'),'cat','dog'].map(k=>`<b>${k}</b>`).join('')}`+
   [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2]].map(rc=>isCell(rc,N3.dog_cell)?tgtRow(`cell (${rc.join(', ')})`,[1,...N3.dog,0,1],'t',1):isCell(rc,N3.cat_cell)?tgtRow(`cell (${rc.join(', ')})`,[1,...N3.cat,1,0],'t',2):tgtRow(`cell (${rc.join(', ')})`,[0,'?','?','?','?','?','?'],'q',3)).join('')+'</div>','0.8fr 1.2fr'),
 lines:[`The whole target, cell by cell. Cell (${N3.dog_cell.join(', ')}) holds the dog’s centre: object? 1, the box in cell units, dog 1.`,
  `Cell (${N3.cat_cell.join(', ')}) holds the cat’s centre: object? 1, its box, cat 1.`,
  'The other four cells hold no centre: object? is 0 and the rest is “?”, as for Part 4’s empty floor. These 42 numbers are the target.'],
 ask:['What is the target in the dog’s cell?','And in the cat’s?','What about the four other cells?'],
 expected:[`(1, ${N3.dog.join(', ')}, 0, 1).`,`(1, ${N3.cat.join(', ')}, 1, 0).`,'object? = 0; the box and the classes are “?”, left out of the loss.'],
 point:'Ng writes this target as a 3 × 3 × 8 block for his 3 × 3 grid and three classes; ours is 2 × 3 × 7.',
 transition:'One network writes the whole block.',source:'Our annotation of the courtyard photo (data/annotations.json). '+PHOTO_SRC});
// one CNN pass: the photo in, the 2 x 3 x 7 block out; each output cell describes its own part of the photo
const blockFig=(()=>{const TW=300,sc=TW/W,TH=H*sc,y0=30,bx=640,by=60,u=74,d=26,g=[];
 const front=(r,c,f,op)=>`<rect x="${bx+c*u}" y="${by+r*u}" width="${u}" height="${u}" fill="${f}" fill-opacity="${op}" stroke="${COL.ink}" stroke-width="2"/>`;
 let blk='';for(let r=0;r<2;r++)for(let c=0;c<3;c++)blk+=front(r,c,'#fff',1);
 blk+=`<path d="M${bx},${by} l${d},${-d} h${3*u} v${2*u} l${-d},${d} M${bx+3*u},${by} l${d},${-d}" fill="none" stroke="${COL.ink}" stroke-width="2"/>`+label(bx+3*u/2,by+2*u+34,'2 × 3 cells × 7 numbers',{size:19,anchor:'middle',fill:COL.ink,weight:650})+label(bx+3*u+d+8,by+u-d/2,'7',{size:20,fill:COL.ink,weight:700});
 g.push(`<g transform="translate(0,${y0}) scale(${sc})"><image href="figures/cat-dog.jpg" width="${W}" height="${H}" preserveAspectRatio="none"/>${gridLines(W,H,s3,{stroke:'#fff',w:8,op:.95})}</g>`);
 g.push(arrow(TW+18,y0+TH/2,TW+62,y0+TH/2,{stroke:COL.ink,w:3,head:12})+`<rect x="${TW+70}" y="${y0+TH/2-40}" width="120" height="80" rx="10" fill="#fff" stroke="${COL.ink}" stroke-width="2.5"/>`+label(TW+130,y0+TH/2+8,'CNN',{size:22,anchor:'middle',fill:COL.ink,weight:700})+arrow(TW+196,y0+TH/2,bx-14,y0+TH/2,{stroke:COL.ink,w:3,head:12})+blk);
 g.push(gat(2,`<rect x="${N3.dog_cell[1]*s3*sc}" y="${y0+N3.dog_cell[0]*s3*sc}" width="${s3*sc}" height="${s3*sc}" fill="${COL.target}" fill-opacity=".45" stroke="${COL.target}" stroke-width="3"/>`+front(N3.dog_cell[0],N3.dog_cell[1],COL.target,.55)));
 return `<div class="diagram-scroll"><svg class="plot wsvg" viewBox="0 0 ${bx+3*u+70} ${Math.ceil(y0+TH+40)}" style="overflow:hidden" role="img" aria-label="The photo goes through a CNN once and comes out as a 2 by 3 block of 7-number records">${g.join('')}</svg></div>`;})();
S_('one-pass','dense','One CNN pass writes the whole block',{builds:2,
 body:stack(blockFig),
 lines:['Train a CNN whose output is exactly this 2 × 3 × 7 block. One pass over the photo writes all six records at once.',
  'Each output cell is computed from its own part of the photo: the convolutional sliding window of 5.1. You Only Look Once, hence the name YOLO.'],
 ask:['How many times does the CNN look at the photo?','Which part of the photo does output cell (1, 1) describe?'],
 expected:['Once.','Cell (1, 1) of the photo, the one with the dog’s centre.'],
 point:'Ng: input 100 × 100 × 3, a ConvNet, output 3 × 3 × 8; because it is one convolutional pass, YOLO runs fast enough for video.',
 transition:'One record per cell: is that always enough?',source:PHOTO_SRC});
// one box per cell: the crowd's centres on a coarse 3 x 2 grid, then on 32-px cells
const anchorFig=fig(420,190,`<rect x="40" y="20" width="60" height="130" rx="4" fill="${COL.guess}" fill-opacity=".12" stroke="${COL.guess}" stroke-width="4"/>`+label(70,178,'tall',{size:20,anchor:'middle',fill:COL.ink,weight:650})+
 `<rect x="170" y="60" width="200" height="70" rx="4" fill="${COL.guess}" fill-opacity=".12" stroke="${COL.guess}" stroke-width="4"/>`+label(270,178,'wide',{size:20,anchor:'middle',fill:COL.ink,weight:650}),'Two anchor shapes: a tall box and a wide box');
const CRC=S.crowd_cells,cW=W2/3,cH=H2/2,crowdDots=CRC.centres.map(c=>dot(c,COL.target)).join('');
const coarseLines=line(cW,0,cW,H2,{stroke:'#fff',w:5})+line(2*cW,0,2*cW,H2,{stroke:'#fff',w:5})+line(0,cH,W2,cH,{stroke:'#fff',w:5});
S_('two-in-a-cell','dense','One record per cell: what if two centres share a cell?',{builds:3,
 body:cols(photo('crowd',W2,H2,gonly(1,coarseLines+`<rect x="${CRC.coarse_cell[1]*cW}" y="${CRC.coarse_cell[0]*cH}" width="${cW}" height="${cH}" fill="${COL.loss}" fill-opacity=".22" stroke="${COL.loss}" stroke-width="6"/>`)+gonly('2-3',gridLines(W2,H2,32,{op:.6}))+crowdDots,'The crowd photo with each person’s centre marked: on a 3 by 2 grid, then on 32-pixel cells'),
  stack(only(1,stack(`<div class="big-number">${CRC.coarse_max}</div>`,p('centres in one cell, which writes one box'))),
   only('2-3',stack(`<div class="big-number">1</div>`,p(`centre per cell, on ${CRC.fine_grid.join(' × ')} cells of 32 px`))),
   at(3,stack(`<div class="narrow">${anchorFig}</div>`,p('Two boxes per cell: 2 × 7 = 14 numbers.')))),'1.5fr 1fr'),
 lines:[`A cell writes one box. On the crowd photo a 3 × 2 grid puts ${CRC.coarse_max} people’s centres in one cell, which can report only one of them.`,
  'A finer grid fixes it here: with 32-pixel cells, every person’s centre gets a cell of its own.',
  'Andrew Ng also shows a second fix: give each cell two boxes, one tall and one wide, called anchor boxes. YOLOv8 does without them.'],
 ask:['How many of those five people can the crowded cell report?','Why does a finer grid help?','What are anchor boxes?'],
 expected:['One.','Smaller cells rarely hold two centres.','Two or more boxes per cell, each with its own shape, so one cell can report two objects.'],
 point:'Ng’s anchor boxes: each object goes to the cell with its centre and to the anchor shape it overlaps most, so his output becomes 3 × 3 × 2 × 8. Appendix B has anchors; Part 7 shows YOLOv8’s three grids.',
 transition:'In practice: a fine grid.',source:'Our annotation of the crowd photo (data/annotations.json). '+PHOTO_SRC});
chap('5.3');
S_('fine-grid','dense','In practice: a fine grid of 32-pixel cells',{builds:3,
 body:cols(grid(gtBox(DOG,'',{w:4})+gat(2,cell(...CC.dog.cell,s32,{fill:COL.target,op:.8})+dot(CC.dog.centre,COL.target)),'The courtyard photo with YOLOv8n’s 30 by 20 grid and the dog’s cell'),
  sm(eq(R`${W}\div32=${G.cols},\quad ${H}\div32=${G.rows}:\quad ${G.cols*G.rows}\ \text{cells}`),at(2,divRound('dog',CC.dog.centre,CC.dog.cell,32)),
   at(3,eq(R`b_x=${NG.dog[0]},\ \ b_y=${NG.dog[1]}`)),at(3,eq(R`b_w=${NG.dog[2]},\ \ b_h=${NG.dog[3]}`))),'1fr 1.05fr'),
 lines:['Real YOLOs use a much finer grid, so that centres rarely share a cell. YOLOv8n’s cells are 32 pixels: 30 × 20 of them on our photo.',
  `The same rule picks the dog’s cell: its centre falls in cell (${CC.dog.cell.join(', ')}).`,
  'Measured in these small cells, the dog’s box is about 11 cells wide and 16 tall.'],
 ask:['How many cells does YOLOv8n’s grid have on our photo?','Which cell holds the dog’s centre now?','Why is b_w now about 11?'],
 expected:[`${G.cols} × ${G.rows} = ${G.cols*G.rows}.`,`(${CC.dog.cell.join(', ')}).`,'The cells are 32 pixels, and the dog is 361 pixels wide: 361 ÷ 32 = 11.281.'],
 point:'YOLOv8n also reads two finer grids, of 16- and 8-pixel cells, for small objects (Part 7).',
 transition:'And the record changes a little.',source:PHOTO_SRC});
const AXc='#AAB3BC';
// one cell's record, drawn as a strip: four box numbers, then 80 thin bars, one per class
const recStrip=fig(690,170,[0,1,2,3].map(i=>`<rect x="${10+i*70}" y="40" width="62" height="62" rx="6" fill="#fff" stroke="${COL.guess}" stroke-width="3"/>`+label(41+i*70,80,`b<tspan dy="6" font-size="15">${'xywh'[i]}</tspan>`,{size:22,anchor:'middle',fill:COL.guess,weight:700})).join('')+
 Array.from({length:80},(_,i)=>`<rect x="${(300+i*4.1).toFixed(1)}" y="40" width="3" height="62" fill="${AXc}"/>`).join('')+
 label(10,26,'4 box numbers',{size:20,fill:COL.guess,weight:650})+label(300,26,'80 class scores, one per COCO class',{size:20,fill:COL.ink,weight:650})+label(300,128,'person',{size:16})+label(300+79*4.1+3,128,'toothbrush',{size:16,anchor:'end'}),'One cell’s record: four box numbers and eighty class scores');
S_('record-84','dense','In practice: 80 classes, and no “object?”',{builds:3,
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
S_('prediction-record','dense','What the trained network wrote at cell (10, 18)',{builds:2,
 body:stack(recordFig({keys:NGK,boxes:[{vals:NG.dog.map(v=>num(v,3)),col:COL.target,name:'target'},{vals:NG.pred.map(v=>num(v,3)),col:COL.guess,name:'prediction'}],bars:[{vals:CELL.scores,col:COL.guess}],marks:dogMark,boxAt:2,alt:'Predicted record against the target'}),
  `<div class="state-slot">${only(1,ps(`Dog: ${num(CELL.p_dog,3)} (target 1). Cat ${num(CELL.top[1][1],4)}, skateboard ${num(CELL.top[2][1],5)}; the other 77 are smaller still (targets 0).`))}${only(2,ps('Box: close to the target. The predicted centre sits a little higher, and the box is a little taller.'))}</div>`),
 lines:['The real network’s scores at this cell: dog a little below its target of 1, every other class near its target of 0.','Its box, in cell units, is close to the target too. The loss turns all these differences into one number to reduce.'],
 ask:['How far is each class score from its target?','Which box number is furthest off?'],
 expected:[`Dog: 1 − ${num(CELL.p_dog,3)} = ${num(1-CELL.p_dog,3)} too low; the others are near 0, their target.`,`b_h: ${NG.pred[3]} against ${NG.dog[3]}, ${NG.l1_terms[3]} cells.`],
 point:`YOLOv8n’s box at this cell is (${CELL.cxcywh.join(', ')}) in pixels, centre and size; divided into cell units as on the previous slides.`,
 transition:'The class part of the loss.',source:YOLO_SRC});
const bcePlot=()=>{const P=panel({W:560,H:380,L:66,B:58,T:34,xMin:0,xMax:1,yMin:0,yMax:4.8,ticksX:[0,.25,.5,.75,1],ticksY:[0,1,2,3,4],xLabel:'p, the score of the right answer',yLabel:'−log p'});
 let pts=[];for(let i=1;i<=200;i++){const x=Math.max(.009,i/200);pts.push(`${P.x(x).toFixed(1)},${P.y(-Math.log(x)).toFixed(1)}`);}
 const mark=(x,txt,dx,dy,anchor='start')=>`<circle cx="${P.x(x).toFixed(1)}" cy="${P.y(-Math.log(x)).toFixed(1)}" r="8" fill="${COL.loss}" stroke="#fff" stroke-width="2"/>`+label(P.x(x)+dx,P.y(-Math.log(x))+dy,txt,{size:21,fill:COL.ink,weight:650,anchor});
 return fig(560,380,P.axes+`<polyline points="${pts.join(' ')}" fill="none" stroke="${COL.loss}" stroke-width="3"/>`+gat(2,mark(.1,num(-Math.log(.1),2),14,-6)+mark(.5,num(-Math.log(.5),2),10,-16)+mark(CELL.p_dog,num(CELL.bce_dog,3),0,-22,'middle')),'The loss −log p falls from very large near p = 0 to zero at p = 1');};
S_('bce','dense','Scoring one yes/no answer: binary cross-entropy',{builds:2,
 body:cols(stack(eq(R`\text{yes }(y=1):\quad -\log p`),eq(R`\text{no }(y=0):\quad -\log(1-p)`),small('p: the score the network gave this class; y: the target, 1 or 0. Natural logarithms.')),bcePlot(),'1fr 1.1fr'),
 lines:['A class score answers one yes/no question. If the answer is yes, the loss is −log p; if no, −log(1 − p), the same curve mirrored.',`For a yes: sure and right costs almost nothing; unsure (0.5) costs ${num(-Math.log(.5),2)}; sure and wrong (0.1) costs ${num(-Math.log(.1),2)}. Our dog cell, ${num(CELL.p_dog,3)}: ${num(CELL.bce_dog,3)}.`],
 ask:['What is the loss for a yes answered with p = 1?','Why does the curve shoot up near p = 0?'],
 expected:['0: −log 1 = 0.','Being confidently wrong is punished hardest: −log p grows without bound as p → 0.'],
 point:'The two cases are one formula: BCE(p, y) = −[y log p + (1 − y) log(1 − p)].',
 transition:'Apply it to all 80 questions at our cell.'});
S_('loss-cells','dense','The loss at two cells: the dog’s, and an empty one',{builds:3,
 body:sm(eq(R`\text{dog’s cell, classes: }-\log ${num(CELL.p_dog,3)}+\textstyle\sum_{79}-\log(1-p_c)=${num(CELL.bce_dog,3)}+${num(CELL.bce_others,4)}=\lcol{${num(CELL.bce_total,3)}}`),
  at(2,eq(R`\text{dog’s cell, box: }${NG.l1_terms.join('+')}=\lcol{${NG.l1}}\ \text{cells}`)),
  at(3,eq(R`\text{empty cell }(${CELL.bg_row},${CELL.bg_col})\text{: }\textstyle\sum_{80}-\log(1-p_c)=\lcol{${num(CELL.bg_bce,4)}},\ \ \text{no box}`))),
 lines:['At the dog’s cell, the class part: dog is a yes, so −log 0.871. The other 79 are near-certain noes and add almost nothing.',
  'The box part: the L1 distance between the predicted and the target box numbers, in cells, as in Part 4.',
  'At an empty cell there is no box to compare, only the class part, and it is tiny: every class there is already near 0.'],
 ask:['Where does most of the dog cell’s class loss come from?','How is the box part computed?','Why is there no box term at an empty cell?'],
 expected:['From the dog question: −log 0.871 = 0.139.',`Four absolute differences: ${NG.l1_terms.join(' + ')} = ${NG.l1}.`,'There is no object there, so no box to compare with.'],
 point:'Ng’s localiser used squared errors throughout; detectors today use binary cross-entropy for the classes and an L1 or IoU-based box loss.',
 transition:'Put the pieces together.'});
S_('loss-total','dense','The loss for the whole photo',{builds:3,
 body:stack(eq(R`\mathcal{L}=\underbrace{\sum_{\text{all 600 cells}}\ \sum_{c=1}^{80}\mathrm{BCE}(p_c,y_c)}_{\text{class: every cell}}\;+\;\underbrace{\sum_{\text{object cells}}\mathcal{L}_\text{box}}_{\text{box: 2 cells here}}`),
  at(2,`<div class="eq-sm">${eq(R`600\times80=${bt(48000)}\ \text{class terms},\qquad 2\ \text{box terms}`)}</div>`),
  at(3,p('One number for the photo; gradient descent lowers it.'))),
 lines:['The loss for the photo: class terms from every cell, box terms only from the cells that hold an object.',
  'Count them for our photo. The 598 empty cells still matter: they learn to say nothing.',
  'Every cell uses the same weights, so every cell learns from every object in every photo.'],
 ask:['Which cells add class terms? Box terms?','How many class terms are there?','Why does every cell learn from the dog?'],
 expected:['Every cell; only the object cells.','600 × 80 = 48,000.','The weights are shared: the same layers write every cell’s record.'],
 point:'Real detectors weight the two parts and average over objects: YOLOv1 used 5 for the box terms and 0.5 for empty cells. YOLOv8’s loss has the same structure over its three grids.',
 transition:'At test time there are no annotations: read the boxes out.'});
chap('5.4');
const PB=CELL.pred_box;
S_('decode','dense','At test time: read the box back out of the cell',{builds:3,
 body:cols(grid(cell(10,18,s32,{fill:COL.guess,op:.7})+gat(2,prBox(PB,'',{w:5}))+gat(3,pill(PB[0],PB[1],`dog ${num(CELL.p_dog,3)}`,{fill:COL.guess,size:30})),'The cell’s box numbers turned back into a box',{view:dogView}),
  sm(eq(R`c_x=${18*s32}+${NG.pred[0]}\times32=${num(18*s32+NG.pred[0]*32,1)}`),eq(R`c_y=${10*s32}+${NG.pred[1]}\times32=${num(10*s32+NG.pred[1]*32,1)}`),
   at(2,eq(R`w=${NG.pred[2]}\times32=${num(NG.pred[2]*32,1)}`)),at(2,eq(R`h=${NG.pred[3]}\times32=${num(NG.pred[3]*32,1)}`)),
   at(3,p(`Best class: dog, ${num(CELL.p_dog,3)}.`))),'1fr 1.15fr'),
 lines:['At test time there is no annotation, only what the cell wrote. Undo the cell units: the centre is the cell’s corner plus b_x and b_y cells.',
  'The size is b_w and b_h cells, times 32 pixels. The corners follow as in Part 3: the box sits on the dog.',
  'Its label is the class with the highest score, and that score is the box’s score.'],
 ask:['Where is the box’s centre?','How big is the box?','Which score does the box get?'],
 expected:[`(${num(18*s32+NG.pred[0]*32,1)}, ${num(10*s32+NG.pred[1]*32,1)}).`,`${num(NG.pred[2]*32,1)} × ${num(NG.pred[3]*32,1)} pixels.`,`The largest of its 80 class scores: ${num(CELL.p_dog,3)}, dog.`],
 transition:'Every cell does this. Look at them all.',source:YOLO_SRC});
S_('cell-inspector','dense','Every cell writes a record: point at one',{builds:1,
 body:widget('cell-inspector','Point at a cell of the 30 by 20 grid to read its class scores and box'),
 lines:['Point at cells: near the dog they say dog and draw nearly the same box; on the wall every class score is tiny.'],
 ask:['What does a cell on the wall write?'],expected:['A box of some kind, but every class score near 0, so its score is tiny and it will be dropped.'],
 point:'Every cell always writes a box. The score decides whether anyone looks at it.',
 transition:'Where do the confident cells sit?',source:YOLO_SRC});
const fireMap=(map,col)=>heat(map,s32,{color:col,min:.05});
S_('fires','dense','About ten cells fire for each animal',{builds:2,
 body:cols(grid(gtBox(DOG,'',{w:3})+gtBox(CAT,'',{w:3})+fireMap(G.map_dog,COL.guess)+gat(2,fireMap(G.map_cat,COL.amber)),'Dog scores and cat scores of every cell'),
  stack(p(`Shade: each cell’s dog score. ${G.fire_dog.length} cells score above 0.25, all near the dog’s centre.`),
   at(2,p(`Cat: again ${G.fire_cat.length} cells.`))),'1.3fr 1fr'),
 lines:['The trained network’s dog score at every cell: a cluster around the dog’s centre, and nothing elsewhere.',
  'A second cluster for the cat. Cells next to a centre see almost the same animal, so they are confident too: duplicates, which Part 6 removes.'],
 ask:['Where are the dog scores high?','Why do about ten cells fire, not one?'],
 expected:['In a block of cells around the dog’s centre.','Neighbouring cells see nearly the same animal; YOLOv8 is even trained with about ten cells per object.'],
 point:'YOLOv8 trains its 10 best-fitting cells per object as positives, not only the centre cell, which makes the cluster. Even with Ng’s one-cell rule, neighbours end up confident at test time.',
 transition:'Every cell’s box, all at once.',source:YOLO_SRC});
const recs=G.records;
S_('every-box','dense','Every cell draws a box, even on the wall',{builds:2,
 body:cols(courtyard(gonly(1,recs.map(x=>rect([x[2],x[3],x[4],x[5]],{stroke:COL.guess,w:1.5,op:.35})).join(''))+gonly(2,recs.filter(x=>x[7]>=.01).map(x=>rect([x[2],x[3],x[4],x[5]],{stroke:COL.guess,w:3,op:Math.min(1,.15+x[7])})).join('')),'All 600 boxes of the grid, then each faded by its cell’s best class score'),
  stack(only(1,p(`${G.cols*G.rows} cells, ${G.cols*G.rows} boxes.`)),only(2,p('Faded by score: the boxes near the animals and the plants remain.'))),'1.3fr 1fr'),
 lines:['Decode every cell of the grid and draw its box: 600 boxes. The network never writes “?”, so the cells on the wall and floor draw boxes too.',
  'Fade each box by its cell’s best class score. Almost all vanish: the score says which boxes to believe.'],
 ask:['Does a cell on the wall write a box?','What tells us which boxes to keep?'],
 expected:['Yes: every cell always writes one.','Its score: the highest of its 80 class scores.'],
 point:'Every cell writes a box whatever it sees; nobody looks at the box of a cell whose scores are all low.',
 transition:'Keep the confident ones.',source:YOLO_SRC});
const cand=S.nms_courtyard;
const candBoxes=(list,op=1)=>list.map(k=>rect(k.box,{stroke:k.name==='potted plant'?COL.amber:COL.guess,w:2.5,op})).join('');
S_('all-candidates','dense','Decode every cell, keep scores ≥ 0.25: 31 boxes',{builds:3,
 body:cols(courtyard(gat(2,candBoxes(cand.candidates)),'Thirty-one candidate boxes: ten on the dog, ten on the cat, eleven on plants'),
  stack(p(`YOLOv8n has ${big(G.total)} cells: ours and two finer grids (Part 7).`),
   at(2,p(`Scores ≥ 0.25: ${cand.n_candidates} boxes. ${cand.counts.dog} on the dog, ${cand.counts.cat} on the cat, ${cand.counts['potted plant']} on plants.`)),
   at(3,p('We want one box per object.'))),'1.25fr 1fr'),
 lines:[`The real YOLOv8n also reads two finer grids, met in Part 7: ${big(G.total)} cells, each writing a box, for any photo this size.`,`Throw away the unconfident ones: ${cand.n_candidates} boxes have a score of at least 0.25.`,'The ten cells that fired for the dog each drew a dog box. To get one box per object, remove the duplicates.'],
 ask:['How many records does the network write?','How many survive the score filter?','Why ten boxes for one dog?'],
 expected:[big(S.grid.total),String(cand.n_candidates),'About ten cells were trained to fire for each object, and they did.'],
 transition:'Part 5 in one slide.',source:YOLO_SRC});
recap(5,'dense',['Sliding windows are slow and their boxes are fixed; one CNN pass computes every window at once.','YOLO: a grid on the photo and Part 4’s record in every cell; the cell holding an object’s centre answers for it.',
 'In practice a fine grid: 30 × 20 cells of 32 px, each writing a box and 80 class scores.','Loss: Part 4’s, cell by cell, with a box term only where an object is.',`Test time: decode every cell, keep scores ≥ 0.25: ${cand.n_candidates} boxes, 4 objects.`],
 'each object has about ten boxes; keep one.',
 {ask:'Why are there about ten boxes per object at test time?',expected:'Cells next to an object’s centre see nearly the same object, so several of them are confident.',transition:'Part 6.'});

// ================================================================================================ Part 6
partBreak(6,'nms','One box per object: non-maximum suppression','Ten boxes for one dog. Keep the best and delete the ones that overlap it heavily.',[
 'Run the greedy recipe on the dog’s ten real boxes, then on two dogs.','See what the IoU threshold trades off, and why classes are kept apart.','Try it live; write it in eight lines; then the whole detector in code.'],
 {line:'NMS keeps the highest-scoring box and removes boxes that overlap it.',ask:'Of ten overlapping dog boxes, which one would you keep?',expected:'The one with the highest score.',transition:'The dog’s ten boxes.'});
chap('6.1');
const dr=cand.dog_round,dogTen=[dr.keep,...dr.removed];
S_('dupes','nms','Ten boxes for one dog',{builds:2,
 body:cols(courtyard(dogTen.map(k=>rect(k.box,{stroke:COL.guess,w:2.5})).join('')+gat(2,rect(dr.keep.box,{stroke:COL.guess,w:7})+pill(dr.keep.box[0],dr.keep.box[1],`dog ${num(dr.keep.score,3)}`,{fill:COL.guess,size:30})),'Ten nearly identical dog boxes; the highest-scoring one is highlighted',{view:dogView}),
  `<div class="table-sm xtight">${table(['cell (row, col)','score'],dogTen.map((k,i)=>[`(${k.row}, ${k.col})`,i===0?`<b>${num(k.score,3)}</b>`:num(k.score,3)]))}</div>`,'1fr 1fr'),
 lines:['The ten cells that fired for the dog, and their scores, from 0.889 down to 0.766. Their boxes lie almost on top of each other.','They describe one dog. Keep the most confident box, from cell (9, 19), and delete the rest.'],
 ask:['How many dogs are here?','Which box would you keep?'],
 expected:['One.','The highest-scoring: cell (9, 19), 0.889.'],
 transition:'The recipe, in general.',source:YOLO_SRC});
S_('nms-recipe','nms','Non-maximum suppression: the greedy recipe',{builds:4,
 body:`<ol class="steps">${['Sort the boxes by score, highest first.','Keep the top box.','Delete every remaining box of the same class whose IoU with it is above a threshold (0.7 here).','Repeat from step 2 with what is left, until nothing is left.'].map((x,i)=>`<li data-at="${i+1}">${x}</li>`).join('')}</ol>`,
 lines:['Sort by score.','The best box is kept: no other box can beat it.','Boxes that overlap it heavily describe the same object: delete them. Boxes that overlap little may be other objects: keep them for now.','Then repeat on what is left. Non-maximum suppression removes every box that is not a local maximum.'],
 point:'Andrew Ng’s version: first drop boxes with p_c ≤ 0.6, then delete boxes with IoU ≥ 0.5 with the kept one, separately for each class. Ultralytics’ defaults are a score cut-off of 0.25 and an IoU threshold of 0.7.',
 ask:['Why sort first?','Is the top box ever deleted?','Why only same-class boxes?','When does the loop stop?'],
 expected:['So that each kept box is the best of its neighbourhood.','No: it is kept immediately.','A person on a bicycle overlaps the bicycle; both are real objects.','When no boxes are left.'],
 transition:'Run it on the dog’s ten boxes.'});
S_('nms-dog','nms','NMS on the dog’s ten boxes',{builds:4,
 body:`<div class="table-sm tight">${table(['cell','score','IoU with the kept box','fate'],dogTen.map((k,i)=>[`(${k.row}, ${k.col})`,num(k.score,3),i===0?at(2,'kept box'):at(3,num(k.iou,3)),i===0?at(2,'<span class="hit">keep</span>'):at(4,'<span class="miss">delete (&gt; 0.7)</span>')]))}</div>`,
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
   [4,'        i, rest = order[0], order[1:]'],[4,'        keep.append(i)'],[5,'        ious = box_iou(boxes[[i]], boxes[rest])[0]'],[6,'        order = rest[ious <= thr]'],[8,'    return torch.stack(keep)']])}</div>`,
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
 point:'This nms ignores classes; on these boxes it keeps the same four as class-aware NMS (checked in scripts/science.py). boxes[[i]] keeps a (1, 4) shape for box_iou.',
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
 transition:'Why does YOLOv8 have three grids?',source:YOLO_SRC});
// ================================================================================================ Part 7
partBreak(7,'scales','Small and large objects: three grids',`A 32-pixel cell is coarse for a person ${farPed[2]-farPed[0]} pixels wide. YOLOv8 predicts from three grids at once.`,[
 'See the range of sizes in one street photo, now with the grid.',`Count the cells of the three grids: where ${big(G.total)} came from.`,'Check which grid found each real detection.'],
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
 transition:'Part 7 in one slide.',source:YOLO_SRC});
recap(7,'scales',[`One grid cannot suit a ${bus[2]-bus[0]}-px bus and a ${farPed[2]-farPed[0]}-px pedestrian.`,`YOLOv8 predicts from grids of 8, 16 and 32-px cells: ${big(G.total)} records.`,'Every cell writes the same 84-number record; NMS runs on all of them.','Small objects come from the fine grid, large ones from the coarse.'],
 'measure how good the detections are.',
 {ask:'Which grid would you expect to find Part 1’s small bird?',expected:`The finest, 8 px: its best box did come from a stride-${S.bird.best.stride} cell.`,transition:'Part 8.'});

// ================================================================================================ Part 8
partBreak(8,'eval','Measuring a detector','Compare detections with annotations: decide which are right, then summarise.',[
 'Decide true positive, false positive and miss, on the street photo’s real detections.','Precision and recall at one threshold, then at all of them: walk down a ranked list.','Average precision and mAP; then back to Part 1’s bird.'],
 {line:'We judge a detector against annotations, one detection at a time, then summarise.',ask:'A detector returned 12 boxes for 4 people. Is that good?',expected:'It depends: are the 4 people among them, and how confident were the 8 extra boxes?',transition:'The rule for a correct detection.'});
chap('8.1');
const ES=S.eval_street,stG=ES.gt;
S_('tp-rule','eval','When is a detection correct?',{builds:4,
 body:`<ol class="steps">${['<b>True positive (TP)</b>: the right class and IoU ≥ 0.5 with an annotated box…','…that no higher-scoring detection has already claimed. Go through detections by score.','<b>False positive (FP)</b>: everything else: a box where nothing is, a wrong class, or a second box on a claimed object.','<b>False negative (FN)</b>: an annotated object that no detection claimed: a miss.'].map((x,i)=>`<li data-at="${i+1}">${x}</li>`).join('')}</ol>`,
 lines:['A detection counts as correct if its class is right and it overlaps an annotated box with IoU of at least 0.5.','Each annotated object can be claimed once. Detections go in score order; the first good one claims it.','Every detection that claims nothing is a false positive, including a duplicate that NMS missed.','Every annotated object left unclaimed is a false negative.'],
 ask:['What IoU counts as a hit?','Why process detections in score order?','Is a duplicate box on a found object right or wrong?','What is a false negative?'],
 expected:['At least 0.5, usually.','So the most confident detection claims the object, as in NMS.','Wrong: a false positive.','An object nobody found.'],
 point:'This is a third kind of matching, after training assignment and NMS: predictions against annotations, greedy by score.',
 transition:'Apply it to real detections.'});
S_('street-eval','eval','Real check: people in the street photo',{builds:3,
 body:stack(photo('street',W2,H2,stG.map(b=>gtBox(b,'',{w:4})).join('')+gat(2,ES.rows.filter(r=>r.hit).map(r=>prBox(r.box,'TP',{size:22,w:3,fill:COL.green})).join(''))+gat(3,ES.rows.filter(r=>!r.hit).map(r=>rect(r.box,{stroke:COL.loss,w:2.5})).join('')),'Annotated people, and YOLOv8n’s detections marked true or false positives',{view:[60,322,1140,308]}),
  `<div class="state-slot">${only(1,ps(`Teal: the 4 annotated people. YOLOv8n’s person detections after NMS, down to score 0.01: ${ES.rows.length}.`))}${only(2,ps(`The 4 most confident (${ES.rows.filter(r=>r.hit).map(r=>num(r.score,3)).join(', ')}) each claim a different person, IoU ${ES.rows.filter(r=>r.hit).map(r=>num(r.iou,2)).join(', ')}: <span class="hit">4 TP</span>.`))}${only(3,ps(`The other ${ES.rows.length-4} (scores ${num(ES.rows[4].score,3)} down to ${num(ES.rows.at(-1).score,3)}) sit on the car’s windscreen, IoU 0 with every person: <span class="miss">${ES.rows.length-4} FP</span>. No person is missed: 0 FN.`))}</div>`),
 lines:['We keep every person detection down to a score of 0.01, so that the wrong ones show up too.','The four most confident boxes each land on a different person.','The rest sit on the car’s windscreen, where nobody is.'],
 ask:['How many annotated people?','Which detections are true positives?','What are the low-scoring boxes?'],
 expected:['Four.','The top four, each with IoU above 0.9.','False positives on the car: the network half-sees a driver.'],
 transition:'Turn the counts into precision and recall.',source:YOLO_SRC});
chap('8.2');
const venn=()=>fig(800,380,
 `<circle cx="310" cy="215" r="150" fill="${COL.guess}" fill-opacity=".12" stroke="${COL.guess}" stroke-width="4"/><circle cx="490" cy="215" r="150" fill="${COL.target}" fill-opacity=".12" stroke="${COL.target}" stroke-width="4"/>`+
 label(250,40,'reported',{size:30,fill:COL.guess,weight:700,anchor:'middle'})+label(550,40,'really there',{size:30,fill:COL.target,weight:700,anchor:'middle'})+
 label(230,228,'FP',{size:40,fill:COL.loss,weight:700,anchor:'middle'})+label(400,228,'TP',{size:40,fill:COL.green,weight:700,anchor:'middle'})+label(570,228,'FN',{size:40,fill:COL.amber,weight:700,anchor:'middle'}),
 'Two overlapping circles: what was reported and what was really there; the overlap is the true positives');
S_('pr-def','eval','Precision and recall: two questions',{builds:2,
 body:cols(venn(),stack(at(1,eq(R`\text{precision}=\frac{\mathrm{TP}}{\mathrm{TP}+\mathrm{FP}}`)),at(1,small('Of what we reported, how much was right?')),
  at(2,eq(R`\text{recall}=\frac{\mathrm{TP}}{\mathrm{TP}+\mathrm{FN}}`)),at(2,small('Of what was really there, how much did we find?'))),'1.25fr 1fr'),
 lines:['Precision looks at the left circle, everything we reported: the fraction of it that was right.','Recall looks at the right circle, everything that was really there: the fraction of it we found.'],
 ask:['What does precision divide by?','What does recall divide by?'],
 expected:['Everything reported: TP + FP.','Everything really there: TP + FN.'],
 misconception:'Neither alone is enough: report every possible box and recall is 1; report one sure box and precision is 1.',
 transition:'The street photo, at two cut-offs.'});
S_('pr-street','eval','The street’s people at two score cut-offs',{builds:2,
 body:stack(`<div class="table-sm">${table(['keep scores ≥','TP','FP','FN','precision','recall'],[['0.25','4','0','0','4/4 = 1','4/4 = 1'],[at(2,'0.01'),at(2,'4'),at(2,String(ES.rows.length-4)),at(2,'0'),at(2,`4/${ES.rows.length} = ${num(4/ES.rows.length,2)}`),at(2,'4/4 = 1')]])}</div>`),
 lines:['With the usual 0.25 score cut-off, the street photo is perfect: four people found, nothing extra. Precision 1, recall 1.',`Keep everything down to 0.01 and the ${ES.rows.length-4} windscreen boxes join: recall stays 1, precision drops to ${num(4/ES.rows.length,2)}. The cut-off trades one for the other.`],
 ask:['What are precision and recall at 0.25?','What happens at 0.01?'],
 expected:['Both 1.',`Precision falls to ${num(4/ES.rows.length,2)}; recall stays 1.`],
 transition:'Now the other direction: Part 1’s bird.'});
const BE=S.bird_eval,lo=BE['0.05'],hi=BE['0.25'];
S_('bird-threshold','eval','Back to the bird: a lower cut-off finds it',{builds:2,
 body:cols(photo('cat-dog-bird',W2,H2,gtBox(B.gt,'',{w:2.5})+gat(2,prBox(B.best.box,'',{w:2})+pill(B.best.box[0],B.best.box[1]-2,`bird ${num(B.best.score,3)}`,{fill:COL.guess,size:14})),'The bird with our box, and YOLOv8n’s box once the cut-off is 0.05',{view:birdView}),
  stack(`<div class="table-sm tight">${table(['keep scores ≥','found','TP','FP','FN','precision','recall'],[['0.25',hi.found.join(', '),String(hi.tp),String(hi.fp),String(hi.fn),num(hi.precision,2),`${hi.tp}/${hi.tp+hi.fn}`],[at(2,'0.05'),at(2,lo.found.join(', ')),at(2,String(lo.tp)),at(2,String(lo.fp)),at(2,String(lo.fn)),at(2,num(lo.precision,2)),at(2,`${lo.tp}/${lo.tp+lo.fn}`)]])}</div>`),'0.8fr 1.4fr'),
 lines:[`At the usual 0.25: the cat and the dog are found, the bird (${num(B.best.score,3)}) is missed. Precision 1, recall ${hi.tp}/${hi.tp+hi.fn}.`,`At 0.05 the bird’s box gets through: recall ${lo.tp}/${lo.tp+lo.fn}, and nothing false comes with it. On the street, going lower brought eight false people.`],
 ask:['What do precision and recall say at 0.25?','Should we always lower the cut-off?'],
 expected:[`Precision 1, recall ${hi.tp}/${hi.tp+hi.fn}: everything reported was right, but the bird was missed.`,'It depends on what a miss costs against a false alarm: a camera trap counting rare birds wants recall; a car that brakes for every false person wants precision.'],
 point:'Only the seven annotated classes count here; the potted plants are ignored, as in the benchmark.',
 transition:'Every cut-off at once: rank the detections.',source:YOLO_SRC});
const PR=S.practice;
const prPlot=k=>{const P=panel({W:520,H:400,L:66,B:58,T:30,xMin:0,xMax:1,yMin:0,yMax:1.05,ticksX:[0,1/3,2/3,1],ticksY:[0,.5,1],fmtX:v=>['0','⅓','⅔','1'][Math.round(v*3)],xLabel:'recall',yLabel:'precision'});
 let s=P.axes;const pts=PR.rows.slice(0,k);
 if(k>1)s+=`<polyline points="${pts.map(r=>`${P.x(r.recall).toFixed(1)},${P.y(r.precision).toFixed(1)}`).join(' ')}" fill="none" stroke="${COL.guess}" stroke-width="3"/>`;
 pts.forEach((r,i)=>{s+=`<circle cx="${P.x(r.recall).toFixed(1)}" cy="${P.y(r.precision).toFixed(1)}" r="9" fill="${r.hit?COL.green:COL.loss}" stroke="#fff" stroke-width="2"/>`+label(P.x(r.recall)+(r.recall>.9?-14:12),P.y(r.precision)-10,`#${i+1}`,{size:20,fill:COL.ink,anchor:r.recall>.9?'end':'start'});});
 return fig(520,400,s,'Precision against recall, one point per rank');};
const prRow=(r,i)=>{const tp=r.hit;return [`#${i+1}`,num(r.score,2),tp?'<span class="hit">TP</span>':`<span class="miss">FP</span>`,r.why,`${r.tp}/${i+1}`,`${r.tp}/3`];};
S_('pr-walk','eval','Walk down the ranked list, one detection at a time',{builds:7,
 body:cols(`<div class="state-slot">${[1,2,3,4,5,6,7].map(b=>`<div data-only="${b}"><div class="table-sm xtight">${table(['rank','score','outcome','why','precision','recall'],PR.rows.map((r,i)=>i<b-1?prRow(r,i):[`#${i+1}`,num(r.score,2),'','','','']))}</div></div>`).join('')}</div>${small('A small invented list (3 objects, 6 detections) so that hits and misses interleave.')}`,
  `<div class="state-slot">${[1,2,3,4,5,6,7].map(b=>`<div data-only="${b}">${prPlot(b-1)}</div>`).join('')}</div>`,'1.15fr 1fr'),
 lines:['Six detections sorted by score; three objects in the photos. Lower the threshold one detection at a time and track precision and recall.','#1 (0.95) claims object A: TP. Precision 1/1, recall 1/3.','#2 (0.90) claims B: TP. 2/2, 2/3.','#3 (0.80) lands on A again, already claimed: a duplicate, FP. Precision falls to 2/3; recall stays.','#4 (0.70) where nothing is: FP. 2/4, 2/3.','#5 (0.60) claims C: TP. Recall reaches 1; precision 3/5.','#6 (0.40): FP. 3/6, 3/3. Every point is one possible threshold.'],
 ask:['What will we track as we go down the list?','Precision and recall after #1?','After #2?','After #3, and why did precision fall?','After #4?','After #5?','What does each point on the curve stand for?'],
 expected:['Cumulative TP and FP, then precision and recall.','1 and 1/3.','1 and 2/3.','2/3 and 2/3: a false positive was added.','1/2 and 2/3.','3/5 and 1.','The detector run with that score threshold.'],
 transition:'Summarise the whole curve in one number.'});
const apFig=()=>{const P=panel({W:600,H:400,L:66,B:58,T:30,xMin:0,xMax:1,yMin:0,yMax:1.05,ticksX:[0,1/3,2/3,1],ticksY:[0,.5,1],fmtX:v=>['0','⅓','⅔','1'][Math.round(v*3)],xLabel:'recall',yLabel:'precision'});
 const env=[[0,1],[2/3,1],[2/3,.6],[1,.6]];
 let s=P.axes+`<g data-at="2"><polygon points="${P.x(0)},${P.y(0)} ${P.x(0)},${P.y(1)} ${P.x(2/3)},${P.y(1)} ${P.x(2/3)},${P.y(.6)} ${P.x(1)},${P.y(.6)} ${P.x(1)},${P.y(0)}" fill="${COL.guess}" fill-opacity=".18"/>${label(P.x(1/3),P.y(.45),'⅓ × 1',{size:22,anchor:'middle',fill:COL.ink})}${label(P.x(.83),P.y(.3),'⅓ × 0.6',{size:22,anchor:'middle',fill:COL.ink})}${label(P.x(.5),P.y(.75),'⅓ × 1',{size:22,anchor:'middle',fill:COL.ink})}</g>`;
 s+=`<polyline points="${PR.rows.map(r=>`${P.x(r.recall).toFixed(1)},${P.y(r.precision).toFixed(1)}`).join(' ')}" fill="none" stroke="${COL.guess}" stroke-width="2" stroke-dasharray="6 5"/>`;
 s+=`<polyline points="${env.map(([a,b])=>`${P.x(a).toFixed(1)},${P.y(b).toFixed(1)}`).join(' ')}" fill="none" stroke="${COL.guess}" stroke-width="4"/>`;
 return fig(600,400,s,'The precision envelope and the area under it');};
S_('ap-area','eval','Average precision: the area under the curve',{builds:3,
 body:cols(apFig(),stack(p('Replace each precision by the best precision at that recall or beyond. The curve now only steps down.'),
  at(2,eq(R`\mathrm{AP}=\tfrac13(1)+\tfrac13(1)+\tfrac13(0.6)=${num(PR.ap,3)}`)),
  at(3,p('AP = 1 only if every object is found before the first false positive, as for the street’s people.'))),'1fr 1fr'),
 lines:['Smooth the zig-zag: at each recall, take the best precision reachable by lowering the threshold further. That is the envelope.',`Its area: a third of the recall at precision 1, another third at 1, the last third at 0.6. AP = ${num(PR.ap,3)}.`,'AP rewards ranking: correct detections should come before wrong ones. The street people scored AP = 1.'],
 ask:['Why take the best precision at this recall or beyond?','What is the area?','When is AP exactly 1?'],
 expected:['A user would never pick a threshold whose precision is beaten at a higher recall.',num(PR.ap,3),'When all objects are found before any false positive.'],
 point:`COCO samples the envelope at 101 recall values instead: ${num(PR.ap_coco,3)} here.`,
 transition:'Average over classes and IoU thresholds.'});
const BY=S.benchmark.yolo,BD=S.benchmark.detr;
S_('map','eval','mAP: average over classes, and over IoU thresholds',{builds:3,
 body:stack(at(1,`<div class="eq-sm">${eq(R`\mathrm{mAP}_{50}=\frac{1}{C}\sum_{c=1}^{C}\mathrm{AP}_c\quad(\text{a hit needs IoU}\ge0.5)`)}</div>`),at(2,`<div class="eq-sm">${eq(R`\mathrm{AP}_{[.5:.95]}=\text{mean of }\mathrm{mAP}\text{ at IoU }0.50,0.55,\dots,0.95`)}</div>`),
  at(3,`<div class="table-sm xtight">${table(['YOLOv8n','mAP@0.5','AP@[.5:.95]'],[[`our 8 photos, 7 classes, ${S.benchmark.n_gt} objects`,num(BY.map50,3),num(BY.map,3)],['COCO validation, 5,000 photos, 80 classes (published)','not given','0.373']])}</div>`)),
 lines:['mAP averages AP over classes. COCO goes further and averages over ten IoU thresholds, from loose (0.5) to strict (0.95), which rewards tight boxes.','Raising the IoU threshold turns loose boxes into false positives and their objects into misses: AP can only fall.',`On our eight clean photos: ${num(BY.map50,2)} at IoU 0.5, ${num(BY.map,2)} over the strict thresholds. On COCO, 0.373: real scenes are far harder.`],
 ask:['What does mAP average over?','Why average over IoU thresholds?','Why is COCO’s number so much lower than ours?'],
 expected:['Classes (and, for COCO, IoU thresholds).','To reward tight boxes over boxes that are only roughly right.','COCO has 80 classes and crowded, cluttered, small objects; our eight photos are clean and easy. A handful of photos is not a benchmark.'],
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
 transition:'Wrap-up.'});

// ================================================================================================ wrap-up
chap('9.1');
S_('summary','wrap','One question, one answer',{builds:2,
 body:stack(p('<b>Question:</b> a network’s output has a fixed shape; the answer is a list of any length, in no order.'),
  at(2,`<ol class="steps">${['A candidate at every place: each cell of three grids writes a box and 80 class scores.','In training, the cells near each object learn it; every other cell learns “nothing here”.','At test time, keep the confident cells, then NMS keeps one box per object.'].map(x=>`<li>${x}</li>`).join('')}</ol>`)),
 lines:['The lecture’s question: how can a network with a fixed output return a variable, unordered set?','In the dense answer, the score filter and NMS decide the list’s length, after the network.'],
 ask:['State the lecture’s question in one sentence.','Where is the number of detections decided?'],
 expected:['How a fixed-size output can describe a variable, unordered set.','After the network: the score filter and NMS.'],
 point:'Appendix A gives the other answer, DETR: a fixed set of 100 slots matched to objects in training, so no NMS.',
 transition:'Three uses of IoU.'});
S_('iou-uses','wrap','Three uses of IoU, easy to confuse',{builds:3,
 body:`<div class="table-sm">${table(['IoU used for','pairs','when'],[['assignment','cells ↔ annotated objects','training'],['NMS','predictions ↔ predictions','test time'],['evaluation','predictions ↔ annotated objects','measuring']].map((r,i)=>r.map(c=>at(i+1,c))))}</div>`,
 lines:['Training: pair cells with annotated objects. YOLOv8 ranks the cells by how well their boxes fit, measured with IoU.','Test time: NMS compares predictions with each other. Overlap above 0.7 means a duplicate.','Measuring: a detection is right if its IoU with an annotation is at least 0.5. All three pairings use the same measure.'],
 ask:['What does IoU pair up in training?','In NMS?','In evaluation?'],
 expected:['Cells, through their predicted boxes, with annotated objects.','Predictions with predictions.','Predictions with annotated objects.'],
 point:'Only assignment and evaluation use the annotations; NMS sees predictions only.',
 transition:'Back to the six jobs.'});
const everyday=[['road','far pedestrians are tiny','the fine grid (Part 7); follow boxes across frames'],
 ['crowd','people stand close and overlap','check the NMS threshold (Part 6)'],
 ['camera trap','small animals get unsure scores, like the bird','a lower cut-off (Part 8); more photos of small animals']];
const specialist=[['microscope','cell types','cells touch','label cells, fine-tune; NMS must keep touching cells'],
 ['warehouse','parcel','many sizes','label parcels, fine-tune the same detector'],
 ['factory','crack, scratch, dent','thin, small defects','higher resolution, the fine grid; measure recall']];
S_('apps-again','wrap','Back to the six jobs: the three everyday ones',{builds:2,
 body:`<div class="table-sm">${table(['job','what is hard','what to do'],everyday.map(([j,h,d])=>[j,h,at(2,d)]))}</div>`,
 lines:['A pretrained COCO detector already knows these classes. What is hard in each job?','What remains is tuning: the grids, the NMS threshold, the score cut-off.'],
 ask:['What makes each of these jobs hard?','What would you change for each?'],
 expected:['Tiny far pedestrians; people who overlap; small animals with unsure scores.','Rely on the fine grid; check the NMS threshold; lower the score cut-off.'],
 transition:'The three specialist jobs.'});
S_('apps-new','wrap','Back to the six jobs: the three new ones',{builds:2,
 body:`<div class="table-sm">${table(['job','new classes','what is hard','what to do'],specialist.map(([j,c,h,d])=>[j,c,h,at(2,d)]))}</div>`,
 lines:['COCO has none of these classes, so no pretrained detector finds them as it is.','Label a few hundred photos with boxes, fine-tune the same detector, and measure precision and recall on photos it has not seen.'],
 ask:['Could a COCO detector do these jobs as it is?','What would you do first for the microscope job?'],
 expected:['No: their classes are not among COCO’s 80.','Annotate cells with boxes, fine-tune a pretrained detector on them, and measure precision and recall.'],
 point:'Fine-tuning starts from COCO weights: the CNN already knows edges, textures and shapes; only the heads must learn the new classes.',
 transition:'Next lecture.'});
S_('next','wrap','Next: beyond boxes',{builds:1,
 body:cols(courtyard(masks(),'Masks for the cat and the dog'),stack(p('A box is a rough answer. Next lecture: which pixels belong to each object (masks), keypoints, depth, and boxes found from words: “the dog on the right”.'),
  p('<a href="https://nipunbatra.github.io/attention/beyond-boxes/">Beyond Boxes</a> · <a href="https://nipunbatra.github.io/attention/language-grounded-vision/">Language-grounded vision</a>'),
  p(`Practice: <a href="${COLAB}">the notebook</a> runs every number in this lecture. Appendices: <a href="?all#part-A/1">A, DETR</a> · <a href="?all#opt-yolov1/1">B, more depth</a>.`)),'1.2fr 1fr'),
 lines:['Boxes are the coarsest description of where an object is. Next: masks, keypoints, and finding objects named in words.'],
 ask:['What does a mask give that a box does not?'],expected:['Exactly which pixels are the object.'],
 transition:'End of the main route.',source:'Masks: YOLOv8n-seg run on the photo (scripts/run_models.py).'});

// ================================================================================================ Appendix A: DETR
A_('part-A','detr','Appendix A · DETR: a fixed set of slots, matched to objects',{part:'A',builds:1,
 body:`<div class="part-break">${p('Back to Part 4’s slots: make 100 of them, let each read the whole image, and match slots to objects before the loss, so no NMS is needed.')}<ol class="steps">${['Follow a photo through DETR to 100 predictions, and see where two queries looked.','Watch duplicates vanish inside the decoder.','Build the matching cost one cell at a time, solve the matching, and compute the loss.'].map(x=>`<li>${x}</li>`).join('')}</ol></div>`,
 lines:['The other answer to the lecture’s question: DETR, 100 slots that read the image with attention, matched to objects instead of cleaned up by NMS.'],
 ask:['What were the two problems of K slots in Part 4?'],expected:['Too few slots for some photos, and no rule for which slot answers for which object.'],transition:'Fix them one at a time.'});
chap('A.1');
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
chap('A.2');
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
 body:stack(eq(R`C=-\,\qcol{p(\text{class})}\;+\;5\,\big\|\qcol{\hat b}-\pcol{b}\big\|_1\;-\;2\,\mathrm{GIoU}(\qcol{\hat b},\pcol{b})`),
  at(2,eq(R`\text{class: }-p(\text{dog})=${num(c00.cls,3)}`)),
  at(3,eq(R`\text{box, L1: }|${num(MT.q_boxes[0][0],3)}-${num(MT.target_boxes[0][0],3)}|+\dots=${num(c00.l1,3)},\quad\times5=${num(5*c00.l1,3)}`)),
  at(3,eq(R`\text{box, GIoU: }${num(c00.g,3)},\quad\times(-2)=${num(-2*c00.g,3)}`)),
  at(4,eq(R`C=${num(c00.cls,3)}+${num(5*c00.l1,3)}-${num(2*c00.g,3)}=\lcol{${num(c00.t,2)}}`))),
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
 body:sm(at(1,eq(R`\text{q61}\to\text{left dog: }\ -\log ${num(MT.q_p[0],3)}+5\times${num(mp.l1,3)}+2\times(1-${num(mp.giou,3)})`)),
  at(1,eq(R`=${num(mp.ce,3)}+${num(5*mp.l1,3)}+${num(2*mp.giou_loss,3)}=\lcol{${num(mp.ce+5*mp.l1+2*mp.giou_loss,3)}}`)),
  at(2,eq(R`\text{q2}\to\text{no object: }\ 0.1\times(-\log ${num(ML.unmatched.p_none,3)})=${num(-0.1*Math.log(ML.unmatched.p_none),4)}`)),
  at(3,eq(R`\text{q90 (a plant)}\to\text{no object: }\ 0.1\times(-\log ${num(ML.unmatched_plant.p_none,3)})=\lcol{${num(ML.unmatched_plant.weighted,3)}}`))),
 point:'Our target list holds only the two dogs, so the loss would teach q90 to call the pot nothing. What is annotated decides what is learned; COCO does label potted plants.',
 lines:['A matched query learns its object: cross-entropy for the class, plus L1 and 1 − GIoU for the box. q61 is already almost perfect: tiny loss.','An unmatched query learns “no object”, its cross-entropy weighted by 0.1 because most queries are empty. q2 already says no object: almost no loss.',`q90 named a real plant, but plants are not in this target list, so it pays ${num(ML.unmatched_plant.weighted,2)} for being right.`],
 ask:['What does a matched query learn?','What does an unmatched query learn, and why the weight 0.1?','Why is q90 penalised?'],
 expected:['Its object’s class and box.','“No object”; 0.1 keeps the ~98 empty queries from dominating.','It found an object the annotation leaves out.'],
 transition:'Why does this remove duplicates?',source:DETR_SRC});
chap('A.3');
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
O('opt-yolov1','YOLOv1 (2016): one responsible cell per object',{builds:1,
 body:stack(eq(R`7\times7\ \text{cells}\times(2\times5+20)=7\times7\times30`),p('Each cell: two boxes, each (x, y, w, h, confidence), and one set of 20 class probabilities (PASCAL VOC). Only the cell containing an object’s centre is responsible for it; x, y are offsets inside that cell, w, h fractions of the image.'),small('Confidence was trained toward the IoU between the box and the truth. A cell could hold at most one object’s class.')),
 ask:['Why did YOLOv1 struggle with flocks of birds?'],expected:['Each cell had one class vector: several small objects with centres in one cell could not all be described.']});
O('opt-anchors','Anchors: predict offsets from template boxes',{builds:1,
 body:stack(eq(R`b_x=\sigma(t_x)+c_x,\quad b_y=\sigma(t_y)+c_y,\quad b_w=p_w\,e^{t_w},\quad b_h=p_h\,e^{t_h}`),p('Faster R-CNN, SSD and YOLOv2 to v5 place several template boxes (anchors) of chosen sizes and shapes at every cell, and predict small corrections to each. Positives are anchors with high IoU to an object.'),small('Anchor-free detectors (FCOS, YOLOv8) predict distances from the cell centre instead, as in Part 5.')),
 ask:['What must be chosen by hand for an anchor-based detector?'],expected:['The anchor sizes and aspect ratios, and the IoU thresholds for positives.']});
const C0=CELL.centre,T0=CELL.target_ltrb;
const ltrbFig=(vals,stroke,b,from=1)=>{const [l,t,r,bb]=vals,[cx,cy]=C0;const f=fsz(dogView,21,420);
 const A=(k,x2,y2,txt,tx,ty,anchor)=>`<g data-at="${from+k}">${arrow(cx,cy,x2,y2,{stroke,w:5,head:18})}${label(tx,ty,txt,{size:f,fill:stroke,weight:700,anchor,halo:true})}</g>`;
 return A(0,cx-l,cy,`l = ${num(l,1).replace('.0','')}`,cx-l/2,cy-14,'middle')+A(1,cx,cy-t,`t = ${num(t,1).replace('.0','')}`,cx+12,cy-t/2,'start')+A(2,cx+r,cy,`r = ${num(r,1).replace('.0','')}`,cx+r/2,cy+38,'middle')+A(3,cx,cy+bb,`b = ${num(bb,1).replace('.0','')}`,cx+12,cy+bb/2+30,'start');};
O('opt-ltrb','YOLOv8’s box: four distances from the cell centre',{builds:5,
 body:cols(grid(gtBox(DOG,'',{w:4})+cell(10,18,s32,{fill:COL.guess,op:.7})+`<circle cx="${C0[0]}" cy="${C0[1]}" r="9" fill="#fff" stroke="${COL.ink}" stroke-width="3"/>`+ltrbFig(T0,COL.target,null,2),'Arrows from the cell centre to the four sides of the dog’s box',{view:dogView}),
  sm(eq(R`\text{centre}=(18.5\times32,\ 10.5\times32)=(${C0[0]},\,${C0[1]})`),
   at(2,eq(R`l=${C0[0]}-${DOG[0]}=${T0[0]}`)),at(3,eq(R`t=${C0[1]}-${DOG[1]}=${T0[1]}`)),at(4,eq(R`r=${DOG[2]}-${C0[0]}=${T0[2]}`)),at(5,eq(R`b=${DOG[3]}-${C0[1]}=${T0[3]}`))),'1fr 1.1fr'),
 lines:['Stand at the centre of cell (10, 18): column 18 and row 10, plus a half, times 32 pixels.',`Left: how far to the box’s left edge. ${C0[0]} − ${DOG[0]} = ${T0[0]} pixels.`,`Top: ${C0[1]} − ${DOG[1]} = ${T0[1]}.`,`Right: ${DOG[2]} − ${C0[0]} = ${T0[2]}.`,`Bottom: ${DOG[3]} − ${C0[1]} = ${T0[3]}. Like standing in a room and measuring the distance to each wall: four numbers fix the box.`],
 ask:['Where is the centre of cell (10, 18)?','What is l?','What is t?','What is r?','How would you get the box back from (l, t, r, b)?'],
 expected:[`(${C0.join(', ')}).`,String(T0[0]),String(T0[1]),String(T0[2]),`x₁ = ${C0[0]} − l, y₁ = ${C0[1]} − t, x₂ = ${C0[0]} + r, y₂ = ${C0[1]} + b.`],
 point:'This is the anchor-free form of FCOS (2019) and YOLOv8 (2023). YOLOv1 (2016) instead predicted the centre’s offset inside the cell and the box’s width and height: optional slide.',
 source:PHOTO_SRC});
O('opt-two-stage','Two-stage detectors: propose, then classify',{builds:1,
 body:stack(p('<b>Stage 1</b>, a region proposal network: about 2,000 boxes that might contain something. <b>Stage 2</b>: crop features for each proposal (RoI pooling), classify it and refine its box.'),p('R-CNN (2014) ran a CNN per proposal; Fast R-CNN (2015) shared one CNN pass; Faster R-CNN (2015) learned the proposals too. Mask R-CNN adds a mask per proposal: Lecture 23.'),small('torchvision’s fasterrcnn_resnet50_fpn returns post-processed detections: its NMS is already inside.')),
 ask:['What does the first stage output?'],expected:['Class-agnostic candidate boxes (proposals), to be classified by the second stage.']});
O('opt-focal','Focal loss: quiet the easy background',{builds:1,
 body:stack(eq(R`\mathrm{FL}(p_t)=-(1-p_t)^{\gamma}\log p_t,\qquad p_t=\begin{cases}p&y=1\\1-p&y=0\end{cases}`),p(`A background cell with p = ${num(CELL.bg_max,3)}: p<sub>t</sub> = ${num(1-CELL.bg_max,3)}, so with γ = 2 its loss is multiplied by (1 − p<sub>t</sub>)² ≈ 10⁻⁶. Easy examples nearly vanish; hard ones keep their weight.`),small('RetinaNet (Lin et al., 2017) made one-stage detectors as accurate as two-stage ones this way.')),
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

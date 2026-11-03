// Object detection, Lecture 22 of ES 667. One photo carries the lecture: a cat and a dog in a courtyard.
// Every number comes from data/science.json, which scripts/science.py computes from real YOLOv8n and DETR outputs.
import {m,eq,at,only,cols,code,table,flow,palette,esc} from './shared/author.js';
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
/** Reveals inside an SVG figure: an HTML wrapper would break out of the SVG, so use a group. */
const gat=(b,svgInner)=>`<g data-at="${b}">${svgInner}</g>`,gonly=(b,svgInner)=>`<g data-only="${b}">${svgInner}</g>`;
const tgt=s=>`<span class="target">${s}</span>`,gss=s=>`<span class="guess">${s}</span>`,lss=s=>`<span class="loss">${s}</span>`;
const {W,H}=S.photo,DOG=S.dog.xyxy,CAT=S.cat.xyxy,W2=1280,H2=704;
const YOLO_SRC='YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.';
const DETR_SRC='DETR (facebook/detr-resnet-50, Hugging Face) run on this photo by scripts/run_models.py.';
const PHOTO_SRC='The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.';

export const meta={
 id:'object-detection',number:22,title:'Object detection',series:'ES 667 Deep Learning',
 subtitle:'From one label to a set of objects',minutes:110,notebook:'object-detection.ipynb',
 sections:[
  {id:'map',title:'Lecture map',minutes:1},
  {id:'why',title:'Part 1 · Why detect objects?',minutes:12},
  {id:'task',title:'Part 2 · From one label to a list',minutes:9},
  {id:'boxes',title:'Part 3 · Boxes and IoU',minutes:14},
  {id:'onebox',title:'Part 4 · One box, then many',minutes:10},
  {id:'dense',title:'Part 5 · A candidate at every place',minutes:26},
  {id:'nms',title:'Part 6 · One box per object: NMS',minutes:13},
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
 ['5.1','From sliding windows to one pass'],['5.2','What each cell writes'],['5.3','Which cells answer for an object'],['5.4','The loss'],['5.5','Reading boxes back out'],
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
/** A part's closing slide: what we did, and how it leads on. */
function recap(k,section,did,next,o){
 S_(`recap-${k}`,section,`Part ${k} in one slide`,{builds:1,nb:null,
  body:`<div class="part-break">${strip(k)}<ol class="steps">${did.map(x=>`<li>${x}</li>`).join('')}</ol><p class="callout"><b>Next:</b> ${next}</p></div>`,
  lines:[o.line],ask:[o.ask],expected:[o.expected],point:o.point||'',transition:o.transition});
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
 'Six photos, six jobs: say what you would want to know, then see the answer.','Notice that every answer has the same shape, and what it is used for.','Three things that make the job hard.'],
 {line:'Why detection matters: six jobs, one kind of answer, three difficulties.',ask:'Where have you seen a computer draw boxes around things?',expected:'Phone cameras (faces), driver-assistance demos, traffic cameras, photo apps that find people or pets.',transition:'The first job: a street.'});
chap('1.1');
const street=S.finals.street,colOf=n=>n==='person'?COL.guess:n==='dog'?COL.target:n==='car'?COL.data:COL.amber;
const HAND_SRC='Boxes drawn by us (data/applications.json): COCO has no such class, so no detector here can find it. '+PHOTO_SRC;
/** One job: the photo alone first (what would you want to know?), then the list that answers it. */
function app(id,title,{name,boxes,alt,view=null,question,find,use,world,lines,ask,expected,point='',transition,source}){
 S_(id,'why',title,{builds:2,
  body:cols(photo(name,W2,H2,gat(2,boxes),alt,{view}),
   stack(p(question),at(2,`<dl class="kv"><dt>find</dt><dd>${find}</dd><dt>use</dt><dd>${use}</dd></dl>`),at(2,small(world))),'1.5fr 1fr'),
  lines,ask,expected,point,transition,source});
}
const persons=S.finals.crowd.filter(k=>k.name==='person'),cdb=S.finals['cat-dog-bird'],animals=cdb.filter(k=>k.name==='cat'||k.name==='dog');
const [parcel]=S.apps.boxes.parcel.map(x=>x[1]),[crack]=S.apps.boxes.defect.map(x=>x[1]),cellBoxes=S.apps.boxes.cells.map(x=>x[1]);
app('app-road','On the road: who is where?',{name:'street',view:[40,300,1200,404],
 boxes:street.map(k=>prBox(k.box,`${k.name} ${num(k.score)}`,{size:24,w:4,fill:colOf(k.name)})).join(''),
 alt:'A campus street; YOLOv8n boxes four people, a car, a bicycle and a dog',
 question:'A car’s camera sees this street. What must the car know before it brakes or steers?',
 find:'people, cyclists, vehicles, animals',use:'brake or steer; follow each one from frame to frame',
 world:'In US crash data, cars that brake automatically for pedestrians had 27% fewer pedestrian crashes, but no fewer on dark, unlit roads (IIHS, 2022).',
 lines:['A car’s camera sees this street. Before it brakes or steers, what does it need to know?',
  `YOLOv8n’s answer: ${street.filter(k=>k.name==='person').length} people, a car, a bicycle and a dog, each with a box and a score. This list is what the car acts on.`],
 ask:['What does the car need to know?','What does the detector give it?'],
 expected:['Who is on the road, and where each one is.',`${street.length} entries: four people, a car, a bicycle, a dog, each with a box and a score.`],
 point:'IIHS (2022), “Pedestrian crash avoidance systems cut crashes, but not in the dark”. In India, AI traffic cameras flag riders without helmets and triple riding: Kerala installed 726 road cameras, 675 of them AI-capable, in 2023 (The South First).',
 transition:'A crowd.',source:YOLO_SRC});
app('app-crowd','In a crowd: how many people?',{name:'crowd',view:[60,340,1160,340],
 boxes:persons.map(k=>rect(k.box,{stroke:COL.guess,w:4})).join(''),
 alt:'People walking on a campus path, each boxed by YOLOv8n',
 question:'How many people are on this path? Count them before the next click.',
 find:'people',use:'count them; warn when a place gets too crowded',
 world:'Stations, stadiums and large gatherings count people camera by camera to spot dangerous crowding early.',
 lines:['How many people are on this path? Count them.',`YOLOv8n boxes ${persons.length} people. The count is the length of the list, and the list also says where each person is.`],
 ask:['How many people are there?','How does the detector’s answer give the count?'],
 expected:[`${persons.length}.`,`It is the number of person entries in the list: ${persons.length}.`],
 point:`YOLOv8n also boxes ${S.finals.crowd.length-persons.length} bags (backpacks and handbags), not drawn here. Very dense crowds are usually counted by density estimation instead of boxes, because heads hide one another: Maha Kumbh 2025 used AI-enabled CCTV to estimate people per square metre (PIB, 2024).`,
 transition:'A camera in the wild.',source:YOLO_SRC});
app('app-wild','At a camera trap: which animals walked past?',{name:'cat-dog-bird',
 boxes:animals.map(k=>prBox(k.box,`${k.name} ${num(k.score)}`,{size:30,w:5})).join(''),
 alt:'A courtyard with a cat, a dog and a small bird; YOLOv8n boxes the cat and the dog',
 question:'A camera on a trail takes a photo whenever something moves. Which animals are in this one?',
 find:'animals by species, people, vehicles',use:'count each species; skip the empty photos',
 world:'In an Arctic study of 548,627 camera-trap photos, a workflow built on the free MegaDetector left only 4–9% for people to check (Celis et al., 2024).',
 lines:['A camera trap takes a photo whenever something moves. Which animals are in this one?',`YOLOv8n: a cat (${num(animals.find(k=>k.name==='cat').score)}) and a dog (${num(animals.find(k=>k.name==='dog').score)}). Look again at the photo: did it find every animal? We come back to this in a few slides.`],
 ask:['Which animals are in the photo?','Did the detector find them all?'],
 expected:['A cat, a dog, and a small yellow bird on the branch.','No: the bird is missing (section 1.3).'],
 point:`YOLOv8n also boxed two potted plants (${cdb.filter(k=>k.name==='potted plant').map(k=>num(k.score)).join(', ')}), not drawn: this job ignores them. Celis et al., Ecological Informatics 81 (2024) 102578: 46 cameras in Finnmark and Yamal; manual checking cut to 9.2% and 3.9% of the photos.`,
 transition:'A microscope.',source:YOLO_SRC});
app('app-cells','Under a microscope: count the cells',{name:'cells',
 boxes:cellBoxes.map(b=>gtBox(b,'',{w:5})).join(''),
 alt:'Twelve stained cells on a microscope slide, each with a box drawn by hand',
 question:'Stained cells under a microscope. A lab wants to know how many there are, and of which kinds.',
 find:'cells, by type',use:'count them; crop each one and classify its type',
 world:'Finding cells starts with labelled examples: the 2018 Data Science Bowl’s 841 images carry 37,333 nuclei, each marked by hand (Nature Methods, 2019).',
 lines:['Stained cells under a microscope. What would a lab want to know?',`${cellBoxes.length} cells, each boxed. These teal boxes are ours: COCO has no class “cell”, so no detector in this lecture knows one. A cell detector is trained on lists exactly like this.`],
 ask:['What would a lab want from this photo?','Who drew these boxes, and why does it matter?'],
 expected:['How many cells, where each is, and what type each one is.','We did, from the colours, checked by eye. Such hand-made lists are the training data a cell detector would learn from.'],
 point:'Teal boxes are annotations (made by people); purple boxes are a model’s output. The lecture keeps these colours throughout.',
 transition:'A warehouse.',source:HAND_SRC});
app('app-parcel','In a warehouse: where is the parcel?',{name:'parcel',
 boxes:gtBox(parcel,'parcel',{w:6,size:30})+`<circle cx="${(parcel[0]+parcel[2])/2}" cy="${(parcel[1]+parcel[3])/2}" r="11" fill="${COL.target}" stroke="#fff" stroke-width="4"/>`,
 alt:'A cardboard parcel on a conveyor belt, boxed by hand, with its centre marked',
 question:'A robot arm waits at the end of this belt. What must it know to pick the parcel up?',
 find:'parcels, sacks, envelopes',use:'aim the gripper at the box; count parcels per hour',
 world:'A harder relative: the SKU-110K photos of shop shelves hold about 147 boxed products each, packed edge to edge (Goldman et al., 2019).',
 lines:['A robot arm waits at the end of the belt. What must it know to pick the parcel up?',`One entry: a parcel, ${parcel[2]-parcel[0]} × ${parcel[3]-parcel[1]} pixels. The arm aims at the box’s centre, the dot; a counter just counts entries.`],
 ask:['What does the arm need to know?','Where should it aim?'],
 expected:['Where the parcel is, and roughly how big.',`At the centre of the box, (${(parcel[0]+parcel[2])/2}, ${(parcel[1]+parcel[3])/2}).`],
 transition:'A factory.',source:HAND_SRC});
app('app-crack','On a production line: is anything wrong?',{name:'defect',view:[280,60,760,460],
 boxes:gtBox(crack,'crack',{w:5,size:28}),
 alt:'A machined aluminium part; a hairline crack on its arm is boxed by hand',
 question:'This part has just been machined. Look closely: is anything wrong with it?',
 find:'cracks, scratches, dents, missing holes',use:'reject the part; show the inspector where to look',
 world:'Inspection data sets look like this list: NEU-DET labels six kinds of steel-surface defect, 300 photos of each, every defect boxed.',
 lines:['A freshly machined part. Look closely: is anything wrong?',`A hairline crack on the arm, inside a box ${crack[2]-crack[0]} × ${crack[3]-crack[1]} pixels. The box tells the inspector exactly where to look.`],
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
  stack(p(`The bus is ${bus[2]-bus[0]} pixels wide.`),at(2,p(`The far pedestrian: ${farPed[2]-farPed[0]} pixels, ${Math.round((bus[2]-bus[0])/(farPed[2]-farPed[0]))} times narrower. One detector must box both.`))),'1.5fr 1fr'),
 lines:[`One photo, a bus ${bus[2]-bus[0]} pixels wide.`,`And a pedestrian ${farPed[2]-farPed[0]} pixels wide, far down the road: ${Math.round((bus[2]-bus[0])/(farPed[2]-farPed[0]))} times narrower. A classifier sees one main thing; a detector must handle both sizes at once.`],
 ask:['How wide is the bus?','How much smaller is the pedestrian, and why does it matter?'],
 expected:[`${bus[2]-bus[0]} pixels.`,`About ${Math.round((bus[2]-bus[0])/(farPed[2]-farPed[0]))} times narrower: a feature that sees the whole bus is far too coarse for the pedestrian.`],
 point:'Part 7 shows how a detector handles this: predictions from three grids of different cell sizes.',
 transition:'Small objects are easy to miss.',source:'Boxes: our annotation (data/annotations.json). '+PHOTO_SRC});
const B=S.bird,birdView=[440,60,220,140];
S_('hard-small','why','Hard, 2: small objects are easy to miss',{builds:3,
 body:cols(`<div class="state-slot"><div data-only="1">${photo('cat-dog-bird',W2,H2,cdb.map(k=>prBox(k.box,`${k.name==='potted plant'?'plant':k.name} ${num(k.score)}`,{size:26,w:4,fill:k.name==='potted plant'?COL.amber:COL.guess})).join(''),'YOLOv8n’s four detections: a cat, a dog and two plants')}</div><div data-only="2-3">${photo('cat-dog-bird',W2,H2,gtBox(B.gt,'',{w:2.5})+prBox(B.best.box,'',{w:2,dash:'5 3'})+pill(B.best.box[0],B.best.box[1]-2,`bird ${num(B.best.score,3)}`,{fill:COL.guess,size:14}),'The bird, zoomed: our box and YOLOv8n’s best bird box',{view:birdView})}</div></div>`,
  stack(only(1,p('YOLOv8n’s four detections: cat, dog, two plants.')),at(2,p(`The bird is ${B.w} × ${B.h} pixels. One cell did draw a box on it, IoU <b>${num(B.iou,3)}</b> with ours, but scored it <b>${num(B.best.score,3)}</b>.`)),
   at(2,small('Below the usual cut-off of 0.25, so the box is thrown away.')),at(3,p(`Its next guess for that cell: ${B.runner_up[0]}, ${num(B.runner_up[1],3)}. A small yellow thing.`))),'1.4fr 1fr'),
 lines:['Back to the camera trap. YOLOv8n reports a cat, a dog and two plants. Where is the bird?',`Zoom in. The bird is ${B.w} × ${B.h} pixels. One cell boxed it almost perfectly, IoU ${num(B.iou,2)}, but gave “bird” a score of only ${num(B.best.score,3)}, so it was dropped.`,`That cell’s second guess was “${B.runner_up[0]}” at ${num(B.runner_up[1],3)}. Few pixels, little detail: small objects get low, unsure scores.`],
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
recap(1,'why',['Detection answers <b>what is where</b>: a list of (class, box, score), one entry per object.','The same answer serves roads, crowds, camera traps, microscopes, warehouses and factories.','The list is used to <b>count, locate, track</b> and <b>crop</b> for a second look.','Hard: sizes vary about 40×, small objects get unsure scores, objects overlap.'],
 'why an ordinary classifier cannot give this list, and what a network would have to output instead.',
 {line:'Part 1: what detection is for. Part 2: why a network finds a list hard to produce.',ask:'In one sentence, what does a detector return?',expected:'A list with one entry per object: its class, its box and a score.',
  point:'The long tail: Karpathy (Tesla, ScaledML 2020) showed stop signs held by road workers, on school buses and half hidden by leaves; each kind needed its own labelled examples before the detector handled it.',transition:'Part 2.'});

// ================================================================================================ Part 2
partBreak(2,'task','From one label to a list','A classifier answers with one word. We need a list. Why is a list hard for a network?',[
 'What a classifier says about one photo, and what we want instead.','Two awkward facts about the list: its length changes, and its order means nothing.','The route through the rest of the lecture.'],
 {line:'From one label to a list of (class, box) entries.',ask:'What does a classifier output for a photo with two animals?',expected:'One label (a probability for each class), for the whole photo.',transition:'One photo, one label.'});
chap('2.1');
S_('one-label','task','What is in this photo?',{builds:3,
 body:cols(courtyard('','A golden retriever and a tabby cat in a sunlit courtyard'),
  at(2,`<div class="table-sm">${table(['ImageNet class','probability'],S.classifier.top5.map(x=>[esc(x.label),num(x.p,3)]))}</div>`)+
  at(3,small(`One label for the whole photo. Its 118 dog classes together hold ${num(S.classifier.dog_classes,2)}; the five cat classes, ${num(S.classifier.cat_classes,2)}.`)),'1.25fr 1fr'),
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
  'Second entry: cat. Two objects, two entries. A photo with five objects gets five.'],
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
  stack(eq(R`Y=\{(c_1,\pcol{b_1}),\,\dots,\,(c_N,\pcol{b_N})\}`),at(2,p('Number the dogs either way: it is the same answer. Only each class stays paired with its own box.')))
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
 point:'CS231n (Stanford, 2016–17) frames detection the same way: one object needs 4 numbers, two need 8, four need 16, so detection needs a variable-sized output.',
 transition:'The route through the rest of the lecture.'});
const routeRows=[['3','Boxes and IoU','four numbers for a box; a score for how well two boxes agree'],['4','One box, then many','a network that outputs one box works; several boxes break the loss'],
 ['5','A candidate at every place','every cell of a grid writes a box and class scores; train the cells near each object'],['6','NMS','keep one box per object'],['7','Three grids','small and large objects'],['8','Measuring','precision, recall and AP']];
S_('route','task','Today’s route: build a detector step by step',{builds:2,
 body:stack(`<ol class="steps route">${routeRows.map(([k,t,d],i)=>`<li data-at="${i<2?1:2}" value="${k}"><b>${t}</b>: ${d}</li>`).join('')}</ol>`,
  at(2,small('Appendix A: the other answer, DETR, a fixed set of slots matched to objects, with no NMS.'))),
 lines:['First the tools (Part 3), then a network that outputs boxes, to see exactly where a fixed output breaks (Part 4).',
  'Then the answer used by YOLO and most fast detectors: a candidate at every place, cleaned up by NMS, at three sizes; and how to measure the result.'],
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
 lines:[`Every position is a pair of pixel counts from the top-left corner: x to the right, y downwards. This photo is ${W} × ${H}.`,`The dog’s top-left corner is at (${DOG[0]}, ${DOG[1]}); its bottom-right corner at (${DOG[2]}, ${DOG[3]}).`],
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
 lines:['A training photo is stored with a small text file: one line per object. This is the YOLO format, for our two annotated animals.',`Read a line: a class number (COCO counts from 0: ${LF[1].id} is cat, ${LF[0].id} is dog), then the box’s normalised centre and size. Training a detector means learning to write these lines.`],
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
  stack(p(`A person far down the street, ${farP[2]-farP[0]} px wide.`),at(2,p('Move the box by the same 60 px right and 40 px down: it no longer touches the person.')),at(2,small('A slip that is fine for the dog misses the small person completely. We need a score that scales with the box.'))),'1.1fr 1fr'),
 lines:[`A person far down the street: ${farP[2]-farP[0]} pixels wide.`,'The same 72-pixel slip leaves the guess off the person entirely. For the dog it was a small error; here it is a miss. Compare overlap, not distance.'],
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
const ip=S.iou_practice;
const iouFig=b=>courtyard(gtBox(DOG,'A',{size:28})+prBox(guess,'B',{size:28})+(b>=4?rect(ip.inter_box,{stroke:'none',w:0,fill:COL.guess,op:.35}):'')+
 (b>=1?line(guess[0],0,guess[0],H,{stroke:COL.ink,w:3,dash:'8 6'}):'')+(b>=2?line(0,guess[1],W,guess[1],{stroke:COL.ink,w:3,dash:'8 6'}):'')+(b>=3?line(DOG[2],0,DOG[2],H,{stroke:COL.ink,w:3,dash:'8 6'})+line(0,DOG[3],W,DOG[3],{stroke:COL.ink,w:3,dash:'8 6'}):''),'The overlap rectangle of the two boxes',{view:dogView});
S_('iou-overlap','boxes','IoU, step 1: the overlap rectangle',{builds:4,
 body:cols(`<div class="state-slot">${[1,2,3,4].map(b=>`<div data-only="${b}">${iouFig(b)}</div>`).join('')}</div>`,
  sm(at(1,eq(R`\text{left}=\max(${DOG[0]},\,${guess[0]})=${ip.inter_box[0]}`)),at(2,eq(R`\text{top}=\max(${DOG[1]},\,${guess[1]})=${ip.inter_box[1]}`)),
   at(3,eq(R`\text{right}=\min(${DOG[2]},\,${guess[2]})=${ip.inter_box[2]}`)),at(3,eq(R`\text{bottom}=\min(${DOG[3]},\,${guess[3]})=${ip.inter_box[3]}`)),
   at(4,eq(R`\text{area}=${ip.iw}\times${ip.ih}=${bt(ip.inter)}`))),'0.9fr 1.1fr'),
 lines:['The overlap starts where both boxes have started: the larger of the two left edges.','Likewise its top is the larger of the two tops.','It ends where the first box ends: the smaller right edge and the smaller bottom edge.',`Its area: ${ip.iw} × ${ip.ih} = ${big(ip.inter)} square pixels. (If a width came out negative, the boxes would not touch: area 0.)`],
 ask:['Why the larger of the two left edges?','What is the top of the overlap?','Why the smaller right edge?','What is the overlap’s area?'],
 expected:['A point is in both boxes only if it is right of both left edges.',String(ip.inter_box[1]),'A point must be left of both right edges.',`${big(ip.inter)} px².`],
 misconception:'Clamp the width and height at zero: two boxes far apart would otherwise give a “negative overlap” whose product can be positive.',
 transition:'Now the union.',source:PHOTO_SRC});
S_('iou-union','boxes','IoU, step 2: the union, then the ratio',{builds:3,
 body:stack(at(1,eq(R`\text{area}(A)=${S.dog.w}\times${S.dog.h}=${bt(ip.area_a)},\qquad \text{area}(B)=${bt(ip.area_b)}`)),
  at(2,eq(R`\text{union}=${bt(ip.area_a)}+${bt(ip.area_b)}-${bt(ip.inter)}=${bt(ip.union)}`)),
  at(3,eq(R`\mathrm{IoU}=\frac{${bt(ip.inter)}}{${bt(ip.union)}}=${num(ip.iou,3)}`))),
 lines:['Each box’s own area. The guess has the same size as our box; it is only moved.','Adding the two areas counts the overlap twice, so subtract it once.',`IoU = ${num(ip.iou,3)}. A move of 60 px right and 40 px down cost more than a third of the score.`],
 ask:['What is each area?','Why subtract the overlap?','What is the IoU?'],
 expected:[`${big(ip.area_a)} px² each.`,'It was counted in both areas.',num(ip.iou,3)],
 transition:'What do different IoU values look like?'});
const gallery=S.iou_gallery.map(g=>{const b=[DOG[0]+g.shift,DOG[1],DOG[2]+g.shift,DOG[3]];return `<figure>${courtyard(gtBox(DOG,'',{w:7})+prBox(b,'',{w:7}),`IoU ${g.iou}`,{view:[300,40,640,600]})}<figcaption>IoU ${g.iou} · moved ${g.shift} px</figcaption></figure>`;}).join('');
S_('iou-feel','boxes','What IoU values look like',{builds:2,
 body:stack(`<div class="four thumb">${gallery}</div>`,at(2,p(`Benchmarks usually count IoU ≥ 0.5 as a hit. The real YOLOv8n box for this dog has IoU ${num(S.iou_real.iou,3)} with ours.`))),
 lines:['The guess slides sideways. At 0.9 the boxes nearly agree; at 0.5 the guess has moved a third of the dog’s width; at 0.3, half of it.',`Most benchmarks call IoU ≥ 0.5 a hit. A trained detector does much better on this dog: ${num(S.iou_real.iou,3)}.`],
 ask:['Which of these would you accept as finding the dog?','How does a trained detector compare?'],
 expected:['Most people accept 0.7 and reject 0.3; 0.5 is the usual cut-off.',`Its box has IoU ${num(S.iou_real.iou,3)}.`],
 point:'For a sideways move s of a box of width w, IoU = (w − s)/(w + s): IoU 0.5 needs s = w/3.',
 transition:'Try it yourself.',source:YOLO_SRC});
S_('iou-play','boxes','Try it: drag a box over the dog',{builds:1,
 body:widget('iou-play','Drag a box and watch its IoU with the dog’s box'),
 lines:['Drag the purple box. Can you find a box with IoU 0.5 that looks good? One with IoU 0.7 that looks bad?'],
 ask:['Where must the box be for IoU to be 1?'],expected:['Exactly on the teal box: “Snap onto the dog”.'],
 point:'Shrink the box inside the dog: IoU falls even though every purple pixel is on the dog. IoU punishes too small as much as too big.',
 transition:'In code, IoU is computed for many pairs at once.'});
S_('iou-code','boxes','IoU in code: every pair at once',{builds:2,
 body:`<div class="code-sm">`+stack(code(`def box_iou(a, b):              # a: (N, 4), b: (M, 4), corners
    lt = torch.max(a[:, None, :2], b[None, :, :2])  # overlap's top-left
    rb = torch.min(a[:, None, 2:], b[None, :, 2:])  # overlap's bottom-right
    inter = (rb - lt).clamp(min=0).prod(-1)         # (N, M); 0 if apart
    area = lambda x: (x[:, 2:] - x[:, :2]).prod(-1)
    return inter / (area(a)[:, None] + area(b)[None, :] - inter)`),
  at(2,code(`box_iou(torch.tensor([[${DOG.join('., ')}.]]), torch.tensor([[${guess.join('., ')}.]]))
# tensor([[${num(ip.iou,4)}]])  -- torchvision.ops.box_iou gives the same`)))+'</div>',
 lines:['The same three steps, for N boxes against M boxes at once: max of the starts, min of the ends, clamp at zero, divide.',`On our two boxes: ${num(ip.iou,4)}. torchvision.ops.box_iou returns the same N × M matrix.`],
 ask:['What shape does box_iou return for 31 boxes against 2?','What does clamp(min=0) do?'],
 expected:['(31, 2): every pair.','Sets the width or height of a non-overlap to 0, so its area is 0.'],
 demo:'Notebook part 3 runs this on the two boxes and checks it against torchvision.ops.box_iou.',
 transition:'Part 3 in one slide.'});
recap(3,'boxes',[`A box is four numbers: corners (${DOG.join(', ')}) or centre and size (${S.dog.cx}, ${S.dog.cy}, ${S.dog.w}, ${S.dog.h}); divide by the photo’s size to normalise.`,
 'A labelled photo is a photo plus one line per object: a class and four numbers.',`IoU = overlap ÷ union: 1 for the same box, 0 for boxes apart. The 60-px guess scored ${num(ip.iou,3)}.`,'IoU ≥ 0.5 is the usual “found it”.'],
 'ask a network to output a box, then several, and see where it breaks.',
 {line:'Part 3: boxes and IoU. Part 4: a network that outputs boxes.',ask:'What is the IoU of two identical boxes, and of two boxes that do not touch?',expected:'1 and 0.',transition:'Part 4.'});

// ================================================================================================ Part 4
partBreak(4,'onebox','One box is easy; several are not','A network can output four numbers for one box. Asking it for several boxes shows the real problem.',[
 'Add a box head to a classifier; write the target it learns, with and without an object.','Ask the same head for two animals, and see it hedge.','Give it K slots: count and order break the loss.'],
 {line:'One box is regression; several boxes expose the assignment problem.',ask:'What could go wrong with two objects and one box output?',expected:'The network cannot know which object to describe; it may average them.',transition:'One object first.'});
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
const yvec=(vals,cls)=>`<div class="yvec">${[['object?',vals[0]],[m('c_x'),vals[1]],[m('c_y'),vals[2]],[m('w'),vals[3]],[m('h'),vals[4]],['cat',vals[5]],['dog',vals[6]]].map(([k,v],i)=>`<div class="${cls}${i===1||i===5?' gap':''}"><small>${k}</small>${v}</div>`).join('')}</div>`;
S_('target-y','onebox','Write the answer as numbers: the target for one photo',{builds:3,
 body:stack(cols(photo('cat',W2,H2,gtBox(SG.box,'cat',{size:44,w:8}),'The single-cat photo with its box',{cls:'short'}),yvec([1,...SG.norm.map(v=>num(v,3)),1,0],'t'),'0.62fr 1.38fr'),
  at(2,cols(photo('cat',W2,H2,'','A patch of empty floor',{view:[40,370,560,320],cls:'short'}),yvec([0,'?','?','?','?','?','?'],'q')+at(3,small('Only “object?” is learned here: each <b>?</b> is left out of the loss.')),'0.62fr 1.38fr'))),
 lines:['A localiser for two classes, cat and dog, writes seven numbers: is there an object; its box (normalised centre and size); and which class. For this photo: 1, the cat’s box, cat 1, dog 0.',
  'A photo of empty floor. “Object?” is 0. Its box and class have no right answer, so the target there is “?”.',
  'The loss counts only entries that have a right answer: for the floor, just the first. Keep this “?” in mind: a detector writes it at most places in a photo.'],
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
   at(2,p(`Trained to match “the first animal in the list”, and the list order is arbitrary, the safest single answer is in between: the average box.`)),
   at(3,`<div class="eq-sm">${eq(R`\mathrm{IoU}(\text{avg},\text{dog})=${num(ab.iou_dog,3)}`)}${eq(R`\mathrm{IoU}(\text{avg},\text{cat})=${num(ab.iou_cat,3)}`)}</div>`),at(3,small('It matches neither animal.'))),'1.25fr 1fr'),
 lines:['One box head, two animals. Which should it draw?','If some annotations list the dog first and some the cat, a squared error is smallest for the average of the two boxes: the network learns to hedge.',`The average box has IoU ${num(ab.iou_dog,2)} with the dog and ${num(ab.iou_cat,2)} with the cat. A box between two objects describes neither.`],
 ask:['Which animal should the single box describe?','What does a squared-error loss learn when the target flips between two boxes?','Does the average box find either animal?'],
 expected:['There is no right answer: the task is ill-posed.','The average of the two boxes, the value that minimises the expected squared error.',`No: IoU ${num(ab.iou_dog,2)} and ${num(ab.iou_cat,2)}, both far below 0.5.`],
 misconception:'More training does not fix it: the hedge is the optimum of this loss for this task.',
 transition:'Give the head more than one output.',source:PHOTO_SRC});
chap('4.2');
const slotsFig=()=>fig(1000,300,[0,1,2,3,4].map(i=>{const x=20+i*196;return `<g data-at="${i<2?1:2}"><rect x="${x}" y="40" width="180" height="200" rx="10" fill="#fff" stroke="${i<2?COL.guess:MUTED}" stroke-width="3"/>${label(x+90,80,`slot ${i+1}`,{size:26,anchor:'middle',fill:COL.ink,weight:650})}${label(x+90,130,i<2?'class scores':'no object',{size:22,anchor:'middle',fill:i<2?COL.guess:MUTED})}${label(x+90,165,i<2?'+ 4 box numbers':'',{size:22,anchor:'middle',fill:COL.guess})}</g>`;}).join(''),'Five output slots; two hold objects, three say no object');
S_('k-slots','onebox','Give the head K slots',{builds:3,
 body:stack(slotsFig(),at(3,p('Problem 1: a photo with more objects than slots. The crowd photo has 11 people; 5 slots cannot hold them. So make K larger than any photo needs.'))),
 lines:['Give the head K slots instead of one. Each slot writes a class and a box. Two animals: two slots used.',
  'The other slots must be able to say “nothing here”: add a no-object class. Output size: K × (C + 1 + 4), fixed.','Problem 1: what if a photo has more objects than K? Then choose K large: DETR (Appendix A) uses K = 100.'],
 ask:['How many numbers does the head output for K = 5 and C = 80?','What do unused slots predict?','How do we avoid running out of slots?'],
 expected:['5 × (80 + 1 + 4) = 425.','A “no object” class.','Make K bigger than any photo needs, e.g. 100.'],
 transition:'Problem 2 is harder: which object goes in which slot?'});
const sl=S.slots,two=S.annotations['two-dogs'];
const toPx=c=>[(c[0]-c[2]/2)*W2,(c[1]-c[3]/2)*H2,(c[0]+c[2]/2)*W2,(c[1]+c[3]/2)*H2];
S_('slot-order','onebox','Problem 2: which dog belongs in slot 1?',{builds:4,
 body:cols(photo('two-dogs',W2,H2,prBox(toPx(sl.slot1),'slot 1',{size:40,w:6})+prBox(toPx(sl.slot2),'slot 2',{size:40,w:6})+gat(2,pill(two[1][1][0],two[1][1][3]+4,'listed 1st',{fill:COL.target,size:40,below:true})+pill(two[0][1][0],two[0][1][3]+4,'listed 2nd',{fill:COL.target,size:40,below:true})),'Two slots predict the two dogs; the annotation lists the right dog first'),
  stack(at(2,eq(R`\text{slot 1 vs entry 1: }\ \mathcal{L}=\lcol{${num(sl.swapped,3)}}`)),at(3,eq(R`\text{slot 1 vs entry 2: }\ \mathcal{L}=${num(sl.same_order,3)}`)),
   at(4,p('The same correct answer costs 100 times more because of the list’s order. The loss must not depend on the order.'))),'1.3fr 1fr'),
 lines:['Two slots, two predictions: slot 1 drew the left dog, slot 2 the right dog. Both boxes are right.',
  'But the annotator happened to list the right dog first. Compare slot 1 with entry 1 and slot 2 with entry 2: the L1 loss, in normalised units, is 1.21.',
  'Compare them the other way round: 0.012.','Nothing about the prediction changed, only the list order. A loss that pairs outputs with targets by position punishes correct answers.'],
 ask:['Are the two slots’ boxes correct?','What is the loss if slot k is compared with entry k?','And with the order swapped?','What must the loss do instead?'],
 expected:['Yes, both dogs are well boxed.',`${num(sl.swapped,2)}: slot 1’s left-dog box is compared with the right dog.`,num(sl.same_order,3),'Pair each output with the object it describes, whatever the list order.'],
 point:'The slot boxes are real predictions of a slot-based detector, DETR (Appendix A), for this photo (its queries 61 and 98); the L1 sums are over normalised (c_x, c_y, w, h).',
 transition:'Two ways to pair outputs with objects.',source:DETR_SRC});
S_('two-fixes','onebox','Two ways to decide which output answers for which object',{builds:2,
 body:`<div class="compare">${at(1,`<div class="a"><h3>A · by place</h3><ul><li>Tie each output to a place in the image</li><li>The outputs at the dog’s place answer for the dog</li><li>No slot ever chooses</li></ul><p class="caption">Parts 5–7: YOLO and most fast detectors</p></div>`)}${at(2,`<div class="b"><h3>B · by matching</h3><ul><li>Keep free slots</li><li>Before the loss, pair slots with objects in the cheapest way</li><li>Each object gets exactly one slot</li></ul><p class="caption">Appendix A: DETR</p></div>`)}</div>`,
 lines:['Fix A: give every output a fixed place in the image. Whatever is at that place is its job. Then order cannot matter.','Fix B: keep free slots, and before each loss, match slots to objects so that the total cost is lowest. Then order cannot matter either.'],
 ask:['How does fix A remove the order problem?','How does fix B?'],
 expected:['An output answers for the object at its place; there is nothing to order.','The pairing is chosen by cost, not by position in the list.'],
 transition:'Part 4 in one slide.'});
recap(4,'onebox',['A box head on a classifier learns one box: four numbers, an L1 loss. With no object, its box target is “?”: not learned.',
 `Two animals, one box: the loss is lowest for the average box, which matches neither (IoU ${num(ab.iou_dog,2)} and ${num(ab.iou_cat,2)}).`,
 `K slots: a photo can have more objects than slots; and pairing slot k with list entry k punished a correct answer (loss ${num(sl.swapped,2)} instead of ${num(sl.same_order,3)}).`,
 'Fix A: tie each output to a place in the photo.'],
 'build fix A: a grid of cells, each writing a box and class scores.',
 {line:'Part 4: one box works; many boxes need a rule for which output answers for which object.',ask:'Why did the same correct prediction cost 100 times more?',expected:'Because the loss paired outputs with targets by list position, and the list happened to be in the other order.',transition:'Part 5.'});
// ================================================================================================ Part 5
partBreak(5,'dense','A candidate at every place','Tie each output to a place: a grid of cells over the photo, each writing one record.',[
 'From a classifier on crops, to sliding windows, to one pass of a CNN that gives a grid of cells.','What each cell writes: four box numbers and 80 class scores.','Which cells answer for each object; their targets and their loss, by hand for one cell.','At test time, read every cell’s box back out.'],
 {line:'A grid of cells, each writing a record: targets, loss, decoding.',ask:'If every place in the image has its own output, which outputs should describe the dog?',expected:'The ones at, or near, the dog’s location.',transition:'Start from a tool we already have: a classifier.'});
chap('5.1');
const G=S.grid,CELL=S.cell,s32=G.stride,WN=S.windows;
const grid=(inner,alt,o={})=>courtyard(gridLines(W,H,s32,{op:.5})+inner,alt,o);
const crops=[['dog',[DOG[0],DOG[1],DOG[2]-DOG[0],DOG[3]-DOG[1]]],['cat',[CAT[0],CAT[1],CAT[2]-CAT[0],CAT[3]-CAT[1]]],['nothing',[776,370,184,260]]];
S_('crop-classifier','dense','Start from a tool we have: a classifier for crops',{builds:2,
 body:stack(`<div class="three thumb crops">${crops.map(([n,v])=>`<figure>${courtyard('',`A crop labelled ${n}`,{view:v,cls:'short'})}<figcaption><b>${n}</b></figcaption></figure>`).join('')}</div>`,
  at(2,p('Train a classifier on many crops like these. Shown one crop, it answers: dog, cat, or nothing.'))),
 lines:['Three crops cut from the courtyard: a dog, a cat, and floor with nothing on it.','A classifier trained on thousands of such crops answers for one crop: dog, cat or nothing. It cannot say where anything is in a whole photo. Can we use it to find objects anyway?'],
 ask:['What label does each crop get?','What can such a classifier not do on its own?'],
 expected:['Dog, cat, nothing.','Say where objects are in a large photo, or find two of them.'],
 point:'Andrew Ng’s detection lectures start the same way: a car classifier trained on closely cropped car images, then slid over the image.',
 transition:'Slide it over the photo.',source:PHOTO_SRC});
const windows=[[380,60,800,610],[80,270,350,630],[600,120,780,330]];
S_('sliding','dense','Slide the classifier over the photo',{builds:3,
 body:cols(courtyard(windows.map((b,i)=>gat(i===0?1:2,rect(b,{stroke:i===0?COL.guess:COL.amber,w:5,dash:i===0?'':'12 7'}))).join(''),'Windows of different sizes placed over the photo'),
  stack(at(1,p('Crop a window and classify it: dog.')),
   at(2,p(`Move it every 32 px across and down: ${WN.cols} × ${WN.rows} = ${big(WN.positions)} positions.`)),
   at(3,p(`Objects come in many sizes and shapes: try ${WN.sizes} sizes × ${WN.shapes} shapes at each position. <b>${big(WN.crops)} crops</b>, each through a whole CNN.`))),'1.2fr 1fr'),
 lines:['Put a window on the photo, crop it, classify it. This window says “dog”.',`Move the window every 32 pixels: ${WN.cols} positions across, ${WN.rows} down, ${big(WN.positions)} windows.`,`At each position try ${WN.sizes} sizes and ${WN.shapes} shapes: ${big(WN.crops)} crops per photo, each a full run of the classifier. It works, and it is slow.`],
 ask:['What does the classifier say about this window?','How many positions are there?','How many classifier runs per photo?'],
 expected:['Dog.',`${WN.cols} × ${WN.rows} = ${big(WN.positions)}.`,`${big(WN.positions)} × ${WN.sizes} × ${WN.shapes} = ${big(WN.crops)}.`],
 point:'Detectors around 2013 worked like this (OverFeat). R-CNN (2014) classified about 2,000 proposed crops per image and needed about 47 seconds per image at test time (CS231n, 2017): Appendix B, two-stage detectors.',
 transition:'Look at two neighbouring windows.',source:PHOTO_SRC});
const wA=[380,120,380+WN.size,120+WN.size],wB=[380+WN.shift,120,380+WN.shift+WN.size,120+WN.size];
S_('shared-work','dense','Neighbouring windows see almost the same pixels',{builds:2,
 body:cols(courtyard(rect([wB[0],wA[1],wA[2],wA[3]],{stroke:'none',w:0,fill:COL.guess,op:.2})+rect(wA,{stroke:COL.guess,w:5})+rect(wB,{stroke:COL.amber,w:5,dash:'12 7'}),'Two windows 224 pixels wide, 32 pixels apart, sharing most of their pixels',{view:[300,40,460,360]}),
  stack(p(`Two windows, ${WN.size} px wide, ${WN.shift} px apart: they share ${Math.round(WN.shared*100)}% of their pixels.`),
   at(2,p('Most of the work for one window is repeated for the next. <b>A CNN does the sliding itself</b>: its convolutions already slide over every position, once.'))),'1.1fr 1fr'),
 lines:[`Two neighbouring windows, ${WN.size} pixels wide and ${WN.shift} pixels apart, share ${Math.round(WN.shared*100)}% of their pixels. Classifying them separately computes most features twice.`,'A convolution already slides the same small filter over every position. Run the CNN once on the whole photo and read one output per position: every window at once, with the shared work done once.'],
 ask:['How much do neighbouring windows overlap?','How can the shared work be done only once?'],
 expected:[`${Math.round(WN.shared*100)}%: ${WN.size-WN.shift} of every ${WN.size} columns.`,'Run the CNN on the whole photo once; each position of its output plays the role of one window.'],
 point:'Ng calls this the convolutional implementation of sliding windows (after OverFeat, Sermanet et al., 2014): turn the classifier’s fully connected layers into convolutions and the whole photo is classified at every position in one pass.',
 transition:'One pass of a CNN.',source:PHOTO_SRC});
S_('one-pass','dense','One pass of a CNN: a 30 × 20 grid of feature vectors',{builds:2,
 body:cols(flow([
   {id:'img',x:10,y:10,w:230,h:84,label:'photo',sub:'960 × 640 × 3',role:'data'},
   {id:'cnn',x:10,y:150,w:230,h:84,label:'CNN',sub:'shrinks 32×',role:'ink'},
   {id:'map',x:10,y:290,w:230,h:84,label:'feature map',sub:'30 × 20 × 256',role:'q'}],
   [{from:'img',to:'cnn',fromSide:'bottom',toSide:'top'},{from:'cnn',to:'map',fromSide:'bottom',toSide:'top'}],{width:250,height:380,label:'Photo, CNN, feature map'}),
  at(2,grid('','The 30 by 20 grid over the photo',{cls:'short'})),'0.55fr 1.45fr'),
 lines:['The photo goes through a CNN that halves the resolution five times: 960 × 640 becomes 30 × 20, with 256 numbers at each position.',
  'Lay that 30 × 20 grid over the photo. Each square, a cell, stands for one position of the feature map: 600 cells, 600 “windows”.'],
 ask:['What size is the feature map?','How many cells are there?'],
 expected:['30 × 20 positions, 256 numbers each.','600.'],
 point:'For YOLOv8n this is the stride-32 output of the neck: one step of the map is 32 pixels of photo.',
 transition:'Zoom in on one cell.'});
S_('cell-window','dense','One cell: an address on the photo, with a wide view',{builds:2,
 body:cols(grid(cell(10,18,s32,{fill:COL.guess,op:.7})+gat(2,rect(DOG,{stroke:COL.guess,w:4,dash:'12 8'})),'Cell (10, 18) highlighted; a dashed outline of the dog around it',{view:dogView}),
  stack(p('Cell (row 10, column 18) covers a 32 × 32 block: x from 576 to 608, y from 320 to 352.'),
   at(2,p('Its 256 numbers were computed from a region <b>much larger</b> than its block, wide enough to take in the whole dog.'))),'1fr 1.1fr'),
 lines:['Cell (10, 18) is a 32 × 32 block of pixels in the middle of the dog: column 18 starts at x = 576, row 10 at y = 320. Rows and columns count from 0.','But a cell is an address, not a crop: every layer of the CNN mixes in neighbours, so its vector sees far beyond its block. That is why one cell can describe a box much larger than itself.'],
 ask:['Which block of pixels does cell (10, 18) cover?','Can a cell describe an object larger than its block?'],
 expected:['x from 576 to 608, y from 320 to 352.','Yes: its vector is computed from a large region of the photo (its receptive field).'],
 misconception:'A cell is not a 32-pixel crop that knows only its own pixels.',
 transition:'What does each cell write?',source:PHOTO_SRC});
const recFig=()=>{const sc=CELL.scores,x0=300,bw=8.4,y0=230,hh=180;let bars='';
 sc.forEach((v,i)=>{bars+=`<rect x="${(x0+i*bw).toFixed(1)}" y="${(y0-v*hh).toFixed(1)}" width="${(bw-1.6).toFixed(1)}" height="${Math.max(1.5,v*hh).toFixed(1)}" fill="${i===16?COL.guess:'#AAB3BC'}"/>`;});
 const box=CELL.pred_ltrb.map((v,i)=>`<rect x="${20+i*66}" y="70" width="58" height="120" rx="6" fill="#fff" stroke="${COL.guess}" stroke-width="3"/>${label(49+i*66,118,['l','t','r','b'][i],{size:24,anchor:'middle',fill:COL.guess,weight:700})}${label(49+i*66,160,num(v,0),{size:20,anchor:'middle',fill:COL.ink})}`).join('');
 return fig(1000,270,box+label(20,50,'4 box numbers (px)',{size:22,fill:COL.guess,weight:600})+`<g data-at="2">${bars}${line(x0,y0,x0+80*bw,y0,{stroke:AXc})}${label(x0,50,'80 class scores, one per COCO class',{size:22,fill:COL.ink,weight:600})}${label(x0+16*bw+12,y0-sc[16]*hh+8,`dog ${num(sc[16],3)}`,{size:22,fill:COL.guess,weight:700})}${label(x0,y0+30,'person',{size:18})}${label(x0+79*bw,y0+30,'toothbrush',{size:18,anchor:'end'})}</g>`,'The record of one cell: four box numbers and eighty class scores');};
const AXc='#AAB3BC';
chap('5.2');
S_('cell-record','dense','Every cell writes a record: 4 box numbers, 80 class scores',{builds:3,
 body:stack(recFig(),at(3,p('There is no separate “object?” number: a cell says “nothing here” by giving all 80 classes a low score.'))),
 lines:['Cell (10, 18) writes four numbers that place a box: its distances to the box’s left, top, right and bottom edges.',
  `And 80 scores, one per COCO class, each between 0 and 1. Here dog is ${num(CELL.p_dog,3)}; the other 79 are near zero.`,
  'Part 4’s localiser had an “object?” number. YOLOv8 drops it: 80 independent yes/no scores, all low, already mean “no object”.'],
 ask:['What do the four box numbers mean?','Why does every class get its own score?','How does a cell say “there is nothing here”?'],
 expected:['Distances from the cell’s centre to the four sides of a box.','A cell answers 80 yes/no questions: is there a person? a dog? … All can be “no”.','By giving every class a low score.'],
 point:'These are the real numbers YOLOv8n wrote at this cell. The head writes distances in cells; we show them ×32, in pixels. YOLOv1 to YOLOv5 did have a separate objectness score.',
 transition:'What the network actually returns.',source:YOLO_SRC});
S_('raw-output','dense','What actually comes out: one tensor of fixed shape',{builds:2,
 body:stack(code(`x = load_photo("cat-dog.jpg")   # (1, 3, 640, 960): RGB values in 0..1
y, _ = net(x)                    # YOLOv8n, before any clean-up
y.shape                          # torch.Size([1, 84, 12600])`),
  at(2,code(`y[0, :4, k]     # cell k's box: c_x, c_y, w, h in pixels
y[0, 4:, k]     # its 80 class scores, each between 0 and 1`)),
  at(2,`<div class="eq-sm">${eq(R`84=\underbrace{4}_{\text{box}}+\underbrace{80}_{\text{classes}},\qquad ${bt(G.total)}=\underbrace{600}_{\text{this grid}}+\underbrace{${bt(G.total-600)}}_{\text{two finer grids (Part 7)}}`)}</div>`)),
 lines:[`Run the real network on the courtyard photo and print the shape: 84 rows and ${big(G.total)} columns, one column per cell.`,'Each column is one record: 4 box numbers (the head has already turned l, t, r, b into a centre and a size) and 80 class scores. 600 columns come from our 30 × 20 grid; the rest from two finer grids, in Part 7.'],
 ask:['What shape does YOLOv8n output for this photo?','Does the shape depend on how many objects are in the photo?'],
 expected:[`(1, 84, ${big(G.total)}).`,'No, only on the photo’s size. A photo of an empty wall gives the same shape.'],
 point:'One small layer, with the same weights, writes the record at every cell: a 1 × 1 convolution over the feature map. The code is from scripts/run_models.py. Print shapes before anything else, as Karpathy does in every Zero to Hero lecture: most bugs show up as a wrong shape.',
 demo:'Notebook part 5 runs YOLOv8n on the photo, prints this shape and reads the column of cell (10, 18).',
 transition:'Back to the four box numbers.',source:YOLO_SRC});
const C0=CELL.centre,T0=CELL.target_ltrb;
const ltrbFig=(vals,stroke,b,from=1)=>{const [l,t,r,bb]=vals,[cx,cy]=C0;const f=fsz(dogView,21,420);
 const A=(k,x2,y2,txt,tx,ty,anchor)=>`<g data-at="${from+k}">${arrow(cx,cy,x2,y2,{stroke,w:5,head:18})}${label(tx,ty,txt,{size:f,fill:stroke,weight:700,anchor,halo:true})}</g>`;
 return A(0,cx-l,cy,`l = ${num(l,1).replace('.0','')}`,cx-l/2,cy-14,'middle')+A(1,cx,cy-t,`t = ${num(t,1).replace('.0','')}`,cx+12,cy-t/2,'start')+A(2,cx+r,cy,`r = ${num(r,1).replace('.0','')}`,cx+r/2,cy+38,'middle')+A(3,cx,cy+bb,`b = ${num(bb,1).replace('.0','')}`,cx+12,cy+bb/2+30,'start');};
S_('ltrb','dense','How a cell describes a box: its distances to the four sides',{builds:5,
 body:cols(grid(gtBox(DOG,'',{w:4})+cell(10,18,s32,{fill:COL.guess,op:.7})+`<circle cx="${C0[0]}" cy="${C0[1]}" r="9" fill="#fff" stroke="${COL.ink}" stroke-width="3"/>`+ltrbFig(T0,COL.target,null,2),'Arrows from the cell centre to the four sides of the dog’s box',{view:dogView}),
  sm(eq(R`\text{centre}=(18.5\times32,\ 10.5\times32)=(${C0[0]},\,${C0[1]})`),
   at(2,eq(R`l=${C0[0]}-${DOG[0]}=${T0[0]}`)),at(3,eq(R`t=${C0[1]}-${DOG[1]}=${T0[1]}`)),at(4,eq(R`r=${DOG[2]}-${C0[0]}=${T0[2]}`)),at(5,eq(R`b=${DOG[3]}-${C0[1]}=${T0[3]}`))),'1fr 1.1fr'),
 lines:['Stand at the centre of cell (10, 18): column 18 and row 10, plus a half, times 32 pixels.',`Left: how far to the box’s left edge. ${C0[0]} − ${DOG[0]} = ${T0[0]} pixels.`,`Top: ${C0[1]} − ${DOG[1]} = ${T0[1]}.`,`Right: ${DOG[2]} − ${C0[0]} = ${T0[2]}.`,`Bottom: ${DOG[3]} − ${C0[1]} = ${T0[3]}. Like standing in a room and measuring the distance to each wall: four numbers fix the box.`],
 ask:['Where is the centre of cell (10, 18)?','What is l?','What is t?','What is r?','How would you get the box back from (l, t, r, b)?'],
 expected:[`(${C0.join(', ')}).`,String(T0[0]),String(T0[1]),String(T0[2]),`x₁ = ${C0[0]} − l, y₁ = ${C0[1]} − t, x₂ = ${C0[0]} + r, y₂ = ${C0[1]} + b.`],
 point:'This is the anchor-free form of FCOS (2019) and YOLOv8 (2023). YOLOv1 (2016) instead predicted the centre’s offset inside the cell and the box’s width and height: optional slide.',
 transition:'Which cells should be asked to do this for the dog?',source:PHOTO_SRC});
chap('5.3');
const inside=b=>{let s='';for(let r=0;r<G.rows;r++)for(let c=0;c<G.cols;c++){const x=(c+.5)*s32,y=(r+.5)*s32;if(x>b[0]&&x<b[2]&&y>b[1]&&y<b[3])s+=cell(r,c,s32,{fill:COL.target,op:.3});}return s;};
const block=(cells,fill,op=.6)=>cells.map(([r,c])=>cell(r,c,s32,{fill,op})).join('');
const CC=S.centre_cells,dot=(c,col)=>`<circle cx="${c[0]}" cy="${c[1]}" r="10" fill="${col}" stroke="#fff" stroke-width="4"/>`;
S_('centre-cell','dense','The simplest rule: the cell that holds the centre',{builds:2,
 body:cols(grid(gtBox(DOG,'dog',{size:28})+gtBox(CAT,'cat',{size:28})+cell(...CC.dog.cell,s32,{fill:COL.target,op:.75})+dot(CC.dog.centre,COL.target)+gat(2,cell(...CC.cat.cell,s32,{fill:COL.target,op:.75})+dot(CC.cat.centre,COL.target)),'The cell that contains each box’s centre is filled'),
  stack(p(`The dog’s box centre, (${CC.dog.centre.join(', ')}), falls in cell (${CC.dog.cell.join(', ')}). That cell is <b>responsible</b> for the dog.`),
   at(2,p(`The cat’s centre, (${CC.cat.centre.join(', ')}), falls in cell (${CC.cat.cell.join(', ')}).`)),at(2,small(`Two cells learn an object; the other ${G.rows*G.cols-2} learn “nothing here”.`))),'1.3fr 1fr'),
 lines:[`One rule: the cell that contains the box’s centre answers for the object. The dog’s centre (${CC.dog.centre.join(', ')}) is in cell (${CC.dog.cell.join(', ')}), our cell.`,`The cat’s centre is in cell (${CC.cat.cell.join(', ')}). Every object now has exactly one cell, decided by place alone: no slot order to argue about.`],
 ask:['Which cell holds the dog’s centre?','Why does this rule solve Part 4’s order problem?'],
 expected:[`(${CC.dog.cell.join(', ')}).`,'Each object’s cell is fixed by where the object is, not by its position in the annotation list.'],
 point:'This is YOLOv1’s rule (Redmon et al., 2016), and the one Andrew Ng teaches: the object is assigned to the grid cell that contains its midpoint.',
 transition:'Is one cell per object enough?',source:PHOTO_SRC});
S_('which-cells','dense','More cells per object: a block around the centre',{builds:3,
 body:cols(grid(gtBox(DOG,'dog',{size:28})+gtBox(CAT,'cat',{size:28})+gonly(1,inside(DOG))+gat(2,block(G.pos_dog,COL.target))+gat(3,block(G.pos_cat,COL.target)),'Cells inside the dog’s box, then the three-by-three block at its centre'),
  stack(at(1,ps(`One cell per object gives little to learn from. Use every cell inside the dog’s box? That is ${G.inside_dog} cells, many of them mostly floor.`)),
   at(2,ps('A middle way, FCOS’s “centre sampling”: the cells within 1.5 cells of the box’s centre. For the dog, rows 9–11 and columns 17–19.')),
   at(3,ps(`Same for the cat: rows 13–15, columns 5–7. These ${S.counts.positives} cells are <b>positives</b>; the other ${600-S.counts.positives} are <b>background</b>.`))),'1.3fr 1fr'),
 lines:[`One positive cell per object is a weak training signal. All ${G.inside_dog} cells inside the box would include cells near its edges that see mostly floor: a noisy target.`,
  `The middle way: the cells near the centre, within 1.5 cells of it, a 3 × 3 block around cell (${CC.dog.cell.join(', ')}).`,
  `Do the same for the cat. ${S.counts.positives} cells get an object target; ${600-S.counts.positives} get “no object of any class”.`],
 ask:['How many cells are inside the dog’s box?','Which cells does centre sampling pick?','What do all the other cells learn?'],
 expected:[String(G.inside_dog),'Rows 9–11, columns 17–19: nine cells.','To give every class a low score: background.'],
 point:'Rules differ between detectors: YOLOv1 used only the centre cell; FCOS the cells near the centre; YOLOv8 picks the 10 cells whose current predictions fit the object best. All put the positives near the object.',
 transition:'What does the trained network actually do?',source:PHOTO_SRC});
const fireMap=(map,col)=>heat(map,s32,{color:col,min:.05});
S_('fires','dense','The trained YOLOv8n: about ten cells fire per object',{builds:2,
 body:cols(grid(gtBox(DOG,'',{w:3})+gtBox(CAT,'',{w:3})+fireMap(G.map_dog,COL.guess)+gat(2,fireMap(G.map_cat,COL.amber)),'Dog scores and cat scores of every cell'),
  stack(p(`Shade = the cell’s dog score. ${G.fire_dog.length} cells score above 0.25, all near the dog’s centre; ${G.dog_overlap} of them are in our 3 × 3 block.`),
   at(2,p(`Cat scores: again ${G.fire_cat.length} cells. YOLOv8 trains 10 positive cells per object, and the network learned to fire in about that many.`))),'1.3fr 1fr'),
 lines:['Each cell’s dog score from the real network: dark where it is high. A small cluster near the dog’s centre, nothing elsewhere.','The cat’s scores make a second cluster. About ten cells per object: exactly what YOLOv8’s training asked for, and the source of the duplicates we must remove later.'],
 ask:['Where are the dog scores high?','How many cells fire for each animal, and why that many?'],
 expected:['In a block of cells around the dog’s centre.',`About ${G.fire_dog.length}: YOLOv8 trains its 10 best-fitting cells per object as positives.`],
 point:'The firing block is shifted one cell up and right of the 3 × 3 rule: YOLOv8 chooses its positives by how well each cell’s current prediction fits, not by distance alone.',
 transition:'Write the target of one positive cell.',source:YOLO_SRC});
/** A cell's record drawn the same way every time: four box numbers, then 80 class bars (dog is index 16). */
const recordFig=({boxes,bars,marks=null,boxAt=1,alt,heading='80 class scores (dog is tall)'})=>{const x0=330,bw=8.2,y0=236,hh=170;let g='';
 boxes.forEach(({vals,col,name},row)=>{const y=60+row*(boxes.length>1?92:0)+(boxes.length>1?0:30);
  g+=`<g data-at="${boxAt}">`+label(16,y-10,name,{size:20,fill:col,weight:650})+vals.map((v,i)=>`<rect x="${16+i*72}" y="${y}" width="64" height="${boxes.length>1?62:100}" rx="6" fill="#fff" stroke="${col}" stroke-width="3"/>${label(48+i*72,y+(boxes.length>1?26:40),['l','t','r','b'][i],{size:20,anchor:'middle',fill:col,weight:700})}${label(48+i*72,y+(boxes.length>1?52:80),v,{size:19,anchor:'middle',fill:COL.ink})}`).join('')+'</g>';});
 bars.forEach(({vals,col})=>vals.forEach((v,i)=>{g+=`<rect x="${(x0+i*bw).toFixed(1)}" y="${(y0-v*hh).toFixed(1)}" width="${(bw-1.8).toFixed(1)}" height="${Math.max(1.5,v*hh).toFixed(1)}" fill="${i===16?col:'#AAB3BC'}"/>`;}));
 if(marks)g+=marks;
 g+=line(x0,y0,x0+80*bw,y0,{stroke:AXc})+label(x0,36,heading,{size:20,fill:COL.ink,weight:600})+label(x0,y0+28,'person',{size:17})+label(x0+80*bw,y0+28,'toothbrush',{size:17,anchor:'end'})+label(x0+16*bw+3,y0+28,'dog',{size:18,fill:COL.ink,weight:650,anchor:'middle'});
 return fig(1000,270,g,alt);};
const zeros=Array(80).fill(0),dogOne=zeros.map((_,i)=>i===16?1:0);
S_('target-positive','dense','The target at a positive cell, (10, 18)',{builds:2,
 body:stack(recordFig({boxes:[{vals:T0.map(String),col:COL.target,name:'box target (px)'}],bars:[{vals:dogOne,col:COL.target}],boxAt:2,alt:'Target record: dog 1, other classes 0, and four distances'}),
  `<div class="state-slot">${only(1,ps('Class targets: <b>1 for dog</b>, 0 for each of the other 79 classes. Each is the answer to its own yes/no question.'))}${only(2,ps(`Box target: the four distances, (${T0.join(', ')}) px; in cells (÷ 32), (${CELL.target_cells.map(v=>num(v,2)).join(', ')}). A box much larger than a cell is fine.`))}</div>`),
 lines:['A positive cell’s class targets: 1 for dog, 0 for the other 79 classes. Each is the answer to its own yes/no question.',`Its box target: the four distances we just measured, (${T0.join(', ')}).`],
 ask:['What are the class targets of a positive dog cell?','What is its box target?'],
 expected:['1 for dog, 0 for the other 79.',`(${T0.join(', ')}) pixels.`],
 transition:'And a cell where nothing is.'});
S_('target-background','dense','The target at a background cell: all zeros, and “?”',{builds:1,
 body:stack(recordFig({boxes:[{vals:['?','?','?','?'],col:MUTED,name:'box target: don’t care'}],bars:[{vals:zeros,col:MUTED}],heading:'80 class targets: all 0',alt:'Background record: every class 0, box don’t care'}),
  ps(`Cell (${CELL.bg_row}, ${CELL.bg_col}), on the wall: all 80 class targets are 0, and its box target is “?”, like the empty floor of Part 4.`)),
 lines:[`A background cell, such as (${CELL.bg_row}, ${CELL.bg_col}) on the wall: all 80 class targets are 0. Its box target is “?”: there is no box to learn, so its box numbers are left out of the loss.`],
 ask:['What does a background cell learn?'],
 expected:['To give every class a low score; nothing about boxes.'],
 point:'Of the 600 cells on this grid, 582 have this target. Part 4’s “object? = 0” is here “all 80 classes 0”.',
 transition:'Now what the network wrote at the positive cell.'});
const pl=CELL.pred_ltrb;
const dogMark=`<line x1="${330+16*8.2-3}" y1="${236-170}" x2="${330+17*8.2+1}" y2="${236-170}" stroke="${COL.target}" stroke-width="4"/>`+label(330+17*8.2+6,236-170+6,'target 1',{size:18,fill:COL.target,weight:650});
S_('prediction-record','dense','What the network wrote at cell (10, 18)',{builds:2,
 body:stack(recordFig({boxes:[{vals:T0.map(String),col:COL.target,name:'target'},{vals:pl.map(v=>num(v,1)),col:COL.guess,name:'prediction'}],bars:[{vals:CELL.scores,col:COL.guess}],marks:dogMark,boxAt:2,alt:'Predicted record against the target'}),
  `<div class="state-slot">${only(1,ps(`Dog: <b>${num(CELL.p_dog,3)}</b> (target 1). Cat ${num(CELL.top[1][1],4)}, skateboard ${num(CELL.top[2][1],5)}; the other 77 are smaller still (targets 0).`))}${only(2,ps('Distances: close to the target, the top edge furthest off. The loss turns these differences into one number to reduce.'))}</div>`),
 lines:['The real network’s scores at this cell: dog 0.871 against a target of 1; every other class near its target of 0.','Its four distances: (184.8, 260.4, 177.6, 252.1) against the target (185, 253, 176, 252). Close; the loss measures how close.'],
 ask:['How far is each class score from its target?','Which distance is furthest off?'],
 expected:['Dog: 1 − 0.871 = 0.129 too low; the others are near their target 0.','The top, t: 7.4 px too large.'],
 transition:'The class part of the loss.',source:YOLO_SRC});
chap('5.4');
const bcePlot=()=>{const P=panel({W:560,H:380,L:66,B:58,T:34,xMin:0,xMax:1,yMin:0,yMax:4.8,ticksX:[0,.25,.5,.75,1],ticksY:[0,1,2,3,4],xLabel:'p, the score of the right answer',yLabel:'−log p'});
 let pts=[];for(let i=1;i<=200;i++){const x=Math.max(.009,i/200);pts.push(`${P.x(x).toFixed(1)},${P.y(-Math.log(x)).toFixed(1)}`);}
 const mark=(x,txt,dx,dy,anchor='start')=>`<circle cx="${P.x(x).toFixed(1)}" cy="${P.y(-Math.log(x)).toFixed(1)}" r="8" fill="${COL.loss}" stroke="#fff" stroke-width="2"/>`+label(P.x(x)+dx,P.y(-Math.log(x))+dy,txt,{size:21,fill:COL.ink,weight:650,anchor});
 return fig(560,380,P.axes+`<polyline points="${pts.join(' ')}" fill="none" stroke="${COL.loss}" stroke-width="3"/>`+gat(2,mark(.1,num(-Math.log(.1),2),14,-6)+mark(.5,num(-Math.log(.5),2),10,-16)+mark(CELL.p_dog,num(CELL.bce_dog,3),0,-22,'middle')),'The loss −log p falls from very large near p = 0 to zero at p = 1');};
S_('bce','dense','Scoring one yes/no answer: binary cross-entropy',{builds:2,
 body:cols(stack(eq(R`\text{yes }(y=1):\quad -\log p`),eq(R`\text{no }(y=0):\quad -\log(1-p)`),small('p: the score the network gave this class; y: the target, 1 or 0. Natural logarithms.')),bcePlot(),'1fr 1.1fr'),
 lines:['A class score answers one yes/no question. If the answer is yes, the loss is −log p; if no, −log(1 − p), the same curve mirrored.',`Read the curve for a yes: sure and right (p near 1) costs almost nothing; unsure (0.5) costs ${num(-Math.log(.5),2)}; sure and wrong (0.1) costs ${num(-Math.log(.1),2)}, and it grows without bound. Our dog cell: ${num(CELL.p_dog,3)} costs ${num(CELL.bce_dog,3)}.`],
 ask:['What is the loss for a yes answered with p = 1?','Why does the curve shoot up near p = 0?'],
 expected:['0: −log 1 = 0.','Being confidently wrong is punished hardest: −log p grows without bound as p → 0.'],
 point:'The two cases are one formula: BCE(p, y) = −[y log p + (1 − y) log(1 − p)].',
 transition:'Apply it to all 80 questions at our cell.'});
S_('loss-class','dense','Class loss at cell (10, 18): 80 yes/no questions',{builds:3,
 body:stack(eq(R`\text{dog: }y=1,\ p=${num(CELL.p_dog,3)}:\quad -\log ${num(CELL.p_dog,3)}=\lcol{${num(CELL.bce_dog,3)}}`),
  at(2,eq(R`\text{the other 79: }y=0:\quad \textstyle\sum_c -\log(1-p_c)=\lcol{${num(CELL.bce_others,4)}}`)),
  at(3,eq(R`\mathcal{L}_\text{class}(10,18)=${num(CELL.bce_dog,3)}+${num(CELL.bce_others,4)}=\lcol{${num(CELL.bce_total,3)}}`))),
 lines:[`Dog is a yes: −log ${num(CELL.p_dog,3)} = ${num(CELL.bce_dog,3)}.`,`Every other class is a no: −log(1 − p) for each. All 79 scores are near zero, so together they add only ${num(CELL.bce_others,4)}.`,`The cell’s class loss: ${num(CELL.bce_total,3)}, almost all from the dog question.`],
 ask:['What is the dog term?','Why are the other 79 terms so small?','Why 80 separate yes/no questions rather than one softmax?'],
 expected:[num(CELL.bce_dog,3),'Their scores are near 0, the right answer for a no.','A background cell must be able to say “none of the 80”: every yes/no answer no. A softmax over 80 classes always picks one.'],
 point:'In code use binary_cross_entropy_with_logits on the raw outputs: it is numerically stable where p is near 0 or 1.',
 transition:'The box part of the loss.'});
const l1t=CELL.l1_terms;
S_('loss-box','dense','Box loss: how far off are the four distances?',{builds:2,
 body:sm(eq(R`\mathcal{L}_\text{box}=\sum_{k\in\{l,t,r,b\}}\big|\qcol{\hat d_k}-\pcol{d_k}\big|`),
  at(2,eq(R`=|${num(pl[0],1)}-${T0[0]}|+|${num(pl[1],1)}-${T0[1]}|+|${num(pl[2],1)}-${T0[2]}|+|${num(pl[3],1)}-${T0[3]}|`)),
  at(2,eq(R`=${l1t.map(v=>num(v,1)).join('+')}=\lcol{${num(CELL.l1,1)}}\ \text{px}`))),
 lines:['Compare the four predicted distances with the four target distances, and add the absolute differences: the L1 loss of Part 4.',`${l1t.map(v=>num(v,1)).join(' + ')} = ${num(CELL.l1,1)} pixels. Most of it is the top edge: the predicted box starts ${num(l1t[1],1)} pixels higher than ours.`],
 ask:['What does the L1 box loss add?','Which edge contributes most?'],
 expected:['Four absolute differences between predicted and target distances.',`The top edge, ${num(l1t[1],1)} px.`],
 transition:'Is 9 pixels a lot?'});
S_('loss-iou','dense','A box loss that does not care about size: 1 − IoU',{builds:1,
 body:stack(eq(R`1-\mathrm{IoU}(\qcol{\text{predicted box}},\,\pcol{\text{target box}})=1-${num(CELL.iou,3)}=\lcol{${num(1-CELL.iou,3)}}`),
  p(`${num(CELL.l1,1)} px is nothing for the dog, and a miss for Part 1’s ${farPed[2]-farPed[0]}-px pedestrian. IoU, a fraction of area, scores both on one scale: Part 3’s argument again.`),
  small('YOLOv8 uses an IoU-based box loss (CIoU), plus a loss on how it spreads each distance (DFL).')),
 lines:[`Another choice: one minus the IoU of the predicted and target boxes, here ${num(1-CELL.iou,3)}. It does not depend on the box’s size, so small objects count as much as large ones.`],
 ask:['Why might one prefer 1 − IoU to L1 in pixels?'],
 expected:[`It measures overlap, which is scale-free: ${num(CELL.l1,1)} px is negligible for the dog but large for a small object.`],
 transition:'A background cell.'});
S_('loss-background','dense','A background cell: only a class loss, and it is small',{builds:2,
 body:stack(eq(R`\text{cell }(${CELL.bg_row},${CELL.bg_col}):\quad\textstyle\sum_{c=1}^{80}-\log(1-p_c)=\lcol{${num(CELL.bg_bce,4)}}\qquad(\text{largest }p_c=${num(CELL.bg_max,3)},\ \text{potted plant})`),
  at(2,p(`But there are ${600-S.counts.positives} background cells on this grid and only ${S.counts.positives} positives. Tiny terms, many of them: detectors weight them down. YOLOv1 multiplied them by 0.5; RetinaNet’s focal loss shrinks the easy ones (optional slide).`))),
 lines:['A background cell has only class targets, all 0. Here every score is tiny, so the loss is 0.0038. No box loss: there is no box to learn.','The imbalance matters: hundreds of easy background terms against a handful of positives. Without care they dominate the sum and the network learns to say “nothing” everywhere.'],
 ask:['Why is there no box loss at a background cell?','What problem do the many background cells cause?'],
 expected:['There is no object, so no box to compare with.','Their many small terms can outweigh the few positive terms.'],
 transition:'Put the pieces together.'});
S_('loss-total','dense','The loss for the whole photo',{builds:3,
 body:stack(eq(R`\mathcal{L}=\frac{1}{N_\text{pos}}\Big[\underbrace{\sum_{\text{all cells}}\ \sum_{c=1}^{80}\mathrm{BCE}(p_c,y_c)}_{\text{class: every cell}}\;+\;\lambda\underbrace{\sum_{\text{positive cells}}\mathcal{L}_\text{box}}_{\text{box: positives only}}\Big]`),
  at(2,p(`Here: 600 cells contribute class terms; the 18 positives also contribute box terms; divide by N<sub>pos</sub> = 18.`)),
  at(3,p('One number for the photo. Backpropagation sends its gradient into the shared head and the CNN; every cell’s weights are the same weights, so every cell learns from every object.'))),
 lines:['Class loss from every cell; box loss only from positive cells; divide by the number of positives so photos with many objects do not dominate. λ balances the two parts.','For our photo: 600 class terms, 18 box terms.','Gradient descent on this one number trains the shared layers.'],
 ask:['Which cells contribute class terms? Box terms?','What is N_pos here?','Why does dividing by N_pos help?'],
 expected:['All cells; positives only.','18.','Each photo’s loss is then an average per object, whatever the number of objects.'],
 point:'YOLOv8’s real loss sums all three grids (Part 7) and uses its own weights and box loss; the structure is the same.',
 transition:'The same loss in code.'});
S_('loss-code','dense','The same loss in code',{builds:2,
 body:stack(code(`logits = head_cls(feats)                  # (600, 80): one row per cell
dist   = head_box(feats)                  # (600, 4): l, t, r, b in cells
y = torch.zeros(600, 80)
y[pos, labels] = 1.0                      # positives: 1 for their class
cls_loss = F.binary_cross_entropy_with_logits(logits, y, reduction='sum')
box_loss = (dist[pos] - dist_target[pos]).abs().sum()
loss = (cls_loss + box_loss) / len(pos)`),
  at(2,small('pos: the indices of the 18 positive cells; labels: their class (16 for dog, 15 for cat); dist_target: their (l, t, r, b) targets.'))),
 lines:['The target is a 600 × 80 table of zeros with a 1 at each positive cell’s class. Class loss over everything, box loss over the positives.','Building pos, labels and dist_target from the annotations is the “assignment” step: the 3 × 3 rule written as code. The notebook does it for this photo.'],
 ask:['What shape is y, and how many 1s does it hold?','Which line uses only the positive cells?'],
 expected:['600 × 80 with 18 ones.','box_loss: dist[pos].'],
 demo:'Notebook part 5 builds pos and the targets for the courtyard photo and evaluates this loss on YOLOv8n’s real outputs.',
 transition:'At test time there are no annotations: read the boxes out.'});
chap('5.5');
const PB=CELL.pred_box;
S_('decode','dense','At test time: read the box back out of the cell',{builds:3,
 body:cols(grid(cell(10,18,s32,{fill:COL.guess,op:.7})+`<circle cx="${C0[0]}" cy="${C0[1]}" r="9" fill="#fff" stroke="${COL.ink}" stroke-width="3"/>`+ltrbFig(pl,COL.guess,null,1)+gat(2,prBox(PB,'',{w:5}))+gat(3,pill(PB[0],PB[1],`dog ${num(CELL.p_dog,3)}`,{fill:COL.guess,size:30})),'The predicted distances turned back into a box',{view:dogView}),
  stack(p('No annotation now: only the record.'),
   at(2,`<div class="eq-sm">${eq(R`x_1=${C0[0]}-${num(pl[0],1)}=${num(PB[0],1)}`)}${eq(R`y_1=${C0[1]}-${num(pl[1],1)}=${num(PB[1],1)}`)}${eq(R`x_2=${C0[0]}+${num(pl[2],1)}=${num(PB[2],1)}`)}${eq(R`y_2=${C0[1]}+${num(pl[3],1)}=${num(PB[3],1)}`)}</div>`),
   at(3,p(`Score: the largest class score, ${num(CELL.p_dog,3)}, so the label is dog.`))),'1fr 1.15fr'),
 lines:['At test time we know only what the cell wrote: four distances and 80 scores.','Undo the distances: left edge = centre minus l, and so on. A box in pixels.','Its score is its largest class score, 0.871, and its label that class. One cell, one scored box.'],
 ask:['How do we get x₁ from the record?','Where is this box?','Which score does the box get?'],
 expected:[`x₁ = ${C0[0]} − l.`,`(${PB.map(v=>num(v,1)).join(', ')}): on the dog.`,'The largest of its 80 class scores, 0.871 (dog).'],
 transition:'Every cell does this. Look at them all.',source:YOLO_SRC});
S_('cell-inspector','dense','Every cell writes a record: point at one',{builds:1,
 body:widget('cell-inspector','Point at a cell of the 30 by 20 grid to read its class scores and box'),
 lines:['Move over the grid. Cells near the dog say dog and draw nearly the same box; cells on the wall give every class a tiny score, and their boxes mean nothing.'],
 ask:['What does a cell on the wall write?'],expected:['A box of some kind, but every class score near 0, so its score is tiny and it will be dropped.'],
 point:'Every cell always writes a box. The score decides whether anyone looks at it.',
 transition:'Decode all of them and keep the confident ones.',source:YOLO_SRC});
const cand=S.nms_courtyard;
const candBoxes=(list,op=1)=>list.map(k=>rect(k.box,{stroke:k.name==='potted plant'?COL.amber:COL.guess,w:2.5,op})).join('');
S_('all-candidates','dense','Decode every cell, keep scores ≥ 0.25: 31 boxes',{builds:3,
 body:cols(courtyard(gat(2,candBoxes(cand.candidates)),'Thirty-one candidate boxes: ten on the dog, ten on the cat, eleven on plants'),
  stack(p(`The network always writes ${big(S.grid.total)} records for a photo this size: this grid’s 600 and two finer grids’ (Part 7).`),
   at(2,p(`Scores ≥ 0.25: ${cand.n_candidates} boxes. ${cand.counts.dog} on the dog, ${cand.counts.cat} on the cat, ${cand.counts['potted plant']} on plants.`)),
   at(3,p('<b>We want one box per object.</b> Each animal has about ten nearly identical boxes, one per firing cell.'))),'1.25fr 1fr'),
 lines:[`Every photo of this size gets exactly ${big(S.grid.total)} records: the fixed-size output.`,`Throw away the unconfident ones: ${cand.n_candidates} boxes have a score of at least 0.25.`,'The ten cells that fired for the dog each drew a dog box. To get one box per object, remove the duplicates.'],
 ask:['How many records does the network write?','How many survive the score filter?','Why ten boxes for one dog?'],
 expected:[big(S.grid.total),String(cand.n_candidates),'About ten cells were trained to fire for each object, and they did.'],
 transition:'Part 5 in one slide.',source:YOLO_SRC});
recap(5,'dense',['Sliding a classifier over 5,400 windows works but repeats work; one pass of a CNN gives a grid of cells instead.','Every cell writes a record: four distances to a box’s sides and 80 yes/no class scores.',`Cells near an object’s centre are positives (${S.counts.positives} here); the rest are background, with box target “?”.`,
 'Loss: binary cross-entropy for every class at every cell, plus a box loss at the positives.',`At test time: decode every cell, keep scores ≥ 0.25: ${cand.n_candidates} boxes for 4 objects.`],
 'turn about ten boxes per object into one.',
 {line:'Part 5: a candidate at every place, trained near each object. Part 6: one box per object.',ask:'Why are there about ten boxes per object at test time?',expected:'Training made several cells near each object positives; after training, all of them fire.',transition:'Part 6.'});

// ================================================================================================ Part 6
partBreak(6,'nms','One box per object: non-maximum suppression','Ten boxes for one dog. Keep the best and delete the ones that overlap it heavily.',[
 'Run the greedy recipe on the dog’s ten real boxes, one IoU at a time; then on two dogs.','See what the IoU threshold trades off, and why classes are kept apart.','Try it live; write it in eight lines; then the whole detector in code.'],
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
 lines:['Sort by score.','The best box is kept: no other box can beat it.','Boxes that overlap it heavily describe the same object: delete them. Boxes that overlap little may be other objects: keep them for now.','Then repeat: the best of what is left is kept, and so on. “Non-maximum suppression”: suppress what is not the local maximum.'],
 point:'Andrew Ng’s version: first drop boxes with p_c ≤ 0.6, then delete boxes with IoU ≥ 0.5 with the kept one, separately for each class. Ultralytics’ defaults are a score cut-off of 0.25 and an IoU threshold of 0.7.',
 ask:['Why sort first?','Is the top box ever deleted?','Why only same-class boxes?','When does the loop stop?'],
 expected:['So that each kept box is the best of its neighbourhood.','No: it is kept immediately.','A person on a bicycle overlaps the bicycle; both are real objects.','When no boxes are left.'],
 transition:'Run it on the dog’s ten boxes.'});
S_('nms-dog','nms','NMS on the dog’s ten boxes',{builds:4,
 body:`<div class="table-sm tight">${table(['rank','cell','score','IoU with the kept box','fate'],dogTen.map((k,i)=>[String(i+1),`(${k.row}, ${k.col})`,num(k.score,3),i===0?at(2,'kept box'):at(3,num(k.iou,3)),i===0?at(2,'<span class="hit">keep</span>'):at(4,'<span class="miss">delete (&gt; 0.7)</span>')]))}</div>`,
 lines:['Step 1: the ten boxes sorted by score.','Step 2: keep the top one, cell (9, 19).','Step 3: each other box’s IoU with it. All are above 0.9: these boxes are the same box, drawn by neighbouring cells.','All above the 0.7 threshold: delete all nine. Nothing left for the dog; one dog box remains.'],
 ask:['Which box is kept first?','How similar are the other boxes to it?','Which boxes are deleted?','How many dog boxes remain?'],
 expected:['Cell (9, 19), score 0.889.',`Very: IoU from ${num(Math.min(...dr.removed.map(k=>k.iou)),2)} to ${num(Math.max(...dr.removed.map(k=>k.iou)),2)}.`,'All nine: every IoU is above 0.7.','One.'],
 transition:'Two objects of the same class.',source:YOLO_SRC});
const T2=S.nms_two_dogs,[r1,r2]=T2.rounds;
const tdPhoto=(inner,alt)=>photo('two-dogs',W2,H2,inner,alt,{view:[120,120,1060,520]});
const keptPill=k=>rect(k.box,{stroke:COL.guess,w:7})+pill(k.box[0],k.box[1],`dog ${num(k.score,3)}`,{fill:COL.guess,size:30});
S_('nms-two-dogs','nms','Two dogs: why the loop keeps the second one',{builds:3,
 body:cols(`<div class="state-slot"><div data-only="1">${tdPhoto(T2.candidates.map(k=>rect(k.box,{stroke:COL.guess,w:2})).join(''),'Twenty dog boxes on two dogs')}</div><div data-only="2">${tdPhoto(T2.left_after_1.map(k=>rect(k.box,{stroke:COL.guess,w:2})).join('')+keptPill(r1.keep),'Round 1: the left dog kept, its twins deleted')}</div><div data-only="3">${tdPhoto(keptPill(r1.keep)+keptPill(r2.keep),'Round 2: both dogs kept, one box each')}</div></div>`,
  `<div class="state-slot">${only(1,p(`Two dogs: ${T2.n} dog boxes with score ≥ 0.25, about ten per dog.`))}${only(2,p(`Round 1 keeps the best box, ${num(r1.keep.score,3)} on the left dog, and deletes its ${r1.removed.length} twins (IoU ≥ ${num(Math.min(...r1.removed.map(k=>k.iou)),2)}). The right dog’s boxes have IoU <b>${num(Math.max(...T2.left_after_1.map(k=>k.iou)),1)}</b> with it: untouched.`))}${only(3,p(`Round 2 keeps the best of what is left, ${num(r2.keep.score,3)} on the right dog, and deletes its ${r2.removed.length} twins. Two dogs, two boxes.`))}</div>`,'1.4fr 1fr'),
 lines:[`Two dogs in one photo: ${T2.n} dog boxes survive the score filter, about ten on each dog.`,`Round 1: keep the best box, ${num(r1.keep.score,3)}, on the left dog; delete every dog box that overlaps it by more than 0.7. The right dog’s boxes do not overlap it at all, so they stay.`,`Round 2: the best remaining box, ${num(r2.keep.score,3)}, is on the right dog. Keep it, delete its twins. Keeping only the single best box overall would have lost a dog; the loop keeps one per object.`],
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
  `<div class="state-slot">${only(1,p(`Threshold 0.7: ${S.nms_crowd.by_threshold['0.7']} people, one box each. (From ${S.nms_crowd.n_candidates} candidates.)`))}${only(2,p(`Too high, 0.95: ${S.nms_crowd.by_threshold['0.95']} boxes. Two duplicates (amber) overlap their twin by less than 0.95 and survive.`))}${only(3,p(`Too low, 0.0 (any overlap at all): ${S.nms_crowd.by_threshold['0.0']}. Two people whose boxes merely touch a neighbour’s are deleted (red).`))}</div>`),
 lines:[`The crowd photo: ${S.nms_crowd.n_candidates} person candidates, NMS at 0.7: eleven people, eleven boxes.`,'Raise the threshold to 0.95 and NMS deletes only near-identical boxes: two duplicates slip through.','Lower it to 0 and any touching box is deleted, including real neighbours. People in a queue or a crowd overlap far more than this; no single threshold suits every scene.'],
 ask:['How many people does NMS keep at 0.7?','What goes wrong at 0.95?','What goes wrong at 0?'],
 expected:['Eleven.','Duplicates survive: 13 boxes.','Real people are deleted for touching a neighbour: 9 boxes.'],
 point:'Typical thresholds are 0.45–0.7. Crowded scenes motivated Soft-NMS (lower the score instead of deleting) and NMS-free detectors such as DETR.',
 transition:'One more rule: classes.',source:YOLO_SRC});
const ca=S.class_aware;
S_('class-aware','nms','Boxes of different classes do not suppress each other',{builds:3,
 body:cols(photo('street',W2,H2,prBox(ca.person.box,`person ${num(ca.person.score)}`,{size:15,w:3})+prBox(ca.bicycle.box,'',{size:15,w:3,fill:COL.amber})+pill(ca.bicycle.box[0],ca.bicycle.box[3]+2,`bicycle ${num(ca.bicycle.score)}`,{fill:COL.amber,size:15,below:true})+gonly(2,line(ca.bicycle.box[0],ca.bicycle.box[1],ca.bicycle.box[2],ca.bicycle.box[3],{stroke:COL.loss,w:3})+line(ca.bicycle.box[2],ca.bicycle.box[1],ca.bicycle.box[0],ca.bicycle.box[3],{stroke:COL.loss,w:3})),'A cyclist: the person box and the bicycle box overlap',{view:[650,360,170,200]}),
  stack(eq(R`\mathrm{IoU}(\text{person},\text{bicycle})=${num(ca.iou,3)}`),at(2,p('Ignore classes, threshold 0.3: the bicycle overlaps the higher-scoring person by more than 0.3, so it is deleted.')),
   at(3,p('Class-aware NMS only compares boxes of the same class: both survive. This is the usual choice (torchvision’s batched_nms).'))),'0.9fr 1.1fr'),
 lines:['A cyclist: a person box and a bicycle box. They overlap, IoU 0.339, and both are right.','If NMS ignored classes, with threshold 0.3, the bicycle would be suppressed by the person.','Run NMS separately for each class and both are kept. Steps 3 of the recipe said “of the same class” for this reason.'],
 ask:['How much do the two boxes overlap?','What would class-agnostic NMS at 0.3 do?','What does class-aware NMS do?'],
 expected:[num(ca.iou,3),'Delete the bicycle.','Keep both: they are compared only within their own class.'],
 transition:'Try the thresholds yourself.',source:YOLO_SRC});
S_('nms-play','nms','Try it: thresholds on the street photo',{builds:1,
 body:widget('nms-play','Move the score and IoU thresholds and step through NMS on the street photo'),
 lines:['Real candidates from YOLOv8n. Move the score threshold, then the IoU threshold; switch to “all classes together” and watch the bicycle; press Step to run the loop one round at a time.'],
 ask:['At which IoU threshold do duplicates start to survive?'],expected:['Near 0.95 for this photo: below that, each object keeps one box.'],
 transition:'NMS in code.',source:YOLO_SRC});
S_('nms-code','nms','NMS in code',{builds:2,
 body:`<div class="code-sm">`+stack(code(`def nms(boxes, scores, thr=0.7):
    order = scores.argsort(descending=True)          # step 1
    keep = []
    while order.numel() > 0:
        i = order[0]; keep.append(i)                 # step 2
        ious = box_iou(boxes[i, None], boxes[order[1:]])[0]
        order = order[1:][ious <= thr]               # step 3, then repeat
    return torch.stack(keep)`),
  at(2,code(`torchvision.ops.nms(boxes, scores, 0.7)              # same indices
torchvision.ops.batched_nms(boxes, scores, labels, 0.7)  # per class`)))+'</div>',
 lines:['The recipe line by line: sort, keep the first, drop everything that overlaps it more than the threshold, repeat.','torchvision has it built in; batched_nms runs it separately for each class label.'],
 ask:['Which line deletes the duplicates?','How would you make it class-aware by hand?'],
 expected:['order = order[1:][ious <= thr].','Run it once per class, or offset each class’s boxes so different classes never overlap (what batched_nms does).'],
 demo:'Notebook part 6 runs this function on the courtyard’s 31 candidates and checks it against torchvision.ops.nms.',
 transition:'The dense answer, end to end.'});
S_('dense-recap','nms','The dense answer, end to end',{builds:2,
 body:stack(flow([
  {id:'img',x:0,y:60,w:140,h:90,label:'photo',role:'data'},
  {id:'cnn',x:172,y:60,w:140,h:90,label:'CNN',sub:'+ head',role:'ink'},
  {id:'rec',x:344,y:60,w:140,h:90,label:'12,600',sub:'records',role:'q'},
  {id:'dec',x:516,y:60,w:140,h:90,label:'decode',sub:'boxes',role:'q'},
  {id:'flt',x:688,y:60,w:140,h:90,label:'≥ 0.25',sub:'31 left',role:'q'},
  {id:'nms',x:860,y:60,w:140,h:90,label:'NMS',sub:'4 left',role:'p'}],
  [{from:'img',to:'cnn'},{from:'cnn',to:'rec'},{from:'rec',to:'dec'},{from:'dec',to:'flt'},{from:'flt',to:'nms'}],{width:1000,height:200,label:'Photo to detections in the dense detector'}),
  at(2,p('<b>Fixed size in, any size out.</b> The network’s output never changes shape; the score filter and NMS decide how many objects come out: here 4, for the crowd 11, for an empty wall 0.'))),
 lines:['Photo, CNN, a fixed 12,600 records, decoded into boxes, filtered by score, cleaned by NMS: four detections.','This is answer A to the lecture’s question: place-based outputs, many per object in training, one per object after NMS.'],
 ask:['Which steps have learned weights?','Where does the number of detections get decided?'],
 expected:['Only the CNN and the head; decoding, filtering and NMS are fixed rules.','In the score filter and NMS, after the network.'],
 transition:'The same pipeline in code.'});
S_('detect-code','nms','The whole detector at test time, in eight lines',{builds:2,
 body:`<div class="code-sm">`+stack(code(`def detect(photo, net, names, score_thr=0.25, iou_thr=0.7):
    y, _ = net(photo)                          # (1, 84, 12600): always this shape
    boxes = cxcywh_to_xyxy(y[0, :4].T)         # (12600, 4), in pixels
    scores, labels = y[0, 4:].max(0)           # each cell's best class and score
    keep = scores >= score_thr                 # ${cand.n_candidates} cells left
    boxes, scores, labels = boxes[keep], scores[keep], labels[keep]
    keep = batched_nms(boxes, scores, labels, iou_thr)   # ${cand.kept.length} left
    return [(names[l], s, b) for b, s, l in zip(boxes[keep], scores[keep], labels[keep])]`),
  at(2,code(`detect(courtyard, net, names)
# ${cand.kept.map(k=>`${k.name} ${num(k.score,3)}`).join(', ')}, each with its box`)))+'</div>',
 lines:['Parts 5 and 6 as code: run the network once, read every cell’s box and best class, keep the confident cells, run NMS separately for each class.',`On the courtyard photo it returns the ${cand.kept.length} detections of the lecture’s first slide. Nothing in it depends on how many objects there are.`],
 ask:['Which line decides how many objects are returned?','Which lines have learned weights?'],
 expected:['The score filter and batched_nms together.','Only net(photo); the rest are fixed rules.'],
 point:'batched_nms is torchvision.ops.batched_nms; cxcywh_to_xyxy is torchvision.ops.box_convert(boxes, "cxcywh", "xyxy"). Ultralytics’ own post-processing does the same steps (checked in scripts/science.py).',
 demo:'Notebook part 6 runs this function on the courtyard photo.',
 transition:'Why does YOLOv8 have three grids?',source:YOLO_SRC});
// ================================================================================================ Part 7
partBreak(7,'scales','Small and large objects: three grids',`A 32-pixel cell is coarse for a person ${farPed[2]-farPed[0]} pixels wide. YOLOv8 predicts from three grids at once.`,[
 'See the range of sizes in one street photo, now with the grid.',`Count the cells of the three grids: where ${big(G.total)} came from.`,'Check which grid found each real detection.'],
 {line:'Three grids, three cell sizes, one record format.',ask:`What could go wrong for a ${farPed[2]-farPed[0]}-pixel-wide person on a 32-pixel grid?`,expected:'It is under half a cell; two such people could share one cell, and one cell must describe both.',transition:'Sizes in one photo.'});
chap('7.1');
const SC=S.levels.scale,busCells=Math.round((bus[2]-bus[0])/32),ratio=Math.round((bus[2]-bus[0])/(farPed[2]-farPed[0]));
S_('sizes','scales','Part 1’s street again, with the 32-pixel grid',{builds:2,
 body:cols(photo('scale',W2,H2,gtBox(bus,`bus · ${bus[2]-bus[0]} px wide`,{size:30})+gtBox(cyc,'',{w:4})+pill(cyc[0],cyc[1],`${cyc[2]-cyc[0]} px`,{fill:COL.target,size:28})+gtBox(farPed,'',{w:4})+pill(farPed[0]-4,farPed[1],`${farPed[2]-farPed[0]} px`,{fill:COL.target,size:28,anchor:'end'})+gat(2,gridLines(W2,H2,32,{op:.6})),'A bus, a cyclist and a far pedestrian',{view:[220,150,1060,470]}),
  stack(p(`The bus is ${bus[2]-bus[0]} px wide; the cyclist ${cyc[2]-cyc[0]} px; the far pedestrian ${farPed[2]-farPed[0]} px.`),at(2,p('On a 32-px grid the pedestrian is under half a cell. Two such people side by side would put both centres in one cell, which can describe only one of them.'))),'1.5fr 1fr'),
 lines:[`Part 1’s street: a bus ${bus[2]-bus[0]} px wide, a cyclist ${cyc[2]-cyc[0]} px, a pedestrian ${farPed[2]-farPed[0]} px far down the road.`,`Draw the 32-px grid. The bus spans about ${busCells} cells; the pedestrian sits inside one. A coarse grid suits big objects; small ones need finer cells.`],
 ask:['How many times wider is the bus than the far pedestrian?','What is the problem for small objects on a coarse grid?'],
 expected:[`About ${ratio} times.`,'A cell may contain several small objects but writes one record; and its features are dominated by a large surrounding region.'],
 transition:'Three grids.',source:PHOTO_SRC});
const tri=(n,s,W_,H_)=>`${n}: ${W_/s} × ${H_/s} = ${big(W_*H_/s/s)}`;
S_('three-grids','scales','Three grids: cells of 8, 16 and 32 pixels',{builds:3,
 body:stack(`<div class="table-sm">${table(['grid (cell size)','courtyard, 960 × 640','street, 1280 × 704','built from'],[
   ['8 px',`120 × 80 = ${big(9600)}`,`160 × 88 = ${big(14080)}`,'early layers: sharp, local'],
   ['16 px',`60 × 40 = ${big(2400)}`,`80 × 44 = ${big(3520)}`,'middle layers'],
   ['32 px',`30 × 20 = ${big(600)}`,`40 × 22 = ${big(880)}`,'deep layers: wide view'],
   ['<b>all</b>',at(2,`<b>${big(12600)}</b>`),at(2,`<b>${big(18480)}</b>`),'']])}</div>`,
  at(3,p('Every cell of every grid writes the same 84-number record. The fine grid catches small objects; the coarse grid sees enough to box a bus.'))),
 lines:['YOLOv8 reads three feature maps from different depths of the CNN: cells of 8, 16 and 32 pixels.','Add them up: 12,600 for the courtyard, the number we decoded in Part 5. A bigger photo gets more cells: 18,480 for the street.','Each grid writes the same kind of record. Feature pyramids (FPN, 2017) mix deep and early features so even the fine grid knows what it is looking at.'],
 ask:['How many cells does the 8-px grid have for the courtyard?','Where did 12,600 come from?','Why not use only the fine grid?'],
 expected:['120 × 80 = 9,600.','9,600 + 2,400 + 600.','Fine cells come from early layers whose features see only a small region: too little context for large objects.'],
 transition:'Which grid found what?'});
const strideCol={8:COL.loss,16:COL.amber,32:COL.guess};
S_('which-grid','scales','Which grid found each object? The real answer',{builds:2,
 body:cols(photo('scale',W2,H2,SC.map(k=>prBox(k.box,`${k.stride} px`,{size:26,w:4,fill:strideCol[k.stride]})).join(''),'Each final detection coloured by the grid that produced it',{view:[220,150,1060,470]}),
  stack(`<div class="table-sm tight">${table(['object','grid'],SC.map(k=>[k.name,`<span style="color:${strideCol[k.stride]};font-weight:650">${k.stride} px</span>`]))}</div>`,at(2,small('Street photo: dog and near person from 32 px; car, cyclist and bicycle from 16 px; the far person from 8 px.'))),'1.5fr 1fr'),
 lines:['After NMS, look up which grid each kept box came from: the bus from the 32-px grid, the cyclist and bicycle from the 16-px grid, the far pedestrian from the 8-px grid.','The street photo agrees: large from coarse, small from fine. Training assigns each object to cells whose grid suits its size.'],
 ask:['Which grid found the bus? The far pedestrian?','Who decided this?'],
 expected:['32 px; 8 px.','Training: an object’s positive cells are chosen where its box fits best, which for small objects is the fine grid.'],
 transition:'Part 7 in one slide.',source:YOLO_SRC});
recap(7,'scales',[`One grid cannot suit a ${bus[2]-bus[0]}-px bus and a ${farPed[2]-farPed[0]}-px pedestrian.`,`YOLOv8 predicts from three grids, with cells of 8, 16 and 32 pixels: ${big(G.total)} records for the courtyard.`,'Every cell of every grid writes the same 84-number record; NMS runs on all of them together.','Small objects come from the fine grid, large ones from the coarse grid.'],
 'measure how good the detections are.',
 {line:'Part 7: three grids for three sizes. Part 8: measuring a detector.',ask:'Which grid would you expect to find Part 1’s small bird?',expected:`The finest, 8 px: its best box did come from a stride-${S.bird.best.stride} cell.`,transition:'Part 8.'});

// ================================================================================================ Part 8
partBreak(8,'eval','Measuring a detector','Compare detections with annotations: decide which are right, then summarise.',[
 'Decide true positive, false positive and miss, on the street photo’s real detections.','Precision and recall at one threshold, then at all of them: walk down a ranked list.','Average precision and mAP; then back to Part 1’s bird.'],
 {line:'Right or wrong for each detection, then precision, recall and AP.',ask:'A detector returned 12 boxes for 4 people. Is that good?',expected:'It depends: are the 4 people among them, and how confident were the 8 extra boxes?',transition:'The rule for a correct detection.'});
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
 lines:[`Four annotated people (teal). YOLOv8n’s person detections after NMS, down to score 0.01: ${ES.rows.length}.`,'The four most confident each claim a different person with IoU above 0.9: four true positives.',`The other ${ES.rows.length-4}, scores 0.04 and below, sit on the car’s windscreen, where nobody is: false positives. No person is missed.`],
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
 lines:[`At the usual 0.25: the cat and the dog are found, the bird (${num(B.best.score,3)}) is missed. Precision 1, recall ${hi.tp}/${hi.tp+hi.fn}.`,`Lower the cut-off to 0.05 and the bird’s box gets through: recall ${lo.tp}/${lo.tp+lo.fn}. On this photo nothing false comes in with it; on the street, going lower brought eight false people.`],
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
  at(3,`<div class="table-sm xtight">${table(['YOLOv8n','mAP@0.5','AP@[.5:.95]'],[[`our 8 photos, 7 classes, ${S.benchmark.n_gt} objects`,num(BY.map50,3),num(BY.map,3)],['COCO validation, 5,000 photos, 80 classes (published)','—','0.373']])}</div>`),
  at(3,small('Our eight clean photos are easy; COCO’s crowded, cluttered photos are not.'))),
 lines:['mAP averages AP over classes. COCO goes further and averages over ten IoU thresholds, from loose (0.5) to strict (0.95), which rewards tight boxes.','Raising the IoU threshold turns loose boxes into false positives and their objects into misses: AP can only fall.',`YOLOv8n on our eight photos: ${num(BY.map50,2)} at IoU 0.5, ${num(BY.map,2)} averaged over the strict thresholds. On COCO’s validation set its published AP is 0.373: real scenes are far harder.`],
 ask:['What does mAP average over?','Why average over IoU thresholds?','Why is COCO’s number so much lower than ours?'],
 expected:['Classes (and, for COCO, IoU thresholds).','To reward boxes that are tight, not just roughly right.','COCO has 80 classes and crowded, cluttered, small objects; our eight photos are clean and easy. A handful of photos is not a benchmark.'],
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
S_('summary','wrap','One question, one answer, three uses of IoU',{builds:3,
 body:stack(at(1,p('<b>Question:</b> a network’s output has a fixed shape; the answer is a list of any length, in no order.')),
  at(2,`<ol class="steps">${['A candidate at every place: each cell of three grids writes four box numbers and 80 class scores.','In training, the cells near each object learn it; every other cell learns “nothing here”.','At test time, keep the confident cells, then NMS keeps one box per object.'].map(x=>`<li>${x}</li>`).join('')}</ol>`),
  at(3,`<div class="table-sm tight">${table(['IoU used for','pairs','when'],[['assignment','cells ↔ annotated objects','training'],['NMS','predictions ↔ predictions','test time'],['evaluation','predictions ↔ annotated objects','measuring']])}</div>`)),
 lines:['The lecture’s question: how can a network with a fixed output return a variable, unordered set?','The dense answer: outputs tied to places, many per object in training, one per object after NMS. The list’s length is decided after the network.','Three places where boxes are paired up, easy to confuse: assignment in training, NMS between predictions, evaluation against annotations. Each uses IoU.'],
 ask:['State the lecture’s question in one sentence.','Where is the number of detections decided?','Which pairing uses the annotations?'],
 expected:['How a fixed-size output can describe a variable, unordered set.','After the network: the score filter and NMS.','Assignment (training) and evaluation (measuring); NMS uses only predictions.'],
 point:'Appendix A gives the other answer, DETR: a fixed set of 100 slots matched to objects in training, so no NMS.',
 transition:'Back to the six jobs.'});
const again=[['road','person, bicycle, car, bus…','far pedestrians are tiny','fine grid (Part 7); follow boxes across frames'],
 ['crowd','person','people stand close and overlap','check the NMS threshold (Part 6)'],
 ['camera trap','each species','small animals get unsure scores, like the bird','a lower cut-off; more labelled photos of small animals'],
 ['microscope','each cell type','no COCO class; cells touch','label cells by hand and fine-tune; NMS keeps touching cells'],
 ['warehouse','parcel','new class, many sizes','label parcels and fine-tune the same detector'],
 ['factory','crack, scratch, dent','thin and small defects','higher resolution, the fine grid; measure recall']];
S_('apps-again','wrap','Back to the six jobs: what you would do now',{builds:2,
 body:`<div class="table-sm xtight">${table(['job','classes','what is hard','what to do'],again.map((r,i)=>i<3?r:r.map(c=>at(2,c))))}</div>`,
 lines:['The three everyday jobs: a pretrained COCO detector already knows their classes. What remains is tuning: grids, NMS threshold, score cut-off.','The three specialist jobs need new classes: label a few hundred photos with boxes, fine-tune the same detector, and measure precision and recall on photos it has not seen.'],
 ask:['Which of the six jobs could use a COCO detector as it is?','What would you do first for the microscope job?'],
 expected:['Road, crowd and (with care for small animals) the camera trap.','Annotate cells with boxes, fine-tune a pretrained detector on them, and measure precision and recall.'],
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
 body:`<div class="part-break">${p('Back to Part 4’s slots: make 100 of them, let each read the whole image, and match slots to objects before the loss. No NMS.')}<ol class="steps">${['Follow a photo through DETR to 100 predictions, and see where two queries looked.','Watch duplicates vanish inside the decoder.','Build the matching cost one cell at a time, solve the matching, and compute the loss.'].map(x=>`<li>${x}</li>`).join('')}</ol></div>`,
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
  at(3,p(`Cheapest pairing: left dog ↔ q61, right dog ↔ q98, total ${num(MT.total[0][0]+MT.total[1][1],2)}. Every other query is matched to nothing and learns “no object”.`)),
  at(3,small(`q2’s box also sits on the left dog (cost ${num(MT.total[0][3],2)}), but it says “no object”: the class term makes q61 cheaper.`))),
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
  at(3,eq(R`\text{q90 (a plant)}\to\text{no object: }\ 0.1\times(-\log ${num(ML.unmatched_plant.p_none,3)})=\lcol{${num(ML.unmatched_plant.weighted,3)}}`)),
  at(3,small('Our target list holds only the two dogs, so the loss would teach q90 to call the pot nothing. What is annotated decides what is learned; COCO does label potted plants.'))),
 lines:['A matched query learns its object: cross-entropy for the class, plus L1 and 1 − GIoU for the box. q61 is already almost perfect: tiny loss.','An unmatched query learns “no object”, its cross-entropy weighted by 0.1 because most queries are empty. q2 already says no object: almost no loss.',`q90 named a real plant, but plants are not in this target list: it pays ${num(ML.unmatched_plant.weighted,2)} for being right. Annotation policy matters.`],
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
 lines:['The cost matrix is three lines: class, L1 and GIoU for every (query, object) pair. One call solves the matching. The loss then uses the matched pairs.','At test time there is nothing to match: run the model, keep the queries whose best class beats a threshold. No NMS.'],
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
  [`our 8 photos, AP@[.5:.95]`,num(BY.map,3),num(BD.map,3)],
  ['COCO validation, AP (published)','0.373','0.420']])}</div>`,
  at(2,p('Both turn a fixed-size output into a set of any size: by scores and NMS, or by “no object” and matching.'))),
 lines:['Side by side. The structural difference is how outputs are assigned to objects in training: by place, several per object; or by matching, one per object.','Both solve the lecture’s question with a fixed tensor plus a way to say “nothing here”.'],
 ask:['Where does each method decide which output answers for which object?','What plays the role of “no object” in YOLO?'],
 expected:['YOLO: by cell position in training; DETR: by Hungarian matching in training.','Low class scores, removed by the score filter.'],
 point:'DETR trained for 500 epochs on COCO; Deformable DETR, DINO and RT-DETR made such models faster to train and real-time.',
 transition:'End of Appendix A. Appendix B: more depth.'});

// ================================================================================================ Appendix B: more depth
O('opt-yolov1','YOLOv1 (2016): one responsible cell per object',{builds:1,
 body:stack(eq(R`7\times7\ \text{cells}\times(2\times5+20)=7\times7\times30`),p('Each cell: two boxes, each (x, y, w, h, confidence), and one set of 20 class probabilities (PASCAL VOC). Only the cell containing an object’s centre is responsible for it; x, y are offsets inside that cell, w, h fractions of the image.'),small('Confidence was trained toward the IoU between the box and the truth. A cell could hold at most one object’s class.')),
 ask:['Why did YOLOv1 struggle with flocks of birds?'],expected:['Each cell had one class vector: several small objects with centres in one cell could not all be described.']});
O('opt-anchors','Anchors: predict offsets from template boxes',{builds:1,
 body:stack(eq(R`b_x=\sigma(t_x)+c_x,\quad b_y=\sigma(t_y)+c_y,\quad b_w=p_w\,e^{t_w},\quad b_h=p_h\,e^{t_h}`),p('Faster R-CNN, SSD and YOLOv2–v5 place several template boxes (anchors) of chosen sizes and shapes at every cell, and predict small corrections to each. Positives are anchors with high IoU to an object.'),small('Anchor-free detectors (FCOS, YOLOv8) predict distances from the cell centre instead, as in Part 5.')),
 ask:['What must be chosen by hand for an anchor-based detector?'],expected:['The anchor sizes and aspect ratios, and the IoU thresholds for positives.']});
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
 body:`<ul class="steps"><li><b>Deformable DETR</b> (2021): each query attends to a few sampled points per feature level; trains about 10× faster.</li><li><b>DINO, RT-DETR</b> (2022–23): better queries and matching; real-time DETRs.</li><li><b>YOLOv10</b> (2024): one-to-many and one-to-one heads; NMS-free YOLO.</li><li><b>Open vocabulary</b> (OWL-ViT, Grounding DINO): classes given as text, matched with CLIP-like embeddings (the language-grounded vision lecture).</li></ul>`,
 ask:['What did DETR’s successors mainly improve?'],expected:['Training speed and small objects (deformable attention, multi-scale features, better query initialisation).']});

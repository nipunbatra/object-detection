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
 subtitle:'From one label to a set of objects',minutes:100,notebook:'object-detection.ipynb',
 sections:[
  {id:'map',title:'Lecture map',minutes:2},
  {id:'task',title:'Part 1 · From one label to a list',minutes:9},
  {id:'boxes',title:'Part 2 · Boxes and IoU',minutes:13},
  {id:'onebox',title:'Part 3 · One box, then many',minutes:8},
  {id:'dense',title:'Part 4 · A candidate at every place',minutes:20},
  {id:'nms',title:'Part 5 · One box per object: NMS',minutes:11},
  {id:'scales',title:'Part 6 · Three grids for three sizes',minutes:5},
  {id:'detr',title:'Part 7 · DETR: slots matched to objects',minutes:17},
  {id:'eval',title:'Part 8 · Measuring a detector',minutes:12},
  {id:'wrap',title:'Wrap-up',minutes:3},
  {id:'optional',title:'Optional depth',minutes:0},
 ],
};
export const slides=[];

// ------------------------------------------------------------------------------------------------ slide helper
/** Numbered sections; the notebook has one section per part, with the anchor part-k. */
const CHAPTERS=[
 ['1.1','A label or a list?'],['1.2','What makes it hard'],
 ['2.1','Four numbers for a box'],['2.2','Comparing two boxes: IoU'],
 ['3.1','One box head'],['3.2','Several objects, several slots'],
 ['4.1','A grid of cells'],['4.2','Targets'],['4.3','The loss'],['4.4','Reading boxes back out'],
 ['5.1','Non-maximum suppression'],['5.2','Thresholds and classes'],
 ['6.1','Three grids'],
 ['7.1','Slots that read the image'],['7.2','Matching slots to objects'],['7.3','Two answers'],
 ['8.1','Right or wrong?'],['8.2','Precision, recall, AP'],
 ['9.1','Summary'],
];
const PARTS=['A list, not a label','Boxes and IoU','One box, then many','A dense detector','NMS','Three grids','DETR','Measuring'];
const COLAB='https://colab.research.google.com/github/nipunbatra/object-detection/blob/main/object-detection.ipynb';
let chapter=null;
const chap=k=>{chapter=CHAPTERS.find(c=>c[0]===k);if(!chapter)throw new Error('Unknown section '+k);};
/** The bottom bar carries one story line per build; questions and answers live in the notes. */
function S_(id,section,title,o){
 const builds=o.builds||1;
 for(const k of ['lines','ask','expected'])if(!Array.isArray(o[k])||o[k].length!==builds)throw new Error(`${id}: ${k} needs ${builds} entries`);
 const ch=section==='optional'||section==='map'||o.part?null:chapter;
 const part=ch?ch[0].split('.')[0]:o.part||null;
 const nb=o.nb===null||!part||part==='9'?null:{href:`${COLAB}#scrollTo=part-${part}`,label:`▶ Notebook, part ${part}`};
 slides.push({id,section,title,builds,body:o.body,prompts:o.lines,chapter:ch?`${ch[0]} ${ch[1]}`:'',notebook:nb,
  notes:{ask:o.ask,expected:o.expected,point:o.point||'',misconception:o.misconception||'',transition:o.transition||'',demo:o.demo||''},
  source:o.source||'',optional:!!o.optional});
}
const O=(id,title,o)=>S_(id,'optional',title,{...o,optional:true,lines:o.lines||o.ask});
const strip=k=>`<div class="act-strip" role="img" aria-label="Part ${k} of ${PARTS.length}">${PARTS.map((t,i)=>`<span class="${i+1<k?'done':i+1===k?'now':''}">${i+1} · ${t}</span>`).join('')}</div>`;
/** A part's opening slide: where we are, what this part does, and how. */
function partBreak(k,section,title,lead,how,o){
 S_(`part-${k}`,section,`Part ${k} · ${title}`,{part:String(k),builds:1,
  body:`<div class="part-break">${strip(k)}${p(lead)}<ol class="steps">${how.map(x=>`<li>${x}</li>`).join('')}</ol></div>`,
  lines:[o.line],ask:[o.ask],expected:[o.expected],transition:o.transition});
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
 transition:'Start with what an ordinary classifier says about the same photo.',source:YOLO_SRC});

// ================================================================================================ Part 1
chap('1.1');
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
 transition:'Where is this used?',source:'Masks: YOLOv8n-seg run on the photo (scripts/run_models.py). '+PHOTO_SRC});
S_('uses','task','A street in one glance: seven objects, four classes',{builds:2,
 body:cols(photo('street',W2,H2,S.finals.street.map(k=>prBox(k.box,`${k.name} ${num(k.score)}`,{size:24,w:4,fill:k.name==='person'?COL.guess:k.name==='dog'?COL.target:k.name==='car'?COL.data:COL.amber})).join(''),'YOLOv8n on a campus street: four people, a car, a bicycle and a dog',{view:[40,300,1200,404]}),
  at(2,`<div class="three thumb">${[['parcel','parcels on a belt'],['cells','cells on a slide'],['defect','parts to inspect']].map(([n,c])=>`<figure>${photo(n,W2,H2,'',c)}<figcaption>${c}</figcaption></figure>`).join('')}</div>${small('Same task, other classes: count parcels, count cells, find defects.')}`),'1.35fr 1fr'),
 lines:['YOLOv8n on a campus street: four people, a car, a bicycle and a dog, each boxed. A car, a bus or a robot needs exactly this list.','The same task with other classes: parcels on a conveyor, cells under a microscope, defects on a machined part.'],
 ask:['How many objects did the detector find?','What would a detector for these photos need to learn?'],
 expected:['Seven: four people, a car, a bicycle, a dog.','The same kind of list, with classes such as parcel, cell or scratch.'],
 transition:'What makes this harder than classification?',source:YOLO_SRC});
chap('1.2');
const countThumb=(name,n,cap)=>`<figure>${photo(name,W2,H2,S.finals[name].filter(k=>['person','cat','dog','car','bicycle'].includes(k.name)).map(k=>rect(k.box,{stroke:COL.guess,w:7})).join(''),cap)}<figcaption><b>${n}</b> · ${cap}</figcaption></figure>`;
S_('how-many','task','The number of objects changes from photo to photo',{builds:4,
 body:`<div class="four thumb">${at(1,countThumb('cat',1,'one cat'))}${at(2,countThumb('two-dogs',2,'two dogs'))}${at(3,countThumb('street',7,'a street'))}${at(4,countThumb('crowd',11,'a path of people'))}</div>`,
 lines:['One cat: a list of one.','Two dogs: a list of two.','A street: seven.','A busy path: eleven people. The length of the answer depends on the photo.'],
 ask:['How long is this answer?','And this one?','And here?','What does this mean for the network’s output?'],
 expected:['One.','Two.','Seven.','The output must be able to hold one object, or eleven, or none.'],
 point:'Every box here is YOLOv8n’s, after the clean-up step of Part 5. The crowd photo also has bags, not boxed here.',
 transition:'And the list has no natural order.',source:YOLO_SRC});
S_('no-order','task','A list with no order: a set',{builds:2,
 body:cols(`<div class="state-slot">${[1,2].map(b=>`<div data-only="${b}">${photo('two-dogs',W2,H2,gtBox(S.annotations['two-dogs'][0][1],b===1?'1':'2',{size:48,w:7})+gtBox(S.annotations['two-dogs'][1][1],b===1?'2':'1',{size:48,w:7}),'Two dogs numbered in two different orders')}</div>`).join('')}</div>`,
  stack(eq(R`Y=\{(c_1,\pcol{b_1}),\,\dots,\,(c_N,\pcol{b_N})\}`),at(2,p('Number the dogs either way: it is the same answer. Only each class stays paired with its own box.')))
  ,'1.3fr 1fr'),
 lines:['Number the two dogs: left one first.','Or right one first. Both lists describe the same scene: the answer is a set of N (class, box) pairs, N varies, and order means nothing.'],
 ask:['Which dog is number 1?','What must stay together when we reorder?'],
 expected:['Neither: any order is correct.','Each class with its own box.'],
 point:'Keep this photo: in Part 3 the order causes a real problem for the loss, and in Part 7 DETR solves it.',
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
 transition:'Two answers, and the route through them.'});
S_('route','task','Today’s route: two answers to one question',{builds:3,
 body:stack(`<div class="compare">${at(2,`<div class="a"><h3>A · a candidate at every place</h3><ul><li>Each cell of a grid writes one record</li><li>Train the cells near each object</li><li>Keep the best record per object (NMS)</li></ul><p class="caption">YOLO-style dense detectors · Parts 4–6</p></div>`)}${at(3,`<div class="b"><h3>B · a fixed set of slots, matched</h3><ul><li>100 slots, each may say “no object”</li><li>Match slots to objects before the loss</li><li>No clean-up needed</li></ul><p class="caption">DETR · Part 7</p></div>`)}</div>`,
  only(1,p('First the tools both answers need: four numbers for a box, and a score for how well two boxes agree (Part 2). Then why one output cannot do it (Part 3).'))),
 lines:['First, the tools: describe a box, compare two boxes. Then see why a network that outputs one box, or a few, is not enough.',
  'Answer A: give every place in the image its own output, train the outputs near each object, then keep one per object. This is YOLO.',
  'Answer B: a fixed set of 100 slots; before computing the loss, match slots to objects. This is DETR. We end by measuring both.'],
 ask:['What tools will every later part need?','How does answer A decide which output describes the dog?','How does answer B decide?'],
 expected:['A box format and an overlap measure (IoU).','By place: the outputs at the dog’s location.','By matching each object to its best slot before computing the loss.'],
 transition:'Part 2: boxes and IoU.'});

// ================================================================================================ Part 2
partBreak(2,'boxes','Describe a box, compare two boxes','Every later step needs two small tools.',[
 'Write a box as four numbers, in two common formats.','Measure how well two boxes agree: intersection over union, IoU, computed by hand.','Try IoU live, then write it in six lines of PyTorch.'],
 {line:'Two tools: four numbers for a box, and IoU to compare two boxes.',ask:'Why do we need a way to compare two boxes?',expected:'To score predictions against annotations: for the loss, for removing duplicates, and for evaluation.',transition:'Positions in a photo.'});
chap('2.1');
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
S_('centre-size','boxes','The same box as a centre and a size',{builds:4,
 body:cols(courtyard(gtBox(DOG,'',{w:4})+gat(1,arrow(DOG[0],DOG[3]+28,DOG[2],DOG[3]+28,{stroke:COL.target,w:4,both:true})+label((DOG[0]+DOG[2])/2,DOG[3]+20,`w = ${S.dog.w}`,{size:30,fill:COL.target,weight:700,anchor:'middle',halo:true}))+
   gat(2,arrow(DOG[2]+24,DOG[1],DOG[2]+24,DOG[3],{stroke:COL.target,w:4,both:true})+label(DOG[2]+34,(DOG[1]+DOG[3])/2,`h = ${S.dog.h}`,{size:30,fill:COL.target,weight:700,halo:true}))+
   gat(3,`<circle cx="${S.dog.cx}" cy="${S.dog.cy}" r="11" fill="${COL.target}" stroke="#fff" stroke-width="4"/>`+label(S.dog.cx+18,S.dog.cy-14,'centre',{size:30,fill:'#fff',weight:700})),'Width, height and centre of the dog’s box',{view:[330,30,590,640],cls:'short'}),
  sm(at(1,eq(R`w=x_2-x_1=${DOG[2]}-${DOG[0]}=${S.dog.w}`)),at(2,eq(R`h=y_2-y_1=${DOG[3]}-${DOG[1]}=${S.dog.h}`)),
   at(3,eq(R`c_x=x_1+\tfrac{w}{2}=${DOG[0]}+\tfrac{${S.dog.w}}{2}=${S.dog.cx}`)),at(3,eq(R`c_y=y_1+\tfrac{h}{2}=${DOG[1]}+\tfrac{${S.dog.h}}{2}=${S.dog.cy}`)),
   at(4,eq(R`(c_x,c_y,w,h)=(${S.dog.cx},\,${S.dog.cy},\,${S.dog.w},\,${S.dog.h})`))),'0.85fr 1.15fr'),
 lines:['Width: the right edge minus the left edge.','Height: bottom minus top. Remember that y grows downwards.','The centre is halfway across and halfway down.',`Same box, other format: centre (${S.dog.cx}, ${S.dog.cy}), size ${S.dog.w} × ${S.dog.h}. Either format can be computed from the other.`],
 ask:['What is the width?','What is the height?','Where is the centre?','How would you get x₁ back from the centre format?'],
 expected:[`${S.dog.w} pixels.`,`${S.dog.h} pixels.`,`(${S.dog.cx}, ${S.dog.cy}).`,`x₁ = c_x − w/2 = ${S.dog.cx} − ${S.dog.w/2} = ${DOG[0]}.`],
 misconception:'w and h are the full width and height, not half of them.',transition:'Pixels depend on the photo’s size.',source:PHOTO_SRC});
const nrm=S.dog.norm;
S_('normalised','boxes','Divide by the photo’s size: numbers between 0 and 1',{builds:3,
 body:stack(eq(R`\Big(\tfrac{c_x}{W},\,\tfrac{c_y}{H},\,\tfrac{w}{W},\,\tfrac{h}{H}\Big)=\Big(\tfrac{${S.dog.cx}}{${W}},\,\tfrac{${S.dog.cy}}{${H}},\,\tfrac{${S.dog.w}}{${W}},\,\tfrac{${S.dog.h}}{${H}}\Big)`),
  at(2,eq(R`=(${nrm.map(v=>num(v,3)).join(',\\,')})`)),
  at(3,p(`Halve the photo to 480 × 320: every pixel number halves, the normalised numbers do not change. The dog’s centre is 61% of the way across and 52% of the way down, at any resolution.`))),
 lines:['Divide horizontal numbers by the photo’s width, vertical ones by its height.',`The dog: (${nrm.map(v=>num(v,3)).join(', ')}). Every number is between 0 and 1.`,'These numbers survive resizing. Networks often predict normalised boxes; DETR, in Part 7, does exactly this.'],
 ask:['What do we divide c_x by? And h?','What does 0.789 say about the dog?','Why prefer normalised numbers?'],
 expected:['c_x by the width W; h by the height H.','Its box covers 79% of the photo’s height.','They do not depend on the photo’s resolution.'],
 point:'Formats in the wild: torchvision boxes are pixel corners; COCO files store (x, y, w, h) from the top-left; YOLO label files store normalised (c_x, c_y, w, h). Check the format before training.',
 transition:'Now compare two boxes.'});
chap('2.2');
const guess=S.iou_practice.guess;
const farP=S.annotations.street.find(x=>x[0]==='person'&&x[1][2]-x[1][0]<30)[1];
const shifted=b=>[b[0]+60,b[1]+40,b[2]+60,b[3]+40];
S_('compare','boxes','Two boxes for one dog: how well do they agree?',{builds:3,
 body:cols(courtyard(gtBox(DOG,'ours',{size:28})+prBox(guess,'a guess',{size:28})+gat(2,line(S.dog.cx,S.dog.cy,S.dog.cx+60,S.dog.cy+40,{stroke:COL.loss,w:6})+label(S.dog.cx+70,S.dog.cy+20,'72 px',{size:30,fill:'#fff',weight:700})),'Our box and a guess moved 60 px right and 40 px down',{view:dogView}),
  stack(at(2,p('Idea 1: the distance between centres, √(60² + 40²) = 72 px.')),
   at(3,`<div class="columns" style="grid-template-columns:1fr 1.3fr;gap:16px"><div>${p('The same 72 px slip on a far-away person 18 px wide:')}</div>${photo('street',W2,H2,gtBox(farP,'',{w:3})+prBox(shifted(farP),'',{w:3}),'The same shift on a tiny person: the boxes no longer touch',{view:[520,380,180,140]})}</div>`),
   at(3,small('A slip that is fine for the dog misses the small person completely. We need a score that scales with the box.'))),'1fr 1.1fr'),
 lines:['Teal is our box for the dog. Purple is a guess, moved 60 px right and 40 px down. How good is the guess?',
  'One idea: measure how far apart the centres are. Here 72 px. Is that a lot?','For the dog, 72 px is a small slip. For a person 18 px wide in the street photo, the same slip leaves the boxes apart. Compare overlap, not distance.'],
 ask:['Is the purple box a good guess?','How far apart are the centres?','Why is centre distance a poor score?'],
 expected:['Roughly: it covers most of the dog but misses part of it.','√(60² + 40²) ≈ 72 pixels.','It ignores the box’s size: the same distance is small for a large box and fatal for a small one.'],
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
 demo:'Notebook part 2 runs this on the two boxes and checks it against torchvision.ops.box_iou.',
 transition:'Part 3: a network that outputs a box.'});

// ================================================================================================ Part 3
partBreak(3,'onebox','One box is easy; several are not','A network can output four numbers for one box. Asking it for several boxes shows the real problem.',[
 'Add a box head to a classifier and train it with an L1 loss.','Ask the same head for two animals, and see it hedge.','Give it K slots: count and order break the loss.'],
 {line:'One box is regression; several boxes expose the assignment problem.',ask:'What could go wrong with two objects and one box output?',expected:'The network cannot know which object to describe; it may average them.',transition:'One object first.'});
chap('3.1');
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
 transition:'The box loss with numbers.'});
const gn=[(guess[0]+guess[2])/2/W,(guess[1]+guess[3])/2/H,(guess[2]-guess[0])/W,(guess[3]-guess[1])/H];
S_('box-loss','onebox','Training the box head: compare four numbers',{builds:3,
 body:stack(eq(R`\mathcal{L}_\text{box}=\sum_{k=1}^{4}\big|\,\qcol{\hat b_k}-\pcol{b_k}\,\big|`),
  at(2,`<div class="table-sm">${table(['',m('c_x'),m('c_y'),m('w'),m('h')],[[tgt('target (the dog)'),...nrm.map(v=>tgt(num(v,3)))],[gss('prediction (the guess)'),...gn.map(v=>gss(num(v,3)))],['|difference|',...gn.map((v,i)=>num(Math.abs(v-nrm[i]),3))]])}</div>`),
  at(3,eq(R`\mathcal{L}_\text{box}=${gn.map((v,i)=>num(Math.abs(v-nrm[i]),3)).join('+')}=\lcol{${num(gn.reduce((s,v,i)=>s+Math.abs(v-nrm[i]),0),3)}}`))),
 lines:['The L1 box loss: for each of the four numbers, the absolute difference between prediction and target; add them.','Take the guess from Part 2 as the prediction, in normalised units. The centre is off; the size is right.',`Loss ${num(gn.reduce((s,v,i)=>s+Math.abs(v-nrm[i]),0),3)}. It is zero only if all four numbers match; gradient descent moves the four outputs toward the target.`],
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
chap('3.2');
const slotsFig=()=>fig(1000,300,[0,1,2,3,4].map(i=>{const x=20+i*196;return `<g data-at="${i<2?1:2}"><rect x="${x}" y="40" width="180" height="200" rx="10" fill="#fff" stroke="${i<2?COL.guess:MUTED}" stroke-width="3"/>${label(x+90,80,`slot ${i+1}`,{size:26,anchor:'middle',fill:COL.ink,weight:650})}${label(x+90,130,i<2?'class scores':'no object',{size:22,anchor:'middle',fill:i<2?COL.guess:MUTED})}${label(x+90,165,i<2?'+ 4 box numbers':'',{size:22,anchor:'middle',fill:COL.guess})}</g>`;}).join(''),'Five output slots; two hold objects, three say no object');
S_('k-slots','onebox','Give the head K slots',{builds:3,
 body:stack(slotsFig(),at(3,p('Problem 1: a photo with more objects than slots. The crowd photo has 11 people; 5 slots cannot hold them. So make K larger than any photo needs.'))),
 lines:['Give the head K slots instead of one. Each slot writes a class and a box. Two animals: two slots used.',
  'The other slots must be able to say “nothing here”: add a no-object class. Output size: K × (C + 1 + 4), fixed.','Problem 1: what if a photo has more objects than K? Then choose K large. DETR uses K = 100.'],
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
 point:'The slot boxes are DETR’s real predictions for this photo (queries 61 and 98); the L1 sums are over normalised (c_x, c_y, w, h).',
 transition:'Two ways to pair outputs with objects.',source:DETR_SRC});
S_('two-fixes','onebox','Two ways to decide which output answers for which object',{builds:2,
 body:`<div class="compare">${at(1,`<div class="a"><h3>A · by place</h3><ul><li>Tie each output to a place in the image</li><li>The outputs at the dog’s place answer for the dog</li><li>No slot ever chooses</li></ul><p class="caption">Parts 4–6: YOLO</p></div>`)}${at(2,`<div class="b"><h3>B · by matching</h3><ul><li>Keep free slots</li><li>Before the loss, pair slots with objects in the cheapest way</li><li>Each object gets exactly one slot</li></ul><p class="caption">Part 7: DETR</p></div>`)}</div>`,
 lines:['Fix A: give every output a fixed place in the image. Whatever is at that place is its job. Then order cannot matter.','Fix B: keep free slots, and before each loss, match slots to objects so that the total cost is lowest. Then order cannot matter either.'],
 ask:['How does fix A remove the order problem?','How does fix B?'],
 expected:['An output answers for the object at its place; there is nothing to order.','The pairing is chosen by cost, not by position in the list.'],
 transition:'Part 4: answer A, a candidate at every place.'});
// ================================================================================================ Part 4
partBreak(4,'dense','A candidate at every place','Tie each output to a place: a grid of cells over the photo, each writing one record.',[
 'Get a grid of feature vectors from one pass of a CNN; every cell writes a record of class scores and a box.','Decide which cells should answer for each object, and write their targets.','Compute the loss for one cell by hand, then read boxes back out at test time.'],
 {line:'A grid of cells, each writing a record: targets, loss, decoding.',ask:'If every place in the image has its own output, which outputs should describe the dog?',expected:'The ones at, or near, the dog’s location.',transition:'Start from brute force.'});
chap('4.1');
const G=S.grid,CELL=S.cell,s32=G.stride;
const grid=(inner,alt,o={})=>courtyard(gridLines(W,H,s32,{op:.5})+inner,alt,o);
const windows=[[380,60,800,610],[80,270,350,630],[600,120,780,330]];
S_('sliding','dense','The brute-force idea: classify every window',{builds:3,
 body:cols(courtyard(windows.map((b,i)=>gat(i===0?1:2,rect(b,{stroke:i===0?COL.guess:COL.amber,w:5,dash:i===0?'':'12 7'}))).join(''),'Windows of different sizes placed over the photo'),
  stack(at(1,p('Crop a window, run a classifier on it: is an object centred here? Which class?')),
   at(2,p('Every 32 px across and down: 30 × 20 = 600 positions, each at several sizes and shapes. Thousands of crops, each through a whole CNN.')),
   at(3,p('<b>A CNN already does this in one pass.</b> Its last feature map has one vector per position, and each vector describes the region around it.'))),'1.2fr 1fr'),
 lines:['The obvious idea: slide a window over the photo and ask a classifier about each crop.','Positions every 32 pixels give 600 windows; add sizes and shapes and it is thousands of CNN runs per photo. Detectors around 2013 worked like this, and were slow.','Convolution slides the same weights over every position anyway. One pass gives a vector for every position at once.'],
 ask:['How would you find objects with only a classifier?','How many windows is that, roughly?','What does a CNN compute at every position?'],
 expected:['Classify many crops and keep those that say “object”.','600 positions × several sizes: thousands.','A feature vector describing the region around that position.'],
 point:'R-CNN (2014) classified about 2,000 proposed crops per image; Fast and Faster R-CNN shared one CNN pass. Optional slide: two-stage detectors.',
 transition:'The grid of feature vectors.'});
S_('feature-map','dense','One pass of a CNN: a 30 × 20 grid of feature vectors',{builds:3,
 body:cols(stack(flow([
   {id:'img',x:10,y:10,w:230,h:84,label:'photo',sub:'960 × 640 × 3',role:'data'},
   {id:'cnn',x:10,y:150,w:230,h:84,label:'CNN',sub:'shrinks 32×',role:'ink'},
   {id:'map',x:10,y:290,w:230,h:84,label:'feature map',sub:'30 × 20 × 256',role:'q'}],
   [{from:'img',to:'cnn',fromSide:'bottom',toSide:'top'},{from:'cnn',to:'map',fromSide:'bottom',toSide:'top'}],{width:250,height:380,label:'Photo, CNN, feature map'})),
  stack(at(2,grid(cell(10,18,s32,{fill:COL.guess,op:.65}),'The 30 by 20 grid over the photo',{cls:'short'})),at(3,small('One cell = a 32 × 32 block of pixels: its address. Its vector is computed from a much larger region around it.'))),'0.55fr 1.45fr'),
 lines:['The photo goes through a CNN that halves the resolution five times: 960 × 640 becomes 30 × 20, with 256 numbers at each position.',
  'Lay that grid over the photo: each cell covers a 32 × 32 block. Cell (row 10, column 18) is highlighted.','The cell is an address, not a crop: its 256 numbers were computed from a region far larger than its block, wide enough to see the whole dog.'],
 ask:['What size is the feature map?','Which block of pixels does cell (10, 18) cover?','Can a cell describe an object larger than its block?'],
 expected:['30 × 20 positions, 256 numbers each.','x from 576 to 608, y from 320 to 352.','Yes: its vector sees a large region (its receptive field).'],
 point:'For YOLOv8n this is the stride-32 output of the neck. Rows and columns are counted from 0.',
 transition:'What does each cell write?'});
const recFig=()=>{const sc=CELL.scores,x0=300,bw=8.4,y0=230,hh=180;let bars='';
 sc.forEach((v,i)=>{bars+=`<rect x="${(x0+i*bw).toFixed(1)}" y="${(y0-v*hh).toFixed(1)}" width="${(bw-1.6).toFixed(1)}" height="${Math.max(1.5,v*hh).toFixed(1)}" fill="${i===16?COL.guess:'#AAB3BC'}"/>`;});
 const box=CELL.pred_ltrb.map((v,i)=>`<rect x="${20+i*66}" y="70" width="58" height="120" rx="6" fill="#fff" stroke="${COL.guess}" stroke-width="3"/>${label(49+i*66,118,['l','t','r','b'][i],{size:24,anchor:'middle',fill:COL.guess,weight:700})}${label(49+i*66,160,num(v,0),{size:20,anchor:'middle',fill:COL.ink})}`).join('');
 return fig(1000,270,box+label(20,50,'4 box numbers (px)',{size:22,fill:COL.guess,weight:600})+`<g data-at="2">${bars}${line(x0,y0,x0+80*bw,y0,{stroke:AXc})}${label(x0,50,'80 class scores, one per COCO class',{size:22,fill:COL.ink,weight:600})}${label(x0+16*bw+12,y0-sc[16]*hh+8,`dog ${num(sc[16],3)}`,{size:22,fill:COL.guess,weight:700})}${label(x0,y0+30,'person',{size:18})}${label(x0+79*bw,y0+30,'toothbrush',{size:18,anchor:'end'})}</g>`,'The record of one cell: four box numbers and eighty class scores');};
const AXc='#AAB3BC';
S_('cell-record','dense','Every cell writes a record: 4 box numbers, 80 class scores',{builds:3,
 body:stack(recFig(),at(3,`<div class="eq-sm">`+eq(R`\underbrace{30\times20}_{\text{cells}}\times\underbrace{(4+80)}_{\text{record}}\;=\;600\times84\ \text{numbers, for every photo of this size}`)+'</div>')),
 lines:['Cell (10, 18) writes four numbers that place a box: its distances to the box’s left, top, right and bottom edges.',
  'And 80 scores, one per COCO class, each between 0 and 1. Here dog is 0.871; the other 79 are near zero.',
  'The same small layer, with the same weights, writes this record at every cell: a 1 × 1 convolution. The output is a fixed 600 × 84 tensor.'],
 ask:['What do the four box numbers mean?','Why does every class get its own score?','Does each cell have its own weights?'],
 expected:['Distances from the cell’s centre to the four sides of a box.','A cell answers 80 yes/no questions: is there a person? a dog? … All can be “no”.','No: one shared layer, applied at all 600 cells.'],
 point:'These are the real numbers YOLOv8n wrote at this cell. The head writes distances in cells; we show them ×32, in pixels.',
 transition:'Read the four distances.',source:YOLO_SRC});
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
chap('4.2');
const inside=b=>{let s='';for(let r=0;r<G.rows;r++)for(let c=0;c<G.cols;c++){const x=(c+.5)*s32,y=(r+.5)*s32;if(x>b[0]&&x<b[2]&&y>b[1]&&y<b[3])s+=cell(r,c,s32,{fill:COL.target,op:.3});}return s;};
const block=(cells,fill,op=.6)=>cells.map(([r,c])=>cell(r,c,s32,{fill,op})).join('');
S_('which-cells','dense','Which cells should answer for the dog?',{builds:3,
 body:cols(grid(gtBox(DOG,'dog',{size:28})+gtBox(CAT,'cat',{size:28})+gonly(1,inside(DOG))+gat(2,block(G.pos_dog,COL.target))+gat(3,block(G.pos_cat,COL.target)),'Cells inside the dog’s box, then the three-by-three block at its centre'),
  stack(at(1,ps(`${G.inside_dog} cells have their centre inside the dog’s box. Should all of them predict the dog?`)),
   at(2,ps('A common rule (FCOS’s “centre sampling”): only cells within 1.5 cells of the box’s centre. For the dog: rows 9–11, columns 17–19.')),
   at(3,ps('Same for the cat: rows 13–15, columns 5–7. These 18 cells are <b>positives</b>; the other 582 are <b>background</b>.'))),'1.3fr 1fr'),
 lines:[`${G.inside_dog} cells lie inside the dog’s box. Cells near its edge see mostly the background and the box edges are far away; asking all of them to predict the dog is a hard, noisy target.`,
  'So train only the cells near the centre: within 1.5 cells of it, a 3 × 3 block. The box centre (587.5, 335.5) is in cell (10, 18), the middle of the block.',
  'Do the same for the cat. 18 cells get an object target; 582 get the target “no object of any class”.'],
 ask:['How many cells are inside the dog’s box?','Which cells does the centre rule pick?','What do all the other cells learn?'],
 expected:[String(G.inside_dog),'Rows 9–11, columns 17–19: nine cells.','To give every class a low score: background.'],
 point:'Rules differ between detectors: YOLOv1 used only the centre cell; YOLOv8 picks the 10 cells whose current predictions fit the object best. All put the positives near the object.',
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
const recordFig=({boxes,bars,marks=null,boxAt=1,alt})=>{const x0=330,bw=8.2,y0=236,hh=170;let g='';
 boxes.forEach(({vals,col,name},row)=>{const y=60+row*(boxes.length>1?92:0)+(boxes.length>1?0:30);
  g+=`<g data-at="${boxAt}">`+label(16,y-10,name,{size:20,fill:col,weight:650})+vals.map((v,i)=>`<rect x="${16+i*72}" y="${y}" width="64" height="${boxes.length>1?62:100}" rx="6" fill="#fff" stroke="${col}" stroke-width="3"/>${label(48+i*72,y+(boxes.length>1?26:40),['l','t','r','b'][i],{size:20,anchor:'middle',fill:col,weight:700})}${label(48+i*72,y+(boxes.length>1?52:80),v,{size:19,anchor:'middle',fill:COL.ink})}`).join('')+'</g>';});
 bars.forEach(({vals,col})=>vals.forEach((v,i)=>{g+=`<rect x="${(x0+i*bw).toFixed(1)}" y="${(y0-v*hh).toFixed(1)}" width="${(bw-1.8).toFixed(1)}" height="${Math.max(1.5,v*hh).toFixed(1)}" fill="${i===16?col:'#AAB3BC'}"/>`;}));
 if(marks)g+=marks;
 g+=line(x0,y0,x0+80*bw,y0,{stroke:AXc})+label(x0,36,'80 class scores (dog is tall)',{size:20,fill:COL.ink,weight:600})+label(x0,y0+28,'person',{size:17})+label(x0+80*bw,y0+28,'toothbrush',{size:17,anchor:'end'})+label(x0+16*bw+3,y0+28,'dog',{size:18,fill:COL.ink,weight:650,anchor:'middle'});
 return fig(1000,270,g,alt);};
const zeros=Array(80).fill(0),dogOne=zeros.map((_,i)=>i===16?1:0);
S_('target-record','dense','The target written at cell (10, 18)',{builds:3,
 body:stack(`<div class="state-slot"><div data-only="1-2">${recordFig({boxes:[{vals:T0.map(String),col:COL.target,name:'box target (px)'}],bars:[{vals:dogOne,col:COL.target}],boxAt:2,alt:'Target record: dog 1, other classes 0, and four distances'})}</div><div data-only="3">${recordFig({boxes:[{vals:['—','—','—','—'],col:MUTED,name:'no box target'}],bars:[{vals:zeros,col:MUTED}],alt:'Background record: every class 0, no box'})}</div></div>`,
  `<div class="state-slot">${only(1,ps('Class targets: <b>1 for dog</b>, 0 for each of the other 79 classes. Each is the answer to its own yes/no question.'))}${only(2,ps(`Box target: the four distances, (${T0.join(', ')}) px; in cells (÷ 32), (${CELL.target_cells.map(v=>num(v,2)).join(', ')}). A box much larger than a cell is fine.`))}${only(3,ps(`A background cell, (${CELL.bg_row}, ${CELL.bg_col}) on the wall: all 80 class targets 0, and no box target at all.`))}</div>`),
 lines:['A positive cell’s class targets: 1 for dog, 0 for the other 79 classes. Each is the answer to its own yes/no question.',`Its box target: the four distances we just measured, (${T0.join(', ')}).`,'A background cell, such as (3, 3) on the wall: all 80 class targets are 0, and it has no box target, because there is no box to learn.'],
 ask:['What are the class targets of a positive dog cell?','What is its box target?','What does a background cell learn?'],
 expected:['1 for dog, 0 for the other 79.',`(${T0.join(', ')}) pixels.`,'Every class score low; nothing about boxes.'],
 transition:'Now what the network wrote at the same cell.'});
const pl=CELL.pred_ltrb;
const dogMark=`<line x1="${330+16*8.2-3}" y1="${236-170}" x2="${330+17*8.2+1}" y2="${236-170}" stroke="${COL.target}" stroke-width="4"/>`+label(330+17*8.2+6,236-170+6,'target 1',{size:18,fill:COL.target,weight:650});
S_('prediction-record','dense','What the network wrote at cell (10, 18)',{builds:2,
 body:stack(recordFig({boxes:[{vals:T0.map(String),col:COL.target,name:'target'},{vals:pl.map(v=>num(v,1)),col:COL.guess,name:'prediction'}],bars:[{vals:CELL.scores,col:COL.guess}],marks:dogMark,boxAt:2,alt:'Predicted record against the target'}),
  `<div class="state-slot">${only(1,ps(`Dog: <b>${num(CELL.p_dog,3)}</b> (target 1). Cat ${num(CELL.top[1][1],4)}, skateboard ${num(CELL.top[2][1],5)}; the other 77 are smaller still (targets 0).`))}${only(2,ps('Distances: close to the target, the top edge furthest off. The loss turns these differences into one number to reduce.'))}</div>`),
 lines:['The real network’s scores at this cell: dog 0.871 against a target of 1; every other class near its target of 0.','Its four distances: (184.8, 260.4, 177.6, 252.1) against the target (185, 253, 176, 252). Close; the loss measures how close.'],
 ask:['How far is each class score from its target?','Which distance is furthest off?'],
 expected:['Dog: 1 − 0.871 = 0.129 too low; the others are near their target 0.','The top, t: 7.4 px too large.'],
 transition:'The class part of the loss.',source:YOLO_SRC});
chap('4.3');
S_('loss-class','dense','Class loss: one yes/no question per class',{builds:4,
 body:stack(eq(R`\mathrm{BCE}(p,y)=-\big[\,y\log p+(1-y)\log(1-p)\,\big]`),
  at(2,eq(R`\text{dog: }y=1,\ p=${num(CELL.p_dog,3)}:\quad -\log ${num(CELL.p_dog,3)}=\lcol{${num(CELL.bce_dog,3)}}`)),
  at(3,eq(R`\text{the other 79: }y=0:\quad \textstyle\sum_c -\log(1-p_c)=\lcol{${num(CELL.bce_others,4)}}`)),
  at(4,eq(R`\mathcal{L}_\text{class}(10,18)=${num(CELL.bce_dog,3)}+${num(CELL.bce_others,4)}=\lcol{${num(CELL.bce_total,3)}}`))),
 lines:['Binary cross-entropy for one yes/no question: if the answer is yes, −log p; if no, −log(1 − p). Natural logs.','Dog is a yes: −log 0.871 = 0.139. It would be 0 at p = 1 and grows without bound as p falls to 0.','Every other class is a no: −log(1 − p) for each. All 79 scores are near zero, so together they add only 0.0004.','The cell’s class loss: 0.139, almost all from the dog question.'],
 ask:['What is BCE when y = 1? When y = 0?','What is the dog term?','Why are the other 79 terms so small?','Why 80 separate yes/no questions rather than one softmax?'],
 expected:['−log p, and −log(1 − p).','0.139.','Their scores are near 0, the right answer for a no.','A background cell must be able to say “none of the 80”: every yes/no answer no. A softmax over 80 classes always picks one.'],
 point:'In code use binary_cross_entropy_with_logits on the raw outputs: it is numerically stable where p is near 0 or 1.',
 transition:'The box part of the loss.'});
const l1t=CELL.l1_terms;
S_('loss-box','dense','Box loss: how far off are the four distances?',{builds:3,
 body:sm(eq(R`\mathcal{L}_\text{box}=\sum_{k\in\{l,t,r,b\}}\big|\qcol{\hat d_k}-\pcol{d_k}\big|`),
  at(2,eq(R`=|${num(pl[0],1)}-${T0[0]}|+|${num(pl[1],1)}-${T0[1]}|+|${num(pl[2],1)}-${T0[2]}|+|${num(pl[3],1)}-${T0[3]}|`)),
  at(2,eq(R`=${l1t.map(v=>num(v,1)).join('+')}=\lcol{${num(CELL.l1,1)}}\ \text{px}`)),
  at(3,eq(R`1-\mathrm{IoU}(\qcol{\text{predicted box}},\,\pcol{\text{target box}})=1-${num(CELL.iou,3)}=\lcol{${num(1-CELL.iou,3)}}`)),at(3,small('An IoU-based box loss is scale-free: a 9 px error matters more on a small box. YOLOv8 uses one (CIoU), plus a loss on how it spreads each distance.'))),
 lines:['Compare the four predicted distances with the four target distances, and add the absolute differences.','0.2 + 7.4 + 1.6 + 0.1 = 9.3 pixels. Most of it is the top edge: the predicted box starts 7.4 pixels higher than ours.','Another choice: one minus the IoU of the predicted and target boxes, here 0.020. It does not depend on the box’s size, so small objects count as much as large ones.'],
 ask:['What does the L1 box loss add?','Which edge contributes most?','Why might one prefer 1 − IoU?'],
 expected:['Four absolute differences between predicted and target distances.','The top edge, 7.4 px.','It measures overlap, which is scale-free; 9 px is negligible for the dog but large for a small object.'],
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
 point:'YOLOv8’s real loss sums all three grids (Part 6) and uses its own weights and box loss; the structure is the same.',
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
 demo:'Notebook part 4 builds pos and the targets for the courtyard photo and evaluates this loss on YOLOv8n’s real outputs.',
 transition:'At test time there are no annotations: read the boxes out.'});
chap('4.4');
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
  stack(p(`The network always writes ${big(S.grid.total)} records for a photo this size: this grid’s 600 and two finer grids’ (Part 6).`),
   at(2,p(`Scores ≥ 0.25: ${cand.n_candidates} boxes. ${cand.counts.dog} on the dog, ${cand.counts.cat} on the cat, ${cand.counts['potted plant']} on plants.`)),
   at(3,p('<b>We want one box per object.</b> Each animal has about ten nearly identical boxes, one per firing cell.'))),'1.25fr 1fr'),
 lines:[`Every photo of this size gets exactly ${big(S.grid.total)} records: the fixed-size output.`,'Throw away the unconfident ones: 31 boxes have a score of at least 0.25.','The ten cells that fired for the dog each drew a dog box. To get one box per object, remove the duplicates.'],
 ask:['How many records does the network write?','How many survive the score filter?','Why ten boxes for one dog?'],
 expected:[big(S.grid.total),String(cand.n_candidates),'About ten cells were trained to fire for each object, and they did.'],
 transition:'Part 5: removing duplicates.',source:YOLO_SRC});

// ================================================================================================ Part 5
partBreak(5,'nms','One box per object: non-maximum suppression','Ten boxes for one dog. Keep the best and delete the ones that overlap it heavily.',[
 'Run the greedy recipe on the dog’s ten real boxes, one IoU at a time.','See what the IoU threshold trades off, and why classes are kept apart.','Try it live; write it in eight lines.'],
 {line:'NMS keeps the highest-scoring box and removes boxes that overlap it.',ask:'Of ten overlapping dog boxes, which one would you keep?',expected:'The one with the highest score.',transition:'The dog’s ten boxes.'});
chap('5.1');
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
 ask:['Why sort first?','Is the top box ever deleted?','Why only same-class boxes?','When does the loop stop?'],
 expected:['So that each kept box is the best of its neighbourhood.','No: it is kept immediately.','A person on a bicycle overlaps the bicycle; both are real objects.','When no boxes are left.'],
 transition:'Run it on the dog’s ten boxes.'});
S_('nms-dog','nms','NMS on the dog’s ten boxes',{builds:4,
 body:`<div class="table-sm tight">${table(['rank','cell','score','IoU with the kept box','fate'],dogTen.map((k,i)=>[String(i+1),`(${k.row}, ${k.col})`,num(k.score,3),i===0?at(2,'kept box'):at(3,num(k.iou,3)),i===0?at(2,'<span class="hit">keep</span>'):at(4,'<span class="miss">delete (&gt; 0.7)</span>')]))}</div>`,
 lines:['Step 1: the ten boxes sorted by score.','Step 2: keep the top one, cell (9, 19).','Step 3: each other box’s IoU with it. All are above 0.9: these boxes are the same box, drawn by neighbouring cells.','All above the 0.7 threshold: delete all nine. Nothing left for the dog; one dog box remains.'],
 ask:['Which box is kept first?','How similar are the other boxes to it?','Which boxes are deleted?','How many dog boxes remain?'],
 expected:['Cell (9, 19), score 0.889.',`Very: IoU from ${num(Math.min(...dr.removed.map(k=>k.iou)),2)} to ${num(Math.max(...dr.removed.map(k=>k.iou)),2)}.`,'All nine: every IoU is above 0.7.','One.'],
 transition:'All three classes at once.',source:YOLO_SRC});
S_('nms-all','nms','All 31 boxes → 4 detections',{builds:2,
 body:cols(`<div class="state-slot"><div data-only="1">${courtyard(candBoxes(cand.candidates),'Thirty-one candidates before NMS')}</div><div data-only="2">${courtyard(finalBoxes(30),'Four detections after NMS')}</div></div>`,
  stack(p('Before: 31 boxes.'),at(2,p(`After: ${cand.kept.length}. ${cand.kept.map(k=>`${k.name} ${num(k.score,3)}`).join(', ')}.`)),at(2,small('Our eight-line loop keeps exactly what Ultralytics’ own post-processing keeps (checked in scripts/science.py).'))),'1.3fr 1fr'),
 lines:['The same loop runs on every class: 10 cat boxes become one, 10 plant boxes become one.','Four detections: cat, the big potted plant, dog, and a small plant on a finer grid. A fixed 12,600 records became a set of four.'],
 ask:['How many detections remain?','Why does the small plant survive?'],
 expected:['Four.','It is far from every kept box: its IoU with the big plant is 0.'],
 transition:'What does the threshold change?',source:YOLO_SRC});
chap('5.2');
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
 demo:'Notebook part 5 runs this function on the courtyard’s 31 candidates and checks it against torchvision.ops.nms.',
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
 transition:'Why does YOLOv8 have three grids?'});
// ================================================================================================ Part 6
partBreak(6,'scales','Small and large objects: three grids','A 32-pixel cell is coarse for a person 13 pixels wide. YOLOv8 predicts from three grids at once.',[
 'See the range of sizes in one street photo.','Count the cells of the three grids: where 12,600 came from.','Check which grid found each real detection.'],
 {line:'Three grids, three cell sizes, one record format.',ask:'What could go wrong for a 13-pixel-wide person on a 32-pixel grid?',expected:'It is under half a cell; two such people could share one cell, and one cell must describe both.',transition:'Sizes in one photo.'});
chap('6.1');
const SC=S.levels.scale,scBox=n=>S.annotations.scale.filter(x=>x[0]===n).map(x=>x[1]);
const farPed=scBox('person').find(b=>b[2]-b[0]<20),bus=scBox('bus')[0],cyc=scBox('person').find(b=>b[2]-b[0]>20);
S_('sizes','scales','One photo, very different sizes',{builds:2,
 body:cols(photo('scale',W2,H2,gtBox(bus,`bus · ${bus[2]-bus[0]} px wide`,{size:30})+gtBox(cyc,'',{w:4})+pill(cyc[0],cyc[1],`${cyc[2]-cyc[0]} px`,{fill:COL.target,size:28})+gtBox(farPed,'',{w:4})+pill(farPed[0]-4,farPed[1],`${farPed[2]-farPed[0]} px`,{fill:COL.target,size:28,anchor:'end'})+gat(2,gridLines(W2,H2,32,{op:.6})),'A bus, a cyclist and a far pedestrian',{view:[220,150,1060,470]}),
  stack(p(`The bus is ${bus[2]-bus[0]} px wide; the far pedestrian ${farPed[2]-farPed[0]} px.`),at(2,p('On a 32-px grid the pedestrian is under half a cell. Two such people side by side would put both centres in one cell, which can describe only one of them.'))),'1.5fr 1fr'),
 lines:['The same street, three objects: a bus 502 px wide, a cyclist 48 px, a pedestrian 13 px far down the road.','Draw the 32-px grid. The bus spans 16 cells; the pedestrian sits inside one. A coarse grid suits big objects; small ones need finer cells.'],
 ask:['How many times wider is the bus than the far pedestrian?','What is the problem for small objects on a coarse grid?'],
 expected:['About 39 times.','A cell may contain several small objects but writes one record; and its features are dominated by a large surrounding region.'],
 transition:'Three grids.',source:PHOTO_SRC});
const tri=(n,s,W_,H_)=>`${n}: ${W_/s} × ${H_/s} = ${big(W_*H_/s/s)}`;
S_('three-grids','scales','Three grids: cells of 8, 16 and 32 pixels',{builds:3,
 body:stack(`<div class="table-sm">${table(['grid (cell size)','courtyard, 960 × 640','street, 1280 × 704','built from'],[
   ['8 px',`120 × 80 = ${big(9600)}`,`160 × 88 = ${big(14080)}`,'early layers: sharp, local'],
   ['16 px',`60 × 40 = ${big(2400)}`,`80 × 44 = ${big(3520)}`,'middle layers'],
   ['32 px',`30 × 20 = ${big(600)}`,`40 × 22 = ${big(880)}`,'deep layers: wide view'],
   ['<b>all</b>',at(2,`<b>${big(12600)}</b>`),at(2,`<b>${big(18480)}</b>`),'']])}</div>`,
  at(3,p('Every cell of every grid writes the same 84-number record. The fine grid catches small objects; the coarse grid sees enough to box a bus.'))),
 lines:['YOLOv8 reads three feature maps from different depths of the CNN: cells of 8, 16 and 32 pixels.','Add them up: 12,600 for the courtyard, the number we decoded in Part 4. A bigger photo gets more cells: 18,480 for the street.','Each grid writes the same kind of record. Feature pyramids (FPN, 2017) mix deep and early features so even the fine grid knows what it is looking at.'],
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
 transition:'Part 7: the other answer, DETR.',source:YOLO_SRC});

// ================================================================================================ Part 7
partBreak(7,'detr','DETR: a fixed set of slots, matched to objects','Back to Part 3’s slots: make 100 of them, let each read the whole image, and match slots to objects before the loss.',[
 'Follow a photo through DETR to 100 predictions, and see where two queries looked.','Watch duplicates vanish inside the decoder.','Build the matching cost one cell at a time, solve the matching, and compute the loss.'],
 {line:'DETR: 100 slots that read the image with attention; matching instead of NMS.',ask:'What were the two problems of K slots in Part 3?',expected:'Too few slots for some photos, and no rule for which slot answers for which object.',transition:'Fix them one at a time.'});
chap('7.1');
const D=S.detr;
S_('slots-again','detr','Back to the slots, with three changes',{builds:3,
 body:`<ol class="steps">${['<b>100 slots</b>, more than almost any photo has objects; each may say “no object”.','<b>Each slot reads the whole image</b> with cross-attention, as the VLM lectures did.','<b>Match before the loss</b>: pair slots with objects so that the total cost is lowest.'].map((x,i)=>`<li data-at="${i+1}">${x}</li>`).join('')}</ol>`,
 lines:['Problem 1 was capacity: use K = 100 slots. Unused slots predict a 92nd class, “no object”.','A slot needs a way to look at the photo: give it a learned query vector that attends to the image features.','Problem 2 was order: before computing the loss, find the cheapest one-to-one pairing of slots and objects. Order in the annotation list stops mattering.'],
 ask:['How many slots does DETR use?','How does a slot see the image?','How is the order problem solved?'],
 expected:['100.','Cross-attention from its query to the image features.','By matching slots to objects before the loss.'],
 transition:'Follow a photo through DETR.'});
S_('detr-pipeline','detr','DETR, from photo to 100 predictions',{builds:4,
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
S_('queries','detr','A query is learned once and reused for every photo',{builds:2,
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
S_('detr-output','detr','DETR on the courtyard: 100 slots, most of them empty',{builds:3,
 body:cols(stack(qStrip(),small(`Grey: “no object”. ${D.n_none_90} of the 100 slots give it more than 0.9.`),
   at(2,`<div class="table-sm xtight">${table(['query','class','p','p(no object)'],detrObjs.slice(0,5).map(q=>[String(q.q),q.name,num(q.p,3),num(q.p_none,3)]))}</div>`)),
  stack(at(3,courtyard(detrObjs.filter(q=>q.p>=0.9).map(q=>prBox(dBox(q),`q${q.q} ${q.name==='potted plant'?'plant':q.name}`,{size:28,w:4,fill:qcol(q.name),maxX:W})).join(''),'DETR’s confident predictions on the courtyard',{cls:'short'}))),'1fr 1.25fr'),
 lines:['One square per query, numbered 0 to 99. Coloured if the query names an object; grey if it says “no object”.','The busy ones: query 71 says dog (0.999), query 61 cat (0.999), others plants. Their numbers are arbitrary: training decided which slot does what.','Their boxes: one per object. No duplicates to remove, and no NMS.'],
 ask:['How many queries say “no object”?','Which query found the dog?','Does DETR need NMS here?'],
 expected:[`${D.n_none_90} with probability above 0.9.`,'Query 71.','No: each object has one query.'],
 transition:'Where did query 71 look?',source:DETR_SRC});
const attnHeat=q=>{const A=D.attention[q],mx=Math.max(...A.flat()),cs=W/1200*32;let g='';A.forEach((row,r)=>row.forEach((v,c)=>{const o=v/mx;if(o>.06)g+=`<rect x="${(c*cs).toFixed(1)}" y="${(r*cs).toFixed(1)}" width="${cs.toFixed(1)}" height="${cs.toFixed(1)}" fill="${COL.loss}" fill-opacity="${Math.min(.85,o).toFixed(2)}"/>`;}));return `<rect width="${W}" height="${H}" fill="#000" fill-opacity=".35"/>`+g;};
S_('detr-attention','detr','Where two queries looked',{builds:2,
 body:`<div class="image-pair">${at(1,`<figure>${courtyard(attnHeat('71'),'Cross-attention of query 71, the dog')}<figcaption>query 71 → dog</figcaption></figure>`)}${at(2,`<figure>${courtyard(attnHeat('61'),'Cross-attention of query 61, the cat')}<figcaption>query 61 → cat</figcaption></figure>`)}</div>`,
 lines:['Query 71’s cross-attention in the last decoder layer, averaged over its 8 heads: where its weights over the 950 tokens went. Bright = much attention.','Query 61, the cat: its attention sits on the cat. Each query attends mostly to the parts of the photo that fix its box: the extremities more than the middle.'],
 ask:['Where does query 71 attend?','Why the edges and extremities rather than the middle?'],
 expected:['On the dog.','The box needs the extreme points (head, paws, tail); the class is already clear from the encoder’s context.'],
 point:'Carion et al. (2020) report the same: decoder attention highlights object extremities.',
 transition:'How do duplicates disappear without NMS?',source:DETR_SRC});
const DL=S.detr_layers,lq=(i,k)=>DL.trace[k][i],px2=b=>[(b[0]-b[2]/2)*W2,(b[1]-b[3]/2)*H2,(b[0]+b[2]/2)*W2,(b[1]+b[3]/2)*H2];
const layerFig=i=>photo('two-dogs',W2,H2,prBox(px2(lq(i,0).box),'',{w:5})+pill(px2(lq(i,0).box)[0],px2(lq(i,0).box)[1],`q90 plant ${num(lq(i,0).p,3)}`,{fill:COL.guess,size:24})+(lq(i,1).p_none<.5?prBox(px2(lq(i,1).box),'',{w:5,fill:COL.amber,dash:'10 6'})+pill(px2(lq(i,1).box)[0],px2(lq(i,1).box)[3]+2,`q25 plant ${num(lq(i,1).p,3)}`,{fill:COL.amber,size:24,below:true}):pill(px2(lq(i,1).box)[0],px2(lq(i,1).box)[3]+2,`q25 no object ${num(lq(i,1).p_none,3)}`,{fill:MUTED,size:24,below:true})),`Queries 90 and 25 after decoder layer ${i+1}`,{view:[600,110,420,330]});
S_('detr-layers','detr','Duplicates disappear inside the decoder',{builds:3,
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
chap('7.2');
const MT=S.match;
S_('match-why','detr','Training: which prediction should learn which dog?',{builds:2,
 body:cols(photo('two-dogs',W2,H2,gtBox(two[0][1],'left dog',{size:40,w:6})+gtBox(two[1][1],'right dog',{size:40,w:6})),
  stack(p('Two targets. 100 predictions. Part 3: comparing slot k with list entry k punished a correct answer.'),at(2,p('Instead: give every (prediction, target) pair a <b>cost</b>, then choose the one-to-one pairing with the lowest total.'))),'1.3fr 1fr'),
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
S_('giou','detr','One more measure: generalised IoU',{builds:3,
 body:cols(giouFig(),stack(ps('Any two boxes that do not touch have IoU 0: a near miss scores the same as a far miss.'),
  at(2,`<div class="eq-sm">${eq(R`\mathrm{GIoU}=\mathrm{IoU}-\frac{\text{area}(C)-\text{area}(A\cup B)}{\text{area}(C)}`)}</div>`),at(2,small('C: the smallest box enclosing both. The emptier C is, the lower the score; GIoU runs from −1 to 1.')),
  at(3,ps(`DETR’s right-dog query against the left dog: IoU 0, GIoU ${num(MT.giou[0][1],3)}.`))),'1.15fr 1fr'),
 lines:['IoU cannot tell a near miss from a far miss: both are 0. A loss built on IoU gives no direction to move.','Generalised IoU subtracts the empty fraction of the smallest box C that encloses both. Far apart, C is mostly empty and GIoU approaches −1.',`Real example: query 98 predicts the right dog; against the left dog its IoU is 0 but its GIoU is ${num(MT.giou[0][1],3)}.`],
 ask:['What is the IoU of any two non-overlapping boxes?','What does the second term measure?','What is GIoU for identical boxes?'],
 expected:['0.','How much of the enclosing box is empty.','1: IoU is 1 and C equals the union.'],
 point:'GIoU: Rezatofighi et al., 2019. The two example values on the left are for the drawn boxes.',
 transition:'The cost of one pairing.'});
const c00={cls:MT.class[0][0],l1:MT.l1[0][0],g:MT.giou[0][0],t:MT.total[0][0]};
S_('cost-one','detr','The cost of one pairing: query 61 and the left dog',{builds:4,
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
S_('cost-matrix','detr','Fill the table: the cost of every pairing',{builds:3,
 body:stack(`<div class="state-slot">${[1,2,3].map(b=>`<div data-only="${b}"><div class="table-sm">${table(['',...qh],MT.targets.map((t,i)=>[t,...MT.queries.map((_,j)=>i<b?costCell(i,j,b):'?')]))}</div></div>`).join('')}</div>`,
  at(3,p(`Cheapest pairing: left dog ↔ q61, right dog ↔ q98, total ${num(MT.total[0][0]+MT.total[1][1],2)}. Every other query is matched to nothing and learns “no object”.`)),
  at(3,small(`q2’s box also sits on the left dog (cost ${num(MT.total[0][3],2)}), but it says “no object”: the class term makes q61 cheaper.`))),
 lines:['Row 1: the left dog against four of the queries. q61 is cheapest; q2 is second: its box is on the left dog too.','Row 2: the right dog. q98 is cheapest.','Choose one query per dog with the lowest total: q61 and q98. Here each dog’s cheapest query is different, so the choice is easy. It is not always.'],
 ask:['Which query is cheapest for the left dog?','For the right dog?','Which queries learn “no object”?'],
 expected:[`q61, ${num(MT.total[0][0],2)}.`,`q98, ${num(MT.total[1][1],2)}.`,'All 98 others, including q2 and q90.'],
 transition:'When is the choice not easy?',source:DETR_SRC});
const GR=S.greedy;
S_('greedy','detr','Why not let each object grab its cheapest slot?',{builds:3,
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
S_('match-loss','detr','After matching: the loss',{builds:3,
 body:sm(at(1,eq(R`\text{q61}\to\text{left dog: }\ -\log ${num(MT.q_p[0],3)}+5\times${num(mp.l1,3)}+2\times(1-${num(mp.giou,3)})`)),
  at(1,eq(R`=${num(mp.ce,3)}+${num(5*mp.l1,3)}+${num(2*mp.giou_loss,3)}=\lcol{${num(mp.ce+5*mp.l1+2*mp.giou_loss,3)}}`)),
  at(2,eq(R`\text{q2}\to\text{no object: }\ 0.1\times(-\log ${num(ML.unmatched.p_none,3)})=${num(-0.1*Math.log(ML.unmatched.p_none),4)}`)),
  at(3,eq(R`\text{q90 (a plant)}\to\text{no object: }\ 0.1\times(-\log ${num(ML.unmatched_plant.p_none,3)})=\lcol{${num(ML.unmatched_plant.weighted,3)}}`)),
  at(3,small('Our target list holds only the two dogs, so the loss would teach q90 to call the pot nothing. What is annotated decides what is learned; COCO does label potted plants.'))),
 lines:['A matched query learns its object: cross-entropy for the class, plus L1 and 1 − GIoU for the box. q61 is already almost perfect: tiny loss.','An unmatched query learns “no object”, its cross-entropy weighted by 0.1 because most queries are empty. q2 already says no object: almost no loss.',`q90 named a real plant, but plants are not in this target list: it pays ${num(ML.unmatched_plant.weighted,2)} for being right. Annotation policy matters.`],
 ask:['What does a matched query learn?','What does an unmatched query learn, and why the weight 0.1?','Why is q90 penalised?'],
 expected:['Its object’s class and box.','“No object”; 0.1 keeps the ~98 empty queries from dominating.','It found an object the annotation leaves out.'],
 transition:'Why does this remove duplicates?',source:DETR_SRC});
chap('7.3');
S_('why-no-nms','detr','Why DETR needs no NMS',{builds:2,
 body:`<div class="compare">${at(1,`<div class="b"><h3>DETR · one-to-one</h3><ul><li>Each object is matched to exactly one query</li><li>A second query on the same object is trained to say “no object”</li><li>So the trained network outputs one box per object</li></ul></div>`)}${at(2,`<div class="a"><h3>YOLO · one-to-many</h3><ul><li>About ten cells per object are trained as positives</li><li>All ten learn to fire</li><li>So NMS must delete nine of them</li></ul></div>`)}</div>`,
 lines:['Matching is one-to-one: in every training step, a duplicate query is told “no object”. The network learns not to duplicate, using self-attention among queries.','The dense detector trained ten cells per object on purpose (more positives, more signal) and pays for it with NMS.'],
 ask:['What happens in training to a second query that predicts an already-matched object?','Why does YOLO train several cells per object?'],
 expected:['It is matched to nothing, so its target is “no object”.','More positives give more training signal and robustness; the price is duplicates.'],
 point:'YOLOv10 (2024) trains both: a one-to-many head for signal and a one-to-one head used at test time, so it too runs without NMS.',
 transition:'DETR in code.'});
S_('detr-code','detr','DETR in code: matching, then inference',{builds:2,
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
 demo:'Notebook part 7 runs DETR on the two-dogs photo, builds this cost matrix and checks the matching against brute force.',
 transition:'Two answers side by side.'});
S_('two-answers','detr','Two answers to one question',{builds:2,
 body:stack(`<div class="table-sm tight">${table(['','dense (YOLOv8)','set (DETR)'],[
  ['outputs','one record per cell: 12,600','100 learned slots'],
  ['who answers for an object','cells near it, by place','the matched query'],
  ['training targets','one-to-many: ~10 cells','one-to-one: Hungarian matching'],
  ['at test time','score filter + NMS','threshold only'],
  ['on our courtyard','4 detections','5 objects at p ≥ 0.9']])}</div>`,
  at(2,p('Both turn a fixed-size output into a set of any size: by scores and NMS, or by “no object” and matching.'))),
 lines:['Side by side. The structural difference is how outputs are assigned to objects in training: by place, several per object; or by matching, one per object.','Both solve the lecture’s question with a fixed tensor plus a way to say “nothing here”.'],
 ask:['Where does each method decide which output answers for which object?','What plays the role of “no object” in YOLO?'],
 expected:['YOLO: by cell position in training; DETR: by Hungarian matching in training.','Low class scores, removed by the score filter.'],
 point:'DETR trained for 500 epochs on COCO; Deformable DETR, DINO and RT-DETR made such models faster to train and real-time.',
 transition:'Part 8: how good are they?'});

// ================================================================================================ Part 8
partBreak(8,'eval','Measuring a detector','Compare detections with annotations: decide which are right, then summarise.',[
 'Decide true positive, false positive and miss, on the street photo’s real detections.','Precision and recall at one threshold, then at all of them: walk down a ranked list.','Average precision, mAP, and both detectors on our eight photos.'],
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
S_('precision-recall','eval','Precision and recall',{builds:3,
 body:stack(eq(R`\text{precision}=\frac{\mathrm{TP}}{\mathrm{TP}+\mathrm{FP}}\qquad\qquad \text{recall}=\frac{\mathrm{TP}}{\mathrm{TP}+\mathrm{FN}}`),
  small('Precision: of what we reported, how much was right. Recall: of what was there, how much we found.'),
  at(2,`<div class="table-sm">${table(['keep scores ≥','TP','FP','FN','precision','recall'],[['0.25','4','0','0','4/4 = 1','4/4 = 1'],[at(3,'0.01'),at(3,'4'),at(3,String(ES.rows.length-4)),at(3,'0'),at(3,`4/${ES.rows.length} = ${num(4/ES.rows.length,2)}`),at(3,'4/4 = 1')]])}</div>`)),
 lines:['Two numbers: precision divides by what we reported; recall divides by what was there.','With the usual 0.25 score cut-off, the street photo is perfect: four found, nothing extra.','Keep everything down to 0.01 and the eight windscreen boxes join: recall stays 1, precision drops to 0.33. The threshold trades one for the other.'],
 ask:['What do the two denominators count?','What are precision and recall at 0.25?','What happens at 0.01?'],
 expected:['Precision: all detections reported. Recall: all annotated objects.','Both 1.',`Precision falls to ${num(4/ES.rows.length,2)}; recall stays 1.`],
 transition:'Measure all thresholds at once: rank the detections.'});
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
  at(3,`<div class="table-sm xtight">${table(['our 8 photos, 7 classes, '+S.benchmark.n_gt+' objects','mAP@0.5','AP@[.5:.95]','COCO val (published)'],[['YOLOv8n',num(BY.map50,3),num(BY.map,3),'37.3'],['DETR (ResNet-50)',num(BD.map50,3),num(BD.map,3),'42.0']])}</div>`),
  at(3,small('Eight clean photos are not a benchmark: on COCO’s 5,000 validation photos the order flips.'))),
 lines:['mAP averages AP over classes. COCO goes further and averages over ten IoU thresholds, from loose (0.5) to strict (0.95), which rewards tight boxes.','Raising the IoU threshold turns loose boxes into false positives and their objects into misses: AP can only fall.',`Both detectors on our eight photos: perfect at IoU 0.5; at strict IoU, YOLOv8n ${num(BY.map,2)}, DETR ${num(BD.map,2)}. On COCO’s validation set the published numbers are 37.3 and 42.0.`],
 ask:['What does mAP average over?','Why average over IoU thresholds?','Which detector is better?'],
 expected:['Classes (and, for COCO, IoU thresholds).','To reward boxes that are tight, not just roughly right.','On our 8 easy photos both are perfect at 0.5; on COCO, DETR-R50 scores higher. A handful of photos cannot decide it.'],
 point:'Our numbers come from our own evaluator (scripts/science.py) on our annotations; COCO numbers are from the YOLOv8 and DETR papers.',
 transition:'In code.',source:'Our evaluator on data/annotations.json; COCO numbers: Ultralytics YOLOv8 documentation and Carion et al. (2020).'});
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
S_('summary','wrap','One question, two answers, three matchings',{builds:3,
 body:stack(at(1,p('<b>Question:</b> a fixed-size output must describe a set of any size, in any order.')),
  at(2,`<div class="compare"><div class="a"><h3>Dense: by place</h3><ul><li>A record at every cell of three grids</li><li>Train cells near each object</li><li>Filter by score, NMS</li></ul></div><div class="b"><h3>DETR: by matching</h3><ul><li>100 learned slots read the image</li><li>Hungarian matching, one slot per object</li><li>Threshold; no NMS</li></ul></div></div>`),
  at(3,`<div class="table-sm tight">${table(['matching','pairs','when'],[['assignment','outputs ↔ annotated objects','training'],['NMS','predictions ↔ predictions','test time (dense)'],['evaluation','predictions ↔ annotated objects','measuring']])}</div>`)),
 lines:['The lecture’s question: how can a network with a fixed output return a variable, unordered set?','Two answers: tie outputs to places and clean up with NMS; or keep free slots and match them to objects in training.','And three different matchings that are easy to confuse: assignment in training, NMS between predictions, evaluation against annotations. Each uses IoU.'],
 ask:['State the lecture’s question in one sentence.','How do the two answers differ?','Which matching uses the annotations at test time?'],
 expected:['How a fixed-size output can describe a variable, unordered set.','By place (with NMS) versus by matching (no NMS).','Evaluation, when measuring; at deployment none of them does.'],
 transition:'Next lecture.'});
S_('next','wrap','Next: beyond boxes',{builds:1,
 body:cols(courtyard(masks(),'Masks for the cat and the dog'),stack(p('A box is a rough answer. Next lecture: which pixels belong to each object (masks), keypoints, depth, and boxes found from words: “the dog on the right”.'),
  p('<a href="https://nipunbatra.github.io/attention/beyond-boxes/">Beyond Boxes</a> · <a href="https://nipunbatra.github.io/attention/language-grounded-vision/">Language-grounded vision</a>'),
  p(`Practice: <a href="${COLAB}">the notebook</a> runs every number in this lecture.`)),'1.2fr 1fr'),
 lines:['Boxes are the coarsest description of where an object is. Next: masks, keypoints, and finding objects named in words.'],
 ask:['What does a mask give that a box does not?'],expected:['Exactly which pixels are the object.'],
 transition:'End of the main route.',source:'Masks: YOLOv8n-seg run on the photo (scripts/run_models.py).'});

// ================================================================================================ optional depth
O('opt-yolov1','YOLOv1 (2016): one responsible cell per object',{builds:1,
 body:stack(eq(R`7\times7\ \text{cells}\times(2\times5+20)=7\times7\times30`),p('Each cell: two boxes, each (x, y, w, h, confidence), and one set of 20 class probabilities (PASCAL VOC). Only the cell containing an object’s centre is responsible for it; x, y are offsets inside that cell, w, h fractions of the image.'),small('Confidence was trained toward the IoU between the box and the truth. A cell could hold at most one object’s class.')),
 ask:['Why did YOLOv1 struggle with flocks of birds?'],expected:['Each cell had one class vector: several small objects with centres in one cell could not all be described.']});
O('opt-anchors','Anchors: predict offsets from template boxes',{builds:1,
 body:stack(eq(R`b_x=\sigma(t_x)+c_x,\quad b_y=\sigma(t_y)+c_y,\quad b_w=p_w\,e^{t_w},\quad b_h=p_h\,e^{t_h}`),p('Faster R-CNN, SSD and YOLOv2–v5 place several template boxes (anchors) of chosen sizes and shapes at every cell, and predict small corrections to each. Positives are anchors with high IoU to an object.'),small('Anchor-free detectors (FCOS, YOLOv8) predict distances from the cell centre instead, as in Part 4.')),
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

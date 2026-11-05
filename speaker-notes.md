# Object detection: speaker notes

Planned main route: 130 minutes, including student responses. Optional slides are outside this budget.

## Pacing

| Part | Minutes |
|---|---:|
| Lecture map | 1 |
| Part 1 · Why detect objects? | 12 |
| Part 2 · From one label to a list | 9 |
| Part 3 · Boxes and IoU | 16 |
| Part 4 · One box, then many | 7 |
| Part 5 · A candidate at every place | 32 |
| Part 6 · One box per object: NMS | 16 |
| Part 7 · Three grids for three sizes | 9 |
| Part 8 · Measuring a detector | 24 |
| Wrap-up | 4 |

## title: Object detection: from one label to a set of objects

**Build 1:** The real output of a small detector, YOLOv8n, on today’s photo: four objects, each with a class, a score and a box.

- Ask: What did the detector return for this photo?
- Expected: Four entries: a cat, a dog and two potted plants, each with a box and a score.

**Point here:** Point at one entry at a time: class, score, box. Keep this photo in view; every later number comes from it.

**Transition:** Why would anyone want such a list? Six jobs.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## part-1: Part 1 · Why detect objects?

**Build 1:** Six jobs that need the same kind of answer, and three reasons it is hard to give.

- Ask: Where have you seen a computer draw boxes around things?
- Expected: Phone cameras (faces), driver-assistance demos, traffic cameras, photo apps that find people or pets.

**Transition:** The first job: a street.

## app-road: On the road: who is where?

**Build 1:** A car’s camera sees this campus street.

- Ask: What does the car need to know?
- Expected: Who is on the road, and where each one is.

**Build 2:** YOLOv8n: 4 people, a car, a bicycle and a dog, each boxed and scored. The car acts on this list.

- Ask: What does the detector give it?
- Expected: 7 entries: four people, a car, a bicycle, a dog, each with a box and a score.

**Point here:** IIHS (2022), “Pedestrian crash avoidance systems cut crashes, but not in the dark”. In India, AI traffic cameras flag riders without helmets and triple riding: Kerala installed 726 road cameras, 675 of them AI-capable, in 2023 (The South First).

**Transition:** A crowd.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## app-crowd: In a crowd: how many people?

**Build 1:** A busy campus path. Count the people before the next click.

- Ask: How many people are there?
- Expected: 11.

**Build 2:** YOLOv8n boxes 11 people. The count is the list’s length, and each entry also says where.

- Ask: How does the detector’s answer give the count?
- Expected: It is the number of person entries in the list: 11.

**Point here:** YOLOv8n also boxes 5 bags (backpacks and handbags), not drawn here. Very dense crowds are usually counted by density estimation instead of boxes, because heads hide one another: Maha Kumbh 2025 used AI-enabled CCTV to estimate people per square metre (PIB, 2024).

**Transition:** A camera in the wild.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## app-wild: At a camera trap: which animals walked past?

**Build 1:** A camera trap takes a photo whenever something moves.

- Ask: Which animals are in the photo?
- Expected: A cat, a dog, and a small yellow bird on the branch.

**Build 2:** YOLOv8n: a cat (0.94) and a dog (0.93). Did it find every animal? We come back to this.

- Ask: Did the detector find them all?
- Expected: No: the bird is missing (section 1.3).

**Point here:** YOLOv8n also boxed two potted plants (0.86, 0.84), not drawn: this job ignores them. Celis et al., Ecological Informatics 81 (2024) 102578: 46 cameras in Finnmark and Yamal; manual checking cut to 9.2% and 3.9% of the photos.

**Transition:** A microscope.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## app-cells: Under a microscope: count the cells

**Build 1:** Stained cells under a microscope, photographed for a lab.

- Ask: What would a lab want from this photo?
- Expected: How many cells, where each is, and what type each one is.

**Build 2:** 12 cells. These teal boxes are ours: COCO has no class “cell”, so no detector in this lecture knows one.

- Ask: Who drew these boxes, and why does it matter?
- Expected: We did, from the colours, checked by eye. Such hand-made lists are the training data a cell detector would learn from.

**Point here:** Teal boxes are annotations (made by people); purple boxes are a model’s output. The lecture keeps these colours throughout.

**Transition:** A warehouse.

**Source:** Boxes drawn by us (data/applications.json): COCO has no such class, so no detector here can find it. The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## app-parcel: In a warehouse: where is the parcel?

**Build 1:** A robot arm waits at the end of this conveyor belt.

- Ask: What does the arm need to know?
- Expected: Where the parcel is, and roughly how big.

**Build 2:** One entry: a parcel, 486 × 315 pixels. The arm aims at the box’s centre, the dot.

- Ask: Where should it aim?
- Expected: At the centre of the box, (684, 347.5).

**Transition:** A factory.

**Source:** Boxes drawn by us (data/applications.json): COCO has no such class, so no detector here can find it. The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## app-crack: On a production line: is anything wrong?

**Build 1:** A part fresh from the machine. Look closely.

- Ask: Is anything wrong with the part?
- Expected: A thin crack runs along the top of the arm.

**Build 2:** A hairline crack on the arm, in a box 90 × 72 pixels: the inspector knows exactly where to look.

- Ask: What does the box add to “defective”?
- Expected: Where the defect is: a person can check it, and the factory can see which machine step causes it.

**Transition:** Six jobs side by side.

**Source:** Boxes drawn by us (data/applications.json): COCO has no such class, so no detector here can find it. The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## apps-common: Six jobs, one kind of answer

**Build 1:** Three jobs from everyday photos: 7 objects, 11 people, 2 animals. Purple: a detector’s answer.

- Ask: What do the first three answers have in common?
- Expected: Each is a list of objects, each with a class and a box (and a score).

**Build 2:** Three more: 12 cells, 1 parcel, 1 crack (teal: our annotation). Every answer has the same shape: a list, one entry per object, each a class and a box.

- Ask: What changes from one job to the next, and what stays the same?
- Expected: The classes, the training photos and the length of the list change; the shape of the answer does not.

**Point here:** One kind of model can serve all six jobs: only the class names and the training data change.

**Transition:** What is the list used for?

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json. Cells, parcel and crack: our annotation.

## list-uses: What the list is used for

**Build 1:** Count: the number of entries of a class. Eleven people; twelve cells.

- Ask: How would you count people from the list?
- Expected: Count the person entries.

**Build 2:** Locate: the box says where to act. The arm grips at the parcel’s centre; a car brakes for the person in its lane.

- Ask: What does a robot do with a box?
- Expected: It aims at it: the box gives the position and the size.

**Build 3:** Track: in a video, run the detector on every frame and link each box to the box that overlaps it most in the next frame.

- Ask: How could you follow one cyclist through a video?
- Expected: Detect in every frame and link boxes that overlap most from one frame to the next.

**Build 4:** Crop: cut out each box and pass it to a second model: read a number plate, identify a face, name a cell’s type.

- Ask: Why crop before recognising?
- Expected: The second model then sees one object, large, instead of a whole scene.

**Point here:** Detection is usually the first stage of a pipeline: counting, tracking, grasping or recognising all start from its boxes.

**Transition:** Why is this harder than classification?

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json. Cells and parcel: our annotation.

## hard-sizes: Hard, 1: a bus and a distant person in one photo

**Build 1:** A bus in the foreground of a street photo.

- Ask: How wide is the bus?
- Expected: 502 pixels.

**Build 2:** And a pedestrian far down the same road. A classifier looks for one main thing; a detector must box both, at very different sizes.

- Ask: How much smaller is the pedestrian, and why does it matter?
- Expected: About 39 times narrower: a feature that sees the whole bus is far too coarse for the pedestrian.

**Point here:** Part 7 shows how a detector handles this: predictions from three grids of different cell sizes.

**Transition:** Small objects are easy to miss.

**Source:** Boxes: our annotation (data/annotations.json). The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## hard-small: Hard, 2: small objects are easy to miss

**Build 1:** Back to the camera trap. YOLOv8n reports a cat, a dog and two plants. Where is the bird?

- Ask: Which animal is missing?
- Expected: The bird on the branch.

**Build 2:** Zoom in. One cell boxed the bird almost perfectly but was unsure what it was, so the box was dropped.

- Ask: Did the network fail to see the bird at all?
- Expected: No: it drew a good box (IoU 0.91) but was unsure of the class (0.098).

**Build 3:** With so few pixels the network has little detail to go on, so small objects get low, unsure scores.

- Ask: Why would a small object get a low score?
- Expected: It covers few pixels, so the network has little detail to go on.

**Point here:** Part 8 returns to this bird: lowering the score cut-off finds it.

**Transition:** Objects also overlap.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## hard-overlap: Hard, 3: objects overlap

**Build 1:** A cyclist is two objects in one place: a person box and a bicycle box, one largely on top of the other. Both are correct.

- Ask: How many objects is a cyclist?
- Expected: Two: a person and a bicycle, in nearly the same place.

**Build 2:** Two touching cells: their boxes overlap too. A detector must keep both entries, and yet must not report one object twice.

- Ask: What is the risk when two boxes overlap?
- Expected: A detector might treat them as one object and drop one; or report one object twice.

**Point here:** Overlap returns in Part 6: removing duplicate boxes without removing real neighbours. In Part 3’s measure, the cyclist’s two boxes have IoU 0.34 and the two cells 0.15.

**Transition:** Part 1 in one slide.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json. Cells: our annotation.

## recap-1: Part 1 in one slide

**Build 1:** Next: why a classifier cannot give this list, and what a network would have to output.

- Ask: In one sentence, what does a detector return?
- Expected: A list with one entry per object: its class, its box and a score.

**Point here:** The long tail: Karpathy (Tesla, ScaledML 2020) showed stop signs held by road workers, on school buses and half hidden by leaves; each kind needed its own labelled examples before the detector handled it.

**Transition:** Part 2.

## part-2: Part 2 · From one label to a list

**Build 1:** A classifier gives one label for the whole photo; detection needs one entry per object.

- Ask: What does a classifier output for a photo with two animals?
- Expected: One label (a probability for each class), for the whole photo.

**Transition:** One photo, one label.

## one-label: What is in this photo?

**Build 1:** Look at the photo. In one sentence, what is in it?

- Ask: What is in this photo?
- Expected: A dog and a cat, and some potted plants.

**Build 2:** A classifier answers with one label for the whole photo. ResNet-50, trained on ImageNet: golden retriever, 0.19. Every row is a guess about the same single label.

- Ask: What did the classifier return?
- Expected: One label, golden retriever, with probability 0.19; the other rows are alternatives for the same label.

**Build 3:** The cat appears only as a weak runner-up, tiger cat at 0.013. The answer cannot say “a dog and a cat”, how many, or where.

- Ask: What is missing from its answer?
- Expected: The second animal, the number of animals, and where each one is.

**Point here:** The probabilities are low because ImageNet splits dogs into 118 breeds; the sum over breeds is 0.39.

**Common misconception:** A higher probability for “cat” would not help: a softmax over classes picks one answer for the whole image.

**Transition:** What answer do we want instead?

**Source:** ResNet-50 with torchvision’s IMAGENET1K_V2 weights, run on this photo (scripts/run_models.py).

## want: What we want: a list, one entry per object

**Build 1:** Detection answers with a list. Each entry is one object: a class, and a box around it.

- Ask: What should a detector return?
- Expected: A list of (class, box) entries, one per object.

**Build 2:** First entry: dog. Its box has left edge 407, top 83, right 768 and bottom 588, in pixels.

- Ask: What four numbers fix the dog’s box?
- Expected: Its left, top, right and bottom edges: 407, 83, 768, 588.

**Build 3:** Second entry: cat. Each object gets one entry, so a photo with five objects gets five.

- Ask: How long is the list for this photo?
- Expected: Two entries if we list only animals; COCO’s classes would add the potted plants.

**Point here:** These are our ground-truth boxes. A larger detector proposed them; we checked each one by eye (data/annotations.json).

**Transition:** Detection sits on a ladder of tasks.

**Source:** The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## ladder: Four tasks, four kinds of answer

**Build 1:** Classification: one label for the whole photo.

- Ask: What does classification return?
- Expected: One label.

**Build 2:** Localisation: one object, its label and one box.

- Ask: What does localisation add?
- Expected: One box for one object.

**Build 3:** Detection: every object, each with a class and a box. Today’s task.

- Ask: What does detection add to localisation?
- Expected: Any number of objects.

**Build 4:** Segmentation: which pixels belong to each object. The masks here are from a real YOLOv8n-seg run; this is next lecture.

- Ask: What would segmentation add to detection?
- Expected: A pixel mask instead of a box.

**Transition:** How long is the list?

**Source:** Masks: YOLOv8n-seg run on the photo (scripts/run_models.py). The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## how-many: The number of objects changes from photo to photo

**Build 1:** One cat: a list of one.

- Ask: How long is this answer?
- Expected: One.

**Build 2:** Two dogs: a list of two.

- Ask: And this one?
- Expected: Two.

**Build 3:** A street: seven.

- Ask: And here?
- Expected: Seven.

**Build 4:** A busy path: eleven people. The length of the answer depends on the photo.

- Ask: What does this mean for the network’s output?
- Expected: The output must be able to hold one object, or eleven, or none.

**Point here:** Every box here is YOLOv8n’s, after the clean-up step of Part 6. The crowd photo also has bags, not boxed here.

**Transition:** And the list has no natural order.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## no-order: A list with no order: a set

**Build 1:** Number the two dogs: left one first.

- Ask: Which dog is number 1?
- Expected: Neither: any order is correct.

**Build 2:** Or right one first. Both lists describe the same scene: the answer is a set of N (class, box) pairs, N varies, and order means nothing.

- Ask: What must stay together when we reorder?
- Expected: Each class with its own box.

**Point here:** Keep this photo: in Part 4 the order causes a real problem for the loss.

**Transition:** Now compare with what a network outputs.

**Source:** The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## fixed-shape: A network’s output has a fixed shape

**Build 1:** A classifier’s last layer always has the same number of outputs: 1,000 for ImageNet, for every photo.

- Ask: How many numbers does an ImageNet classifier output for a photo with two animals?
- Expected: 1,000: the same as for any photo.

**Build 2:** We need a list whose length changes with the photo, and whose order means nothing.

- Ask: How many entries do we need for the crowd photo?
- Expected: Eleven, for the people alone.

**Build 3:** That is the question of the lecture.

- Ask: What two properties of the answer clash with a fixed output?
- Expected: Its length varies and it has no order.

**Point here:** CS231n (Stanford, 2016 and 2017) frames detection the same way: one object needs 4 numbers, two need 8, four need 16, so detection needs a variable-sized output.

**Transition:** The route through the rest of the lecture.

## route: Today’s route: build a detector step by step

**Build 1:** First the tools; then a network that outputs boxes, to see where a fixed output breaks.

- Ask: What tools will every later part need?
- Expected: A box format and an overlap measure (IoU).

**Build 2:** Then YOLO’s answer: a candidate at every place, cleaned up by NMS, at three sizes; and how to measure it.

- Ask: How will the network’s fixed output turn into a list of any length?
- Expected: Every place writes a candidate; a score filter and NMS keep one box per object, so the list’s length is decided after the network.

**Point here:** DETR, the set-prediction answer, is in Appendix A: open the deck with ?all, or read it in the reading view.

**Transition:** Part 3: boxes and IoU.

## part-3: Part 3 · Describe a box, compare two boxes

**Build 1:** Two tools: four numbers for a box, and IoU to compare two boxes.

- Ask: Why do we need a way to compare two boxes?
- Expected: To score predictions against annotations: for the loss, for removing duplicates, and for evaluation.

**Transition:** Positions in a photo.

## pixels: Positions in a photo: pixels from the top-left corner

**Build 1:** Positions are counted in pixels from the top-left corner. Unlike on a school graph, y grows downwards.

- Ask: Where is the origin, and which way does y grow?
- Expected: Top-left; y grows downwards, unlike a school graph.

**Build 2:** Two corners of the dog’s box. The bottom-right one has the larger y, because it is lower in the photo.

- Ask: Which corner has the larger y?
- Expected: The bottom-right corner: it is lower in the photo.

**Transition:** Two corners are four numbers: a box.

**Source:** The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## corners: A box is four numbers: its left, top, right and bottom edges

**Build 1:** A box is the region between two vertical and two horizontal lines. Draw them one at a time.

- Ask: How many numbers fix an axis-aligned box?
- Expected: Four.

**Build 2:** Left edge: every point of the dog has x at least 407.

- Ask: What is x₁?
- Expected: 407

**Build 3:** Top edge: y at least 83, the tips of the ears.

- Ask: What is y₁?
- Expected: 83

**Build 4:** Right edge: x at most 768, the nose.

- Ask: What is x₂?
- Expected: 768

**Build 5:** Bottom edge: y at most 588, the paws. Four numbers: (407, 83, 768, 588).

- Ask: What is y₂, and which part of the dog sets it?
- Expected: 588, the paws.

**Point here:** Axis-aligned boxes only: a rotated object still gets an upright box.

**Transition:** The same box in a second format.

**Source:** The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## width-height: The box’s size: width and height

**Build 1:** Width: the right edge minus the left edge, 768 − 407 = 361 pixels.

- Ask: What is the width?
- Expected: 361 pixels.

**Build 2:** Height: the bottom minus the top, 588 − 83 = 505. Bottom minus top, because y grows downwards.

- Ask: What is the height?
- Expected: 505 pixels.

**Common misconception:** w and h are the full width and height, not half of them.

**Transition:** Where is the middle of the box?

**Source:** The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## centre: The same box as a centre and a size

**Build 1:** The centre is halfway across and halfway down: start at the left edge and add half the width; start at the top and add half the height.

- Ask: Where is the centre?
- Expected: (587.5, 335.5).

**Build 2:** Same box, second format: centre (587.5, 335.5), size 361 × 505. Either format can be computed from the other.

- Ask: How would you get x₁ back from the centre format?
- Expected: x₁ = c_x − w/2 = 587.5 − 180.5 = 407.

**Transition:** Pixels depend on the photo’s size.

**Source:** The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## normalised: Divide by the photo’s size: numbers between 0 and 1

**Build 1:** Divide horizontal numbers by the photo’s width, vertical ones by its height.

- Ask: What do we divide c_x by? And h?
- Expected: c_x by the width W; h by the height H.

**Build 2:** The dog: (0.612, 0.524, 0.376, 0.789). Every number is between 0 and 1.

- Ask: What does 0.789 say about the dog?
- Expected: Its box covers 79% of the photo’s height.

**Build 3:** These numbers survive resizing, which is why label files and many networks use them.

- Ask: Why prefer normalised numbers?
- Expected: They do not depend on the photo’s resolution.

**Transition:** What a labelled photo looks like on disk.

## label-file: A labelled photo on disk: one line per object

**Build 1:** A training photo is stored with a small text file: one line per object. This is the YOLO format, for our two annotated animals.

- Ask: How many lines does this photo’s label file have?
- Expected: Two: one per annotated object.

**Build 2:** A class number (COCO counts from 0: 15 is cat, 16 is dog), then the normalised centre and size. A detector learns to write these lines.

- Ask: What is the first number on each line?
- Expected: The class index: 16 for dog, 15 for cat in COCO’s list of 80.

**Point here:** Formats differ: COCO json stores (x, y, w, h) from the top-left corner in pixels; torchvision uses pixel corners. A swapped format still trains, badly: draw a few labels on their photos before training (Appendix B). Karpathy’s first step for any network is to look hard at the data (A Recipe for Training Neural Networks, 2019). COCO, YOLOv8n’s training set: 80 categories, over 200,000 labelled images, 1.5 million labelled objects.

**Transition:** Now compare two boxes.

**Source:** Our annotation of the photo (data/annotations.json), written in the YOLO label format.

## compare: Two boxes for one dog: how well do they agree?

**Build 1:** Teal is our box for the dog. Purple is a guess, moved 60 px right and 40 px down. How good is the guess?

- Ask: Is the purple box a good guess?
- Expected: Roughly: it covers most of the dog but misses part of it.

**Build 2:** One idea: measure how far apart the centres are. Here 72 px. Is that a lot?

- Ask: How far apart are the centres?
- Expected: √(60² + 40²) ≈ 72 pixels.

**Transition:** Is 72 px a lot? It depends on the box.

**Source:** The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## compare-small: The same slip on a small object

**Build 1:** A person far down the street: 18 pixels wide.

- Ask: How wide is this person?
- Expected: 18 pixels.

**Build 2:** The same 72-pixel slip misses the person entirely. A small error for the dog is a miss here, so compare overlap instead of distance.

- Ask: Why is centre distance a poor score?
- Expected: It ignores the box’s size: the same distance is small for a large box and fatal for a small one.

**Transition:** Compare the areas instead.

**Source:** The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## iou-def: Intersection over union (IoU)

**Build 1:** The intersection: the region inside both boxes.

- Ask: What is the intersection?
- Expected: The overlap: area inside both.

**Build 2:** The union: the region inside either box.

- Ask: What is the union?
- Expected: Everything inside at least one box.

**Build 3:** IoU divides the first by the second. It is a fraction of area, so it does not care how big the boxes are.

- Ask: What is IoU when the two boxes are the same? When they are apart?
- Expected: 1 and 0.

**Transition:** Compute it for the dog and the guess.

## iou-overlap: IoU, step 1: the overlap rectangle

**Build 1:** The overlap starts where both boxes have started: the larger of the two left edges.

- Ask: Why the larger of the two left edges?
- Expected: A point is in both boxes only if it is right of both left edges.

**Build 2:** Likewise its top is the larger of the two tops.

- Ask: What is the top of the overlap?
- Expected: 123

**Build 3:** It ends where the first box ends: the smaller right edge and the smaller bottom edge. The shaded rectangle is the overlap.

- Ask: Why the smaller right edge?
- Expected: A point must be left of both right edges.

**Transition:** Next, its width, height and area.

**Source:** The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## iou-overlap-area: IoU, step 2: the overlap’s area

**Build 1:** Measure the overlap the way we measured the dog’s box. Width first: its right edge minus its left edge.

- Ask: How wide is the overlap?
- Expected: 768 − 467 = 301 pixels.

**Build 2:** Then the height: bottom minus top. A negative width or height would mean the boxes do not touch, and the overlap is 0.

- Ask: How tall is the overlap?
- Expected: 588 − 123 = 465 pixels.

**Build 3:** So the two boxes share 139,965 square pixels. This is the top of the IoU fraction.

- Ask: What is the overlap’s area?
- Expected: 301 × 465 = 139,965 px².

**Common misconception:** Clamp the width and height at zero: two boxes far apart would otherwise give a “negative overlap” whose product can be positive.

**Transition:** Now the union.

**Source:** The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## iou-union: IoU, step 3: the union, then the ratio

**Build 1:** Each box’s own area. The guess has the same size as our box; it is only moved.

- Ask: What is each area?
- Expected: 182,305 px² each.

**Build 2:** Adding the two areas counts the overlap twice, so subtract it once.

- Ask: Why subtract the overlap?
- Expected: It was counted in both areas.

**Build 3:** IoU = 0.623. A move of 60 px right and 40 px down cost more than a third of the score.

- Ask: What is the IoU?
- Expected: 0.623

**Transition:** What do different IoU values look like?

## iou-feel: What IoU values look like

**Build 1:** The guess slides sideways. At 0.9 the boxes nearly agree; at 0.5 the guess has moved a third of the dog’s width; at 0.3, half of it.

- Ask: Which of these would you accept as finding the dog?
- Expected: Most people accept 0.7 and reject 0.3; 0.5 is the usual cut-off.

**Build 2:** Most benchmarks call IoU ≥ 0.5 a hit. A trained detector does much better on this dog: 0.983.

- Ask: How does a trained detector compare?
- Expected: Its box has IoU 0.983.

**Point here:** For a sideways move s of a box of width w, IoU = (w − s)/(w + s): IoU 0.5 needs s = w/3.

**Transition:** Try it yourself.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## iou-play: Try it: drag a box over the dog

**Build 1:** Drag the purple box. Can you find a box with IoU 0.5 that looks good? One with IoU 0.7 that looks bad? The two lower buttons show one of each.

- Ask: Which box scores about 0.5 yet looks fine, and which scores 0.7 yet looks wrong?
- Expected: A loose box round the whole dog, twice its area: IoU 0.50. A snug box with the head cut off: IoU 0.70. IoU counts pixels; it does not know the head matters.

**Point here:** Shrink the box inside the dog: IoU falls even though every purple pixel is on the dog. IoU punishes too small as much as too big. “Snap onto the dog” gives IoU 1.

**Transition:** In code, IoU is computed for many pairs at once.

## iou-code: IoU in code: every pair at once

**Build 1:** IoU for two lists of boxes in corner format: N boxes in a, M in b. We try it on one pair, our box and the guess.

- Ask: What shapes do a and b have?
- Expected: (N, 4) and (M, 4): one row of corners per box.

**Build 2:** Line 2 is step 1’s max: the larger of the two top-left corners. The None in a[:, None] lets every box in a meet every box in b.

- Ask: Why max for the top-left corner?
- Expected: A point in both boxes is right of both left edges and below both tops.

**Build 3:** Line 3 takes the smaller of the two bottom-right corners.

- Ask: Why min for the bottom-right?
- Expected: It must also be left of both right edges and above both bottoms.

**Build 4:** Subtract the corners for the width and height, set a negative one to 0, and multiply: the overlap.

- Ask: What does clamp(min=0) do?
- Expected: It sets a negative width or height to 0, so boxes that do not touch have overlap 0.

**Build 5:** Each box’s own area, the same way: bottom-right minus top-left, multiplied.

- Ask: What are the two areas here?
- Expected: 182,305 px² each: 361 × 505.

**Build 6:** The union, as in step 3: both areas added, minus the overlap they both contain.

- Ask: Why subtract inter?
- Expected: The overlap lies inside both boxes, so adding the two areas counts it twice.

**Build 7:** Divide: 139,965 / 224,645 = 0.623.

- Ask: What does it return for our pair?
- Expected: 0.623

**Build 8:** Run it on our pair: 0.6230, as by hand. With 31 boxes in a and 2 in b, it returns a 31 × 2 matrix: every pair at once.

- Ask: What shape does box_iou return for 31 boxes against 2?
- Expected: (31, 2): every pair.

**Point here:** torchvision.ops.box_iou does the same, down to its union line, area1[:, None] + area2 - inter. Broadcasting does the pairing: (N, 1, 2) against (M, 2) gives (N, M, 2).

**Notebook:** Notebook part 3 runs box_iou on the two boxes and checks it against torchvision.ops.box_iou.

**Transition:** Part 3 in one slide.

**Source:** The two boxes from step 1: our annotation of the dog and the guess moved 60 px right and 40 px down.

## recap-3: Part 3 in one slide

**Build 1:** Next: ask a network for one box, then several, and see where it breaks.

- Ask: What is the IoU of two identical boxes, and of two boxes that do not touch?
- Expected: 1 and 0.

**Transition:** Part 4.

## part-4: Part 4 · One box is easy; several are not

**Build 1:** One object is easy: a classifier with four more outputs. Two objects show why detection needs more than that.

- Ask: What could go wrong with two objects and one box output?
- Expected: The network cannot know which object to describe; it may average them.

**Transition:** One object first.

## one-object: One object: a box head beside the class head

**Build 1:** Start from a classifier: a CNN turns the photo into one feature vector, and a layer turns that into class scores.

- Ask: What does the box head output?
- Expected: Four numbers: the box’s centre and size, b_x, b_y, b_w, b_h.

**Build 2:** Add a second small layer on the same vector: four numbers for the box.

- Ask: Which part is shared?
- Expected: The CNN and its feature vector.

**Build 3:** Train both at once, comparing each output with the annotation.

- Ask: What could the box loss be?
- Expected: Any distance between the four predicted and four true numbers, such as the sum of absolute differences.

**Transition:** What exactly should the network learn to write?

## target-y: Write the answer as numbers: the target for one photo

**Build 1:** The answer as numbers: object? 1, then the box as fractions of the photo (0 at the top-left, 1 at the bottom-right), then cat 1, dog 0.

- Ask: What are the seven target numbers for the cat photo?
- Expected: 1; then about (0.67, 0.53, 0.32, 0.64); then cat 1, dog 0.

**Build 2:** A photo of empty floor: object? is 0. The box and the class have no right answer, so we write “?”: don’t care.

- Ask: What should the box be for a photo with no object?
- Expected: Nothing: there is no box, so we do not care what the network writes there.

**Build 3:** Only entries with a right answer are learned: for the floor, just object?.

- Ask: Which entries does the loss use for the floor photo?
- Expected: Only “object?”, with target 0.

**Point here:** This is how Andrew Ng introduces localisation (Deep Learning Specialization, Course 4, Week 3): y = (p_c, b_x, b_y, b_h, b_w, c_1, c_2, c_3), with “?” for every entry after p_c = 0.

**Transition:** The loss: compare where it counts.

**Source:** Our annotation of the single-cat photo (data/annotations.json). The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## loss-y: The loss: compare only where it counts

**Build 1:** When there is an object, all seven outputs are compared with the target. The loss adds up the squared differences.

- Ask: Which entries count for the cat photo?
- Expected: All seven.

**Build 2:** When there is none, only object? is compared. The “?” entries are skipped: whatever the network writes there costs nothing.

- Ask: Which entries count for the empty floor?
- Expected: Only object?.

**Build 3:** Real detectors pick a better loss for each kind of entry, but the rule stays the same: skip the “?”.

- Ask: What does a real detector use for the class entries?
- Expected: Cross-entropy, as in classification.

**Point here:** Ng (Course 4, Week 3, Object Localization) uses squared error in both cases for simplicity, then says that in practice the classes use log-likelihood, p_c a logistic loss, and the box squared error.

**Transition:** Now two animals.

## two-objects: Two animals, one box: which one should it draw?

**Build 1:** One box head, two animals. Which should it draw?

- Ask: Which animal should the single box describe?
- Expected: There is no right answer: the task is ill-posed.

**Build 2:** If some annotations list the dog first and some the cat, a squared error is smallest for the average of the two boxes: the network learns to hedge.

- Ask: What does a squared-error loss learn when the target flips between two boxes?
- Expected: The average of the two boxes, the value that minimises the expected squared error.

**Build 3:** A box between two objects describes neither of them.

- Ask: Does the average box find either animal?
- Expected: No: IoU 0.23 and 0.11, both far below 0.5.

**Common misconception:** More training does not fix it: the hedge is the optimum of this loss for this task.

**Transition:** Part 4 in one slide.

**Source:** The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## recap-4: Part 4 in one slide

**Build 1:** Next: give every place in the photo its own record.

- Ask: Why does one record fail for two animals?
- Expected: It can describe only one object, so it hedges between them.

**Transition:** Part 5.

## part-5: Part 5 · A candidate at every place

**Build 1:** Every cell of a grid writes a record. We work out its target and its loss, then read its box back out.

- Ask: If every place in the image has its own output, which outputs should describe the dog?
- Expected: The ones at, or near, the dog’s location.

**Transition:** Start from a tool we already have: a classifier.

## crop-classifier: Start from a tool we have: a classifier for crops

**Build 1:** Three crops cut from the courtyard: a dog, a cat, and floor with nothing on it.

- Ask: What label does each crop get?
- Expected: Dog, cat, nothing.

**Build 2:** It cannot say where anything is in a whole photo. Can we use it to find objects anyway?

- Ask: What can such a classifier not do on its own?
- Expected: Say where objects are in a large photo, or find two of them.

**Point here:** Andrew Ng’s detection lectures start the same way: a car classifier trained on closely cropped car images, then slid over the image.

**Transition:** Slide it over the photo.

**Source:** The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## sliding: Slide the classifier over the photo

**Build 1:** Put a 224 × 224 window in the top-left corner, crop it, and give the crop to the classifier: nothing there.

- Ask: What does the first crop show?
- Expected: Wall and plants: nothing.

**Build 2:** Move the window 32 pixels to the right and classify again: nothing. Two neighbouring crops share 86% of their pixels.

- Ask: How much do two neighbouring crops overlap?
- Expected: They share 192 of their 224 columns: 86% of their pixels.

**Build 3:** Keep sliding, across and then down, a row at a time. When the window sits on the dog, the classifier says dog.

- Ask: Which crops say dog?
- Expected: The ones that sit on the dog.

**Build 4:** One window size gives 24 × 14 = 336 crops, one per dot: 336 full runs of the classifier for one photo.

- Ask: How many crops for one window size?
- Expected: (960 − 224) ÷ 32 + 1 = 24 across, (640 − 224) ÷ 32 + 1 = 14 down: 336.

**Build 5:** Objects come in many sizes, so slide a bigger window too, shrinking each crop to the classifier’s size. Every window size adds another full set of runs.

- Ask: Why slide a bigger window as well?
- Expected: An object can be bigger than the window, like this dog.

**Point here:** Ng’s sliding windows (Course 4, Week 3, “Object Detection”): a car classifier trained on closely cropped images, slid with a stride, then with a medium and a large window, each crop resized to the classifier’s input. He notes the cost: with a ConvNet every crop is a full forward pass. OverFeat (2013) worked this way.

**Transition:** What is wrong with this?

**Source:** The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## sliding-cons: What is wrong with sliding windows?

**Build 1:** First, speed: one window size already means 336 separate runs of the classifier. VGG16 needs 29 s for them on a laptop, for one photo.

- Ask: How many classifier runs does one window size need?
- Expected: 336: one per crop.

**Build 2:** Second, repeated work: two neighbouring crops share 86% of their pixels, yet each crop is processed from scratch.

- Ask: Why is most of that work repeated?
- Expected: Neighbouring crops overlap: 192 of their 224 columns are the same pixels.

**Build 3:** Third, the box is only the window. The window VGG16 is surest about holds just the dog’s head: IoU 0.13 with the dog’s box.

- Ask: Why is the surest window a poor box?
- Expected: The classifier says “dog” for any crop with enough dog in it, and a window cannot change its shape to fit.

**Build 4:** Even the best-placed window reaches IoU 0.28. Fitting better needs more sizes and shapes: more crops still. We want one pass that writes the box.

- Ask: What would fix both problems?
- Expected: One pass over the whole photo that writes the boxes directly.

**Point here:** Ng lists the same costs: every crop is a full ConvNet pass; a coarse stride gives poor boxes and a fine one costs even more; and the best box may not even be square. His convolutional trick for the speed (one pass gives all 336 answers, 0.8 s instead of 29 s) is in Appendix B.

**Transition:** YOLO: grid the photo, and let every cell write a box.

**Source:** VGG16 (torchvision, ImageNet) run on this photo by scripts/run_models.py; timed on a laptop CPU. The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## grid-3x2: YOLO, “You Only Look Once”: cut the photo into cells

**Build 1:** YOLO, “You Only Look Once”: look at the whole photo once, not 336 times. Cut it into cells of 320 × 320 pixels: the photo becomes 3 × 2 cells.

- Ask: What does the name YOLO say?
- Expected: One look: a single pass of one network over the whole photo, instead of a classifier run on 336 crops.

**Build 2:** Each cell gets Part 4’s record, a vector of 7 numbers about that cell: object?, the box b_x, b_y, b_w, b_h, and a cat and a dog score.

- Ask: What does a cell’s record hold?
- Expected: Part 4’s 7 numbers: object?, b_x, b_y, b_w, b_h, cat, dog.

**Build 3:** We fill this 2 × 3 × 7 table twice: from a person’s boxes, the ground truth, and from the network, the prediction. Training makes the two agree.

- Ask: Which two tables will we compare?
- Expected: The ground truth, built from a person’s boxes, and the network’s prediction.

**Point here:** Redmon et al., “You Only Look Once: Unified, Real-Time Object Detection” (2016). The cell size is our choice: 320-pixel cells give a coarse 3 × 2 grid that is easy to draw; YOLOv8 uses 32-pixel cells, 30 × 20 of them on this photo (5.4). Ng draws a 3 × 3 grid and uses 19 × 19 in practice.

**Transition:** Part 1: the ground truth, step by step.

**Source:** The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## gt-annotate: Step 1: a person draws a box around each animal

**Build 1:** The ground truth starts with people, not with the network. A person looks at the photo and marks every object we want found.

- Ask: Who makes the ground truth?
- Expected: People: annotators drawing boxes, before any training.

**Build 2:** First the dog: a tight box around it, (407, 83, 768, 588) in pixels, and its class.

- Ask: What exactly does the person record for the dog?
- Expected: A class, dog, and four numbers: the box’s left, top, right and bottom edges.

**Build 3:** Then the cat: (112, 296, 321, 607). These two boxes and two names are all the person provides.

- Ask: What does the person not have to think about?
- Expected: The grid, the cells and the records: those follow from these boxes by a fixed rule.

**Point here:** These are our own hand-checked boxes for this photo (data/annotations.json). Data sets such as COCO were labelled the same way, by people drawing boxes; Part 3 showed a label file.

**Transition:** Step 2: lay the grid over the boxes.

**Source:** Our annotation of the courtyard photo (data/annotations.json). The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## centre-cell: Step 2: the grid over the boxes, and each box’s centre

**Build 1:** Step 2: lay the grid over the boxes. The dog’s centre, where its box’s diagonals cross, lies in cell (1, 1). That cell will carry the dog’s record.

- Ask: How do we find the dog’s cell?
- Expected: Take the box’s centre, then row ⌊336/320⌋ = 1 and column ⌊588/320⌋ = 1: cell (1, 1).

**Build 2:** Cells (0, 1), (0, 2) and (1, 2) show parts of the dog but not its centre. They will say “no object”, so the dog is written down only once.

- Ask: Why do the other cells showing the dog get “no object”?
- Expected: So that each object is written down exactly once, in one place fixed by where it is.

**Build 3:** The cat’s centre lies in cell (1, 0), which will carry the cat’s record. The other four cells hold no centre.

- Ask: How many cells hold a centre?
- Expected: Two: (1, 1) for the dog and (1, 0) for the cat.

**Point here:** Ng: “assign the object to the grid cell containing its midpoint”; a cell holding parts of both cars but neither midpoint gets p_c = 0. The centre is where the box’s diagonals cross. This is YOLOv1’s rule (Redmon et al., 2016).

**Transition:** Step 3: write each box in its cell’s units.

**Source:** Our annotation of the courtyard photo (data/annotations.json). The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## cell-box: Step 3: the cat’s box, in its cell’s units

**Build 1:** Measure the box inside its cell. The cat’s cell gets its own coordinates: (0, 0) at its top-left corner and (1, 1) at its bottom-right.

- Ask: Where is (0, 0) for this cell, in pixels?
- Expected: At the cell’s top-left corner, pixel (0, 320).

**Build 2:** The cat’s centre is 217 pixels from the cell’s left edge and 132 below its top: b_x ≈ 0.68 and b_y ≈ 0.41 of a cell.

- Ask: Where is the cat’s centre inside its cell?
- Expected: About 0.68 across and 0.41 down.

**Build 3:** The size is counted in cells too. The cat is 209 pixels wide, 0.65 of a cell, and 311 pixels tall, 0.97 of a cell.

- Ask: How big is the cat, in cells?
- Expected: 0.65 of a cell wide, 0.97 tall.

**Build 4:** So the ground truth for cell (1, 0) is object? 1, the box (0.68, 0.41, 0.65, 0.97), cat 1 and dog 0.

- Ask: What is the whole record of the cat’s cell?
- Expected: (1, 0.68, 0.41, 0.65, 0.97, 1, 0).

**Point here:** Ng’s example: the cell’s top-left is (0, 0) and its bottom-right (1, 1); his car’s centre is at about (0.4, 0.3), its width about 0.9 of a cell and its height about 0.5. (In the video he says b_h for the 0.9; the forum notes the slip.)

**Transition:** The dog’s box is bigger than its cell.

**Source:** The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## dog-box: Step 3: the dog’s box, bigger than its cell

**Build 1:** The dog’s centre is 268 pixels from its cell’s left edge and only 16 below its top: b_x ≈ 0.84 and b_y ≈ 0.05.

- Ask: Why is b_y so small?
- Expected: The dog’s centre is just below the cell’s top edge.

**Build 2:** The dog is wider and taller than its cell: b_w ≈ 1.13 and b_h ≈ 1.58 cells. A box may spill out of its cell, but its centre may not.

- Ask: Can b_w be bigger than 1? Can b_x?
- Expected: b_w, yes: the dog is wider than a cell. b_x, no: the centre always lies inside its own cell.

**Build 3:** So the ground truth for cell (1, 1) is object? 1, the box (0.84, 0.05, 1.13, 1.58), cat 0 and dog 1.

- Ask: What is the whole record of the dog’s cell?
- Expected: (1, 0.84, 0.05, 1.13, 1.58, 0, 1).

**Point here:** Ng: b_x and b_y lie between 0 and 1, while b_h and b_w can be greater than 1 when the object spans several cells. The YOLO paper keeps them in range with a sigmoid for the centre and an exponential for the size.

**Transition:** Step 4: the whole table.

**Source:** The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## target-photo: Step 4: the whole ground-truth table

**Build 1:** The ground-truth table, one record per cell. Cells (1, 0) and (1, 1) hold the cat’s and the dog’s records, written in step 3.

- Ask: Which two rows are filled in first?
- Expected: Cells (1, 0) and (1, 1): the cat’s and the dog’s.

**Build 2:** The other four cells hold no centre, not even (0, 1) with the dog’s head: object? 0, and “?” everywhere else.

- Ask: What do the other four cells hold?
- Expected: Object? = 0; the box and the classes are “?”, left out of the loss.

**Build 3:** Six records of seven numbers: this table is what the network should learn to output for this photo.

- Ask: How many numbers is the target?
- Expected: 6 × 7 = 42.

**Point here:** Ng writes this target as a 3 × 3 × 8 block for his 3 × 3 grid and three classes; ours is 2 × 3 × 7.

**Transition:** Try it: move a box and watch the table.

**Source:** Our annotation of the courtyard photo (data/annotations.json). The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## target-play: Try it: move a box, and watch its ground truth change

**Build 1:** Drag the box or its corner dot. The cell holding the centre lights up with its ground-truth record. Try the finer grids: the same box, counted in smaller cells.

- Ask: What happens to the record when the centre crosses a grid line?
- Expected: Another cell takes over, and b_x or b_y jumps from near 1 to near 0.

**Point here:** b_x and b_y always stay between 0 and 1. b_w and b_h grow as the cells shrink: the dog is 1.13 cells wide on the 3 × 2 grid and 11.3 on the 30 × 20 grid of 5.3.

**Transition:** The same steps in code.

**Source:** The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## target-code: The ground-truth table in code, one line at a time

**Build 1:** The ground truth in code. Every cell starts as “no object”: a 2 × 3 × 7 block of zeros. The “?” entries stay 0; the loss skips them.

- Ask: Why start from zeros?
- Expected: Most cells hold no centre, so object? = 0 is their right target, and their other entries are skipped anyway.

**Build 2:** Loop over the annotated objects, each a box and a class. First the dog: box (407, 83, 768, 588), class 1.

- Ask: How many times does the loop run here?
- Expected: Twice: once for the dog, once for the cat.

**Build 3:** Its centre is the middle of the box: (588, 336).

- Ask: Where is the dog’s centre?
- Expected: (588, 336), the middle of its box.

**Build 4:** Divide by the cell size, 320, and round down: row 1, column 1. Only this cell will describe the dog.

- Ask: Which cell holds it?
- Expected: Row ⌊336/320⌋ = 1, column ⌊588/320⌋ = 1.

**Build 5:** Set object? to 1 in that cell.

- Ask: Which entry is set first?
- Expected: object? = 1, in cell (1, 1) only.

**Build 6:** The centre inside the cell: b_x = 588 / 320 − 1 ≈ 0.84 and b_y = 336 / 320 − 1 ≈ 0.05.

- Ask: Why subtract c and r?
- Expected: cx / s counts cells from the photo’s left edge; subtracting c leaves the position inside the cell, between 0 and 1.

**Build 7:** The size in cells: b_w = 361 / 320 ≈ 1.13 and b_h = 505 / 320 ≈ 1.58.

- Ask: Why can b_w exceed 1?
- Expected: It counts cells, and the dog is wider than one cell.

**Build 8:** Mark the class, dog. The loop does the same for the cat in cell (1, 0), and the other four cells stay all zeros.

- Ask: What does the whole target look like?
- Expected: Two cells with full records and four with object? 0: the six records of the last slide.

**Point here:** The tensor has no “?”: the entries we do not care about are zeros, and the loss reads only object? where object? is 0. Real YOLO code does the same with a mask. Run on our two boxes, this function gives exactly the numbers of the last slides.

**Transition:** Part 2: what the network predicts.

**Source:** Our annotation of the courtyard photo (data/annotations.json). The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## grid-structure: Prediction: a CNN outputs a table of the same shape

**Build 1:** Part 2, the prediction. A small CNN shrinks the photo three times, averages each cell’s region, and writes 7 numbers there: a 2 × 3 × 7 table.

- Ask: What shape is the network’s output?
- Expected: 2 × 3 × 7, the shape of the ground-truth table.

**Build 2:** Convolutions keep the photo’s layout, so output position (r, c) belongs to cell (r, c): top-left to top-left. The colours show the six pairs.

- Ask: Which output position goes with the bottom-left cell?
- Expected: (1, 0), the bottom-left one: the layout is kept.

**Build 3:** So the network’s record for cell (1, 1) is compared with the ground truth for cell (1, 1), and so on for all six cells.

- Ask: Why can we compare the two tables position by position?
- Expected: Both have one record per cell, in the same layout.

**Build 4:** Its last step puts each number in range: a sigmoid keeps object?, b_x, b_y and the class scores between 0 and 1; an exponential keeps b_w and b_h positive.

- Ask: Why squash the raw numbers?
- Expected: So each one means what the record says: a score between 0 and 1, a centre inside its cell, a size above 0. Ng mentions the same sigmoid and exponential.

**Point here:** This small network has 24,039 weights; we train it on this one photo in a few seconds (scripts/run_models.py toy). Ng draws 100 × 100 × 3 → ConvNet → 3 × 3 × 8. Real YOLOs shrink the photo 32 times and keep 30 × 20 positions (5.4).

**Transition:** Line the two tables up.

**Source:** A small CNN trained on this photo by scripts/run_models.py. The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## align-loss: Line the two tables up: the loss, cell by cell

**Build 1:** Before training the network knows nothing: scores and positions near 0.5, sizes near 1. Line up its record for cell (1, 1) with the ground truth.

- Ask: Which record do we compare with the ground truth for cell (1, 1)?
- Expected: The network’s record at output position (1, 1).

**Build 2:** Part 4’s loss for this cell: square the seven differences and add them up, 1.35. The network is far from the dog’s record.

- Ask: Which difference is largest, and why?
- Expected: cat: the truth is 0, the untrained network says 0.52.

**Build 3:** An empty cell, (0, 0): only object? counts, (ô − 0)² ≈ 0.24. The “?” entries are skipped.

- Ask: Why only one entry in cell (0, 0)?
- Expected: The truth there is “no object”: the box and classes are “?”, so they are skipped.

**Build 4:** Every cell’s loss, written in its cell. Their sum, 3.38, is the one number that training pushes down.

- Ask: Which cells contribute most to the loss?
- Expected: The two cells with a centre, (1, 0) and (1, 1): the network has not learnt their records yet.

**Point here:** The untrained network is our small CNN with its random starting weights (seed 0). Its sigmoid outputs start near 0.5 and its exponential ones near 1; Ng’s squared-error loss treats every number alike.

**Transition:** Training pushes the loss down.

**Source:** A small CNN trained on this photo by scripts/run_models.py. The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## train-toy: Training: the predicted table moves toward the ground truth

**Build 1:** Gradient descent on that loss, using this one photo: 300 small steps. The loss starts at 3.38.

- Ask: What does each step change?
- Expected: All the network’s weights, a little, in the direction that lowers the loss.

**Build 2:** By step 50 the record for cell (1, 1) has moved toward the dog’s: object? 0.63, b_h 1.63, dog 0.97.

- Ask: Which numbers move first?
- Expected: The box numbers and the class scores come close by step 50; object? takes longest.

**Build 3:** By step 300 the loss is 0.002 and the record reads almost exactly the dog’s ground truth.

- Ask: Has this network learnt to find dogs?
- Expected: No: it has memorised one photo. A real detector trains on many thousands of photos so that new ones come out right.

**Point here:** Adam, learning rate 0.01, on this one photo: the network memorises it, which is enough to show the mechanics. YOLOv8 was trained on COCO’s 118,000 photos.

**Transition:** The same loss for all cells at once, in code.

**Source:** A small CNN trained on this photo by scripts/run_models.py.

## loss-grid: The loss for all cells at once, in symbols and in code

**Build 1:** Written once for all cells: object? is compared in every cell; the other six numbers only where the ground truth’s object?, o, is 1.

- Ask: What does the factor o do?
- Expected: It switches the box and class terms off in cells with no object: o = 0 there.

**Build 2:** In code: a mask m marks the cells with a centre. These three lines are the loss the small network was trained with.

- Ask: What are p and y in the code?
- Expected: p is the network’s 2 × 3 × 7 table, y the ground-truth table.

**Point here:** YOLOv1 weighted the box terms by 5 and the empty cells’ object? terms by 0.5, because empty cells far outnumber the others. Appendix B works the loss through with the real network’s numbers.

**Transition:** One record per cell: is that always enough?

**Source:** The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## two-in-a-cell: Two centres in one cell? Try smaller cells

**Build 1:** A cell writes one record. On a 3 × 2 grid the 11 people’s centres fall in just 3 cells, so 8 people get no record. Try smaller cells.

- Ask: How many people get no record on the 3 × 2 grid? And on 40 × 22?
- Expected: 8 of 11 on 3 × 2. None on 40 × 22: with 32-pixel cells every centre has a cell of its own.

**Point here:** The cell size is our choice, and smaller cells make two centres in one cell rare. YOLOv1 cut its 448-pixel input into 7 × 7 cells of 64 pixels; YOLOv8 uses cells of 32, 16 and 8 pixels (Part 7). Objects whose centres nearly coincide can still share a cell; the next design handles that.

**Transition:** Or keep the big cells, and give each cell two boxes.

**Source:** Our annotation of the crowd photo (data/annotations.json). The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## two-boxes: Another design: two boxes in every cell

**Build 1:** A person stands in front of a car. On 416-pixel cells, 3 × 2 of them, both centres fall in cell (1, 1), whose one record can hold only one.

- Ask: Why can one record per cell not describe this photo?
- Expected: Both centres fall in cell (1, 1), and one record holds one object.

**Build 2:** Another design gives every cell two boxes, each with a template shape chosen before training: box 1 is tall, box 2 is wide.

- Ask: How big are the two templates, in cells?
- Expected: Tall: 166 × 416 pixels, 0.4 × 1 cell. Wide: 832 × 333 pixels, 2 × 0.8 cells.

**Build 3:** Each box has its own 7-number record: object?, b_x, b_y, b_w, b_h, person, car. So a cell now writes 2 × 7 = 14 numbers.

- Ask: How big is the whole table now?
- Expected: 2 × 3 cells × 14 numbers = 84.

**Point here:** YOLOv1 gave each cell two boxes; YOLOv2 to v5 gave each cell several template shapes, called anchor boxes. Two objects of the same shape in one cell, or three objects, still collide, which fine grids make rare. YOLOv8 dropped the templates and writes one box per cell, on three grids (Part 7).

**Transition:** Which object goes in which box?

**Source:** A photo generated for these slides (SOURCES.md); our boxes, checked by eye (data/person-car.json).

## anchor-person: Which box gets the person? The template that fits best

**Build 1:** Which box gets the person? Centre each template on the person’s box, so that only shapes count. The person fits inside the tall one: IoU 0.68.

- Ask: Why is the overlap with the tall template the person’s whole box?
- Expected: The person, 115 × 409, fits inside the tall template, 166 × 416: so the overlap is the person and the union is the template.

**Build 2:** The wide template overlaps the person only 115 × 333 pixels and makes a big union: IoU 0.13. The tall template fits better, so the person goes to box 1.

- Ask: Which box does the person go to?
- Expected: Box 1, the tall one: IoU 0.68 against 0.13.

**Point here:** Centring both boxes on one point compares shape only; Part 3’s IoU does the rest. Our two templates were picked by hand for this photo; YOLOv2 to v5 pick theirs by k-means on the training boxes.

**Transition:** And the car?

**Source:** A photo generated for these slides (SOURCES.md); our boxes, checked by eye (data/person-car.json).

## anchor-car: The car goes to the wide box, and both are kept

**Build 1:** The car is the other way round. The wide template fits inside it, IoU 0.94; the tall one reaches only 0.18. The car goes to box 2.

- Ask: Which box does the car go to?
- Expected: Box 2, the wide one: IoU 0.94 against 0.18.

**Build 2:** So cell (1, 1)’s ground truth holds both: box 1 the person’s record and box 2 the car’s, each box in the cell’s units. No object is lost.

- Ask: What would cell (1, 1) hold if only the person were there?
- Expected: Box 1: the person’s record. Box 2: object? 0, and “?” for the rest.

**Point here:** Each box’s record is written as before: the centre and size in the cell’s units, then the classes. YOLOv2 to v5 also predict small corrections to each template’s size. A box whose template matches no object learns object? = 0.

**Transition:** Back to one box per cell, on the real grid.

**Source:** A photo generated for these slides (SOURCES.md); our boxes, checked by eye (data/person-car.json).

## fine-grid: In practice: small cells of 32 pixels

**Build 1:** Real YOLOs use small cells. YOLOv8n’s are 32 × 32 pixels, so our 960 × 640 photo becomes 30 × 20 = 600 cells. Same rules, smaller cells.

- Ask: How many cells does YOLOv8n’s grid have on our photo?
- Expected: 30 × 20 = 600: 960 ÷ 32 across and 640 ÷ 32 down.

**Build 2:** The dog’s annotated box is (407, 83, 768, 588). Its centre lies halfway along each side, (587.5, 335.5), which we rounded to (588, 336) earlier.

- Ask: Where is the centre of the box (407, 83, 768, 588)?
- Expected: ((407 + 768) ÷ 2, (83 + 588) ÷ 2) = (587.5, 335.5).

**Build 3:** In cells, the centre is 587.5 ÷ 32 ≈ 18.36 across and 335.5 ÷ 32 ≈ 10.48 down. Round down: column 18, row 10. The dog’s cell is (10, 18).

- Ask: Which cell holds it?
- Expected: (10, 18): row ⌊10.48⌋ = 10 and column ⌊18.36⌋ = 18, counting from 0.

**Build 4:** Inside that cell, what is left after rounding down: b_x = 0.36 and b_y = 0.48 of a cell, measured from its top-left corner, (0, 0).

- Ask: What are b_x and b_y?
- Expected: The parts after the decimal point: 0.36 and 0.48, both between 0 and 1.

**Build 5:** The size counts cells too: 361 pixels is about 11.3 cells wide, and 505 pixels about 15.8 cells tall. A big object spans many small cells.

- Ask: Why is b_w now about 11, when it was 1.13 on the 3 × 2 grid?
- Expected: The same 361 pixels, counted in 32-pixel cells instead of 320-pixel ones.

**Point here:** YOLOv8n also reads two finer grids, of 16- and 8-pixel cells, for small objects (Part 7). Its record has no object? number: four box numbers and a score for each of 80 COCO classes (Appendix B).

**Transition:** At test time: what the trained network writes in that cell.

**Source:** The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## scores-80: What a cell writes: a box and 80 class scores

**Build 1:** What does a cell write? 84 numbers: 4 for its box, then 80 class scores, one for each of the 80 classes YOLOv8n learned from COCO, in a fixed order.

- Ask: How many numbers does a cell write, and why 80 scores?
- Expected: 84: four for the box and one score for each of COCO’s 80 classes.

**Build 2:** Each score is one yes/no answer between 0 and 1: is this cell’s box that class? A sigmoid squashes each raw output: dog 1.91 becomes 0.87, cat −9.25 becomes 0.0001.

- Ask: Why do the 80 scores not add up to 1?
- Expected: Each comes from its own sigmoid: a separate yes/no answer per class, not a share of 1.

**Build 3:** No object? number: on the wall all 80 answers are near 0, which means nothing is here. A box’s score is its highest class score; its class is that class.

- Ask: How does YOLOv8n say “nothing here” without an object? number?
- Expected: All 80 scores are near 0; the highest on this wall cell is potted plant, 0.0001. The score filter drops such boxes.

**Point here:** COCO’s 80 classes run from person, bicycle and car to hair drier and toothbrush; cat and dog are numbers 16 and 17. In training each score gets binary cross-entropy against 1 for the true class in an object’s cells and 0 for the other 79, and 0 for all 80 everywhere else (Appendix B). YOLOv5 and earlier had a separate objectness score; YOLOv8 folds it into the class scores. Bars below 0.001 are too short to see: no cell has a ninth-highest score above 0.001.

**Transition:** Now read the box numbers back into pixels.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## decode: At test time: read the centre back out of the cell

**Build 1:** At test time there is no annotation. Cell (10, 18) wrote these four box numbers, and of its 80 class scores the highest is dog, 0.87.

- Ask: What does the network write in the dog’s cell?
- Expected: Four box numbers, about (0.39, 0.37, 11.3, 16.0), and 80 class scores: dog 0.87, the rest below 0.01.

**Build 2:** To read the box in pixels, undo the cell units. Start at the cell’s top-left corner: 18 cells of 32 pixels across, 576, and 10 cells down, 320.

- Ask: Where is the top-left corner of cell (10, 18), in pixels?
- Expected: (18 × 32, 10 × 32) = (576, 320).

**Build 3:** Then step b_x and b_y of a cell from that corner: 0.39 × 32 ≈ 12 pixels right and 0.37 × 32 ≈ 12 down. The centre is (588, 332).

- Ask: Where is the box’s centre?
- Expected: (576 + 12, 320 + 12) = (588, 332).

**Point here:** YOLOv8n actually writes, for each cell, the distances from the cell’s centre to the box’s four edges (Appendix B). We turn them into b_x, b_y, b_w and b_h, the form of our ground truth, so reading the box back mirrors writing it. The numbers are its real output at cell (10, 18).

**Transition:** Then the size, and the box’s edges.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## decode-box: Then the size, and the box’s edges

**Build 1:** The size is in cells too: 11.3 cells is 11.3 × 32 ≈ 362 pixels wide, and 16.0 cells is 512 pixels tall.

- Ask: How wide is the box, in pixels?
- Expected: 11.3 × 32 ≈ 362.

**Build 2:** Each edge lies half the size from the centre: left 588 − 181 = 407 and right 769, top 332 − 256 = 76 and bottom 588.

- Ask: Where are the box’s left and top edges?
- Expected: 588 − 362 ÷ 2 = 407 and 332 − 512 ÷ 2 = 76.

**Build 3:** That box sits on the dog: IoU 0.98 with our annotation. The network wrote (0.39, 0.37, 11.3, 16.0); the ground truth was (0.36, 0.48, 11.3, 15.8).

- Ask: How close is the box to our annotation?
- Expected: IoU 0.98: almost the same box. Only the top edge differs much, 76 against 83.

**Point here:** Our rounded steps give (407, 76, 769, 588); the exact output is (407.2, 75.6, 769.6, 588.1). The network writes numbers in every cell, never “?”: next, which cells to believe.

**Transition:** Every cell writes a box like this. Pick a few.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## cell-inspector: Every cell writes a box and 80 scores: pick one

**Build 1:** Pick a cell: its box, and its 80 class scores as bars. Near the dog the dog bar stands tall; on the wall all 80 lie flat.

- Ask: What does a cell on the wall write?
- Expected: A box of some kind, but every class score is near 0.

**Point here:** Every cell always writes a box: the network has no way to write “?”. The scores decide which boxes we believe, on the next slide.

**Transition:** All 600 cells at once.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## candidates: 600 cells, up to 600 boxes: keep the confident ones

**Build 1:** Decode every cell the same way: 600 cells, so up to 600 boxes. The network never writes “?”, so cells on the wall and the floor write boxes too.

- Ask: Does a cell on the wall write a box?
- Expected: Yes: every cell always writes one, with 80 class scores.

**Build 2:** Which boxes do we believe? Score each box by its cell’s highest class score. Five sample cells: dog 0.87, cat 0.92, plant 0.89; wall and floor below 0.01.

- Ask: What score does each box get?
- Expected: Its cell’s highest class score: the best of the 80.

**Build 3:** Keep a box only if its score is at least 0.25, Ultralytics’ default. The dog, cat and plant cells pass; the wall and floor cells are dropped.

- Ask: Which of the five sample boxes survive?
- Expected: The dog’s, the cat’s and the plant’s; the wall and floor scores are below 0.01.

**Build 4:** Over all 600 cells, 30 pass: 10 on the dog, 10 on the cat, 10 on the big plant. A finer grid adds one small plant (Part 7): 31 boxes.

- Ask: How many boxes pass over the whole photo?
- Expected: 30 of the 600 cells, plus one from a finer grid: 31.

**Build 5:** This was a score filter, not NMS. Each object still has about ten boxes, from neighbouring cells that see the same object; Part 6 removes the extras.

- Ask: Is this NMS?
- Expected: No. The score filter looks at each box alone. NMS compares boxes with each other and removes the duplicates; it comes in Part 6.

**Point here:** Drop the low scores first, then remove duplicates for each class. YOLOv8 trains about ten cells per object as positives, which is why each object has about ten confident boxes. The 31st box comes from YOLOv8n’s 16-pixel grid (Part 7).

**Transition:** The whole algorithm, step by step.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## yolo-steps: YOLO, the whole algorithm

**Build 1:** Training, for every photo in the set: build the ground-truth table from people’s boxes, predict a table, compare cell by cell, lower the loss.

- Ask: Which step of training uses the annotation?
- Expected: Building the target: the centre cell and the box in cell units come from the annotated boxes.

**Build 2:** Test time: one pass, every cell writes a record, decode the boxes, keep the confident ones (31 here), and remove the duplicates.

- Ask: Which step of test time is still missing?
- Expected: Removing duplicates: non-maximum suppression, Part 6.

**Point here:** Ng’s “YOLO Algorithm” video has the same two halves: build the training target cell by cell (his has two anchors), then at test time drop the low-probability boxes and run NMS for each class.

**Transition:** Part 5 in one slide.

## recap-5: Part 5 in one slide

**Build 1:** Next: each object has about ten boxes; keep one.

- Ask: Why are there about ten boxes per object at test time?
- Expected: Cells next to an object’s centre see nearly the same object, so several of them are confident.

**Transition:** Part 6.

## part-6: Part 6 · One box per object: non-maximum suppression

**Build 1:** NMS keeps the highest-scoring box and removes boxes that overlap it.

- Ask: Of ten overlapping dog boxes, which one would you keep?
- Expected: The one with the highest score.

**Transition:** The dog’s ten boxes.

## dupes: Ten boxes for one dog

**Build 1:** The ten cells whose dog score passed 0.25: each cell’s own estimate that its box holds a dog, from 0.889 down to 0.766. Their boxes nearly coincide.

- Ask: How many dogs are here?
- Expected: One.

**Build 2:** They describe one dog. Keep the most confident box, from cell (9, 19), and delete the rest.

- Ask: Which box would you keep?
- Expected: The highest-scoring: cell (9, 19), 0.889.

**Point here:** Each score is one of the cell’s 80 class scores, the one for dog, from YOLOv8n’s sigmoid output (5.4). It is the score the 0.25 filter used.

**Transition:** The recipe, in general.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## nms-recipe: Non-maximum suppression: the greedy recipe

**Build 1:** Sort by score.

- Ask: Why sort first?
- Expected: So that each kept box is the best of its neighbourhood.

**Build 2:** The best box is kept: no other box can beat it.

- Ask: Is the top box ever deleted?
- Expected: No: it is kept immediately.

**Build 3:** Boxes that overlap it heavily describe the same object: delete them. Boxes that overlap little may be other objects: keep them for now.

- Ask: Why only same-class boxes?
- Expected: A person on a bicycle overlaps the bicycle; both are real objects.

**Build 4:** Then repeat on what is left. Non-maximum suppression removes every box that is not a local maximum.

- Ask: When does the loop stop?
- Expected: When no boxes are left.

**Point here:** Andrew Ng’s version: first drop boxes with p_c ≤ 0.6, then delete boxes with IoU ≥ 0.5 with the kept one, separately for each class. Ultralytics’ defaults are a score cut-off of 0.25 and an IoU threshold of 0.7.

**Transition:** Run it on the dog’s ten boxes.

## nms-dog: NMS on the dog’s ten boxes

**Build 1:** Step 1: the ten boxes sorted by score.

- Ask: Which box is kept first?
- Expected: Cell (9, 19), score 0.889.

**Build 2:** Step 2: keep the top one, cell (9, 19).

- Ask: How similar are the other boxes to it?
- Expected: Very: IoU from 0.96 to 1.00.

**Build 3:** Step 3: each other box’s IoU with it. All are above 0.9: these boxes are the same box, drawn by neighbouring cells.

- Ask: Which boxes are deleted?
- Expected: All nine: every IoU is above 0.7.

**Build 4:** Every IoU is above the 0.7 threshold, so all nine go and one dog box remains.

- Ask: How many dog boxes remain?
- Expected: One.

**Transition:** Two objects of the same class.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## nms-two-dogs: Two dogs: why the loop keeps the second one

**Build 1:** Two dogs in one photo: about ten boxes on each.

- Ask: How many dog boxes are there before NMS?
- Expected: 20

**Build 2:** Round 1 works on the left dog only: the right dog’s boxes do not overlap the kept box, so they stay.

- Ask: Why does round 1 leave the right dog’s boxes alone?
- Expected: Their IoU with the kept box is 0, below the threshold: they may be another dog.

**Build 3:** Round 2 keeps the right dog. Keeping only the single best box overall would have lost a dog; the loop keeps one per object.

- Ask: How many boxes remain, and why is the loop needed?
- Expected: Two: one per dog. Keeping only the best box overall would lose the second dog.

**Transition:** All three classes in the courtyard.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## nms-all: All 31 boxes → 4 detections

**Build 1:** The same loop runs on every class: 10 cat boxes become one, 10 plant boxes become one.

- Ask: How many detections remain?
- Expected: Four.

**Build 2:** Four detections: cat, the big potted plant, dog, and a small plant on a finer grid. A fixed 12,600 records became a set of four.

- Ask: Why does the small plant survive?
- Expected: It is far from every kept box: its IoU with the big plant is 0.

**Transition:** What does the threshold change?

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## nms-threshold: The IoU threshold is a trade-off

**Build 1:** The crowd photo: 112 person candidates. NMS at 0.7 keeps eleven boxes, one per person.

- Ask: How many people does NMS keep at 0.7?
- Expected: Eleven.

**Build 2:** Raise the threshold to 0.95 and NMS deletes only near-identical boxes: two duplicates slip through.

- Ask: What goes wrong at 0.95?
- Expected: Duplicates survive: 13 boxes.

**Build 3:** Lower it to 0 and any touching box is deleted, real neighbours included. No single threshold suits every scene.

- Ask: What goes wrong at 0?
- Expected: Real people are deleted for touching a neighbour: 9 boxes.

**Point here:** Typical thresholds are 0.45 to 0.7. Crowded scenes motivated Soft-NMS (lower the score instead of deleting) and NMS-free detectors such as DETR.

**Transition:** One more rule: classes.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## class-aware: Boxes of different classes do not suppress each other

**Build 1:** A cyclist: a person box and a bicycle box. They overlap, and both are right.

- Ask: How much do the two boxes overlap?
- Expected: 0.339

**Build 2:** If NMS ignored classes, the bicycle would overlap the higher-scoring person by more than 0.3 and be deleted.

- Ask: What would class-agnostic NMS at 0.3 do?
- Expected: Delete the bicycle.

**Build 3:** Run NMS separately for each class and both are kept. That is why step 3 of the recipe says “of the same class”.

- Ask: What does class-aware NMS do?
- Expected: Keep both: they are compared only within their own class.

**Transition:** Try the thresholds yourself.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## nms-play: Try it: thresholds on the street photo

**Build 1:** Move the score threshold, then the IoU threshold; try “all classes together” and watch the bicycle; Step runs one round of the loop.

- Ask: At which IoU threshold do duplicates start to survive?
- Expected: Near 0.95 for this photo: below that, each object keeps one box.

**Transition:** NMS in code.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## nms-code: NMS in code, one line at a time

**Build 1:** The greedy loop of 6.1 as a function. Its input: the 31 boxes that passed the score filter, with their scores.

- Ask: What goes into nms?
- Expected: The boxes that passed the score filter, and their scores.

**Build 2:** Sort by score, best first. The best of all is a cat box, 0.921.

- Ask: Why sort first?
- Expected: So that each kept box is the best one left in its neighbourhood.

**Build 3:** keep starts empty. The loop runs while any box is left in order.

- Ask: When does the loop stop?
- Expected: When no boxes are left in order.

**Build 4:** Take the first box in order and keep it. Everything after it is rest.

- Ask: Is the top box ever deleted?
- Expected: No: it is kept as soon as it is first in line.

**Build 5:** IoU of the kept box with every box in rest, all at once: its 9 twins score 0.98 or more, and every other box about 0.

- Ask: Which boxes overlap the kept cat box heavily?
- Expected: Its 9 twins, IoU 0.98 to 1.00.

**Build 6:** Keep only the boxes with IoU ≤ 0.7: the cat’s 9 twins go, and nothing else is touched.

- Ask: Which line deletes the duplicates?
- Expected: order = rest[ious <= thr].

**Build 7:** The loop repeats: a plant box drops 9 twins, the dog box 9, the small plant none. order is now empty.

- Ask: How many rounds does the loop run here?
- Expected: 4: one per object.

**Build 8:** Return the 4 kept boxes, one per object. torchvision.ops.nms returns the same four.

- Ask: How would you make it class-aware?
- Expected: Run it once per class, or use torchvision.ops.batched_nms, which does exactly that.

**Point here:** This nms ignores classes; on these boxes it keeps the same four as class-aware NMS (checked in scripts/science.py). order[:1] keeps i a one-element index, so boxes[i] has the (1, 4) shape that box_iou expects.

**Notebook:** Notebook part 6 runs this function on the courtyard’s 31 candidates and checks it against torchvision.ops.nms.

**Transition:** The dense answer, end to end.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## dense-recap: The dense answer, end to end

**Build 1:** Photo in, one pass of the CNN and its head, and out come 12,600 records, the same number for every photo this size.

- Ask: What comes out of the network for any photo?
- Expected: 12,600 records, one per cell, always.

**Build 2:** Fixed rules turn them into detections: decode every record into a box, drop the low scores, and remove duplicates with NMS.

- Ask: Which steps cut the boxes down?
- Expected: The score filter (31 left), then NMS (4 left).

**Build 3:** Only the CNN and head have learned weights. This is answer A to the lecture’s question: outputs tied to places, then one box per object.

- Ask: Which steps have learned weights?
- Expected: Only the CNN and the head; decoding, filtering and NMS are fixed rules.

**Transition:** The same pipeline in code.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## detect-code: The whole detector at test time, one line at a time

**Build 1:** Parts 5 and 6 in one function. x is the photo as a tensor, and net is the trained YOLOv8n.

- Ask: What are the inputs?
- Expected: The photo tensor and the trained network.

**Build 2:** One pass of the network: 84 numbers for each of the 12,600 cells, whatever the photo shows.

- Ask: What shape is y?
- Expected: (84, 12,600): 84 numbers per cell.

**Build 3:** Turn each cell’s centre and size into corners: 12,600 boxes, one per cell. Our grid’s 600 are drawn.

- Ask: What does xyxy do?
- Expected: It turns (c_x, c_y, w, h) into corners (x₁, y₁, x₂, y₂).

**Build 4:** For each cell, its best class and that class’s score. The scores are high only near the animals and the plants.

- Ask: What does max(0) return?
- Expected: For each cell, its largest class score and the index of that class.

**Build 5:** A mask of the cells whose best score is at least 0.25: 31 of 12,600.

- Ask: How many cells pass the mask?
- Expected: 31

**Build 6:** Keep those rows only: 31 boxes, each with its score and its class.

- Ask: Why index box, score and label with the same mask?
- Expected: So each kept box keeps its own score and class.

**Build 7:** NMS within each class: 4 boxes remain, one per object.

- Ask: Why batched_nms rather than nms?
- Expected: It runs NMS separately for each class, so a person never removes their bicycle.

**Build 8:** Return them: the four detections of the lecture’s first slide. No line depends on how many objects there are.

- Ask: Which lines decide how many objects come back?
- Expected: The score mask and batched_nms.

**Point here:** xyxy is torchvision.ops.box_convert(b, "cxcywh", "xyxy"); batched_nms is torchvision.ops.batched_nms. Ultralytics’ own post-processing does the same steps (checked in scripts/science.py).

**Notebook:** Notebook part 6 runs this function on the courtyard photo.

**Transition:** Part 6 in one slide.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## recap-6: Part 6 in one slide

**Build 1:** Next: small and large objects: three grids.

- Ask: Why does NMS repeat instead of keeping only the single best box?
- Expected: There may be several objects; each round keeps the best box of one of them.

**Transition:** Part 7.

## part-7: Part 7 · Small and large objects: three grids

**Build 1:** YOLOv8 uses three grids with different cell sizes, and every cell writes the same record.

- Ask: What could go wrong for a 13-pixel-wide person on a 32-pixel grid?
- Expected: It is under half a cell; two such people could share one cell, and one cell must describe both.

**Transition:** Sizes in one photo.

## sizes: Part 1’s street again, with the 32-pixel grid

**Build 1:** Part 1’s street again: a bus, a cyclist and a far pedestrian.

- Ask: How many times wider is the bus than the far pedestrian?
- Expected: About 39 times.

**Build 2:** Draw the 32-px grid. The bus spans about 16 cells; the pedestrian sits inside one. A coarse grid suits big objects; small ones need finer cells.

- Ask: What is the problem for small objects on a coarse grid?
- Expected: A cell may contain several small objects but writes one record; and its features are dominated by a large surrounding region.

**Transition:** Three grids.

**Source:** The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## three-grids: Three grids: cells of 8, 16 and 32 pixels

**Build 1:** YOLOv8 reads three feature maps from different depths of the CNN: cells of 8, 16 and 32 pixels. Every cell writes the same 84-number record.

- Ask: How many cells does the 8-px grid have for the courtyard?
- Expected: 120 × 80 = 9,600.

**Build 2:** Add them up: 12,600 for the courtyard, the number we decoded in Part 5. A bigger photo gets more cells: 18,480 for the street.

- Ask: Where did 12,600 come from?
- Expected: 9,600 + 2,400 + 600.

**Point here:** Why not use only the fine grid? Its cells come from early layers whose features see only a small region: too little context for large objects. Feature pyramids (FPN, 2017) mix deep and early features so that even the fine grid knows what it is looking at.

**Transition:** Which grid found what?

## which-grid: Which grid found each object? The real answer

**Build 1:** After NMS, look up which grid each kept box came from: the bus from 32 px, the cyclist from 16 px, the far pedestrian from 8 px.

- Ask: Which grid found the bus? The far pedestrian?
- Expected: 32 px; 8 px.

**Build 2:** The street photo agrees: large from coarse, small from fine. Training assigns each object to cells whose grid suits its size.

- Ask: Who decided this?
- Expected: Training: an object’s positive cells are chosen where its box fits best, which for small objects is the fine grid.

**Transition:** Boxes that turn.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## obb-crack: Boxes that turn: axis-aligned or oriented?

**Build 1:** Every box so far had its edges parallel to the photo’s sides: an axis-aligned box, four numbers. Around this thin, slanted crack it is mostly metal.

- Ask: How much of the axis-aligned box is crack?
- Expected: About 1/4.6 of it; the rest is metal.

**Build 2:** An oriented box adds one number, the angle θ: (c_x, c_y, w, h, θ). It turns with the crack and hugs it.

- Ask: How many numbers does an oriented box need?
- Expected: Five: the centre, the width, the height and the angle.

**Build 3:** The axis-aligned box is 4.6 times bigger: about 78% of it is not crack. The two boxes’ IoU is only 0.22.

- Ask: When does the angle not matter?
- Expected: When objects are upright, like our cat and dog: their axis-aligned boxes are already tight.

**Point here:** Our oriented box for the crack: centre (618, 182), 96 × 14 pixels at 46°; the axis-aligned box is the tightest one around its corners. Part 1’s hand-drawn box, (578, 142, 668, 214), is a little looser. Oriented boxes are also written as their four corners, eight numbers, as in the DOTA aerial data set.

**Transition:** Where the angle really matters: packed, slanted objects.

**Source:** Our oriented box on the course-owned photo (see SOURCES.md).

## obb-ships: Packed, slanted objects need the angle

**Build 1:** Seen from above, four ships moored side by side at 45°. Their oriented boxes do not touch: IoU 0 between neighbours.

- Ask: Do the ships overlap?
- Expected: No: a strip of water separates them, and their oriented boxes do not touch.

**Build 2:** Their axis-aligned boxes overlap a lot: IoU 0.56 between neighbours. NMS at 0.5 would keep one ship and delete the next as a duplicate.

- Ask: Why do their axis-aligned boxes overlap?
- Expected: Each slanted ship needs a big square box, which reaches over its neighbours.

**Build 3:** So detectors for aerial photos, scene text and documents predict the angle too: YOLOv8-OBB writes (c_x, c_y, w, h, θ) for every cell.

- Ask: What must change in IoU and NMS for oriented boxes?
- Expected: IoU becomes the area of the overlap of two rotated rectangles, a polygon, over their union; NMS then uses that IoU.

**Point here:** The ships are drawn shapes, 280 × 40 pixels, 64 pixels apart along the quay; the IoUs are computed exactly (scripts/science.py). Oriented boxes bring their own trouble: 0° and 180° are the same box, and a 90° turn swaps w and h, so the loss must allow for that. DOTA (aerial images) and ICDAR (scene text) are the usual benchmarks.

**Transition:** Part 7 in one slide.

## recap-7: Part 7 in one slide

**Build 1:** Next: measure how good the detections are.

- Ask: Which grid would you expect to find Part 1’s small bird?
- Expected: The finest, 8 px: its best box did come from a stride-8 cell.

**Transition:** Part 8.

## part-8: Part 8 · Measuring a detector

**Build 1:** We judge a detector against an annotation, box by box, then summarise.

- Ask: A detector returned 8 boxes for 5 dogs. Is that good?
- Expected: It depends: how many of the 5 dogs are among them, and how many of the 8 boxes are wrong?

**Transition:** A teaching example.

## eval-setup: A teaching example: five dogs, eight boxes

**Build 1:** A teaching example. The annotation: five dogs, A to E, each with a box drawn by a person. Dog E is the small one far away, by the tree.

- Ask: How many dogs are annotated?
- Expected: Five: A to E.

**Build 2:** A detector returned eight boxes, each with a dog score, sorted from 0.95 down to 0.20. Which of them are right?

- Ask: How many boxes did the detector return?
- Expected: Eight, each with a score.

**Point here:** The dog boxes are ours (YOLOv8l proposals checked by eye). The eight detections are invented so that every kind of mistake appears once or twice. Real detections on real photos, with the same rules, are in Appendix B.

**Transition:** When is a box right?

**Source:** A photo generated for these slides (SOURCES.md); our dog boxes; the eight detections are made up for teaching (data/dog-park.json).

## tp-rule: When is a box right? IoU ≥ 0.5 with a dog

**Build 1:** Go through the boxes in score order. Box #1 overlaps dog B with IoU 0.88, at least 0.5: a true positive (TP). Dog B is found.

- Ask: Why is box #1 a true positive?
- Expected: Its IoU with dog B is 0.88, at least 0.5.

**Build 2:** Box #6 holds dog D, but it is far too big: IoU 0.40, below 0.5. A false positive (FP), however close it is to a dog.

- Ask: Box #6 contains dog D. Why is it a false positive?
- Expected: Its IoU with D is only 0.40: the box is so much bigger than the dog that the union swamps the overlap.

**Point here:** IoU ≥ 0.5 is the usual rule (Pascal VOC, and COCO’s AP50); 8.4 makes it stricter. Each dog can be found only once: if a second box ever landed on a dog already found, it would also count as a false positive, but NMS (Part 6) removes nearly all such duplicates before we measure. This is a third kind of matching, after training assignment and NMS: predictions against annotations.

**Transition:** Now every box, in order.

**Source:** A photo generated for these slides (SOURCES.md); our dog boxes; the eight detections are made up for teaching (data/dog-park.json).

## eval-walk: Judge every box, in score order

**Build 1:** Box #1, score 0.95: IoU 0.88 with dog B, at least 0.5. A true positive: B is found.

- Ask: Which dog does box #1 find?
- Expected: Dog B: IoU 0.88.

**Build 2:** #2, 0.90: IoU 0.81 with dog A. A true positive: A is found.

- Ask: And #2?
- Expected: Dog A, IoU 0.81.

**Build 3:** #3, 0.80: it sits on the bag. IoU 0 with every dog: a false positive, however sure the detector is.

- Ask: Why is #3 wrong, though it scores 0.80?
- Expected: It is on the bag: IoU 0 with every dog. A high score does not make a box right.

**Build 4:** #4, 0.70: IoU 0.76 with dog C. A true positive.

- Ask: And #4?
- Expected: Dog C, IoU 0.76.

**Build 5:** #5, 0.60: the bench. IoU 0 with every dog: another false positive.

- Ask: Why is #5 wrong?
- Expected: It is on the bench: IoU 0 with every dog.

**Build 6:** #6, 0.45: it holds dog D but is far too big, IoU 0.40. Below 0.5, so a false positive, and D is not found yet.

- Ask: #6 contains dog D. Why is it wrong?
- Expected: Its IoU with D is 0.40, under 0.5: far too big a box.

**Build 7:** #7, 0.35: IoU 0.68 with D, at least 0.5. A true positive: D is found.

- Ask: Why is #7 right, after #6 failed?
- Expected: Its IoU with D is 0.68, above 0.5.

**Build 8:** #8, 0.20: a bush. A false positive. In all: 4 true positives and 4 false positives.

- Ask: How many TP and FP in all?
- Expected: 4 TP (#1, #2, #4, #7) and 4 FP (#3, #5, #6, #8).

**Transition:** What did the boxes miss?

**Source:** A photo generated for these slides (SOURCES.md); our dog boxes; the eight detections are made up for teaching (data/dog-park.json).

## eval-fn: What was missed: FN. And why there is no TN

**Build 1:** Dog E, far away by the tree, got no box at all: a false negative (FN), a miss. In all, 4 TP, 4 FP and 1 FN.

- Ask: Which dog is a false negative, and why?
- Expected: Dog E: no box found it.

**Build 2:** A true negative would be “no box, and no dog”: every empty patch of grass, endlessly many. Detection never counts them, so it uses precision and recall, not accuracy.

- Ask: Why can we not count true negatives?
- Expected: “No dog, no box” holds for every empty place in the photo: there is no fixed number of them.

**Point here:** Dog D shows that a box near a dog is not enough: had #7 been missing, #6 alone would have left D a false negative, as well as being a false positive itself.

**Transition:** Turn the counts into two numbers.

**Source:** A photo generated for these slides (SOURCES.md); our dog boxes; the eight detections are made up for teaching (data/dog-park.json).

## pr-def: Precision and recall: two questions

**Build 1:** Precision looks at what we reported, the left circle: 4 of our 8 boxes are right, so precision is 4/8 = 0.5.

- Ask: What does precision divide by?
- Expected: Everything reported: TP + FP, our 8 boxes.

**Build 2:** Recall looks at what was really there, the right circle: we found 4 of the 5 dogs, so recall is 4/5 = 0.8.

- Ask: What does recall divide by?
- Expected: Everything really there: TP + FN, the 5 dogs.

**Common misconception:** Neither alone is enough: a box on every patch of grass gives recall 1; one sure box gives precision 1.

**Transition:** Change the score threshold, and both change.

**Source:** A photo generated for these slides (SOURCES.md); our dog boxes; the eight detections are made up for teaching (data/dog-park.json).

## pr-threshold: Raise or lower the score threshold

**Build 1:** Keep only boxes scoring at least 0.85: #1 and #2, both right. Precision 2/2 = 1, but recall only 2/5 = 0.4: dogs C, D and E are missed.

- Ask: What are precision and recall at 0.85?
- Expected: 1 and 0.4: every kept box is right, but three dogs are missed.

**Build 2:** Lower it to 0.5: five boxes, three right. Precision 3/5 = 0.6, recall 3/5 = 0.6. More dogs found, and more mistakes made.

- Ask: What changes at 0.5?
- Expected: Two more dogs could be found, but two wrong boxes come in: 0.6 and 0.6.

**Build 3:** Lower it to 0.1: all eight boxes. Recall rises to 4/5 = 0.8 and precision falls to 4/8 = 0.5. The threshold trades one for the other.

- Ask: Why can recall never reach 1 here?
- Expected: Dog E has no box at all; no threshold can find it.

**Transition:** Try any threshold.

**Source:** A photo generated for these slides (SOURCES.md); our dog boxes; the eight detections are made up for teaching (data/dog-park.json).

## pr-play: Try it: move the threshold, watch TP, FP and FN

**Build 1:** Move the score threshold: boxes appear and disappear, each marked TP or FP, missed dogs FN. Watch the point move along the precision–recall curve. Then ask for a stricter IoU.

- Ask: At which IoU does box #7 stop counting?
- Expected: At 0.70: its IoU with dog D is 0.68, so D becomes a miss and #7 a false positive.

**Transition:** Every threshold at once: the curve.

**Source:** A photo generated for these slides (SOURCES.md); our dog boxes; the eight detections are made up for teaching (data/dog-park.json).

## pr-curve: Every threshold at once: the precision–recall curve

**Build 1:** Every threshold at once: go down the boxes in score order and count the true and false positives so far.

- Ask: What are TP and FP after box #4?
- Expected: 3 TP and 1 FP.

**Build 2:** Precision at each row: TP so far ÷ boxes so far. Recall: TP so far ÷ 5 dogs. Each row is one threshold: keep the boxes down to it.

- Ask: Precision and recall after #4?
- Expected: 3/4 = 0.75 and 3/5 = 0.6.

**Build 3:** Plot each row as a point, recall across and precision up: the precision–recall curve. Lowering the threshold walks it right: more dogs, less precision.

- Ask: What does each point stand for?
- Expected: The detector with its threshold just below that box’s score.

**Transition:** One number for the whole curve.

**Source:** A photo generated for these slides (SOURCES.md); our dog boxes; the eight detections are made up for teaching (data/dog-park.json).

## ap-area: Average precision: the area under the curve

**Build 1:** Smooth the zig-zag: at each recall, take the best precision still reachable by lowering the threshold. That is the envelope, solid; the raw curve is dashed.

- Ask: Why use the best precision at this recall or beyond?
- Expected: Nobody would pick a threshold whose precision is beaten by a lower threshold with more recall.

**Build 2:** Average precision (AP) is the area under it: four strips of recall 0.2, at heights 1, 1, 0.75 and 0.57.

- Ask: What are the strips?
- Expected: Each true positive adds 1/5 of recall: a strip 0.2 wide, as tall as the envelope there.

**Build 3:** AP = 0.2 × (1 + 1 + 0.75 + 0.57) ≈ 0.66. Recall never passes 0.8, because dog E has no box, so nothing is added beyond it.

- Ask: When would AP be 1?
- Expected: Only if every dog is found, and every true positive comes before every false positive.

**Point here:** This is the all-point area (Pascal VOC, 2010 onwards). COCO reads the envelope at 101 recall values instead: 0.668 here, nearly the same.

**Transition:** The same computation in code.

**Source:** A photo generated for these slides (SOURCES.md); our dog boxes; the eight detections are made up for teaching (data/dog-park.json).

## ap-code: AP in code, one line at a time

**Build 1:** AP in code, on the eight ranked boxes: write each one as a hit (1) or a miss (0), in score order.

- Ask: What goes into the computation?
- Expected: Only the hits and misses, in score order, and the number of dogs.

**Build 2:** Count the true positives so far, row by row.

- Ask: What is tp after box #4?
- Expected: 3: boxes 1, 2 and 4 were hits.

**Build 3:** And the false positives so far.

- Ask: What is fp after box #6?
- Expected: 3: boxes 3, 5 and 6 were misses.

**Build 4:** Precision at each row: the true positives over everything kept up to that row.

- Ask: What is the precision at box #3?
- Expected: 2/3: two hits among three boxes.

**Build 5:** Recall at each row: the true positives over the 5 dogs.

- Ask: What is the recall at box #7?
- Expected: 4/5 = 0.8.

**Build 6:** The envelope: walk up from the bottom and keep the best precision seen so far, so the curve only steps down.

- Ask: Why walk from the bottom up?
- Expected: So each row gets the best precision reachable at its recall or beyond.

**Build 7:** The recall each row adds: the width of its strip. Only the four hits add any.

- Ask: Which rows add recall?
- Expected: Boxes 1, 2, 4 and 7, the hits.

**Build 8:** Multiply each width by its height and add: 0.66, the area of the last slide.

- Ask: What is AP?
- Expected: 0.66

**Point here:** The same function gives any AP in this lecture: only the hits list and the number of objects change.

**Transition:** Stricter IoU.

**Source:** A photo generated for these slides (SOURCES.md); our dog boxes; the eight detections are made up for teaching (data/dog-park.json).

## map-iou: Stricter IoU: AP at ten thresholds

**Build 1:** Box #7 overlaps dog D with IoU 0.68: a true positive if we ask for 0.5, a false positive from 0.7 up, and then D is a miss.

- Ask: At which thresholds is box #7 a true positive?
- Expected: 0.50 to 0.65: its IoU, 0.68, is at least those.

**Build 2:** Recompute AP at each of COCO’s ten IoU thresholds, 0.5 to 0.95. Loose boxes stop counting one by one, and AP falls from 0.66 to 0.

- Ask: Why does AP fall as the threshold rises?
- Expected: Boxes whose IoU is below the threshold turn into false positives, and their dogs into misses.

**Build 3:** COCO’s headline AP is the average of the ten: 0.44. AP50, 0.66, asks only for rough boxes; the average rewards tight ones.

- Ask: What does averaging over thresholds reward?
- Expected: Tight boxes: a box that is only roughly right counts at 0.5 but not at 0.9.

**Point here:** AP50 = 0.66 and AP75 = 0.55 here. The mean is taken over the unrounded APs, 0.436 ≈ 0.44; the rounded bars average 0.434. COCO calls the average AP (or AP@[.50:.95]); it also reports AP for small, medium and large objects. A real 13-pixel pedestrian, a pixel off, is in Appendix B.

**Transition:** More than one class: mAP.

**Source:** A photo generated for these slides (SOURCES.md); our dog boxes; the eight detections are made up for teaching (data/dog-park.json).

## map: mAP: average the AP over the classes

**Build 1:** One AP per class, then their mean: mAP. YOLOv8n on our eight photos ranges from 0.80 for bicycles to 1 for buses and cars: mAP 0.936.

- Ask: What does mAP average over?
- Expected: Classes (and, for COCO, also the ten IoU thresholds).

**Build 2:** At IoU 0.5 alone every class scores 1, so mAP@0.5 is 1.000. On clean photos only the strict average tells detectors apart.

- Ask: Why is mAP@0.5 exactly 1 here?
- Expected: Every object of every class is found, ranked above every false box, with IoU above 0.5.

**Build 3:** COCO’s 5,000 cluttered photos and 80 classes give YOLOv8n 0.373. Our handful of clean photos is a sanity check, not a benchmark.

- Ask: Why is COCO’s number so much lower than ours?
- Expected: COCO has 80 classes and crowded, cluttered, small objects; our eight photos are clean and easy. A handful of photos is not a benchmark.

**Point here:** Our numbers come from our own evaluator (scripts/science.py) on our annotations; the COCO number is from the Ultralytics YOLOv8 documentation. DETR on the same photos: Appendix A.

**Transition:** In code.

**Source:** Our evaluator on data/annotations.json; COCO number: Ultralytics YOLOv8 documentation.

## eval-code: Evaluation in code

**Build 1:** Libraries do the matching, ranking and averaging. The notebook also has a twenty-line version that reproduces the walk-through.

- Ask: Which number is COCO’s headline “AP”?
- Expected: map: the mean over IoU 0.5 to 0.95 and over classes.

**Notebook:** Notebook part 8 evaluates YOLOv8n on the eight photos with the hand-written evaluator.

**Transition:** Three uses of IoU.

## iou-uses: Three uses of IoU, easy to confuse

**Build 1:** Training: pair cells with annotated objects. YOLOv8 ranks the cells by how well their boxes fit, measured with IoU.

- Ask: What does IoU pair up in training?
- Expected: Cells, through their predicted boxes, with annotated objects.

**Build 2:** Test time: NMS compares predictions with each other. Overlap above 0.7 means a duplicate.

- Ask: In NMS?
- Expected: Predictions with predictions.

**Build 3:** Measuring: a detection is right if its IoU with an annotation is at least 0.5. All three pairings use the same measure.

- Ask: In evaluation?
- Expected: Predictions with annotated objects.

**Point here:** Only assignment and evaluation use the annotations; NMS sees predictions only.

**Transition:** Part 8 in one slide.

## recap-8: Part 8 in one slide

**Build 1:** Next: the whole lecture, in one picture.

- Ask: Why does detection use precision and recall instead of accuracy?
- Expected: Accuracy needs true negatives, and “no object, no box” has no fixed count.

**Transition:** The whole lecture.

## pipeline: The whole lecture, as one flowchart

**Build 1:** Training: people box objects in photos; each box’s centre picks a cell; the network learns to write the same table, cell by cell.

- Ask: Where do the training targets come from?
- Expected: From people’s boxes: each box’s centre picks a cell, which gets the box in its units (5.2).

**Build 2:** Test time: one pass writes a box and scores in every cell of three grids; the score filter and NMS leave one box per object.

- Ask: Where is the number of detections decided?
- Expected: After the network: the score filter and NMS.

**Build 3:** Measuring: match the detections to an annotation by IoU, count TP, FP and FN, and summarise them as precision, recall, AP and mAP.

- Ask: What does the measuring row need that test time does not?
- Expected: An annotation of the test photos, to match the detections against.

**Point here:** The notes under each step say where the lecture covered it. Appendix A gives DETR, which replaces the score filter and NMS by matching a fixed set of slots to objects.

**Transition:** The lecture in one slide.

## summary: The lecture in one slide

**Build 1:** Every cell writes a box; the score filter and NMS decide how many survive.

- Ask: How does a fixed-size output give a list of any length?
- Expected: Every cell writes a box; the score filter and NMS decide how many boxes survive.

**Point here:** Next lecture: masks, keypoints and boxes found from words (Beyond Boxes). Appendix A gives the other answer to the question, DETR; Appendix B has more depth, real detections, and the six jobs of Part 1 revisited.

**Transition:** End of the main route.

## part-A: Appendix A · DETR: a fixed set of slots, matched to objects (optional)

**Build 1:** The other answer to the lecture’s question: DETR, 100 slots that read the image with attention, matched to objects instead of cleaned up by NMS.

- Ask: Why not simply give the head several box outputs?
- Expected: Then you must choose how many, and decide which output answers for which object.

**Transition:** Start with K slots.

## k-slots: Give the head K slots (optional)

**Build 1:** Give the head K slots instead of one. Each slot holds a record like the one-object target: a class and four box numbers. Here K = 5.

- Ask: What does each slot write?
- Expected: A class and four box numbers, like the one-object head.

**Build 2:** The target for our photo puts the dog in one slot and the cat in another, with their boxes in normalised units.

- Ask: Why the dog in slot 1 and not slot 4?
- Expected: No reason: the slots have no order. That choice comes back as Problem 2.

**Build 3:** The three spare slots need a way to say “nothing here”: one more class, no object. Their boxes have no right answer, so they are “?”.

- Ask: What should a spare slot predict?
- Expected: The class “no object”. Its box is left out of the loss.

**Build 4:** However many objects a photo has, the output keeps one size: K slots, each with C class scores, a no-object score and four box numbers.

- Ask: How many numbers for K = 5 and C = 80?
- Expected: 5 × (80 + 1 + 4) = 425.

**Transition:** What if a photo has more objects than slots?

**Source:** Our annotation of the courtyard photo (data/annotations.json). The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## slots-crowd: Problem 1: more objects than slots (optional)

**Build 1:** Problem 1: the crowd photo has 11 people. A head with K = 5 slots can report at most 5 of them, however well it is trained.

- Ask: How many of the 11 people can a 5-slot head report?
- Expected: At most 5.

**Build 2:** So make K larger than any photo needs, say 100. Here 11 slots would hold a person, and the other 89 would say “no object”.

- Ask: How large should K be?
- Expected: Larger than the number of objects in any photo you expect.

**Point here:** K is fixed when the network is built, so it must cover the most crowded photo you expect; the spare slots learn “no object”.

**Transition:** Problem 2 is harder: which object goes in which slot?

**Source:** Our annotation of the crowd photo (data/annotations.json). The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## slot-order: Problem 2: which dog belongs in slot 1? (optional)

**Build 1:** Suppose the head is perfect: slot 1 boxes the left dog exactly, slot 2 the right dog. Nothing could be more right.

- Ask: Are the two slots’ boxes correct?
- Expected: Yes, exactly: they are the annotated boxes.

**Build 2:** But the annotator happened to list the right dog first. Compare slot k with entry k: each slot is a whole dog away from its entry, 0.603 in normalised units.

- Ask: What is the loss if slot k is compared with entry k?
- Expected: 1.206: 0.603 for each slot, mostly the half-photo gap between the two centres.

**Build 3:** Compare each slot with the dog it actually boxed: both differences are 0.

- Ask: And if each slot is compared with its own dog?
- Expected: 0.

**Build 4:** Nothing about the prediction changed, only the order of the list. A loss that pairs outputs with targets by position punishes a perfect answer.

- Ask: What must the loss do instead?
- Expected: Pair each output with the object it describes, whatever the list order.

**Point here:** The L1 sums are over normalised (c_x, c_y, w, h). The list order here is made up for the example: whoever labels a photo lists its objects in some order, and nothing makes it match the slots.

**Transition:** Two ways to pair outputs with objects.

**Source:** Our annotation of the two-dog photo (data/annotations.json). The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## two-fixes: Two ways to decide which output answers for which object (optional)

**Build 1:** Fix A gives every output a fixed place in the image, and whatever is there is its job, so order cannot matter.

- Ask: How does fix A remove the order problem?
- Expected: An output answers for the object at its place; there is nothing to order.

**Build 2:** Fix B keeps free slots and, before each loss, matches them to objects at the lowest total cost, so order cannot matter either.

- Ask: How does fix B?
- Expected: The pairing is chosen by cost, not by position in the list.

**Transition:** DETR: fix B, step by step.

## slots-again: Back to the slots, with three changes (optional)

**Build 1:** Problem 1 was capacity: use K = 100 slots. Unused slots predict a 92nd class, “no object”.

- Ask: How many slots does DETR use?
- Expected: 100.

**Build 2:** A slot needs a way to look at the photo: give it a learned query vector that attends to the image features.

- Ask: How does a slot see the image?
- Expected: Cross-attention from its query to the image features.

**Build 3:** Problem 2 was order: before computing the loss, find the cheapest one-to-one pairing of slots and objects. Order in the annotation list stops mattering.

- Ask: How is the order problem solved?
- Expected: By matching slots to objects before the loss.

**Transition:** Follow a photo through DETR.

## detr-pipeline: DETR, from photo to 100 predictions (optional)

**Build 1:** A ResNet-50 turns the photo, resized to 1200 × 800, into a 25 × 38 grid; each position becomes a token of 256 numbers. 950 tokens.

- Ask: How many image tokens are there?
- Expected: 25 × 38 = 950.

**Build 2:** A transformer encoder lets the 950 tokens attend to each other, so each token knows about the rest of the photo.

- Ask: What does the encoder add?
- Expected: Context: each token attends to all the others.

**Build 3:** The decoder starts from 100 learned query vectors. In each of 6 layers, the queries attend to each other, then to the 950 image tokens (cross-attention).

- Ask: What reads the image in the decoder?
- Expected: The 100 queries, through cross-attention to the tokens.

**Build 4:** Two small heads read each of the 100 outputs: a class among 91 COCO ids plus “no object”, and a box as normalised (c_x, c_y, w, h).

- Ask: What does each of the 100 outputs give?
- Expected: A class (or no object) and a normalised box.

**Point here:** The grid is 25 × 38 because 800/32 = 25 and 1200/32 = 37.5, rounded up.

**Transition:** What is a query?

**Source:** DETR (facebook/detr-resnet-50, Hugging Face) run on this photo by scripts/run_models.py.

## queries: A query is learned once and reused for every photo (optional)

**Build 1:** The 100 queries are stored parameters: 100 × 256 numbers learned in training, identical for every photo.

- Ask: Do the queries change from photo to photo?
- Expected: No: they are fixed after training.

**Build 2:** Their outputs are computed: the same query writes a dog box for one photo and “no object” for another, depending on what it read.

- Ask: Then how can query 71 output a dog here and nothing elsewhere?
- Expected: Its output depends on what cross-attention reads from this photo.

**Transition:** DETR on the courtyard.

## detr-output: DETR on the courtyard: 100 slots, most of them empty (optional)

**Build 1:** One square per query, numbered 0 to 99. Coloured if the query names an object; grey if it says “no object”.

- Ask: How many queries say “no object”?
- Expected: 88 with probability above 0.9.

**Build 2:** The busy ones: query 71 says dog (0.999), query 61 cat (0.999), others plants. Their numbers are arbitrary: training decided which slot does what.

- Ask: Which query found the dog?
- Expected: Query 71.

**Build 3:** Their boxes: one per object. No duplicates to remove, and no NMS.

- Ask: Does DETR need NMS here?
- Expected: No: each object has one query.

**Transition:** Where did query 71 look?

**Source:** DETR (facebook/detr-resnet-50, Hugging Face) run on this photo by scripts/run_models.py.

## detr-attention: Where two queries looked (optional)

**Build 1:** Query 71’s cross-attention in the last decoder layer, averaged over its 8 heads: where its weights over the 950 tokens went. Bright = much attention.

- Ask: Where does query 71 attend?
- Expected: On the dog.

**Build 2:** Query 61, the cat: its attention sits on the cat. Each query attends mostly to the parts of the photo that fix its box: the extremities more than the middle.

- Ask: Why the edges and extremities rather than the middle?
- Expected: The box needs the extreme points (head, paws, tail); the class is already clear from the encoder’s context.

**Point here:** Carion et al. (2020) report the same: decoder attention highlights object extremities.

**Transition:** How do duplicates disappear without NMS?

**Source:** DETR (facebook/detr-resnet-50, Hugging Face) run on this photo by scripts/run_models.py.

## detr-layers: Duplicates disappear inside the decoder (optional)

**Build 1:** DETR’s heads can read the queries after any decoder layer. After layer 1, two queries describe the same pot in the two-dogs photo.

- Ask: What do queries 90 and 25 say after layer 1?
- Expected: Both: potted plant, on the same pot.

**Build 2:** After layer 2, query 25 has dropped out: “no object” at 0.975. The duplicate was removed by the network, not by a post-processing rule.

- Ask: And after layer 2?
- Expected: Query 25: no object; query 90: potted plant.

**Build 3:** This works because training never rewards two queries for one object. That comes from the matching.

- Ask: What lets a query know another has the pot?
- Expected: Self-attention among the queries in each decoder layer.

**Point here:** DETR trains a loss on every layer’s predictions (auxiliary losses), which is why every layer’s output can be read with the same heads.

**Transition:** Training: which query should learn which object?

**Source:** DETR (facebook/detr-resnet-50, Hugging Face) run on this photo by scripts/run_models.py.

## match-why: Training: which prediction should learn which dog? (optional)

**Build 1:** Training photo: two annotated dogs. DETR made 100 predictions. Which prediction is compared with which dog?

- Ask: How many predictions and how many targets?
- Expected: 100 predictions, 2 targets.

**Build 2:** Score every pairing with a cost: low when the prediction has the right class and a box close to the target’s. Then pick, among all one-to-one pairings, the cheapest.

- Ask: What should make a pairing cheap?
- Expected: The right class with high probability, and a box close to the target box.

**Transition:** The cost needs one more box measure.

**Source:** The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## giou: One more measure: generalised IoU (optional)

**Build 1:** IoU cannot tell a near miss from a far miss: both are 0. A loss built on IoU gives no direction to move.

- Ask: What is the IoU of any two non-overlapping boxes?
- Expected: 0.

**Build 2:** Generalised IoU subtracts the empty fraction of the smallest box C that encloses both. Far apart, C is mostly empty and GIoU approaches −1.

- Ask: What does the second term measure?
- Expected: How much of the enclosing box is empty.

**Build 3:** Real example: query 98 predicts the right dog; against the left dog its IoU is 0 but its GIoU is −0.529.

- Ask: What is GIoU for identical boxes?
- Expected: 1: IoU is 1 and C equals the union.

**Point here:** GIoU: Rezatofighi et al., 2019. The two example values on the left are for the drawn boxes.

**Transition:** The cost of one pairing.

## cost-one: The cost of one pairing: query 61 and the left dog (optional)

**Build 1:** DETR’s matching cost has three parts: minus the probability of the target’s class, the L1 distance between boxes, and minus the GIoU. Weights 1, 5 and 2.

- Ask: Which part rewards the right class?
- Expected: −p(class): a higher probability lowers the cost.

**Build 2:** Query 61 gives “dog” probability 0.999: the class part is −0.999.

- Ask: What are the L1 distance and GIoU here?
- Expected: 0.004 and 0.984.

**Build 3:** Its normalised box differs from the left dog’s by 0.004 in total (L1), and GIoU is 0.984.

- Ask: What is the total?
- Expected: −2.95

**Build 4:** Total −2.95. Low cost = good pairing; negative is fine, only comparisons matter.

- Ask: Is a negative cost a problem?
- Expected: No: only which pairing is cheapest matters.

**Point here:** Weights from DETR’s code (set_cost_class 1, set_cost_bbox 5, set_cost_giou 2). Boxes are normalised (c_x, c_y, w, h).

**Transition:** Every pairing.

**Source:** DETR (facebook/detr-resnet-50, Hugging Face) run on this photo by scripts/run_models.py.

## cost-matrix: Fill the table: the cost of every pairing (optional)

**Build 1:** Row 1: the left dog against four of the queries. q61 is cheapest; q2 is second: its box is on the left dog too.

- Ask: Which query is cheapest for the left dog?
- Expected: q61, −2.95.

**Build 2:** Row 2: the right dog. q98 is cheapest.

- Ask: For the right dog?
- Expected: q98, −2.90.

**Build 3:** Choose one query per dog with the lowest total: q61 and q98. Here each dog’s cheapest query is different, so the choice is easy. It is not always.

- Ask: Which queries learn “no object”?
- Expected: All 98 others, including q2 and q90.

**Point here:** q2’s box also sits on the left dog (cost −1.71), but it says “no object”: the class term makes q61 cheaper.

**Transition:** When is the choice not easy?

**Source:** DETR (facebook/detr-resnet-50, Hugging Face) run on this photo by scripts/run_models.py.

## greedy: Why not let each object grab its cheapest slot? (optional)

**Build 1:** A made-up two-by-two case. Greedy: the left dog grabs q1, its cheapest at 1; the right dog is stuck with q2 at 9. Total 10.

- Ask: What does greedy pick, and what does it cost?
- Expected: q1 for the left dog, q2 for the right: 10.

**Build 2:** The other pairing costs 2 + 2 = 4. Grabbing the cheapest first was wrong for the total.

- Ask: What is the best total?
- Expected: 4.

**Build 3:** The best pairing must be found globally. The Hungarian algorithm does it efficiently; scipy has it.

- Ask: How many pairings are there for 2 objects and 100 queries?
- Expected: 100 × 99 = 9,900; for 20 objects about 10³⁹. Enumeration is out; Hungarian runs in O(n³).

**Point here:** These four costs are invented to show the failure; the DETR costs on the previous slide had no conflict.

**Transition:** After matching: the loss.

## match-loss: After matching: the loss (optional)

**Build 1:** A matched query learns its object: cross-entropy for the class, plus L1 and 1 − GIoU for the box. q61 is already almost perfect: tiny loss.

- Ask: What does a matched query learn?
- Expected: Its object’s class and box.

**Build 2:** An unmatched query learns “no object”, its cross-entropy weighted by 0.1 because most queries are empty. q2 already says no object: almost no loss.

- Ask: What does an unmatched query learn, and why the weight 0.1?
- Expected: “No object”; 0.1 keeps the ~98 empty queries from dominating.

**Build 3:** q90 named a real plant, but plants are not in this target list, so it pays 0.58 for being right.

- Ask: Why is q90 penalised?
- Expected: It found an object the annotation leaves out.

**Point here:** Our target list holds only the two dogs, so the loss would teach q90 to call the pot nothing. What is annotated decides what is learned; COCO does label potted plants.

**Transition:** Why does this remove duplicates?

**Source:** DETR (facebook/detr-resnet-50, Hugging Face) run on this photo by scripts/run_models.py.

## why-no-nms: Why DETR needs no NMS (optional)

**Build 1:** Matching is one-to-one: in every training step, a duplicate query is told “no object”. The network learns not to duplicate, using self-attention among queries.

- Ask: What happens in training to a second query that predicts an already-matched object?
- Expected: It is matched to nothing, so its target is “no object”.

**Build 2:** The dense detector trained ten cells per object on purpose (more positives, more signal) and pays for it with NMS.

- Ask: Why does YOLO train several cells per object?
- Expected: More positives give more training signal and robustness; the price is duplicates.

**Point here:** YOLOv10 (2024) trains both: a one-to-many head for signal and a one-to-one head used at test time, so it too runs without NMS.

**Transition:** DETR in code.

## detr-code: DETR in code: matching, then inference (optional)

**Build 1:** The cost matrix is three lines: class, L1 and GIoU for every (query, object) pair. One call solves the matching. The loss then uses the matched pairs.

- Ask: What shape is the cost matrix for 100 queries and N objects?
- Expected: (100, N).

**Build 2:** At test time there is nothing to match: run the model, keep the queries whose best class beats a threshold. There is no NMS step.

- Ask: What replaces NMS at test time?
- Expected: A threshold on each query’s class probability.

**Notebook:** Notebook appendix A runs DETR on the two-dogs photo, builds this cost matrix and checks the matching against brute force.

**Transition:** Two answers side by side.

## two-answers: Two answers to one question (optional)

**Build 1:** The main difference is how outputs are assigned to objects in training: by place, several per object, or by matching, one per object.

- Ask: Where does each method decide which output answers for which object?
- Expected: YOLO: by cell position in training; DETR: by Hungarian matching in training.

**Build 2:** Both solve the lecture’s question with a fixed tensor plus a way to say “nothing here”, and both score well on our photos.

- Ask: What plays the role of “no object” in YOLO?
- Expected: Low class scores, removed by the score filter.

**Point here:** DETR trained for 500 epochs on COCO; Deformable DETR, DINO and RT-DETR made such models faster to train and real-time.

**Transition:** End of Appendix A. Appendix B: more depth.

## fc-conv: One pass for every window, step 1: dense layers as convolutions (optional)

**Build 1:** A toy classifier for 14 × 14 crops, drawn as blocks of numbers: a convolution, a max pool, two dense layers of 400 units, then 3 answers.

- Ask: How many numbers does the 5 × 5 × 16 block hold?
- Expected: 5 × 5 × 16 = 400.

**Build 2:** Write the first dense layer as 400 filters of 5 × 5 × 16. Each one covers the whole block, so it sees all 400 inputs, like one dense unit.

- Ask: What does one 5 × 5 × 16 filter compute on that block?
- Expected: A weighted sum of all 400 numbers plus a bias: exactly one dense unit.

**Build 3:** The other two dense layers become 1 × 1 convolutions. The weights and the answers do not change, but a network of convolutions accepts a bigger image.

- Ask: What changes if the input is bigger than 14 × 14?
- Expected: A dense layer would break, since it expects exactly 400 inputs. Convolutions just slide further and give more outputs.

**Point here:** Ng, “Convolutional Implementation of Sliding Windows” (Course 4, Week 3): 14 × 14 × 3 → 10 × 10 × 16 → 5 × 5 × 16 → FC 400 → FC 400 → softmax, turned into 400 filters of 5 × 5 × 16, then 1 × 1 convolutions. He has 4 outputs (pedestrian, car, motorcycle, background); we use 3 to match our classifier.

**Transition:** Now give it a bigger image.

## conv-windows: One pass for every window, step 2: four answers at once (optional)

**Build 1:** Give the same network a 16 × 16 image. The top-left 14 × 14 window flows through exactly as before and ends in the top-left output.

- Ask: Where does the top-left window’s answer end up?
- Expected: In the top-left of the 2 × 2 output.

**Build 2:** The window 2 pixels to the right moves 2 cells in the first layer and 1 after pooling. Its answer is the top-right output.

- Ask: Where does the window 2 pixels to the right end up?
- Expected: In the top-right output: 2 cells to the right after the convolution, 1 after the 2 × 2 pool.

**Build 3:** Four windows, four answers, from one pass. Where the windows overlap, each convolution is computed once instead of four times.

- Ask: How many times is each overlapping pixel processed?
- Expected: Once, instead of once per window that contains it.

**Build 4:** A bigger example: a 28 × 28 image gives 8 × 8 answers, 64 windows 2 pixels apart. The step is 2 because of the max pool.

- Ask: Why are the windows 2 pixels apart?
- Expected: The 2 × 2 max pool halves the size, so one output step is 2 input pixels.

**Point here:** Ng colours the four windows blue, green, orange and purple and follows them to the four outputs (Sermanet et al., OverFeat, 2014). In his drawing the 400-deep layers are flat squares; so are ours.

**Transition:** The same trick on our photo.

## conv-photo: The same trick on our photo: all 336 windows in one pass (optional)

**Build 1:** On our photo: VGG16, an ImageNet classifier for 224 × 224 crops, with its dense layers written as convolutions. One pass gives 24 × 14 answers.

- Ask: How many answers does one pass give?
- Expected: 24 × 14 = 336: the same windows as the 336 crops.

**Build 2:** Each answer belongs to one window and is drawn at the window’s centre. Windows over the dog say dog; windows over the cat say cat.

- Ask: Which windows say dog?
- Expected: Every window that holds a good part of the dog, even just its head.

**Build 3:** On this laptop one pass takes 0.8 s; the 336 separate crops take 29 s. The two agree on 317 of the 336 windows.

- Ask: Why do a few windows disagree with their crop?
- Expected: VGG16 pads its convolutions with zeros: a crop sees zeros at its edges, while in the whole photo the same window sees its neighbours’ pixels.

**Point here:** VGG16 (IMAGENET1K_V1) on the CPU, the crops run in batches of 16; its three dense layers become a 7 × 7 convolution and two 1 × 1 convolutions. The dog score adds up ImageNet’s 118 dog breeds and the cat score its 5 cat classes. “Same answer”: both say dog, both say cat, or both say neither, at 0.5. Ng’s toy has no padding, so there the two are exactly equal.

**Transition:** Their boxes are still only the windows: Part 5 goes on from there.

**Source:** VGG16 (torchvision, ImageNet) run on this photo by scripts/run_models.py; timed on a laptop CPU. The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## opt-yolov1: YOLOv1 (2016): one responsible cell per object (optional)

**Build 1:** Why did YOLOv1 struggle with flocks of birds?

- Ask: Why did YOLOv1 struggle with flocks of birds?
- Expected: Each cell had one class vector: several small objects with centres in one cell could not all be described.

## opt-ltrb: YOLOv8’s box: four distances from the cell centre (optional)

**Build 1:** Stand at the centre of cell (10, 18): column 18 and row 10, plus a half, times 32 pixels.

- Ask: Where is the centre of cell (10, 18)?
- Expected: (592, 336).

**Build 2:** Left: how far to the box’s left edge. 592 − 407 = 185 pixels.

- Ask: What is l?
- Expected: 185

**Build 3:** Top: 336 − 83 = 253.

- Ask: What is t?
- Expected: 253

**Build 4:** Right: 768 − 592 = 176.

- Ask: What is r?
- Expected: 176

**Build 5:** Bottom: 588 − 336 = 252. Like standing in a room and measuring the distance to each wall: four numbers fix the box.

- Ask: How would you get the box back from (l, t, r, b)?
- Expected: x₁ = 592 − l, y₁ = 336 − t, x₂ = 592 + r, y₂ = 336 + b.

**Point here:** This is the anchor-free form of FCOS (2019) and YOLOv8 (2023). YOLOv1 (2016) instead predicted the centre’s offset inside the cell and the box’s width and height: optional slide.

**Source:** The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## record-84: YOLOv8n’s record: 80 classes, and no “object?” (optional)

**Build 1:** YOLOv8n knows the 80 COCO classes, so its record has the 4 box numbers and 80 class scores: 84 numbers per cell.

- Ask: How many numbers does each cell write?
- Expected: 84: 4 for the box and 80 class scores.

**Build 2:** It drops “object?”: a cell says “nothing here” by giving every class a low score.

- Ask: How does a cell say “nothing here”?
- Expected: By giving all 80 classes a low score.

**Build 3:** The whole output, for any photo this size: 30 × 20 × 84 numbers, written in one pass.

- Ask: How many numbers does the whole grid write?
- Expected: 30 × 20 × 84 = 50,400.

**Point here:** YOLOv1 to YOLOv5 kept an object score like Ng’s p_c; YOLOv8 folds it into the class scores.

**Transition:** Now what the trained network wrote at the dog’s cell.

**Source:** The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## prediction-record: What the trained network wrote at cell (10, 18) (optional)

**Build 1:** The real network’s scores at this cell: dog a little below its target of 1, every other class near its target of 0.

- Ask: How far is each class score from its target?
- Expected: Dog: 1 − 0.871 = 0.129 too low; the others are near 0, their target.

**Build 2:** Its box, in cell units, is close to the target too. The loss turns all these differences into one number to reduce.

- Ask: Which box number is furthest off?
- Expected: b_h: 16.015 against 15.781, 0.234 cells.

**Point here:** YOLOv8n’s box at this cell is (588.42, 331.88, 362.35, 512.49) in pixels, centre and size; divided into cell units as on the previous slides.

**Transition:** The class part of the loss.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## bce: Scoring one yes/no answer: binary cross-entropy (optional)

**Build 1:** A class score answers one yes/no question. If the answer is yes, the loss is −log p; if no, −log(1 − p), the same curve mirrored.

- Ask: What is the loss for a yes answered with p = 1?
- Expected: 0: −log 1 = 0.

**Build 2:** For a yes: sure and right costs almost nothing; unsure (0.5) costs 0.69; sure and wrong (0.1) costs 2.30. Our dog cell, 0.871: 0.139.

- Ask: Why does the curve shoot up near p = 0?
- Expected: Being confidently wrong is punished hardest: −log p grows without bound as p → 0.

**Point here:** The two cases are one formula: BCE(p, y) = −[y log p + (1 − y) log(1 − p)].

**Transition:** Apply it to all 80 questions at our cell.

## loss-cells: The loss at two cells: the dog’s, and an empty one (optional)

**Build 1:** At the dog’s cell, the class part: dog is a yes, so −log 0.871. The other 79 are near-certain noes and add almost nothing.

- Ask: Where does most of the dog cell’s class loss come from?
- Expected: From the dog question: −log 0.871 = 0.139.

**Build 2:** The box part: the L1 distance between the predicted and the target box numbers, in cells, as in Part 4.

- Ask: How is the box part computed?
- Expected: Four absolute differences: 0.029 + 0.113 + 0.042 + 0.234 = 0.418.

**Build 3:** At an empty cell there is no box to compare, only the class part, and it is tiny: every class there is already near 0.

- Ask: Why is there no box term at an empty cell?
- Expected: There is no object there, so no box to compare with.

**Point here:** Ng’s localiser used squared errors throughout; detectors today use binary cross-entropy for the classes and an L1 or IoU-based box loss.

**Transition:** Put the pieces together.

## loss-total: The loss for the whole photo, on the real grid (optional)

**Build 1:** The loss for the photo: class terms from every cell, box terms only from the cells that hold an object.

- Ask: Which cells add class terms? Box terms?
- Expected: Every cell; only the object cells.

**Build 2:** Count them for our photo. The 598 empty cells still matter: they learn to say nothing.

- Ask: How many class terms are there?
- Expected: 600 × 80 = 48,000.

**Build 3:** Every cell uses the same weights, so every cell learns from every object in every photo.

- Ask: Why does every cell learn from the dog?
- Expected: The weights are shared: the same layers write every cell’s record.

**Point here:** Real detectors weight the two parts and average over objects: YOLOv1 used 5 for the box terms and 0.5 for empty cells. YOLOv8’s loss has the same structure over its three grids.

**Transition:** At test time there are no annotations: read the boxes out.

## opt-two-stage: Two-stage detectors: propose, then classify (optional)

**Build 1:** What does the first stage output?

- Ask: What does the first stage output?
- Expected: Class-agnostic candidate boxes (proposals), to be classified by the second stage.

## opt-focal: Focal loss: quiet the easy background (optional)

**Build 1:** Which examples does focal loss down-weight?

- Ask: Which examples does focal loss down-weight?
- Expected: Easy ones, where p_t is close to 1: mostly background.

## opt-formats: Box formats in practice (optional)

**Build 1:** Why do format bugs often go unnoticed?

- Ask: Why do format bugs often go unnoticed?
- Expected: Every format is four numbers; a model still trains, just badly. Draw your boxes on the image before training.

## opt-letterbox: Resizing and padding move the boxes too (optional)

**Build 1:** What happens to the dog’s y₁ = 83 after this letterbox?

- Ask: What happens to the dog’s y₁ = 83 after this letterbox?
- Expected: ⅔ × 83 + 106 ≈ 161.

## opt-detr-family: After DETR (optional)

**Build 1:** What did DETR’s successors mainly improve?

- Ask: What did DETR’s successors mainly improve?
- Expected: Training speed and small objects (deformable attention, multi-scale features, better query initialisation).

## street-eval: Real detections: people in the street photo (optional)

**Build 1:** We keep every person detection down to a score of 0.01, so that the wrong ones show up too.

- Ask: How many annotated people?
- Expected: Four.

**Build 2:** The four most confident boxes each land on a different person.

- Ask: Which detections are true positives?
- Expected: The top four, each with IoU above 0.9.

**Build 3:** The rest sit on the car’s windscreen, where nobody is.

- Ask: What are the low-scoring boxes?
- Expected: False positives on the car: the network half-sees a driver.

**Transition:** Turn the counts into precision and recall.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## pr-street: The street’s people at two score cut-offs (optional)

**Build 1:** With the usual 0.25 score cut-off, the street photo is perfect: four people found, nothing extra. Precision 1, recall 1.

- Ask: What are precision and recall at 0.25?
- Expected: Both 1.

**Build 2:** Keep everything down to 0.01 and the 8 windscreen boxes join: recall stays 1, precision drops to 0.33. The cut-off trades one for the other.

- Ask: What happens at 0.01?
- Expected: Precision falls to 0.33; recall stays 1.

**Transition:** Now the other direction: Part 1’s bird.

## bird-threshold: Back to the bird: a lower cut-off finds it (optional)

**Build 1:** At the usual 0.25: the cat and the dog are found, the bird (0.098) is missed. Precision 1, recall 2/3.

- Ask: What do precision and recall say at 0.25?
- Expected: Precision 1, recall 2/3: everything reported was right, but the bird was missed.

**Build 2:** At 0.05 the bird’s box gets through: recall 3/3, and nothing false comes with it. On the street, going lower brought eight false people.

- Ask: Should we always lower the cut-off?
- Expected: It depends on what a miss costs against a false alarm: a camera trap counting rare birds wants recall; a car that brakes for every false person wants precision.

**Point here:** Only the seven annotated classes count here; the potted plants are ignored, as in the benchmark.

**Transition:** AP on all the real person boxes.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## ap-play: Try it: AP on real detections (optional)

**Build 1:** YOLOv8n’s 38 person detections on our eight photos, ranked by score, against 17 people. Raise the IoU threshold: from 0.85, loose boxes turn into false positives.

- Ask: At which IoU threshold does AP first drop below 1?
- Expected: At 0.85: a few boxes overlap their person with an IoU between 0.80 and 0.85.

**Point here:** The AP here reads the envelope at 101 recall values, as COCO does. The mean of the ten thresholds is 0.919, the person AP of the next slides.

**Transition:** One of those boxes, up close.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## map-iou-real: Real detections: COCO’s ten IoU thresholds on a 13-pixel pedestrian (optional)

**Build 1:** Part 1’s 13-pixel pedestrian: YOLOv8n’s box is a pixel off, IoU 0.87. A true positive up to a threshold of 0.85; a false positive at 0.90 and 0.95.

- Ask: Why does a one-pixel slip matter so much here?
- Expected: The pedestrian is 13 pixels wide: one pixel is almost a tenth of its width.

**Build 2:** Person AP at each of COCO’s ten thresholds: 1 up to 0.80, then 0.84, 0.79, 0.56, as boxes that are slightly loose stop counting.

- Ask: Why does AP fall only at the strict thresholds?
- Expected: Every person is found with IoU above 0.8; only some boxes are tighter than 0.85, 0.90 or 0.95.

**Build 3:** COCO’s headline AP averages the ten: 0.919. It rewards boxes that are tight, not just roughly right.

- Ask: What does averaging over thresholds reward?
- Expected: Tight boxes: a box that is only roughly right counts at 0.5 but not at 0.9.

**Point here:** COCO calls this AP (or AP@[.50:.95]); AP50 and AP75 are the values at 0.50 and 0.75. Small objects suffer most, because a pixel is a large share of their size; COCO also reports AP for small, medium and large objects.

**Transition:** Average over the classes too.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## apps-again: Back to the six jobs: the three everyday ones (optional)

**Build 1:** A pretrained COCO detector already knows these classes. What is hard in each job?

- Ask: What makes each of these jobs hard?
- Expected: Tiny far pedestrians; people who overlap; small animals with unsure scores.

**Build 2:** What remains is tuning: the grids, the NMS threshold, the score cut-off.

- Ask: What would you change for each?
- Expected: Rely on the fine grid; check the NMS threshold; lower the score cut-off.

**Transition:** The three specialist jobs.

## apps-new: Back to the six jobs: the three new ones (optional)

**Build 1:** COCO has none of these classes, so no pretrained detector finds them as it is.

- Ask: Could a COCO detector do these jobs as it is?
- Expected: No: their classes are not among COCO’s 80.

**Build 2:** Label a few hundred photos with boxes, fine-tune the same detector, and measure precision and recall on photos it has not seen.

- Ask: What would you do first for the microscope job?
- Expected: Annotate cells with boxes, fine-tune a pretrained detector on them, and measure precision and recall.

**Point here:** Fine-tuning starts from COCO weights: the CNN already knows edges, textures and shapes; only the heads must learn the new classes.

**Transition:** Next lecture.

## next: Next: beyond boxes (optional)

**Build 1:** Boxes are the coarsest description of where an object is. Next: masks, keypoints, and finding objects named in words.

- Ask: What does a mask give that a box does not?
- Expected: Exactly which pixels are the object.

**Transition:** End of the main route.

**Source:** Masks: YOLOv8n-seg run on the photo (scripts/run_models.py).

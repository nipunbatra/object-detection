# Object detection: speaker notes

Planned main route: 110 minutes, including student responses. Optional slides are outside this budget.

## Pacing

| Part | Minutes |
|---|---:|
| Lecture map | 1 |
| Part 1 · Why detect objects? | 12 |
| Part 2 · From one label to a list | 9 |
| Part 3 · Boxes and IoU | 14 |
| Part 4 · One box, then many | 10 |
| Part 5 · A candidate at every place | 26 |
| Part 6 · One box per object: NMS | 13 |
| Part 7 · Three grids for three sizes | 6 |
| Part 8 · Measuring a detector | 14 |
| Wrap-up | 5 |

## title: Object detection: from one label to a set of objects

**Build 1:** The real output of a small detector, YOLOv8n, on today’s photo: four objects, each with a class, a score and a box.

- Ask: What did the detector return for this photo?
- Expected: Four entries: a cat, a dog and two potted plants, each with a box and a score.

**Point here:** Point at one entry at a time: class, score, box. Keep this photo in view; every later number comes from it.

**Transition:** Why would anyone want such a list? Six jobs.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## part-1: Part 1 · Why detect objects?

**Build 1:** Why detection matters: six jobs, one kind of answer, three difficulties.

- Ask: Where have you seen a computer draw boxes around things?
- Expected: Phone cameras (faces), driver-assistance demos, traffic cameras, photo apps that find people or pets.

**Transition:** The first job: a street.

## app-road: On the road: who is where?

**Build 1:** A car’s camera sees this street. Before it brakes or steers, what does it need to know?

- Ask: What does the car need to know?
- Expected: Who is on the road, and where each one is.

**Build 2:** YOLOv8n’s answer: 4 people, a car, a bicycle and a dog, each with a box and a score. This list is what the car acts on.

- Ask: What does the detector give it?
- Expected: 7 entries: four people, a car, a bicycle, a dog, each with a box and a score.

**Point here:** IIHS (2022), “Pedestrian crash avoidance systems cut crashes, but not in the dark”. In India, AI traffic cameras flag riders without helmets and triple riding: Kerala installed 726 road cameras, 675 of them AI-capable, in 2023 (The South First).

**Transition:** A crowd.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## app-crowd: In a crowd: how many people?

**Build 1:** How many people are on this path? Count them.

- Ask: How many people are there?
- Expected: 11.

**Build 2:** YOLOv8n boxes 11 people. The count is the length of the list, and the list also says where each person is.

- Ask: How does the detector’s answer give the count?
- Expected: It is the number of person entries in the list: 11.

**Point here:** YOLOv8n also boxes 5 bags (backpacks and handbags), not drawn here. Very dense crowds are usually counted by density estimation instead of boxes, because heads hide one another: Maha Kumbh 2025 used AI-enabled CCTV to estimate people per square metre (PIB, 2024).

**Transition:** A camera in the wild.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## app-wild: At a camera trap: which animals walked past?

**Build 1:** A camera trap takes a photo whenever something moves. Which animals are in this one?

- Ask: Which animals are in the photo?
- Expected: A cat, a dog, and a small yellow bird on the branch.

**Build 2:** YOLOv8n: a cat (0.94) and a dog (0.93). Look again at the photo: did it find every animal? We come back to this in a few slides.

- Ask: Did the detector find them all?
- Expected: No: the bird is missing (section 1.3).

**Point here:** YOLOv8n also boxed two potted plants (0.86, 0.84), not drawn: this job ignores them. Celis et al., Ecological Informatics 81 (2024) 102578: 46 cameras in Finnmark and Yamal; manual checking cut to 9.2% and 3.9% of the photos.

**Transition:** A microscope.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## app-cells: Under a microscope: count the cells

**Build 1:** Stained cells under a microscope. What would a lab want to know?

- Ask: What would a lab want from this photo?
- Expected: How many cells, where each is, and what type each one is.

**Build 2:** 12 cells, each boxed. These teal boxes are ours: COCO has no class “cell”, so no detector in this lecture knows one. A cell detector is trained on lists exactly like this.

- Ask: Who drew these boxes, and why does it matter?
- Expected: We did, from the colours, checked by eye. Such hand-made lists are the training data a cell detector would learn from.

**Point here:** Teal boxes are annotations (made by people); purple boxes are a model’s output. The lecture keeps these colours throughout.

**Transition:** A warehouse.

**Source:** Boxes drawn by us (data/applications.json): COCO has no such class, so no detector here can find it. The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## app-parcel: In a warehouse: where is the parcel?

**Build 1:** A robot arm waits at the end of the belt. What must it know to pick the parcel up?

- Ask: What does the arm need to know?
- Expected: Where the parcel is, and roughly how big.

**Build 2:** One entry: a parcel, 486 × 315 pixels. The arm aims at the box’s centre, the dot; a counter just counts entries.

- Ask: Where should it aim?
- Expected: At the centre of the box, (684, 347.5).

**Transition:** A factory.

**Source:** Boxes drawn by us (data/applications.json): COCO has no such class, so no detector here can find it. The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## app-crack: On a production line: is anything wrong?

**Build 1:** A freshly machined part. Look closely: is anything wrong?

- Ask: Is anything wrong with the part?
- Expected: A thin crack runs along the top of the arm.

**Build 2:** A hairline crack on the arm, inside a box 90 × 72 pixels. The box tells the inspector exactly where to look.

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

**Build 1:** One photo, a bus 502 pixels wide.

- Ask: How wide is the bus?
- Expected: 502 pixels.

**Build 2:** And a pedestrian 13 pixels wide, far down the road: 39 times narrower. A classifier sees one main thing; a detector must handle both sizes at once.

- Ask: How much smaller is the pedestrian, and why does it matter?
- Expected: About 39 times narrower: a feature that sees the whole bus is far too coarse for the pedestrian.

**Point here:** Part 7 shows how a detector handles this: predictions from three grids of different cell sizes.

**Transition:** Small objects are easy to miss.

**Source:** Boxes: our annotation (data/annotations.json). The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## hard-small: Hard, 2: small objects are easy to miss

**Build 1:** Back to the camera trap. YOLOv8n reports a cat, a dog and two plants. Where is the bird?

- Ask: Which animal is missing?
- Expected: The bird on the branch.

**Build 2:** Zoom in. The bird is 50 × 43 pixels. One cell boxed it almost perfectly, IoU 0.91, but gave “bird” a score of only 0.098, so it was dropped.

- Ask: Did the network fail to see the bird at all?
- Expected: No: it drew a good box (IoU 0.91) but was unsure of the class (0.098).

**Build 3:** That cell’s second guess was “banana” at 0.059. Few pixels, little detail: small objects get low, unsure scores.

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

**Build 1:** Part 1: what detection is for. Part 2: why a network finds a list hard to produce.

- Ask: In one sentence, what does a detector return?
- Expected: A list with one entry per object: its class, its box and a score.

**Point here:** The long tail: Karpathy (Tesla, ScaledML 2020) showed stop signs held by road workers, on school buses and half hidden by leaves; each kind needed its own labelled examples before the detector handled it.

**Transition:** Part 2.

## part-2: Part 2 · From one label to a list

**Build 1:** From one label to a list of (class, box) entries.

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

**Build 3:** Second entry: cat. Two objects, two entries. A photo with five objects gets five.

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

**Point here:** CS231n (Stanford, 2016–17) frames detection the same way: one object needs 4 numbers, two need 8, four need 16, so detection needs a variable-sized output.

**Transition:** The route through the rest of the lecture.

## route: Today’s route: build a detector step by step

**Build 1:** First the tools (Part 3), then a network that outputs boxes, to see exactly where a fixed output breaks (Part 4).

- Ask: What tools will every later part need?
- Expected: A box format and an overlap measure (IoU).

**Build 2:** Then the answer used by YOLO and most fast detectors: a candidate at every place, cleaned up by NMS, at three sizes; and how to measure the result.

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

**Build 1:** Every position is a pair of pixel counts from the top-left corner: x to the right, y downwards. This photo is 960 × 640.

- Ask: Where is the origin, and which way does y grow?
- Expected: Top-left; y grows downwards, unlike a school graph.

**Build 2:** The dog’s top-left corner is at (407, 83); its bottom-right corner at (768, 588).

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

**Build 2:** Read a line: a class number (COCO counts from 0: 15 is cat, 16 is dog), then the box’s normalised centre and size. Training a detector means learning to write these lines.

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

**Build 2:** The same 72-pixel slip leaves the guess off the person entirely. For the dog it was a small error; here it is a miss. Compare overlap, not distance.

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

**Build 3:** It ends where the first box ends: the smaller right edge and the smaller bottom edge.

- Ask: Why the smaller right edge?
- Expected: A point must be left of both right edges.

**Build 4:** Its area: 301 × 465 = 139,965 square pixels. (If a width came out negative, the boxes would not touch: area 0.)

- Ask: What is the overlap’s area?
- Expected: 139,965 px².

**Common misconception:** Clamp the width and height at zero: two boxes far apart would otherwise give a “negative overlap” whose product can be positive.

**Transition:** Now the union.

**Source:** The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## iou-union: IoU, step 2: the union, then the ratio

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

**Build 1:** Drag the purple box. Can you find a box with IoU 0.5 that looks good? One with IoU 0.7 that looks bad?

- Ask: Where must the box be for IoU to be 1?
- Expected: Exactly on the teal box: “Snap onto the dog”.

**Point here:** Shrink the box inside the dog: IoU falls even though every purple pixel is on the dog. IoU punishes too small as much as too big.

**Transition:** In code, IoU is computed for many pairs at once.

## iou-code: IoU in code: every pair at once

**Build 1:** The same three steps, for N boxes against M boxes at once: max of the starts, min of the ends, clamp at zero, divide.

- Ask: What shape does box_iou return for 31 boxes against 2?
- Expected: (31, 2): every pair.

**Build 2:** On our two boxes: 0.6230. torchvision.ops.box_iou returns the same N × M matrix.

- Ask: What does clamp(min=0) do?
- Expected: Sets the width or height of a non-overlap to 0, so its area is 0.

**Notebook:** Notebook part 3 runs this on the two boxes and checks it against torchvision.ops.box_iou.

**Transition:** Part 3 in one slide.

## recap-3: Part 3 in one slide

**Build 1:** Part 3: boxes and IoU. Part 4: a network that outputs boxes.

- Ask: What is the IoU of two identical boxes, and of two boxes that do not touch?
- Expected: 1 and 0.

**Transition:** Part 4.

## part-4: Part 4 · One box is easy; several are not

**Build 1:** One box is regression; several boxes expose the assignment problem.

- Ask: What could go wrong with two objects and one box output?
- Expected: The network cannot know which object to describe; it may average them.

**Transition:** One object first.

## one-object: One object: a box head beside the class head

**Build 1:** A classifier: a CNN turns the photo into one feature vector; a linear layer turns it into class scores.

- Ask: What does the box head output?
- Expected: Four numbers, for example a normalised (c_x, c_y, w, h).

**Build 2:** Add a second small layer on the same vector that outputs four numbers: the box.

- Ask: Which part is shared?
- Expected: The CNN and its feature vector.

**Build 3:** Train both at once: cross-entropy for the class, and a loss that compares the four box numbers with the annotation’s.

- Ask: What could the box loss be?
- Expected: Any distance between the four predicted and four true numbers, such as the sum of absolute differences.

**Transition:** What exactly should the network learn to write?

## target-y: Write the answer as numbers: the target for one photo

**Build 1:** A localiser for two classes, cat and dog, writes seven numbers: is there an object; its box (normalised centre and size); and which class. For this photo: 1, the cat’s box, cat 1, dog 0.

- Ask: What are the seven target numbers for the cat photo?
- Expected: 1; then (0.667, 0.527, 0.319, 0.642); then cat 1, dog 0.

**Build 2:** A photo of empty floor. “Object?” is 0. Its box and class have no right answer, so the target there is “?”.

- Ask: What should the box be for a photo with no object?
- Expected: Nothing: there is no box, so we do not care what the network writes there.

**Build 3:** The loss counts only entries that have a right answer: for the floor, just the first. Keep this “?” in mind: a detector writes it at most places in a photo.

- Ask: Which entries does the loss use for the floor photo?
- Expected: Only “object?”, with target 0.

**Point here:** This is how Andrew Ng introduces localisation (Deep Learning Specialization, Course 4, Week 3): y = (p_c, b_x, b_y, b_h, b_w, c_1, c_2, c_3), with “?” for every entry after p_c = 0.

**Transition:** Train the box part, with numbers.

**Source:** Our annotation of the single-cat photo (data/annotations.json). The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## box-loss: Training the box head: compare four numbers

**Build 1:** The L1 box loss: for each of the four numbers, the absolute difference between prediction and target; add them.

- Ask: What does the loss add up?
- Expected: Four absolute differences.

**Build 2:** Take the 60-px guess from Part 3 as the prediction, in normalised units. The centre is off; the size is right.

- Ask: Which numbers differ here?
- Expected: The centre (c_x and c_y); width and height match.

**Build 3:** Loss 0.125. It is zero only if all four numbers match; gradient descent moves the four outputs toward the target.

- Ask: When is the loss zero?
- Expected: When all four predicted numbers equal the target’s.

**Point here:** Normalised units keep the four terms on one scale; the notebook trains exactly this head on single-object images.

**Transition:** Now two animals.

## two-objects: Two animals, one box: which one should it draw?

**Build 1:** One box head, two animals. Which should it draw?

- Ask: Which animal should the single box describe?
- Expected: There is no right answer: the task is ill-posed.

**Build 2:** If some annotations list the dog first and some the cat, a squared error is smallest for the average of the two boxes: the network learns to hedge.

- Ask: What does a squared-error loss learn when the target flips between two boxes?
- Expected: The average of the two boxes, the value that minimises the expected squared error.

**Build 3:** The average box has IoU 0.23 with the dog and 0.11 with the cat. A box between two objects describes neither.

- Ask: Does the average box find either animal?
- Expected: No: IoU 0.23 and 0.11, both far below 0.5.

**Common misconception:** More training does not fix it: the hedge is the optimum of this loss for this task.

**Transition:** Give the head more than one output.

**Source:** The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## k-slots: Give the head K slots

**Build 1:** Give the head K slots instead of one. Each slot writes a class and a box. Two animals: two slots used.

- Ask: How many numbers does the head output for K = 5 and C = 80?
- Expected: 5 × (80 + 1 + 4) = 425.

**Build 2:** The other slots must be able to say “nothing here”: add a no-object class. Output size: K × (C + 1 + 4), fixed.

- Ask: What do unused slots predict?
- Expected: A “no object” class.

**Build 3:** Problem 1: what if a photo has more objects than K? Then choose K large: DETR (Appendix A) uses K = 100.

- Ask: How do we avoid running out of slots?
- Expected: Make K bigger than any photo needs, e.g. 100.

**Transition:** Problem 2 is harder: which object goes in which slot?

## slot-order: Problem 2: which dog belongs in slot 1?

**Build 1:** Two slots, two predictions: slot 1 drew the left dog, slot 2 the right dog. Both boxes are right.

- Ask: Are the two slots’ boxes correct?
- Expected: Yes, both dogs are well boxed.

**Build 2:** But the annotator happened to list the right dog first. Compare slot 1 with entry 1 and slot 2 with entry 2: the L1 loss, in normalised units, is 1.21.

- Ask: What is the loss if slot k is compared with entry k?
- Expected: 1.21: slot 1’s left-dog box is compared with the right dog.

**Build 3:** Compare them the other way round: 0.012.

- Ask: And with the order swapped?
- Expected: 0.012

**Build 4:** Nothing about the prediction changed, only the list order. A loss that pairs outputs with targets by position punishes correct answers.

- Ask: What must the loss do instead?
- Expected: Pair each output with the object it describes, whatever the list order.

**Point here:** The slot boxes are real predictions of a slot-based detector, DETR (Appendix A), for this photo (its queries 61 and 98); the L1 sums are over normalised (c_x, c_y, w, h).

**Transition:** Two ways to pair outputs with objects.

**Source:** DETR (facebook/detr-resnet-50, Hugging Face) run on this photo by scripts/run_models.py.

## two-fixes: Two ways to decide which output answers for which object

**Build 1:** Fix A: give every output a fixed place in the image. Whatever is at that place is its job. Then order cannot matter.

- Ask: How does fix A remove the order problem?
- Expected: An output answers for the object at its place; there is nothing to order.

**Build 2:** Fix B: keep free slots, and before each loss, match slots to objects so that the total cost is lowest. Then order cannot matter either.

- Ask: How does fix B?
- Expected: The pairing is chosen by cost, not by position in the list.

**Transition:** Part 4 in one slide.

## recap-4: Part 4 in one slide

**Build 1:** Part 4: one box works; many boxes need a rule for which output answers for which object.

- Ask: Why did the same correct prediction cost 100 times more?
- Expected: Because the loss paired outputs with targets by list position, and the list happened to be in the other order.

**Transition:** Part 5.

## part-5: Part 5 · A candidate at every place

**Build 1:** A grid of cells, each writing a record: targets, loss, decoding.

- Ask: If every place in the image has its own output, which outputs should describe the dog?
- Expected: The ones at, or near, the dog’s location.

**Transition:** Start from a tool we already have: a classifier.

## crop-classifier: Start from a tool we have: a classifier for crops

**Build 1:** Three crops cut from the courtyard: a dog, a cat, and floor with nothing on it.

- Ask: What label does each crop get?
- Expected: Dog, cat, nothing.

**Build 2:** A classifier trained on thousands of such crops answers for one crop: dog, cat or nothing. It cannot say where anything is in a whole photo. Can we use it to find objects anyway?

- Ask: What can such a classifier not do on its own?
- Expected: Say where objects are in a large photo, or find two of them.

**Point here:** Andrew Ng’s detection lectures start the same way: a car classifier trained on closely cropped car images, then slid over the image.

**Transition:** Slide it over the photo.

**Source:** The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## sliding: Slide the classifier over the photo

**Build 1:** Put a window on the photo, crop it, classify it. This window says “dog”.

- Ask: What does the classifier say about this window?
- Expected: Dog.

**Build 2:** Move the window every 32 pixels: 30 positions across, 20 down, 600 windows.

- Ask: How many positions are there?
- Expected: 30 × 20 = 600.

**Build 3:** At each position try 3 sizes and 3 shapes: 5,400 crops per photo, each a full run of the classifier. It works, and it is slow.

- Ask: How many classifier runs per photo?
- Expected: 600 × 3 × 3 = 5,400.

**Point here:** Detectors around 2013 worked like this (OverFeat). R-CNN (2014) classified about 2,000 proposed crops per image and needed about 47 seconds per image at test time (CS231n, 2017): Appendix B, two-stage detectors.

**Transition:** Look at two neighbouring windows.

**Source:** The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## shared-work: Neighbouring windows see almost the same pixels

**Build 1:** Two neighbouring windows, 224 pixels wide and 32 pixels apart, share 86% of their pixels. Classifying them separately computes most features twice.

- Ask: How much do neighbouring windows overlap?
- Expected: 86%: 192 of every 224 columns.

**Build 2:** A convolution already slides the same small filter over every position. Run the CNN once on the whole photo and read one output per position: every window at once, with the shared work done once.

- Ask: How can the shared work be done only once?
- Expected: Run the CNN on the whole photo once; each position of its output plays the role of one window.

**Point here:** Ng calls this the convolutional implementation of sliding windows (after OverFeat, Sermanet et al., 2014): turn the classifier’s fully connected layers into convolutions and the whole photo is classified at every position in one pass.

**Transition:** One pass of a CNN.

**Source:** The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## one-pass: One pass of a CNN: a 30 × 20 grid of feature vectors

**Build 1:** The photo goes through a CNN that halves the resolution five times: 960 × 640 becomes 30 × 20, with 256 numbers at each position.

- Ask: What size is the feature map?
- Expected: 30 × 20 positions, 256 numbers each.

**Build 2:** Lay that 30 × 20 grid over the photo. Each square, a cell, stands for one position of the feature map: 600 cells, 600 “windows”.

- Ask: How many cells are there?
- Expected: 600.

**Point here:** For YOLOv8n this is the stride-32 output of the neck: one step of the map is 32 pixels of photo.

**Transition:** Zoom in on one cell.

## cell-window: One cell: an address on the photo, with a wide view

**Build 1:** Cell (10, 18) is a 32 × 32 block of pixels in the middle of the dog: column 18 starts at x = 576, row 10 at y = 320. Rows and columns count from 0.

- Ask: Which block of pixels does cell (10, 18) cover?
- Expected: x from 576 to 608, y from 320 to 352.

**Build 2:** But a cell is an address, not a crop: every layer of the CNN mixes in neighbours, so its vector sees far beyond its block. That is why one cell can describe a box much larger than itself.

- Ask: Can a cell describe an object larger than its block?
- Expected: Yes: its vector is computed from a large region of the photo (its receptive field).

**Common misconception:** A cell is not a 32-pixel crop that knows only its own pixels.

**Transition:** What does each cell write?

**Source:** The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## cell-record: Every cell writes a record: 4 box numbers, 80 class scores

**Build 1:** Cell (10, 18) writes four numbers that place a box: its distances to the box’s left, top, right and bottom edges.

- Ask: What do the four box numbers mean?
- Expected: Distances from the cell’s centre to the four sides of a box.

**Build 2:** And 80 scores, one per COCO class, each between 0 and 1. Here dog is 0.871; the other 79 are near zero.

- Ask: Why does every class get its own score?
- Expected: A cell answers 80 yes/no questions: is there a person? a dog? … All can be “no”.

**Build 3:** Part 4’s localiser had an “object?” number. YOLOv8 drops it: 80 independent yes/no scores, all low, already mean “no object”.

- Ask: How does a cell say “there is nothing here”?
- Expected: By giving every class a low score.

**Point here:** These are the real numbers YOLOv8n wrote at this cell. The head writes distances in cells; we show them ×32, in pixels. YOLOv1 to YOLOv5 did have a separate objectness score.

**Transition:** What the network actually returns.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## raw-output: What actually comes out: one tensor of fixed shape

**Build 1:** Run the real network on the courtyard photo and print the shape: 84 rows and 12,600 columns, one column per cell.

- Ask: What shape does YOLOv8n output for this photo?
- Expected: (1, 84, 12,600).

**Build 2:** Each column is one record: 4 box numbers (the head has already turned l, t, r, b into a centre and a size) and 80 class scores. 600 columns come from our 30 × 20 grid; the rest from two finer grids, in Part 7.

- Ask: Does the shape depend on how many objects are in the photo?
- Expected: No, only on the photo’s size. A photo of an empty wall gives the same shape.

**Point here:** One small layer, with the same weights, writes the record at every cell: a 1 × 1 convolution over the feature map. The code is from scripts/run_models.py. Print shapes before anything else, as Karpathy does in every Zero to Hero lecture: most bugs show up as a wrong shape.

**Notebook:** Notebook part 5 runs YOLOv8n on the photo, prints this shape and reads the column of cell (10, 18).

**Transition:** Back to the four box numbers.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## ltrb: How a cell describes a box: its distances to the four sides

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

**Transition:** Which cells should be asked to do this for the dog?

**Source:** The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## centre-cell: The simplest rule: the cell that holds the centre

**Build 1:** One rule: the cell that contains the box’s centre answers for the object. The dog’s centre (587.5, 335.5) is in cell (10, 18), our cell.

- Ask: Which cell holds the dog’s centre?
- Expected: (10, 18).

**Build 2:** The cat’s centre is in cell (14, 6). Every object now has exactly one cell, decided by place alone: no slot order to argue about.

- Ask: Why does this rule solve Part 4’s order problem?
- Expected: Each object’s cell is fixed by where the object is, not by its position in the annotation list.

**Point here:** This is YOLOv1’s rule (Redmon et al., 2016), and the one Andrew Ng teaches: the object is assigned to the grid cell that contains its midpoint.

**Transition:** Is one cell per object enough?

**Source:** The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## which-cells: More cells per object: a block around the centre

**Build 1:** One positive cell per object is a weak training signal. All 165 cells inside the box would include cells near its edges that see mostly floor: a noisy target.

- Ask: How many cells are inside the dog’s box?
- Expected: 165

**Build 2:** The middle way: the cells near the centre, within 1.5 cells of it, a 3 × 3 block around cell (10, 18).

- Ask: Which cells does centre sampling pick?
- Expected: Rows 9–11, columns 17–19: nine cells.

**Build 3:** Do the same for the cat. 18 cells get an object target; 582 get “no object of any class”.

- Ask: What do all the other cells learn?
- Expected: To give every class a low score: background.

**Point here:** Rules differ between detectors: YOLOv1 used only the centre cell; FCOS the cells near the centre; YOLOv8 picks the 10 cells whose current predictions fit the object best. All put the positives near the object.

**Transition:** What does the trained network actually do?

**Source:** The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## fires: The trained YOLOv8n: about ten cells fire per object

**Build 1:** Each cell’s dog score from the real network: dark where it is high. A small cluster near the dog’s centre, nothing elsewhere.

- Ask: Where are the dog scores high?
- Expected: In a block of cells around the dog’s centre.

**Build 2:** The cat’s scores make a second cluster. About ten cells per object: exactly what YOLOv8’s training asked for, and the source of the duplicates we must remove later.

- Ask: How many cells fire for each animal, and why that many?
- Expected: About 10: YOLOv8 trains its 10 best-fitting cells per object as positives.

**Point here:** The firing block is shifted one cell up and right of the 3 × 3 rule: YOLOv8 chooses its positives by how well each cell’s current prediction fits, not by distance alone.

**Transition:** Write the target of one positive cell.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## target-positive: The target at a positive cell, (10, 18)

**Build 1:** A positive cell’s class targets: 1 for dog, 0 for the other 79 classes. Each is the answer to its own yes/no question.

- Ask: What are the class targets of a positive dog cell?
- Expected: 1 for dog, 0 for the other 79.

**Build 2:** Its box target: the four distances we just measured, (185, 253, 176, 252).

- Ask: What is its box target?
- Expected: (185, 253, 176, 252) pixels.

**Transition:** And a cell where nothing is.

## target-background: The target at a background cell: all zeros, and “?”

**Build 1:** A background cell, such as (3, 3) on the wall: all 80 class targets are 0. Its box target is “?”: there is no box to learn, so its box numbers are left out of the loss.

- Ask: What does a background cell learn?
- Expected: To give every class a low score; nothing about boxes.

**Point here:** Of the 600 cells on this grid, 582 have this target. Part 4’s “object? = 0” is here “all 80 classes 0”.

**Transition:** Now what the network wrote at the positive cell.

## prediction-record: What the network wrote at cell (10, 18)

**Build 1:** The real network’s scores at this cell: dog 0.871 against a target of 1; every other class near its target of 0.

- Ask: How far is each class score from its target?
- Expected: Dog: 1 − 0.871 = 0.129 too low; the others are near their target 0.

**Build 2:** Its four distances: (184.8, 260.4, 177.6, 252.1) against the target (185, 253, 176, 252). Close; the loss measures how close.

- Ask: Which distance is furthest off?
- Expected: The top, t: 7.4 px too large.

**Transition:** The class part of the loss.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## bce: Scoring one yes/no answer: binary cross-entropy

**Build 1:** A class score answers one yes/no question. If the answer is yes, the loss is −log p; if no, −log(1 − p), the same curve mirrored.

- Ask: What is the loss for a yes answered with p = 1?
- Expected: 0: −log 1 = 0.

**Build 2:** Read the curve for a yes: sure and right (p near 1) costs almost nothing; unsure (0.5) costs 0.69; sure and wrong (0.1) costs 2.30, and it grows without bound. Our dog cell: 0.871 costs 0.139.

- Ask: Why does the curve shoot up near p = 0?
- Expected: Being confidently wrong is punished hardest: −log p grows without bound as p → 0.

**Point here:** The two cases are one formula: BCE(p, y) = −[y log p + (1 − y) log(1 − p)].

**Transition:** Apply it to all 80 questions at our cell.

## loss-class: Class loss at cell (10, 18): 80 yes/no questions

**Build 1:** Dog is a yes: −log 0.871 = 0.139.

- Ask: What is the dog term?
- Expected: 0.139

**Build 2:** Every other class is a no: −log(1 − p) for each. All 79 scores are near zero, so together they add only 0.0004.

- Ask: Why are the other 79 terms so small?
- Expected: Their scores are near 0, the right answer for a no.

**Build 3:** The cell’s class loss: 0.139, almost all from the dog question.

- Ask: Why 80 separate yes/no questions rather than one softmax?
- Expected: A background cell must be able to say “none of the 80”: every yes/no answer no. A softmax over 80 classes always picks one.

**Point here:** In code use binary_cross_entropy_with_logits on the raw outputs: it is numerically stable where p is near 0 or 1.

**Transition:** The box part of the loss.

## loss-box: Box loss: how far off are the four distances?

**Build 1:** Compare the four predicted distances with the four target distances, and add the absolute differences: the L1 loss of Part 4.

- Ask: What does the L1 box loss add?
- Expected: Four absolute differences between predicted and target distances.

**Build 2:** 0.2 + 7.4 + 1.6 + 0.1 = 9.3 pixels. Most of it is the top edge: the predicted box starts 7.4 pixels higher than ours.

- Ask: Which edge contributes most?
- Expected: The top edge, 7.4 px.

**Transition:** Is 9 pixels a lot?

## loss-iou: A box loss that does not care about size: 1 − IoU

**Build 1:** Another choice: one minus the IoU of the predicted and target boxes, here 0.020. It does not depend on the box’s size, so small objects count as much as large ones.

- Ask: Why might one prefer 1 − IoU to L1 in pixels?
- Expected: It measures overlap, which is scale-free: 9.3 px is negligible for the dog but large for a small object.

**Transition:** A background cell.

## loss-background: A background cell: only a class loss, and it is small

**Build 1:** A background cell has only class targets, all 0. Here every score is tiny, so the loss is 0.0038. No box loss: there is no box to learn.

- Ask: Why is there no box loss at a background cell?
- Expected: There is no object, so no box to compare with.

**Build 2:** The imbalance matters: hundreds of easy background terms against a handful of positives. Without care they dominate the sum and the network learns to say “nothing” everywhere.

- Ask: What problem do the many background cells cause?
- Expected: Their many small terms can outweigh the few positive terms.

**Transition:** Put the pieces together.

## loss-total: The loss for the whole photo

**Build 1:** Class loss from every cell; box loss only from positive cells; divide by the number of positives so photos with many objects do not dominate. λ balances the two parts.

- Ask: Which cells contribute class terms? Box terms?
- Expected: All cells; positives only.

**Build 2:** For our photo: 600 class terms, 18 box terms.

- Ask: What is N_pos here?
- Expected: 18.

**Build 3:** Gradient descent on this one number trains the shared layers.

- Ask: Why does dividing by N_pos help?
- Expected: Each photo’s loss is then an average per object, whatever the number of objects.

**Point here:** YOLOv8’s real loss sums all three grids (Part 7) and uses its own weights and box loss; the structure is the same.

**Transition:** The same loss in code.

## loss-code: The same loss in code

**Build 1:** The target is a 600 × 80 table of zeros with a 1 at each positive cell’s class. Class loss over everything, box loss over the positives.

- Ask: What shape is y, and how many 1s does it hold?
- Expected: 600 × 80 with 18 ones.

**Build 2:** Building pos, labels and dist_target from the annotations is the “assignment” step: the 3 × 3 rule written as code. The notebook does it for this photo.

- Ask: Which line uses only the positive cells?
- Expected: box_loss: dist[pos].

**Notebook:** Notebook part 5 builds pos and the targets for the courtyard photo and evaluates this loss on YOLOv8n’s real outputs.

**Transition:** At test time there are no annotations: read the boxes out.

## decode: At test time: read the box back out of the cell

**Build 1:** At test time we know only what the cell wrote: four distances and 80 scores.

- Ask: How do we get x₁ from the record?
- Expected: x₁ = 592 − l.

**Build 2:** Undo the distances: left edge = centre minus l, and so on. A box in pixels.

- Ask: Where is this box?
- Expected: (407.2, 75.6, 769.6, 588.1): on the dog.

**Build 3:** Its score is its largest class score, 0.871, and its label that class. One cell, one scored box.

- Ask: Which score does the box get?
- Expected: The largest of its 80 class scores, 0.871 (dog).

**Transition:** Every cell does this. Look at them all.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## cell-inspector: Every cell writes a record: point at one

**Build 1:** Move over the grid. Cells near the dog say dog and draw nearly the same box; cells on the wall give every class a tiny score, and their boxes mean nothing.

- Ask: What does a cell on the wall write?
- Expected: A box of some kind, but every class score near 0, so its score is tiny and it will be dropped.

**Point here:** Every cell always writes a box. The score decides whether anyone looks at it.

**Transition:** Decode all of them and keep the confident ones.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## all-candidates: Decode every cell, keep scores ≥ 0.25: 31 boxes

**Build 1:** Every photo of this size gets exactly 12,600 records: the fixed-size output.

- Ask: How many records does the network write?
- Expected: 12,600

**Build 2:** Throw away the unconfident ones: 31 boxes have a score of at least 0.25.

- Ask: How many survive the score filter?
- Expected: 31

**Build 3:** The ten cells that fired for the dog each drew a dog box. To get one box per object, remove the duplicates.

- Ask: Why ten boxes for one dog?
- Expected: About ten cells were trained to fire for each object, and they did.

**Transition:** Part 5 in one slide.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## recap-5: Part 5 in one slide

**Build 1:** Part 5: a candidate at every place, trained near each object. Part 6: one box per object.

- Ask: Why are there about ten boxes per object at test time?
- Expected: Training made several cells near each object positives; after training, all of them fire.

**Transition:** Part 6.

## part-6: Part 6 · One box per object: non-maximum suppression

**Build 1:** NMS keeps the highest-scoring box and removes boxes that overlap it.

- Ask: Of ten overlapping dog boxes, which one would you keep?
- Expected: The one with the highest score.

**Transition:** The dog’s ten boxes.

## dupes: Ten boxes for one dog

**Build 1:** The ten cells that fired for the dog, and their scores, from 0.889 down to 0.766. Their boxes lie almost on top of each other.

- Ask: How many dogs are here?
- Expected: One.

**Build 2:** They describe one dog. Keep the most confident box, from cell (9, 19), and delete the rest.

- Ask: Which box would you keep?
- Expected: The highest-scoring: cell (9, 19), 0.889.

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

**Build 4:** Then repeat: the best of what is left is kept, and so on. “Non-maximum suppression”: suppress what is not the local maximum.

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

**Build 4:** All above the 0.7 threshold: delete all nine. Nothing left for the dog; one dog box remains.

- Ask: How many dog boxes remain?
- Expected: One.

**Transition:** Two objects of the same class.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## nms-two-dogs: Two dogs: why the loop keeps the second one

**Build 1:** Two dogs in one photo: 20 dog boxes survive the score filter, about ten on each dog.

- Ask: How many dog boxes are there before NMS?
- Expected: 20

**Build 2:** Round 1: keep the best box, 0.921, on the left dog; delete every dog box that overlaps it by more than 0.7. The right dog’s boxes do not overlap it at all, so they stay.

- Ask: Why does round 1 leave the right dog’s boxes alone?
- Expected: Their IoU with the kept box is 0, below the threshold: they may be another dog.

**Build 3:** Round 2: the best remaining box, 0.915, is on the right dog. Keep it, delete its twins. Keeping only the single best box overall would have lost a dog; the loop keeps one per object.

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

**Build 1:** The crowd photo: 112 person candidates, NMS at 0.7: eleven people, eleven boxes.

- Ask: How many people does NMS keep at 0.7?
- Expected: Eleven.

**Build 2:** Raise the threshold to 0.95 and NMS deletes only near-identical boxes: two duplicates slip through.

- Ask: What goes wrong at 0.95?
- Expected: Duplicates survive: 13 boxes.

**Build 3:** Lower it to 0 and any touching box is deleted, including real neighbours. People in a queue or a crowd overlap far more than this; no single threshold suits every scene.

- Ask: What goes wrong at 0?
- Expected: Real people are deleted for touching a neighbour: 9 boxes.

**Point here:** Typical thresholds are 0.45–0.7. Crowded scenes motivated Soft-NMS (lower the score instead of deleting) and NMS-free detectors such as DETR.

**Transition:** One more rule: classes.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## class-aware: Boxes of different classes do not suppress each other

**Build 1:** A cyclist: a person box and a bicycle box. They overlap, IoU 0.339, and both are right.

- Ask: How much do the two boxes overlap?
- Expected: 0.339

**Build 2:** If NMS ignored classes, with threshold 0.3, the bicycle would be suppressed by the person.

- Ask: What would class-agnostic NMS at 0.3 do?
- Expected: Delete the bicycle.

**Build 3:** Run NMS separately for each class and both are kept. Steps 3 of the recipe said “of the same class” for this reason.

- Ask: What does class-aware NMS do?
- Expected: Keep both: they are compared only within their own class.

**Transition:** Try the thresholds yourself.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## nms-play: Try it: thresholds on the street photo

**Build 1:** Real candidates from YOLOv8n. Move the score threshold, then the IoU threshold; switch to “all classes together” and watch the bicycle; press Step to run the loop one round at a time.

- Ask: At which IoU threshold do duplicates start to survive?
- Expected: Near 0.95 for this photo: below that, each object keeps one box.

**Transition:** NMS in code.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## nms-code: NMS in code

**Build 1:** The recipe line by line: sort, keep the first, drop everything that overlaps it more than the threshold, repeat.

- Ask: Which line deletes the duplicates?
- Expected: order = order[1:][ious <= thr].

**Build 2:** torchvision has it built in; batched_nms runs it separately for each class label.

- Ask: How would you make it class-aware by hand?
- Expected: Run it once per class, or offset each class’s boxes so different classes never overlap (what batched_nms does).

**Notebook:** Notebook part 6 runs this function on the courtyard’s 31 candidates and checks it against torchvision.ops.nms.

**Transition:** The dense answer, end to end.

## dense-recap: The dense answer, end to end

**Build 1:** Photo, CNN, a fixed 12,600 records, decoded into boxes, filtered by score, cleaned by NMS: four detections.

- Ask: Which steps have learned weights?
- Expected: Only the CNN and the head; decoding, filtering and NMS are fixed rules.

**Build 2:** This is answer A to the lecture’s question: place-based outputs, many per object in training, one per object after NMS.

- Ask: Where does the number of detections get decided?
- Expected: In the score filter and NMS, after the network.

**Transition:** The same pipeline in code.

## detect-code: The whole detector at test time, in eight lines

**Build 1:** Parts 5 and 6 as code: run the network once, read every cell’s box and best class, keep the confident cells, run NMS separately for each class.

- Ask: Which line decides how many objects are returned?
- Expected: The score filter and batched_nms together.

**Build 2:** On the courtyard photo it returns the 4 detections of the lecture’s first slide. Nothing in it depends on how many objects there are.

- Ask: Which lines have learned weights?
- Expected: Only net(photo); the rest are fixed rules.

**Point here:** batched_nms is torchvision.ops.batched_nms; cxcywh_to_xyxy is torchvision.ops.box_convert(boxes, "cxcywh", "xyxy"). Ultralytics’ own post-processing does the same steps (checked in scripts/science.py).

**Notebook:** Notebook part 6 runs this function on the courtyard photo.

**Transition:** Why does YOLOv8 have three grids?

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## part-7: Part 7 · Small and large objects: three grids

**Build 1:** Three grids, three cell sizes, one record format.

- Ask: What could go wrong for a 13-pixel-wide person on a 32-pixel grid?
- Expected: It is under half a cell; two such people could share one cell, and one cell must describe both.

**Transition:** Sizes in one photo.

## sizes: Part 1’s street again, with the 32-pixel grid

**Build 1:** Part 1’s street: a bus 502 px wide, a cyclist 48 px, a pedestrian 13 px far down the road.

- Ask: How many times wider is the bus than the far pedestrian?
- Expected: About 39 times.

**Build 2:** Draw the 32-px grid. The bus spans about 16 cells; the pedestrian sits inside one. A coarse grid suits big objects; small ones need finer cells.

- Ask: What is the problem for small objects on a coarse grid?
- Expected: A cell may contain several small objects but writes one record; and its features are dominated by a large surrounding region.

**Transition:** Three grids.

**Source:** The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## three-grids: Three grids: cells of 8, 16 and 32 pixels

**Build 1:** YOLOv8 reads three feature maps from different depths of the CNN: cells of 8, 16 and 32 pixels.

- Ask: How many cells does the 8-px grid have for the courtyard?
- Expected: 120 × 80 = 9,600.

**Build 2:** Add them up: 12,600 for the courtyard, the number we decoded in Part 5. A bigger photo gets more cells: 18,480 for the street.

- Ask: Where did 12,600 come from?
- Expected: 9,600 + 2,400 + 600.

**Build 3:** Each grid writes the same kind of record. Feature pyramids (FPN, 2017) mix deep and early features so even the fine grid knows what it is looking at.

- Ask: Why not use only the fine grid?
- Expected: Fine cells come from early layers whose features see only a small region: too little context for large objects.

**Transition:** Which grid found what?

## which-grid: Which grid found each object? The real answer

**Build 1:** After NMS, look up which grid each kept box came from: the bus from the 32-px grid, the cyclist and bicycle from the 16-px grid, the far pedestrian from the 8-px grid.

- Ask: Which grid found the bus? The far pedestrian?
- Expected: 32 px; 8 px.

**Build 2:** The street photo agrees: large from coarse, small from fine. Training assigns each object to cells whose grid suits its size.

- Ask: Who decided this?
- Expected: Training: an object’s positive cells are chosen where its box fits best, which for small objects is the fine grid.

**Transition:** Part 7 in one slide.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## recap-7: Part 7 in one slide

**Build 1:** Part 7: three grids for three sizes. Part 8: measuring a detector.

- Ask: Which grid would you expect to find Part 1’s small bird?
- Expected: The finest, 8 px: its best box did come from a stride-8 cell.

**Transition:** Part 8.

## part-8: Part 8 · Measuring a detector

**Build 1:** Right or wrong for each detection, then precision, recall and AP.

- Ask: A detector returned 12 boxes for 4 people. Is that good?
- Expected: It depends: are the 4 people among them, and how confident were the 8 extra boxes?

**Transition:** The rule for a correct detection.

## tp-rule: When is a detection correct?

**Build 1:** A detection counts as correct if its class is right and it overlaps an annotated box with IoU of at least 0.5.

- Ask: What IoU counts as a hit?
- Expected: At least 0.5, usually.

**Build 2:** Each annotated object can be claimed once. Detections go in score order; the first good one claims it.

- Ask: Why process detections in score order?
- Expected: So the most confident detection claims the object, as in NMS.

**Build 3:** Every detection that claims nothing is a false positive, including a duplicate that NMS missed.

- Ask: Is a duplicate box on a found object right or wrong?
- Expected: Wrong: a false positive.

**Build 4:** Every annotated object left unclaimed is a false negative.

- Ask: What is a false negative?
- Expected: An object nobody found.

**Point here:** This is a third kind of matching, after training assignment and NMS: predictions against annotations, greedy by score.

**Transition:** Apply it to real detections.

## street-eval: Real check: people in the street photo

**Build 1:** Four annotated people (teal). YOLOv8n’s person detections after NMS, down to score 0.01: 12.

- Ask: How many annotated people?
- Expected: Four.

**Build 2:** The four most confident each claim a different person with IoU above 0.9: four true positives.

- Ask: Which detections are true positives?
- Expected: The top four, each with IoU above 0.9.

**Build 3:** The other 8, scores 0.04 and below, sit on the car’s windscreen, where nobody is: false positives. No person is missed.

- Ask: What are the low-scoring boxes?
- Expected: False positives on the car: the network half-sees a driver.

**Transition:** Turn the counts into precision and recall.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## pr-def: Precision and recall: two questions

**Build 1:** Precision looks at the left circle, everything we reported: the fraction of it that was right.

- Ask: What does precision divide by?
- Expected: Everything reported: TP + FP.

**Build 2:** Recall looks at the right circle, everything that was really there: the fraction of it we found.

- Ask: What does recall divide by?
- Expected: Everything really there: TP + FN.

**Common misconception:** Neither alone is enough: report every possible box and recall is 1; report one sure box and precision is 1.

**Transition:** The street photo, at two cut-offs.

## pr-street: The street’s people at two score cut-offs

**Build 1:** With the usual 0.25 score cut-off, the street photo is perfect: four people found, nothing extra. Precision 1, recall 1.

- Ask: What are precision and recall at 0.25?
- Expected: Both 1.

**Build 2:** Keep everything down to 0.01 and the 8 windscreen boxes join: recall stays 1, precision drops to 0.33. The cut-off trades one for the other.

- Ask: What happens at 0.01?
- Expected: Precision falls to 0.33; recall stays 1.

**Transition:** Now the other direction: Part 1’s bird.

## bird-threshold: Back to the bird: a lower cut-off finds it

**Build 1:** At the usual 0.25: the cat and the dog are found, the bird (0.098) is missed. Precision 1, recall 2/3.

- Ask: What do precision and recall say at 0.25?
- Expected: Precision 1, recall 2/3: everything reported was right, but the bird was missed.

**Build 2:** Lower the cut-off to 0.05 and the bird’s box gets through: recall 3/3. On this photo nothing false comes in with it; on the street, going lower brought eight false people.

- Ask: Should we always lower the cut-off?
- Expected: It depends on what a miss costs against a false alarm: a camera trap counting rare birds wants recall; a car that brakes for every false person wants precision.

**Point here:** Only the seven annotated classes count here; the potted plants are ignored, as in the benchmark.

**Transition:** Every cut-off at once: rank the detections.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## pr-walk: Walk down the ranked list, one detection at a time

**Build 1:** Six detections sorted by score; three objects in the photos. Lower the threshold one detection at a time and track precision and recall.

- Ask: What will we track as we go down the list?
- Expected: Cumulative TP and FP, then precision and recall.

**Build 2:** #1 (0.95) claims object A: TP. Precision 1/1, recall 1/3.

- Ask: Precision and recall after #1?
- Expected: 1 and 1/3.

**Build 3:** #2 (0.90) claims B: TP. 2/2, 2/3.

- Ask: After #2?
- Expected: 1 and 2/3.

**Build 4:** #3 (0.80) lands on A again, already claimed: a duplicate, FP. Precision falls to 2/3; recall stays.

- Ask: After #3, and why did precision fall?
- Expected: 2/3 and 2/3: a false positive was added.

**Build 5:** #4 (0.70) where nothing is: FP. 2/4, 2/3.

- Ask: After #4?
- Expected: 1/2 and 2/3.

**Build 6:** #5 (0.60) claims C: TP. Recall reaches 1; precision 3/5.

- Ask: After #5?
- Expected: 3/5 and 1.

**Build 7:** #6 (0.40): FP. 3/6, 3/3. Every point is one possible threshold.

- Ask: What does each point on the curve stand for?
- Expected: The detector run with that score threshold.

**Transition:** Summarise the whole curve in one number.

## ap-area: Average precision: the area under the curve

**Build 1:** Smooth the zig-zag: at each recall, take the best precision reachable by lowering the threshold further. That is the envelope.

- Ask: Why take the best precision at this recall or beyond?
- Expected: A user would never pick a threshold whose precision is beaten at a higher recall.

**Build 2:** Its area: a third of the recall at precision 1, another third at 1, the last third at 0.6. AP = 0.867.

- Ask: What is the area?
- Expected: 0.867

**Build 3:** AP rewards ranking: correct detections should come before wrong ones. The street people scored AP = 1.

- Ask: When is AP exactly 1?
- Expected: When all objects are found before any false positive.

**Point here:** COCO samples the envelope at 101 recall values instead: 0.865 here.

**Transition:** Average over classes and IoU thresholds.

## map: mAP: average over classes, and over IoU thresholds

**Build 1:** mAP averages AP over classes. COCO goes further and averages over ten IoU thresholds, from loose (0.5) to strict (0.95), which rewards tight boxes.

- Ask: What does mAP average over?
- Expected: Classes (and, for COCO, IoU thresholds).

**Build 2:** Raising the IoU threshold turns loose boxes into false positives and their objects into misses: AP can only fall.

- Ask: Why average over IoU thresholds?
- Expected: To reward boxes that are tight, not just roughly right.

**Build 3:** YOLOv8n on our eight photos: 1.00 at IoU 0.5, 0.94 averaged over the strict thresholds. On COCO’s validation set its published AP is 0.373: real scenes are far harder.

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

**Transition:** Wrap-up.

## summary: One question, one answer, three uses of IoU

**Build 1:** The lecture’s question: how can a network with a fixed output return a variable, unordered set?

- Ask: State the lecture’s question in one sentence.
- Expected: How a fixed-size output can describe a variable, unordered set.

**Build 2:** The dense answer: outputs tied to places, many per object in training, one per object after NMS. The list’s length is decided after the network.

- Ask: Where is the number of detections decided?
- Expected: After the network: the score filter and NMS.

**Build 3:** Three places where boxes are paired up, easy to confuse: assignment in training, NMS between predictions, evaluation against annotations. Each uses IoU.

- Ask: Which pairing uses the annotations?
- Expected: Assignment (training) and evaluation (measuring); NMS uses only predictions.

**Point here:** Appendix A gives the other answer, DETR: a fixed set of 100 slots matched to objects in training, so no NMS.

**Transition:** Back to the six jobs.

## apps-again: Back to the six jobs: what you would do now

**Build 1:** The three everyday jobs: a pretrained COCO detector already knows their classes. What remains is tuning: grids, NMS threshold, score cut-off.

- Ask: Which of the six jobs could use a COCO detector as it is?
- Expected: Road, crowd and (with care for small animals) the camera trap.

**Build 2:** The three specialist jobs need new classes: label a few hundred photos with boxes, fine-tune the same detector, and measure precision and recall on photos it has not seen.

- Ask: What would you do first for the microscope job?
- Expected: Annotate cells with boxes, fine-tune a pretrained detector on them, and measure precision and recall.

**Point here:** Fine-tuning starts from COCO weights: the CNN already knows edges, textures and shapes; only the heads must learn the new classes.

**Transition:** Next lecture.

## next: Next: beyond boxes

**Build 1:** Boxes are the coarsest description of where an object is. Next: masks, keypoints, and finding objects named in words.

- Ask: What does a mask give that a box does not?
- Expected: Exactly which pixels are the object.

**Transition:** End of the main route.

**Source:** Masks: YOLOv8n-seg run on the photo (scripts/run_models.py).

## part-A: Appendix A · DETR: a fixed set of slots, matched to objects (optional)

**Build 1:** The other answer to the lecture’s question: DETR, 100 slots that read the image with attention, matched to objects instead of cleaned up by NMS.

- Ask: What were the two problems of K slots in Part 4?
- Expected: Too few slots for some photos, and no rule for which slot answers for which object.

**Transition:** Fix them one at a time.

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

**Build 3:** q90 named a real plant, but plants are not in this target list: it pays 0.58 for being right. Annotation policy matters.

- Ask: Why is q90 penalised?
- Expected: It found an object the annotation leaves out.

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

**Build 2:** At test time there is nothing to match: run the model, keep the queries whose best class beats a threshold. No NMS.

- Ask: What replaces NMS at test time?
- Expected: A threshold on each query’s class probability.

**Notebook:** Notebook appendix A runs DETR on the two-dogs photo, builds this cost matrix and checks the matching against brute force.

**Transition:** Two answers side by side.

## two-answers: Two answers to one question (optional)

**Build 1:** Side by side. The structural difference is how outputs are assigned to objects in training: by place, several per object; or by matching, one per object.

- Ask: Where does each method decide which output answers for which object?
- Expected: YOLO: by cell position in training; DETR: by Hungarian matching in training.

**Build 2:** Both solve the lecture’s question with a fixed tensor plus a way to say “nothing here”.

- Ask: What plays the role of “no object” in YOLO?
- Expected: Low class scores, removed by the score filter.

**Point here:** DETR trained for 500 epochs on COCO; Deformable DETR, DINO and RT-DETR made such models faster to train and real-time.

**Transition:** End of Appendix A. Appendix B: more depth.

## opt-yolov1: YOLOv1 (2016): one responsible cell per object (optional)

**Build 1:** Why did YOLOv1 struggle with flocks of birds?

- Ask: Why did YOLOv1 struggle with flocks of birds?
- Expected: Each cell had one class vector: several small objects with centres in one cell could not all be described.

## opt-anchors: Anchors: predict offsets from template boxes (optional)

**Build 1:** What must be chosen by hand for an anchor-based detector?

- Ask: What must be chosen by hand for an anchor-based detector?
- Expected: The anchor sizes and aspect ratios, and the IoU thresholds for positives.

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

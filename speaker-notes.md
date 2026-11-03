# Object detection: speaker notes

Planned main route: 100 minutes, including student responses. Optional slides are outside this budget.

## Pacing

| Part | Minutes |
|---|---:|
| Lecture map | 2 |
| Part 1 · From one label to a list | 9 |
| Part 2 · Boxes and IoU | 13 |
| Part 3 · One box, then many | 8 |
| Part 4 · A candidate at every place | 20 |
| Part 5 · One box per object: NMS | 11 |
| Part 6 · Three grids for three sizes | 5 |
| Part 7 · DETR: slots matched to objects | 17 |
| Part 8 · Measuring a detector | 12 |
| Wrap-up | 3 |

## title: Object detection: from one label to a set of objects

**Build 1:** The real output of a small detector, YOLOv8n, on today’s photo: four objects, each with a class, a score and a box.

- Ask: What did the detector return for this photo?
- Expected: Four entries: a cat, a dog and two potted plants, each with a box and a score.

**Point here:** Point at one entry at a time: class, score, box. Keep this photo in view; every later number comes from it.

**Transition:** Start with what an ordinary classifier says about the same photo.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

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

**Transition:** Where is this used?

**Source:** Masks: YOLOv8n-seg run on the photo (scripts/run_models.py). The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## uses: A street in one glance: seven objects, four classes

**Build 1:** YOLOv8n on a campus street: four people, a car, a bicycle and a dog, each boxed. A car, a bus or a robot needs exactly this list.

- Ask: How many objects did the detector find?
- Expected: Seven: four people, a car, a bicycle, a dog.

**Build 2:** The same task with other classes: parcels on a conveyor, cells under a microscope, defects on a machined part.

- Ask: What would a detector for these photos need to learn?
- Expected: The same kind of list, with classes such as parcel, cell or scratch.

**Transition:** What makes this harder than classification?

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

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

**Point here:** Every box here is YOLOv8n’s, after the clean-up step of Part 5. The crowd photo also has bags, not boxed here.

**Transition:** And the list has no natural order.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## no-order: A list with no order: a set

**Build 1:** Number the two dogs: left one first.

- Ask: Which dog is number 1?
- Expected: Neither: any order is correct.

**Build 2:** Or right one first. Both lists describe the same scene: the answer is a set of N (class, box) pairs, N varies, and order means nothing.

- Ask: What must stay together when we reorder?
- Expected: Each class with its own box.

**Point here:** Keep this photo: in Part 3 the order causes a real problem for the loss, and in Part 7 DETR solves it.

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

**Transition:** Two answers, and the route through them.

## route: Today’s route: two answers to one question

**Build 1:** First, the tools: describe a box, compare two boxes. Then see why a network that outputs one box, or a few, is not enough.

- Ask: What tools will every later part need?
- Expected: A box format and an overlap measure (IoU).

**Build 2:** Answer A: give every place in the image its own output, train the outputs near each object, then keep one per object. This is YOLO.

- Ask: How does answer A decide which output describes the dog?
- Expected: By place: the outputs at the dog’s location.

**Build 3:** Answer B: a fixed set of 100 slots; before computing the loss, match slots to objects. This is DETR. We end by measuring both.

- Ask: How does answer B decide?
- Expected: By matching each object to its best slot before computing the loss.

**Transition:** Part 2: boxes and IoU.

## part-2: Part 2 · Describe a box, compare two boxes

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

## centre-size: The same box as a centre and a size

**Build 1:** Width: the right edge minus the left edge.

- Ask: What is the width?
- Expected: 361 pixels.

**Build 2:** Height: bottom minus top. Remember that y grows downwards.

- Ask: What is the height?
- Expected: 505 pixels.

**Build 3:** The centre is halfway across and halfway down.

- Ask: Where is the centre?
- Expected: (587.5, 335.5).

**Build 4:** Same box, other format: centre (587.5, 335.5), size 361 × 505. Either format can be computed from the other.

- Ask: How would you get x₁ back from the centre format?
- Expected: x₁ = c_x − w/2 = 587.5 − 180.5 = 407.

**Common misconception:** w and h are the full width and height, not half of them.

**Transition:** Pixels depend on the photo’s size.

**Source:** The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## normalised: Divide by the photo’s size: numbers between 0 and 1

**Build 1:** Divide horizontal numbers by the photo’s width, vertical ones by its height.

- Ask: What do we divide c_x by? And h?
- Expected: c_x by the width W; h by the height H.

**Build 2:** The dog: (0.612, 0.524, 0.376, 0.789). Every number is between 0 and 1.

- Ask: What does 0.789 say about the dog?
- Expected: Its box covers 79% of the photo’s height.

**Build 3:** These numbers survive resizing. Networks often predict normalised boxes; DETR, in Part 7, does exactly this.

- Ask: Why prefer normalised numbers?
- Expected: They do not depend on the photo’s resolution.

**Point here:** Formats in the wild: torchvision boxes are pixel corners; COCO files store (x, y, w, h) from the top-left; YOLO label files store normalised (c_x, c_y, w, h). Check the format before training.

**Transition:** Now compare two boxes.

## compare: Two boxes for one dog: how well do they agree?

**Build 1:** Teal is our box for the dog. Purple is a guess, moved 60 px right and 40 px down. How good is the guess?

- Ask: Is the purple box a good guess?
- Expected: Roughly: it covers most of the dog but misses part of it.

**Build 2:** One idea: measure how far apart the centres are. Here 72 px. Is that a lot?

- Ask: How far apart are the centres?
- Expected: √(60² + 40²) ≈ 72 pixels.

**Build 3:** For the dog, 72 px is a small slip. For a person 18 px wide in the street photo, the same slip leaves the boxes apart. Compare overlap, not distance.

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

**Notebook:** Notebook part 2 runs this on the two boxes and checks it against torchvision.ops.box_iou.

**Transition:** Part 3: a network that outputs a box.

## part-3: Part 3 · One box is easy; several are not

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

**Transition:** The box loss with numbers.

## box-loss: Training the box head: compare four numbers

**Build 1:** The L1 box loss: for each of the four numbers, the absolute difference between prediction and target; add them.

- Ask: What does the loss add up?
- Expected: Four absolute differences.

**Build 2:** Take the guess from Part 2 as the prediction, in normalised units. The centre is off; the size is right.

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

**Build 3:** Problem 1: what if a photo has more objects than K? Then choose K large. DETR uses K = 100.

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

**Point here:** The slot boxes are DETR’s real predictions for this photo (queries 61 and 98); the L1 sums are over normalised (c_x, c_y, w, h).

**Transition:** Two ways to pair outputs with objects.

**Source:** DETR (facebook/detr-resnet-50, Hugging Face) run on this photo by scripts/run_models.py.

## two-fixes: Two ways to decide which output answers for which object

**Build 1:** Fix A: give every output a fixed place in the image. Whatever is at that place is its job. Then order cannot matter.

- Ask: How does fix A remove the order problem?
- Expected: An output answers for the object at its place; there is nothing to order.

**Build 2:** Fix B: keep free slots, and before each loss, match slots to objects so that the total cost is lowest. Then order cannot matter either.

- Ask: How does fix B?
- Expected: The pairing is chosen by cost, not by position in the list.

**Transition:** Part 4: answer A, a candidate at every place.

## part-4: Part 4 · A candidate at every place

**Build 1:** A grid of cells, each writing a record: targets, loss, decoding.

- Ask: If every place in the image has its own output, which outputs should describe the dog?
- Expected: The ones at, or near, the dog’s location.

**Transition:** Start from brute force.

## sliding: The brute-force idea: classify every window

**Build 1:** The obvious idea: slide a window over the photo and ask a classifier about each crop.

- Ask: How would you find objects with only a classifier?
- Expected: Classify many crops and keep those that say “object”.

**Build 2:** Positions every 32 pixels give 600 windows; add sizes and shapes and it is thousands of CNN runs per photo. Detectors around 2013 worked like this, and were slow.

- Ask: How many windows is that, roughly?
- Expected: 600 positions × several sizes: thousands.

**Build 3:** Convolution slides the same weights over every position anyway. One pass gives a vector for every position at once.

- Ask: What does a CNN compute at every position?
- Expected: A feature vector describing the region around that position.

**Point here:** R-CNN (2014) classified about 2,000 proposed crops per image; Fast and Faster R-CNN shared one CNN pass. Optional slide: two-stage detectors.

**Transition:** The grid of feature vectors.

## feature-map: One pass of a CNN: a 30 × 20 grid of feature vectors

**Build 1:** The photo goes through a CNN that halves the resolution five times: 960 × 640 becomes 30 × 20, with 256 numbers at each position.

- Ask: What size is the feature map?
- Expected: 30 × 20 positions, 256 numbers each.

**Build 2:** Lay that grid over the photo: each cell covers a 32 × 32 block. Cell (row 10, column 18) is highlighted.

- Ask: Which block of pixels does cell (10, 18) cover?
- Expected: x from 576 to 608, y from 320 to 352.

**Build 3:** The cell is an address, not a crop: its 256 numbers were computed from a region far larger than its block, wide enough to see the whole dog.

- Ask: Can a cell describe an object larger than its block?
- Expected: Yes: its vector sees a large region (its receptive field).

**Point here:** For YOLOv8n this is the stride-32 output of the neck. Rows and columns are counted from 0.

**Transition:** What does each cell write?

## cell-record: Every cell writes a record: 4 box numbers, 80 class scores

**Build 1:** Cell (10, 18) writes four numbers that place a box: its distances to the box’s left, top, right and bottom edges.

- Ask: What do the four box numbers mean?
- Expected: Distances from the cell’s centre to the four sides of a box.

**Build 2:** And 80 scores, one per COCO class, each between 0 and 1. Here dog is 0.871; the other 79 are near zero.

- Ask: Why does every class get its own score?
- Expected: A cell answers 80 yes/no questions: is there a person? a dog? … All can be “no”.

**Build 3:** The same small layer, with the same weights, writes this record at every cell: a 1 × 1 convolution. The output is a fixed 600 × 84 tensor.

- Ask: Does each cell have its own weights?
- Expected: No: one shared layer, applied at all 600 cells.

**Point here:** These are the real numbers YOLOv8n wrote at this cell. The head writes distances in cells; we show them ×32, in pixels.

**Transition:** Read the four distances.

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

## which-cells: Which cells should answer for the dog?

**Build 1:** 165 cells lie inside the dog’s box. Cells near its edge see mostly the background and the box edges are far away; asking all of them to predict the dog is a hard, noisy target.

- Ask: How many cells are inside the dog’s box?
- Expected: 165

**Build 2:** So train only the cells near the centre: within 1.5 cells of it, a 3 × 3 block. The box centre (587.5, 335.5) is in cell (10, 18), the middle of the block.

- Ask: Which cells does the centre rule pick?
- Expected: Rows 9–11, columns 17–19: nine cells.

**Build 3:** Do the same for the cat. 18 cells get an object target; 582 get the target “no object of any class”.

- Ask: What do all the other cells learn?
- Expected: To give every class a low score: background.

**Point here:** Rules differ between detectors: YOLOv1 used only the centre cell; YOLOv8 picks the 10 cells whose current predictions fit the object best. All put the positives near the object.

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

## target-record: The target written at cell (10, 18)

**Build 1:** A positive cell’s class targets: 1 for dog, 0 for the other 79 classes. Each is the answer to its own yes/no question.

- Ask: What are the class targets of a positive dog cell?
- Expected: 1 for dog, 0 for the other 79.

**Build 2:** Its box target: the four distances we just measured, (185, 253, 176, 252).

- Ask: What is its box target?
- Expected: (185, 253, 176, 252) pixels.

**Build 3:** A background cell, such as (3, 3) on the wall: all 80 class targets are 0, and it has no box target, because there is no box to learn.

- Ask: What does a background cell learn?
- Expected: Every class score low; nothing about boxes.

**Transition:** Now what the network wrote at the same cell.

## prediction-record: What the network wrote at cell (10, 18)

**Build 1:** The real network’s scores at this cell: dog 0.871 against a target of 1; every other class near its target of 0.

- Ask: How far is each class score from its target?
- Expected: Dog: 1 − 0.871 = 0.129 too low; the others are near their target 0.

**Build 2:** Its four distances: (184.8, 260.4, 177.6, 252.1) against the target (185, 253, 176, 252). Close; the loss measures how close.

- Ask: Which distance is furthest off?
- Expected: The top, t: 7.4 px too large.

**Transition:** The class part of the loss.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## loss-class: Class loss: one yes/no question per class

**Build 1:** Binary cross-entropy for one yes/no question: if the answer is yes, −log p; if no, −log(1 − p). Natural logs.

- Ask: What is BCE when y = 1? When y = 0?
- Expected: −log p, and −log(1 − p).

**Build 2:** Dog is a yes: −log 0.871 = 0.139. It would be 0 at p = 1 and grows without bound as p falls to 0.

- Ask: What is the dog term?
- Expected: 0.139.

**Build 3:** Every other class is a no: −log(1 − p) for each. All 79 scores are near zero, so together they add only 0.0004.

- Ask: Why are the other 79 terms so small?
- Expected: Their scores are near 0, the right answer for a no.

**Build 4:** The cell’s class loss: 0.139, almost all from the dog question.

- Ask: Why 80 separate yes/no questions rather than one softmax?
- Expected: A background cell must be able to say “none of the 80”: every yes/no answer no. A softmax over 80 classes always picks one.

**Point here:** In code use binary_cross_entropy_with_logits on the raw outputs: it is numerically stable where p is near 0 or 1.

**Transition:** The box part of the loss.

## loss-box: Box loss: how far off are the four distances?

**Build 1:** Compare the four predicted distances with the four target distances, and add the absolute differences.

- Ask: What does the L1 box loss add?
- Expected: Four absolute differences between predicted and target distances.

**Build 2:** 0.2 + 7.4 + 1.6 + 0.1 = 9.3 pixels. Most of it is the top edge: the predicted box starts 7.4 pixels higher than ours.

- Ask: Which edge contributes most?
- Expected: The top edge, 7.4 px.

**Build 3:** Another choice: one minus the IoU of the predicted and target boxes, here 0.020. It does not depend on the box’s size, so small objects count as much as large ones.

- Ask: Why might one prefer 1 − IoU?
- Expected: It measures overlap, which is scale-free; 9 px is negligible for the dog but large for a small object.

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

**Point here:** YOLOv8’s real loss sums all three grids (Part 6) and uses its own weights and box loss; the structure is the same.

**Transition:** The same loss in code.

## loss-code: The same loss in code

**Build 1:** The target is a 600 × 80 table of zeros with a 1 at each positive cell’s class. Class loss over everything, box loss over the positives.

- Ask: What shape is y, and how many 1s does it hold?
- Expected: 600 × 80 with 18 ones.

**Build 2:** Building pos, labels and dist_target from the annotations is the “assignment” step: the 3 × 3 rule written as code. The notebook does it for this photo.

- Ask: Which line uses only the positive cells?
- Expected: box_loss: dist[pos].

**Notebook:** Notebook part 4 builds pos and the targets for the courtyard photo and evaluates this loss on YOLOv8n’s real outputs.

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

**Transition:** Part 5: removing duplicates.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## part-5: Part 5 · One box per object: non-maximum suppression

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

**Transition:** All three classes at once.

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

**Notebook:** Notebook part 5 runs this function on the courtyard’s 31 candidates and checks it against torchvision.ops.nms.

**Transition:** The dense answer, end to end.

## dense-recap: The dense answer, end to end

**Build 1:** Photo, CNN, a fixed 12,600 records, decoded into boxes, filtered by score, cleaned by NMS: four detections.

- Ask: Which steps have learned weights?
- Expected: Only the CNN and the head; decoding, filtering and NMS are fixed rules.

**Build 2:** This is answer A to the lecture’s question: place-based outputs, many per object in training, one per object after NMS.

- Ask: Where does the number of detections get decided?
- Expected: In the score filter and NMS, after the network.

**Transition:** Why does YOLOv8 have three grids?

## part-6: Part 6 · Small and large objects: three grids

**Build 1:** Three grids, three cell sizes, one record format.

- Ask: What could go wrong for a 13-pixel-wide person on a 32-pixel grid?
- Expected: It is under half a cell; two such people could share one cell, and one cell must describe both.

**Transition:** Sizes in one photo.

## sizes: One photo, very different sizes

**Build 1:** The same street, three objects: a bus 502 px wide, a cyclist 48 px, a pedestrian 13 px far down the road.

- Ask: How many times wider is the bus than the far pedestrian?
- Expected: About 39 times.

**Build 2:** Draw the 32-px grid. The bus spans 16 cells; the pedestrian sits inside one. A coarse grid suits big objects; small ones need finer cells.

- Ask: What is the problem for small objects on a coarse grid?
- Expected: A cell may contain several small objects but writes one record; and its features are dominated by a large surrounding region.

**Transition:** Three grids.

**Source:** The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## three-grids: Three grids: cells of 8, 16 and 32 pixels

**Build 1:** YOLOv8 reads three feature maps from different depths of the CNN: cells of 8, 16 and 32 pixels.

- Ask: How many cells does the 8-px grid have for the courtyard?
- Expected: 120 × 80 = 9,600.

**Build 2:** Add them up: 12,600 for the courtyard, the number we decoded in Part 4. A bigger photo gets more cells: 18,480 for the street.

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

**Transition:** Part 7: the other answer, DETR.

**Source:** YOLOv8n (Ultralytics, COCO-trained) run on this photo by scripts/run_models.py; every value from data/science.json.

## part-7: Part 7 · DETR: a fixed set of slots, matched to objects

**Build 1:** DETR: 100 slots that read the image with attention; matching instead of NMS.

- Ask: What were the two problems of K slots in Part 3?
- Expected: Too few slots for some photos, and no rule for which slot answers for which object.

**Transition:** Fix them one at a time.

## slots-again: Back to the slots, with three changes

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

## detr-pipeline: DETR, from photo to 100 predictions

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

## queries: A query is learned once and reused for every photo

**Build 1:** The 100 queries are stored parameters: 100 × 256 numbers learned in training, identical for every photo.

- Ask: Do the queries change from photo to photo?
- Expected: No: they are fixed after training.

**Build 2:** Their outputs are computed: the same query writes a dog box for one photo and “no object” for another, depending on what it read.

- Ask: Then how can query 71 output a dog here and nothing elsewhere?
- Expected: Its output depends on what cross-attention reads from this photo.

**Transition:** DETR on the courtyard.

## detr-output: DETR on the courtyard: 100 slots, most of them empty

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

## detr-attention: Where two queries looked

**Build 1:** Query 71’s cross-attention in the last decoder layer, averaged over its 8 heads: where its weights over the 950 tokens went. Bright = much attention.

- Ask: Where does query 71 attend?
- Expected: On the dog.

**Build 2:** Query 61, the cat: its attention sits on the cat. Each query attends mostly to the parts of the photo that fix its box: the extremities more than the middle.

- Ask: Why the edges and extremities rather than the middle?
- Expected: The box needs the extreme points (head, paws, tail); the class is already clear from the encoder’s context.

**Point here:** Carion et al. (2020) report the same: decoder attention highlights object extremities.

**Transition:** How do duplicates disappear without NMS?

**Source:** DETR (facebook/detr-resnet-50, Hugging Face) run on this photo by scripts/run_models.py.

## detr-layers: Duplicates disappear inside the decoder

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

## match-why: Training: which prediction should learn which dog?

**Build 1:** Training photo: two annotated dogs. DETR made 100 predictions. Which prediction is compared with which dog?

- Ask: How many predictions and how many targets?
- Expected: 100 predictions, 2 targets.

**Build 2:** Score every pairing with a cost: low when the prediction has the right class and a box close to the target’s. Then pick, among all one-to-one pairings, the cheapest.

- Ask: What should make a pairing cheap?
- Expected: The right class with high probability, and a box close to the target box.

**Transition:** The cost needs one more box measure.

**Source:** The photographs are course-owned generated images (see SOURCES.md); every box and score drawn on them is computed.

## giou: One more measure: generalised IoU

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

## cost-one: The cost of one pairing: query 61 and the left dog

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

## cost-matrix: Fill the table: the cost of every pairing

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

## greedy: Why not let each object grab its cheapest slot?

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

## match-loss: After matching: the loss

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

## why-no-nms: Why DETR needs no NMS

**Build 1:** Matching is one-to-one: in every training step, a duplicate query is told “no object”. The network learns not to duplicate, using self-attention among queries.

- Ask: What happens in training to a second query that predicts an already-matched object?
- Expected: It is matched to nothing, so its target is “no object”.

**Build 2:** The dense detector trained ten cells per object on purpose (more positives, more signal) and pays for it with NMS.

- Ask: Why does YOLO train several cells per object?
- Expected: More positives give more training signal and robustness; the price is duplicates.

**Point here:** YOLOv10 (2024) trains both: a one-to-many head for signal and a one-to-one head used at test time, so it too runs without NMS.

**Transition:** DETR in code.

## detr-code: DETR in code: matching, then inference

**Build 1:** The cost matrix is three lines: class, L1 and GIoU for every (query, object) pair. One call solves the matching. The loss then uses the matched pairs.

- Ask: What shape is the cost matrix for 100 queries and N objects?
- Expected: (100, N).

**Build 2:** At test time there is nothing to match: run the model, keep the queries whose best class beats a threshold. No NMS.

- Ask: What replaces NMS at test time?
- Expected: A threshold on each query’s class probability.

**Notebook:** Notebook part 7 runs DETR on the two-dogs photo, builds this cost matrix and checks the matching against brute force.

**Transition:** Two answers side by side.

## two-answers: Two answers to one question

**Build 1:** Side by side. The structural difference is how outputs are assigned to objects in training: by place, several per object; or by matching, one per object.

- Ask: Where does each method decide which output answers for which object?
- Expected: YOLO: by cell position in training; DETR: by Hungarian matching in training.

**Build 2:** Both solve the lecture’s question with a fixed tensor plus a way to say “nothing here”.

- Ask: What plays the role of “no object” in YOLO?
- Expected: Low class scores, removed by the score filter.

**Point here:** DETR trained for 500 epochs on COCO; Deformable DETR, DINO and RT-DETR made such models faster to train and real-time.

**Transition:** Part 8: how good are they?

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

## precision-recall: Precision and recall

**Build 1:** Two numbers: precision divides by what we reported; recall divides by what was there.

- Ask: What do the two denominators count?
- Expected: Precision: all detections reported. Recall: all annotated objects.

**Build 2:** With the usual 0.25 score cut-off, the street photo is perfect: four found, nothing extra.

- Ask: What are precision and recall at 0.25?
- Expected: Both 1.

**Build 3:** Keep everything down to 0.01 and the eight windscreen boxes join: recall stays 1, precision drops to 0.33. The threshold trades one for the other.

- Ask: What happens at 0.01?
- Expected: Precision falls to 0.33; recall stays 1.

**Transition:** Measure all thresholds at once: rank the detections.

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

**Build 3:** Both detectors on our eight photos: perfect at IoU 0.5; at strict IoU, YOLOv8n 0.94, DETR 0.88. On COCO’s validation set the published numbers are 37.3 and 42.0.

- Ask: Which detector is better?
- Expected: On our 8 easy photos both are perfect at 0.5; on COCO, DETR-R50 scores higher. A handful of photos cannot decide it.

**Point here:** Our numbers come from our own evaluator (scripts/science.py) on our annotations; COCO numbers are from the YOLOv8 and DETR papers.

**Transition:** In code.

**Source:** Our evaluator on data/annotations.json; COCO numbers: Ultralytics YOLOv8 documentation and Carion et al. (2020).

## eval-code: Evaluation in code

**Build 1:** Libraries do the matching, ranking and averaging. The notebook also has a twenty-line version that reproduces the walk-through.

- Ask: Which number is COCO’s headline “AP”?
- Expected: map: the mean over IoU 0.5 to 0.95 and over classes.

**Notebook:** Notebook part 8 evaluates YOLOv8n on the eight photos with the hand-written evaluator.

**Transition:** Wrap-up.

## summary: One question, two answers, three matchings

**Build 1:** The lecture’s question: how can a network with a fixed output return a variable, unordered set?

- Ask: State the lecture’s question in one sentence.
- Expected: How a fixed-size output can describe a variable, unordered set.

**Build 2:** Two answers: tie outputs to places and clean up with NMS; or keep free slots and match them to objects in training.

- Ask: How do the two answers differ?
- Expected: By place (with NMS) versus by matching (no NMS).

**Build 3:** And three different matchings that are easy to confuse: assignment in training, NMS between predictions, evaluation against annotations. Each uses IoU.

- Ask: Which matching uses the annotations at test time?
- Expected: Evaluation, when measuring; at deployment none of them does.

**Transition:** Next lecture.

## next: Next: beyond boxes

**Build 1:** Boxes are the coarsest description of where an object is. Next: masks, keypoints, and finding objects named in words.

- Ask: What does a mask give that a box does not?
- Expected: Exactly which pixels are the object.

**Transition:** End of the main route.

**Source:** Masks: YOLOv8n-seg run on the photo (scripts/run_models.py).

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

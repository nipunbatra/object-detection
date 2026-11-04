# Object detection: from one label to a set of objects

Lecture 22 of ES 667 Deep Learning (IIT Gandhinagar). [Open the slides](https://nipunbatra.github.io/object-detection/) · [reading view](https://nipunbatra.github.io/object-detection/?reading) · [PDF](exports/object-detection.pdf) · [PDF with every reveal](exports/object-detection-builds.pdf) · [notebook in Colab](https://colab.research.google.com/github/nipunbatra/object-detection/blob/main/object-detection.ipynb) · [speaker notes](speaker-notes.md)

A detector returns a list of (class, box) entries whose length changes from photo to photo, while a network's
output has a fixed shape. The lecture starts from why that list is worth having, then builds a dense detector step
by step on one photo of a cat and a dog, with one idea per slide and real model numbers at every step:

| Part | Minutes | What happens |
|---|---:|---|
| 1 · Why detect objects? | 12 | Six jobs (road, crowd, camera trap, microscope, warehouse, factory): say what you would want, then see the list. What the list is for: count, locate, track, crop. Three hard cases from real outputs: a 502-px bus and a 13-px pedestrian, a bird boxed almost perfectly but scored 0.098, overlapping objects. |
| 2 · From one label to a list | 9 | A real ImageNet classifier gives one label; detection needs a set of (class, box) entries of any length, in no order; the route. |
| 3 · Boxes and IoU | 16 | Corner and centre formats with the dog's box; a YOLO label file; IoU computed one edge at a time, then the overlap's width, height and area; a live IoU figure with two worked answers; IoU in PyTorch, one line per click beside the boxes it computes on. |
| 4 · One box, then many | 13 | A box head and the target it learns, with "?" where nothing is to be learned; its L1 loss; two animals make it hedge (the average box matches neither); K slots as a target table, then DETR's real 100 slots on our photo; slots break on count (the crowd) and on order. |
| 5 · A candidate at every place | 26 | Andrew Ng's route to YOLO: a crop classifier slid over 5,400 windows; his 14 × 14 and 16 × 16 example of one CNN pass doing the sliding; a 30 × 20 grid on the photo; every cell writes a box and 80 class scores; the cell holding an object's centre learns it, with the box in cell units (b_x, b_y, b_w, b_h); targets, binary cross-entropy and the box loss worked at cell (10, 18); decoding; every cell's box; a live cell inspector. |
| 6 · NMS | 16 | The dog's ten real boxes reduced to one, IoU by IoU; two dogs; the threshold trade-off on a crowd; class-aware NMS on a cyclist; a live NMS figure; NMS in code, one line per click on the courtyard's 31 boxes; the pipeline as real thumbnails; the whole detector in code, one line per click. |
| 7 · Three grids | 6 | Why 12,600 cells; which grid found the bus and the far pedestrian. |
| 8 · Measuring | 14 | TP/FP/FN on real detections, precision and recall, Part 1's bird at two score cut-offs, a ranked list walked one row at a time, AP as an area, mAP. |
| Wrap-up | 5 | One question, one answer, three uses of IoU; back to the six jobs. |
| Appendix A · DETR | extra | The set-prediction answer: 100 learned queries, cross-attention maps, duplicates dropping out between decoder layers, GIoU, the matching cost one cell at a time, why greedy fails, the Hungarian algorithm, the loss, why no NMS; both detectors compared. |
| Appendix B · More depth | extra | YOLOv1, YOLOv8's four box distances, anchors, two-stage detectors, focal loss, box formats, letterboxing, after DETR. |

About 118 minutes with discussion: two class sessions, splitting after Part 4 (about 51 minutes) or after section
5.1. A 60-minute route: Part 1 (two jobs and the bird), Part 2, Part 3 without the live figure, sections 5.2 to 5.5,
Part 6 through the two dogs, and Part 8's walk down a ranked list.

The appendices are outside the main route: open the deck with `?all`, or read them in the reading view and the PDFs.

## How it teaches

Each click makes one move, one photo runs through the whole lecture, and every equation is followed by real numbers.
Each part opens with a route map and closes with a one-slide recap. Slides stay light: the slide never repeats its
story line, a slide that makes two moves is split in two, and `scripts/density.mjs` keeps every reveal under 100 words
and every story line under 30. Two teachers shaped the rebuild:

- Andrew Ng (Deep Learning Specialization, Course 4, Week 3): localisation as a target vector with "?" for the
  entries that do not count; a classifier for crops, slid over the image; the convolutional form of sliding windows;
  the cell that holds the object's centre; NMS stated as a plain recipe.
- Andrej Karpathy (Neural Networks: Zero to Hero; A Recipe for Training Neural Networks): show the end result
  first; look at the data (a label file); print the shapes (the raw output tensor); build from the simplest model
  and show where it breaks; look at the failures (the missed bird, the false people on a windscreen); the whole
  thing in a few lines of code.

## What is real

Every box, score, cell, attention map and cost on the slides comes from a real model run on these photos, read from
[data/science.json](data/science.json):

- YOLOv8n (Ultralytics, COCO-pretrained) run at each photo's own size, so a grid cell is a 32 × 32 block of the photo itself. We read its raw (84, 12,600) output before any post-processing; our NMS reproduces Ultralytics' output exactly.
- DETR (facebook/detr-resnet-50) with every decoder layer and its cross-attention (Appendix A).
- ResNet-50 (ImageNet) for the one-label answer; YOLOv8n-seg for the segmentation masks.
- Ground truth for the evaluation: boxes proposed by YOLOv8l and checked by eye ([data/annotations.json](data/annotations.json)).
- Cells, parcel and crack, which no COCO detector knows: boxes we drew ([data/applications.json](data/applications.json)), shown in teal as annotations, never as model output.

Three things are labelled as invented on their slides: a guess box moved 60 px from the dog's (to practise IoU), a
2 × 2 cost table where greedy matching fails, and a six-row ranked list for the precision and recall walk. The photos are
course-owned generated images ([SOURCES.md](SOURCES.md)); the real-world facts in Part 1 cite their sources in the
speaker notes and in [SOURCES.md](SOURCES.md).

## Present

Right/left arrows: next/previous reveal. Shift + arrow: next/previous slide. **F**: full screen. **N**: speaker
notes. **O**: scenes. **R**: reset the slide. `?reading` shows every slide complete with its notes; `?all` adds the
appendices to the presentation; `#slide-id/2` opens a reveal directly.

## Rebuild

```bash
~/base/bin/python scripts/run_models.py          # runs the models once  -> data/models.json
~/base/bin/python scripts/science.py             # every slide number, with checks -> data/science.json
~/base/bin/python scripts/build_notebook.py --run
python3 scripts/serve.py                         # http://127.0.0.1:8780/, no caching
node scripts/verify.mjs                          # every reveal rendered and checked -> qa/, manifest.json, speaker-notes.md
node scripts/density.mjs                         # words per reveal; fails on an overfull slide -> qa/density.json
~/base/bin/python scripts/contact_sheets.py --all
node scripts/export.mjs                          # both PDFs
```

`run_models.py` needs PyTorch, torchvision, Ultralytics (`yolov8n.pt`, `yolov8l.pt`, `yolov8n-seg.pt`; paths via
`YOLO_N`, `YOLO_L`, `YOLO_SEG`) and transformers with `facebook/detr-resnet-50` (set `HF_HUB_CACHE`). The browser
scripts need Puppeteer (a `node_modules` link to any install) and Chrome. The slides themselves need only a static
web server; KaTeX is bundled.

The deck engine in `shared/` is the one from the [generative modelling lectures](https://github.com/nipunbatra/generative/tree/main/lectures). This lecture moved here from [nipunbatra/attention](https://github.com/nipunbatra/attention) (`object-detection/`), where the earlier version stays in the history.

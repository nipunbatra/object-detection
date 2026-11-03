# Object detection: from one label to a set of objects

Lecture 22 of ES 667 Deep Learning (IIT Gandhinagar). [Open the slides](https://nipunbatra.github.io/object-detection/) · [reading view](https://nipunbatra.github.io/object-detection/?reading) · [PDF](exports/object-detection.pdf) · [PDF with every reveal](exports/object-detection-builds.pdf) · [notebook in Colab](https://colab.research.google.com/github/nipunbatra/object-detection/blob/main/object-detection.ipynb) · [speaker notes](speaker-notes.md)

A detector returns a list of (class, box) entries whose length changes from photo to photo, while a network's
output has a fixed shape. The lecture starts from why that list is worth having, then builds a dense detector step
by step on one photo of a cat and a dog, with one idea per slide and real model numbers at every step:

| Part | Minutes | What happens |
|---|---:|---|
| 1 · Why detect objects? | 12 | Six jobs (road, crowd, camera trap, microscope, warehouse, factory): say what you would want, then see the list. What the list is for: count, locate, track, crop. Three hard cases from real outputs: a 502-px bus and a 13-px pedestrian, a bird boxed almost perfectly but scored 0.098, overlapping objects. |
| 2 · From one label to a list | 9 | A real ImageNet classifier gives one label; detection needs a set of (class, box) entries of any length, in no order; the route. |
| 3 · Boxes and IoU | 14 | Corner and centre formats with the dog's box; a YOLO label file; IoU computed one edge at a time; a live IoU figure; IoU in PyTorch. |
| 4 · One box, then many | 10 | A box head and the target it learns, with "?" where nothing is to be learned; its L1 loss; two animals make it hedge (the average box matches neither); K slots break on count and on order. |
| 5 · A candidate at every place | 26 | A crop classifier, slid over 5,400 windows, then one CNN pass instead. YOLOv8n's real 30 × 20 grid and its (1, 84, 12,600) output; the centre cell and the 3 × 3 block; targets; binary cross-entropy and the box loss at cell (10, 18) by hand; decoding; a live cell inspector. |
| 6 · NMS | 13 | The dog's ten real boxes reduced to one, IoU by IoU; two dogs; the threshold trade-off on a crowd; class-aware NMS on a cyclist; a live NMS figure; NMS in eight lines, then the whole detector in eight lines. |
| 7 · Three grids | 6 | Why 12,600 cells; which grid found the bus and the far pedestrian. |
| 8 · Measuring | 14 | TP/FP/FN on real detections, precision and recall, Part 1's bird at two score cut-offs, a ranked list walked one row at a time, AP as an area, mAP. |
| Wrap-up | 5 | One question, one answer, three uses of IoU; back to the six jobs. |
| Appendix A · DETR | — | The set-prediction answer: 100 learned queries, cross-attention maps, duplicates dropping out between decoder layers, GIoU, the matching cost one cell at a time, why greedy fails, the Hungarian algorithm, the loss, why no NMS; both detectors compared. |
| Appendix B · More depth | — | YOLOv1, anchors, two-stage detectors, focal loss, box formats, letterboxing, after DETR. |

About 110 minutes with discussion: two class sessions, splitting after Part 4 (about 46 minutes) or after section
5.1. A 60-minute route: Part 1 (two jobs and the bird), Part 2, Part 3 without the live figure, sections 5.2 to 5.5,
Part 6 through the two dogs, and Part 8's precision–recall walk.

The appendices are outside the main route: open the deck with `?all`, or read them in the reading view and the PDFs.

## How it teaches

One move per click, one running example, real numbers after every equation, a route map opening each part and a
one-slide recap closing it. Two teachers shaped the rebuild:

- **Andrew Ng** (Deep Learning Specialization, Course 4, Week 3): localisation as a target vector with "?" for the
  entries that do not count; a classifier for crops, slid over the image; the convolutional form of sliding windows;
  the cell that holds the object's centre; NMS stated as a plain recipe.
- **Andrej Karpathy** (Neural Networks: Zero to Hero; A Recipe for Training Neural Networks): show the end result
  first; look at the data (a label file); print the shapes (the raw output tensor); build from the simplest model
  and show where it breaks; look at the failures (the missed bird, the false people on a windscreen); the whole
  thing in a few lines of code.

## What is real

Every box, score, cell, attention map and cost on the slides comes from a real model run on these photos, read from
[data/science.json](data/science.json):

- **YOLOv8n** (Ultralytics, COCO-pretrained) run at each photo's own size, so a grid cell is a 32 × 32 block of the photo itself. We read its raw (84, 12,600) output before any post-processing; our NMS reproduces Ultralytics' output exactly.
- **DETR** (facebook/detr-resnet-50) with every decoder layer and its cross-attention (Appendix A).
- **ResNet-50** (ImageNet) for the one-label answer; **YOLOv8n-seg** for the segmentation masks.
- **Ground truth** for the evaluation: boxes proposed by YOLOv8l and checked by eye ([data/annotations.json](data/annotations.json)).
- **Cells, parcel and crack**, which no COCO detector knows: boxes we drew ([data/applications.json](data/applications.json)), shown in teal as annotations, never as model output.

Three things are labelled as invented on their slides: a guess box moved 60 px from the dog's (to practise IoU), a
2 × 2 cost table where greedy matching fails, and a six-row ranked list for the precision–recall walk. The photos are
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
~/base/bin/python scripts/contact_sheets.py --all
node scripts/export.mjs                          # both PDFs
```

`run_models.py` needs PyTorch, torchvision, Ultralytics (`yolov8n.pt`, `yolov8l.pt`, `yolov8n-seg.pt`; paths via
`YOLO_N`, `YOLO_L`, `YOLO_SEG`) and transformers with `facebook/detr-resnet-50` (set `HF_HUB_CACHE`). The browser
scripts need Puppeteer (a `node_modules` link to any install) and Chrome. The slides themselves need only a static
web server; KaTeX is bundled.

The deck engine in `shared/` is the one from the [generative modelling lectures](https://github.com/nipunbatra/generative/tree/main/lectures). This lecture moved here from [nipunbatra/attention](https://github.com/nipunbatra/attention) (`object-detection/`), where the earlier version stays in the history.

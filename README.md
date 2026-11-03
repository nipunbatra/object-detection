# Object detection: from one label to a set of objects

Lecture 22 of ES 667 Deep Learning (IIT Gandhinagar). [Open the slides](https://nipunbatra.github.io/object-detection/) · [reading view](https://nipunbatra.github.io/object-detection/?reading) · [PDF](exports/object-detection.pdf) · [PDF with every reveal](exports/object-detection-builds.pdf) · [notebook in Colab](https://colab.research.google.com/github/nipunbatra/object-detection/blob/main/object-detection.ipynb) · [speaker notes](speaker-notes.md)

A detector returns a list of (class, box) entries whose length changes from photo to photo, while a network's
output has a fixed shape. The lecture builds both standard answers step by step, on one photo of a cat and a dog:

| Part | Minutes | What happens |
|---|---:|---|
| 1 · From one label to a list | 9 | A real ImageNet classifier gives one label; detection needs a set of (class, box) entries of any length, in no order. |
| 2 · Boxes and IoU | 13 | Corner and centre formats with the dog's box; IoU computed one edge at a time; a live IoU figure; IoU in PyTorch. |
| 3 · One box, then many | 8 | A box head and its L1 loss; two animals make it hedge (the average box matches neither); K slots break on count and on order (the same correct answer costs 100× more in the wrong order). |
| 4 · A candidate at every place | 20 | YOLOv8n's real 30 × 20 grid: one record per cell (4 distances + 80 class scores), which cells are positives, the targets, the class and box loss at cell (10, 18) by hand, decoding, a live cell inspector. |
| 5 · NMS | 11 | The dog's ten real boxes reduced to one, IoU by IoU; the threshold trade-off on a crowd; class-aware NMS on a cyclist; a live NMS figure; NMS in eight lines. |
| 6 · Three grids | 5 | Why 12,600 cells; which grid found the bus and the far pedestrian. |
| 7 · DETR | 17 | 100 learned queries, cross-attention maps, duplicates dropping out between decoder layers, GIoU, the matching cost one cell at a time, why greedy fails, the Hungarian algorithm, the loss, why no NMS. |
| 8 · Measuring | 12 | TP/FP/FN on real detections, precision and recall, a ranked list walked one row at a time, AP as an area, mAP, both detectors on our eight photos. |

About 100 minutes with discussion: two class sessions, or one if Part 6 and the optional slides are left to reading.
A 60-minute route: Parts 1, 2 (skip the live figure), 4 and 5 in full, Part 7 through the cost matrix, and Part 8's
precision–recall walk.

## What is real

Every box, score, cell, attention map and cost on the slides comes from a real model run on these photos, read from
[data/science.json](data/science.json):

- **YOLOv8n** (Ultralytics, COCO-pretrained) run at each photo's own size, so a grid cell is a 32 × 32 block of the photo itself. We read its raw (84, 12,600) output before any post-processing; our NMS reproduces Ultralytics' output exactly.
- **DETR** (facebook/detr-resnet-50) with every decoder layer and its cross-attention.
- **ResNet-50** (ImageNet) for the opening's one-label answer; **YOLOv8n-seg** for the segmentation masks.
- **Ground truth** for the evaluation: boxes proposed by YOLOv8l and checked by eye ([data/annotations.json](data/annotations.json)).

Three things are labelled as invented on their slides: a guess box moved 60 px from the dog's (to practise IoU), a
2 × 2 cost table where greedy matching fails, and a six-row ranked list for the precision–recall walk. The photos are
course-owned generated images ([SOURCES.md](SOURCES.md)).

## Present

Right/left arrows: next/previous reveal. Shift + arrow: next/previous slide. **F**: full screen. **N**: speaker
notes. **O**: scenes. **R**: reset the slide. `?reading` shows every slide complete with its notes; `?all` adds the
optional slides to the presentation; `#slide-id/2` opens a reveal directly.

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

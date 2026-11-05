# Sources

## Photos

Course-owned generated photographs from the earlier detection lecture (`dl-teaching/lecture9/figures/`), resized
and cropped here so that both sides are multiples of 32. They contain no annotations: every box, mask, score, grid
and heat map in the lecture is drawn from computed data. Prompts and hashes of the originals:
[figures/PROVENANCE-lecture9.md](figures/PROVENANCE-lecture9.md).

| Here | Original | Size here |
|---|---|---|
| cat-dog.jpg | imagen-cat-dog.png | 960 × 640 |
| two-dogs.jpg | imagen-two-dogs.png | 1280 × 704 |
| street.jpg | imagen-campus-street.png | 1280 × 704 |
| crowd.jpg | imagen-campus-crowd.png | 1280 × 704 |
| scale.jpg | imagen-campus-scale.png | 1280 × 704 |
| cat.jpg | imagen-cat-single.png | 1280 × 704 |
| cat-dog-bird.jpg | imagen-cat-dog-bird.png | 1280 × 704 |
| dog-occluded.jpg | imagen-dog-occluded.png | 1280 × 704 |
| parcel.jpg, cells.jpg, defect.jpg | imagen-warehouse-parcel.png, imagen-microscopy-cells.png, imagen-industrial-defect.png | 1280 × 704 |

## A photo made for the two-boxes slide

`figures/person-car.jpg` (1248 × 832) was generated for this lecture on 4 Nov 2026 with Gemini 2.5 Flash Image
(`gemini-2.5-flash-image`, aspect ratio 3:2) from this prompt: “A realistic, natural-looking photograph taken at eye level
on a quiet residential street in daylight. A silver hatchback car is parked side-on to the camera, filling about two thirds
of the frame width, fully visible from bumper to bumper, its wheels touching the road. A young adult in a plain blue shirt
and dark trousers stands directly in front of the middle of the car, facing the camera, whole body visible from head to
shoes, standing upright, centred on the car. Soft overcast light, a plain wall behind, nobody else in the scene, no text,
no logos, no number plate visible. Sharp focus, documentary style, landscape orientation.” Its two boxes are in
[data/person-car.json](data/person-car.json): the person from YOLOv8l, checked by eye; the car by eye, because YOLOv8l
split it in two around the person.

## Hand-drawn boxes

The cells, the parcel and the crack (Part 1) have no COCO class, so no detector in the lecture can find them. Their
boxes are ours, in [data/applications.json](data/applications.json): cells by a colour threshold and connected
components, with the one touching pair split by eye; the parcel by a colour threshold, checked by eye; the crack drawn
by eye on a 5× zoom. The slides draw them in teal, the colour of annotations, never in purple, the colour of a model.

## Real-world facts in Part 1

- Pedestrian braking: IIHS (2022), [Pedestrian crash avoidance systems cut crashes, but not in the dark](https://www.iihs.org/news/detail/pedestrian-crash-avoidance-systems-cut-crashes--but-not-in-the-dark): 27% fewer pedestrian crashes, 30% fewer injury crashes, no difference on unlit roads at night.
- Camera traps: Celis et al., [A versatile, semi-automated image analysis workflow for time-lapse camera trap image classification](https://munin.uit.no/handle/10037/34526), Ecological Informatics 81 (2024) 102578: 548,627 photos from 46 cameras in Finnmark and Yamal; manual checking cut to 9.2% and 3.9%. [MegaDetector](https://megadetector.readthedocs.io/).
- Cells: Caicedo et al., [Nucleus segmentation across imaging experiments: the 2018 Data Science Bowl](https://doi.org/10.1038/s41592-019-0612-7), Nature Methods (2019): 37,333 nuclei annotated by hand in 841 images.
- Shelves: Goldman et al., [Precise detection in densely packed scenes](https://arxiv.org/abs/1904.00853) (SKU-110K), 2019: about 147 objects per image.
- Steel defects: [NEU surface defect database](https://faculty.neu.edu.cn/songkc/en/zdylm/263265/list/index.htm): six defect classes, 300 images each.
- Traffic cameras in Kerala (notes only): [The South First](https://thesouthfirst.com/news/glitches-galore-as-kerala-minister-says-road-accident-deaths-down-after-ai-camera-surveillance), 2023: 726 cameras, 675 AI-capable.
- Maha Kumbh 2025 (notes only): [PIB brief](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2024/dec/doc20241229478201.pdf) on AI-enabled CCTV for crowd density.
- The long tail of stop signs (notes only): Karpathy at ScaledML 2020, as reported by [The Batch](https://www.deeplearning.ai/the-batch/tracking-the-elusive-stop-sign/).
- COCO: Lin et al., [Microsoft COCO](https://arxiv.org/abs/1405.0312), and [cocodataset.org](https://cocodataset.org/): 80 detection categories, over 200,000 labelled images, 1.5 million object instances.

## Teaching inspiration

- Andrew Ng, Deep Learning Specialization, Course 4, Week 3, [Detection algorithms](https://www.youtube.com/playlist?list=PLkDaE6sCZn6Gl29AoE31iwdVwSG-KnDzF): the target vector with "?" for don't-care entries, sliding windows and their convolutional form, the cell that holds the midpoint, NMS as a recipe.
- Andrej Karpathy, [A Recipe for Training Neural Networks](https://karpathy.github.io/2019/04/25/recipe/) (2019) and [Neural Networks: Zero to Hero](https://karpathy.ai/zero-to-hero.html): end result first, look at the data, print shapes, simplest baseline first, visualise failures.
- Stanford CS231n, [2016 Lecture 8](http://cs231n.stanford.edu/slides/2016/winter1516_lecture8.pdf) and [2017 Lecture 11](http://cs231n.stanford.edu/slides/2017/cs231n_2017_lecture11.pdf): detection as regression needs variable-sized outputs; R-CNN at 47 s per image.
- Sermanet et al., [OverFeat](https://arxiv.org/abs/1312.6229), 2014: sliding windows computed by one convolutional pass.

## Models

- YOLOv8n, YOLOv8l, YOLOv8n-seg: [Ultralytics](https://docs.ultralytics.com/models/yolov8/) (AGPL-3.0), COCO-pretrained weights. Published COCO val2017 mAP<sup>50-95</sup> for YOLOv8n: 37.3.
- DETR: [facebook/detr-resnet-50](https://huggingface.co/facebook/detr-resnet-50) (Apache-2.0), through Hugging Face transformers. Published COCO AP: 42.0.
- ResNet-50: torchvision `IMAGENET1K_V2` weights.

## References

- Redmon et al., [You Only Look Once](https://arxiv.org/abs/1506.02640), 2016: the 7 × 7 × 30 grid.
- Tian et al., [FCOS](https://arxiv.org/abs/1904.01355), 2019: distances to the four sides and centre sampling.
- Feng et al., [TOOD](https://arxiv.org/abs/2108.07755), 2021: the task-aligned assigner YOLOv8 uses (10 positives per object).
- Lin et al., [Feature Pyramid Networks](https://arxiv.org/abs/1612.03144), 2017; [Focal loss / RetinaNet](https://arxiv.org/abs/1708.02002), 2017.
- Ren et al., [Faster R-CNN](https://arxiv.org/abs/1506.01497), 2015.
- Carion et al., [End-to-End Object Detection with Transformers](https://arxiv.org/abs/2005.12872), 2020, and the [official code](https://github.com/facebookresearch/detr) (matching weights 1, 5, 2; no-object weight 0.1).
- Rezatofighi et al., [Generalized IoU](https://arxiv.org/abs/1902.09630), 2019.
- Kuhn, The Hungarian method for the assignment problem, 1955; [scipy.optimize.linear_sum_assignment](https://docs.scipy.org/doc/scipy/reference/generated/scipy.optimize.linear_sum_assignment.html).
- Zhu et al., [Deformable DETR](https://arxiv.org/abs/2010.04159), 2021; Zhao et al., [RT-DETR](https://arxiv.org/abs/2304.08069), 2023; Wang et al., [YOLOv10](https://arxiv.org/abs/2405.14458), 2024.
- [COCO detection evaluation](https://cocodataset.org/#detection-eval): AP averaged over IoU 0.50–0.95 and 101 recall points.

Earlier versions: the [attention-series object detection deck](https://github.com/nipunbatra/attention/tree/main/object-detection) and its source in `dl-teaching/attention-followups/object-detection/`; the DETR film's matching example (`dl-summaries/detr/math/detr_matching_example.py`) suggested the greedy-versus-optimal table.

KaTeX 0.16 is bundled under its MIT licence (`shared/katex/LICENSE`).

## A photo made for Part 8's teaching example

`figures/dog-park.jpg` (1344 × 768) was generated with Gemini 2.5 Flash Image (`gemini-2.5-flash-image`, 16:9) on 4 November 2026, from this prompt:

> A realistic, natural-looking photograph of a sunny city park lawn, taken at a standing adult's eye level, landscape orientation. Five dogs are spread out across the grass with clear space between them, each one fully visible from nose to tail: on the left a golden retriever lying down, near the centre a black labrador standing side-on, on the right a beagle sitting and facing the camera, in the front right a small white terrier walking, and far away in the background near a big tree on the left, one small brown dachshund, tiny in the frame. A brown leather shoulder bag lies on the grass between the labrador and the beagle, about the size of a small dog. A wooden bench and green bushes in the background. Soft natural light, no people, no text, no logos, sharp focus, documentary style.

The five dog boxes are YOLOv8l proposals (scores 0.80 to 0.95), checked by eye on enlarged crops. The eight detections in `data/dog-park.json` are made up for teaching: boxes placed by hand on the dogs, the bag, the bench and a bush, and scores chosen so that right and wrong boxes interleave. `scripts/science.py` computes every IoU, verdict, precision, recall and AP from them and checks the story the slides tell.

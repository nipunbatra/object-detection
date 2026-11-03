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

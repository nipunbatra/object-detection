"""Run the real models once and save what the lecture shows to data/models.json.

    ~/base/bin/python scripts/run_models.py

Every photo in figures/ has both sides a multiple of 32, so YOLOv8 runs at the photo's own size with no resizing
or padding: a candidate's row and column are cells of the photo itself, and every box is in photo pixels.

Models (all pretrained on COCO or ImageNet; nothing is trained here):
- ResNet-50, torchvision IMAGENET1K_V2: the one-label classifier of the opening.
- YOLOv8n (Ultralytics, yolov8n.pt): the dense detector. We read its raw output tensor, before any NMS.
- YOLOv8l (yolov8l.pt): a larger model, used only to propose the hand-checked ground-truth boxes.
- DETR, facebook/detr-resnet-50 (Hugging Face): the set predictor, with every decoder layer and its cross-attention.
"""
import json, os, sys
from pathlib import Path

import numpy as np
import torch
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
FIG, DATA = ROOT / 'figures', ROOT / 'data'
YOLO_N = os.environ.get('YOLO_N', '/Users/nipun/yolov8n.pt')
YOLO_L = os.environ.get('YOLO_L', '/Users/nipun/git/blog/posts/yolov8l.pt')
os.environ.setdefault('HF_HUB_CACHE', '/Volumes/Extreme SSD/hf-cache')
os.environ.setdefault('HF_HUB_OFFLINE', '1')
torch.set_grad_enabled(False)

PHOTOS = ['cat-dog', 'two-dogs', 'street', 'crowd', 'scale', 'cat', 'cat-dog-bird', 'dog-occluded']
STRIDES = (8, 16, 32)
r3 = lambda v: round(float(v), 3)
r1 = lambda v: round(float(v), 1)


def load(name):
    im = Image.open(FIG / f'{name}.jpg').convert('RGB')
    assert im.width % 32 == 0 and im.height % 32 == 0, (name, im.size)
    return im


# ---------------------------------------------------------------- ResNet-50: one label for the whole photo
def classify():
    from torchvision.models import resnet50, ResNet50_Weights
    w = ResNet50_Weights.IMAGENET1K_V2
    net = resnet50(weights=w).eval()
    x = w.transforms()(load('cat-dog'))[None]
    p = net(x).softmax(-1)[0]
    top = torch.topk(p, 5)
    cats = w.meta['categories']
    out = [{'label': cats[i], 'p': r3(v)} for v, i in zip(top.values.tolist(), top.indices.tolist())]
    # the cat classes of ImageNet (281-285) together
    cat_mass = float(p[281:286].sum())
    dog_mass = float(p[151:269].sum())  # the 118 dog breeds
    return {'top5': out, 'p_all_cat_classes': r3(cat_mass), 'p_all_dog_classes': r3(dog_mass), 'classes': len(cats)}


# ---------------------------------------------------------------- YOLOv8: the raw candidate tensor
def yolo_raw(net, im):
    """(N, 84): decoded boxes (cx, cy, w, h in pixels) and 80 sigmoid class scores, one row per cell."""
    x = torch.from_numpy(np.array(im)).permute(2, 0, 1)[None].float() / 255
    y, _ = net(x)
    return y[0].T.numpy()


def cells(W, H):
    """For each candidate row: level, stride, grid row, grid column and the cell centre in pixels."""
    out = []
    for lv, s in enumerate(STRIDES):
        gh, gw = H // s, W // s
        for r in range(gh):
            for c in range(gw):
                out.append((lv, s, r, c, (c + .5) * s, (r + .5) * s))
    return out


def yolo_record(raw, meta, k, names, top=3):
    lv, s, r, c, ax, ay = meta[k]
    cx, cy, w, h = raw[k, :4]
    sc = raw[k, 4:]
    order = np.argsort(-sc)[:top]
    x1, y1, x2, y2 = cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2
    return {'k': int(k), 'stride': s, 'row': r, 'col': c, 'centre': [r1(ax), r1(ay)],
            'box': [r1(x1), r1(y1), r1(x2), r1(y2)],
            'ltrb': [r1(ax - x1), r1(ay - y1), r1(x2 - ax), r1(y2 - ay)],
            'cls': int(order[0]), 'name': names[int(order[0])], 'score': r3(sc[order[0]]),
            'top': [[names[int(i)], round(float(sc[i]), 5)] for i in order]}


def yolo_all():
    from ultralytics import YOLO
    m = YOLO(YOLO_N)
    net = m.model.float().eval()
    names = m.names
    res = {'model': 'YOLOv8n (Ultralytics 8.3, COCO-pretrained, yolov8n.pt)', 'names': [names[i] for i in range(80)],
           'photos': {}}
    for name in PHOTOS:
        im = load(name)
        raw = yolo_raw(net, im)
        meta = cells(im.width, im.height)
        assert len(meta) == raw.shape[0]
        score = raw[:, 4:].max(1)
        keep = np.where(score >= 0.01)[0]
        keep = keep[np.argsort(-score[keep])]
        per_level = [(im.height // s) * (im.width // s) for s in STRIDES]
        photo = {'size': [im.width, im.height], 'per_level': per_level, 'n': int(raw.shape[0]),
                 'candidates': [yolo_record(raw, meta, k, names) for k in keep]}
        # Ultralytics' own post-processing, to check our NMS against
        r = m.predict(str(FIG / f'{name}.jpg'), imgsz=(im.height, im.width), conf=0.25, iou=0.7, verbose=False)[0]
        photo['ultralytics'] = [{'name': names[int(c)], 'score': r3(s), 'box': [r1(v) for v in b.tolist()]}
                                for b, s, c in zip(r.boxes.xyxy, r.boxes.conf, r.boxes.cls)]
        if name == 'cat-dog':
            # full score maps of the stride-32 grid for the dog and the cat, and two whole records
            off = per_level[0] + per_level[1]
            gh, gw = im.height // 32, im.width // 32
            for cname in ['dog', 'cat']:
                ci = [i for i in names if names[i] == cname][0]
                photo[f'map32_{cname}'] = [[round(float(raw[off + rr * gw + cc, 4 + ci]), 4) for cc in range(gw)]
                                           for rr in range(gh)]
            # every stride-32 record, compactly: box and the three best classes (for the cell inspector)
            photo['cells32'] = []
            for k in range(off, off + gh * gw):
                rec = yolo_record(raw, meta, k, names)
                photo['cells32'].append([rec['row'], rec['col'], *rec['box'], *[v for t in rec['top'] for v in t]])
            for tag, (rr, cc) in {'dog_cell': (10, 18), 'background_cell': (3, 3)}.items():
                k = off + rr * gw + cc
                rec = yolo_record(raw, meta, k, names)
                rec['scores'] = [float(v) for v in raw[k, 4:]]  # all 80, unrounded, for the loss
                photo[tag] = rec
            # the highest score anywhere on each level, per class, for the level slide
            photo['level_max'] = {}
            start = 0
            for s, n in zip(STRIDES, per_level):
                block = raw[start:start + n, 4:]
                photo['level_max'][str(s)] = {names[i]: r3(block[:, i].max()) for i in (0, 15, 16, 58)}
                start += n
        res['photos'][name] = photo
        print(f'yolo {name}: {raw.shape[0]} candidates, {len(keep)} above 0.01, ultralytics keeps {len(photo["ultralytics"])}')
    # the larger model proposes ground truth for every photo (boxes checked by eye afterwards)
    big = YOLO(YOLO_L)
    res['proposals_v8l'] = {}
    for name in PHOTOS:
        im = load(name)
        r = big.predict(str(FIG / f'{name}.jpg'), imgsz=(im.height, im.width), conf=0.25, iou=0.7, verbose=False)[0]
        res['proposals_v8l'][name] = [{'name': names[int(c)], 'score': r3(s), 'box': [r1(v) for v in b.tolist()]}
                                      for b, s, c in zip(r.boxes.xyxy, r.boxes.conf, r.boxes.cls)]
    return res


# ---------------------------------------------------------------- YOLOv8n-seg: one mask per object (the "segmentation" rung)
def seg_courtyard():
    from ultralytics import YOLO
    m = YOLO(os.environ.get('YOLO_SEG', '/Users/nipun/git/principles-ai-teaching/object-detection/yolov8n-seg.pt'))
    im = load('cat-dog')
    r = m.predict(str(FIG / 'cat-dog.jpg'), imgsz=(im.height, im.width), conf=0.5, verbose=False)[0]
    out = []
    for poly, c, s in zip(r.masks.xy, r.boxes.cls, r.boxes.conf):
        name = m.names[int(c)]
        if name in ('cat', 'dog'):
            step = max(1, len(poly) // 90)
            out.append({'name': name, 'score': r3(s), 'polygon': [[r1(x), r1(y)] for x, y in poly[::step]]})
    return {'model': 'YOLOv8n-seg (Ultralytics)', 'masks': out}


# ---------------------------------------------------------------- DETR: 100 queries, six decoder layers
def detr_all():
    from transformers import DetrImageProcessor, DetrForObjectDetection
    proc = DetrImageProcessor.from_pretrained('facebook/detr-resnet-50')
    model = DetrForObjectDetection.from_pretrained('facebook/detr-resnet-50', attn_implementation='eager').eval()
    id2label = model.config.id2label
    nclass = model.config.num_labels  # 91 COCO ids; index 91 is "no object"
    res = {'model': 'DETR, facebook/detr-resnet-50 (Hugging Face transformers)', 'photos': {}}
    for name in ['cat-dog', 'two-dogs', 'street']:
        im = load(name)
        inp = proc(images=im, return_tensors='pt')
        out = model(**inp, output_attentions=True, output_hidden_states=True)
        _, _, H, W = inp['pixel_values'].shape
        # every decoder layer's output through the same two heads (DETR trains all six this way)
        # (the stored states of layers 1-5 precede the decoder's final LayerNorm; layer 6's already includes it)
        dec = model.model.decoder
        layers = []
        for i, h in enumerate(out.decoder_hidden_states[1:], start=1):
            z = dec.layernorm(h) if i < 6 else h
            layers.append((model.class_labels_classifier(z).softmax(-1)[0], model.bbox_predictor(z).sigmoid()[0]))
        p_last, b_last = out.logits.softmax(-1)[0], out.pred_boxes[0]
        assert torch.allclose(layers[-1][0], p_last, atol=1e-5) and torch.allclose(layers[-1][1], b_last, atol=1e-5)

        def query(p, b, q):
            best = int(p[q, :nclass].argmax())
            return {'q': q, 'name': id2label.get(best, 'N/A'), 'p': round(float(p[q, best]), 5), 'p_none': round(float(p[q, nclass]), 5),
                    'box': [round(float(v), 5) for v in b[q]]}
        photo = {'size': [im.width, im.height], 'input': [W, H], 'queries': 100,
                 'final': [query(p_last, b_last, q) for q in range(100)],
                 'layers': [[query(p, b, q) for q in range(100)] for p, b in layers]}
        # cross-attention of the last decoder layer, averaged over the 8 heads, on the feature grid
        mask = out.cross_attentions[-1][0].mean(0)  # (100, tokens)
        tokens = mask.shape[1]
        gh, gw = int(np.ceil(H / 32)), int(np.ceil(W / 32))
        assert gh * gw == tokens, (gh, gw, tokens)
        top = torch.argsort(-(1 - p_last[:, nclass]))[:6].tolist()
        photo['grid'] = [gw, gh]
        photo['attention'] = {str(q): [[round(float(v), 5) for v in row] for row in mask[q].reshape(gh, gw).tolist()]
                              for q in top}
        res['photos'][name] = photo
        print(f'detr {name}: input {W}x{H}, {tokens} image tokens, top queries {top}')
    # every photo once more, keeping only the queries that name an object (for the evaluation in Part 8)
    res['detections'] = {}
    for name in PHOTOS:
        im = load(name)
        out = model(**proc(images=im, return_tensors='pt'))
        p, b = out.logits.softmax(-1)[0], out.pred_boxes[0]
        dets = []
        for q in range(100):
            best = int(p[q, :nclass].argmax())
            if float(p[q, best]) >= 0.01:
                cx, cy, w, h = b[q].tolist()
                box = [(cx - w / 2) * im.width, (cy - h / 2) * im.height, (cx + w / 2) * im.width, (cy + h / 2) * im.height]
                dets.append({'q': q, 'name': id2label.get(best, 'N/A'), 'score': round(float(p[q, best]), 4),
                             'box': [r1(v) for v in box]})
        res['detections'][name] = sorted(dets, key=lambda x: -x['score'])
    res['labels'] = {str(k): v for k, v in id2label.items()}
    return res


if __name__ == '__main__':
    DATA.mkdir(exist_ok=True)
    out = {'classifier': classify()}
    print('classifier', out['classifier']['top5'][:3])
    out['yolo'] = yolo_all()
    out['seg'] = seg_courtyard()
    out['detr'] = detr_all()
    out['torch'] = torch.__version__
    (DATA / 'models.json').write_text(json.dumps(out, separators=(',', ':')))
    print('wrote', DATA / 'models.json', round((DATA / 'models.json').stat().st_size / 1e6, 2), 'MB')

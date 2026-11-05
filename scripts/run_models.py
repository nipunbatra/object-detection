"""Run the real models once and save what the lecture shows to data/models.json.

    ~/base/bin/python scripts/run_models.py

Every photo in figures/ has both sides a multiple of 32, so YOLOv8 runs at the photo's own size with no resizing
or padding: a candidate's row and column are cells of the photo itself, and every box is in photo pixels.

Models (all pretrained on COCO or ImageNet; nothing is trained here):
- ResNet-50, torchvision IMAGENET1K_V2: the one-label classifier of the opening.
- YOLOv8n (Ultralytics, yolov8n.pt): the dense detector. We read its raw output tensor, before any NMS.
- YOLOv8l (yolov8l.pt): a larger model, used only to propose the hand-checked ground-truth boxes.
- DETR, facebook/detr-resnet-50 (Hugging Face): the set predictor, with every decoder layer and its cross-attention.
- VGG16, torchvision IMAGENET1K_V1: Andrew Ng's convolutional sliding windows. Its dense layers, rewritten as
  convolutions, classify every 224 x 224 window of the photo (32 px apart) in one pass; we compare with the 336 crops.

    ~/base/bin/python scripts/run_models.py windows    # only the VGG16 windows, patched into data/models.json
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


def top_scores32(raw, off, n, k=8):
    """Every stride-32 cell's k highest class scores as [class index, score], and the largest (k+1)-th score of
    any cell: below it, the other classes' bars are too short to see, so k scores draw all 80 faithfully."""
    sc = raw[off:off + n, 4:]
    order = np.argsort(-sc, axis=1)
    top = [[[int(i), round(float(sc[c, i]), 5)] for i in order[c, :k]] for c in range(n)]
    return {'k': k, 'cells': top, 'rest_max': round(float(max(sc[c, order[c, k]] for c in range(n))), 5)}


def yolo_scores32():
    """Only the courtyard's stride-32 top scores, patched into data/models.json (python run_models.py scores32)."""
    from ultralytics import YOLO
    net = YOLO(YOLO_N).model.float().eval()
    im = load('cat-dog')
    raw = yolo_raw(net, im)
    per_level = [(im.height // s) * (im.width // s) for s in STRIDES]
    return top_scores32(raw, per_level[0] + per_level[1], per_level[2])


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
            photo['top32'] = top_scores32(raw, off, gh * gw)
            for tag, (rr, cc) in {'dog_cell': (10, 18), 'background_cell': (3, 3)}.items():
                k = off + rr * gw + cc
                rec = yolo_record(raw, meta, k, names)
                rec['scores'] = [float(v) for v in raw[k, 4:]]  # all 80, unrounded, for the loss
                rec['cxcywh'] = [round(float(v), 2) for v in raw[k, :4]]  # the column's first four rows, as printed
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


# ---------------------------------------------------------------- VGG16: sliding windows, crop by crop and in one pass
def windows_vgg(size=224, step=32):
    """Ng's trick on a real classifier. VGG16 ends in three dense layers; written as a 7 x 7 convolution and two 1 x 1
    convolutions they accept any input, so one pass over the 960 x 640 photo classifies every 224 x 224 window that
    starts on a multiple of 32 px: a 14 x 24 grid of answers. We also run the 336 crops one at a time and time both."""
    import time
    from torchvision.models import vgg16, VGG16_Weights
    w = VGG16_Weights.IMAGENET1K_V1
    net = vgg16(weights=w).eval()
    mean, std = torch.tensor([0.485, 0.456, 0.406])[:, None, None], torch.tensor([0.229, 0.224, 0.225])[:, None, None]
    im = load('cat-dog')
    x = (torch.from_numpy(np.array(im)).permute(2, 0, 1).float() / 255 - mean) / std
    H, W = x.shape[1:]
    rows, cols = (H - size) // step + 1, (W - size) // step + 1
    fc1, fc2, fc3 = net.classifier[0], net.classifier[3], net.classifier[6]
    conv1 = torch.nn.Conv2d(512, 4096, 7)
    conv1.weight.data = fc1.weight.data.view(4096, 512, 7, 7)
    conv1.bias.data = fc1.bias.data
    conv2, conv3 = torch.nn.Conv2d(4096, 4096, 1), torch.nn.Conv2d(4096, 1000, 1)
    conv2.weight.data, conv2.bias.data = fc2.weight.data.view(4096, 4096, 1, 1), fc2.bias.data
    conv3.weight.data, conv3.bias.data = fc3.weight.data.view(1000, 4096, 1, 1), fc3.bias.data
    head = torch.nn.Sequential(conv1, torch.nn.ReLU(), conv2, torch.nn.ReLU(), conv3).eval()
    masses = lambda p: (p[:, 151:269].sum(1), p[:, 281:286].sum(1))   # the 118 dog breeds; the 5 cat classes
    net(x[None, :, :size, :size])                                     # warm up
    t0 = time.perf_counter()
    feat = net.features(x[None])                                      # 1 x 512 x 20 x 30
    one = head(feat).softmax(1)                                       # 1 x 1000 x 14 x 24
    t_one = time.perf_counter() - t0
    assert one.shape[2:] == (rows, cols), one.shape
    crops = torch.stack([x[:, r * step:r * step + size, c * step:c * step + size] for r in range(rows) for c in range(cols)])
    t0 = time.perf_counter()
    pc = torch.cat([net(crops[i:i + 16]).softmax(1) for i in range(0, len(crops), 16)])
    t_crops = time.perf_counter() - t0
    d1, c1 = masses(one)
    d2, c2 = masses(pc)
    grid = lambda t: [[r3(v) for v in row] for row in t.reshape(rows, cols).tolist()]
    top1 = lambda p: p.argmax(1).reshape(-1)
    return {'model': 'VGG16, torchvision IMAGENET1K_V1', 'size': size, 'step': step, 'rows': rows, 'cols': cols,
            'dog_onepass': grid(d1[0]), 'cat_onepass': grid(c1[0]), 'dog_crops': grid(d2), 'cat_crops': grid(c2),
            'top1_same': int((top1(one[0].reshape(1000, -1).T) == top1(pc)).sum()),
            't_onepass': round(t_one, 2), 't_crops': round(t_crops, 2), 'threads': torch.get_num_threads(),
            'device': 'cpu', 'torch': torch.__version__}


# ---------------------------------------------------------------- a toy YOLO for Part 5: one photo, a 3 x 2 grid, 7 numbers per cell
def toy_yolo(steps=300, lr=1e-2, h=160, w=240):
    """A tiny CNN whose output is a 2 x 3 x 7 table, trained on the courtyard photo alone with Ng's squared-error loss:
    all 7 numbers in a cell that holds a centre, only object? elsewhere. Its last step keeps every number in range,
    as YOLO does: a sigmoid for object?, b_x, b_y and the class scores (0 to 1), an exponential for b_w and b_h (above 0).
    It memorises one photo; it shows the mechanics (the predicted table, compared with the ground truth, moving towards it)."""
    A = json.loads((DATA / 'annotations.json').read_text())
    s = 320
    y = torch.zeros(2, 3, 7)
    for name, (x1, y1, x2, y2) in A['photos']['cat-dog']:
        cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
        r, c = int(cy // s), int(cx // s)
        y[r, c] = torch.tensor([1, cx / s - c, cy / s - r, (x2 - x1) / s, (y2 - y1) / s, float(name == 'cat'), float(name == 'dog')])
    x = torch.from_numpy(np.array(load('cat-dog').resize((w, h)))).permute(2, 0, 1)[None].float() / 255
    torch.manual_seed(0)
    net = torch.nn.Sequential(torch.nn.Conv2d(3, 16, 3, 2, 1), torch.nn.ReLU(), torch.nn.Conv2d(16, 32, 3, 2, 1), torch.nn.ReLU(),
                              torch.nn.Conv2d(32, 64, 3, 2, 1), torch.nn.ReLU(), torch.nn.AdaptiveAvgPool2d((2, 3)), torch.nn.Conv2d(64, 7, 1))
    m = y[..., 0] == 1
    cell_loss = lambda p: (p[..., 0] - y[..., 0]) ** 2 + m * ((p[..., 1:] - y[..., 1:]) ** 2).sum(-1)
    opt = torch.optim.Adam(net.parameters(), lr=lr)
    hist, snaps = [], {}
    with torch.enable_grad():
        for step in range(steps + 1):
            t = net(x)[0].permute(1, 2, 0)          # the raw numbers, any sign
            pred = torch.cat([torch.sigmoid(t[..., :3]), torch.exp(t[..., 3:5]), torch.sigmoid(t[..., 5:])], -1)
            per = cell_loss(pred)
            L = per.sum()
            hist.append(round(L.item(), 4))
            if step in (0, 25, 50, 100, steps):
                snaps[str(step)] = {'table': [[[round(float(v), 3) for v in pred[r, c].detach()] for c in range(3)] for r in range(2)],
                                    'cell_loss': [[round(float(v), 4) for v in row] for row in per.detach()]}
            if step < steps:
                opt.zero_grad(); L.backward(); opt.step()
    return {'target': [[[round(float(v), 3) for v in y[r, c]] for c in range(3)] for r in range(2)], 'snaps': snaps, 'loss': hist,
            'steps': steps, 'lr': lr, 'input': [h, w], 'params': sum(q.numel() for q in net.parameters()),
            'layers': ['conv 3x3 stride 2: 80 x 120 x 16', 'conv 3x3 stride 2: 40 x 60 x 32', 'conv 3x3 stride 2: 20 x 30 x 64',
                       'average over each cell: 2 x 3 x 64', 'conv 1x1: 2 x 3 x 7', 'sigmoid (object?, b_x, b_y, classes), exp (b_w, b_h)']}


if __name__ == '__main__':
    DATA.mkdir(exist_ok=True)
    if sys.argv[1:] == ['toy']:
        out = json.loads((DATA / 'models.json').read_text())
        out['toy_yolo'] = toy_yolo()
        print('toy', out['toy_yolo']['loss'][0], out['toy_yolo']['loss'][-1], out['toy_yolo']['params'])
        (DATA / 'models.json').write_text(json.dumps(out, separators=(',', ':')))
        sys.exit()
    if sys.argv[1:] == ['scores32']:
        out = json.loads((DATA / 'models.json').read_text())
        out['yolo']['photos']['cat-dog']['top32'] = yolo_scores32()
        print('scores32', len(out['yolo']['photos']['cat-dog']['top32']['cells']), out['yolo']['photos']['cat-dog']['top32']['rest_max'])
        (DATA / 'models.json').write_text(json.dumps(out, separators=(',', ':')))
        sys.exit()
    if sys.argv[1:] == ['windows']:
        out = json.loads((DATA / 'models.json').read_text())
        out['windows_vgg'] = windows_vgg()
        print('windows', {k: v for k, v in out['windows_vgg'].items() if not isinstance(v, list)})
        (DATA / 'models.json').write_text(json.dumps(out, separators=(',', ':')))
        sys.exit()
    out = {'classifier': classify()}
    print('classifier', out['classifier']['top5'][:3])
    out['yolo'] = yolo_all()
    out['seg'] = seg_courtyard()
    out['detr'] = detr_all()
    out['windows_vgg'] = windows_vgg()
    out['toy_yolo'] = toy_yolo()
    out['torch'] = torch.__version__
    (DATA / 'models.json').write_text(json.dumps(out, separators=(',', ':')))
    print('wrote', DATA / 'models.json', round((DATA / 'models.json').stat().st_size / 1e6, 2), 'MB')

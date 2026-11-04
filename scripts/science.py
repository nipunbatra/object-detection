"""Every number the slides show, computed from the real model outputs and checked.

    ~/base/bin/python scripts/science.py        reads data/models.json and data/annotations.json,
                                                writes data/science.json (the slides and widgets read only this)

Run scripts/run_models.py first. Each block below is one worked example of the lecture, in lecture order, and
asserts what the slides say about it (for example that our NMS keeps exactly what Ultralytics keeps).
"""
import itertools, json, math
from collections import Counter
from pathlib import Path

import numpy as np
from scipy.optimize import linear_sum_assignment

ROOT = Path(__file__).resolve().parents[1]
M = json.loads((ROOT / 'data/models.json').read_text())
A = json.loads((ROOT / 'data/annotations.json').read_text())
Y, DT = M['yolo'], M['detr']
r = lambda v, n=3: round(float(v), n)


# ---------------------------------------------------------------- box geometry, used everywhere
def area(b):
    return max(0.0, b[2] - b[0]) * max(0.0, b[3] - b[1])


def inter(a, b):
    x1, y1, x2, y2 = max(a[0], b[0]), max(a[1], b[1]), min(a[2], b[2]), min(a[3], b[3])
    return [x1, y1, x2, y2], max(0.0, x2 - x1) * max(0.0, y2 - y1)


def iou(a, b):
    _, i = inter(a, b)
    return i / (area(a) + area(b) - i)


def giou(a, b):
    _, i = inter(a, b)
    u = area(a) + area(b) - i
    c = area([min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3])])
    return i / u - (c - u) / c


def cxcywh(b, W=1, H=1):
    return [(b[0] + b[2]) / 2 / W, (b[1] + b[3]) / 2 / H, (b[2] - b[0]) / W, (b[3] - b[1]) / H]


def xyxy(c, W=1, H=1):
    cx, cy, w, h = c
    return [(cx - w / 2) * W, (cy - h / 2) * H, (cx + w / 2) * W, (cy + h / 2) * H]


def nms(cands, thr, key='name'):
    """Greedy NMS within groups (class-aware with key='name', class-agnostic with key=None).
    Returns the kept candidates and, for each round, the kept one and what it removed."""
    left = sorted(cands, key=lambda k: -k['score'])
    keep, rounds = [], []
    while left:
        top = left.pop(0)
        keep.append(top)
        same = [k for k in left if key is None or k[key] == top[key]]
        gone = [k for k in same if iou(k['box'], top['box']) > thr]
        rounds.append({'keep': top, 'removed': [(k, iou(k['box'], top['box'])) for k in gone]})
        left = [k for k in left if k not in gone]
    return keep, rounds


S = {}

# ---------------------------------------------------------------- Part 1: one label
c = M['classifier']
S['classifier'] = {'top5': c['top5'], 'dog_classes': c['p_all_dog_classes'], 'cat_classes': c['p_all_cat_classes']}

# ---------------------------------------------------------------- Part 2: boxes and IoU on the courtyard photo
W, H = Y['photos']['cat-dog']['size']
gt = {k: b for k, b in A['photos']['cat-dog']}
dog, cat = gt['dog'], gt['cat']
cx, cy, w, h = cxcywh(dog)
S['photo'] = {'W': W, 'H': H}
S['dog'] = {'xyxy': dog, 'w': w, 'h': h, 'cx': cx, 'cy': cy, 'norm': [r(v) for v in cxcywh(dog, W, H)]}
S['cat'] = {'xyxy': cat, 'cxcywh': [r(v, 1) for v in cxcywh(cat)], 'norm': [r(v) for v in cxcywh(cat, W, H)]}
assert (w, h, cx, cy) == (361, 505, 587.5, 335.5)

# a guess to practise on: the dog's box moved 60 px right and 40 px down
guess = [dog[0] + 60, dog[1] + 40, dog[2] + 60, dog[3] + 40]
ib, ia = inter(dog, guess)
S['iou_practice'] = {'guess': guess, 'inter_box': ib, 'inter': ia, 'iw': ib[2] - ib[0], 'ih': ib[3] - ib[1],
                     'area_a': area(dog), 'area_b': area(guess), 'union': area(dog) + area(guess) - ia,
                     'iou': r(iou(dog, guess))}
assert abs(S['iou_practice']['iou'] - 0.623) < 1e-3
# the real YOLOv8n box for the dog, after NMS
yolo_dog = [u for u in Y['photos']['cat-dog']['ultralytics'] if u['name'] == 'dog'][0]
S['iou_real'] = {'box': yolo_dog['box'], 'score': yolo_dog['score'], 'iou': r(iou(dog, yolo_dog['box']))}
# a pure sideways shift s of a w-wide box gives IoU (w - s) / (w + s); the gallery inverts that
S['iou_gallery'] = [{'iou': t, 'shift': round(w * (1 - t) / (1 + t))} for t in (0.9, 0.7, 0.5, 0.3)]
for g in S['iou_gallery']:
    b = [dog[0] + g['shift'], dog[1], dog[2] + g['shift'], dog[3]]
    assert abs(iou(dog, b) - g['iou']) < 0.005
# the IoU figure's two answers: a loose box round the whole dog (twice its area, IoU 1/2)
# and a box that keeps the body but cuts off the head (IoU 0.7)
loose, headless = [283, 30, 891, 630], [dog[0], 234, dog[2], dog[3]]
S['iou_answers'] = {'loose': {'box': loose, 'iou': r(iou(dog, loose)), 'ratio': r(area(loose) / area(dog), 2)},
                    'headless': {'box': headless, 'iou': r(iou(dog, headless)), 'cut': headless[1] - dog[1]}}
assert inter(dog, loose)[1] == area(dog) and abs(S['iou_answers']['loose']['iou'] - 0.5) < 0.001
assert inter(dog, headless)[1] == area(headless) and abs(S['iou_answers']['headless']['iou'] - 0.7) < 0.002

# ---------------------------------------------------------------- Part 3: one box head, and the average of two answers
avg = [(a + b) / 2 for a, b in zip(cat, dog)]
S['average_box'] = {'box': avg, 'iou_dog': r(iou(avg, dog)), 'iou_cat': r(iou(avg, cat))}

# two dogs in K slots: the same correct answer, scored against the annotation in two orders
W2, H2 = Y['photos']['two-dogs']['size']
left, right = [b for _, b in sorted(A['photos']['two-dogs'], key=lambda x: x[1][0])]
fin2 = {q['q']: q for q in DT['photos']['two-dogs']['final']}
slot = [fin2[61]['box'], fin2[98]['box']]  # DETR's two dog predictions, normalised (cx, cy, w, h)
gl, gr = cxcywh(left, W2, H2), cxcywh(right, W2, H2)
l1 = lambda a, b: sum(abs(x - y) for x, y in zip(a, b))
S['slots'] = {'left': [r(v, 5) for v in gl], 'right': [r(v, 5) for v in gr], 'slot1': slot[0], 'slot2': slot[1],
              'same_order': r(l1(slot[0], gl) + l1(slot[1], gr)), 'swapped': r(l1(slot[0], gr) + l1(slot[1], gl)),
              'slot1_vs_right': [r(abs(x - y)) for x, y in zip(slot[0], gr)]}
assert S['slots']['swapped'] > 20 * S['slots']['same_order']
# the same problem with a perfect answer: slots equal to the two annotated boxes, scored against a list that names
# the right dog first. Paired by position each slot costs the L1 distance between the two dogs; paired by object, 0.
S['slots']['perfect_one'] = r(l1(gl, gr))
S['slots']['perfect'] = r(2 * S['slots']['perfect_one'])
assert S['slots']['perfect'] > 1

# ---------------------------------------------------------------- Part 4: the 30 x 20 grid of the stride-32 map
P = Y['photos']['cat-dog']
s = 32
gw, gh = W // s, H // s
assert (gw, gh) == (30, 20) and P['per_level'] == [9600, 2400, 600] and P['n'] == 12600


def centre_cells(b, radius=1.5):
    """FCOS centre sampling: cells whose centres lie within `radius` cells of the box centre (and inside the box)."""
    bx, by = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
    out = []
    for rr in range(gh):
        for cc in range(gw):
            x, y = (cc + .5) * s, (rr + .5) * s
            if abs(x - bx) <= radius * s and abs(y - by) <= radius * s and b[0] < x < b[2] and b[1] < y < b[3]:
                out.append([rr, cc])
    return out


pos_dog, pos_cat = centre_cells(dog), centre_cells(cat)
assert len(pos_dog) == 9 and len(pos_cat) == 9
fire = lambda name: sorted([[k['row'], k['col']] for k in P['candidates'] if k['name'] == name and k['score'] >= 0.25 and k['stride'] == 32])
S['grid'] = {'stride': s, 'cols': gw, 'rows': gh, 'cells32': gw * gh, 'per_level': P['per_level'], 'total': P['n'],
             'dog_centre_cell': [int(cy // s), int(cx // s)], 'dog_centre_in_cells': [r(cx / s, 2), r(cy / s, 2)],
             'pos_dog': pos_dog, 'pos_cat': pos_cat, 'fire_dog': fire('dog'), 'fire_cat': fire('cat'),
             'fire_plant': fire('potted plant'),
             'map_dog': P['map32_dog'], 'map_cat': P['map32_cat'], 'records': P['cells32']}
assert S['grid']['dog_centre_cell'] == [10, 18] and len(S['grid']['fire_dog']) == 10 and len(S['grid']['fire_cat']) == 10
overlap = [c for c in pos_dog if c in S['grid']['fire_dog']]
inside = lambda b: sum(b[0] < (cc + .5) * s < b[2] and b[1] < (rr + .5) * s < b[3] for rr in range(gh) for cc in range(gw))
S['grid']['inside_dog'], S['grid']['inside_cat'] = inside(dog), inside(cat)
S['grid']['dog_overlap'] = len(overlap)

# the target and the prediction at cell (row 10, column 18)
cell = P['dog_cell']
ax, ay = cell['centre']
assert (ax, ay) == (592.0, 336.0)
target = [ax - dog[0], ay - dog[1], dog[2] - ax, dog[3] - ay]
pred_box = cell['box']
pred = [ax - pred_box[0], ay - pred_box[1], pred_box[2] - ax, pred_box[3] - ay]
names = Y['names']
ci = names.index('dog')
sc = cell['scores']
bce = lambda p, t: -(t * math.log(p) + (1 - t) * math.log(1 - p))
cls_terms = [bce(min(max(p, 1e-12), 1 - 1e-12), 1.0 if i == ci else 0.0) for i, p in enumerate(sc)]
others = sum(t for i, t in enumerate(cls_terms) if i != ci)
bg = P['background_cell']
bg_terms = [bce(min(max(p, 1e-12), 1 - 1e-12), 0.0) for p in bg['scores']]
S['cell'] = {'row': 10, 'col': 18, 'centre': [ax, ay], 'target_ltrb': target, 'target_cells': [r(v / s, 2) for v in target],
             'pred_box': pred_box, 'pred_ltrb': [r(v, 1) for v in pred], 'p_dog': r(sc[ci], 3),
             'p_cat': sc[names.index('cat')], 'top': cell['top'],
             'l1_terms': [r(abs(a - b), 1) for a, b in zip(pred, target)], 'l1': r(l1(pred, target), 1),
             'l1_cells': r(l1(pred, target) / s, 3), 'iou': r(iou(pred_box, dog)),
             'bce_dog': r(cls_terms[ci]), 'bce_others': r(others, 4), 'bce_total': r(sum(cls_terms)),
             'bg_row': bg['row'], 'bg_col': bg['col'], 'bg_top': bg['top'], 'bg_bce': r(sum(bg_terms), 4),
             'bg_max': r(max(bg['scores']), 4), 'scores': [round(v, 5) for v in sc], 'names': names}
assert abs(S['cell']['bce_dog'] - (-math.log(sc[ci]))) < 5e-4
# where the dog cell's record sits in the output: the stride-8 and stride-16 columns come first; its first four rows
# are the box already decoded to centre and size, the same box as the distances (x1 = cx - w/2 = centre - l)
S['cell']['k'] = cell['k']
S['cell']['cxcywh'] = cell['cxcywh']
assert cell['k'] == P['per_level'][0] + P['per_level'][1] + 10 * gw + 18
assert abs(cell['cxcywh'][0] - cell['cxcywh'][2] / 2 - (ax - pred[0])) < 0.1
S['counts'] = {'cells': P['n'], 'positives': len(pos_dog) + len(pos_cat)}
S['counts']['background'] = S['counts']['cells'] - S['counts']['positives']

# ---------------------------------------------------------------- Part 5: decode, filter, NMS on the courtyard photo
cands = [k for k in P['candidates'] if k['score'] >= 0.25]
keep, rounds = nms(cands, 0.7)
ultra = sorted(P['ultralytics'], key=lambda u: -u['score'])
assert [(k['name'], k['score']) for k in keep] == [(u['name'], u['score']) for u in ultra]
strip = lambda k: {x: k[x] for x in ('stride', 'row', 'col', 'name', 'score', 'box')}
S['nms_courtyard'] = {'n_candidates': len(cands), 'counts': {n: sum(k['name'] == n for k in cands) for n in ('cat', 'dog', 'potted plant')},
                      'candidates': [strip(k) for k in sorted(cands, key=lambda k: -k['score'])],
                      'kept': [strip(k) for k in keep],
                      'dog_round': None}
dr = [x for x in rounds if x['keep']['name'] == 'dog'][0]
S['nms_courtyard']['dog_round'] = {'keep': strip(dr['keep']),
                                   'removed': [dict(strip(k), iou=r(v)) for k, v in sorted(dr['removed'], key=lambda kv: -kv[0]['score'])]}
assert len(dr['removed']) == 9 and min(v for _, v in dr['removed']) > 0.9
# the nms() written on the code slide ignores classes; on these 31 boxes it keeps the same four, one round each
keep_a, rounds_a = nms(cands, 0.7, key=None)
assert [k['score'] for k in keep_a] == [k['score'] for k in keep]
S['nms_courtyard']['rounds'] = [{'keep': strip(x['keep']), 'removed': [dict(strip(k), iou=r(v)) for k, v in x['removed']]} for x in rounds_a]

# the same greedy loop on the crowd photo, for several thresholds
crowd = [k for k in Y['photos']['crowd']['candidates'] if k['name'] == 'person' and k['score'] >= 0.25]
S['nms_crowd'] = {'n_candidates': len(crowd), 'by_threshold': {str(t): len(nms(crowd, t)[0]) for t in (0.0, 0.3, 0.5, 0.7, 0.9, 0.95)},
                  'candidates': [{'score': k['score'], 'box': k['box']} for k in crowd]}
assert S['nms_crowd']['by_threshold']['0.7'] == 11
S['nms_crowd']['kept'] = {str(t): [k['box'] for k in nms(crowd, t)[0]] for t in (0.0, 0.7, 0.95)}

# class-aware against class-agnostic on the street photo: the cyclist and the bicycle
st = [k for k in Y['photos']['street']['candidates'] if k['score'] >= 0.25]
aware, _ = nms(st, 0.3)
agnostic, _ = nms(st, 0.3, key=None)
cyc = [k for k in aware if k['name'] == 'person' and k['box'][0] > 650 and k['box'][0] < 760][0]
bike = [k for k in aware if k['name'] == 'bicycle'][0]
S['class_aware'] = {'person': strip(cyc), 'bicycle': strip(bike), 'iou': r(iou(cyc['box'], bike['box'])),
                    'aware': [strip(k) for k in aware], 'agnostic': [strip(k) for k in agnostic]}
S['nms_street'] = [{'name': k['name'], 'score': k['score'], 'box': k['box'], 'stride': k['stride']}
                   for k in Y['photos']['street']['candidates'] if k['score'] >= 0.05]
assert bike in aware and bike not in agnostic and 0.3 < S['class_aware']['iou'] < 0.5

# ---------------------------------------------------------------- Part 6: which of the three grids found each object?
lv = {}
for name in ('scale', 'street', 'cat-dog'):
    ph = Y['photos'][name]
    kept, _ = nms([k for k in ph['candidates'] if k['score'] >= 0.25], 0.7)
    lv[name] = [strip(k) for k in kept]
S['levels'] = lv
by = {(k['name'], k['stride']) for k in lv['scale']}
assert ('bus', 32) in by

# ---------------------------------------------------------------- Part 7: DETR
D1 = DT['photos']['cat-dog']
fin = D1['final']
act = sorted([q for q in fin if q['p_none'] < 0.5], key=lambda q: q['p_none'])
S['detr'] = {'input': D1['input'], 'grid': D1['grid'], 'tokens': D1['grid'][0] * D1['grid'][1],
             'objects': act, 'n_none_90': sum(q['p_none'] > 0.9 for q in fin), 'n_none_50': sum(q['p_none'] > 0.5 for q in fin),
             'p_none': [q['p_none'] for q in fin], 'names': [q['name'] if q['p_none'] < 0.5 else '' for q in fin],
             'attention': {q: D1['attention'][q] for q in ('71', '61')}}
assert S['detr']['tokens'] == 950 and {q['q'] for q in act[:2]} == {71, 61}
# duplicates inside the decoder: two queries on one plant in layer 1, one of them silent from layer 2
L = DT['photos']['two-dogs']['layers']
pair = [[{'p': L[i][q]['p'], 'p_none': L[i][q]['p_none'], 'name': L[i][q]['name'], 'box': L[i][q]['box']} for i in range(6)] for q in (90, 25)]
S['detr_layers'] = {'queries': [90, 25], 'trace': pair, 'iou_layer1': r(iou(xyxy(pair[0][0]['box']), xyxy(pair[1][0]['box']))),
                    'active': [sum(q['p_none'] < 0.5 for q in L[i]) for i in range(6)]}
assert pair[1][0]['p_none'] < 0.5 and pair[1][1]['p_none'] > 0.9 and S['detr_layers']['iou_layer1'] > 0.7

# matching: two dogs against four queries, with DETR's own cost (class 1, L1 5, GIoU 2)
fin2 = DT['photos']['two-dogs']['final']
empty = min((q for q in fin2 if q['p_none'] > 0.99), key=lambda q: l1(q['box'], gl))  # a silent query near the left dog
Q = [fin2[61], fin2[98], fin2[90], empty]
G = [('left dog', gl), ('right dog', gr)]
cost = {'class': [], 'l1': [], 'giou': [], 'total': []}
for _, g in G:
    row = {k: [] for k in cost}
    for q in Q:
        p_dog = q['p'] if q['name'] == 'dog' else None
        row['class'].append(p_dog)
        row['l1'].append(l1(q['box'], g))
        row['giou'].append(giou(xyxy(q['box']), xyxy(g)))
    for k in ('class', 'l1', 'giou'):
        cost[k].append(row[k])
# the probability each query gives to "dog" (index 18 in DETR's labels): queries that do not name a dog give it ~0
p_dog_of = {}
for q in Q:
    p_dog_of[q['q']] = q['p'] if q['name'] == 'dog' else 0.0
cost['class'] = [[-p_dog_of[q['q']] for q in Q] for _ in G]
cost['total'] = [[cost['class'][i][j] + 5 * cost['l1'][i][j] - 2 * cost['giou'][i][j] for j in range(len(Q))] for i in range(len(G))]
rows_, cols_ = linear_sum_assignment(np.array(cost['total']))
brute = min(itertools.permutations(range(len(Q)), len(G)), key=lambda p: sum(cost['total'][i][p[i]] for i in range(len(G))))
assert list(cols_) == list(brute) == [0, 1]
S['match'] = {'queries': [q['q'] for q in Q], 'q_names': [q['name'] if q['p_none'] < 0.5 else 'no object' for q in Q],
              'q_p': [q['p'] for q in Q], 'q_none': [q['p_none'] for q in Q], 'q_boxes': [q['box'] for q in Q],
              'targets': [n for n, _ in G], 'target_boxes': [[r(v, 5) for v in g] for _, g in G],
              'class': [[r(v) for v in row] for row in cost['class']], 'l1': [[r(v) for v in row] for row in cost['l1']],
              'giou': [[r(v) for v in row] for row in cost['giou']], 'total': [[r(v, 2) for v in row] for row in cost['total']],
              'assignment': [int(c) for c in cols_]}
# greedy can lose: a two-by-two case
T = [[1, 2], [2, 9]]
S['greedy'] = {'cost': T, 'greedy': [0, 1], 'greedy_total': T[0][0] + T[1][1], 'best': [1, 0], 'best_total': T[0][1] + T[1][0]}
assert list(linear_sum_assignment(np.array(T))[1]) == [1, 0]

# the loss after matching, for the two matched queries and one unmatched one
lossp = []
for (gname, g), j in zip(G, cols_):
    q = Q[j]
    lossp.append({'target': gname, 'q': q['q'], 'ce': r(-math.log(q['p'])), 'l1': r(l1(q['box'], g)),
                  'giou': r(giou(xyxy(q['box']), xyxy(g))), 'giou_loss': r(1 - giou(xyxy(q['box']), xyxy(g)))})
unm = lambda q: {'q': q['q'], 'name': q['name'] if q['p_none'] < 0.5 else 'no object', 'p_none': q['p_none'],
                 'ce': r(-math.log(q['p_none'])), 'weighted': r(0.1 * -math.log(q['p_none']))}
# query 2 already says "no object"; query 90 names a plant that this target set leaves out
S['match_loss'] = {'pairs': lossp, 'unmatched': unm(Q[3]), 'unmatched_plant': unm(Q[2])}

# ---------------------------------------------------------------- Part 8: evaluation
def match_eval(dets, gts, thr):
    """Greedy evaluation matching for one class: predictions by score; each claims its best unclaimed truth."""
    dets = sorted(dets, key=lambda d: -d['score'])
    claimed, rows = set(), []
    for d in dets:
        best, bi = 0.0, None
        for i, g in enumerate(gts):
            if g['photo'] != d['photo'] or i in claimed:
                continue
            v = iou(d['box'], g['box'])
            if v > best:
                best, bi = v, i
        # the best overlap with any truth, claimed or not, explains a duplicate
        any_best = max([iou(d['box'], g['box']) for g in gts if g['photo'] == d['photo']] or [0.0])
        tp = bi is not None and best >= thr
        if tp:
            claimed.add(bi)
        rows.append({'score': d['score'], 'photo': d['photo'], 'box': d['box'], 'iou': r(best if tp else any_best), 'hit': tp,
                     'why': 'match' if tp else ('duplicate' if any_best >= thr else 'no truth here')})
    return rows


def pr_curve(rows, n_gt):
    tp = fp = 0
    out = []
    for x in rows:
        tp += x['hit']
        fp += not x['hit']
        out.append({'tp': tp, 'fp': fp, 'precision': tp / (tp + fp), 'recall': tp / n_gt})
    return out


def ap_all_points(curve):
    """Area under the precision envelope (the best precision at this recall or beyond), step by step."""
    pts = [(0.0, 1.0)] + [(c['recall'], c['precision']) for c in curve]
    area_, prev = 0.0, 0.0
    for i, (rc, _) in enumerate(pts[1:], start=1):
        env = max(p for rr, p in pts[i:])
        area_ += (rc - prev) * env
        prev = rc
    return area_


def ap_coco(curve, n=101):
    rec = np.array([c['recall'] for c in curve])
    pre = np.array([c['precision'] for c in curve])
    for i in range(len(pre) - 2, -1, -1):
        pre[i] = max(pre[i], pre[i + 1])
    out = []
    for t in np.linspace(0, 1, n):
        k = np.searchsorted(rec, t, side='left')
        out.append(pre[k] if k < len(pre) else 0.0)
    return float(np.mean(out))


# the street photo, "person", real YOLOv8n output down to score 0.01
gts = [{'photo': 'street', 'box': b} for c_, b in A['photos']['street'] if c_ == 'person']
sp = nms([k for k in Y['photos']['street']['candidates'] if k['name'] == 'person'], 0.7)[0]
rows = match_eval([{'score': k['score'], 'box': k['box'], 'photo': 'street'} for k in sp], gts, 0.5)
cur = pr_curve(rows, len(gts))
S['eval_street'] = {'n_gt': len(gts), 'gt': [g['box'] for g in gts], 'rows': [dict(x, **c) for x, c in zip(rows, cur)],
                    'ap': r(ap_all_points(cur))}
assert S['eval_street']['ap'] == 1.0 and sum(x['hit'] for x in rows) == 4 and not any(x['hit'] for x in rows[4:])

# a small invented ranked list, so that hits and misses interleave
practice = [(0.95, True), (0.90, True), (0.80, False), (0.70, False), (0.60, True), (0.40, False)]
why = ['match', 'match', 'duplicate', 'no truth here', 'match', 'no truth here']
cur = pr_curve([{'hit': t} for _, t in practice], 3)
env = []
for i, cc in enumerate(cur):
    env.append(max(x['precision'] for x in cur[i:]))
S['practice'] = {'n_gt': 3, 'rows': [{'score': sc_, 'hit': t, 'why': w_, **c_} for (sc_, t), w_, c_ in zip(practice, why, cur)],
                 'envelope': env, 'ap': r(ap_all_points(cur)), 'ap_coco': r(ap_coco(cur))}
assert abs(S['practice']['ap'] - (1 / 3 + 1 / 3 + 1 / 3 * 0.6)) < 1e-3


# the real benchmark: both detectors on all eight photos, seven classes
def detections(model):
    out = []
    for name in A['photos']:
        if model == 'yolo':
            kept = nms([k for k in Y['photos'][name]['candidates']], 0.7)[0]
            out += [{'photo': name, 'name': k['name'], 'score': k['score'], 'box': k['box']} for k in kept]
        else:
            out += [{'photo': name, 'name': k['name'], 'score': k['score'], 'box': k['box']} for k in DT['detections'][name]]
    return out


def evaluate(dets):
    res = {}
    for cls in A['classes']:
        g = [{'photo': n, 'box': b} for n, lst in A['photos'].items() for c_, b in lst if c_ == cls]
        d = [x for x in dets if x['name'] == cls]
        per = {}
        for thr in np.round(np.arange(0.5, 0.96, 0.05), 2):
            rows_ = match_eval(d, g, float(thr))
            cur_ = pr_curve(rows_, len(g)) if rows_ else []
            per[str(float(thr))] = ap_coco(cur_) if cur_ else 0.0
        res[cls] = {'n_gt': len(g), 'n_det': len(d), 'ap50': r(per['0.5']), 'ap75': r(per['0.75']),
                    'ap': r(np.mean(list(per.values())))}
    return {'per_class': res, 'map50': r(np.mean([v['ap50'] for v in res.values()])),
            'map': r(np.mean([v['ap'] for v in res.values()]))}


S['benchmark'] = {'yolo': evaluate(detections('yolo')), 'detr': evaluate(detections('detr')),
                  'photos': list(A['photos']), 'classes': A['classes'],
                  'n_gt': sum(len(v) for v in A['photos'].values())}

# ---------------------------------------------------------------- what the opening slides show
S['counts_by_photo'] = {n: len(nms([k for k in Y['photos'][n]['candidates'] if k['score'] >= 0.25], 0.7)[0]) for n in Y['photos']}
S['finals'] = {n: [strip(k) for k in nms([k for k in Y['photos'][n]['candidates'] if k['score'] >= 0.25], 0.7)[0]] for n in Y['photos']}
S['detr_finals'] = {n: [k for k in DT['detections'][n] if k['score'] >= 0.9] for n in DT['detections']}
S['annotations'] = A['photos']
S['seg'] = M['seg']
S['provenance'] = {'yolo': Y['model'], 'detr': DT['model'], 'torch': M['torch']}

# ---------------------------------------------------------------- Part 1: where detectors work, and what makes it hard
APPS = json.loads((ROOT / 'data/applications.json').read_text())
cb = [b for _, b in APPS['photos']['cells']]
pairs = [(i, j) for i in range(len(cb)) for j in range(i + 1, len(cb))]
pi, pj = max(pairs, key=lambda ij: iou(cb[ij[0]], cb[ij[1]]))
S['apps'] = {'about': APPS['about'], 'boxes': APPS['photos'], 'cells_pair': [pi, pj], 'cells_pair_iou': r(iou(cb[pi], cb[pj]))}
assert len(cb) == 12 and 0.1 < S['apps']['cells_pair_iou'] < 0.3
people = [k['box'] for k in S['finals']['crowd'] if k['name'] == 'person']
ci_, cj_ = max([(i, j) for i in range(len(people)) for j in range(i + 1, len(people))], key=lambda ij: iou(people[ij[0]], people[ij[1]]))
S['apps']['crowd_pair'], S['apps']['crowd_pair_iou'] = [people[ci_], people[cj_]], r(iou(people[ci_], people[cj_]))

# the small bird: YOLOv8n boxes it well but scores it below the 0.25 cut-off
bird_gt = [b for c_, b in A['photos']['cat-dog-bird'] if c_ == 'bird'][0]
bc = sorted([k for k in Y['photos']['cat-dog-bird']['candidates'] if k['name'] == 'bird'], key=lambda k: -k['score'])
S['bird'] = {'gt': bird_gt, 'w': bird_gt[2] - bird_gt[0], 'h': bird_gt[3] - bird_gt[1], 'best': strip(bc[0]),
             'iou': r(iou(bc[0]['box'], bird_gt)), 'runner_up': bc[0]['top'][1], 'n_cells': len(bc)}
assert bc[0]['score'] < 0.25 and S['bird']['iou'] > 0.85 and not any(k['name'] == 'bird' for k in S['finals']['cat-dog-bird'])


def photo_counts(name, score_thr):
    """TP, FP and FN on one photo for the seven annotated classes, after NMS at 0.7, at one score cut-off."""
    kept = nms([k for k in Y['photos'][name]['candidates'] if k['score'] >= score_thr], 0.7)[0]
    out = {'tp': 0, 'fp': 0, 'fn': 0, 'fp_names': [], 'found': []}
    for cls in A['classes']:
        g = [{'photo': name, 'box': b} for c_, b in A['photos'][name] if c_ == cls]
        d = [{'photo': name, 'score': k['score'], 'box': k['box']} for k in kept if k['name'] == cls]
        rows_ = match_eval(d, g, 0.5) if d else []
        hits = sum(x['hit'] for x in rows_)
        out['tp'] += hits
        out['fp'] += len(rows_) - hits
        out['fn'] += len(g) - hits
        out['fp_names'] += [cls] * (len(rows_) - hits)
        out['found'] += [cls] * hits
    out['precision'], out['recall'] = r(out['tp'] / max(1, out['tp'] + out['fp'])), r(out['tp'] / (out['tp'] + out['fn']))
    return out


S['bird_eval'] = {str(t): photo_counts('cat-dog-bird', t) for t in (0.25, 0.05)}
assert S['bird_eval']['0.25']['fn'] == 1 and 'bird' in S['bird_eval']['0.05']['found']

# one object, written as a target vector (the single-cat photo)
catb = [b for c_, b in A['photos']['cat'] if c_ == 'cat'][0]
S['single'] = {'box': catb, 'size': Y['photos']['cat']['size'], 'norm': [r(v) for v in cxcywh(catb, *Y['photos']['cat']['size'])]}

# sliding windows over the courtyard: every 32 px, three sizes, three shapes; two neighbours share most pixels
win, sh = 224, 32
Wc, Hc = S['photo']['W'], S['photo']['H']
S['windows'] = {'cols': Wc // 32, 'rows': Hc // 32, 'positions': (Wc // 32) * (Hc // 32), 'sizes': 3, 'shapes': 3,
                'size': win, 'shift': sh, 'shared': r((win - sh) / win), 'iou': r((win - sh) / (win + sh))}
S['windows']['crops'] = S['windows']['positions'] * S['windows']['sizes'] * S['windows']['shapes']

# the cell that contains each animal's centre: the one-cell rule of YOLOv1
cen = lambda b: ((b[0] + b[2]) / 2, (b[1] + b[3]) / 2)
S['centre_cells'] = {n: {'centre': [r(v, 1) for v in cen(S[n]['xyxy'])],
                         'cell': [int(cen(S[n]['xyxy'])[1] // 32), int(cen(S[n]['xyxy'])[0] // 32)]} for n in ('dog', 'cat')}
assert S['centre_cells']['dog']['cell'] == [10, 18]

# NMS when two objects of one class are close: the two dogs
td = [k for k in Y['photos']['two-dogs']['candidates'] if k['name'] == 'dog' and k['score'] >= 0.25]
tk, tr = nms(td, 0.7)
first = tr[0]
left1 = [k for k in td if k is not first['keep'] and all(k is not g for g, _ in first['removed'])]
S['nms_two_dogs'] = {'n': len(td), 'candidates': [strip(k) for k in sorted(td, key=lambda k: -k['score'])],
                     'rounds': [{'keep': strip(x['keep']), 'removed': [dict(strip(k), iou=r(v)) for k, v in x['removed']]} for x in tr],
                     'left_after_1': [dict(strip(k), iou=r(iou(k['box'], first['keep']['box']))) for k in left1],
                     'iou_between': r(iou(tk[0]['box'], tk[1]['box']))}
assert len(tk) == 2 and max(x['iou'] for x in S['nms_two_dogs']['left_after_1']) < 0.7

# what a label file holds for the courtyard: a COCO class index and a normalised (cx, cy, w, h)
S['label_file'] = [{'name': n, 'id': Y['names'].index(n), 'norm': S[n]['norm']} for n in ('dog', 'cat')]

# Part 5 in Andrew Ng's YOLO form: a box as its centre's place inside its cell (0 to 1) and its size in cells
def in_cell(c, row, col, s=32):
    return [r((c[0] - col * s) / s), r((c[1] - row * s) / s), r(c[2] / s), r(c[3] / s)]
S['ng'] = {'dog': in_cell([S['dog'][k] for k in ('cx', 'cy', 'w', 'h')], 10, 18),
           'cat': in_cell(S['cat']['cxcywh'], *S['centre_cells']['cat']['cell']), 'pred': in_cell(S['cell']['cxcywh'], 10, 18)}
S['ng']['l1_terms'] = [r(abs(a - b)) for a, b in zip(S['ng']['pred'], S['ng']['dog'])]
S['ng']['l1'] = r(sum(S['ng']['l1_terms']))
assert S['ng']['dog'] == [0.359, 0.484, 11.281, 15.781] and S['ng']['cat'] == [0.766, 0.109, 6.531, 9.719]
assert S['ng']['pred'] == [0.388, 0.371, 11.323, 16.015] and S['ng']['l1'] == 0.418
# Ng's teaching grid first: 3 x 2 cells of 320 px on the courtyard, Part 4's record in every cell
cell_of = lambda x, y, s: [int(y // s), int(x // s)]
dxy = [S['dog'][k] for k in ('cx', 'cy', 'w', 'h')]
S['ng3'] = {'size': 320, 'dog_cell': cell_of(dxy[0], dxy[1], 320), 'cat_cell': cell_of(*S['cat']['cxcywh'][:2], 320)}
S['ng3']['dog'] = in_cell(dxy, *S['ng3']['dog_cell'], s=320)
S['ng3']['cat'] = in_cell(S['cat']['cxcywh'], *S['ng3']['cat_cell'], s=320)
assert S['ng3']['dog_cell'] == [1, 1] and S['ng3']['cat_cell'] == [1, 0]
assert S['ng3']['dog'] == [0.836, 0.048, 1.128, 1.578] and S['ng3']['cat'] == [0.677, 0.411, 0.653, 0.972]
# a sliding window cannot fit the dog: the best 224-px window, every 32 px, lies inside it
Wp, Hp = S['photo']['W'], S['photo']['H']
wins = [[x, y, x + 224, y + 224] for x in range(0, Wp - 223, 32) for y in range(0, Hp - 223, 32)]
best = max(iou(dog, w) for w in wins)
bw = min((w for w in wins if abs(iou(dog, w) - best) < 1e-9), key=lambda w: abs(w[0] + 112 - dxy[0]) + abs(w[1] + 112 - dxy[1]))
S['windows']['best_dog'] = {'box': bw, 'iou': r(best)}
assert abs(best - 224 * 224 / area(dog)) < 1e-9 and S['windows']['best_dog']['iou'] == 0.275
# one box per cell: a coarse 3 x 2 grid on the crowd photo puts several centres in one cell; 32-px cells give each its own
Wc2, Hc2 = Y['photos']['crowd']['size']
cen = [((b[0] + b[2]) / 2, (b[1] + b[3]) / 2) for _, b in A['photos']['crowd']]
coarse = Counter((int(y // (Hc2 / 2)), int(x // (Wc2 / 3))) for x, y in cen)
fine = Counter((int(y // 32), int(x // 32)) for x, y in cen)
(cr, cc), cmax = coarse.most_common(1)[0]
S['crowd_cells'] = {'centres': [[r(x, 1), r(y, 1)] for x, y in cen], 'coarse_cell': [cr, cc], 'coarse_max': cmax,
                    'fine_grid': [Wc2 // 32, Hc2 // 32], 'fine_max': max(fine.values())}
assert cmax == 5 and S['crowd_cells']['fine_max'] == 1

(ROOT / 'data/science.json').write_text(json.dumps(S, separators=(',', ':')))
print('wrote data/science.json', round((ROOT / 'data/science.json').stat().st_size / 1e3), 'kB')
for k in ('iou_practice', 'iou_real', 'average_box', 'slots', 'cell', 'counts', 'class_aware', 'detr_layers', 'match', 'match_loss', 'practice'):
    v = S[k]
    print(k, {a: b for a, b in v.items() if not isinstance(b, list) or len(b) < 8} if isinstance(v, dict) else v)
print('nms crowd', S['nms_crowd']['by_threshold'])
print('levels scale', [(k['name'], k['stride'], k['score']) for k in S['levels']['scale']])
print('levels street', [(k['name'], k['stride'], k['score']) for k in S['levels']['street']])
print('benchmark yolo', S['benchmark']['yolo'])
print('benchmark detr', S['benchmark']['detr'])

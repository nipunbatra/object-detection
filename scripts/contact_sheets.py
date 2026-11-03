"""Contact sheets of the verify screenshots: the final state of every slide (default) or every state (--all).

    python3 scripts/contact_sheets.py [--all]      writes qa/contacts/*.jpg
"""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps

root = Path(__file__).resolve().parents[1]
qa, manifest = root / 'qa', json.loads((root / 'manifest.json').read_text())
every = '--all' in sys.argv
shots = [qa / 'screenshots' / f"{i + 1:03d}-{s['id']}-{b}.jpg" for i, s in enumerate(manifest['slides'])
         for b in (range(1, s['builds'] + 1) if every else [s['builds']])]
out = qa / 'contacts'
out.mkdir(exist_ok=True)
for old in out.glob('*.jpg'):
    old.unlink()
per, cols, tw, th = 9, 3, 640, 360
for start in range(0, len(shots), per):
    rows = (min(per, len(shots) - start) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * tw, rows * (th + 24)), '#e5e7eb')
    draw = ImageDraw.Draw(sheet)
    for j, p in enumerate(shots[start:start + per]):
        x, y = (j % cols) * tw, (j // cols) * (th + 24)
        sheet.paste(ImageOps.contain(Image.open(p), (tw - 4, th)), (x + 2, y + 22))
        draw.text((x + 6, y + 5), p.stem, fill='#14171f')
    sheet.save(out / f"{'states' if every else 'final'}-{start + 1:03d}.jpg", quality=88)
print(len(shots), 'tiles in', (len(shots) + per - 1) // per, 'sheets')

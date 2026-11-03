# Object detection lecture: notes for future sessions

- One deck: `index.html` + `content.js` (slides) + `widgets.js` (figure kit and the three live figures) + `lecture.css`, on the shared engine in `shared/` (copied from `generative/lectures/shared`; `deck.js` takes the page title from `meta.series`).
- Every displayed number comes from `data/science.json`. Change a number by changing `scripts/science.py` (which asserts what the slides claim), never by typing it into `content.js`. Order: `run_models.py` → `science.py` → `build_notebook.py --run` → `verify.mjs` → `contact_sheets.py --all` → `export.mjs`.
- Running example: `figures/cat-dog.jpg` (960 × 640). Every photo's sides are multiples of 32 so YOLOv8 runs without resizing and grid cells are photo pixels. Dog GT (407, 83, 768, 588); worked cell (row 10, col 18) at stride 32.
- Reveals inside an SVG must use `gat()` / `gonly()` (SVG groups). An HTML `at()` inside an SVG string breaks out of the SVG; `verify.mjs` flags this as "stray content after an SVG".
- Slide helper `S_(id, section, title, {builds, body, lines, ask, expected, ...})`: one story line, one question and one expected answer per build. Caveats go in `point`/notes, not on the slide.
- Teaching style (Nipun's): one move per click, one running example with numbers after each equation, results derived not asserted, real model outputs over invented ones (invented values are labelled on the slide).
- Local preview: `python3 scripts/serve.py` (port 8780, no caching). Models: `~/base/bin/python`; DETR weights in `/Volumes/Extreme SSD/hf-cache` (`HF_HUB_CACHE`, `HF_HUB_OFFLINE=1`); `yolov8n.pt` at `~/yolov8n.pt`, `yolov8l.pt` at `~/git/blog/posts/`.

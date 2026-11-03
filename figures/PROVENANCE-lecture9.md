# Lecture 9 figure provenance

## Course-owned generated photographs

- All files beginning `imagen-` in this directory are course-owned teaching
  assets generated with Codex's built-in image-generation tool on 28 August
  2026. The photographs contain no detector output: all boxes, labels,
  scores, grids, tensor shapes, arrows, tables, and heatmaps are added
  natively in Typst.
- Source SHA-256 values:
  - campus street:
    `ce61d138c0995fbc69a2503412ca8d7116eb902f560933a2d4240edf36968465`
  - cat and dog:
    `76e2077807bffe4a6237018aca0ec5bce9a8d6047e74d4bee4c3ade13a1b3f56`
  - single cat:
    `503c106604298eb769d496fef910e2be6333ca8a3b271013de22565f246b9619`
  - occluded dog:
    `876dff6bea8fb516e3e4843d1101b0cc1ab068b90a9bd1e174eeea29c8bb97d1`
  - two dogs:
    `0007cd9d4de2e0b4f4769a5f9899383b023e12061a16ac2fc5524a606ada1736`
  - cat, dog, and bird:
    `8caea16d94364c71976b4bd608604a5f27e03e09132bdd577f633f89996390e9`
  - campus crowd:
    `532a5b1b769a67c1b925c300bd0a39aa549e3ae1614eca2b004ff6f9f8ac882c`
  - campus scale:
    `4af19b9da1599b02c628594c7b53ac0fc14db55a71159c83a52f38320174cfc6`
  - industrial defect:
    `e578b8b11113a517353a1f7cf897b60fa2f66c5183a76ed30ef87cac94603ec1`
  - microscopy cells:
    `6092ee5d1c40d57cb23ff3569bd4411d4904747ebc29c6edfee9ee4a87d65fd1`
  - warehouse parcel:
    `842b46e69f0bd2e920105132eb632af702a60b842060adff0432590badd304ee`
  - promise classification:
    `f169ad0a0ef2d2221e8b05a9cae20e3ce3fda18e59d8c83468b0a813a48552c6`
  - promise localization:
    `7e8dde6f9e5d637c55e566ed8640ef2b04e0ecd80bcf3cb0c3677643552a9fb8`
  - promise detection:
    `b8a3c8bc23a2332962c32c5985d18a731471ef93fdbc7e03102be37aa06e6754`
  - promise segmentation:
    `5eba3b36cf9b8553b9d6a20db5329a5dd4d99719676f7adf3373eff229ab71f7`
- Final campus prompt: a wide, high-resolution photorealistic Indian
  university campus street in warm natural daylight, with modern red-brick
  academic buildings, leafy trees, a car, a cyclist, several separated
  pedestrians at different scales, and one dog crossing the road; cinematic
  16:9 composition, complete subjects with generous margins, realistic
  anatomy and perspective, and no text, labels, logos, watermarks, bounding
  boxes, or interface graphics.
- Final cat/dog prompt: a high-resolution photorealistic teaching photograph
  of exactly one full-body short-haired tabby cat and exactly one full-body
  golden retriever standing separately in the same quiet neutral courtyard,
  both fully visible with generous space around them, matched natural light
  and camera height, clean uncluttered background, realistic anatomy, and no
  people, other animals, text, labels, logos, watermarks, bounding boxes, or
  interface graphics.
- Matched warm-up prompts: preserve the courtyard, camera, light, and visual
  style of the cat/dog reference while showing (a) exactly one fully visible
  tabby cat with negative space, (b) exactly one golden retriever partially
  occluded by a low planter and foliage, and (c) exactly two separated golden
  retrievers; no text, labels, boxes, logos, or watermarks.
- Annotation-scene prompt: match the warm courtyard reference and show exactly
  one tabby cat, one golden retriever, and one small yellow bird, all clearly
  separated and fully visible with space for native overlays; no generated
  annotations or text.
- Crowd prompt: match the campus reference and show exactly eleven individually
  countable adult pedestrians from foreground to background, with a few natural
  overlaps but no vehicles, animals, readable signs, or generated annotations.
- Scale prompt: match the campus reference and show exactly one large foreground
  shuttle, one medium midground cyclist, and one tiny distant pedestrian,
  spatially separated for later native overlays.
- Application prompts: (a) a brushed-metal component under inspection with one
  small hairline surface defect; (b) a restrained bright-field microscopy view
  with roughly twelve stained cells and two light overlaps; and (c) exactly one
  unmarked parcel on a warehouse conveyor. Each is photorealistic, 16:9, and
  contains no people, text, labels, boxes, logos, or watermarks.
- Four-task promise prompts: coordinated photorealistic warm sandstone campus
  scenes with (a) one close golden-retriever subject for classification, (b) one
  fully visible golden retriever with generous margins for localization, (c) one
  separated dog, cat, and yellow bird for detection, and (d) one full-body dog
  with a clear silhouette for a native segmentation-mask overlay. All generated
  photographs contain no text, labels, boxes, masks, logos, or watermarks.

## Oxford-IIIT Pet evidence strip

- `shared/vision-evidence/oxford-iiit-pet/l9/` contains the two observed
  photographs and official XML tight-head regions used by the worked numeric
  example: `Abyssinian_1` and `Bengal_10` from the Oxford-IIIT Pet dataset.
- Parkhi et al., *Cats and Dogs*, CVPR 2012. Dataset material is distributed
  under CC BY-SA 4.0 with copyright retained by the original image owners.
- The A-E candidates and their scores are constructed teaching data; IoU,
  NMS, matching, and AP are computed. No detector was run to create them.

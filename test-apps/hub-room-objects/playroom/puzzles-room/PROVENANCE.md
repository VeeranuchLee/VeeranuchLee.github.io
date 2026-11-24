# Puzzles room plate provenance

## 2026-11-24 missing app objects

- Tool: Codex built-in image editing, followed by local masked patch compositing with Pillow.
- Model: current Codex built-in image editing model; the tool does not expose a model identifier.
- Date: 2026-11-24.
- Base plate: `scene.webp` at 1672×941 (the prior accepted Puzzles room plate).
- Runtime method: each accepted generated object was isolated with a tight feathered silhouette mask, scaled to remain readable at iPad size, and composited onto a PNG decoded from the original plate. No generated full-frame background pixels were accepted. The three declared patch rectangles are `(438,133)`–`(667,333)`, `(673,133)`–`(882,327)`, and `(888,143)`–`(1077,321)`; the pixel diff reports zero changed pixels outside them. The final composite was encoded to 1672×941 WebP at quality 76: 100,300 bytes versus the prior 92,138 bytes (+8.9%).
- Ignored working files: `art-source/petal-attempt-1.png`, `memory-attempt-1.png`, `number-attempt-1.png`, `original-decoded.png`, `final-composite.png`, review crop, pixel diff proof, and hotspot overlay.

### Petal Kingdom prompt

Add one physical flower-garden tabletop game in the empty lavender wall area: bright chunky toy flowers in a miniature garden bed and a small safe toy launcher, on a rounded wooden wall shelf. Match the plate's soft 3D storybook toy-room style, perspective, warm window lighting and shadows. No text, characters, extra props, screens, seams or changes outside the object patch.

### Memory Echo prompt

Add one friendly round physical memory toy in the empty lavender wall area, with exactly four raised light-up pads—red, blue, yellow and green—on a short rounded wooden shelf/stand. Match the plate's soft 3D storybook style and lighting. No text, characters, extra pads, screens, seams or changes outside the object patch.

### Number Lab prompt

Add one tactile rounded wooden tile board in the empty lavender wall area, holding four chunky square tiles labelled only `2`, `4`, `8`, and `16`, with `16` brighter. Match the plate's soft 3D storybook style and lighting. No other text, extra tiles, screens, seams or changes outside the object patch.

### What changed

Three new wall-shelf toys were painted in previously empty upper-centre wall space. The existing shadow board, maze rug, jigsaw tray, shape sorter, teddy, window and shelves were not repainted or covered.

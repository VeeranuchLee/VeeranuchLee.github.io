# Words & Books room plate provenance

## 2026-11-24 Our Animal Book object

- Tool: Codex built-in image editing, followed by local masked patch compositing with Pillow.
- Model: current Codex built-in image editing model; the tool does not expose a model identifier.
- Date: 2026-11-24.
- Base plate: `scene.webp` at 1448×1086 (the prior accepted Words & Books room plate).
- Runtime method: the accepted book-and-cushion silhouette was isolated with a tight feathered mask and composited onto a PNG decoded from the original plate. No generated full-frame background pixels were accepted. The declared patch rectangle is `(533,468)`–`(917,657)`; the pixel diff reports zero changed pixels outside it. The final composite was encoded to 1448×1086 WebP at quality 85: 249,462 bytes versus the prior 252,488 bytes (−1.2%).
- Attempts: attempt 1 was rejected because the oversized book would overlap the original foreground puzzle table when patched onto the base. Attempt 2 was accepted after constraining the book above the table.
- Ignored working files: both attempt PNGs, `original-decoded.png`, `final-composite.png`, review crop, pixel diff proof, and hotspot overlay.

### Accepted prompt

Add exactly one medium-large physical open animal picture book on a very low lavender cushion, centred on the upper half of the empty purple star rug and strictly above the original foreground table. Show friendly painted animal pictures—a lion, elephant, giraffe and bird—with no text. Match the room's richly lit soft rounded 3D storybook style, warm wood, jewel-toned night lighting, perspective and shadows. Do not move, repaint, cover, touch or overlap any existing station or the foreground puzzle table.

### What changed

One open animal picture book and its low cushion were painted on the previously empty centre star rug. All six existing stations and the foreground puzzle table remain unchanged.

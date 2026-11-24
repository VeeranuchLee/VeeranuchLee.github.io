# Art room plate provenance

- Date: 2026-10-09
- Tool: Codex built-in image generation
- Use: Children Games Art category room
- Accepted render: first render; passed self-review for no text, no characters, clean rounded shapes, three distinct stations, and no scary content.
- Source master: `/Users/veeranuchleelalai/.codex/generated_images/01a12118-0f6e-7db3-b162-d745a3e28ca5/exec-98ca4643-4c50-4f19-b409-aad5c544049e.png` (1448×1086 PNG). The worker cannot write the OneDrive sidecar; the controller should archive this master there under the hub-art convention.
- Runtime: `scene.webp` (1448×1086, WebP quality 85).

## Prompt summary

Soft 3D storybook Art room matching the Music and Words & Books rooms, warm light and wood, no characters or text. Three large isolated stations on separate rugs: rainbow-painting easel for Little Color Garden, colour-mixing table for Color Lab, and a child-safe nail-art desk for Nail Salon. At most two subdued inactive decorations.

## 2026-11-06 Princess Dress Up door edit

- Tool: Codex built-in image editing (iteration tier, precise-object-edit).
- Edit target: `scene.webp` at 1448×1086; generated edit master: `/Users/veeranuchleelalai/.codex/generated_images/01a1b1a2-fde4-7633-9f57-6b6f24b38273/exec-d93a6dd7-0805-4adf-8468-1b9d1026714a.png`.
- Runtime method: only the generated inner-picture rectangle `(1054,72)`–`(1113,144)` was composited into the prior runtime plate. The existing wooden frame, wall, lighting, cabinet and every other scene element come from the prior accepted plate. The full plate was re-encoded as 1448×1086 WebP quality 85 (199,912 bytes; prior runtime 206,918 bytes).
- Review crops: ignored working files `dress-up-app/art-pending/hub-art-room-door-before.webp` and `hub-art-room-door-after.webp`.
- Prompt: “Repaint only the tiny flower picture inside the existing upper-right wooden wall frame as an elegant pink-and-lilac princess ball gown on a simple dress form. Match the room’s soft rounded painted storybook style. Keep the frame, wall, cabinet, shelves, plants, lighting, perspective, crop and every pixel outside the picture opening visually unchanged. No text, faces, people or extra objects.”
- Geometry: the frame did not move, so the Princess Dress Up polygon remains `[[71.5,4],[79,4],[79,16.5],[71.5,16.5]]`; Jewel Studio’s polygon is unchanged.

## 2026-11-06 Princess Dress Up card tile

- Runtime: `../assets/princess-dress-up.webp`, 192×192 WebP.
- Source: the app’s approved painted `dress-up-app/art/runway/gown-rose-ball.webp`; the full doll and gown were scaled intact over a soft pink-to-lilac field. No new figure art or generated content was introduced for the tile.

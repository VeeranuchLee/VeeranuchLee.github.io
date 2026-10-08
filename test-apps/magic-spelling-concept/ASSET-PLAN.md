# Magic Spelling — asset plan

Status: approval plan only. The three WebPs in this folder are concept mockups, not runtime art.

## Principles

- Build final art only after the concept and open decisions are approved.
- Use purpose-built workshop plates; reuse Our Word Book's **tokens, self-hosted fonts and lighting language**, not its hub backdrop as a stretched gameplay background.
- Keep interface text, numerals, letter slots, tile letters, progress and control icons in HTML/CSS/SVG. They must remain sharp, localisable, accessible and stateful.
- Preserve the existing ABC robot files and their still/talking swap exactly unless the owner separately approves a robot redraw.
- Final plates should be generated without baked-in words, numbers, controls, stars or letter answers.

## Runtime art inventory

| ID | Proposed path | Size | Format | Screen/use | Source and route |
|---|---|---:|---|---|---|
| P1 | `assets/spelling/workshop/grade-room-landscape.webp` | 2048 × 1536 | WebP, opaque | Grade selection, 4:3 landscape | New final plate; preparation-tier generation after approval, then Codex image edit only for in-page refinement |
| P2 | `assets/spelling/workshop/grade-room-portrait.webp` | 1536 × 2048 | WebP, opaque | Grade selection, portrait | New composition, not a crop; same route as P1 |
| P3 | `assets/spelling/workshop/pack-shelf-landscape.webp` | 2048 × 1536 | WebP, opaque | Pack picker behind live book controls | New final plate with empty shelf bays; same route |
| P4 | `assets/spelling/workshop/pack-shelf-portrait.webp` | 1536 × 2048 | WebP, opaque | Pack picker portrait | New crop-safe/recomposed plate; same route |
| P5 | `assets/spelling/workshop/desk-landscape.webp` | 2048 × 1536 | WebP, opaque | Gameplay writing desk | New final plate; same route |
| P6 | `assets/spelling/workshop/desk-portrait.webp` | 1536 × 2048 | WebP, opaque | Gameplay portrait | New composition with tall, two-row tile zone; same route |
| P7 | `assets/spelling/workshop/complete-landscape.webp` | 2048 × 1536 | WebP, opaque | Completion illuminated-page state | New derivative of approved desk plate; Codex image edit because it refines an in-page element |
| P8 | `assets/spelling/workshop/complete-portrait.webp` | 1536 × 2048 | WebP, opaque | Completion portrait | New derivative of P6; Codex image edit |
| O1–O3 | `assets/spelling/workshop/station-{alphabet,desk,spellbook}.webp` | ~720 × 720 each | WebP with alpha | Optional focus/pressed overlays for the three grade stations | Cut from approved plate where possible; if a redraw is needed, preparation generation then Codex refinement |
| O4 | `assets/spelling/workshop/book-current-glow.webp` | ~512 × 512 | WebP with alpha | Soft current-pack glow behind live book button | Prefer CSS radial glow; create raster only if CSS cannot match the approved plate |
| R1 | existing `assets-runtime/spelling/icons/robot-reader.webp` | 176 × 176 | WebP | Robot idle/speaker button | **Reuse unchanged** |
| R2 | existing `assets-runtime/spelling/icons/robot-reader-talk.webp` | 176 × 176 | animated WebP | Robot talking | **Reuse unchanged** |

Expected new raster count: **11 required** (P1–P8 + O1–O3), with **1 optional** glow (O4). Two existing robot assets are reused. If plate-based CSS focus proves sufficient, O1–O3 can also be omitted, reducing the final new-art count to 8.

## Code-native visual inventory

These are not new raster assets:

| Element | Implementation |
|---|---|
| Book/pack button | HTML button with CSS cloth/wood gradients, live pack number and three live star shapes; use the painted shelf as context, not as the hit target |
| Letter slot | HTML element, parchment fill, dark ink, gold correct edge; no baked letters |
| Letter tile | HTML button, wood/parchment material in CSS; Nunito 900 live character |
| Back, shelf arrows, speaker/mute | Inline SVG/currentColor, matching existing established icon controls |
| Progress tracks and stars | HTML/SVG; accessible text is always present |
| Focus rings | CSS `outline: 5px solid var(--wb-gold)` with offset |
| Pressed flowers | Prefer CSS/SVG shapes built from the existing reward count; if painted tokens are required after review, add one small sprite sheet rather than ten files |
| Continue plaque | HTML button over a blank plate region; never paint the word into the art |

## Reuse from Our Word Book

- Exact palette tokens `#4a2340`, `#3a1e33`, `#2b1626`, `#a78bfa`, `#7c3aed`, `#ffd54f`, `#a8386a`.
- `Nunito` 400/600/700/900 and `Fredoka One` self-hosted font files/CSS, copied or referenced according to the final deployment location.
- Arrow-plus-label control proportions, focus colour and card material logic.
- The night-time, edge-framed, calm-centre composition as a style reference.
- Do **not** duplicate `word-book/assets/backdrop.webp` into the runtime. It depicts a hub frame and provides neither the three stations nor a desk/shelf interaction surface.

## Final-art generation route

The current three mockups were explicitly requested as Phase 1 concepts and were generated with the built-in image tool. They are approval evidence only.

After approval:

1. Preparation: generate genuinely new base plates/objects through an allowed preparation route under `AGENTS.md`, save raw masters to the designated protected intake, visually review every candidate, and update provenance/inventory before integration.
2. Iteration: once an element is placed on a page, use Codex built-in image editing/inpainting only for refinements; do not regenerate a placed object through the browser.
3. Integration: encode approved runtime WebPs from protected masters, update the cache list/service worker only in a full-tier Phase 2 task, and verify both iPad orientations.

## Concept mockups and QA

| File | Purpose | Verdict | Review |
|---|---|---|---|
| `grade-selection-room.webp` | Three grade stations | **PASS** | No hands; A/B/C blocks are clear; three stations read distinctly; no UI text is baked in. Incidental owl is atmosphere only and is not proposed as a control or final requirement. |
| `gameplay-writing-desk.webp` | Robot, slots and tiles | **PASS** | No hands; the referenced robot identity is recognisable; five slots are empty; eight lowercase letters are clear and readable; response sparkle is local. |
| `pack-selection-26.webp` | 26-pack shelf vocabulary | **PASS** | No hands or baked text; exactly 26 books in 7+7+6+6 rows; star states, current bookmark and blank Continue plaque are legible. The shipping recommendation remains paged shelves, not this all-at-once density. |

No rerenders were required (0 of the allowed 2 retries used for each image).

## Mockup generation record

- Tool: Codex built-in image generation.
- Date: 2026-10-08.
- Output: 1448 × 1086 WebP, quality 86.
- Shared prompt core: polished children's storybook watercolour; deep plum/aubergine, violet and restrained warm gold; painted wood, parchment, brass and cloth-bound books; exact 4:3 composition; no baked interface text, pseudo-writing, floating emoji, rainbow, pink candy background, hands, logos or watermark.
- Grade prompt: exactly three recognisable stations—Alphabet Table, Word-Building Desk and Magical Spellbook—with calm title/control space.
- Gameplay prompt: writing desk, five empty parchment slots, eight large lowercase placeholder tiles, and the existing robot image supplied as identity reference.
- Pack prompt: exactly 26 blank-number books in a 7+7+6+6 bookcase, with completed/current/untouched states and a blank Continue plaque.

## Audio mapping — no new audio

No audio file, line, prompt or voice render is proposed.

| New screen/state | Existing sound/narration |
|---|---|
| Grade selection | Existing tap tone for selecting a station; no new spoken introduction |
| Pack selection / Continue | Existing tap tone; pack buttons stay visual and accessible by label |
| New word | Existing rendered word or homophone-context clip via `Clips.url`; current per-line fallback remains untouched |
| Robot retap | Same existing word/context line and still/talking swap |
| Correct letter / auto-fill / wrong letter | Existing `tap`, `ding`, and `wrong` WebAudio sounds |
| Solved word | Existing six praise clips plus existing celebration sound |
| Practice pass | Existing “Let's practice the tricky ones again!” clip |
| Completion | Existing one/two/three-star lines plus fanfare |
| Flower/bouquet reward | Existing reward sound behaviour |

Gap: the redesigned screen names and `Continue` control will not be narrated. This is intentional for Phase 1: they are large, recognisable controls with visible labels, while commissioning new lines would expand the fixed narration manifest and paid assets. If real-device observation shows a pre-reader cannot identify Continue or a station, that becomes a specific owner audio decision—not a silent browser-TTS fallback.

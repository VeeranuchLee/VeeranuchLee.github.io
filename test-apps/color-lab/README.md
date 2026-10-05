# Color Lab

**Status: stage 1 prototype. Not published and not registered for release.**

Color Lab is a proposed touch-first Art Hub activity for children aged about 4–8. It has two
rooms:

- **Explore Colors** — browse, compare, and hear useful colour words through large visual
  examples.
- **Mix Colors** — combine a small set of paint-like primaries and succeed when the result falls
  inside a believable perceptual region, never when it matches one exact hex value.

The aim is broad, low-pressure exposure to colour vocabulary. Commercial pencil and crayon sets
are evidence of names children may meet, not the app's taxonomy, data model, appearance, or brand.

## Relationship to the other colour projects

- `color-book/` is an unbuilt concept about understanding colour: vocabulary, perception, colour
  relationships, culture, and design judgment. Its README says other projects already behave as
  though Color Book is the repository's authority on colour vocabulary, but the owner has not
  decided that authority.
- `coloring-app/` is the shipped Little Color Garden making tool. Its fixed 36-colour Pixel
  palette and 48-colour Coloring palette help children choose colours for pictures; they do not
  define natural-language colour categories.
- Color Lab is an interactive vocabulary-and-mixing prototype. The owner chose a neutral
  `shared-data/colour-vocabulary/` source for both Color Lab and Color Book; neither app owns it.

## Files

| File | Purpose |
|---|---|
| `briefs/2026-10-05-color-lab.md` | Owner brief, preserved verbatim and always private |
| `RESEARCH.md` | Dataset, licence, naming, brand, and mixing research |
| `PROPOSAL.md` | Proposed model, activities, progression, UX, scoring, and validation plan |
| `work_progress_and_other_discussion.md` | Newest-first decision and discussion trail |
| `index.html`, `styles.css`, `app.js` | Touch-first prototype UI |
| `mixing-model.js` | Deterministic simple Oklab mixing model |
| `reachability-report.json`, `reachability-report.md` | Six-drop R/Y/B coverage audit |
| `tests/` | Node tests and report generator/checker |
| `.publish-manifest` | Potential publication boundary; the app remains unpublished |

The prototype reads the shared ISCC–NBS vocabulary and its explicitly proposed child subset.
It has no audio, generated art, service worker, release registration, or hub card. Its mixing
model is a playful deterministic interpolation with chroma loss and hue bias, not a model of
how real paint works.

Run the browser-free checks with `node tests/run-tests.js`.

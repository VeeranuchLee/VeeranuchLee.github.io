# Magic Spelling — Enchanted Spelling Workshop

Status: Phase 1 concept for owner approval. This document proposes a visual and interaction redesign; it does not change `math-app/magic-spelling.html`.

## 1. The idea

Magic Spelling becomes a room inside **Our Word Book**: a quiet, moonlit workshop where words are made by hand. The violet-and-gold world is shared with the Word Book, while the child-facing objects become more concrete at each grade:

- **Grade 1 — Alphabet Table:** chunky wooden A–Z blocks on a low round table.
- **Grade 2 — Word-Building Desk:** a writing desk with letter tiles, pencil cup and paper.
- **Grade 3 — Magical Spellbook:** a large open book on a carved lectern, with restrained gold light.

These are not three coloured cards with new decoration. They are three recognisable places in one illustrated room. The child enters the object that matches the work they are ready to do.

The workshop preserves the existing learning contract: the game asks by voice, the word remains hidden, the child answers with one large letter tile at a time, hints increase only after mistakes, and every child can finish.

## 2. Relationship to Our Word Book

### Shared tokens

| Token | Value | Use |
|---|---:|---|
| `--wb-plum` | `#3a1e33` | Main room wall and dark field; exact Word Book body token |
| `--wb-aubergine` | `#2b1626` | Deep vignette, shelf recesses; exact Word Book gradient end |
| `--wb-plum-light` | `#4a2340` | Raised wall planes; exact Word Book gradient start |
| `--wb-violet` | `#7c3aed` | Active/current state; exact Word Book Spelling card endpoint |
| `--wb-violet-light` | `#a78bfa` | Focus/selected state; exact Word Book Spelling card start |
| `--wb-gold` | `#ffd54f` | Focus ring, success stars, important trim; exact Word Book heading/focus token |
| `--wb-berry` | `#a8386a` | Secondary accent and spoken-control state |
| `--paper` | `#fff4dc` | Slots, labels and readable light surfaces |
| `--ink` | `#30233f` | Letters on parchment; near-black purple rather than pure black |
| `--wood` | `#6b3d2b` | Desk, shelves and station furniture |

The game should import the same self-hosted Nunito family as today and use **Nunito 900** for child-facing labels, numerals and letters. **Fredoka One**, already shipped by Our Word Book, is reserved for the short display title only. Letter tiles keep Nunito because its lowercase forms are the learning content, not decoration.

### Art language

- Storybook watercolour with softly visible brush texture, clean silhouettes and real objects.
- Deep violet night at the perimeter; warm amber task light wherever the child acts.
- Walnut, parchment, cloth-bound books and brass form the material system.
- Gold is scarce and meaningful: focus, progress, correct feedback and completion.
- Do not reuse the Word Book backdrop as the game plate. Reuse its palette, lighting logic and edge-framing composition; paint a purpose-built workshop with interaction-safe negative space.
- No OS emoji as scene art, no rainbow title, no candy-pink wash, no unrelated floating ornaments.

## 3. Motion rules

The room is composed at rest. Motion answers an action or explains a state.

- Station selection: one 180–240 ms pool of lamplight/focus, then navigation.
- Pack selection: the current book eases forward by 4–6 px; no shelves bob or sparkle continuously.
- Robot: retain the existing still/talking swap and tap-driven mouth behaviour. Under reduced motion, retain its existing light-pulse speaker cue.
- Correct letter: tile travels visually into its slot or the slot receives the existing short pop; never animate the whole desk.
- Hint after miss two: only valid next-letter tiles receive a slow gold breathing outline. This preserves the existing help ladder and the child's agency.
- Wrong tap: one brief local nudge plus the existing sound; no red full-screen flash.
- Completion: three stars arrive once, the spellbook/desk gives one soft gold bloom, then becomes still. Confetti is reduced to a short contained fall, and is removed entirely under `prefers-reduced-motion`.
- No ambient loops, drifting emoji, bouncing headings or decorations that compete with the question.

## 4. Screen designs

### A. Grade selection — the workshop room

The room itself is the menu. The three stations occupy three large, non-overlapping hit regions across the lower two-thirds in landscape. Portrait reframes them as a shallow vertical journey: Alphabet Table at the front, Word-Building Desk in the middle, Spellbook at the back, without shrinking any target.

Each station includes an HTML label and an honest progress line over a calm plaque:

- `Grade 1` / `Alphabet Table`
- `Grade 2` / `Word-Building Desk`
- `Grade 3` / `Magical Spellbook`

Progress appears as, for example, **“5 of 9 packs complete · 12 of 27 stars”**. The object is the primary cue; the words confirm it. The existing bouquet total becomes a small pressed-flower collection drawer at the bottom edge, not a fourth destination.

The existing back route to Our Word Book remains top-left and receives the established arrow-plus-label treatment where space permits. Audio remains top-right and keeps both icon and state semantics. Both are live HTML/SVG, never painted into the plate.

### B. Pack selection — paged workshop shelves

Use **paged shelves of at most nine large packs per page**, not a single 26/28-item wall in the shipping UI. The 26-pack mockup deliberately proves the visual vocabulary and state hierarchy, but the production layout should protect finger size and recognition:

- Grade 1: one page of 9.
- Grade 2: three pages, 9 + 9 + 8.
- Grade 3: four pages, 7 + 7 + 7 + 7, or 9 + 9 + 9 + 1 only if the last page is designed as a deliberate final-book moment. The recommendation is four even shelves.

Each pack is a recognisable cloth-bound book with its number as live HTML, a three-star strip and one state:

- **Untouched:** book closed, empty star outlines, full contrast and available.
- **In progress/current:** violet bookmark, book projects slightly, “Continue” association.
- **Complete:** 1–3 filled gold stars according to the stored best score; a small gold corner clasp, not a green tick.

Nothing is locked. Page dots are large enough to tap but do not become 26 tiny navigation targets. Left/right shelf arrows are at least 52 px and speak their action through `aria-label`; swiping is optional enhancement, never the only route.

A single large **Continue** button is pinned below the shelf. It resumes the first unplayed pack; if all packs have a score, it opens the earliest pack with the lowest stored star count. A secondary `Choose a pack` label can remain above the shelf, but Continue is the obvious return path.

### C. Gameplay — the writing desk

The camera moves closer to the Grade 2 desk, but the same desk serves every grade so the mechanics do not appear to change. The task surfaces are quiet and physical:

1. **Top bar:** back, `Grade · Pack · word/pack total`, mute. Pack/word progress is text plus a short bead track, not a decoration.
2. **Robot speaker:** the existing ABC robot stands at the left of the parchment prompt. It remains the actual “say again” button at 88–104 px and the speech area points toward it.
3. **Letter slots:** centred on a cream writing board, high contrast, at least 56 × 64 px where word length permits. Long words reduce gaps before reducing targets; the board may wrap only at a syllable-neutral visual row break if a future implementation proves one-row fit impossible.
4. **Letter bank:** one or two orderly rows of tactile wooden tiles, lowercase except where the real written form is capitalised. Normal tiles target 68–76 px; dense banks never drop below 52 px on the 9.7-inch iPad.
5. **Feedback:** praise occupies one stable line above the bank so layout does not jump. The help ladder is unchanged: miss one asks for another try; miss two glows every valid next tile; miss three fills one letter and schedules that word for practice.
6. **Rewards:** score, ten-flower progress and bouquets remain, but become a shallow desk drawer/status rail. Filled flowers are painted pressed-flower tokens rather than emoji. The rail never covers tiles or becomes the loudest object.

The word stays hidden until solved. Homophone context remains spoken and never printed. The existing narration, exact line resolver and robot tap behaviour remain the source of truth.

### D. Completion — the finished page

The desk does not disappear behind a generic modal. The work surface opens into a finished illuminated page:

- 1–3 large gold stars with the existing meaning (independence, not mere completion).
- `Pack N complete` and the existing result line as live text.
- The completed book receives its star clasp in a small shelf vignette.
- Primary action: **Continue to Pack N+1** when one exists.
- Secondary actions: **Play again** and **All packs**.
- At the end of a grade, the primary action becomes **Back to workshop**; the completed station receives its honest progress state.

The existing flower reward and three-star bouquet bonus remain unchanged. Celebration audio and narration remain unchanged.

## 5. The grade-progress correction

### What is misleading now

`gradeStars(store, grade)` correctly sums every stored pack star. The home card's accessible name correctly compares that sum with `packCount × 3`. The visible `Stars` component, however, is called with `total={3}`. Once a grade has more than three stars, it still renders only three filled stars. A child can therefore hear “12 of 27 stars” while seeing the same three-star row as a fully perfected grade. The three symbols look like grade completion although they are only a clipped rendering of a much larger total.

### Honest replacement

Show two explicit measures:

- **Packs complete:** number of pack IDs in the grade with a stored score of 1–3, over 9/26/28.
- **Stars earned:** sum of stored best stars, over 27/78/84.

Use a nine-segment or proportionate gold progress track for packs plus the text line. Do not draw 78 or 84 star icons, and do not compress a grade into three stars. Pack cards retain their own three-star score because three is truthful at that level.

Saved data need not migrate: both measures derive from the existing `magicSpelling.v1.stars` object. Any new “last opened pack” convenience key must be additive and must not rewrite or invalidate the current store.

## 6. Accessibility and device contract

- Design floor: the 9.7-inch iPad at **768 × 1024 portrait** and **1024 × 768 landscape**.
- Tap targets: 44 px absolute minimum; 52–60 px for navigation and pack controls; 64 px preferred for letter tiles.
- Method C: `touch-action: manipulation` on both `html` and `body`; add the byte-identical shared `tap-zoom-guard.js`; do not use `user-scalable=no`, `maximum-scale`, `gesturestart` prevention or any global pinch blocker. There are no drag surfaces in this tap-only game.
- Pinch remains available in both directions. A double-tap must still perform the intended second letter tap after the guard suppresses Safari zoom.
- Both orientations use art-directed crops/plates, not a landscape image squeezed into portrait. Controls remain HTML/SVG over the plate.
- Every icon control has an `aria-label`, a visible focus ring using `--wb-gold`, and an audible/visible state. A silent or state-ambiguous control is a defect.
- Letter and progress text meets strong contrast on parchment or dark-violet solid fields; never place learning text directly over detailed art.
- Do not rely on colour alone: current book also projects and carries a bookmark; complete packs have filled star shapes; mute uses icon shape plus `aria-pressed`/label.
- `prefers-reduced-motion` disables travel, confetti and ambient effects, while preserving state changes and the robot's non-motion speaking cue.
- Layout reserves safe-area insets and keeps the status rail from covering the bottom tile row.
- Offline support and the current service worker remain unchanged until Phase 2 explicitly inventories and precaches approved assets.

## 7. Functional invariants for Phase 2

The visual rebuild must not change the 729-word universe, pack boundaries, British forms, homophone contexts, narration text/clip resolution, lowercase/capital rules, decoy algorithm, three-step help ladder, relearning passes, star thresholds, flower/bouquet rewards, score behaviour, `magicSpelling.v1` data, back route, or offline behaviour.

The safest implementation shape is to keep the pure spelling engine and storage functions intact, replace the four screen renderers and CSS, and add presentation-only selectors for derived progress.

## 8. Open decisions for the owner

1. **Pack shelf paging:** approve 9-per-page for Grades 1–2 and four even 7-pack pages for Grade 3? **Recommended: yes.** It protects touch size and gives Grade 3 a balanced final page.
2. **Continue rule after all packs have been attempted:** open the earliest lowest-star pack, or the most recently played pack? **Recommended: earliest lowest-star pack.** It needs no new history data and turns Continue into useful practice.
3. **Reward translation:** retain the flower/bouquet system visually as pressed flowers in a workshop drawer, or invent a new magical reward object? **Recommended: pressed flowers.** It preserves the reward children already earned and avoids a data-semantic change disguised as art.
4. **Portrait art strategy:** commission dedicated portrait plates for all four screen families, or use responsive crops of landscape plates? **Recommended: dedicated portrait plates for grade selection and gameplay; responsive/crop-safe variants for shelves and completion.** The three stations and long tile banks are too important to trust to cropping alone.
5. **Grade labels:** show both the grade and station name, or station name only? **Recommended: both.** The object serves pre-readers; the grade keeps school vocabulary and parent orientation clear.

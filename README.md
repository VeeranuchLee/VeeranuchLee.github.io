# veeranuchlee.github.io

Games I build for my own children, and a record of how they were made.

Everything here is free, runs in a browser, needs no account, and works offline once
it has been opened. They are designed for a 9.7" iPad, which is what my children
actually use.

## Play them

**Start here → [All the games](https://veeranuchlee.github.io/children-apps/)**

| Game | What it is |
| --- | --- |
| [Space Math](https://veeranuchlee.github.io/magic-math/space-math.html) | Counting, place value, times tables and column arithmetic, on a journey through the solar system |
| [Unicorn Math](https://veeranuchlee.github.io/magic-math/unicorn-math.html) | The same maths, a different world |
| [Magic Spelling](https://veeranuchlee.github.io/magic-math/magic-spelling.html) | Letters and words |
| [Writing Book](https://veeranuchlee.github.io/writing-book/) | Hear a word, watch how each letter is written, then trace it on writing paper |
| [Classical Music](https://veeranuchlee.github.io/magic-math/classical-music.html) | A first instrument to play with |
| [Petal Kingdom](https://veeranuchlee.github.io/flower-shooter/) | An arcade game |
| [Little Color Garden](https://veeranuchlee.github.io/little-color-garden/) | Colouring |
| [Ari & Dot](https://veeranuchlee.github.io/solar-storybook-feedback/) | An illustrated tour of the solar system |
| [Planets & Moons](https://veeranuchlee.github.io/solar-system-game/) | Put the planets in order, give every planet its moons, then do the same for the dwarf planets |
| [Animal Book](https://veeranuchlee.github.io/animal-book/) | A growing illustrated animal encyclopaedia |

## How these are made

Almost none of this was typed by hand. Each part uses a different tool, chosen for what
it is actually good at — and that division is the interesting part.

**The voices are AI-generated. None is a recording of a real person.** Each is *designed*
from a written description rather than cloned from anyone — Magic Math has a narrator and
3,404 clips, Planets & Moons has a different voice of its own and 76. Nothing is generated
while a child is playing: the apps ship finished audio files and never call a speech
service, which is also why they still speak with no network. The remaining games use the
browser's own built-in speech.

**The music** is AI-generated too — one instrumental loop, on the menu screen only.
Generated music does not loop cleanly, so the track is trimmed and crossfaded back onto
itself before it ships.

**The sound effects are not recordings or files at all.** Every tap, chime and celebration
is synthesised in the browser with a few lines of maths — oscillators, filtered noise and a
generated reverb. It ships zero bytes of audio and never has to load.

**The artwork** is AI-generated, with different tools for different jobs: one route for
inventing new elements in bulk, another for refining an element already sitting on a page.

**The code** is written by AI coding agents working in this repository, mostly Claude Code
with Codex and Grok on particular jobs — more than 160 task branches so far. Every decision, and
every idea that was rejected and why, is written down in the repository as it happens, so
the reasoning survives the conversation it came from.

---

## Repository notes

The rest of this file is for whoever works on the site.

The user Pages site. Three deliberately separate things live here:

    /                 a deliberately plain placeholder, reserved for professional use
    /children-apps/   the children's games hub — one screen, ten cards
    /test-apps/       an unlinked hub for apps being tested before main-hub promotion

**Live:** `https://veeranuchlee.github.io/`
**Public repo:** `VeeranuchLee/VeeranuchLee.github.io`
**Source of truth:** this directory, in the private `children-games` repo.

`/test-apps/` is public but intentionally undiscoverable from `/` and
`/children-apps/`. Share its direct URL with test users. Promotion is a separate owner
decision; adding something here never implies adding it to the main hub.

## Why the games are in a subdirectory

The owner is keeping the root for professional use later. Putting the children's
hub at `/children-apps/` means their address never changes when that arrives —
the root file is simply replaced.

It also buys the hub **offline support**, which it could not have at the root. A
service worker's scope is its own directory downwards, so a worker at `/` would
sit in front of every game site beneath it. At `/children-apps/` it covers the hub
and nothing else.

## The games do not live here

Each game is its own GitHub project repo, and GitHub serves those at `/<repo>/`.
They **cannot** be nested under `/children-apps/`; the hub links up and across
with `../` — with one exception, Writing Book, which lives at the top level of
this Pages repository (see the row below and the paragraph after the table).

| Card | Path | Repo |
| --- | --- | --- |
| Space Math | `../magic-math/space-math.html` | `magic-math` |
| Unicorn Math | `../magic-math/unicorn-math.html` | `magic-math` |
| Magic Spelling | `../magic-math/magic-spelling.html` | `magic-math` |
| Writing Book | `../writing-book/` | this repo, top level (promoted from `/test-apps/` 2026-08-29) |
| Classical Music | `../magic-math/classical-music.html` | `magic-math` |
| Petal Kingdom | `../flower-shooter/` | `flower-shooter` |
| Little Color Garden | `../little-color-garden/` | `little-color-garden` |
| Ari & Dot | `../solar-storybook-feedback/` | `solar-storybook-feedback` |
| Planets & Moons | `../solar-system-game/` | `solar-system-game` |
| Our Animal Book | `../animal-book/` | `animal-book` |

The test publish additionally places three apps at the top level of the public Pages
repository — Music Book at `../music-book/`, Clock Game at `../time-book/` and
Pattern Pegs at `../pattern-pegs/` (the private folder is `pattern-pegs-app/`; the
public path drops the family `-app` suffix) — plus the self-contained
`./bird-flight/` interaction test. None of the three appears in the main hub table
above. **Writing Book was the fourth of these until 2026-08-29**, when the owner
promoted it to the main hub: only its card moved, and the app still serves from
`../writing-book/` at this repo's top level. A later main-hub promotion may split
any top-level app into its own project repository, but neither testing nor
promotion requires that extra public-repository boundary.

All links are relative, so there is no domain to go stale.

## Service workers — read before moving anything

- `children-apps/service-worker.js` is scoped to `/children-apps/`. **Never move it
  to the root.** At the root it would take scope over `/magic-math/`,
  `/flower-shooter/` and the rest, each of which already ships its own worker.
- **Navigations are network-first here**, unlike the games' worker. `math-app`'s
  worker is cache-first for everything, so a freshly published change stays
  invisible until the launch *after* the one that downloads it — the owner hit
  exactly that on 2026-08-16 and reasonably read it as a failed publish. The hub
  fetches its page from the network whenever there is one and falls back to the
  cache, so a republish appears on the very next load.
- Static assets stay cache-first; they only change when `CACHE_NAME` changes.
- **Bump `CACHE_NAME` on every publish** or installed devices keep the old shell.

## Art

No new artwork was invented. Every card reuses an existing approved sprite, copied
into `children-apps/assets/` rather than referenced across repos.

`app-192.png` / `app-512.png` are generated — run:

    python3 site/children-apps/tools/build-icons.py

They composite the unicorn **crown** onto the hub palette. The crown is the one
approved sprite not already carrying a card, so the installed icon does not look
like a single game. Output is deterministic; re-running leaves a clean
`git status`.

`planets-and-moons.png` is Solar System Order's own app icon, generated by that
game's `tools/build-assets.py` from the same sprites the game plays with — the Sun
low and left, with Earth and Saturn climbing away from it. It is the one card whose
art is a square tile by design rather than for want of a cut-out sprite.

`writing-book.webp` is a square crop of Writing Book's own published `write.jpg`
word picture — the boy writing in his book with a pencil — cut from the tall strip
the app serves on its word cards (crop window chosen by eye, verified against the
source). The app has no cut-out sprite, so like Animal Book it rides as a rounded
tile.

**Two known art gaps**, both cosmetic and both inherited:

- **Classical Music** uses the rainbow, as the old index did. It is not a musical
  image; that app has no art of its own.
- **Petal Kingdom** uses the unicorn bouquet. `flower-shooter` ships only three
  large backgrounds, and its `assets/icons/` holds nothing but a README.

## Publishing

Copy the shipped files to the root of the public repo and push. **Do not copy the
directory wholesale, and do not derive the list by hand** — ask for it:

    scripts/ship-list.py site

That prints one path per line, relative to this directory. It refuses to print
anything unless `site/.publish-manifest` classifies every tracked file here as
either `[ship]` or `[private]`. The same script serves every published app —
`math-app`, `coloring-app`, `flower-shooter`, `animal-book`, `solar-storybook`,
`solar-system-game` — each with its own manifest, and `scripts/preflight.sh` runs
all of them on every commit. A new app joins that list by gaining a manifest, and
**this sentence has to be extended by hand when one does**, which is why it is a
list of directories rather than a claim about how many there are.

**Why it is a manifest and not a sentence.** This directory is not only the site:
`work_progress_and_other_discussion.md` lives here too, because discussion logs
live in the app's own folder. It is the internal trail — rejected ideas, reasoning,
notes about how the owner and the agents work. This file used to say "derive the
ship list with `git ls-files site`", which from 2026-08-19 08:47 quietly included
it. A publish ran that evening at 21:12 ICT with the instruction live, and the log
survived only because that publish copied the three files it had changed rather
than following the instruction. Practice saved it; procedure would not have.

So a new file under `site/` now has to be classified before it can be committed at
all. Matching neither section fails `scripts/preflight.sh` — nothing defaults into
being published, and nothing defaults into being hidden. A wildcard also never
carries Markdown: `assets/**` sweeps the art and leaves `assets/NOTES.md` behind,
because Markdown is what the internal reasoning is written in and publishing a
document should take a deliberate act.

The public repo here has never held the discussion log, verified against its entire
history rather than its current file list. **`magic-math` was not so lucky** — on
2026-08-19 it received `math-app`'s discussion trail and internal design document,
which were served for about 23 hours before removal on 2026-08-20. That is why the
gate now covers every published app rather than this one directory.

Copying the whole list rather than only the files you changed is worth the extra
seconds: it surfaces drift instead of hiding it. That is how the missing
`Our Animal Book` row in the public `README.md` was found on 2026-08-20, left
behind by the publish that added the card.

There is deliberately no publish script, so nothing runs at publish time. What
guards the copy is that it comes from a committed tree, and `scripts/preflight.sh`
runs on every commit and push.

One of its checks is worth knowing about here: the **"N games" badges** on the
Space Math and Unicorn Math cards are verified against `math-app/`, by counting
the cards on each game's home menu. The badge is a hand-typed claim about an app
in a different repo, and it went stale for weeks once — it read "9 games" while
both apps had eleven. Preflight now fails the commit that would do that again, and
the message says which file to edit. If you add a badged card pointing at a new
app, extend the small href map in that check; it will tell you when you need to.

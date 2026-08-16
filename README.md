# veeranuchlee.github.io

The user Pages site. Two things live here:

    /                 a deliberately plain placeholder, reserved for professional use
    /children-apps/   the children's games hub — one screen, seven cards

**Live:** `https://veeranuchlee.github.io/`
**Public repo:** `VeeranuchLee/VeeranuchLee.github.io`
**Source of truth:** this directory, in the private `children-games` repo.

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
with `../`:

| Card | Path | Repo |
| --- | --- | --- |
| Space Math | `../magic-math/space-math.html` | `magic-math` |
| Unicorn Math | `../magic-math/unicorn-math.html` | `magic-math` |
| Magic Spelling | `../magic-math/magic-spelling.html` | `magic-math` |
| Classical Music | `../magic-math/classical-music.html` | `magic-math` |
| Petal Kingdom | `../flower-shooter/` | `flower-shooter` |
| Little Color Garden | `../little-color-garden/` | `little-color-garden` |
| Ari & Dot | `../solar-storybook-feedback/` | `solar-storybook-feedback` |

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

**Two known art gaps**, both cosmetic and both inherited:

- **Classical Music** uses the rainbow, as the old index did. It is not a musical
  image; that app has no art of its own.
- **Petal Kingdom** uses the unicorn bouquet. `flower-shooter` ships only three
  large backgrounds, and its `assets/icons/` holds nothing but a README.

## Publishing

Copy this directory's contents to the root of the public repo and push. The ship
list is derived from tracked files, so nothing untracked or gitignored can leak:

    git ls-files site | sed 's|^site/||'

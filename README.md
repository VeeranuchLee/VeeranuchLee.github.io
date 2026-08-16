# Games hub

The front door for every published game: one address, one screen, seven cards.

**Live:** `https://veeranuchlee.github.io/`
**Public repo:** `VeeranuchLee/VeeranuchLee.github.io` (the user Pages site)
**Source of truth:** this directory, in the private `children-games` repo.

## Why it exists

Each game is published as its own project site under `veeranuchlee.github.io/<repo>/`.
Before this, the page acting as the front door was `math-app/index.html`, which shipped
inside the `magic-math` repo — so the address said `magic-math` while the page offered
several unrelated games, and it only knew about the four inside that one repo.

This hub sits at the **root** of the user Pages site, so every game is a sibling path
below it and the address is just the domain.

## What it links to

| Card | Path | Repo |
| --- | --- | --- |
| Space Math | `./magic-math/space-math.html` | `magic-math` |
| Unicorn Math | `./magic-math/unicorn-math.html` | `magic-math` |
| Magic Spelling | `./magic-math/magic-spelling.html` | `magic-math` |
| Classical Music | `./magic-math/classical-music.html` | `magic-math` |
| Petal Kingdom | `./flower-shooter/` | `flower-shooter` |
| Little Color Garden | `./little-color-garden/` | `little-color-garden` |
| Ari & Dot | `./solar-storybook-feedback/` | `solar-storybook-feedback` |

The links are **relative**, so the whole thing works unchanged if it is ever moved
under a different origin, and there is no hard-coded domain to go stale.

## There is deliberately no service worker

This page sits at the site root. A worker registered from here would take scope over
**every** game beneath it, each of which already ships its own. The narrowest scope
wins for a given path, so the games would still control themselves — but a root worker
would be intercepting navigations across four other apps for no benefit, and any bug in
it would be a bug in all of them at once. The page is one small static file; it does not
need one.

The consequence, stated plainly: **the hub itself does not work offline.** Each game
still does, once opened. If the hub ever needs offline support, scope a worker to a
subdirectory rather than the root.

## Art

No new artwork was invented. Every card reuses an existing approved sprite, copied into
`assets/` at build time rather than referenced across repos:

- `app-192.png` / `app-512.png` are generated — run `python3 hub/tools/build-icons.py`.
  They composite the unicorn **crown** onto the hub palette. The crown is the one
  approved sprite not already carrying a card, so the installed icon does not look like
  a single game.

**Two known art gaps**, both cosmetic and both inherited:

- **Classical Music** uses the rainbow, as the old index did. It is not a musical image;
  that app has no art of its own.
- **Petal Kingdom** uses the unicorn bouquet. `flower-shooter` ships only three large
  backgrounds and its `assets/icons/` holds nothing but a README.

## Publishing

Copy this directory's contents to the root of the public repo and push:

    git ls-files hub | sed 's|^hub/||'

The ship list is derived from tracked files, so nothing untracked or gitignored can
leak. `tools/` is dev-only and harmless to ship, matching what `math-app` already does.

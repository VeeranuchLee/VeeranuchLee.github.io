#!/usr/bin/env python3
"""Build the installed-app icons for the games hub.

Same principle as `math-app/tools/build-icons.py`: no new artwork is invented.
The icon composites an existing, owner-approved sprite onto the hub's own
palette, so the home-screen icon matches the page it opens.

The sprite is the unicorn **crown**, chosen because it is the one approved icon
not already carrying a card on the hub — the rainbow, star, rocket, unicorn,
bouquet and Ari/Dot art are all spoken for, and reusing one of those would make
the home-screen icon look like a single game rather than the front door to all
of them.

Unlike the math builder this uses Pillow, which is present on this machine
(11.3.0). The math builder pre-dates that and hand-rolls PNG encoding; there is
no reason to repeat that here, but it does mean this script needs Pillow while
that one does not.

    python3 hub/tools/build-icons.py

Output is deterministic. Regenerate and commit whenever the sprite or palette
changes.
"""

from __future__ import annotations

import pathlib

from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent.parent
REPO = HERE.parent
SOURCE = REPO / "math-app" / "assets" / "unicorn" / "icons" / "crown.png"
OUT_DIR = HERE / "assets"

# The hub's own palette (see index.html): soft lilac lifting to warm pink.
TOP = (253, 246, 255)
BOTTOM = (247, 217, 236)

SIZES = (192, 512)
# Fraction of the canvas the sprite occupies. Leaves a margin so iOS's rounded
# mask never clips the crown's points.
INSET = 0.66


def background(size: int) -> Image.Image:
    """A vertical gradient between the two palette stops."""
    img = Image.new("RGB", (1, size))
    for y in range(size):
        t = y / max(size - 1, 1)
        img.putpixel(
            (0, y),
            tuple(round(TOP[i] + (BOTTOM[i] - TOP[i]) * t) for i in range(3)),
        )
    return img.resize((size, size), Image.NEAREST)


def build(size: int) -> pathlib.Path:
    canvas = background(size).convert("RGBA")

    sprite = Image.open(SOURCE).convert("RGBA")
    target = round(size * INSET)
    # Preserve the sprite's aspect ratio; fit it inside the target box.
    scale = target / max(sprite.width, sprite.height)
    sprite = sprite.resize(
        (max(round(sprite.width * scale), 1), max(round(sprite.height * scale), 1)),
        Image.LANCZOS,
    )

    pos = ((size - sprite.width) // 2, (size - sprite.height) // 2)
    canvas.alpha_composite(sprite, pos)

    out = OUT_DIR / f"app-{size}.png"
    canvas.convert("RGB").save(out, "PNG", optimize=True)
    return out


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"sprite missing: {SOURCE}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        path = build(size)
        print(f"  {path.relative_to(REPO)}  {path.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()

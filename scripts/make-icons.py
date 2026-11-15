"""
Draws the home-screen icons (PNG) from the logo's geometry: the ink-coloured tile with the L and
the orange rule (docs/brand/usage.md). Run from the repo root:  python scripts/make-icons.py
Needs Pillow (pip install pillow). Writes public/icons/*.png, which src/app/manifest.ts lists.

The mark uses the 32-unit grid of the logo, scaled so it spans 20 by 24 units in the middle of a
512 tile (the same as public/brand/ledge-app-icon.svg). The maskable icon is full bleed with no
rounded corners, because the phone cuts its own shape (a circle, a squircle) out of it; the mark
stays well inside the central 80% that every shape keeps.
"""

import os

from PIL import Image, ImageDraw

TILE = (18, 21, 20, 255)  # #121514
LIGHT = (242, 244, 241, 255)  # #f2f4f1
ORANGE = (245, 132, 69, 255)  # #f58445 (the dark-theme orange, always used on the dark tile)
SUPERSAMPLE = 4

# (x1, y1, x2, y2) on the logo's 32-unit grid.
INK_RECTS = [(6, 4, 10, 16), (6, 16, 26, 20)]  # the L: an upright and a foot
RULE_RECT = (6, 24, 26, 28)


def render(size: int, rounded: bool) -> Image.Image:
    s = size * SUPERSAMPLE
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    if rounded:
        draw.rounded_rectangle((0, 0, s - 1, s - 1), radius=s * 114.5 / 512, fill=TILE)
    else:
        draw.rectangle((0, 0, s, s), fill=TILE)
    unit = s / 512 * 10
    offset = s / 512 * 96

    def box(rect):
        x1, y1, x2, y2 = rect
        return (offset + x1 * unit, offset + y1 * unit, offset + x2 * unit - 1, offset + y2 * unit - 1)

    for rect in INK_RECTS:
        draw.rectangle(box(rect), fill=LIGHT)
    draw.rectangle(box(RULE_RECT), fill=ORANGE)
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    out = os.path.join("public", "icons")
    os.makedirs(out, exist_ok=True)
    for name, size, rounded in [
        ("ledge-192.png", 192, True),
        ("ledge-512.png", 512, True),
        ("ledge-maskable-512.png", 512, False),
    ]:
        render(size, rounded).save(os.path.join(out, name), optimize=True)
        print("wrote", os.path.join(out, name))


if __name__ == "__main__":
    main()

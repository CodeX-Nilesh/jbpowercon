#!/usr/bin/env python3
"""Dev-only tool: process src/source/logo-original.png into the transparent
cutout logo assets shipped in src/images/. Not run as part of build.mjs and
not part of the served site — run manually (`python tools/logo.py`)
whenever the source artwork changes.

The source file already carries an alpha channel (a prior cutout pass), but
with a visible speckle of faint low-alpha noise and soft/uneven edges. This
script: suppresses that noise, erodes the alpha mask by ~1px to kill any
colour halo at the edges, feathers it slightly for clean anti-aliasing, then
crops out the icon mark and the icon+wordmark "lockup" (the tagline row is
left off — it is rendered as live text in the footer instead), and derives
a reversed (navy -> white, orange kept) variant of each for use on graphite
backgrounds, plus a square favicon/apple-touch-icon source.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "source" / "logo-original.png"
OUT = ROOT / "src" / "images"

DARK_VALUE_THRESHOLD = 150  # any opaque pixel this dark (navy text, the
# near-black "WIRES & CABLES" line) flips to white in the reversed variant;
# the orange and metallic-grey strands are both much brighter than this so
# they're untouched.
ALPHA_NOISE_THRESHOLD = 20
ERODE_PASSES = 1
FEATHER_RADIUS = 0.6

# Pixel boxes measured from the source artwork (1495x1052), (left, top, right, bottom)
BOX_ICON = (227, 105, 1217, 660)
BOX_LOCKUP = (78, 105, 1437, 885)
# Just the bold "JB" lettermark + bolt, no cable swoosh — the swoosh is too
# fine-detailed to read at 16-32px, so the favicon uses this tighter crop.
BOX_MARK = (610, 105, 1217, 660)


def clean_alpha(im: Image.Image) -> Image.Image:
    arr = np.array(im)
    a = arr[:, :, 3]
    a = np.where(a < ALPHA_NOISE_THRESHOLD, 0, a)
    arr[:, :, 3] = a
    return Image.fromarray(arr, "RGBA")


def erode_alpha(im: Image.Image, passes: int) -> Image.Image:
    r, g, b, a = im.split()
    for _ in range(passes):
        a = a.filter(ImageFilter.MinFilter(3))
    return Image.merge("RGBA", (r, g, b, a))


def feather_alpha(im: Image.Image, radius: float) -> Image.Image:
    r, g, b, a = im.split()
    a = a.filter(ImageFilter.GaussianBlur(radius))
    return Image.merge("RGBA", (r, g, b, a))


def to_reversed(im: Image.Image) -> Image.Image:
    """Any dark pixel (navy artwork, the near-black "WIRES & CABLES" line)
    -> white. Orange and the bright metallic cable strands are untouched —
    both have a max channel well above the darkness threshold."""
    arr = np.array(im).astype(np.int32)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    value = np.maximum(np.maximum(r, g), b)
    dark_mask = value < DARK_VALUE_THRESHOLD
    out = arr.copy()
    out[:, :, 0] = np.where(dark_mask, 255, r)
    out[:, :, 1] = np.where(dark_mask, 255, g)
    out[:, :, 2] = np.where(dark_mask, 255, b)
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")


def trim(im: Image.Image) -> Image.Image:
    bbox = im.getbbox()
    return im.crop(bbox) if bbox else im


def save(im: Image.Image, name: str, max_width: int | None = None) -> None:
    path = OUT / name
    if max_width and im.width > max_width:
        ratio = max_width / im.width
        im = im.resize((max_width, round(im.height * ratio)), Image.LANCZOS)
    # Lossy at high quality: flat colour regions compress far smaller than
    # lossless and still look crisp at the sizes these render at (header/
    # footer logo, never full-bleed), which matters more for LCP/weight.
    im.save(path, quality=92, method=6)
    print(f"wrote {path.relative_to(ROOT)} {im.size} ({path.stat().st_size // 1024}KB)")


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"missing source file: {SRC}")

    base = Image.open(SRC).convert("RGBA")
    base = clean_alpha(base)
    base = erode_alpha(base, ERODE_PASSES)
    base = feather_alpha(base, FEATHER_RADIUS)

    icon = trim(base.crop(BOX_ICON))
    lockup = trim(base.crop(BOX_LOCKUP))

    # Both ship at 2x the largest size they're ever displayed at (header/
    # footer wordmark, never full-bleed) — generous for retina without
    # shipping the full ~1300px source.
    save(icon, "logo-icon.webp", max_width=320)
    save(lockup, "logo-lockup.webp", max_width=560)
    save(to_reversed(icon), "logo-icon-reversed.webp", max_width=320)
    save(to_reversed(lockup), "logo-lockup-reversed.webp", max_width=560)

    # Square favicon source: just the bold JB+bolt mark (no cable swoosh,
    # which disappears into noise at 16-32px), padded to a square.
    mark = trim(base.crop(BOX_MARK))
    side = max(mark.size)
    pad = 24  # a little breathing room so the glyph doesn't touch the edge
    side += pad * 2
    pad_w, pad_h = (side - mark.size[0]) // 2, (side - mark.size[1]) // 2
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(mark, (pad_w, pad_h), mark)
    favicon_src = square.resize((512, 512), Image.LANCZOS)

    # 32px favicon stays transparent (browsers composite it themselves).
    favicon_32 = favicon_src.resize((32, 32), Image.LANCZOS)
    favicon_32.save(OUT / "favicon-32.png")
    print(f"wrote {(OUT / 'favicon-32.png').relative_to(ROOT)} (32x32)")

    # apple-touch-icon needs an opaque background — iOS fills transparent
    # PNGs with black otherwise.
    touch_bg = Image.new("RGBA", favicon_src.size, (255, 255, 255, 255))
    touch_icon = Image.alpha_composite(touch_bg, favicon_src).convert("RGB")
    touch_icon = touch_icon.resize((180, 180), Image.LANCZOS)
    touch_icon.save(OUT / "apple-touch-icon.png")
    print(f"wrote {(OUT / 'apple-touch-icon.png').relative_to(ROOT)} (180x180)")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Dev-only tool: process src/source/logo-original.png into the site's
logo assets. Not run as part of build.mjs and not part of the served site
— run manually (`python tools/logo.py`) whenever the source artwork
changes.

Technique (per client instruction, 2026-11-02): true color-to-alpha
(un-premultiply against a white matte), NOT a hard alpha threshold. The
source file already carries a rough alpha channel from an earlier pass,
so we first flatten it onto solid white (recovering the plain white-bg
image the client is looking at) and then run color-to-alpha against that
known white background — the standard GIMP-style algorithm: for each
channel, the "distance already diluted toward white" sets a per-channel
alpha estimate; the channel most diluted (closest to white) wins as the
pixel's true alpha, and the true (undiluted) color is solved back out
and clamped. This recovers correct semi-transparent edge pixels at
anti-aliased boundaries instead of leaving white fringes or hard-cut
noise.

The artwork itself (navy, orange, metallic strands, wordmark, tagline)
is never redrawn, recolored, re-typed or cropped — only its background
goes from white to transparent. The only crop this script performs is a
square "mark" (JB + bolt only, no cable swoosh) used solely for the
favicon / apple-touch-icon, which the client's instructions explicitly
allow.
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "source" / "logo-original.png"
OUT = ROOT / "src" / "images"

# Square favicon/apple-touch-icon crop: JB + bolt only (no cable swoosh,
# which disappears into noise at 16-32px). Measured against this source's
# 1495x1052 pixel grid — re-measure if the source file is ever replaced.
BOX_MARK = (610, 105, 1217, 660)

# Display height range given by the client (44-56px on mobile). We export
# 2x the top of that range so one raster covers both the mobile and the
# slightly larger desktop header size crisply.
DISPLAY_HEIGHT_CSS = 56
EXPORT_SCALE = 2


def color_to_alpha_against_white(rgb: np.ndarray) -> np.ndarray:
    """rgb: HxWx3 float array in 0..255, assumed composited on white.
    Returns HxWx4 float array (0..255) with recovered straight alpha."""
    rgb = rgb.astype(np.float64)
    # Per-channel alpha estimate: how far this channel already is from
    # white (255) relative to the full 0..255 range — a channel at 255
    # contributes 0 "evidence" of foreground, a channel at 0 contributes
    # full evidence (alpha=1 needed to explain a pure channel against a
    # white background with ANY true color).
    alpha_per_channel = 1.0 - (rgb / 255.0)
    alpha = np.max(alpha_per_channel, axis=2, keepdims=True)
    alpha_safe = np.clip(alpha, 1e-6, 1.0)
    # Recover true (undiluted) color: observed = a*true + (1-a)*255
    true_rgb = (rgb - (1 - alpha_safe) * 255.0) / alpha_safe
    true_rgb = np.clip(true_rgb, 0, 255)
    out = np.concatenate([true_rgb, alpha * 255.0], axis=2)
    return out


def trim(im: Image.Image) -> Image.Image:
    bbox = im.getbbox()
    return im.crop(bbox) if bbox else im


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"STOP: missing source file {SRC} — cannot proceed without it.")

    raw = Image.open(SRC).convert("RGBA")

    # Flatten onto solid white, recovering the plain white-background
    # image the color-to-alpha algorithm expects as input.
    white_bg = Image.new("RGBA", raw.size, (255, 255, 255, 255))
    flattened = Image.alpha_composite(white_bg, raw).convert("RGB")

    rgb_arr = np.array(flattened)
    rgba_out = color_to_alpha_against_white(rgb_arr)
    cutout = Image.fromarray(rgba_out.astype(np.uint8), "RGBA")

    full = trim(cutout)
    print(f"full logo (trimmed) size: {full.size}")

    # ---- Primary logo: full lockup incl. tagline, never cropped ----
    target_h = DISPLAY_HEIGHT_CSS * EXPORT_SCALE
    if full.height < target_h:
        print(f"WARNING: source height {full.height}px is smaller than the requested "
              f"2x export height {target_h}px — exporting at native resolution instead "
              f"of upscaling. Flag this to the client; a higher-res source may be needed.")
        logo_2x = full
    else:
        ratio = target_h / full.height
        logo_2x = full.resize((round(full.width * ratio), target_h), Image.LANCZOS)
    logo_1x = logo_2x.resize((round(logo_2x.width / 2), round(logo_2x.height / 2)), Image.LANCZOS)

    for im, suffix in [(logo_1x, ""), (logo_2x, "@2x")]:
        for fmt, kwargs in [("webp", dict(quality=95)), ("png", dict())]:
            path = OUT / f"logo{suffix}.{fmt}"
            im.save(path, **kwargs)
            print(f"wrote {path.relative_to(ROOT)} {im.size} ({path.stat().st_size // 1024}KB)")

    # ---- Favicon / apple-touch-icon source: JB + bolt mark only ----
    mark = trim(cutout.crop(BOX_MARK))
    side = max(mark.size) + 48  # breathing room so the glyph doesn't touch the edge
    pad_w, pad_h = (side - mark.size[0]) // 2, (side - mark.size[1]) // 2
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(mark, (pad_w, pad_h), mark)
    favicon_src = square.resize((512, 512), Image.LANCZOS)

    favicon_32 = favicon_src.resize((32, 32), Image.LANCZOS)
    favicon_32.save(OUT / "favicon-32.png")
    print(f"wrote {(OUT / 'favicon-32.png').relative_to(ROOT)} (32x32)")

    touch_bg = Image.new("RGBA", favicon_src.size, (255, 255, 255, 255))
    touch_icon = Image.alpha_composite(touch_bg, favicon_src).convert("RGB")
    touch_icon = touch_icon.resize((180, 180), Image.LANCZOS)
    touch_icon.save(OUT / "apple-touch-icon.png")
    print(f"wrote {(OUT / 'apple-touch-icon.png').relative_to(ROOT)} (180x180)")

    # ---- Diagnostic: composite on beige + graphite for halo inspection ----
    diag_dir = OUT.parent / "source"
    for bg_name, bg_color in [("beige", (245, 245, 220, 255)), ("graphite", (36, 40, 43, 255))]:
        bg = Image.new("RGBA", logo_2x.size, bg_color)
        comp = Image.alpha_composite(bg, logo_2x).convert("RGB")
        comp.save(diag_dir / f"logo-check-on-{bg_name}.png")
        print(f"wrote diagnostic {diag_dir.relative_to(ROOT) / f'logo-check-on-{bg_name}.png'}")


if __name__ == "__main__":
    main()

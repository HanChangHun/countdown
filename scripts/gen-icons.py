"""Generate Tauri app icons from the favicon.svg stopwatch design.

We don't have an SVG rasterizer (cairosvg/inkscape/magick) on this machine,
so we re-draw the favicon's geometry with Pillow at high supersampling and
downscale with LANCZOS for clean edges.

Small icon sizes (taskbar / titlebar, 16-32 px) use a BOLD profile: a thicker
ring and chunkier hands so the stopwatch stays legible instead of dissolving
into a thin smudge. Larger sizes use the faithful favicon proportions. Each
.ico entry is rendered natively at its own size (not downscaled from one
master) so every rung is crisp.
"""
import io
import os
import struct

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ICONS = os.path.join(HERE, "..", "app", "src-tauri", "icons")

BG_TOP = (0x30, 0x2b, 0x63)
BG_BOTTOM = (0x0f, 0x0c, 0x29)
WARM_LEFT = (0xf7, 0x79, 0x7d)
WARM_RIGHT = (0xfb, 0xd7, 0x86)


def vgrad(c0, c1, R):
    strip = Image.new("RGB", (1, R))
    px = strip.load()
    for y in range(R):
        t = y / (R - 1)
        px[0, y] = tuple(round(c0[i] + (c1[i] - c0[i]) * t) for i in range(3))
    return strip.resize((R, R))


def hgrad(c0, c1, R):
    strip = Image.new("RGB", (R, 1))
    px = strip.load()
    for x in range(R):
        t = x / (R - 1)
        px[x, 0] = tuple(round(c0[i] + (c1[i] - c0[i]) * t) for i in range(3))
    return strip.resize((R, R))


def disc(draw, cx, cy, r, fill):
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill)


def fat_line(draw, p0, p1, w, fill):
    draw.line([p0, p1], fill=fill, width=max(1, int(round(w))))
    r = w / 2.0
    disc(draw, p0[0], p0[1], r, fill)
    disc(draw, p1[0], p1[1], r, fill)


def render(px, bold=False):
    """Render the stopwatch icon at `px` x `px` with anti-aliasing."""
    ss = 8 if px <= 256 else 4
    R = px * ss

    def U(v):
        return v * R / 64.0

    if bold:
        rr, rw = 18.0, 5.4              # ring radius / stroke
        h12w, h4w, dotr = 4.6, 3.8, 3.0
        btn = (26.5, 8.0, 37.5, 13.5, 1.8)
        stem = (29.5, 12.5, 34.5, 17.5)
    else:
        rr, rw = 17.0, 3.2
        h12w, h4w, dotr = 2.6, 2.2, 1.9
        btn = (27, 9, 37, 14, 1.6)
        stem = (30, 13, 34, 17)

    cx, cy = U(32), U(37)
    k = rr / 17.0  # scale hands with the ring

    base = Image.new("RGBA", (R, R), (0, 0, 0, 0))

    # rounded-rect background with vertical gradient
    bg_mask = Image.new("L", (R, R), 0)
    ImageDraw.Draw(bg_mask).rounded_rectangle([0, 0, R - 1, R - 1], radius=U(14), fill=255)
    base.paste(vgrad(BG_TOP, BG_BOTTOM, R), (0, 0), bg_mask)

    # warm elements: ring + button + stem + 12 o'clock hand
    wm = Image.new("L", (R, R), 0)
    wd = ImageDraw.Draw(wm)
    disc(wd, cx, cy, U(rr) + U(rw) / 2, 255)
    disc(wd, cx, cy, U(rr) - U(rw) / 2, 0)
    wd.rounded_rectangle([U(btn[0]), U(btn[1]), U(btn[2]), U(btn[3])], radius=U(btn[4]), fill=255)
    wd.rectangle([U(stem[0]), U(stem[1]), U(stem[2]), U(stem[3])], fill=255)
    fat_line(wd, (cx, cy), (U(32), U(37 - 10 * k)), U(h12w), 255)
    base.paste(hgrad(WARM_LEFT, WARM_RIGHT, R), (0, 0), wm)

    # white elements: ~4 o'clock hand + center pivot
    white = Image.new("RGBA", (R, R), (0, 0, 0, 0))
    dw = ImageDraw.Draw(white)
    fat_line(dw, (cx, cy), (U(32 + 7.4 * k), U(37 + 3.5 * k)), U(h4w), (255, 255, 255, 210))
    disc(dw, cx, cy, U(dotr), (255, 255, 255, 255))
    base = Image.alpha_composite(base, white)

    return base.resize((px, px), Image.LANCZOS)


def write_ico(path, images):
    """Write a PNG-compressed multi-frame .ico by hand.

    Pillow's ICO writer ignores append_images and only downscales from the
    single base image, so it cannot embed our per-size (bold-small /
    faithful-large) renditions. We assemble the ICONDIR + PNG frames directly;
    Windows Vista+ reads PNG-compressed icon frames.
    """
    frames = []
    for im in images:
        buf = io.BytesIO()
        im.save(buf, format="PNG")
        frames.append((im.width, im.height, buf.getvalue()))
    header = struct.pack("<HHH", 0, 1, len(frames))      # reserved, type=1, count
    offset = 6 + 16 * len(frames)
    entries = b""
    blob = b""
    for w, h, data in frames:
        entries += struct.pack(
            "<BBBBHHII",
            w if w < 256 else 0,   # width  (0 means 256)
            h if h < 256 else 0,   # height (0 means 256)
            0, 0, 1, 32,           # palette, reserved, planes, bpp
            len(data), offset,
        )
        blob += data
        offset += len(data)
    with open(path, "wb") as f:
        f.write(header + entries + blob)


os.makedirs(ICONS, exist_ok=True)

# PNGs Tauri references (small one uses the bold profile)
render(32, bold=True).save(os.path.join(ICONS, "32x32.png"))
render(128).save(os.path.join(ICONS, "128x128.png"))
render(256).save(os.path.join(ICONS, "128x128@2x.png"))
render(1024).save(os.path.join(ICONS, "icon.png"))

# multi-size .ico: bold for the tiny rungs, faithful for the rest
ico_sizes = [16, 24, 32, 48, 64, 128, 256]
ico_imgs = [render(s, bold=(s < 48)) for s in ico_sizes]
ico_path = os.path.join(ICONS, "icon.ico")
write_ico(ico_path, ico_imgs)

# Fail loudly if any frame went missing (this regressed silently once already).
with Image.open(ico_path) as _chk:
    got = set(_chk.ico.sizes())
want = {(s, s) for s in ico_sizes}
if got != want:
    raise SystemExit(f"[gen-icons] icon.ico frames {sorted(got)} != {sorted(want)}")

print(f"[gen-icons] wrote icons to {os.path.normpath(ICONS)} ({len(ico_sizes)} ico frames)")

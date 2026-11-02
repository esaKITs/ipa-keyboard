#!/usr/bin/env python3
"""Build and audit the esaKITs IPA Keyboard icon v9.

No generative imagery is used. Every visible character is converted from
an actual font glyph into an SVG vector path; raster PNGs are derived
from that SVG. Exit nonzero on a failed symbol or output check.
"""
from collections import defaultdict
from pathlib import Path
import hashlib
import re

import cairosvg
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont
from lxml import etree
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "artwork/ipa-keyboard-icon-v9-source.svg"
OUTLINE = ROOT / "artwork/ipa-keyboard-icon-v9-outlined.svg"
SVG_NS = "http://www.w3.org/2000/svg"
NS = {"s": SVG_NS}
Q = lambda name: f"{{{SVG_NS}}}{name}"

CONSONANTS = {
    "370": "p b t d c ɟ k ɡ ʔ",
    "437": "m ɱ n ɲ ŋ",
    "504": "ɸ β f v θ ð s z ʃ ʒ ç ʝ x ɣ h ɦ",
    "571": "ʋ ɹ j ɰ",
    "638": "l ʎ ʟ",
}
VOWELS = {
    "356.5": "i y ɨ ʉ ɯ u",
    "442.5": "e ø ɘ ɵ ɤ o",
    "529.5": "ɛ œ ɜ ɞ ʌ ɔ",
    "616.5": "a ɶ ɑ ɒ",
    "491": "ə",
}

def load_font(path):
    if not path.exists():
        return None
    font = TTFont(str(path), fontNumber=0)
    return {
        "font": font,
        "cmap": font.getBestCmap(),
        "glyphs": font.getGlyphSet(),
        "units": font["head"].unitsPerEm,
        "hmtx": font["hmtx"].metrics,
        "path": str(path),
    }

ipa_fonts = [
    load_font(ROOT / "fonts/DoulosSIL-Regular.woff2"),
    load_font(Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")),
]
jp_fonts = [
    load_font(ROOT / "fonts/NotoSansJP-Bold.woff2"),
    load_font(Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc")),
]
latin_fonts = [
    load_font(Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")),
    load_font(ROOT / "fonts/NotoSansJP-Bold.woff2"),
]
for group in (ipa_fonts, jp_fonts, latin_fonts):
    group[:] = [f for f in group if f]
    if not group:
        raise RuntimeError("Missing font group")

parser = etree.XMLParser(resolve_entities=False, no_network=True)
tree = etree.parse(str(SOURCE), parser)
root = tree.getroot()
assert root.get("viewBox") == "0 0 1024 1024"
assert len(root.xpath(".//s:image", namespaces=NS)) == 0, "Raster image embedded in source"
texts = root.xpath(".//s:text", namespaces=NS)
assert len(texts) >= 75, f"Unexpectedly few source text nodes: {len(texts)}"
assert all(len(t) == 0 for t in texts), "Nested text/tspan not supported"

ipa_by_y = defaultdict(list)
for t in texts:
    if t.get("class") == "ipa":
        ipa_by_y[t.get("y")].append(t.text or "")
for y, symbols in {**CONSONANTS, **VOWELS}.items():
    got = " ".join(ipa_by_y[y])
    assert got == symbols, f"IPA row y={y}: expected {symbols!r}, got {got!r}"
assert sum(len(v.split()) for v in CONSONANTS.values()) == 37
assert sum(len(v.split()) for v in VOWELS.values()) == 23
assert (root.xpath(".//s:text[@x='448.95'][@y='504']", namespaces=NS)[0].text == "ʃ")
assert SOURCE.read_text(encoding="utf-8").count('fill="url(#selected)"') == 1

missing = []
path_count = 0
glyph_count = 0
for t in texts:
    value = t.text or ""
    cls = t.get("class", "")
    fonts = ipa_fonts if cls == "ipa" else (jp_fonts if cls == "jp" else latin_fonts)
    size = float(t.get("font-size"))
    x = float(t.get("x"))
    y = float(t.get("y"))
    letter_space = float(t.get("letter-spacing", "0"))
    glyph_items = []
    for char in value:
        font = next((f for f in fonts if ord(char) in f["cmap"]), None)
        if font is None:
            missing.append((value, char, [f["path"] for f in fonts]))
            continue
        name = font["cmap"][ord(char)]
        advance = font["hmtx"][name][0] * size / font["units"]
        glyph_items.append((font, name, advance))
    if missing:
        continue
    total = sum(item[2] for item in glyph_items) + max(0, len(glyph_items)-1)*letter_space
    # Keep the large lower title inside the frame without changing its baseline.
    shrink = min(1.0, (970-x)/total) if value == "IPA Keyboard" else 1.0
    total *= shrink
    anchor = t.get("text-anchor", "start")
    start = x - (total / 2 if anchor == "middle" else total if anchor == "end" else 0)
    group = etree.Element(Q("g"))
    group.set("data-label", value)
    group.set("fill", t.get("fill", "#000"))
    if t.get("opacity"):
        group.set("opacity", t.get("opacity"))
    cursor = start
    for font, name, advance in glyph_items:
        pen = SVGPathPen(font["glyphs"])
        font["glyphs"][name].draw(pen)
        d = pen.getCommands()
        if d:
            path = etree.SubElement(group, Q("path"))
            path.set("d", d)
            scale = size / font["units"] * shrink
            path.set("transform", f"translate({cursor:.5f} {y:.5f}) scale({scale:.8f} {-scale:.8f})")
            path_count += 1
        cursor += (advance + letter_space) * shrink
        glyph_count += 1
    t.getparent().replace(t, group)

assert not missing, f"Missing glyphs: {missing}"
assert path_count >= 130, f"Only {path_count} glyph outlines"
assert len(root.xpath(".//s:text", namespaces=NS)) == 0, "Unoutlined text"
for style in root.xpath(".//s:style", namespaces=NS):
    style.getparent().remove(style)
outline_bytes = etree.tostring(root, encoding="utf-8", xml_declaration=True)
assert b"http://raw.githubusercontent.com" not in outline_bytes
assert b"<text" not in outline_bytes
OUTLINE.write_bytes(outline_bytes)

images = {}
for size in (1024, 512, 256):
    target = ROOT / f"artwork/ipa-keyboard-icon-v9-{size}.png"
    cairosvg.svg2png(bytestring=outline_bytes, write_to=str(target), output_width=size, output_height=size)
    im = Image.open(target).convert("RGBA")
    assert im.size == (size, size)
    assert im.getbbox(), "Image is empty"
    images[size] = target
im = Image.open(images[1024]).convert("RGBA")
pixels = list(im.getdata())
orange = sum(1 for r,g,b,a in pixels if a > 220 and r>180 and 60<g<190 and b<100)
purple = sum(1 for r,g,b,a in pixels if a > 220 and 15<r<120 and b>r*0.7 and b>g)
white = sum(1 for r,g,b,a in pixels if a > 220 and min(r,g,b)>230)
assert orange>1500 and purple>1500 and white>1500, f"Color sanity failed: {orange},{purple},{white}"
checks = [
    "IPA consonants: 37 symbols, all mapped to expected place/manner row",
    "IPA vowels: 11 unrounded/rounded pairs + central schwa (23 symbols)",
    "Selected key: exactly one, symbol ʃ",
    f"Vector outlines: {path_count} paths from {glyph_count} font glyphs",
    "No raster overlays, remote fonts, or live text in final SVG",
    "PNG render: 1024, 512, 256 px; nonempty RGBA images",
    f"Color sanity: orange={orange}, purple={purple}, white={white}",
]
report = ROOT / "artwork/ipa-keyboard-icon-v9-validation.txt"
report.write_text("\n".join(checks + [
    "SVG SHA256: " + hashlib.sha256(outline_bytes).hexdigest(),
    *[f"PNG {s} SHA256: {hashlib.sha256(p.read_bytes()).hexdigest()}" for s,p in images.items()],
]) + "\n", encoding="utf-8")
print(report.read_text(encoding="utf-8"))

#!/usr/bin/env python3
"""Extract display-only mark outlines from the two bundled OFL fonts."""
import html,json,unicodedata
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
root=Path(__file__).resolve().parents[1]
chars=set('̥̬ʰ̹̜̟̠̩̯̈̽˞̤̰̼ʷʲˠˤ̴̝̞̘̙̪̺̻̃ⁿˡ̊̚')
chars.update(c for c in html.unescape((root/'chart.html').read_text()) if unicodedata.category(c).startswith('M'))
result={'license':'Glyph outlines extracted from the bundled SIL OFL 1.1 fonts; see fonts/OFL-DoulosSIL.txt and fonts/OFL-Andika.txt. Display assets, not additional Unicode characters.','fonts':{}}
for key,file in [('doulos','DoulosSIL-Regular.woff2'),('andika','Andika-Regular.woff2')]:
 f=TTFont(root/'fonts'/file);gs=f.getGlyphSet();cmap=f.getBestCmap();marks={}
 for c in sorted(chars):
  if ord(c) not in cmap:continue
  glyph=gs[cmap[ord(c)]];bounds=BoundsPen(gs);glyph.draw(bounds)
  if not bounds.bounds:continue
  pen=SVGPathPen(gs);glyph.draw(pen);marks[c]={'path':pen.getCommands(),'box':[round(n,3) for n in bounds.bounds]}
 result['fonts'][key]={'units':f['head'].unitsPerEm,'ascent':f['hhea'].ascent,'descent':-f['hhea'].descent,'marks':marks}
(root/'fonts/positioned-diacritics.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
print({k:len(v['marks']) for k,v in result['fonts'].items()})

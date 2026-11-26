"""Reproducible outline audit of installed fonts (fontTools + brotli)."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen
import json,hashlib
rows=[]
for family in ['DoulosSIL','Andika']:
 path=Path('fonts')/(family+'-Regular.woff2');f=TTFont(path);gs=f.getGlyphSet();cm=f.getBestCmap();units=f['head'].unitsPerEm
 def bounds(ch,size):
  p=BoundsPen(gs);gs[cm[ord(ch)]].draw(p);return [v*size/units for v in p.bounds]
 for ch,ref in [('ɓ','b'),('ɗ','d'),('ʍ','w'),('ɕ','s'),('ʑ','z')]:
  old=bounds(ch,80/3);new=bounds(ch,32);r=bounds(ref,32)
  rows.append({'font':family,'fontSHA256':hashlib.sha256(path.read_bytes()).hexdigest(),'symbol':ch,'reference':ref,'beforeInkBounds':old,'afterInkBounds':new,'referenceInkBounds':r,'scaleChange':1.2,'note':'Hooks and descenders retain native shape; compare body scale, not equal total glyph height.'})
Path('qa/evidence/phase2-20261126/optical-outline-audit.json').write_text(json.dumps(rows,indent=2,ensure_ascii=False));print('Measured',len(rows),'glyph/reference pairs from original font outlines')

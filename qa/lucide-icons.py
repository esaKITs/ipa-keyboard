from pathlib import Path
import re,subprocess,xml.etree.ElementTree as E
s=Path('index.html').read_text();base=subprocess.check_output(['git','show','a36784b55bbcc5f0008b88afb2bbbbdc48c49b6f:index.html']).decode()
ids={'back':'delete','settingsToggle':'settings','clear':'trash','copy':'copy','undo':'undo-2','redo':'redo-2'}
restored=s
for button,icon in ids.items():
 pat=r'(<button\b[^>]*id="'+button+r'"[^>]*>)(.*?)(</button>)'
 old=re.search(pat,base,re.S);new=re.search(pat,s,re.S);assert old[1]==new[1]
 a=E.fromstring(new[2]);b=E.fromstring(Path('third_party/lucide/icons/'+icon+'.svg').read_text())
 assert [(x.tag,x.attrib) for x in a]==[(x.tag,x.attrib) for x in b]
 assert a.get('aria-hidden')=='true' and a.get('focusable')=='false'
 restored=re.sub(pat,lambda m:m[1]+old[2]+m[3],restored,count=1,flags=re.S)
restored=re.sub(r'<!-- Lucide SVG icons: pinned at .*?-->\n','',restored,count=1,flags=re.S)
assert restored==base,'Only six SVGs and their license notice may differ'
assert Path('third_party/lucide/LICENSE').read_text() in s
print('PASS SOURCE: only six official SVGs plus license; all button attributes, CSS and JS unchanged')

"""Extract source-decimal PDF paths; no screenshot tracing or anisotropic fit.
Requires pypdf. Usage: python qa/extract-official-vowels.py official.pdf fixture.json
"""
from decimal import Decimal as D
from pypdf import PdfReader
from pypdf.generic import ContentStream
from pathlib import Path
import sys,json,hashlib,math
pdf=Path(sys.argv[1]);reader=PdfReader(pdf);height=D(str(reader.pages[0].mediabox.height));paths=[]
identity=(D(1),D(0),D(0),D(1),D(0),D(0))
def multiply(a,b):
 return (a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5])
def walk(stream,res,matrix=identity,width=D('.25')):
 stack=[];path=[];m=matrix
 def point(x,y):
  x,y=D(str(x)),D(str(y));return [str(m[0]*x+m[2]*y+m[4]),str(height-(m[1]*x+m[3]*y+m[5]))]
 for args,op in ContentStream(stream,reader).operations:
  if op==b'q':stack.append((m,width))
  elif op==b'Q':
   if stack:m,width=stack.pop()
  elif op==b'cm':m=multiply(m,tuple(D(str(x)) for x in args))
  elif op==b'w':width=D(str(args[0]))
  elif op==b'Do':
   obj=res.get('/XObject',{}).get(args[0]);obj=obj.get_object() if obj else None
   if obj and obj.get('/Subtype')=='/Form':walk(obj,obj.get('/Resources',res),multiply(m,tuple(D(str(x)) for x in obj.get('/Matrix',identity))),width)
  elif op in [b'm',b'l',b'c']:
   path.append([op.decode().upper(),*[point(*args[i:i+2]) for i in range(0,len(args),2)]])
  elif op==b'h':path.append(['Z'])
  elif op in [b'S',b's',b'f',b'f*',b'F',b'B',b'B*',b'n']:
   ps=[p for seg in path for p in seg[1:]]
   if ps:
    xs=[D(p[0]) for p in ps];ys=[D(p[1]) for p in ps];x0,x1,y0,y1=min(xs),max(xs),min(ys),max(ys)
    if D(370)<x0 and x1<D(540) and D(280)<y0 and y1<D(410):
     if op in [b'S',b's'] and width==D('.25') and all(x[0] in ['M','L'] for x in path):paths.append({'kind':'rule','path':path,'width':str(width)})
     elif op in [b'f',b'f*',b'F'] and D(4)<x1-x0<D(5) and D(4)<y1-y0<D(5):paths.append({'kind':'dot','path':path,'center':[str((x0+x1)/2),str((y0+y1)/2)]})
   path=[]
  elif op==b're':path=[]
walk(reader.pages[0].get_contents(),reader.pages[0]['/Resources'])
rules=[p for p in paths if p['kind']=='rule'];dots=[p for p in paths if p['kind']=='dot'];assert len(rules)==7,(len(rules),len(dots));assert len(dots)==11
# Fix identities by source ordering, cross-checked against PDF drawing IDs.
for rule,i in zip(rules,['36','37','38','39','40','97','98']):rule['id']=i
left=rules[5]['path'];right=rules[6]['path'];tl=[float(x) for x in left[0][1]];bl=[float(x) for x in left[1][1]];br=[float(x) for x in right[0][1]];tr=[float(x) for x in right[1][1]]
length=lambda a,b:math.dist(a,b)
def angle(a,b,c):
 u=[a[i]-b[i] for i in range(2)];v=[c[i]-b[i] for i in range(2)];return math.degrees(math.acos(sum(x*y for x,y in zip(u,v))/math.hypot(*u)/math.hypot(*v)))
vertices=[tl,tr,br,bl];top=length(tl,tr)
result={'source':pdf.name,'sha256':hashlib.sha256(pdf.read_bytes()).hexdigest(),'coordinateSystem':'PDF decimal coordinates, top-left origin, points','license':'International Phonetic Association, CC BY-SA 4.0','rules':rules,'dots':dots,'vertices':vertices,'normalizedLengths':{'top':100,'bottom':100*length(bl,br)/top,'right':100*length(tr,br)/top,'left':100*length(tl,bl)/top},'angles':[angle(vertices[i-1],vertices[i],vertices[(i+1)%4]) for i in range(4)],'projection':{'origin':[str(tl[0]),str(tl[1])],'topWidth':str(D(right[1][1][0])-D(left[0][1][0])),'svgOrigin':[143.153,26.843],'svgTopWidth':307.5}}
Path(sys.argv[2]).write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps({k:result[k] for k in ['sha256','vertices','normalizedLengths','angles','projection']},indent=2))

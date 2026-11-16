#!/usr/bin/env python3
"""Export the editable translation master sheet to the app's single CSV catalog."""
import argparse,csv,io,posixpath,sys,zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

NS={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
HEADERS=['id','scope','ja','en','fa','pt_BR','ja_osaka','source','status']
def export(path):
 with zipfile.ZipFile(path) as z:
  shared=[]
  if 'xl/sharedStrings.xml' in z.namelist():shared=[''.join(n.itertext()) for n in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si',NS)]
  book=ET.fromstring(z.read('xl/workbook.xml'));sheet=next((s for s in book.findall('s:sheets/s:sheet',NS) if s.get('name')=='翻訳マスター'),None)
  if sheet is None:raise ValueError('翻訳マスター sheet is missing')
  rid=sheet.get('{'+NS['r']+'}id');rels=ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
  target=next(r.get('Target') for r in rels if r.get('Id')==rid)
  target=target.lstrip('/') if target.startswith('/') else posixpath.normpath('xl/'+target)
  root=ET.fromstring(z.read(target));rows=[];header=False;seen=set();keys=set()
  for row in root.findall('s:sheetData/s:row',NS):
   values={};formulas=set()
   for c in row.findall('s:c',NS):
    col=''.join(ch for ch in c.get('r','') if ch.isalpha());v=c.find('s:v',NS)
    if c.find('s:f',NS) is not None:formulas.add(col)
    if c.get('t')=='s':text=shared[int(v.text)] if v is not None else ''
    elif c.get('t')=='inlineStr':text=''.join(n.text or '' for n in c.findall('s:is//s:t',NS))
    else:text=v.text if v is not None and v.text else ''
    # Literal leading '=' strings may carry Excel's quote prefix in text.
    if text.startswith("'="):text=text[1:]
    values[col]=text
   cells=[values.get(chr(65+i),'') for i in range(len(HEADERS))]
   if cells[:2]==['id','scope']:
    if cells!=HEADERS:raise ValueError('Translation header columns changed')
    header=True;continue
   if not header or not any(cells):continue
   if formulas.intersection('ABCDEFGHI'):raise ValueError('Translation rows must contain literal text, not formulas')
   item=dict(zip(HEADERS,cells));ident=item['id'];scopes=item['scope'].split()
   if not ident or ident in seen or not item['ja'].strip():raise ValueError('Missing or duplicate translation id / Japanese key: '+ident)
   if not scopes or set(scopes)-{'ui','chart','panel'} or len(scopes)!=len(set(scopes)):raise ValueError('Invalid scopes for '+ident)
   seen.add(ident)
   for scope in scopes:
    key=(scope,item['ja'].strip())
    if key in keys:raise ValueError('Duplicate Japanese key within scope: '+repr(key))
    keys.add(key)
   rows.append(cells)
  if not header or not rows:raise ValueError('Empty translation master')
  out=io.StringIO(newline='');writer=csv.writer(out,quoting=csv.QUOTE_ALL,lineterminator='\r\n');writer.writerow(HEADERS);writer.writerows(rows)
  return out.getvalue().encode('utf-8'),len(rows)

if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('workbook',type=Path);parser.add_argument('csv',type=Path);parser.add_argument('--check',action='store_true');args=parser.parse_args()
 try:
  payload,count=export(args.workbook)
  if args.check:
   if not args.csv.exists() or args.csv.read_bytes()!=payload:raise ValueError('Excel and CSV differ; regenerate translations.csv before publishing')
  else:args.csv.write_bytes(payload)
  print(f'Translation master: {count} rows; '+('Excel/CSV match' if args.check else 'CSV exported'))
 except (ValueError,KeyError,StopIteration,zipfile.BadZipFile) as e:print(str(e),file=sys.stderr);sys.exit(1)

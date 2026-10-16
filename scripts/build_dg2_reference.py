#!/usr/bin/env python3
"""Rebuild the DG2 catalog from AFMAN 24-604, 6 June 2025 (Table A4.1).

Development-only dependency: pdfplumber. The web app uses the checked-in JSON.
Usage: python scripts/build_dg2_reference.py /path/to/afman24-604.pdf
"""
import argparse, collections, hashlib, json, re
from pathlib import Path
import pdfplumber
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('pdf')
parser.add_argument('--output', default='src/Components/Cmos/afmanDg2Catalog.json')
args=parser.parse_args()
records=[]
def lines(ws):
 groups=[]
 for w in sorted(ws,key=lambda w:(round(w['top']/2)*2,w['x0'])):
  if groups and abs(groups[-1][0]-w['top'])<2:groups[-1][1].append(w)
  else:groups.append([w['top'],[w]])
 return groups
with pdfplumber.open(args.pdf) as pdf:
 for pi in range(103,231):
  p=pdf.pages[pi].dedupe_chars(); words=p.extract_words(x_tolerance=1.5,y_tolerance=2,extra_attrs=['fontname'])
  marks=[]
  for i in range(1,9):
   hits=[w for w in words if w['text']==f'({i})' and w['top']<145]
   if not hits:break
   w=hits[0];cx=(w['x0']+w['x1'])/2;cy=(w['top']+w['bottom'])/2
   rs=[r for r in p.rects if r['x0']<=cx<=r['x1'] and r['top']<=cy<=r['bottom'] and r['height']>7 and r['width']>5]
   if not rs:break
   marks.append(max(rs,key=lambda r:r['width']))
  if len(marks)!=8:continue
  box=marks[1]
  codeWords=[w for w in words if box['x0']-.3<=w['x0']<box['x1']-.3 and w['top']>box['bottom'] and w['top']<755]
  starts=[]
  for y,ws in lines(codeWords):
   code=re.sub(r'\s','', ''.join(w['text'] for w in ws))
   if re.fullmatch(r'(UN|NA|ID)\d{4}',code):starts.append((y,code))
  for index,(y,code) in enumerate(starts):
   end=starts[index+1][0]-.3 if index+1<len(starts) else 755
   boundaries=[r['top'] for r in p.rects if r['height']<1 and abs(r['x0']-marks[2]['x0'])<.6 and r['width']>=marks[2]['width']-.6 and r['top']>y+7]
   if boundaries:end=min(end,min(boundaries))
   vals=[]
   for c in marks:
    ws=[w for w in words if c['x0']-.3<=w['x0']<c['x1']-.3 and y-.3<=w['top']<end]
    vals.append([' '.join(w['text'] for w in group) for _,group in lines(ws)])
   name=' '.join(vals[2]); pg=vals[5]
   pg_y=[ly for ly,_ in lines([w for w in words if marks[5]['x0']-.3<=w['x0']<marks[5]['x1']-.3 and y-.3<=w['top']<end])]
   if not name:continue
   # Rows with several packing groups are separate selectable regulatory variants.
   count=len(pg) if len(pg)>1 and all(re.fullmatch(r'I{1,3}',x) for x in pg) else 1
   for gi in range(count):
    def value(col):
     a=vals[col]
     if count>1 and col>=3 and col<=7 and len(a)>1:
      lo=pg_y[gi]-.3;hi=pg_y[gi+1]-.3 if gi+1<count else end
      c=marks[col]
      ws=[w for w in words if c['x0']-.3<=w['x0']<c['x1']-.3 and lo<=w['top']<hi]
      return ' '.join(w['text'] for _,group in lines(ws) for w in group)
     return ' '.join(a)
    records.append({'unId':code,'name':name,'division':value(3),'subsidiary':value(4),'packingGroup':value(5),'specialProvisions':value(6),'packingPara':value(7),'sym':value(0),'page':pi+1})
  if pi%20==0: print(pi+1,len(records),flush=True)

rows=records
entries=[];counts=collections.Counter();seen=set()
for row in rows:
 row={k:re.sub(r'\s+',' ',v).replace(' ,',',').strip() if isinstance(v,str) else v for k,v in row.items()}
 row['division']=row['division'].replace(' ','')
 row['specialProvisions']=row['specialProvisions'].strip(' ,')
 row['sym']=row['sym'].replace('\uf0ab','★')
 row['packingPara']=re.sub(r'(A\d+\.\d+)(?=,|$)',r'\1.',row['packingPara'])
 row['forbidden']='FORBIDDEN' in row['packingPara'].upper()
 row['referenceOnly']=not row['packingPara'] or (not row['forbidden'] and (not re.fullmatch(r'[1-9](?:\.\d[A-Z]?)?',row['division']) or row['packingGroup'] not in ['','I','II','III']))
 if not row['forbidden'] and (not re.fullmatch(r'(?:[1-9](?:\.\d)?(?:, ?[1-9](?:\.\d)?)*)?',row['subsidiary']) or not re.fullmatch(r'(?:[APN]?\d+[a-z]?(?:, ?[APN]?\d+[a-z]?)*)?',row['specialProvisions']) or len(set(re.findall(r'\bP[1-5]\b',row['specialProvisions'])))>1):row['referenceOnly']=True
 signature=json.dumps({k:v for k,v in row.items() if k!='page'},sort_keys=True)
 if signature in seen:continue
 seen.add(signature);counts[row['unId']]+=1
 row={'id':row['unId']+(f'-{counts[row["unId"]]}' if counts[row['unId']]>1 else ''), **row}
 entries.append(row)
output={'source':{'title':'AFMAN 24-604, 6 June 2025, Table A4.1','url':'https://static.e-publishing.af.mil/production/1/af_a4/publication/afman24-604/afman24-604.pdf','mirrorUrl':'https://www.jgatraining.com/vs-uploads/pdfs/1768239197_2_-AFMAN-24-604-Effective-06_06_25.pdf','pdfSha256':hashlib.sha256(Path(args.pdf).read_bytes()).hexdigest(),'extractedPages':[104,231]},'entries':entries}
Path(args.output).write_text(json.dumps(output,indent=2,ensure_ascii=False)+'\n')
print('Entries',len(entries),'UN/NA codes',len(counts),'reference-only',sum(x['referenceOnly'] for x in entries),'forbidden',sum(x['forbidden'] for x in entries))

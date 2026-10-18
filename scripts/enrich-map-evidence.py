"""Conservative enrichment: unique operator identifier AND <=25m spatial agreement.
Run after prepare-producers-stations.py. Originals and field-level sources retained.
"""
import json,math,collections,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
read=lambda p:json.loads((root/p).read_text())
index=collections.defaultdict(list)
metadata=read('public/data/operator-stations/metadata.json')
for path in (root/'public/data/operator-stations').glob('liander-*.geojson'):
 for f in json.loads(path.read_text())['features']:index[f['properties']['operatorAssetId']].append(f)
audit={'method':'Unique exact OSM ref:liander = Liander operator asset ID; distance <=25 metres. Missing fields only; original values retained. Names are source labels, not independent verification.','datasets':{}}
for kind in ['stations','producers']:
 data=read(f'public/data/{kind}.geojson');raw=read(f'research/raw/osm-{kind}.json');tags={e['type']+'/'+str(e['id']):e.get('tags',{}) for e in raw['elements']};counts=collections.Counter();matches=[]
 for f in data['features']:
  p=f['properties'];t=tags[p['id']]
  if p.get('enrichment'):
   for k,v in p['enrichment']['original'].items():p[k]=v
   del p['enrichment']
  p['nameMissing']=not any(t.get(k) for k in ['name','ref','official_name','name:nl','loc_name'])
  p['evidence'].update({k:t[k] for k in ['power','generator:source','plant:source','official_name','name:nl','loc_name','alt_name'] if t.get(k)})
  if p['name'].startswith('Unnamed'):
   counts['unnamedBefore']+=1
   for k in ['official_name','name:nl','loc_name']:
    if t.get(k):p['name']=t[k];p['enrichment']={'method':'Additional name tag in original OSM snapshot','original':{'name':'Unnamed station' if kind=='stations' else 'Unnamed generating site'},'fields':{'name':{'value':t[k],'source':'OpenStreetMap · '+k,'url':p['sourceUrl']}},'distanceMetres':None};counts['namesFromOriginalTags']+=1;break
  candidates=index.get(t.get('ref:liander'),[]) if kind=='stations' else []
  if len(candidates)==1:
   other=candidates[0];q=other['properties'];a,b=f['geometry']['coordinates'],other['geometry']['coordinates'];distance=math.hypot((a[0]-b[0])*111320*math.cos(math.radians(a[1])),(a[1]-b[1])*111320)
   if distance<=25 and p['operator'] in ['Not tagged','Liander']:
    fields={};original={}
    for k in ['name','operator','voltage']:
     missing=p[k].startswith('Unnamed') if k=='name' else p[k]=='Not tagged'
     if missing and q[k] and q[k]!='Not tagged':original[k]=p[k];p[k]=q[k];fields[k]={'value':q[k],'source':'Liander operator GIS','url':q['sourceUrl']};counts[k+'Filled']+=1
    if fields:p['enrichment']={'method':'Exact ref:liander / operator asset ID match, unique in imported Liander layers; location cross-check within 25 m.','assetId':q['operatorAssetId'],'datasetKey':q['datasetKey'],'sourceObjectId':q['sourceObjectId'],'distanceMetres':round(distance,2),'original':original,'fields':fields};matches.append({'osmId':p['id'],'operatorId':q['operatorAssetId'],'distanceMetres':round(distance,2),'fields':list(fields)});p['nameMissing']=p['name'].startswith('Unnamed')
   else:counts['rejectedIdentifierMatches']+=1
  if p['name'].startswith('Unnamed'):counts['unnamedAfter']+=1
  counts['withSourceLink']+=bool(p.get('sourceUrl'));counts['withSnapshot']+=bool(p.get('snapshotAt'))
 (root/f'public/data/{kind}.geojson').write_text(json.dumps(data,separators=(',',':'),ensure_ascii=False))
 for prefix in ['data','public/data']:
  path=root/f'{prefix}/{kind}-meta.json';meta=json.loads(path.read_text());meta['enrichmentAudit']='/data/map-evidence-audit.json';meta['fieldCoverage']['nameOrReference']=sum(not f['properties']['name'].startswith('Unnamed') for f in data['features']);meta['fieldCoverage']['operator']=sum(f['properties']['operator']!='Not tagged' for f in data['features']);
  meta['fieldCoverage']['additionalEvidence']=sum(bool(f['properties']['evidence']) for f in data['features'])
  if kind=='stations':meta['fieldCoverage']['voltage']=sum(f['properties']['voltage']!='Not tagged' for f in data['features'])
  path.write_text(json.dumps(meta,indent=2))
 audit['datasets'][kind]={'counts':dict(counts),'matches':matches}
(root/'public/data/map-evidence-audit.json').write_text(json.dumps(audit,indent=2));print({k:v['counts'] for k,v in audit['datasets'].items()})

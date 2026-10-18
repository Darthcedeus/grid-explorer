"""Join year-matched public CBS statistics and PDOK geometry, preserving nulls.
Requires Python with shapely==2.1.2. Raw inputs and request hashes are in research/raw.
Large gzip archives are byte-split into ordered .partNN files for source hosting.
Re-fetch each exact URL in its *-request.json, preserving bytes and retrieval time.
Do not map old GM codes onto current boundaries or sum geographic levels.
"""
import json,gzip,pathlib,hashlib,collections
import shapely
from shapely.geometry import shape,mapping
root=pathlib.Path(__file__).resolve().parents[1];raw=root/'research/raw'
def read(name):
 p=raw/(name+'.json.gz');compressed=p.read_bytes() if p.exists() else b''.join(x.read_bytes() for x in sorted(raw.glob(name+'.json.gz.part*')));b=gzip.decompress(compressed);m=json.loads((raw/(name+'-request.json')).read_text());assert hashlib.sha256(b).hexdigest()==m['sha256'];return json.loads(b),m
house,hm=read('households-2025');solar,sm=read('solar-2025');geo,gm=read('municipalities-2025')
h={r['WijkenEnBuurten'].strip():r for r in house['value']};assert len(h)==len(house['value'])==342
s={r['RegioS'].strip():r for r in solar['value']};assert len(s)==len(solar['value'])
assert all(r['Woningkenmerken']=='T001100' and r['Codering_3'].strip()==k for k,r in h.items())
assert all(r['SectorEnVermogensklasse']=='E007161' and r['Perioden']=='2025JJ00' for r in s.values())
land=[f for f in geo['features'] if f['properties']['water']=='NEE'];assert len(land)==342
assert {f['properties']['gemeentecode'] for f in land}==set(h)
geometries=[shape(f['geometry']) for f in land];assert all(g.is_valid for g in geometries)
coverage=bool(shapely.coverage_is_valid(geometries));print('Valid polygon coverage',coverage,flush=True)
assert coverage,'Resolve overlapping municipality geometries before simplifying'
simplified=shapely.coverage_simplify(geometries,.00015);assert all(g.is_valid for g in simplified)
def numeric(v,scale=1):return v/scale if isinstance(v,(int,float)) and v>=0 else None
def rounded(c):return [rounded(x) for x in c] if isinstance(c,(list,tuple)) else round(c,6)
out=[]
for f,g in zip(land,simplified):
 a=f['properties'];code=a['gemeentecode'];assert a['jaar']==2025
 r=h[code];t=s.get(code,{});p={'code':code,'name':a['gemeentenaam'],'year':2025,'deliveryKwh':numeric(r['GemiddeldeElektriciteitslevering_5']),'netDeliveryKwh':numeric(r['GemiddeldeNettoElektriciteitslevering_6']),'solarMwp':numeric(t.get('OpgesteldVermogenVanZonnepanelen_2'),1000),'inverterMw':numeric(t.get('OpgesteldVermogenOmvormers_3'),1000),'installations':numeric(t.get('Installaties_1'))}
 geometry=mapping(g);geometry={'type':'MultiPolygon','coordinates':geometry['coordinates'] if geometry['type']=='MultiPolygon' else [geometry['coordinates']]};assert shape(geometry).is_valid
 out.append({'type':'Feature','id':code,'properties':p,'geometry':geometry})
out.sort(key=lambda f:f['properties']['name'])
meta={'year':2025,'municipalities':len(out),'retrievals':{'households':hm,'solar':sm,'geometry':gm},'tables':{'households':'86333NED','solar':'85005NED'},'categories':{'households':'T001100','solar':'E007161'},'status':{'households':'preliminary','solar':'revised preliminary'},'publishedCounts':{k:sum(f['properties'][k] is not None for f in out) for k in ['deliveryKwh','netDeliveryKwh','solarMwp','inverterMw','installations']},'solarCodesExcludedFromMap':[k for k in s if k.startswith('GM') and k not in h],'geometry':'2025 land features (water=NEE); water polygons and Buitenland excluded. Coverage-preserving simplification, 0.00015 degrees; full coordinate precision retained. Display boundaries, not cadastral precision. Shapely 2.1.2.','units':{'deliveryKwh':'kWh per dwelling per year','netDeliveryKwh':'kWh per dwelling per year','solarMwp':'MWp (source kWp / 1000)','inverterMw':'MW (source kW / 1000)','installations':'count'},'scope':'Households: mean private-dwelling grid delivery, excluding common-building supplies and self-consumed generation. Net delivery after feed-in has a zero floor; the difference cannot always measure exports. Solar: year-end stock for homes and businesses, not live output; municipality production unavailable. Values are never added across units or to OSM capacities.','licenses':{'statistics':'CBS attribution','geometry':'CC0 https://creativecommons.org/publicdomain/zero/1.0/'},'transformVersion':'municipalities/1.0'}
(root/'public/data/municipalities-2025.geojson').write_text(json.dumps({'type':'FeatureCollection','features':out},ensure_ascii=False,separators=(',',':')))
for folder in ['data','public/data']:(root/folder/'municipalities-meta.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2))
print('Municipalities',len(out),'published',meta['publishedCounts'],'bytes',(root/'public/data/municipalities-2025.geojson').stat().st_size)

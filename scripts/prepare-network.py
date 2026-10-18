"""Derive a separate ODbL infrastructure layer; never infer electrical topology."""
import json, pathlib, hashlib, collections, datetime
root=pathlib.Path(__file__).resolve().parents[1]
p=root/'research/raw/osm-transmission.json';raw=json.loads(p.read_text());features=[];excluded=collections.Counter()
for e in raw['elements']:
 t=e.get('tags',{})
 if t.get('line') in ['bay','busbar','substation']:
  excluded['internal_wiring']+=1;continue
 voltages=[int(v) for v in t.get('voltage','').split(';') if v.strip().isdigit()]
 if not set(voltages)&{110000,150000,220000,380000}:excluded['voltage']+=1;continue
 kind=t['power'];id=f"{e['type']}/{e['id']}"
 if kind=='substation':
  if e['type']=='node':point=[e['lon'],e['lat']];quality='Mapped point'
  else:
   b=e.get('bounds')
   if not b:excluded['no_bounds']+=1;continue
   point=[(b['minlon']+b['maxlon'])/2,(b['minlat']+b['maxlat'])/2];quality='Bounding-box centre of mapped site; not a connection point'
  geometry={'type':'Point','coordinates':point}
 else:
  coords=[[n['lon'],n['lat']] for n in e.get('geometry',[]) if n]
  if len(coords)<2:excluded['no_geometry']+=1;continue
  geometry={'type':'LineString','coordinates':coords};quality='Community-mapped way geometry; not a surveyed electrical model'
 # European interconnected-system scope, retaining full cross-border ways touching NL.
 coords=[geometry['coordinates']] if kind=='substation' else geometry['coordinates']
 if not any(2<x<8 and 50<y<55 for x,y in coords):excluded['outside_scope']+=1;continue
 props={'id':id,'name':t.get('name') or t.get('ref') or ('Unnamed substation' if kind=='substation' else 'Unnamed line section'), 'kind':kind,'voltageKv':max(set(voltages)&{110000,150000,220000,380000})/1000,'voltageLabel':' / '.join(str(v//1000) for v in sorted(set(voltages),reverse=True))+' kV','operator':t.get('operator','Not tagged'),'sourceUrl':'https://www.openstreetmap.org/'+id,'locationQuality':quality,'ref':t.get('ref','')}
 features.append({'type':'Feature','properties':props,'geometry':geometry})
meta={'source':'OpenStreetMap contributors','sourceUrl':'https://www.openstreetmap.org/copyright','license':'ODbL 1.0','licenseUrl':'https://opendatacommons.org/licenses/odbl/1-0/','snapshotAt':raw['osm3s']['timestamp_osm_base'],'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'counts':dict(collections.Counter(f['properties']['kind'] for f in features)),'excluded':dict(excluded),'rawSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'scope':'OSM ways and substations tagged with 110, 150, 220 or 380 kV intersecting Netherlands query area; incomplete and not operator-verified. Whole cross-border ways may extend outside NL. Internal bays/busbars excluded. Counts are OSM objects, not distinct circuits or physical sites.'}
(root/'public/data/network.geojson').write_text(json.dumps({'type':'FeatureCollection','features':features},separators=(',',':'),ensure_ascii=False))
(root/'data/network-meta.json').write_text(json.dumps(meta,indent=2));(root/'public/data/network-meta.json').write_text(json.dumps(meta,indent=2))
(root/'public/data/network-LICENSE.txt').write_text('© OpenStreetMap contributors. This derived infrastructure database is available under ODbL 1.0: https://opendatacommons.org/licenses/odbl/1-0/\nSource and query: see the project research/overpass-query.txt and rawSha256 in network-meta.json.\nDownload the derived database: network.geojson. Other app datasets are separate databases with their own licenses.\n')
print(json.dumps(meta))

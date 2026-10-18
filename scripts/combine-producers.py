"""Clip bounding-box OSM extracts to PDOK province polygons, preserving object IDs."""
import json,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
polys=[p for f in json.loads((root/'public/data/provinces.geojson').read_text())['features'] for p in f['geometry']['coordinates']]
def ring(x,y,r):
 inside=False
 for a,b in zip(r,r[1:]+r[:1]):
  if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:inside=not inside
 return inside
bounds=[(min(a[0] for a in p[0]),min(a[1] for a in p[0]),max(a[0] for a in p[0]),max(a[1] for a in p[0]),p) for p in polys]
def within(x,y):
 return any(lo<=x<=hi and bot<=y<=top and ring(x,y,p[0]) and not any(ring(x,y,h) for h in p[1:]) for lo,bot,hi,top,p in bounds)
items={};snapshots=[];excluded=0
for name in ['solar-ways','wind']:
 if not (root/f'research/raw/osm-{name}.json').exists():continue
 d=json.loads((root/f'research/raw/osm-{name}.json').read_text());snapshots.append(d['osm3s']['timestamp_osm_base'])
 for e in d['elements']:
  if name=='wind' and e.get('tags',{}).get('power')!='generator':continue
  c=e if e['type']=='node' else e.get('center',{})
  if 'lon' in c and within(c['lon'],c['lat']):items[(e['type'],e['id'])]=e
  else:excluded+=1
out={'osm3s':{'timestamp_osm_base':min(snapshots)},'sourceSnapshots':snapshots,'geographicFilter':'Representative point within PDOK province polygons; offshore outside polygons excluded. Bounding-box centre can exclude boundary-straddling plants.','excludedOutsideProvincePolygons':excluded,'elements':list(items.values())}
(root/'research/raw/osm-producers.json').write_text(json.dumps(out));print('Producer records in province boundaries:',len(items),'excluded',excluded)

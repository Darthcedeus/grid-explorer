"""Reproducible local preparation from downloaded public-source bytes."""
import csv,json,hashlib,pathlib,datetime
from display_geometry import display_geometry
root=pathlib.Path(__file__).resolve().parents[1]
raw=root/'research/raw';data=root/'data';pub=root/'public/data'
data.mkdir(exist_ok=True);pub.mkdir(parents=True,exist_ok=True)
def save(p,d):p.write_text(json.dumps(d,ensure_ascii=False,separators=(',',':')))
rows=[x for x in csv.DictReader((raw/'wri.csv').open()) if x['country']=='NLD' and 50<float(x['latitude'])<55]
assets=[]
for x in rows:
 fuel=x['primary_fuel'];tech='Offshore wind' if x['name'] in ['Gemini','Luchterduinen','Princess Amalia','Egmond aan Zee'] else ('Onshore wind' if fuel=='Wind' else fuel)
 assets.append(dict(id=x['gppd_idnr'],name=x['name'].strip(),technology=tech,capacityMw=float(x['capacity_mw']),lat=float(x['latitude']),lon=float(x['longitude']),operator=x['owner'] or 'Not verified',source='WRI Global Power Plant Database',sourceUrl='https://github.com/wri/global-power-plant-database',upstreamUrl=x['url'],registryVersion='1.3.0 / maintenance ended 2022',status='Historical record — current operation unverified',locationQuality='Historical registry coordinate; not independently surveyed',capacityQuality='Historical registry value; current capacity unverified',nedPoint={'Luchterduinen':28,'Princess Amalia':29,'Egmond aan Zee':30,'Gemini':31}.get(x['name'])))
for name,cap,lat,lon,operator,url,point in [
 ('Hollandse Kust Zuid',1529,52.32,4.1,'Vattenfall (operator page)','https://www.vattenfall.nl/over-vattenfall/onze-parken/onze-windparken/windpark-hollandse-kust-zuid/',35),
 ('Borssele I & II',752,51.70,3.0,'Ørsted (operator page)','https://orsted.nl/wind-op-zee/borssele-1-en-2',33)]:
 assets.append(dict(id='operator-'+str(point),name=name,technology='Offshore wind',capacityMw=cap,lat=lat,lon=lon,operator=operator,source='Operator factsheet',sourceUrl=url,upstreamUrl=url,registryVersion='Reviewed 2026-09-18',status='Operational per operator page',locationQuality='Approximate display centre inferred from published offshore area; not a connection point',capacityQuality='Operator-stated nameplate; net export capacity may differ',nedPoint=point))
assets.sort(key=lambda x:x['capacityMw'],reverse=True)
save(data/'assets.json',assets);save(pub/'assets.json',assets)
with (root/'research/netherlands-assets.csv').open('w') as f:
 w=csv.DictWriter(f,fieldnames=list(assets[0]));w.writeheader();w.writerows(assets)
world=json.loads((raw/'countries.geojson').read_text());countries=[]
for x in world['features']:
 if x['properties']['ADM0_A3'] in ['NLD','BEL','DEU','FRA','GBR','DNK','NOR','LUX']:
  x['properties']={'name':x['properties']['NAME'],'iso':x['properties']['ADM0_A3']};countries.append(x)
save(pub/'countries.geojson',dict(type='FeatureCollection',features=countries))
provinces=json.loads((raw/'provinces.geojson').read_text())
# Derived display geometry retains valid topology at the target precision.
for f in provinces['features']:f['geometry']=display_geometry(f['geometry'])
save(pub/'provinces.geojson',provinces)
for name in ['energy-power','energy-flows','energy-power-today','energy-flows-today']:
 save(data/(name+'.json'),json.loads((raw/(name+'.json')).read_text()))
manifest=[]
for name in ['liander-nh.csv','energy-openapi.json','energy-power.json','energy-flows.json','energy-power-today.json','energy-flows-today.json','wri.csv','provinces.geojson']:
 p=raw/name;manifest.append({'file':name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size,'retrievedAt':datetime.datetime.fromtimestamp(p.stat().st_mtime,datetime.timezone.utc).isoformat()})
save(root/'research/artifacts.json',manifest)
print(json.dumps({'assets':len(assets),'provinces':len(provinces['features']),'artifactHashes':len(manifest)}))

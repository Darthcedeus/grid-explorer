"""Keep OSM plant sites, turbines and stations distinct; do not sum capacities."""
import json,pathlib,hashlib,collections,re
root=pathlib.Path(__file__).resolve().parents[1]
def point(e):
 c=e if e['type']=='node' else e.get('center',{})
 return [c.get('lon'),c.get('lat')]
def peak_capacity(v):
 m=re.fullmatch(r'\s*(\d+(?:\.\d+)?)\s*(MWp|kWp|Wp)\s*',v or '')
 return float(m[1])*{'MWp':1,'kWp':.001,'Wp':.000001}[m[2]] if m else None
def capacity(v):
 m=re.fullmatch(r'\s*(\d+(?:\.\d+)?)\s*(MW|kW|W)\s*',v or '')
 return float(m[1])*{'MW':1,'kW':.001,'W':.000001}[m[2]] if m else None
for name in ['stations','producers']:
 p=root/f'research/raw/osm-{name}.json'
 if not p.exists():continue
 d=json.loads(p.read_text());features=[];excluded=collections.Counter()
 for e in d['elements']:
  t=e.get('tags',{});xy=point(e)
  if None in xy or not(2<xy[0]<8 and 50<xy[1]<55):excluded['outside_scope_or_no_point']+=1;continue
  id=f"{e['type']}/{e['id']}";props={'id':id,'name':t.get('name') or t.get('ref') or ('Unnamed station' if name=='stations' else 'Unnamed generating site'),'operator':t.get('operator','Not tagged'),'sourceUrl':'https://www.openstreetmap.org/'+id,'locationQuality':'Mapped point' if e['type']=='node' else 'Bounding-box centre for display, not a surveyed connection point'}
  evidence_keys=['ref','ref:liander','ref:bag','wikidata','operator:wikidata','manufacturer','model','voltage','plant:output:electricity','generator:output:electricity','source','source:date']
  props.update(snapshotAt=d['osm3s']['timestamp_osm_base'], evidence={key:t[key] for key in evidence_keys if t.get(key)})
  if name=='stations':props.update(voltage=t.get('voltage','Not tagged'),kind=t.get('substation','Unclassified'))
  else:
   source=t.get('plant:source') or t.get('generator:source','');out=t.get('plant:output:electricity') or t.get('generator:output:electricity')
   if out=='no' or (source in ['geothermal','biogas'] and not out):excluded['electricity_unconfirmed']+=1;continue
   if t.get('plant:method')=='battery-storage' or t.get('plant:source')=='battery':excluded['storage']+=1;continue
   tech={'solar':'Solar','wind':'Wind','gas':'Gas','coal':'Coal','nuclear':'Nuclear','biomass':'Biomass','biofuel':'Biomass','hydro':'Hydro','waste':'Waste'}.get(source,'Other')
   props.update(technology=tech,kind='Wind turbine' if t.get('power')=='generator' and tech=='Wind' else 'Solar farm / plant' if tech=='Solar' else 'Wind farm / plant' if tech=='Wind' else 'Power plant',capacityMw=capacity(out),capacityPeakMwp=peak_capacity(out) if tech=='Solar' else None,locationTag=t.get('location','Not tagged'))
   if not t.get('name') and props['kind']=='Wind turbine':props['name']=t.get('ref') or 'Unnamed wind turbine'
  features.append({'type':'Feature','properties':props,'geometry':{'type':'Point','coordinates':xy}})
 features.sort(key=lambda f:(f['properties']['name'].startswith('Unnamed'),f['properties']['name']))
 meta={'source':'OpenStreetMap contributors','license':'ODbL 1.0','snapshotAt':d['osm3s']['timestamp_osm_base'],'geographicFilter':d.get('geographicFilter','Netherlands area query; representative points limited to European scope'),'sourceSnapshots':d.get('sourceSnapshots',[d['osm3s']['timestamp_osm_base']]),'count':len(features),'counts':dict(collections.Counter(f['properties'].get('technology',f['properties']['kind']) for f in features)),'kinds':dict(collections.Counter(f['properties']['kind'] for f in features)),'excluded':dict(excluded),'rawSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'scope':'Solar-farm ways and wind-turbine nodes within Dutch provincial boundaries. Relation-only solar sites, offshore outside provincial polygons, and other plant technologies are excluded from this extract. Other plants remain in the separate historical registry. Mapped objects, not a complete census. Sites and individual generators can overlap; capacities must not be summed. Rooftop solar is not comprehensively included. Current operation is unverified.' if name=='producers' else 'All mapped power=substation objects in the Netherlands query area, including distribution and unclassified voltages. Objects may represent the same physical site; no proximity deduplication or electrical connectivity is inferred.'}
 meta['fieldCoverage']={'nameOrReference':sum(not f['properties']['name'].startswith('Unnamed') for f in features),'operator':sum(f['properties']['operator']!='Not tagged' for f in features),'numericCapacityMw' if name=='producers' else 'voltage':sum(f['properties'].get('capacityMw') is not None if name=='producers' else f['properties']['voltage']!='Not tagged' for f in features),'additionalEvidence':sum(bool(f['properties']['evidence']) for f in features),'assetTelemetry':0}
 if name=='producers':meta['fieldCoverage']['solarPeakCapacityMwp']=sum(f['properties']['capacityPeakMwp'] is not None for f in features)
 (root/f'public/data/{name}.geojson').write_text(json.dumps({'type':'FeatureCollection','features':features},separators=(',',':'),ensure_ascii=False))
 (root/f'data/{name}-meta.json').write_text(json.dumps(meta,indent=2));(root/f'public/data/{name}-meta.json').write_text(json.dumps(meta,indent=2));print(name,meta)

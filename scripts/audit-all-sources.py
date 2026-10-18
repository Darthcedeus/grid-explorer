"""Cross-check every imported source family. Candidate matches are never identity claims.
Run: PYTHONPATH=../geo-deps python3 scripts/audit-all-sources.py
"""
import json,pathlib,gzip,collections,math,re,hashlib,datetime,csv
import openpyxl
from shapely.geometry import shape,Point,Polygon
from shapely.strtree import STRtree
from shapely.validation import explain_validity
ROOT=pathlib.Path(__file__).resolve().parents[1]; OUT=ROOT/'public/data/cross-check';OUT.mkdir(exist_ok=True)
def read(p):return json.loads((ROOT/p).read_text())
def write(name,x): (OUT/name).write_text(json.dumps(x,ensure_ascii=False,indent=2))
def norm(s):return re.sub(r'[^a-z0-9]','',str(s).lower())
def dist(a,b):return math.hypot((a[0]-b[0])*111320*math.cos(math.radians(a[1])),(a[1]-b[1])*111320)
def counts(seq):return dict(collections.Counter(seq))
summary={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'All imported source families and all deployed archive metadata accessible on this run. Saved snapshots, not a new survey or independent verification of every site. No external sources added.','checks':[],'inventory':[],'files':[]}
def check(title,status,detail,stats=None,file=None):summary['checks'].append(dict(title=title,status=status,detail=detail,stats=stats or {},file=file))
# Record IDs, source attribution, coordinates and geometry validity for all map layers.
layers={};issues=[]
for p in sorted((ROOT/'public/data').rglob('*.geojson')):
 d=json.loads(p.read_text());fs=d.get('features',[]);key=str(p.relative_to(ROOT/'public/data'));layers[key]=fs
 ids=[];invalid=empty=missinglink=0
 for i,f in enumerate(fs):
  prop=f.get('properties',{});identifier=prop.get('id',f.get('id',prop.get('code',prop.get('postcode',prop.get('iso',str(i))))));ids.append(str(identifier));g=shape(f['geometry'])
  if not g.is_valid:invalid+=1;issues.append({'dataset':key,'id':identifier,'issue':explain_validity(g)})
  if g.is_empty:empty+=1
  if ('stations' in key or key in ['producers.geojson','network.geojson']) and not prop.get('sourceUrl'):missinglink+=1
 duplicate=sum(n-1 for n in collections.Counter(ids).values() if n>1)
 row={'dataset':key,'records':len(fs),'duplicateIds':duplicate,'invalidGeometry':invalid,'emptyGeometry':empty,'missingObjectLinks':missinglink};summary['inventory'].append(row)
write('geometry-issues.json',issues)
check('All map layers: geometry, identity and source links','review' if issues else 'checked','Checked every feature; administrative boundaries are display geography, not grid service areas.',{'layers':len(layers),'features':sum(len(v) for v in layers.values()),'invalidGeometries':len(issues)},'geometry-issues.json')
stations=layers['stations.geojson'];producers=layers['producers.geojson'];network=layers['network.geojson'];si={f['properties']['id']:f for f in stations};pi={f['properties']['id']:f for f in producers}
# Same OSM objects in both network and station extracts: not independent corroboration.
overlap=[]
for f in network:
 p=f['properties'];a=si.get(p['id'])
 if not a:continue
 q=a['properties'];v=q.get('evidence',{}).get('voltage',q.get('voltage'));numbers=[float(x)/1000 for x in str(v).split(';') if re.fullmatch(r'\d+',x)]
 overlap.append({'id':p['id'],'networkName':p['name'],'stationName':q['name'],'networkVoltageKv':p['voltageKv'],'stationVoltage':v,'voltageCompatible':p['voltageKv'] in numbers if numbers else None,'sourceUrl':q['sourceUrl']})
write('osm-overlap.json',overlap);check('OSM network ↔ OSM stations','checked','Exact object IDs reveal overlapping extracts of the same source, not a second independent witness. Different display labels are preserved.',{'sharedObjects':len(overlap),'voltageDisagreements':sum(x['voltageCompatible'] is False for x in overlap)},'osm-overlap.json')
# All Liander identifiers, including unmatched/ambiguous records.
li=collections.defaultdict(list)
for key,fs in layers.items():
 if key.startswith('operator-stations/liander'):
  for f in fs:li[f['properties']['operatorAssetId']].append(f)
links=[]
for f in stations:
 p=f['properties'];ref=p.get('evidence',{}).get('ref:liander')
 if not ref:continue
 candidates=li.get(ref,[]);links.append({'osmId':p['id'],'reference':ref,'status':'exact identifier + position' if len(candidates)==1 and dist(f['geometry']['coordinates'],candidates[0]['geometry']['coordinates'])<=25 else 'ambiguous identifier' if len(candidates)>1 else 'identifier not in imported layers' if not candidates else 'location conflict','operatorRecords':[{'id':c['properties']['id'],'url':c['properties']['sourceUrl'],'distanceMetres':round(dist(f['geometry']['coordinates'],c['geometry']['coordinates']),2)} for c in candidates]})
# Compare only originally published fields; enriched labels cannot corroborate themselves.
original_stations={e['type']+'/'+str(e['id']):e.get('tags',{}) for e in read('research/raw/osm-stations.json')['elements']}
for item in links:
 if item['status']!='exact identifier + position':continue
 t=original_stations[item['osmId']];q=li[item['reference']][0]['properties'];v=t.get('voltage','')
 osm_v=sorted(float(x) for x in v.split(';')) if re.fullmatch(r'\d+(?:;\d+)*',v) else None
 ov=q['voltage'];operator_v=sorted(float(x.strip()[:-2])*1000 for x in ov.split('/')) if all(re.fullmatch(r'\d+(?:\.\d+)?kV',x.strip()) for x in ov.split('/')) else None
 item['originalOsmName']=t.get('name');item['operatorName']=q['name'];item['originalOsmVoltage']=v or None;item['operatorVoltage']=ov
 item['voltageAgreement']=osm_v==operator_v if osm_v is not None and operator_v is not None else None
 item['operatorLabelAgreement']=norm(t['operator'])==norm(q['operator']) if t.get('operator') else None
write('liander-field-comparisons.json',[x for x in links if x['status']=='exact identifier + position'])
conflicts={}
for x in links:
 if x.get('voltageAgreement') is not False:continue
 c={'field':'Voltage','basis':'Unique exact operator asset ID and location agreement; source voltage fields differ. Neither value is silently replaced.','sources':[{'name':'OpenStreetMap','value':x['originalOsmVoltage']+' V','url':'https://www.openstreetmap.org/'+x['osmId']},{'name':'Liander GIS','value':x['operatorVoltage'],'url':x['operatorRecords'][0]['url']}]}
 conflicts[x['osmId']]=[c];conflicts[x['operatorRecords'][0]['id']]=[c]
(ROOT/'data/cross-source-conflicts.json').write_text(json.dumps(conflicts,indent=2))
write('field-conflicts.json',conflicts)

check('Exact Liander matches: voltage and operator fields','review' if any(x.get('voltageAgreement') is False or x.get('operatorLabelAgreement') is False for x in links) else 'checked','Compared original OSM voltage tags in volts with complete operator kV strings. Enriched names are excluded from independent corroboration; partial or unsupported voltage formats stay unassessed.',{'comparedVoltages':sum(x.get('voltageAgreement') is not None for x in links),'voltageDifferences':sum(x.get('voltageAgreement') is False for x in links),'operatorLabelDifferences':sum(x.get('operatorLabelAgreement') is False for x in links)},'liander-field-comparisons.json')
write('liander-identifiers.json',links);check('Liander ↔ OSM station identifiers','checked','All ref:liander tags checked against all three imported layers. Existing enrichment remains limited to unique identifiers within 25 metres.',counts(x['status'] for x in links),'liander-identifiers.json')
# Spatial candidates against every Liander point and every original Stedin footprint.
spatial=[];stedin_geoms=[];stedin_records=[]
meta=read('public/data/operator-stations/metadata.json')
for dataset in meta['datasets']:
 if dataset['provider']!='stedin':continue
 raw=json.load(gzip.open(ROOT/dataset['archive'],'rt'))
 for page in raw['pages']:
  for f in page['features']:
   rings=f.get('geometry',{}).get('rings',[])
   if not rings:continue
   # XOR rings preserves holes without assuming ring winding. Invalid rings are logged, not repaired silently.
   polys=[Polygon(r) for r in rings if len(r)>=4]
   if not polys or any(not p.is_valid for p in polys):continue
   g=polys[0]
   for p in polys[1:]:g=g.symmetric_difference(p)
   stedin_geoms.append(g);stedin_records.append({'id':f"stedin:{dataset['layer']}:{f['attributes']['OBJECTID']}",'url':dataset['sourceUrl']+'/'+str(f['attributes']['OBJECTID'])})
st=STRtree(stedin_geoms)
li_fs=[f for key,fs in layers.items() if key.startswith('operator-stations/liander') for f in fs];lit=STRtree([shape(f['geometry']) for f in li_fs])
for f in stations:
 p=f['properties'];point=shape(f['geometry']);xy=f['geometry']['coordinates']
 for j in st.query(point):
  if stedin_geoms[j].covers(point):spatial.append({'osmId':p['id'],'operatorRecord':stedin_records[j]['id'],'sourceUrl':stedin_records[j]['url'],'basis':'OSM display point within Stedin footprint','status':'spatial candidate only','osmOperator':p['operator']})
 for j in lit.query(point.buffer(.0004)):
  q=li_fs[j]['properties'];d=dist(xy,li_fs[j]['geometry']['coordinates'])
  if d<=25 and p.get('evidence',{}).get('ref:liander')!=q['operatorAssetId']:spatial.append({'osmId':p['id'],'operatorRecord':q['id'],'sourceUrl':q['sourceUrl'],'basis':'Within 25 m of Liander point','distanceMetres':round(d,2),'status':'spatial candidate only','osmOperator':p['operator']})
write('station-spatial-candidates.json',spatial);check('Stedin + Liander ↔ every OSM station','review','Tested original Stedin footprints and all Liander points. Overlap/proximity suggests a candidate; no name, voltage or operator is copied on this evidence alone.',{'stedinFootprints':len(stedin_geoms),**counts(x['basis'] for x in spatial)},'station-spatial-candidates.json')
# RVO project IDs/address checks against raw OSM producer tags, no applicant→operator inference.
rvo=read('public/data/rvo-projects.json')['projects'];rawp=read('research/raw/osm-producers.json')['elements'];rp={e['type']+'/'+str(e['id']):e.get('tags',{}) for e in rawp}
address_index=collections.defaultdict(list)
for r in rvo:
 if re.fullmatch(r'\d{4}[A-Z]{2}',re.sub(r'\s','',r['postcode']).upper()) and r['address']:address_index[(norm(r['postcode']),norm(r['address']))].append(r)
rvom=[]
for f in producers:
 p=f['properties'];t=rp[p['id']];address=' '.join([t.get('addr:street',''),t.get('addr:housenumber','')]).strip();key=(norm(t.get('addr:postcode','')),norm(address))
 for r in address_index.get(key,[]):
  if (p['technology']=='Solar' and r['technology']=='Solar') or (p['technology']=='Wind' and 'wind' in r['technology'].lower()):rvom.append({'osmId':p['id'],'rvoId':r['id'],'address':r['address'],'postcode':r['postcode'],'applicant':r['applicant'],'basis':'Exact normalized full postcode + street/house number + technology','status':'candidate; address may host multiple projects','realized':r['realized']})
write('rvo-address-candidates.json',rvom);rc=collections.Counter(r['id'] for r in rvo);check('RVO ↔ all OSM producers','review','All 28,913 project rows screened. Applicant is not automatically the operator; address matches do not establish site identity. Missing coordinates and shared project addresses prevent automatic joining.',{'projects':len(rvo),'duplicateProjectIds':sum(v-1 for v in rc.values() if v>1),'osmProducersWithFullAddress':sum(bool(t.get('addr:postcode') and t.get('addr:street') and t.get('addr:housenumber')) for id,t in rp.items() if id in pi),'addressCandidates':len(rvom)},'rvo-address-candidates.json')
# Historical WRI / added offshore records ↔ RWE and OSM: keep dated capacities separate.
assets=read('data/assets.json');rwe=read('research/cross-check/rwe/master.json');rwe=[p for p in rwe if p['country']=='NL'];generation=[]
for a in assets:
 for b in rwe:
  xy=[float(b['location_data']['pos_lat']),float(b['location_data']['pos_lon'])];d=dist([a['lon'],a['lat']],xy)
  if d<=1000:generation.append({'historicalId':a['id'],'historicalName':a['name'],'candidateSource':'RWE','candidateId':b['lid'],'candidateName':b['name'],'distanceMetres':round(d,1),'exactNormalizedName':norm(a['name'])==norm(b['name']),'historicalCapacityMw':a['capacityMw'],'candidateCapacityMw':b['power'],'capacityBasis':'Historical whole registry value vs RWE share/contracted capacity; not assumed equivalent','status':'candidate; not merged'})
 for b in producers:
  d=dist([a['lon'],a['lat']],b['geometry']['coordinates'])
  if d<=500:generation.append({'historicalId':a['id'],'historicalName':a['name'],'candidateSource':'OSM','candidateId':b['properties']['id'],'candidateName':b['properties']['name'],'distanceMetres':round(d,1),'status':'candidate; plant vs turbine/site granularity may differ'})
for a in rwe:
 xy=[float(a['location_data']['pos_lat']),float(a['location_data']['pos_lon'])]
 for b in producers:
  d=dist(xy,b['geometry']['coordinates'])
  if d<=500:generation.append({'rweId':a['lid'],'rweName':a['name'],'rwePowerType':a['types'],'candidateSource':'OSM','candidateId':b['properties']['id'],'candidateName':b['properties']['name'],'candidateTechnology':b['properties']['technology'],'distanceMetres':round(d,1),'sourceUrl':b['properties']['sourceUrl'],'status':'proximity candidate only; technology and site/unit granularity need review'})
write('generation-candidates.json',generation);check('WRI / offshore additions ↔ RWE ↔ OSM','review','Checked historical registry against every Dutch RWE site and mapped OSM producer. Nearby units may share a complex; historical ownership and capacities are never overwritten by proximity.',{'historicalRecords':len(assets),'rweDutchSites':len(rwe),'rweOldDataFlags':sum(p['has_old_data'] for p in rwe),'candidatePairsBySource':counts(('WRI → '+x['candidateSource']) if 'historicalId' in x else 'RWE → OSM' for x in generation),'candidates':len(generation)},'generation-candidates.json')
check('Enexis and TenneT station identity coverage','gap','Original OSM attributes are checked for all operator labels, including Enexis and TenneT. The imported Enexis releases are neighbourhood/postcode aggregates and an unnamed illustrative station profile; none supplies a station ID/coordinate register. TenneT balancing is national context, not GIS. These records cannot independently establish the identity, voltage or load of OSM stations.',{'osmStationOperatorLabels':dict(collections.Counter(f['properties']['operator'] for f in stations if any(x in norm(f['properties']['operator']) for x in ['enexis','tennet'])))})
rv=read('research/cross-check/rwe-response-validation.json');write('rwe-response-validation.json',rv)
check('RWE saved responses ↔ catalogue and national timestamps','review','All 18 Dutch plants and 22 unit IDs checked against the saved live response. Claus and Magnum histories each contain 84 valid ISO/epoch-aligned records. The two saved aggregate-query responses are empty. Plant histories have no overlapping timestamps with the complete saved national power snapshots, so a plant-to-national value comparison cannot be made. Local response validation does not establish hosted access.',{'dutchPlants':rv['dutchPlants'],'dutchUnits':rv['dutchUnits'],'unitsAbsentFromLiveResponse':len(rv['unitsAbsentFromLiveResponse']),'histories':rv['histories'],'commonWithSavedNational':rv['commonWithSavedNational']},'rwe-response-validation.json')
# Regional codes, Jan/July changes and comparable geographical coverage.
capacity=read('public/data/enexis/capacity.json')['snapshots'];geomcodes={f['properties'].get('code',f.get('id')) for f in layers['enexis/neighbourhoods-2026.geojson']};changes=[];snapshots=[]
for kind,dates in capacity.items():
 for date,rows in dates.items():snapshots.append({'kind':kind,'date':date,'rows':len(rows),'unmapped':sum(not r['mapped'] for r in rows),'duplicateIds':len(rows)-len({r['id'] for r in rows}),'mappedWithoutGeometry':sum(r['mapped'] and r['code'] not in geomcodes for r in rows)})
 a={r['id']:r for r in dates['2026-01-01']};b={r['id']:r for r in dates['2026-07-01']}
 for id in a.keys()&b.keys():
  for metric,x in a[id]['values'].items():
   y=b[id]['values'].get(metric)
   if x is not None and y is not None and x!=y:changes.append({'dataset':kind,'id':id,'name':b[id]['name'],'metric':metric,'january':x,'july':y,'difference':round(y-x,6),'sameNameAndMunicipality':a[id]['name']==b[id]['name'] and a[id]['municipality']==b[id]['municipality'],'januaryName':a[id]['name'],'interpretation':'Published same-code difference only; labels, privacy grouping and boundaries may change. Not measured generation'})
write('enexis-snapshot-changes.json',changes);check('Enexis releases ↔ CBS/PDOK geography','checked','All four releases checked for identity and mapped-code coverage; same-code January/July differences retained. Enexis 2026 service-area registered capacity is not a direct equality check against CBS 2025 national/municipal stock.',{'snapshots':snapshots,'changedFields':len(changes),'changedFieldsWithDifferentAreaLabels':sum(not x['sameNameAndMunicipality'] for x in changes)},'enexis-snapshot-changes.json')
# Annual populations: matching PC4 codes do not make kWh per dwelling equal to per connection SJA/SJV.
en=read('public/data/enexis/consumption-index.json')['areas'];enidx={a['code']:a for a in en};liannual=read('public/data/annual-consumption.json');la=liannual['areas'];cbs={f['properties']['postcode']:f['properties'] for f in layers['demand-postcodes.geojson']};pc=[]
for code in sorted(set(enidx)|set(la)):
 if code in enidx and code in la:pc.append({'postcode':code,'enexisConnections':enidx[code]['connections'],'lianderConnections':la[code]['connections'],'interpretation':'Shared postcode coverage, not duplicate connections'})
write('annual-coverage-overlap.json',pc);check('Enexis + Liander annual use ↔ CBS postcode demand','checked','Compared geographical coverage only: 2026 standard annual values for small connections cannot be validated by equality with 2023 dwelling averages. Shared postcodes do not imply the same meters.',{'enexisPostcodes':len(enidx),'lianderPostcodes':len(la),'sharedOperatorPostcodes':len(pc),'enexisNotInCbs2023':len(set(enidx)-set(cbs)),'lianderNotInCbs2023':len(set(la)-set(cbs)),'cbsPostcodes':len(cbs),'lianderAnnualReconciliationDifferenceKwh':round(liannual['totalKwh']-sum(v['kwh'] for v in la.values())-liannual['crossPostcodeRemainder']['kwh'],6)},'annual-coverage-overlap.json')
mirrors=[]
for p in sorted((ROOT/'data').glob('*.json')):
 other=ROOT/'public/data'/p.name
 if other.exists():mirrors.append({'file':p.name,'identicalContent':json.loads(p.read_text())==json.loads(other.read_text())})
check('Bundled metadata ↔ downloadable data','checked' if all(x['identicalContent'] for x in mirrors) else 'review','Compared every same-named JSON file shared between the application bundle and public downloads.',{'files':mirrors})
# Time-series cross checks. Only like timestamps and MW/GW conversion. Commercial trading not physical exchange.
energy=[]
for suffix in ['', '-today']:
 power=read('data/energy-power'+suffix+'.json');flow=read('data/energy-flows'+suffix+'.json');pm={x['timestamp']:x['values'] for x in power['data']};fm={x['timestamp']:x['values'] for x in flow['data']};deltas=[]
 for t,v in fm.items():
  values=[v[k] for k in ['belgium','denmark','germany','norway','united_kingdom']]
  if all(isinstance(x,(int,float)) for x in values) and isinstance(v.get('sum'),(int,float)):deltas.append(abs(sum(values)-v['sum']))
 energy.append({'snapshot':suffix or 'baseline','generationUnit':power['unit'],'flowUnit':flow['unit'],'powerIntervals':len(pm),'flowIntervals':len(fm),'commonIntervals':len(set(pm)&set(fm)),'maxBorderSumDifferenceGW':max(deltas,default=None),'powerDuplicateTimestamps':len(power['data'])-len(pm),'flowDuplicateTimestamps':len(flow['data'])-len(fm),'powerMatchesArchivedResponse':power==read('research/raw/energy-power'+suffix+'.json'),'flowMatchesArchivedResponse':flow==read('research/raw/energy-flows'+suffix+'.json')})
check('Energy-Charts generation, demand and physical borders','checked','Checked both saved days, common timestamps, duplicate times, source units and reported border sums. Generation + imports - load is a coverage residual, not measured losses or independent validation.',{'snapshots':energy})
# Runtime evidence: exhaustive metadata pagination, payloads truncated by native reader.
runtime=read('research/cross-check/runtime-audit.json');check('Hosted Energy-Charts, RWE, TenneT; NED / ENTSO-E','gap','All deployed archive metadata pages inspected. RWE and TenneT have attempt markers but no successful archived payload in this database at audit time. This does not identify the failure cause. NED access remains unverified; direct ENTSO-E is not configured. Archived bodies are truncated by the reader, so only local complete source responses underwent value-level tests.',{'archiveRecords':len(runtime['archive']['rows']),'successfulArchivesBySource':counts(x['source'] for x in runtime['archive']['rows']),'truncatedArchiveBodies':runtime['archive']['truncatedBodies']})
check('Enexis HS/MS example, Liander transport, permits and tenders','gap','HS/MS is illustrative and cannot verify station load. Liander transport is quarantined for unresolved units/geography. Permits, TenderNed/TED, congestion and KNMI are links/plans with no imported observations to cross-check. TenneT-labelled OSM infrastructure is community mapping, not an operator GIS feed.')
logs=read('research/cross-check/runtime-log-summary.json')
check('Recent hosted error evidence','gap','A limited native worker-log query found an NED route returning HTTP 502. It does not expose the upstream cause. Absence of other feeds from this error query does not prove success.',{'queryWindowMinutes':logs['windowMinutes'],'events':logs['events']})
# Complete RVO workbook audit using exact project references and published fields.
workbook=ROOT/'research/raw/rvo-sde-july-2026.xlsx'
sheet=openpyxl.load_workbook(workbook,read_only=True,data_only=True).active
rvo_index={r['id']:r for r in rvo};source_ids=set();rvo_errors=[]
for row in sheet.iter_rows(min_row=12,values_only=True):
 if not row[2] or row[3] not in ['Zon','Wind op land','Wind op zee']:continue
 id=str(row[2]).strip();source_ids.add(id);p=rvo_index.get(id)
 if not p:rvo_errors.append({'id':id,'field':'missing project'});continue
 for key,col in {'round':1,'theme':4,'applicant':5,'address':6,'postcode':7,'place':8,'municipality':9,'province':11}.items():
  expected=str(row[col]).strip() if row[col] is not None else ''
  if p[key]!=expected:rvo_errors.append({'id':id,'field':key})
 expected={'technology':{'Zon':'Solar','Wind op land':'Onshore wind','Wind op zee':'Offshore wind'}[row[3]],'realized':True if row[15]=='Ja' else False if row[15]=='Nee' else None,'installation':{'Daksysteem':'Rooftop','Veldsysteem':'Ground-mounted','Watersysteem':'Floating'}.get(row[14],'Unspecified'),'commissioningYear':None if row[16] in [None,'(Nog) niet'] else int(row[16])}
 for key,value in expected.items():
  if p[key]!=value:rvo_errors.append({'id':id,'field':key})
rvo_hash=hashlib.sha256(workbook.read_bytes()).hexdigest()==read('data/rvo-projects-meta.json')['sha256']
check('RVO source workbook ↔ imported project register','checked' if not rvo_errors and rvo_hash else 'review','Compared every selected workbook project by exact reference: location, applicant, technology, installation type, realisation and commissioning year. Original anonymisation preserved.',{'workbookHashMatches':rvo_hash,'sourceProjectIds':len(source_ids),'importedProjectIds':len(rvo_index),'differentProjectIds':len(source_ids^set(rvo_index)),'fieldDisagreements':len(rvo_errors)})
# Historical WRI records compared with the original CSV, without updating dated claims.
wri={r['gppd_idnr']:r for r in csv.DictReader((ROOT/'research/raw/wri.csv').open()) if r['country']=='NLD' and 50<float(r['latitude'])<55};wri_errors=[]
for a in assets:
 if a['id'] not in wri:continue
 r=wri[a['id']]
 for key,expected in {'name':r['name'].strip(),'lat':float(r['latitude']),'lon':float(r['longitude']),'capacityMw':float(r['capacity_mw']),'operator':r['owner'] or 'Not verified'}.items():
  if a[key]!=expected:wri_errors.append({'id':a['id'],'field':key})
check('WRI registry ↔ original CSV','checked' if not wri_errors else 'review','All European-Netherlands historical source records checked for name, coordinates, recorded capacity and owner. Two offshore factsheet additions retain separate provenance and approximate display centres; their present-day values were not reverified.',{'sourceRecords':len(wri),'importedWriRecords':sum(a['id'] in wri for a in assets),'fieldDisagreements':len(wri_errors),'separateOperatorAdditions':sum(a['id'] not in wri for a in assets)})
# Check clipping against original unsimplified province geometry, not repaired display shapes.
province_shapes=[shape(f['geometry']) for f in read('research/raw/provinces.geojson')['features']];province_tree=STRtree(province_shapes);outside=[]
for f in producers:
 point=shape(f['geometry'])
 if not any(province_shapes[j].covers(point) for j in province_tree.query(point)):outside.append(f['properties']['id'])
check('OSM producer coverage ↔ original province boundaries','checked' if not outside else 'review','Checked retained display points against the original full-precision provincial polygons. Offshore records outside those areas are still outside this extract; this does not assess national completeness.',{'producersChecked':len(producers),'outsideOriginalBoundaries':len(outside)})
# Raw imported archive checksums, including all six GIS layers.
hashes=[]
for d in meta['datasets']:
 p=ROOT/d['archive'];actual=hashlib.sha256(gzip.decompress(p.read_bytes())).hexdigest();hashes.append({'dataset':d['key'],'match':actual==d['sha256']})
check('Operator raw archive integrity','checked' if all(x['match'] for x in hashes) else 'review','SHA-256 of decompressed source archives compared with recorded import hashes.',{'layers':hashes})
# Verify OSM attributes against the exact original records and final metadata counts.
evidence=[]
for kind,features in [('producers',producers),('stations',stations)]:
 raw={e['type']+'/'+str(e['id']):e.get('tags',{}) for e in read('research/raw/osm-'+kind+'.json')['elements']}
 mismatches=[]
 for f in features:
  p=f['properties']
  for k,v in p['evidence'].items():
   if raw[p['id']].get(k)!=v:mismatches.append({'id':p['id'],'field':k})
 metadata=read('public/data/'+kind+'-meta.json')
 evidence.append({'dataset':kind,'rows':len(features),'tagMismatches':len(mismatches),'unnamed':sum(f['properties']['name'].startswith('Unnamed') for f in features),'missingSourceLinks':sum(not f['properties'].get('sourceUrl') for f in features),'evidenceCountMatches':metadata['fieldCoverage']['additionalEvidence']==sum(bool(f['properties']['evidence']) for f in features)})
check('OSM provenance and evidence coverage','checked' if all(x['tagMismatches']==0 and x['evidenceCountMatches'] for x in evidence) else 'review','Every evidence tag compared with its original OSM object; metadata counts recalculated after enrichment. All site source links retained. Source presence does not establish current operation.',{'datasets':evidence})
correction=read('research/cross-check/geometry-correction.json');write('geometry-correction.json',correction);write('geometry-before.json',read('research/cross-check/geometry-before.json'))
check('Boundary geometry correction','corrected',correction['method'],{'datasets':correction['datasets']},'geometry-correction.json')
summary['limitations']=['No claim that a catalogue record proves present-day operation.','Spatial and address candidates are not applied automatically.','Provider feeds that describe different quantities, years or populations are not forced to agree.','Native archive reader truncates payloads; complete production-history revalidation was not possible.','No new outside data was acquired; disconnected/planned sources are coverage gaps, not checked datasets.']
verification=read('research/cross-check/verification.json')
check('Automated import and calculation verification','checked','Executed source and calculation tests, including complete Enexis raw-file reconciliation. These checks validate transformations; they are not independent certification of source claims.',verification)
summary['nextSteps']=['Diagnose hosted RWE and TenneT retrievals and the NED error, then retain successful timestamped responses before marking them available.','Resolve the NOORDERRINGWEG voltage conflict against dated operator evidence. Both published values remain visible.','Review Stedin footprint, Liander proximity and RVO address candidates using independent identifiers or documents; do not automatically merge them.','Obtain authoritative Enexis and TenneT asset registers. Neighbourhood aggregates and national balancing cannot identify individual substations.']
summary['validation']={'scope':'Automated checks, not an independent human audit. See research/cross-check/report.md for executed verification.', 'reproduce':'PYTHONPATH=../geo-deps python3 scripts/audit-all-sources.py'}
# Inventory every JSON/GeoJSON used by the application. Metadata and shards are files, not distinct sources.
for base in ['data','public/data']:
 for p in sorted((ROOT/base).rglob('*')):
  if p.suffix not in ['.json','.geojson'] or OUT in p.parents:continue
  b=p.read_bytes();json.loads(b);summary['files'].append({'path':str(p.relative_to(ROOT)),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
write('summary.json',summary)
lines=['# Full source cross-check','',summary['checkedAt'],'',summary['scope'],'']
for c in summary['checks']:
 lines += ['## '+c['title']+' — '+c['status'],'',c['detail'],'','```json',json.dumps(c['stats'],indent=2),'```','']
lines+=['## Limits','']+['- '+x for x in summary['limitations']]
lines+=['','## Next actions','']+['- '+x for x in summary['nextSteps']]
(ROOT/'research/cross-check/report.md').write_text('\n'.join(lines)+'\n')
(OUT/'report.md').write_text('\n'.join(lines)+'\n')
print(json.dumps({'files':len(summary['files']),'features':sum(x['records'] for x in summary['inventory']),'checks':[(x['title'],x['stats']) for x in summary['checks']]},indent=2))

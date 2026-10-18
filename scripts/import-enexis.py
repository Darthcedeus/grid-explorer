"""Import Enexis user-supplied releases, preserving unknown locations and units.

Usage: python import-enexis.py DOWNLOAD_DIRECTORY
Needs shapely for the separately downloaded 2026 PDOK display geometry.
Source documents and CSV bytes are retained as gzip archives with SHA-256 hashes.
"""
import collections,csv,datetime,gzip,hashlib,io,json,math,re,sys
from decimal import Decimal
from pathlib import Path
import shapely
from shapely.geometry import shape,mapping

ROOT=Path(__file__).resolve().parents[1]
INPUT=Path(sys.argv[1]);OUT=ROOT/'public/data/enexis';RAW=ROOT/'research/raw/enexis'
NOW=datetime.datetime.now(datetime.timezone.utc).isoformat()
BASE='https://enxp433-opendata-publications.s3.eu-west-1.amazonaws.com/'
SOURCES=[
 ('gv-jan','input-01',BASE+'decentrale_opwek_gv_wind_zon_01012026.csv'),
 ('gv-jul','input-02',BASE+'decentrale_opwek_gv_wind_zon_01072026.csv'),
 ('hsms-notes','input-03','https://edge-www.enexis.nl/v1/media/edge/images/project/enexisnl/enexisnl/over-ons-pdf/toelichting-belastingdata-hsms-niveau.pdf'),
 ('hsms-image','input-04','https://edge-www.enexis.nl/v1/media/edge/images/project/enexisnl/enexisnl/over-ons-pdf/belastingpatroon.jpg'),
 ('hsms-profile','input-05','https://enxp433-oda01.s3.eu-west-1.amazonaws.com/GV_opwek/Tijdreeksen_HSMS_station.csv'),
 ('kv-notes','resolved-06','https://content.mailplus.nl/m3/docs/user60769/2593/Toelichting_opwek_kleinverbruikaansluitingen.pdf'),
 ('kv-jul','resolved-07',BASE+'decentrale_opwek_kv_zon_pv_01072026.csv'),
 ('kv-jan','resolved-08',BASE+'decentrale_opwek_kv_zon_pv_01012026.csv'),
 ('consumption-notes','resolved-09','https://content.mailplus.nl/m3/docs/user60769/2589/Toelichting_Verbruiksdata_kleinverbruikaansluitingen.pdf'),
 ('consumption','resolved-10',BASE+'Enexis_kleinverbruiksgegevens_01012026.csv'),
]

def write(path,data):
 path.parent.mkdir(parents=True,exist_ok=True)
 path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'),allow_nan=False)+'\n')

def number(value):
 if not value.strip():return None
 n=float(Decimal(value.replace(',','.')))
 if not math.isfinite(n):raise ValueError('Nonfinite number')
 return n

def rows(name):
 return list(csv.DictReader((INPUT/name).open(encoding='utf-8-sig'),delimiter=';'))

def sums(records):
 keys=set().union(*(r['values'] for r in records))
 return {k:float(sum(Decimal(str(r['values'][k])) for r in records if r['values'][k] is not None)) for k in sorted(keys)}

def main():
 OUT.mkdir(parents=True,exist_ok=True);RAW.mkdir(parents=True,exist_ok=True)
 provenance=[]
 for key,file,url in SOURCES:
  raw=(INPUT/file).read_bytes()
  with gzip.open(RAW/(key+'.gz'),'wb') as f:f.write(raw)
  provenance.append({'id':key,'url':url,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'retrievedAt':NOW})
 # Keep provider explanations and image available directly from the app.
 for source,target in [('input-03','hsms-notes.pdf'),('input-04','hsms-provider-chart.jpg'),('resolved-06','kv-generation-notes.pdf'),('resolved-09','consumption-notes.pdf')]:
  (OUT/target).write_bytes((INPUT/source).read_bytes())
 snapshots={};audit={}
 for kind,date,file in [('gv','2026-01-01','input-01'),('gv','2026-07-01','input-02'),('kv','2026-01-01','resolved-08'),('kv','2026-07-01','resolved-07')]:
  source=rows(file);records=[]
  fields={'windConstructionMw':'Maximum (omvormer) capaciteit_wind_in aanleg [MW]','windMw':'Maximum (omvormer) capaciteit_wind_in bedrijf [MW]','solarConstructionMw':'Maximum (omvormer) capaciteit_zon_in aanleg [MW]','solarMw':'Maximum (omvormer) capaciteit_zon_in bedrijf [MW]'} if kind=='gv' else {'connections':'Aantal aansluitingen in CBS-buurt','generatingConnections':'Aantal aansluitingen met opwekinstallatie','solarMwp':'Opgesteld vermogen'}
  for r in source:
   assert r['Peildatum']==date.replace('-','') and r['Netbeheerder']=='Enexis'
   values={k:number(r[v]) for k,v in fields.items()}
   assert all(v is None or v>=0 for v in values.values())
   if kind=='kv':
    if values['solarMwp'] is not None:values['solarMwp']/=1000
    assert values['generatingConnections']<=values['connections']
   code=r['CBS Buurtcode']
   if code:assert re.fullmatch(r'BU\d{8}',code)
   records.append({'id':code or 'unallocated:'+r['Provincie']+':'+r['Gemeente'],'code':code,'name':r['CBS Buurt'] or 'Unallocated / privacy-grouped','municipality':r['Gemeente'],'province':r['Provincie'],'values':values})
  assert len({r['id'] for r in records})==len(records)
  snapshots.setdefault(kind,{})[date]=records
  audit[kind+':'+date]={'rows':len(records),'totals':sums(records),'unallocatedRows':sum(not r['code'] for r in records),'unallocatedTotals':sums([r for r in records if not r['code']])}
 # Require exact BU code AND name/municipality agreement before displaying geometry.
 geometry_bytes=gzip.decompress((INPUT/'neighbourhoods-2026.json.gz').read_bytes())
 geometry=json.loads(geometry_bytes)
 with gzip.open(RAW/'neighbourhoods-2026.json.gz','wb') as f:f.write(geometry_bytes)
 by_code={f['properties']['bu_code']:f for f in geometry['features']}
 assert len(by_code)==len(geometry['features'])
 accepted=set();mismatches=[]
 for kind,dates in snapshots.items():
  for date,records in dates.items():
   for r in records:
    f=by_code.get(r['code']);p=f['properties'] if f else {}
    r['mapped']=bool(f and p['bu_naam']==r['name'] and p['gm_naam']==r['municipality'])
    if r['mapped']:accepted.add(r['code'])
    elif r['code']:mismatches.append({'kind':kind,'date':date,'code':r['code'],'sourceName':r['name'],'geometryName':p.get('bu_naam')})
   audit[kind+':'+date]['mappedRows']=sum(r['mapped'] for r in records)
   audit[kind+':'+date]['unmappedTotals']=sums([r for r in records if not r['mapped']])
 features=[]
 for code in sorted(accepted):
  f=by_code[code];g=shape(f['geometry']);assert g.is_valid
  simplified=g.simplify(.00003,preserve_topology=True);assert simplified.is_valid
  geo=mapping(simplified)
  if geo['type']=='Polygon':geo={'type':'MultiPolygon','coordinates':[geo['coordinates']]}
  assert geo['type']=='MultiPolygon'
  features.append({'type':'Feature','id':code,'properties':{'code':code},'geometry':geo})
 write(OUT/'neighbourhoods-2026.geojson',{'type':'FeatureCollection','features':features})
 write(OUT/'capacity.json',{'snapshots':snapshots})
 # Electricity only: preserve source SJA and SJI on original postcode ranges.
 # SJA postcode summaries are count-weighted; SJI denominator is not assumed.
 consumption=rows('resolved-10');electricity=[r for r in consumption if r['productsoort']=='ELK']
 groups={};shards=collections.defaultdict(list);excluded=[]
 for i,r in enumerate(electricity):
  assert r['peildatum']=='2026-01-01 00:00:00'
  pc=r['postcode_van'][:4];end=r['postcode_tot'][:4]
  if not re.fullmatch(r'\d{4}',pc) or pc!=end:
   excluded.append(r);continue
  n=int(r['aansluiting_aantal']);assert n>=10
  sja=number(r['sja_gemiddeld']);sji=number(r['sji_gemiddeld']);assert sja is not None and sja>=0 and sji is not None and sji>=0
  record={'id':str(i),'from':r['postcode_van'],'to':r['postcode_tot'],'street':r['straatnaam'],'place':r['woonplaats'],'connections':n,'sja':sja,'sji':sji,'activePercent':number(r['fysieke_status_perc'])}
  shards[pc[:2]].append(record)
  a=groups.setdefault(pc,{'code':pc,'connections':0,'weightedSja':Decimal(0),'rows':0,'places':set()})
  a['connections']+=n;a['weightedSja']+=Decimal(r['sja_gemiddeld'].replace(',','.'))*n;a['rows']+=1;a['places'].add(r['woonplaats'])
 for a in groups.values():
  a['meanSja']=float(a['weightedSja']/a['connections']);a['derivedSjaKwh']=float(a.pop('weightedSja'));a['places']=sorted(a['places'])
 for key,records in shards.items():write(OUT/'consumption'/f'{key}.json',records)
 write(OUT/'consumption-index.json',{'areas':sorted(groups.values(),key=lambda x:x['code'])})
 write(RAW/'consumption-unassigned.json',excluded)
 # The last two unindexed rows are verified extrema, not extra hours.
 profile=rows('input-05');hourly=[r for r in profile if r[''].isdigit()];footer=[r for r in profile if not r[''].isdigit()]
 assert [int(r['']) for r in hourly]==list(range(8760)) and len(footer)==2
 years=[]
 for i in range(1,4):
  key=f'Jaar {i}';values=[number(r[key]) for r in hourly];valid=[v for v in values if v is not None]
  assert math.isclose(max(valid),number(footer[0][key]),abs_tol=1e-6) and math.isclose(min(valid),number(footer[1][key]),abs_tol=1e-6)
  years.append({'label':f'Year {i}','values':values,'minimumMw':min(valid),'maximumMw':max(valid),'missingHours':sum(v is None for v in values)})
 write(OUT/'hsms-profile.json',{'years':years,'method':'Enexis stylised forecast example, not measured station data','hours':8760,'timeBasis':'Hour index 0–8759; no absolute calendar year or timezone assigned','sign':'Positive: net withdrawal HS → MS. Negative: net generation MS → HS.','excludedRows':2})
 meta={'retrievedAt':NOW,'sources':provenance,'capacity':audit,'geometry':{'sourceUrl':'https://api.pdok.nl/cbs/wijken-en-buurten-2026/ogc/v1/collections/buurten','year':2026,'version':'0','matchedFeatures':len(features),'mismatches':mismatches,'sha256':hashlib.sha256(geometry_bytes).hexdigest(),'method':'Exact BU code, neighbourhood name and municipality; 2026 display boundaries simplified 0.00003 degrees. Historical footprint changes are not reconstructed. Unknown/privacy-grouped rows remain unmapped.','license':'CBS / PDOK · CC0'},'consumption':{'referenceDate':'2026-01-01','sourceRows':len(consumption),'electricityRows':len(electricity),'excludedGasRows':sum(r['productsoort']=='GAS' for r in consumption),'postcodes':len(groups),'unassignedRows':len(excluded),'connections':sum(r['connections'] for r in groups.values()),'method':'Standard annual withdrawal/injection based on preceding year; not metered totals or live load. Postcode mean SJA is connection-count-weighted. SJI retained only at source-range level; no assumed total or net subtraction. Inactive connections can retain historical values; traditional meters can net generation against withdrawal.'},'profile':{'sourceHours':8760,'years':3,'missingHours':[y['missingHours'] for y in years],'method':'Illustrative Enexis forecast, not measured telemetry','documentationDate':'2022-02-24','excludedSummaryRows':2},'notes':'CSV files actually use semicolons, although accompanying PDFs describe tabs. Parse the inspected schema. MW, MWp and kWh remain separate; no values are added to national observations or OSM site capacities.'}
 write(OUT/'metadata.json',meta);write(ROOT/'data/enexis-meta.json',meta)
 print(json.dumps({k:v for k,v in meta.items() if k not in ['sources','geometry']},indent=2));print('Geometry',len(features),'mismatches',len(mismatches))

if __name__=='__main__':main()

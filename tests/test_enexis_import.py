"""Independent checks against archived source CSVs, not just generated metadata."""
import csv,gzip,hashlib,io,json,math
from decimal import Decimal
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/data/enexis';RAW=ROOT/'research/raw/enexis'
meta=json.loads((OUT/'metadata.json').read_text());capacity=json.loads((OUT/'capacity.json').read_text())
for source in meta['sources']:
 raw=gzip.decompress((RAW/(source['id']+'.gz')).read_bytes())
 assert hashlib.sha256(raw).hexdigest()==source['sha256']
def source_rows(key):
 return list(csv.DictReader(io.StringIO(gzip.decompress((RAW/(key+'.gz')).read_bytes()).decode('utf-8-sig')),delimiter=';'))
for kind in ['gv','kv']:
 for month,date in [('jan','2026-01-01'),('jul','2026-07-01')]:
  source=source_rows(kind+'-'+month);out=capacity['snapshots'][kind][date]
  assert len(source)==len(out)
  mapping={'solarMw':'Maximum (omvormer) capaciteit_zon_in bedrijf [MW]','windMw':'Maximum (omvormer) capaciteit_wind_in bedrijf [MW]','solarConstructionMw':'Maximum (omvormer) capaciteit_zon_in aanleg [MW]','windConstructionMw':'Maximum (omvormer) capaciteit_wind_in aanleg [MW]'} if kind=='gv' else {'solarMwp':'Opgesteld vermogen','connections':'Aantal aansluitingen in CBS-buurt','generatingConnections':'Aantal aansluitingen met opwekinstallatie'}
  for key,column in mapping.items():
   source_total=sum(Decimal(r[column].replace(',','.')) for r in source)/(1000 if key=='solarMwp' else 1)
   total=sum(Decimal(str(r['values'][key])) for r in out)
   assert abs(source_total-total)<Decimal('.0000001'),(kind,date,key)
annual=source_rows('consumption');electric=[r for r in annual if r['productsoort']=='ELK'];areas=json.loads((OUT/'consumption-index.json').read_text())['areas']
assert len(electric)==126357 and len(annual)-len(electric)==104680
assert sum(a['rows'] for a in areas)==len(electric)
assert sum(a['connections'] for a in areas)==sum(int(r['aansluiting_aantal']) for r in electric)
source_total=sum(Decimal(r['sja_gemiddeld'].replace(',','.'))*int(r['aansluiting_aantal']) for r in electric)
out_total=sum(Decimal(str(a['derivedSjaKwh'])) for a in areas)
assert abs(source_total-out_total)<Decimal('.00001')
shards=[r for p in (OUT/'consumption').glob('*.json') for r in json.loads(p.read_text())]
assert len(shards)==len(electric)
byid={r['id']:r for r in shards}
for i,r in enumerate(electric):
 out=byid[str(i)]
 assert out['from']==r['postcode_van'] and out['to']==r['postcode_tot']
 assert out['sja']==float(r['sja_gemiddeld'].replace(',','.'))
 assert out['sji']==float(r['sji_gemiddeld'].replace(',','.'))
for a in areas:assert math.isclose(a['meanSja']*a['connections'],a['derivedSjaKwh'],rel_tol=1e-12)
assert all(p.stat().st_size<25*1024*1024 for p in OUT.rglob('*') if p.is_file())
print('PASS: all ten source hashes; four capacity releases; all 126,357 electricity source ranges; weighted SJA reconciliation; asset sizes.')

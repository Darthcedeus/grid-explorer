"""Liander 2026 SJV aggregates; never reinterpret as measured city load."""
import csv,json,pathlib,hashlib
root=pathlib.Path(__file__).resolve().parents[1];p=root/'research/raw/liander-kv-2026.csv'
rows=list(csv.DictReader([r[0] for r in csv.reader(p.open())],delimiter='\t'))
areas={};mixed={'kwh':0,'connections':0,'rows':0};total=0
for r in rows:
 if r['PRODUCTSOORT']!='ELK':continue
 value=float(r['TOT_E'].replace(',','.'));count=int(r['AANSLUITINGEN_AANTAL']);total+=value
 start,end=r['POSTCODE'][:4],r['POSTCODE_EIND'][:4]
 if start!=end:target=mixed
 else:target=areas.setdefault(start,{'kwh':0,'connections':0,'rows':0})
 target['kwh']+=value;target['connections']+=count;target['rows']+=1
assert abs(sum(x['kwh'] for x in areas.values())+mixed['kwh']-total)<.001
out={'source':'Liander 2026','metric':'Standard annual consumption (SJV)','method':'Expected annual consumption based on previous-year use; not actual metered consumption','unit':'kWh/year','referenceDate':'2026-01-01','scope':'Small electricity connections in Liander service area only','license':'Liander 2026; Liander retains intellectual property and database rights','sourceUrl':'https://www.liander.nl/over-ons/open-data','sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'totalKwh':total,'crossPostcodeRemainder':mixed,'areas':areas}
(root/'public/data/annual-consumption.json').write_text(json.dumps(out,separators=(',',':')))
(root/'research/liander-annual-profile.json').write_text(json.dumps({k:v for k,v in out.items() if k!='areas'}|{'postcode4Count':len(areas)},indent=2))
print(len(areas),'four-digit postcode aggregates;',mixed['rows'],'cross-prefix rows retained separately;',total,'kWh standard annual consumption')

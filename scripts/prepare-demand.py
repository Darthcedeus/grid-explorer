"""Preserve CBS postcode-year observations and missing-value semantics."""
import json,pathlib,hashlib,collections,gzip
from display_geometry import display_geometry
root=pathlib.Path(__file__).resolve().parents[1];p=root/'research/raw/cbs-postcode-2023.json.gz';raw_bytes=gzip.decompress(p.read_bytes());d=json.loads(raw_bytes);out=[]
for f in d['features']:
 a=f['properties'];assert a['jaarcode']==2023
 raw=a.get('gemiddeld_elektriciteitsverbruik_woning');value=raw if isinstance(raw,(int,float)) and raw>=0 else None
 props={'postcode':str(a['postcode']),'year':2023,'kwhPerDwelling':value,'rawValue':raw,'missingReason':'Not yet published' if raw==-99995 else 'Suppressed or unavailable' if value is None else None,'dwellings':a['aantal_woningen'] if a.get('aantal_woningen',-1)>=0 else None}
 g=f['geometry'];assert g and g['type']=='MultiPolygon'
 out.append({'type':'Feature','id':props['postcode'],'properties':props,'geometry':display_geometry(g)})
assert len({f['id'] for f in out})==len(out)
meta={'source':'CBS Postcode4 via PDOK','year':2023,'unit':'kWh per dwelling per year','count':len(out),'publishedCount':sum(f['properties']['kwhPerDwelling'] is not None for f in out),'sourceUrl':'https://api.pdok.nl/cbs/postcode4/ogc/v1/collections/postcode4','attribution':'© CBS, © ESRI Nederland','rawSha256':hashlib.sha256(raw_bytes).hexdigest(),'geometryMethod':'Topology-aware precision reduction to 0.00001 degrees from archived source, Shapely valid_output; display only, not cadastral precision.','scope':'Published mean annual electricity use at private-dwelling connections. Excludes common-building consumption and electricity generated in the dwelling. Not a postcode total or real-time load. Geometry and energy values are both 2023. Negative missing/suppression codes remain null.'}
(root/'public/data/demand-postcodes.geojson').write_text(json.dumps({'type':'FeatureCollection','features':out},ensure_ascii=False,separators=(',',':')))
(root/'data/demand-meta.json').write_text(json.dumps(meta,indent=2));(root/'public/data/demand-meta.json').write_text(json.dumps(meta,indent=2));print(meta)

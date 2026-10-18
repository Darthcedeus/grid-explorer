"""Reproducible public operator GIS snapshot. No inferred OSM joins or voltages.

Run with Python 3. Raw responses are gzip archived; a failed layer aborts publication.
"""
import concurrent.futures
import datetime
import gzip
import hashlib
import json
from pathlib import Path
import time
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/data/operator-stations'
RAW = ROOT / 'research/raw/operator-gis'
SERVICES = {
    'liander': 'https://services1.arcgis.com/v6W5HAVrpgSg3vts/arcgis/rest/services/Liander_Open_Data_Elektra/FeatureServer',
    'stedin': 'https://services-eu1.arcgis.com/IQto421Ac9MzEmFT/arcgis/rest/services/KM_Gasvervangingsdata/FeatureServer',
}
LAYERS = [('liander',641,'High voltage'),('liander',642,'Medium voltage'),('liander',643,'Low voltage'),
          ('stedin',8,'High voltage'),('stedin',6,'Medium / low voltage'),('stedin',5,'Low voltage')]

def get(url, params):
    request = urllib.request.Request(url + '?' + urllib.parse.urlencode(params), headers={'User-Agent':'NetherlandsGridExplorer/1.0 public-source-snapshot'})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request,timeout=60) as response:
                data=json.load(response)
            if 'error' in data:
                raise ValueError(data['error'])
            return data
        except Exception:
            if attempt == 2: raise
            time.sleep(2*(attempt+1))

def text(value):
    return str(value).strip() if value is not None else ''

def collect(spec):
    provider,layer,category=spec
    key=f'{provider}-{layer}'
    url=f'{SERVICES[provider]}/{layer}'
    schema=get(url,{'f':'json'})
    count=get(url+'/query',{'where':'1=1','returnCountOnly':'true','f':'json'})['count']
    records=[]
    pages=[]
    for offset in range(0,count,2000):
        page=get(url+'/query',{'where':'1=1','outFields':'*','outSR':4326,'orderByFields':'OBJECTID ASC',
                              'resultOffset':offset,'resultRecordCount':2000,'returnGeometry':'true','f':'json'})
        batch=page.get('features',[])
        if not batch: raise ValueError(f'{key}: empty page at {offset}')
        records.extend(batch)
        pages.append(page)
    ids=[r['attributes']['OBJECTID'] for r in records]
    final_count=get(url+'/query',{'where':'1=1','returnCountOnly':'true','f':'json'})['count']
    if len(records)!=count or len(set(ids))!=count or final_count!=count:
        raise ValueError(f'{key}: pagination/count changed; discard and retry whole snapshot')
    at=datetime.datetime.now(datetime.timezone.utc).isoformat()
    raw=json.dumps({'schema':schema,'pages':pages,'retrievedAt':at},separators=(',',':'),ensure_ascii=False).encode()
    checksum=hashlib.sha256(raw).hexdigest()
    features=[]
    for record in records:
        a=record['attributes'];g=record.get('geometry') or {}
        oid=str(a['OBJECTID'])
        if provider=='liander':
            xy=[g.get('x'),g.get('y')]
            business=text(a.get('ID'))
            name=text(a.get('NAAM')) or f'Liander asset {business or oid}'
            voltage=text(a.get('SPANNINGSNIVEAUS')) or 'Not tagged'
            kind=text(a.get('FUNCTIE')) or category
            quality='Operator-published point; electrical connection and loading are not inferred.'
        else:
            vertices=[v for ring in g.get('rings',[]) for v in ring]
            if not vertices: raise ValueError(f'{key}/{oid}: missing polygon')
            xy=[(min(v[0] for v in vertices)+max(v[0] for v in vertices))/2,
                (min(v[1] for v in vertices)+max(v[1] for v in vertices))/2]
            business='';name=f'Stedin object {layer}/{oid}';voltage='Not tagged';kind=category
            quality='Centre of the operator footprint bounding box for display; not a surveyed connection point.'
        if any(not isinstance(v,(float,int)) for v in xy) or not (3<xy[0]<8 and 50<xy[1]<55):
            raise ValueError(f'{key}/{oid}: missing or unexpected coordinates {xy}')
        features.append({'type':'Feature','geometry':{'type':'Point','coordinates':[round(v,7) for v in xy]},
          'properties':{'id':f'{provider}:{layer}:{oid}','name':name,'voltage':voltage,'kind':kind,
                        'operator':provider.capitalize(),'sourceId':provider,'datasetKey':key,'sourceObjectId':oid,
                        'operatorAssetId':business,'sourceUrl':url+'/'+oid,'locationQuality':quality}})
    meta={'key':key,'provider':provider,'layer':layer,'category':category,'layerName':schema['name'],'count':count,
          'voltageCount':sum(f['properties']['voltage']!='Not tagged' for f in features),
          'namedCount':sum(bool(text(r['attributes'].get('NAAM'))) for r in records),
          'retrievedAt':at,'referenceDate':'2026-08' if provider=='stedin' else None,'sourceUrl':url,
          'sha256':checksum,'archive':f'research/raw/operator-gis/{key}-{checksum[:12]}.json.gz',
          'license':'CC BY 4.0 · Alliander' if provider=='liander' else 'Stedin public open data; source disclaimer applies',
          'geometryMethod':'Published point' if provider=='liander' else 'Polygon bounding-box centre; original polygons retained in raw archive',
          'limitations':'Objects, not unique sites. No telemetry, MVA, headroom or cross-source matches. OBJECTID is snapshot-specific.'}
    print(f'{key}: {count} objects; {meta["voltageCount"]} with published voltage',flush=True)
    return key,features,meta,raw

def main():
    # Finish all layers before replacing any public snapshot.
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        results=list(pool.map(collect,LAYERS))
    OUT.mkdir(parents=True,exist_ok=True);RAW.mkdir(parents=True,exist_ok=True)
    for key,features,meta,raw in results:
        with gzip.open(ROOT/meta['archive'],'wb') as f: f.write(raw)
        (OUT/f'{key}.geojson').write_text(json.dumps({'type':'FeatureCollection','features':features},separators=(',',':'),ensure_ascii=False))
    metadata={'datasets':[r[2] for r in results],'method':'Separate operator layers; never added to OSM counts or automatically joined.'}
    for path in [ROOT/'data/operator-stations-meta.json',OUT/'metadata.json']:
        path.write_text(json.dumps(metadata,indent=2,ensure_ascii=False)+'\n')

if __name__=='__main__': main()

import metadata from '@/data/operator-stations-meta.json';
export type StationProvider='osm'|'liander'|'stedin';
export type StationClass='high'|'medium'|'low';
export const STATION_PROVIDERS={liander:'Liander',stedin:'Stedin',osm:'OpenStreetMap'};
export const STATION_CLASSES={high:'High voltage',medium:'Distribution',low:'Low voltage'};
const LAYERS={liander:{high:641,medium:642,low:643},stedin:{high:8,medium:6,low:5}};
export function stationDatasetKey(provider:StationProvider,category:StationClass){return provider==='osm'?'osm':`${provider}-${LAYERS[provider][category]}`;}
export function stationDatasetUrl(key:string){return key==='osm'?'/data/stations.geojson':`/data/operator-stations/${key}.geojson`;}
export function stationMetadata(key?:string){return metadata.datasets.find(d=>d.key===key);}
export function stationSourceLabel(provider:StationProvider,category:StationClass){return `${STATION_PROVIDERS[provider]}${provider==='osm'?'':` · ${STATION_CLASSES[category]}`}`;}

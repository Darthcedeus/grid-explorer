'use client';
import {BORDER_ENDS,borderFlow} from '@/lib/grid/replay';
import {NationalReplay} from './national-replay';
import {useTheme} from 'next-themes';
import {useEffect,useRef,useState} from 'react';
import type {Map as MapInstance,Marker,GeoJSONSource,ExpressionSpecification} from 'maplibre-gl';
import type {Asset,Interval} from '@/lib/grid/types';
import {COLORS,CITIES,PROVINCES,allocate} from '@/lib/grid/domain';
import {Plus,Minus,LocateFixed} from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';
import {PRODUCER_COLORS,type PointData,type Producer,type Station,type DemandData} from '@/lib/grid/expansion';
import {REGIONAL_METRICS,type RegionalData,type RegionalMetric} from '@/lib/grid/regional';
import {ENEXIS_METRICS,ENEXIS_COLORS,type EnexisMap,type EnexisMetric} from '@/lib/grid/enexis';
import type {NetworkData} from '@/lib/grid/network';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
export type MapLayer='stations'|'network'|'generation'|'demand'|'exchanges';
type Props={enexis:EnexisMap|null;enexisMetric:EnexisMetric;enexisDate:string;stationLabel:string;playing:boolean;intervals:Interval[];source:string;regional:RegionalData|null;regionalMetric:RegionalMetric;regionalActive:boolean;producers:PointData<Producer>;stations:PointData<Station>;mappedProducers:boolean;showStations:boolean;demand:DemandData|null;network:NetworkData;assets:Asset[];layer:MapLayer;selected:string;onSelect:(id:string)=>void;interval:Interval;demo:boolean;};
const borderNames:Record<string,string>={belgium:'Belgium',germany:'Germany',denmark:'Denmark',norway:'Norway',united_kingdom:'Great Britain'};
export default function GridMap({enexis,enexisMetric,enexisDate,stationLabel,regional,regionalMetric,regionalActive,producers,stations,mappedProducers,showStations,demand,network,assets,layer,selected,onSelect,interval,demo,playing,intervals,source}:Props){
 const intervalRef=useRef(interval);intervalRef.current=interval;
 const {resolvedTheme}=useTheme();const dark=resolvedTheme==='dark';
 const el=useRef<HTMLDivElement>(null);const map=useRef<MapInstance|null>(null);const markers=useRef<Marker[]>([]);const lib=useRef<typeof import('maplibre-gl')|null>(null);const [ready,setReady]=useState(false);const [error,setError]=useState('');const selectRef=useRef(onSelect);selectRef.current=onSelect;const layerRef=useRef(layer);layerRef.current=layer;
 useEffect(()=>{let cancelled=false;let instance:MapInstance|null=null;let resizeObserver:ResizeObserver|null=null;
  const startupTimeout=setTimeout(()=>{if(!cancelled)setError('The map is taking too long to load. Reload the page, or use the searchable list to explore the records.');},20000);
  import('maplibre-gl').then(m=>{if(cancelled||!el.current)return;
  // MapLibre's relative worker discovery breaks after bundling. Let Vite
  // emit the worker and its dependencies, then use that exact asset URL.
  m.setWorkerUrl(mapWorkerUrl);
  lib.current=m;instance=new m.Map({container:el.current,center:[5.15,52.3],zoom:6.25,minZoom:4,maxZoom:16,attributionControl:{compact:true},style:{version:8,sources:{countries:{type:'geojson',data:'/data/countries.geojson',attribution:'Natural Earth · public domain'},provinces:{type:'geojson',data:'/data/provinces.geojson',attribution:'PDOK / Kadaster'}},layers:[{id:'water',type:'background',paint:{'background-color':'#e8f2f6'}},{id:'land',type:'fill',source:'countries',paint:{'fill-color':'#f6f8f7'}},{id:'country-lines',type:'line',source:'countries',paint:{'line-color':'#bfd0d9','line-width':1.2}},{id:'province-fill',type:'fill',source:'provinces',paint:{'fill-color':'#fbfcfc','fill-opacity':.95}},{id:'province-lines',type:'line',source:'provinces',paint:{'line-color':'#c9d8df','line-width':.8}}]}});map.current=instance;
  // Tabs and responsive layout can change the canvas size after startup.
  resizeObserver=new ResizeObserver(()=>{if(!cancelled&&el.current?.clientWidth&&el.current?.clientHeight)instance?.resize();});
  resizeObserver.observe(el.current);
  instance.on('load',()=>{if(!cancelled){clearTimeout(startupTimeout);setError('');instance!.addSource('flows',{type:'geojson',data:{type:'FeatureCollection',features:[]}});instance!.addLayer({id:'flow-lines',type:'line',source:'flows',paint:{'line-color':['get','color'],'line-width':['get','width'],'line-opacity':.7}});instance!.addSource('flow-particles',{type:'geojson',data:{type:'FeatureCollection',features:[]}});instance!.addLayer({id:'flow-particles',type:'circle',source:'flow-particles',paint:{'circle-radius':3,'circle-color':['get','color'],'circle-stroke-color':'#fff','circle-stroke-width':1}});instance!.addSource('network',{type:'geojson',data:{type:'FeatureCollection',features:[]},attribution:'<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a> · ODbL'});
  const voltageColor:ExpressionSpecification=['match',['get','voltageKv'],380,'#9d3d92',220,'#df8f16',150,'#3286c1',110,'#15978c','#718490'];
  instance!.addLayer({id:'network-lines',type:'line',source:'network',filter:['==',['geometry-type'],'LineString'],paint:{'line-color':voltageColor,'line-width':2,'line-opacity':.8}});
  instance!.addLayer({id:'network-stations',type:'circle',source:'network',filter:['==',['geometry-type'],'Point'],paint:{'circle-color':voltageColor,'circle-radius':5,'circle-stroke-color':'#fff','circle-stroke-width':1.5}});
  for(const id of ['network-lines','network-stations']){instance!.on('click',id,e=>{if(layerRef.current==='network'&&e.features?.[0])selectRef.current('network:'+e.features[0].properties.id);});instance!.on('mouseenter',id,()=>{instance!.getCanvas().style.cursor='pointer';});instance!.on('mouseleave',id,()=>{instance!.getCanvas().style.cursor='';});}
  for(const kind of ['stations','producers']){instance!.addSource(kind,{type:'geojson',data:{type:'FeatureCollection',features:[]},attribution:kind==='stations'?'© OpenStreetMap contributors · ODbL | Alliander · CC BY 4.0 | Stedin open data':'© OpenStreetMap contributors · ODbL'});instance!.addLayer({id:kind+'-points',type:'circle',source:kind,paint:{'circle-color':kind==='stations'?'#617684':['match',['get','technology'],...Object.entries(PRODUCER_COLORS).flat(),'#84949f'] as unknown as ExpressionSpecification,'circle-radius':kind==='stations'?3:5,'circle-stroke-color':'#fff','circle-stroke-width':1,'circle-opacity':.85}});instance!.on('click',kind+'-points',e=>{if(!e.features?.[0])return;if(kind==='stations'&&instance!.queryRenderedFeatures(e.point,{layers:['producers-points']}).length)return;selectRef.current((kind==='stations'?'station:':'producer:')+e.features[0].properties.id);});instance!.on('mouseenter',kind+'-points',()=>{instance!.getCanvas().style.cursor='pointer';});instance!.on('mouseleave',kind+'-points',()=>{instance!.getCanvas().style.cursor='';});}
  instance!.addSource('demand-postcodes',{type:'geojson',data:{type:'FeatureCollection',features:[]},attribution:'© CBS, © ESRI Nederland'});
  instance!.addLayer({id:'demand-fill',type:'fill',source:'demand-postcodes',paint:{'fill-color':['case',['==',['get','kwhPerDwelling'],null],'#cad3da',['interpolate',['linear'],['coalesce',['get','kwhPerDwelling'],0],0,'#eef7fb',1000,'#c8e3f1',2000,'#6fb3d2',3000,'#2c6ea3',4000,'#583875']],'fill-opacity':.85}});
  instance!.addLayer({id:'demand-outline',type:'line',source:'demand-postcodes',paint:{'line-color':'#fff','line-width':.4}});
  instance!.on('click','demand-fill',e=>{if(layerRef.current==='demand'&&e.features?.[0])selectRef.current('postcode:'+e.features[0].properties.postcode);});
  instance!.addSource('municipalities',{type:'geojson',data:{type:'FeatureCollection',features:[]},attribution:'CBS / PDOK · 2025 · CC0 geometry'});
  instance!.addLayer({id:'municipal-fill',type:'fill',source:'municipalities',paint:{'fill-color':'#c8e3f1','fill-opacity':.88}});
  instance!.addLayer({id:'municipal-outline',type:'line',source:'municipalities',paint:{'line-color':'#fff','line-width':.7}});
  instance!.on('click','municipal-fill',e=>{if(e.features?.[0])selectRef.current('municipality:'+e.features[0].properties.code);});
  instance!.on('mouseenter','municipal-fill',()=>{instance!.getCanvas().style.cursor='pointer';});
  instance!.on('mouseleave','municipal-fill',()=>{instance!.getCanvas().style.cursor='';});
  instance!.addSource('enexis-areas',{type:'geojson',data:{type:'FeatureCollection',features:[]},attribution:'Enexis · CBS / PDOK 2026 boundaries · CC0'});
  instance!.addLayer({id:'enexis-fill',type:'fill',source:'enexis-areas',paint:{'fill-color':'#67b698','fill-opacity':.9}});
  instance!.addLayer({id:'enexis-outline',type:'line',source:'enexis-areas',paint:{'line-color':'#fff','line-width':.5}});
  instance!.on('click','enexis-fill',e=>{if(e.features?.[0])selectRef.current('enexis:'+e.features[0].properties.code);});
  instance!.on('mouseenter','enexis-fill',()=>{instance!.getCanvas().style.cursor='pointer';});
  instance!.on('mouseleave','enexis-fill',()=>{instance!.getCanvas().style.cursor='';});
  setReady(true);}});
  instance.on('error',()=>{if(!cancelled){clearTimeout(startupTimeout);setError('The map could not load. Reload the page, or use the searchable list to explore the same records.');}});
  instance.on('click','province-fill',e=>{if(e.features?.[0]&&layerRef.current==='demand'&&typeof map.current?.getPaintProperty('province-fill','fill-color')!=='string')selectRef.current('province:'+e.features[0].properties.naam);});
 }).catch(()=>{if(!cancelled){clearTimeout(startupTimeout);setError('Map unavailable. All records remain accessible in the list.');}});
 return()=>{cancelled=true;clearTimeout(startupTimeout);resizeObserver?.disconnect();instance?.remove();map.current=null;};
 },[]);
 useEffect(()=>{if(!ready||!map.current)return;const m=map.current;
  m.setPaintProperty('water','background-color',dark?'#0c1b29':'#e8f2f6');
  m.setPaintProperty('land','fill-color',dark?'#152735':'#f6f8f7');
  m.setPaintProperty('country-lines','line-color',dark?'#42596c':'#bfd0d9');
  m.setPaintProperty('province-lines','line-color',dark?'#496174':'#c9d8df');
 },[ready,dark]);
 useEffect(()=>{if(!ready||!map.current)return;const m=map.current,info=ENEXIS_METRICS[enexisMetric];
  (m.getSource('enexis-areas') as GeoJSONSource).setData(enexis||{type:'FeatureCollection',features:[]});
  const ramp:unknown[]=['interpolate',['linear'],['coalesce',['get','value'],0]];info.stops.forEach((n,i)=>ramp.push(n,ENEXIS_COLORS[i]));
  m.setPaintProperty('enexis-fill','fill-color',['case',['==',['get','value'],null],'#cad3da',ramp] as unknown as ExpressionSpecification);
  const id=selected.startsWith('enexis:')?selected.slice(7):'';
  m.setPaintProperty('enexis-outline','line-color',['case',['==',['get','code'],id],dark?'#fff':'#14283b',dark?'#526677':'#fff']);
  m.setPaintProperty('enexis-outline','line-width',['case',['==',['get','code'],id],2.5,.4]);
  const f=enexis?.features.find(f=>f.id===id);if(f){const pts=f.geometry.coordinates.flat(2);let west=Infinity,east=-Infinity,south=Infinity,north=-Infinity;for(const [x,y] of pts){west=Math.min(west,x);east=Math.max(east,x);south=Math.min(south,y);north=Math.max(north,y);}const centre:[number,number]=[(west+east)/2,(south+north)/2];if(!m.getBounds().contains(centre))m.easeTo({center:centre,duration:400});}
 },[ready,enexis,enexisMetric,selected,dark]);
 useEffect(()=>{if(!ready||!map.current)return;const m=map.current,info=REGIONAL_METRICS[regionalMetric];
  (m.getSource('municipalities') as GeoJSONSource).setData(regionalActive&&regional?regional:{type:'FeatureCollection',features:[]});
  const ramp:unknown[]=['interpolate',['linear'],['coalesce',['get',regionalMetric],0]];info.stops.forEach((n,i)=>ramp.push(n,info.colors[i]));
  m.setPaintProperty('municipal-fill','fill-color',['case',['==',['get',regionalMetric],null],'#cad3da',ramp] as unknown as ExpressionSpecification);
  const id=selected.startsWith('municipality:')?selected.slice(13):'';
  m.setPaintProperty('municipal-outline','line-color',['case',['==',['get','code'],id],dark?'#ffffff':'#172f43',dark?'#526677':'#fff']);
  m.setPaintProperty('municipal-outline','line-width',['case',['==',['get','code'],id],2.5,.7]);
  const f=regional?.features.find(f=>f.id===id);if(regionalActive&&f){const coords=f.geometry.coordinates.flat(2);const xs=coords.map(p=>p[0]),ys=coords.map(p=>p[1]);const center:[number,number]=[(Math.min(...xs)+Math.max(...xs))/2,(Math.min(...ys)+Math.max(...ys))/2];if(!m.getBounds().contains(center))m.easeTo({center,duration:400});}
 },[ready,regional,regionalMetric,regionalActive,selected,dark]);
 useEffect(()=>{if(!ready||!map.current)return;const m=map.current;const empty={type:'FeatureCollection' as const,features:[]};
  (m.getSource('producers') as GeoJSONSource).setData(layer==='generation'&&mappedProducers&&!regionalActive&&!enexis?producers:empty);
  (m.getSource('stations') as GeoJSONSource).setData(layer==='stations'||layer==='generation'&&showStations?stations:empty);
  for(const [kind,prefix,data] of [['producers','producer:',producers],['stations','station:',stations]] as const){m.setPaintProperty(kind+'-points','circle-radius',['case',['==',['get','id'],selected.startsWith(prefix)?selected.slice(prefix.length):''],9,kind==='stations'?3:5]);const f=data.features.find(f=>selected===prefix+f.properties.id);if(f&&!m.getBounds().contains(f.geometry.coordinates))m.easeTo({center:f.geometry.coordinates,duration:400});}
 },[ready,layer,producers,stations,mappedProducers,showStations,selected,regionalActive,enexis]);
 useEffect(()=>{if(!ready||!map.current)return;const m=map.current;
  (m.getSource('demand-postcodes') as GeoJSONSource).setData(layer==='demand'&&!demo&&demand?demand:{type:'FeatureCollection',features:[]});
  m.setPaintProperty('demand-outline','line-color',['case',['==',['get','postcode'],selected.slice(9)],dark?'#ffffff':'#172f43',dark?'#526677':'#fff']);
  m.setPaintProperty('demand-outline','line-width',['case',['==',['get','postcode'],selected.slice(9)],2.5,.4]);
  const f=demand?.features.find(f=>selected===`postcode:${f.id}`);if(layer==='demand'&&!demo&&f){const coords=f.geometry.coordinates[0][0];const x=coords.reduce((v,p)=>v+p[0],0)/coords.length,y=coords.reduce((v,p)=>v+p[1],0)/coords.length;if(!m.getBounds().contains([x,y]))m.easeTo({center:[x,y],duration:400});}
 },[ready,demand,layer,demo,selected,dark]);
 useEffect(()=>{if(!ready||!map.current)return;const m=map.current;
  (m.getSource('network') as GeoJSONSource).setData(layer==='network'?network:{type:'FeatureCollection',features:[]});
  const id=selected.startsWith('network:')?selected.slice(8):'';
  m.setPaintProperty('network-lines','line-width',['case',['==',['get','id'],id],5,2]);
  m.setPaintProperty('network-stations','circle-radius',['case',['==',['get','id'],id],8,5]);
  const feature=network.features.find(f=>f.properties.id===id);
  if(layer==='network'&&feature){const coords=feature.geometry.type==='Point'?[feature.geometry.coordinates]:feature.geometry.coordinates;const centre=coords[Math.floor(coords.length/2)] as [number,number];if(!m.getBounds().contains(centre))m.easeTo({center:centre,duration:400});}
 },[ready,network,layer,selected]);
 useEffect(()=>{if(!ready||!map.current||!lib.current)return;const m=map.current,l=lib.current;markers.current.forEach(x=>x.remove());markers.current=[];
 const add=(position:[number,number],element:HTMLElement,rotation?:number)=>{markers.current.push(new l.Marker({element,rotation,rotationAlignment:rotation===undefined?'viewport':'map'}).setLngLat(position).addTo(m));};
 const label=(name:string,position:[number,number],cls='map-city')=>{const e=document.createElement('span');e.className=cls;e.textContent=name;add(position,e);};
 label('N O R T H  S E A',[3.3,53.35],'ocean-label');label('GERMANY',[7.0,51.45],'map-country');label('BELGIUM',[4.55,50.65],'map-country');
 CITIES.filter(c=>c.name!=='Other Netherlands').forEach(c=>{if(layer!=='demand')label(c.name,[c.lon,c.lat]);});
 if(layer==='generation'&&!mappedProducers)assets.forEach(a=>{const b=document.createElement('button');b.className='asset-dot'+(selected===a.id?' selected':'');b.style.background=COLORS[a.technology]||'#789';const size= Math.max(12,Math.min(30,9+Math.sqrt(a.capacityMw)*.46));b.style.width=`${size}px`;b.style.height=`${size}px`;b.setAttribute('aria-label',`${a.name}, ${a.technology}, ${a.capacityMw} MW historical or stated capacity`);b.title=`${a.name} · ${a.capacityMw.toLocaleString()} MW capacity`;b.onclick=()=>selectRef.current(a.id);add([a.lon,a.lat],b);});
 if(layer==='demand'&&demo)CITIES.filter(c=>c.name!=='Other Netherlands').forEach(c=>{const b=document.createElement('button');b.className='city-demand'+(selected===`city:${c.name}`?' selected':'');const strong=document.createElement('strong');strong.textContent=c.name;b.appendChild(strong);const v=document.createElement('span');v.textContent=demo&&interval.load!==null?`${Math.round(interval.load*c.weight/100).toLocaleString()} MW · demo`:'Demand unavailable';b.appendChild(v);b.onclick=()=>selectRef.current(`city:${c.name}`);add([c.lon,c.lat],b);});
 const values=demo&&interval.load!==null?allocate(interval.load,PROVINCES):[];
 // Arbitrary scenario weights are visually distinct and never used in recorded mode.
 if(layer==='demand'&&demo){const expression:any[]=['match',['get','naam']];for(const r of values){expression.push(r.name,r.value>1800?'#68b9b0':r.value>1000?'#a0d2c9':'#d1e8e2');}expression.push('#d1e8e2');m.setPaintProperty('province-fill','fill-color',expression as ExpressionSpecification);}else m.setPaintProperty('province-fill','fill-color',dark?'#1b3040':'#fbfcfc');
 const features:any[]=[];
 if(layer==='exchanges')Object.entries(BORDER_ENDS).forEach(([id,end])=>{
  const v=interval.borders[id],flow=borderFlow(id,v);
  if(flow){features.push({type:'Feature',properties:{id,color:flow.color,width:flow.width},geometry:{type:'LineString',coordinates:flow.coordinates}});
   if(flow.moving){const [from,to]=flow.coordinates;const midpoint:[number,number]=[(from[0]+to[0])/2,(from[1]+to[1])/2];const arrow=document.createElement('span');arrow.className='flow-arrow';arrow.textContent='➤';arrow.style.color=flow.color;arrow.setAttribute('aria-hidden','true');const rotation=Math.atan2(-(to[1]-from[1]),(to[0]-from[0])*Math.cos(midpoint[1]*Math.PI/180))*180/Math.PI;add(midpoint,arrow,rotation);}}
  const b=document.createElement('button');b.className='border-label';const n=document.createElement('strong');n.textContent=borderNames[id];b.appendChild(n);const t=document.createElement('span');t.textContent=flow?`${Math.abs(flow.value).toLocaleString('en',{maximumFractionDigits:0})} MW ${flow.value===0?'no net flow':flow.value>0?'to NL':'from NL'}`:'Not reported';b.appendChild(t);b.onclick=()=>selectRef.current('border:'+id);add(end,b);
 });
 (m.getSource('flows') as GeoJSONSource)?.setData({type:'FeatureCollection',features});
 },[ready,assets,layer,selected,interval,demo,mappedProducers,dark]);
 // Decorative motion encodes observed direction only, never electricity speed.
 useEffect(()=>{
  if(!ready||!map.current)return;
  const m=map.current,preference=window.matchMedia('(prefers-reduced-motion: reduce)');let timer:ReturnType<typeof setInterval>|undefined;
  const clear=()=>{if(timer)clearInterval(timer);timer=undefined;if(map.current===m)(m.getSource('flow-particles') as GeoJSONSource)?.setData({type:'FeatureCollection',features:[]});};
  const start=()=>{clear();if(!playing||layer!=='exchanges'||preference.matches)return;const began=performance.now();
   timer=setInterval(()=>{const phase=(performance.now()-began)/4000;const features=Object.entries(intervalRef.current.borders).flatMap(([id,value])=>{const f=borderFlow(id,value);if(!f?.moving)return [];const [a,b]=f.coordinates;return [0,1,2].map(n=>{const t=(phase+n/3)%1;return {type:'Feature' as const,properties:{color:f.color},geometry:{type:'Point' as const,coordinates:[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]}};});});(m.getSource('flow-particles') as GeoJSONSource)?.setData({type:'FeatureCollection',features});},50);
  };start();preference.addEventListener('change',start);return()=>{clear();preference.removeEventListener('change',start);};
 },[ready,playing,layer]);
 useEffect(()=>{if(!ready||!map.current)return;const a=assets.find(x=>x.id===selected);if(a&&!map.current.getBounds().contains([a.lon,a.lat]))map.current.easeTo({center:[a.lon,a.lat],duration:400});},[selected,assets,ready]);
 return <div className="map-surface"><div className="actual-map" style={{position:'absolute',inset:0,width:'100%',height:'100%'}} ref={el} aria-label="Interactive geographic map of the Netherlands" />{(!ready||error)&&<div className="map-error" role="status">{error||'Loading geographic layers…'}</div>}<div className="map-caption"><span>{enexis?ENEXIS_METRICS[enexisMetric].label:regionalActive?REGIONAL_METRICS[regionalMetric].label:layer==='stations'?'Grid stations':layer==='network'?'High-voltage grid':layer==='generation'?'Generation assets':layer==='demand'?'Regional demand':'Cross-border physical flows'}</span><small>{enexis?`Enexis · ${enexisDate} · static neighbourhood aggregates`:regionalActive?'2025 · annual CBS statistics · preliminary':layer==='stations'?stationLabel+' · static source records':layer==='network'?'OSM snapshot · 110–380 kV · no live loading':layer==='generation'?(mappedProducers?'Solar farms & wind turbines · static locations':'Marker size = nameplate capacity'):layer==='demand'?(demo?'Illustrative allocation · not measured':'2023 · annual residential kWh / dwelling'):'Schematic connections · not cable routes'}</small></div>{(layer==='generation'||layer==='demand'||layer==='exchanges')&&<NationalReplay interval={interval} intervals={intervals} playing={playing} demo={demo} source={source}/>}<div className="map-controls"><button aria-label="Zoom in" onClick={()=>map.current?.zoomIn()}><Plus size={18}/></button><button aria-label="Zoom out" onClick={()=>map.current?.zoomOut()}><Minus size={18}/></button><button aria-label="Reset map view" onClick={()=>map.current?.easeTo({center:[5.15,52.3],zoom:6.25})}><LocateFixed size={18}/></button></div><div className="map-key" hidden={regionalActive||!!enexis}><span className="key-ring"/> {layer==='stations'?stationLabel+' · no loading or connection capacity':layer==='network'?'Lines = mapped sections · dots = substation locations':layer==='generation'?(mappedProducers?(showStations?'Coloured = producers · grey = stations · no live output':'Wind & solar locations · no live site output'):'Registry location · output may be unknown'):layer==='demand'?(demo?'Illustrative allocation':'CBS 2023 · annual mean per dwelling · grey = missing'):'Teal → NL · purple → abroad · width = MW · motion = direction, not speed'}</div>{enexis&&<div className="regional-legend enexis-legend"><strong>{ENEXIS_METRICS[enexisMetric].unit}</strong><div className="legend-gradient" style={{background:`linear-gradient(to right,${ENEXIS_COLORS.map((c,i)=>`${c} ${ENEXIS_METRICS[enexisMetric].stops[i]/ENEXIS_METRICS[enexisMetric].stops[4]*100}%`).join(',')})`}}/><div className="enexis-legend-labels"><span>0</span><span>{ENEXIS_METRICS[enexisMetric].stops.at(-1)}+</span></div><small>2026 boundaries · uncoloured = no matching record<br/>Unlocated records stay in the list</small></div>}{regionalActive&&<div className="regional-legend"><strong>{REGIONAL_METRICS[regionalMetric].unit}</strong><div className="legend-gradient" style={{background:`linear-gradient(to right,${REGIONAL_METRICS[regionalMetric].colors.map((c,i)=>`${c} ${REGIONAL_METRICS[regionalMetric].stops[i]/REGIONAL_METRICS[regionalMetric].stops[4]*100}%`).join(',')})`}}/><div className="legend-ticks">{REGIONAL_METRICS[regionalMetric].stops.map((n,i)=><span key={n} style={{left:`${n/REGIONAL_METRICS[regionalMetric].stops[4]*100}%`}}>{n.toLocaleString()}{i===4?'+':''}</span>)}</div><small><i/> Not published · 2025 boundaries</small></div>}</div>;
}

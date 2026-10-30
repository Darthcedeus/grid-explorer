export const ENTSOE_URL='https://web-api.tp.entsoe.eu/api';
export const NL_EIC='10YNL----------L';
export const ENTSOE_PRODUCTS={
 load:{label:'Actual national load',documentType:'A65',processType:'A16',domain:'outBiddingZone_Domain'},
 loadForecast:{label:'Day-ahead load forecast',documentType:'A65',processType:'A01',domain:'outBiddingZone_Domain'},
 generation:{label:'Actual generation by type',documentType:'A75',processType:'A16',domain:'in_Domain'},
 renewablesForecast:{label:'Day-ahead wind and solar forecast',documentType:'A69',processType:'A01',domain:'in_Domain'},
 prices:{label:'Day-ahead electricity prices',documentType:'A44',processType:'',domain:'in_Domain'},
} as const;
export type EntsoeProduct=keyof typeof ENTSOE_PRODUCTS;
export type EntsoePoint={start:string;end:string;value:number|null};
export type EntsoeSeries={id:string;psrType:string|null;direction:'generation'|'consumption'|'unspecified';unit:string;curveType:string;points:EntsoePoint[]};
export type EntsoeData={documentId:string;revision:string;createdAt:string;series:EntsoeSeries[]};
export type EntsoeResult=EntsoeData&{product:EntsoeProduct;day:string;status:'connected'|'no_data';fetchedAt:string;delivery:'upstream'|'cache';warning:string|null;sourceUrl:string};
export const PSR_NAMES:Record<string,string>={B01:'Biomass',B02:'Lignite',B03:'Coal-derived gas',B04:'Fossil gas',B05:'Hard coal',B06:'Oil',B07:'Oil shale',B08:'Peat',B09:'Geothermal',B10:'Pumped storage',B11:'Hydro run-of-river',B12:'Hydro reservoir',B13:'Marine',B14:'Nuclear',B15:'Other renewable',B16:'Solar',B17:'Waste',B18:'Wind offshore',B19:'Wind onshore',B20:'Other',B25:'Energy storage'};

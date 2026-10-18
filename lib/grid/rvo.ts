export interface RvoProject {
 id:string;round:string;technology:string;theme:string;applicant:string;address:string;postcode:string;place:string;municipality:string;province:string;installation:string;realized:boolean|null;commissioningYear:number|null;commissioningNote:string;
}
export interface RvoData {meta:{sourceUrl:string;referenceDate:string;count:number;retrievedAt:string;sha256:string};projects:RvoProject[];}
export function rvoMatches(p:RvoProject,query:string,technology:string,status:string,installation:string){
 return (technology==='All'||p.technology===technology)&&(status==='All'||(status==='Realised'?p.realized===true:p.realized===false))&&(installation==='All'||p.technology==='Solar'&&p.installation===installation)&&`${p.id} ${p.applicant} ${p.address} ${p.postcode} ${p.place} ${p.municipality} ${p.province}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
}
export function publicRvoValue(value:string){return !value||value.includes('*')?'Not disclosed':value;}

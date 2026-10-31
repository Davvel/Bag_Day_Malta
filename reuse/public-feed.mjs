import {REUSE_CONFIG} from './config.mjs?v=1.1.128';
import {validatePublicFeed,selectPublicItems} from './feed-data.mjs?v=1.1.128';
let cached=null,loadedAt=0,pending=null,epoch=0;
export function invalidatePublicFeed(){cached=null;loadedAt=0;epoch++;pending=null}
export async function loadPublicFeed({force=false}={}){
 if(!force&&cached&&Date.now()-loadedAt<30000)return cached;
 if(pending)return pending;
 const startedEpoch=epoch;
 const operation=(async()=>{const r=await fetch(REUSE_CONFIG.apiBase+'/api/v1/public/reuse/feed.json',{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(25000)});let data;try{data=await r.json()}catch{throw Error('The published REUSE file is unavailable. Please try again.')}if(!r.ok)throw Object.assign(Error(data.error?.message||'The published REUSE file is unavailable.'),{status:r.status});data=validatePublicFeed(data);if(startedEpoch===epoch){cached=data;loadedAt=Date.now()}return data})();
 pending=operation;try{return await operation}finally{if(pending===operation)pending=null}
}
export async function publishedRequest(path){const u=new URL(path,'https://reuse.invalid');const data=await loadPublicFeed();if(u.pathname==='/public/reuse/localities')return {items:data.localities.map(r=>({...r}))};return selectPublicItems(data,{locality_id:u.searchParams.get('locality_id')||'',q:u.searchParams.get('q')||'',limit:u.searchParams.get('limit')||100,offset:u.searchParams.get('offset')||0})}

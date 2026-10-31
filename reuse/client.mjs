import {publishedRequest,invalidatePublicFeed} from './public-feed.mjs?v=1.1.114';
import {REUSE_CONFIG} from './config.mjs?v=1.1.114';
export class ReuseError extends Error{constructor(message,status){super(message);this.status=status}}
export async function request(path,{method='GET',body}={}){
 if(method==='GET'&&/^\/public\/reuse\/(?:items|localities)(?:\?|$)/.test(path))return publishedRequest(path);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
 try{const r=await fetch(REUSE_CONFIG.apiBase+'/api/v1'+path,{method,credentials:'include',cache:'no-store',signal:controller.signal,headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});let data;try{data=await r.json()}catch{throw new ReuseError('REUSE is temporarily unavailable. Please try again later.',r.status)}if(!r.ok)throw new ReuseError(data.error?.message||data.message||'Please try again.',r.status);if(method!=='GET')invalidatePublicFeed();if(r.headers.get('X-Reuse-Publication')==='pending')data.publication_pending=true;return data}
 catch(e){if(e instanceof ReuseError)throw e;throw new ReuseError('Could not connect to REUSE. Check your connection and try again.',0)}finally{clearTimeout(timer)}
}
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

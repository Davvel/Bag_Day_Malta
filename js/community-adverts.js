(() => {
 'use strict';
 const ENDPOINT='https://api.bagdaymalta.eu/api/v1/public/community-adverts';
 const CACHE_KEY='bag-day-community-adverts-v1',REFRESH_MS=60000;
 let adverts=[],capacity=3,lastAttempt=0,inFlight=null;
 function date(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const n=new Date(value+'T00:00:00Z');return Number.isFinite(n.getTime())&&n.toISOString().slice(0,10)===value}
 function web(value,optional=false){if(optional&&(value===null||value===''))return true;try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password}catch{return false}}
 function validate(data){
  if(data?.format_version!==1||!Number.isInteger(data.maximum_sponsor_positions)||data.maximum_sponsor_positions<1||data.maximum_sponsor_positions>1000||!Array.isArray(data.items))throw Error('Invalid community advert publication');
  const ids=new Set();
  for(const a of data.items){if(!a||typeof a.advert_id!=='string'||!/^[-A-Za-z0-9_]{1,100}$/.test(a.advert_id)||ids.has(a.advert_id)||typeof a.organisation_name!=='string'||!a.organisation_name.trim()||typeof a.display_text!=='string'||!a.display_text.trim()||!web(a.destination_url)||!web(a.banner_url,true)||!date(a.start_date)||!date(a.end_date)||a.start_date>a.end_date)throw Error('Invalid community advert record');ids.add(a.advert_id)}
  return data;
 }
 function activate(data){adverts=data.items;capacity=data.maximum_sponsor_positions;window.dispatchEvent(new Event('bag-day-community-ready'))}
 try{const saved=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');if(saved){validate(saved);activate(saved);const checked=Number(saved.checked_at);if(checked>0&&checked<=Date.now())lastAttempt=checked}}catch{}
 async function refresh(force=false){
  if(inFlight)return inFlight;if(!force&&Date.now()-lastAttempt<REFRESH_MS)return;
  lastAttempt=Date.now();inFlight=(async()=>{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
   try{const r=await fetch(ENDPOINT,{credentials:'omit',cache:'no-cache',signal:controller.signal});if(!r.ok)throw Error('Community adverts unavailable');const data=validate(await r.json());activate(data);try{localStorage.setItem(CACHE_KEY,JSON.stringify({...data,checked_at:Date.now()}))}catch{}}
   catch{/* The existing paid placement and any valid offline pool remain usable. */}
   finally{clearTimeout(timer)}
  })().finally(()=>inFlight=null);return inFlight;
 }
 window.BAG_DAY_COMMUNITY={refresh,snapshot:()=>({adverts,capacity})};
 refresh();setInterval(()=>{if(!document.hidden)refresh()},REFRESH_MS);
 window.addEventListener('online',()=>refresh(true));document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
})();

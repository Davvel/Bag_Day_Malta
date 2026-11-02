// Uses the same locality names and reverse-geocoding service as Bag Day.
const normal=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[ħĦ]/g,'h').replace(/[^a-z0-9]/gi,'').toLowerCase();
export function matchLocality(name,localities,known=[]){
 const key=normal(name);
 if(!key)return null;
 const direct=localities.find(l=>normal(l.name)===key);
 if(direct)return direct;
 const row=known.find(r=>[r[0],...(r[3]||[])].some(alias=>normal(alias)===key));
 return row?localities.find(l=>[row[0],...(row[3]||[])].some(alias=>normal(alias)===normal(l.name)))||null:null;
}
export function identifyLocality(address,latitude,localities,known=[]){
 const candidates=[address.city,address.town,address.village,address.municipality,address.suburb,address.neighbourhood,address.city_district,address.county].filter(Boolean);
 for(let name of candidates){
  if(['rabat','zebbug'].includes(normal(name)))name+=(latitude>36.015?' (Gozo)':' (Malta)');
  const match=matchLocality(name,localities,known);
  if(match)return match;
 }
 return null;
}
export async function detectLocality(localities,known=[],{geolocation=globalThis.navigator?.geolocation,fetcher=globalThis.fetch}={}){
 if(!geolocation)return null;
 try{
  const position=await new Promise((resolve,reject)=>geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:false,timeout:10000,maximumAge:60000}));
  const {latitude,longitude,accuracy}=position.coords;
  if(!Number.isFinite(accuracy)||accuracy<0||accuracy>2000)return null;
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||latitude<35.78||latitude>36.09||longitude<14.17||longitude>14.6)return null;
  const url=new URL('https://nominatim.openstreetmap.org/reverse');
  url.search=new URLSearchParams({format:'jsonv2',addressdetails:'1',zoom:'14',lat:String(latitude),lon:String(longitude)});
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
  try{
   const response=await fetcher(url,{headers:{'Accept-Language':'en'},signal:controller.signal});
   if(!response.ok)return null;
   return identifyLocality((await response.json()).address||{},latitude,localities,known);
  }finally{clearTimeout(timer)}
 }catch{return null}
}

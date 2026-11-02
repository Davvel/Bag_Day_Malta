// Identical pure reader shared by Worker compatibility routes and the browser.
export const ITEM_FIELDS=['item_id','locality_id','locality_name','title','item_emojis','original_price_cents','purchase_year','item_condition','collection_time','moving_help','colours','materials','item_size','submitted_at','owner_name','description','contact_mode','external_url','has_phone','delete_at'];
const invalid=message=>{throw Object.assign(Error(message),{status:400})};
export function selectPublicItems(feed,{locality_id='',q='',limit=20,offset=0,at=Date.now()}={}){
 const locality=locality_id&&locality_id!=='ALL'?String(locality_id).trim():'';if(locality&&!/^[A-Za-z0-9_-]{1,100}$/.test(locality))invalid('Invalid locality');
 const query=String(q).trim().normalize('NFC').toLowerCase();if(Array.from(query).length>80||query.includes('\0'))invalid('Use a search of up to 80 characters');
 limit=Number(limit);offset=Number(offset);if(!Number.isInteger(limit)||limit<1||limit>200||!Number.isInteger(offset)||offset<0)invalid('Invalid pagination');
 const matches=feed.items.filter(i=>Date.parse(i.delete_at)>at&&(!locality||i.locality_id===locality)&&(!query||(String(i.title||'')+' '+String(i.description||'')).normalize('NFC').toLowerCase().includes(query))).sort((a,b)=>Date.parse(b.submitted_at)-Date.parse(a.submitted_at)||String(a.item_id).localeCompare(String(b.item_id),'en'));
 return {items:matches.slice(offset,offset+limit),limit,offset,total:matches.length,generated_at:feed.generated_at,revision:feed.revision};
}
export function validatePublicFeed(data){
 if(data?.format_version!==1||data.feature!=='reuse-public-json-v1'||!Number.isSafeInteger(data.revision)||!Array.isArray(data.items)||!Array.isArray(data.localities))throw Error('The REUSE published file has an unsupported format');
 // Fail closed if a faulty future exporter adds private fields to the file.
 const allowed=new Set(ITEM_FIELDS);for(const item of data.items){if(!item||Object.keys(item).some(k=>!allowed.has(k))||typeof item.item_id!=='string'||typeof item.delete_at!=='string')throw Error('The REUSE published file did not pass its public-field check')}
 for(const locality of data.localities)if(!locality||Object.keys(locality).some(k=>!['locality_id','name'].includes(k)))throw Error('The REUSE locality list has unexpected fields');
 return data;
}

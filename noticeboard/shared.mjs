export const API='https://api.bagdaymalta.eu/api/v1';
export const sections={police:{name:'Police',icon:'shield'},council:{name:'Local Council',icon:'building'},church:{name:'Church',icon:'church'}};
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shapes={search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',filter:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',shield:'<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6Z"/><path d="m9 12 2 2 4-4"/>',building:'<path d="m3 8 9-5 9 5ZM3 21h18M5 11v7m7-7v7m7-7v7"/>',church:'<path d="M12 2v6m-3-3h6M4 21V11l8-6 8 6v10ZM10 21v-7h4v7"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 2v6m10-6v6M3 11h18m-9 3v5m-2.5-2.5h5"/>',back:'<path d="m14 5-7 7 7 7M7 12h14"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-11v1"/>',next:'<path d="m9 5 7 7-7 7"/>'};
export const icon=n=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[n]||shapes.info}</svg>`;
export function today(now=new Date()){const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Malta',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now),v=t=>p.find(x=>x.type===t).value;return `${v('year')}-${v('month')}-${v('day')}`}
export function addDays(date,n){const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
export function parseCSV(csv){
 const result=[];let row=[],cell='',quoted=false;
 for(let i=0;i<csv.length;i++){const c=csv[i];if(c==='"'){if(quoted&&csv[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){row.push(cell);cell=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&csv[i+1]==='\n')i++;row.push(cell);if(row.some(Boolean))result.push(row);row=[];cell=''}else cell+=c}
 if(cell||row.length){row.push(cell);result.push(row)}const keys=result.shift()||[];return result.map(values=>Object.fromEntries(keys.map((k,i)=>[k,values[i]||''])));
}
export function compareNotices(a,b){
 if(a.kind!==b.kind)return a.kind==='info'?-1:1;
 if(a.kind==='info'){const order=(b.updated_at||b.created_at||'').localeCompare(a.updated_at||a.created_at||'');if(order)return order;}
 return a.end_date.localeCompare(b.end_date)||a.entry_id.localeCompare(b.entry_id);
}
export function visibleItems(csv,date=today()){return parseCSV(csv||'').filter(r=>['event','info'].includes(r.kind)&&/^\d{4}-\d{2}-\d{2}$/.test(r.end_date)&&r.end_date>=date).sort(compareNotices).slice(0,20)}
export function calendarURL(item,locality){const start=item.end_date.replaceAll('-',''),end=addDays(item.end_date,1).replaceAll('-','');return 'https://calendar.google.com/calendar/render?'+new URLSearchParams({action:'TEMPLATE',text:item.title,dates:`${start}/${end}`,details:item.description,location:locality,ctz:'Europe/Malta'})}
export async function request(path,{method='GET',body,token}={}){const r=await fetch(API+path,{method,cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(25000),headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});let data;try{data=await r.json()}catch{throw Error('The noticeboard service is unavailable. Please try again.')}if(!r.ok)throw Object.assign(Error(data.error?.message||'Could not complete the request'),{status:r.status});return data}

export function decodePublishedCSV(csv){
 const records=parseCSV(csv);if(!records.some(r=>r.record_type==='manifest'&&r.format_version==='1'))throw Error('The noticeboard file has an unsupported format.');
 const pages=new Map();for(const r of records)if(r.record_type==='page')pages.set(r.page_id,{page_id:r.page_id,locality_id:r.locality_id,locality_name:r.locality_name,section:r.section,published_at:r.published_at||null,items:[]});
 const field=s=>'"'+String(s??'').replaceAll('"','""')+'"',cols=['entry_id','kind','title','description','end_date','link_url','link_title','icon_emoji','category_id','audience_id','updated_at','created_at'];
 for(const r of records)if(r.record_type==='entry'&&pages.has(r.page_id))pages.get(r.page_id).items.push(r);
 return [...pages.values()].map(({items,...p})=>({...p,csv:cols.join(',')+'\r\n'+items.map(r=>cols.map(k=>field(r[k])).join(',')).join('\r\n')+(items.length?'\r\n':'')}));
}
export async function readPublishedCSV({fresh=false}={}){const r=await fetch(API+'/public/noticeboard.csv'+(fresh?'?refresh='+Date.now():''),{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('The published noticeboard file is unavailable. Please try again.');return {pages:decodePublishedCSV(await r.text())}}

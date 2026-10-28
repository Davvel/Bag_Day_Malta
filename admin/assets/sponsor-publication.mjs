import {parseCSV} from './data.mjs';
import {exportBase,fileURL} from './exporter.mjs';
const text=v=>String(v??'').trim();
const stable=rows=>JSON.stringify(rows.map(r=>r.map(text)).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
export function sponsorPublication(localities,sponsors,slots,published,at=new Date()){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Malta',year:'numeric',month:'2-digit'}).formatToParts(at),get=t=>parts.find(p=>p.type===t).value,currentMonth=get('year')+'-'+get('month')+'-01';
 const active=new Map(sponsors.filter(s=>s.active).map(s=>[s.sponsor_id,s])),local=new Map(localities.filter(l=>l.active).map(l=>[l.locality_id,l]));
 const approved=slots.filter(s=>s.status==='APPROVED'&&s.advertising_month>=currentMonth&&active.has(s.sponsor_id)&&local.has(s.locality_id));
 const expectedSlots=approved.map(s=>[local.get(s.locality_id).name,Number(s.advertising_month.slice(5,7)),Number(s.advertising_month.slice(0,4)),s.position,s.sponsor_id]);
 const actualSlots=published.slots.map(s=>[s.Locality,Number(s.Month),Number(s.Year),Number(s.Slot),s.SponsorID]);
 // Compare adverts used by approved placements, and any already published advert.
 // Unallocated adverts do not affect what public readers see.
 const relevant=new Set([...approved.map(s=>s.sponsor_id),...published.sponsors.map(s=>s.SponsorID)]),changed=new Set();
 for(const id of relevant){const saved=active.get(id),old=published.sponsors.find(s=>s.SponsorID===id);if(!approved.some(s=>s.sponsor_id===id)||!saved||!old||stable([[saved.company_name,saved.advert_text,saved.banner_url,saved.destination_url]])!==stable([[old.SponsorName,old.DisplayText,old.ImageURL,old.URL]]))changed.add(id)}
 const slotChanges=stable(expectedSlots)!==stable(actualSlots);
 return {state:changed.size||slotChanges?'unpublished':'published',changed,slotChanges};
}
export async function readSponsorPublication(base){
 const origin=exportBase(base),get=async url=>{const r=await fetch(url,{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('Published sponsor data could not be checked');return r};
 const manifest=await (await get(origin+'/current.json')).json();
 if(!manifest.version||manifest.sponsors_url!=='/exports/'+manifest.version+'/sponsors.csv'||manifest.sponsor_slots_url!=='/exports/'+manifest.version+'/sponsor_slots.csv')throw Error('Invalid sponsor publication');
 const [sponsors,slots]=await Promise.all([get(fileURL(origin,manifest.sponsors_url)).then(r=>r.text()),get(fileURL(origin,manifest.sponsor_slots_url)).then(r=>r.text())]);
 return {sponsors:parseCSV(sponsors),slots:parseCSV(slots),generated_at:manifest.generated_at};
}

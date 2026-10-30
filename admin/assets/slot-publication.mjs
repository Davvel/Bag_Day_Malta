import {sponsorPublication} from './sponsor-publication.mjs?v=1.1.109';
export function slotPublication(row,published,localities,sponsors,at=new Date()){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Malta',year:'numeric',month:'2-digit'}).formatToParts(at),get=k=>parts.find(p=>p.type===k).value;
 const current=get('year')+'-'+get('month')+'-01';
 const present=published.slots.some(s=>s.SponsorID===row.sponsor_id&&s.Locality===row.locality_name&&Number(s.Year)===Number(row.advertising_month.slice(0,4))&&Number(s.Month)===Number(row.advertising_month.slice(5,7))&&Number(s.Slot)===Number(row.position));
 const eligible=row.status==='APPROVED'&&row.advertising_month>=current&&localities.some(l=>l.locality_id===row.locality_id&&l.active)&&sponsors.some(s=>s.sponsor_id===row.sponsor_id&&s.active);
 if(!eligible)return present?{state:'unpublished',label:'Unpublished removal'}:{state:'unknown',label:row.advertising_month<current?'Past month · not published':row.status==='DRAFT'?'Draft · not published':'Not eligible · not published'};
 const advert=sponsorPublication(localities,sponsors,[row],{sponsors:published.sponsors.filter(s=>s.SponsorID===row.sponsor_id),slots:published.slots.filter(s=>s.SponsorID===row.sponsor_id)},at);
 return present&&!advert.changed.has(row.sponsor_id)?{state:'published',label:'Published'}:{state:'unpublished',label:'Waiting for publication'};
}

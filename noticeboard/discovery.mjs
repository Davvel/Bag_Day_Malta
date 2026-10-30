import {visibleItems,today,addDays} from './shared.mjs?v=1.1.104';
export const eventSymbol=item=>item.icon_emoji||'📌';
export const longDate=date=>new Intl.DateTimeFormat('en-GB',{dateStyle:'full',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
export function eventIndex(pages,date=today()){
 return pages.flatMap(page=>visibleItems(page.csv,date).filter(i=>i.kind==='event').map(item=>({...item,locality:page.locality_name,section:page.section,page_id:page.page_id}))).sort((a,b)=>a.end_date.localeCompare(b.end_date)||a.locality.localeCompare(b.locality)||a.title.localeCompare(b.title));
}
export function dateRange(range,from='',to='',date=today()){
 if(range==='today')return [date,date];if(range==='week')return [date,addDays(date,6)];
 if(range==='weekend'){const day=new Date(date+'T12:00:00Z').getUTCDay();const sat=day===0?date:day===6?date:addDays(date,6-day);return [sat,day===0?date:addDays(sat,1)];}
 return range==='custom'?[from||date,to||'9999-12-31']:[date,'9999-12-31'];
}
const key=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[ħĦ]/g,'h').toLocaleLowerCase('en');
export function searchEvents(pages,{q='',range='all',from='',to=''}={},date=today()){
 const [first,last]=dateRange(range,from,to,date),words=key(q).trim().split(/\s+/).filter(Boolean);
 return eventIndex(pages,date).filter(i=>i.end_date>=first&&i.end_date<=last&&words.every(w=>key([i.title,i.description,i.locality].join(' ')).includes(w)));
}
export function monthCells(month){
 if(!/^\d{4}-\d{2}$/.test(month))month=today().slice(0,7);
 const first=new Date(month+'-01T12:00:00Z'),start=(first.getUTCDay()+6)%7,length=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
 return [...Array(start).fill(null),...Array.from({length},(_,i)=>month+'-'+String(i+1).padStart(2,'0'))];
}
export function moveMonth(month,delta){const d=new Date(month+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+delta);return d.toISOString().slice(0,7)}

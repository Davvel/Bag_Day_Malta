import {visibleItems,today,addDays,compareNotices,esc} from './shared.mjs?v=1.1.109';
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

// Blank search restores the selected locality's normal three-board overview.
// Nonblank search includes events AND information without a future date limit.
export function filterNoticeBoards(pages,{q='',locality='',allLocalities=false}={},date=today()){
 const words=key(q).trim().split(/\s+/).filter(Boolean),searching=words.length>0;
 const candidates=pages.filter(p=>searching&&allLocalities||key(p.locality_name)===key(locality));
 const items=candidates.flatMap(p=>visibleItems(p.csv,date).map(i=>({...i,locality:p.locality_name,section:p.section,page_id:p.page_id}))).filter(i=>words.every(w=>key([i.title,i.description,i.locality].join(' ')).includes(w)));
 return ['police','council','church'].map(section=>({section,items:items.filter(i=>i.section===section).sort(compareNotices)})).filter(g=>!searching||g.items.length>0);
}
export function highlightNotice(value,query=''){
 const text=String(value||''),lower=text.toLocaleLowerCase('en'),words=[...new Set(String(query).trim().toLocaleLowerCase('en').split(/\s+/).filter(Boolean))];
 if(!words.length)return esc(text);
 const ranges=[];for(const word of words){let from=0,index;while((index=lower.indexOf(word,from))!==-1){ranges.push([index,index+word.length]);from=index+word.length;}}
 ranges.sort((a,b)=>a[0]-b[0]);const merged=[];for(const range of ranges){const last=merged[merged.length-1];if(last&&range[0]<=last[1])last[1]=Math.max(last[1],range[1]);else merged.push([...range]);}
 let result='',from=0;for(const [start,end] of merged){result+=esc(text.slice(from,start))+'<mark>'+esc(text.slice(start,end))+'</mark>';from=end;}return result+esc(text.slice(from));
}

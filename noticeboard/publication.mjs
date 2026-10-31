import {parseCSV,today,readPublishedCSV} from './shared.mjs?v=1.1.120';
const fields=['entry_id','kind','title','description','end_date','link_url','link_title','icon_emoji','category_id','audience_id','updated_at'];
export function noticeStatus(items,published,date=today()){
 if(!published)return {state:'unknown',changed:new Set(),removed:0};
 const live=items.filter(i=>i.end_date>=date),old=parseCSV(published.csv||'').filter(i=>i.end_date>=date),map=new Map(old.map(i=>[i.entry_id,i]));
 const changed=new Set(live.filter(i=>!map.has(i.entry_id)||fields.some(k=>String(i[k]??'')!==String(map.get(i.entry_id)[k]??''))).map(i=>i.entry_id));
 const removed=old.filter(i=>!live.some(n=>n.entry_id===i.entry_id)).length;
 return {state:changed.size||removed?'unpublished':!published.published_at?'empty':'published',changed,removed,neverPublished:!published.published_at};
}
export async function publishedPages(){return (await readPublishedCSV({fresh:true})).pages}
export async function mapLimited(items,fn,limit=4){const result=new Array(items.length);let next=0;await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{while(next<items.length){const i=next++;result[i]=await fn(items[i])}}));return result}

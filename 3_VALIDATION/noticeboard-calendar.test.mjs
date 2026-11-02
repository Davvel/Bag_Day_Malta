import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calendarDays,calendarContext} from '../2_WEBSITE/COPY_TO_GITHUB/noticeboard/calendar-model.mjs';
import {filterNoticeBoards,pageNoticeResults} from '../2_WEBSITE/COPY_TO_GITHUB/noticeboard/discovery.mjs';
import {decodePublishedCSV} from '../2_WEBSITE/COPY_TO_GITHUB/noticeboard/shared.mjs';
const items=Array.from({length:68},(_,i)=>({entry_id:String(i),page_id:'P'+i,kind:'event',title:'Christmas',description:'Families welcome',end_date:'2099-12-25',locality:'Locality '+String(68-i).padStart(2,'0'),section:i%2?'church':'council',category_id:'activity',audience_id:'families'}));
const pages=items.map(i=>({page_id:i.page_id,locality_name:i.locality,section:i.section,csv:'entry_id,kind,title,description,end_date,category_id,audience_id\n'+[i.entry_id,i.kind,i.title,i.description,i.end_date,i.category_id,i.audience_id].join(',')}));
test('calendar counts all 68 filtered events, while locality-sorted cards page 20 at a time',()=>{
 const groups=filterNoticeBoards(pages,{allLocalities:true,category:'activity',audience:'families'},'2026-10-31');
 const days=calendarDays(groups.flatMap(g=>g.items));assert.equal(days.get('2099-12-25').length,68);assert.equal(days.get('2099-12-25')[0].locality,'Locality 01');
 for(const [limit,count] of [[20,20],[40,40],[60,60],[80,68]]){const result=pageNoticeResults(groups,limit,true);assert.equal(result.total,68);assert.equal(result.shown,count)}
 const first=pageNoticeResults(groups,20,true).groups.flatMap(g=>g.items);assert(first.every(i=>i.locality<='Locality 20'));
});
test('All Localities immediately browses without text or filters, locality-only remains scoped',()=>{
 assert.equal(filterNoticeBoards(pages,{allLocalities:true},'2026-10-31').flatMap(g=>g.items).length,68);
 assert.equal(filterNoticeBoards(pages,{locality:'Locality 01'},'2026-10-31').flatMap(g=>g.items).length,1);
 assert.equal(filterNoticeBoards(pages,{allLocalities:true,category:'missing'},'2026-10-31').length,0);
});
test('information expiry dates do not count as calendar events',()=>{
 const days=calendarDays([...items,{...items[0],kind:'info',end_date:'2099-12-24'}]);assert.equal(days.get('2099-12-25').length,68);assert(!days.has('2099-12-24'));
});
test('calendar headings describe section, category, audience, locality scope and literal text',()=>{
 assert.equal(calendarContext({section:'Church',locality:'Żejtun'}),'Showing all Church Notices in Żejtun');
 assert.equal(calendarContext({section:'Church',category:'Activities',audience:'Families',locality:'Żejtun'}),'Showing Church Activities for Families in Żejtun');
 assert.equal(calendarContext({section:'Church',category:'Activities',audience:'Families',allLocalities:true}),'Showing Church Activities for Families in all localities');
 assert.equal(calendarContext({allLocalities:true,q:'Christmas'}),'Showing all Notices in all localities matching “Christmas”');
});

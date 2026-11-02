import {test} from 'node:test';import assert from 'node:assert/strict';
import {visibleItems,decodePublishedCSV,today} from '../2_WEBSITE/COPY_TO_GITHUB/noticeboard/shared.mjs';
import {searchEvents,eventSymbol,monthCells,moveMonth,dateRange} from '../2_WEBSITE/COPY_TO_GITHUB/noticeboard/discovery.mjs';
import {noticeStatus} from '../2_WEBSITE/COPY_TO_GITHUB/noticeboard/publication.mjs';
const columns=['entry_id','kind','title','description','end_date','icon_emoji','updated_at'];
const csv=items=>columns.join(',')+'\n'+items.map(i=>columns.map(k=>'"'+String(i[k]||'').replaceAll('"','""')+'"').join(',')).join('\n');
const item=(id,kind,date,updated='',more={})=>({entry_id:id,kind,end_date:date,title:'Bingo evening',description:'Community gathering',updated_at:updated,...more});
test('information is newest modified first, events earliest first, final date is inclusive',()=>{
 const rows=[item('late','event','2026-11-30'),item('old','info','2026-11-29','2026-10-20T10:00:00Z'),item('early','event','2026-10-30'),item('new','info','2026-11-01','2026-10-30T10:00:00Z'),item('expired','info','2026-10-29','2026-10-29T10:00:00Z')];
 assert.deepEqual(visibleItems(csv(rows),'2026-10-30').map(i=>i.entry_id),['new','old','early','late']);
 assert.equal(today(new Date('2026-10-30T23:10:00Z')),'2026-10-31');
});
test('all-locality search includes Gozo, excludes expired/info and filters dates/words',()=>{
 const pages=[{locality_name:'Żejtun',section:'church',csv:csv([item('1','event','2026-11-04'),item('2','info','2026-11-04')])},{locality_name:'Victoria (Gozo)',section:'council',csv:csv([item('3','event','2026-10-31'),item('4','event','2026-10-29')])}];
 assert.deepEqual(searchEvents(pages,{q:'bingo'},'2026-10-30').map(i=>i.entry_id),['3','1']);
 assert.equal(searchEvents(pages,{q:'Gozo'},'2026-10-30')[0].locality,'Victoria (Gozo)');
 assert.equal(searchEvents(pages,{q:'zejtun'},'2026-10-30').length,1);
 assert.equal(searchEvents(pages,{range:'weekend'},'2026-10-30').length,1);
 assert.equal(searchEvents(pages,{range:'custom',from:'2026-11-01',to:'2026-11-05'},'2026-10-30').length,1);
});
test('calendar handles Monday alignment, year boundaries, leap February and Sunday weekend',()=>{
 assert.equal(monthCells('2026-11')[0],null);assert.equal(monthCells('2026-11')[6],'2026-11-01');
 assert.equal(monthCells('2028-02').filter(Boolean).length,29);assert.equal(moveMonth('2026-12',1),'2027-01');assert.equal(moveMonth('2026-01',-1),'2025-12');
 assert.deepEqual(dateRange('weekend','','','2026-11-01'),['2026-11-01','2026-11-01']);assert.equal(eventSymbol({}),'📌');
});
test('CSV transports Unicode symbols and timestamps; legacy CSV retains pin fallback',()=>{
 const source='format_version,record_type,page_id,locality_name,section,entry_id,kind,title,description,end_date,icon_emoji,updated_at\n1,manifest,,,,,,,,,,,\n1,page,p,Żejtun,church,,,,,,,\n1,entry,p,Żejtun,church,e,event,Concert,Music,2099-01-01,🎵,2026-10-30T10:00:00Z\n';
 const row=visibleItems(decodePublishedCSV(source)[0].csv,'2026-10-30')[0];assert.equal(row.icon_emoji,'🎵');assert.equal(row.updated_at,'2026-10-30T10:00:00Z');
 assert.equal(eventSymbol(visibleItems('entry_id,kind,title,description,end_date\ne,event,T,D,2099-01-01','2026-10-30')[0]),'📌');
 const changed={...row,icon_emoji:'🎭'};assert.equal(noticeStatus([changed],{csv:csv([row]),published_at:'2026-10-30T12:00:00Z'},'2026-10-30').state,'unpublished');
});

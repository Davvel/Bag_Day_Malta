import {test} from 'node:test';import assert from 'node:assert/strict';
import {filterNoticeBoards,highlightNotice} from '../2_WEBSITE/COPY_TO_GITHUB/noticeboard/discovery.mjs';
const date='2026-10-30';
function page(locality,section,items){const cols=['entry_id','kind','title','description','end_date','updated_at'];return {locality_name:locality,section,page_id:locality+section,csv:cols.join(',')+'\n'+items.map(i=>cols.map(k=>'"'+String(i[k]||'').replaceAll('"','""')+'"').join(',')).join('\n')};}
const item=(entry_id,title,kind='event',end_date='2026-11-13',updated_at='2026-10-30T10:00:00Z')=>({entry_id,title,kind,end_date,updated_at,description:'Community notice'});
const pages=[page('Żejtun','police',[item('p','Festa traffic','info')]),page('Żejtun','council',[item('c','Road cleanup')]),page('Żejtun','church',[item('e','Festa celebration'),item('expired','Festa old','event','2026-10-29')]),page('Nadur','church',[item('g','Festa concert')])];
test('search defaults to selected locality and hides only sections with no matches',()=>{
 const groups=filterNoticeBoards(pages,{q:'festa',locality:'Żejtun'},date);
 assert.deepEqual(groups.map(g=>g.section),['police','church']);
 assert.deepEqual(groups.flatMap(g=>g.items.map(i=>i.entry_id)),['p','e']);
 assert.equal(groups[0].items[0].kind,'info');
});
test('all-localities scope adds Gozo matches with locality and page identity retained',()=>{
 const groups=filterNoticeBoards(pages,{q:'festa',locality:'Żejtun',allLocalities:true},date),church=groups.find(g=>g.section==='church');
 assert.equal(church.items.length,2);assert.equal(church.items.find(i=>i.entry_id==='g').locality,'Nadur');assert.equal(church.items.find(i=>i.entry_id==='g').page_id,'Nadurchurch');
});
test('clearing query restores all three local boards and never includes other localities',()=>{
 const groups=filterNoticeBoards(pages,{q:'',locality:'Żejtun',allLocalities:false},date);
 assert.deepEqual(groups.map(g=>g.section),['police','council','church']);assert.equal(groups.flatMap(g=>g.items).length,3);assert.ok(groups.flatMap(g=>g.items).every(i=>i.locality==='Żejtun'));
 assert.deepEqual(filterNoticeBoards(pages,{q:'no-such-notice',locality:'Żejtun'},date),[]);
});
test('search spans information and distant future events without date presets, ordered correctly',()=>{
 const mixed=[page('Żejtun','church',[item('far','Festa 2030','event','2030-12-01'),item('soon','Festa soon'),item('old','Festa information','info','2026-11-20','2026-10-20T10:00:00Z'),item('new','Festa update','info','2026-11-01','2026-10-30T10:00:00Z')])];
 assert.deepEqual(filterNoticeBoards(mixed,{q:'festa',locality:'Żejtun'},date)[0].items.map(i=>i.entry_id),['new','old','soon','far']);
 assert.equal(filterNoticeBoards(pages,{q:'zejtun festa',locality:'Żejtun'},date).length,2);
});
test('match highlights escape source text and treat search punctuation as literal text',()=>{
 assert.equal(highlightNotice('Festa celebration','festa'),'<mark>Festa</mark> celebration');
 const html=highlightNotice('<img src=x onerror=alert(1)>','img');assert.doesNotMatch(html,/<img/);assert.match(html,/&lt;<mark>img<\/mark>/);
 assert.equal(highlightNotice('a+b [news]','a+b'),'<mark>a+b</mark> [news]');
 assert.equal(highlightNotice('Festa','fest festa'),'<mark>Festa</mark>');
});

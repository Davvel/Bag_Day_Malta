import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calendarURL} from '../2_WEBSITE/COPY_TO_GITHUB/noticeboard/shared.mjs';
test('timed and legacy all-day calendar links use Malta dates across year end',()=>{
 const item={title:'Bingo',end_date:'2026-12-31',description:'',where_text:'Parish square'};
 const params=()=>new URL(calendarURL(item,'Żejtun')).searchParams;
 assert.equal(params().get('dates'),'20261231/20270101');
 Object.assign(item,{start_time:'14:00',end_time:'18:00'});
 assert.equal(params().get('dates'),'20261231T140000/20261231T180000');
 assert.equal(params().get('ctz'),'Europe/Malta');
});

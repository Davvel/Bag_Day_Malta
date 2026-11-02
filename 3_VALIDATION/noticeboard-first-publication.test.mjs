import {test} from 'node:test';
import assert from 'node:assert/strict';
import {noticeStatus} from '../2_WEBSITE/COPY_TO_GITHUB/noticeboard/publication.mjs';

const date='2026-10-28';
test('a new empty board has nothing to publish',()=>{
 const result=noticeStatus([],{csv:'',published_at:null},date);
 assert.equal(result.state,'empty');
 assert.equal(result.neverPublished,true);
 assert.equal(result.changed.size,0);
});
test('an explicitly published empty board is published',()=>{
 const result=noticeStatus([],{csv:'',published_at:'2026-10-28T19:00:00Z'},date);
 assert.equal(result.state,'published');
 assert.equal(result.neverPublished,false);
});
test('unavailable public data remains unknown, rather than claiming publication',()=>{
 assert.equal(noticeStatus([],null,date).state,'unknown');
});
test('adding and removing notices still requires publication',()=>{
 const item={entry_id:'a',kind:'event',title:'Event',description:'Details',end_date:'2026-11-01'};
 assert.equal(noticeStatus([item],{csv:'',published_at:'2026-10-28T19:00:00Z'},date).state,'unpublished');
 const result=noticeStatus([],{csv:'entry_id,kind,title,description,end_date\na,event,Event,Details,2026-11-01\n',published_at:'2026-10-28T19:00:00Z'},date);
 assert.equal(result.state,'unpublished');assert.equal(result.removed,1);
});

test('a first saved current notice needs publication; expired-only drafts do not',()=>{
 const item={entry_id:'a',kind:'event',title:'Event',description:'Details',end_date:'2026-11-01'};
 assert.equal(noticeStatus([item],{csv:'',published_at:null},date).state,'unpublished');
 assert.equal(noticeStatus([{...item,end_date:'2026-10-01'}],{csv:'',published_at:null},date).state,'empty');
});

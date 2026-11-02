import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calendarBounds,boundedCalendarMonth} from '../2_WEBSITE/COPY_TO_GITHUB/noticeboard/calendar-model.mjs';
import {animateCalendarGrid,slideCalendarPages} from '../2_WEBSITE/COPY_TO_GITHUB/noticeboard/calendar-motion.mjs';
test('month boundaries span current month through +6 across year changes',()=>{
 assert.deepEqual(calendarBounds('2026-10-31'),{min:'2026-10',max:'2027-04'});assert.equal(boundedCalendarMonth('2026-09','2026-10-31'),'2026-10');assert.equal(boundedCalendarMonth('2027-05','2026-10-31'),'2027-04');assert.equal(boundedCalendarMonth('2027-04','2026-10-31'),'2027-04');assert.equal(boundedCalendarMonth('bad','2026-10-31'),'2026-10');
});
test('month animation slides in opposite directions and bounces back to zero at the limits',async()=>{
 const calls=[],surface={animate(frames,options){calls.push({frames,options});return {finished:Promise.resolve(),cancel(){}}}};
 await animateCalendarGrid(surface,1,'out');await animateCalendarGrid(surface,1,'in');await animateCalendarGrid(surface,-1,'bounce');assert.equal(calls[0].frames[1].transform,'translateX(-16%)');assert.equal(calls[1].frames[0].transform,'translateX(16%)');assert.equal(calls[2].frames[1].transform,'translateX(26px)');assert.equal(calls[2].frames.at(-1).transform,'translateX(0)');
 await animateCalendarGrid(surface,1,'out',true);assert.equal(calls.length,3);await animateCalendarGrid({},1,'out');
});
test('neighbour month completes a perspective page turn without fading and cleans up',async()=>{
 for(const direction of [-1,1]){const calls=[];let removed=false,attached=false;const make=()=>({animate(frames,options){calls.push({frames,options});return {finished:Promise.resolve(),cancel(){}}}});const current=make(),incoming={...make(),classList:{add(){}},setAttribute(){},remove(){removed=true}};current.parentElement={append(el){assert.equal(el,incoming);attached=true}};await slideCalendarPages(current,incoming,direction);assert(attached&&removed);assert.equal(calls.length,2);assert.match(calls[0].frames[1].transform,new RegExp('translateX\\('+-direction*100+'%\\)'));assert.match(calls[1].frames[0].transform,new RegExp('translateX\\('+direction*100+'%\\)'));assert(!calls.some(c=>c.frames.some(f=>'opacity' in f)));assert(incoming.inert);calls.length=0;await slideCalendarPages(current,incoming,direction,true);assert.equal(calls.length,0)}
});

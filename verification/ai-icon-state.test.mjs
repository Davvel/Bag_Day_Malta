import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createIconState} from '../COPY_TO_GITHUB/reuse/ai-icon-state.mjs';
test('four requests in rolling minute; fifth blocks, survives reload, expires at sixty seconds',()=>{
 let t=100000,value;const storage={getItem:()=>value,setItem:(_,v)=>value=v};
 let state=createIconState({storage,now:()=>t});
 for(let i=0;i<4;i++){assert.equal(state.press(),true);t+=1000}
 assert.equal(state.press(),false);assert.equal(state.remaining(),60000);
 state=createIconState({storage,now:()=>t});assert.equal(state.press(),false);
 t+=59999;assert.equal(state.remaining(),1);t++;assert.equal(state.press(),true);
 t+=60000;for(let i=0;i<4;i++)assert.equal(state.press(),true);
});
test('hash reuse never counts as a request and plaintext fallback stays in memory',async()=>{
 let value;const storage={getItem:()=>value,setItem:(_,v)=>value=v};
 const state=createIconState({storage,digest:async()=>{throw Error('unavailable')}});
 const key=await state.key('PRIVATE_ACCOUNT',{title:'PRIVATE_TITLE'});state.remember(key,['🐟']);
 assert.deepEqual(state.get(key).icons,['🐟']);assert.doesNotMatch(value,/PRIVATE/);
 for(let i=0;i<4;i++)assert.equal(state.press(),true);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../2_WEBSITE/COPY_TO_GITHUB/js/app.js',import.meta.url),'utf8');
function setup(){
 const nodes=new Map(),events=new Map(),changes=[];let blocked=false,prevented=0;
 const $=id=>{if(!nodes.has(id))nodes.set(id,{style:{},clientWidth:400,addEventListener:(type,fn)=>events.set(id+':'+type,fn)});return nodes.get(id)};
 const context=vm.createContext({$,window:{addEventListener(){}},performance:{now:()=>1000},gesturesBlocked:()=>blocked,changingDay:false,suppressTapUntil:0,dayOffset:1,maxDaysAhead:7,reducedMotion:()=>false,setDayNavigationMoving(){},changeDay:n=>changes.push(n)});
 vm.runInContext(source.slice(source.indexOf('  // Only the bag card owns'),source.indexOf('  // Scroll settings normally')),context);
 const send=(type,x=0,y=0,count=1)=>events.get('collectionStage:'+type)?.({touches:Array.from({length:count},()=>({clientX:x,clientY:y})),cancelable:true,preventDefault(){prevented++}});
 return {events,changes,send,nodes,block:()=>blocked=true,prevented:()=>prevented};
}
test('day swipes listen only on bag card, leaving the rest of Home untouched',()=>{
 const g=setup();assert(g.events.has('collectionStage:touchstart'));assert(!g.events.has('dashboard:touchstart'));
 g.send('touchstart',200,100);g.send('touchmove',70,105);g.send('touchend',0,0,0);assert.deepEqual(g.changes,[1]);assert.equal(g.prevented(),1);
});
test('vertical pulls and diagonal scrolling remain native and do not change day',()=>{
 for(const dy of [-150,150]){const g=setup();g.send('touchstart',200,200);g.send('touchmove',210,200+dy);g.send('touchmove',20,200+dy);g.send('touchend',0,0,0);assert.equal(g.prevented(),0);assert.deepEqual(g.changes,[]);}
});
test('pinch, zoom and touch cancellation cannot complete a pending day swipe',()=>{
 for(const cancel of ['pinch','zoom','cancel']){const g=setup();g.send('touchstart',200,100);g.send('touchmove',70,100);if(cancel==='pinch')g.send('touchmove',70,100,2);if(cancel==='zoom')g.block();g.send(cancel==='cancel'?'touchcancel':'touchend',0,0,0);assert.deepEqual(g.changes,[]);assert.equal(g.nodes.get('bagArea').style.transform,'');}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=name=>readFileSync(new URL('../2_WEBSITE/COPY_TO_GITHUB/game/'+name,import.meta.url),'utf8');
function setup(saved={}){
 let value=JSON.stringify(saved);
 const context=vm.createContext({window:{},Intl,Date,localStorage:{getItem:()=>value,setItem:(_,v)=>value=v}});
 vm.runInContext(source('stats.js'),context);return context;
}
test('existing records survive and missing historical perfect records start at zero',()=>{
 const c=setup({highestLevel:100,bestRound:18});const s=c.window.SORTING_STATS.snapshot();
 assert.equal(s.highestLevel,100);assert.equal(s.bestRound,18);assert.equal(s.highestPerfectLevel,0);assert.equal(s.bestPerfectRound,0);
});
test('perfect records use only zero-error timed rounds, independently of other records',()=>{
 const c=setup();const stats=c.window.SORTING_STATS;
 stats.complete({level:100,hits:18,misses:2,passed:true});
 stats.complete({level:12,hits:15,misses:0,passed:true});
 stats.complete({level:20,hits:10,misses:0,passed:true});
 stats.complete({level:90,hits:30,passed:true}); // Unknown error count must never imply a perfect round.
 const s=stats.snapshot();assert.equal(s.highestLevel,100);assert.equal(s.bestRound,30);assert.equal(s.highestPerfectLevel,20);assert.equal(s.bestPerfectRound,15);
 const game=source('game.js');assert.match(game,/if\(!practice && elapsed>=60\)window.SORTING_STATS.complete\(\{level,hits,passed,misses\}\)/);
});
test('text preview and clipboard use exact player records, and Facebook shares the game URL',async()=>{
 const c=setup({highestLevel:100,highestPerfectLevel:12,bestRound:18,bestPerfectRound:15,longestStreak:14,currentStreak:2});
 const nodes={};let copied;
 c.document={addEventListener(){},getElementById:id=>nodes[id]??=( {value:'',textContent:'',classList:{add(){},remove(){}},handlers:{},addEventListener(event,fn){this.handlers[event]=fn;},showModal(){},close(){},focus(){},select(){this.selected=true;},setSelectionRange(){}})};
 c.navigator={clipboard:{writeText:async t=>{copied=t;}}};c.window.location={href:''};
 vm.runInContext(source('share-records.js'),c);
 nodes.shareGameRecords.handlers.click();
 assert.equal(nodes.shareRecordsText.value,`♻️ Bag Day Malta
Waste Sorting Game

🏆 Highest level: 100
🌟 Highest level (no mistakes): 12
⏱️ Most sorted in 1 min: 18
🔥 Longest streak: 14 days

Can you beat my scores? 👇
https://bagdaymalta.eu/game/`);
 assert.equal(nodes.shareHighestPerfectLevel.textContent,12);
 assert.equal(nodes.shareHighestLevel.textContent,100);
 assert.equal(nodes.shareBestRound.textContent,18);
 assert.equal(nodes.shareLongestStreak.textContent,'14 days');
 assert.match(source('index.html'),/Highest level \(no mistakes\):/);
 assert.doesNotMatch(source('index.html'),/sharePerfectRound/);
 assert.equal(nodes.shareRecordsFacebook.disabled,true);
 nodes.shareRecordsFacebook.handlers.click();assert.equal(c.window.location.href,'');
 await nodes.shareRecordsCopy.handlers.click();assert.equal(copied,nodes.shareRecordsText.value);
 assert.equal(nodes.shareRecordsCopy.textContent,'✓ Copied successfully');assert.equal(nodes.shareRecordsFacebook.disabled,false);
 nodes.shareRecordsFacebook.handlers.click();assert.equal(new URL(c.window.location.href).searchParams.get('u'),'https://bagdaymalta.eu/game/');
 nodes.shareGameRecords.handlers.click();assert.equal(nodes.shareRecordsFacebook.disabled,true);assert.equal(nodes.shareRecordsCopy.textContent,'① Copy result');
 c.navigator.clipboard.writeText=async()=>{throw Error('denied');};
 await nodes.shareRecordsCopy.handlers.click();assert.equal(nodes.shareRecordsText.selected,true);
 assert.equal(nodes.shareRecordsFacebook.disabled,true);
 c.setTimeout=fn=>fn();nodes.shareRecordsText.handlers.copy({isTrusted:true,defaultPrevented:false});assert.equal(nodes.shareRecordsFacebook.disabled,false);
});
test('Help waits for taps, copies, fades to Facebook, pastes actual records, posts and ends',()=>{
 const c=setup(),nodes={},timers=new Map(),docHandlers={};let seq=0,now=0;
 function node(){return {hidden:true,value:'player records',handlers:{},classes:new Set(),classList:{add(...names){names.forEach(n=>this.owner.classes.add(n));},remove(...names){names.forEach(n=>this.owner.classes.delete(n));},toggle(){}},addEventListener(e,f){this.handlers[e]=f;},querySelector(s){return nodes[s]??=node();},close(){}};}
 function get(id){if(!nodes[id]){nodes[id]=node();nodes[id].classList.owner=nodes[id];}return nodes[id];}
 c.document={getElementById:get,addEventListener(e,f){docHandlers[e]=f;}};
 c.setTimeout=(fn,ms)=>{timers.set(++seq,{fn,at:now+ms});return seq;};c.clearTimeout=id=>timers.delete(id);
 function advance(to){while(true){const next=[...timers].filter(([,t])=>t.at<=to).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;timers.delete(next[0]);now=next[1].at;next[1].fn();}now=to;}
 vm.runInContext(source('share-records.js'),c);
 nodes.shareGuideHelp.handlers.click();assert.equal(nodes.shareGuide.hidden,false);
 assert.match(nodes.shareGuideScene.innerHTML,/Copy result/);
 assert.match(nodes.shareGuideScene.innerHTML,/guide-bubble" hidden/);
 advance(999);assert(!nodes.shareGuideScene.classes.has('guide-tap'));
 advance(1000);assert(nodes.shareGuideScene.classes.has('guide-tap'));
 advance(1500);assert.equal(nodes['.guide-bubble'].hidden,false);
 advance(2300);assert(nodes.shareGuideScene.classes.has('guide-scene-out'));
 advance(2550);assert.match(nodes.shareGuideScene.innerHTML,/② Open Facebook/);
 assert.equal(nodes.shareGuideCaption.textContent,'Tap Open Facebook.');
 assert.doesNotMatch(source('share-records.js'),/Post on Facebook/);
 advance(3000);assert(nodes.shareGuideScene.classes.has('guide-tap'));
 advance(5000);assert(nodes.shareGuideScene.classes.has('guide-scene-out'));
 advance(5250);assert.match(nodes.shareGuideScene.innerHTML,/What’s on your mind/);assert.match(nodes.shareGuideScene.innerHTML,/PASTE Copied Text Here/);
 advance(5750);assert.equal(nodes['.guide-paste-bubble'].hidden,false);assert.match(nodes.shareGuideScene.innerHTML,/guide-paste-icon/);
 advance(6000);assert.equal(nodes['.guide-post-placeholder'].hidden,true);assert.equal(nodes['.guide-post-text'].textContent,'player records');
 advance(7999);assert(!nodes.shareGuideScene.classes.has('guide-post-tap'));
 advance(8000);assert.equal(nodes['.guide-paste-bubble'].hidden,true);assert(nodes.shareGuideScene.classes.has('guide-post-tap'));
 advance(9000);assert(nodes.shareGuide.classes.has('guide-fade'));
 advance(9250);assert.equal(nodes.shareGuide.hidden,true);assert.equal(timers.size,0);
 nodes.shareGuideHelp.handlers.click();assert.equal(timers.size,12);
 let prevented=false,stopped=false;
 docHandlers.click({target:nodes.shareGuideScene,preventDefault(){prevented=true;},stopImmediatePropagation(){stopped=true;}});
 assert(prevented&&stopped);assert.equal(timers.size,0);assert.equal(nodes.shareGuide.hidden,true);
 nodes.shareGuideHelp.handlers.click();nodes.shareRecordsDialog.handlers.cancel({preventDefault(){}});
 assert.equal(timers.size,0);assert.equal(nodes.shareGuide.hidden,true);
 nodes.shareGuideHelp.handlers.click();nodes.shareRecordsDialog.handlers.close();assert.equal(timers.size,0);
 assert.doesNotMatch(source('index.html'),/shareGuideClose/);
});

test('shared longest streak uses the lifetime record and correct day wording',()=>{
 for(const [longestStreak,expected] of [[0,'0 days'],[1,'1 day'],[14,'14 days']]){
  const c=setup({longestStreak,currentStreak:0});const nodes={};
  c.document={addEventListener(){},getElementById:id=>nodes[id]??={value:'',textContent:'',classList:{add(){},remove(){}},handlers:{},addEventListener(e,f){this.handlers[e]=f;},showModal(){}}};
  vm.runInContext(source('share-records.js'),c);
  nodes.shareGameRecords.handlers.click();
  assert.equal(nodes.shareLongestStreak.textContent,expected);
  assert(nodes.shareRecordsText.value.includes('🔥 Longest streak: '+expected));
  assert.match(nodes.shareRecordsText.value,/Most sorted in 1 min: 0\n🔥 Longest streak:/);
 }
 assert.match(source('index.html'),/id="shareLongestStreak"/);
});

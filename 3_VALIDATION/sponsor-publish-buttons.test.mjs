import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../2_WEBSITE/COPY_TO_GITHUB/admin/assets/app.mjs',import.meta.url),'utf8');
function harness(){
 const buttons=[{},{}],labels=[{},{}];let state='published',fail=false;
 const context=vm.createContext({document:{querySelectorAll:s=>s==='[data-sponsor-publish]'?buttons:s.startsWith('#sponsorpublication')?labels:[]},busy:false,sponsorStatus:null,sponsorCheckSeq:0,pageSeq:1,loadPublishingSettings(){},api:{all:async()=>[]},CONFIG:{exporterBase:''},readSponsorPublication:async()=>{if(fail)throw Error('offline');return {}},sponsorPublication:()=>({state,changed:new Set()}),error:e=>{throw e}});
 vm.runInContext(source.slice(source.indexOf('function syncSponsorPublishButtons()'),source.indexOf('\nfunction listing()')),context);
 vm.runInContext(source.slice(source.indexOf('async function action('),source.indexOf('\nfunction modal(')),context);
 return {buttons,labels,context,setState:v=>state=v,setFail:()=>fail=true};
}
test('main and report buttons enable only for verified unpublished changes',async()=>{
 const h=harness();const task=h.context.checkSponsors();assert(h.buttons.every(b=>b.disabled));await task;
 assert(h.buttons.every(b=>b.disabled));h.setState('unpublished');await h.context.checkSponsors();assert(h.buttons.every(b=>!b.disabled));
 h.setFail();await h.context.checkSponsors();assert(h.buttons.every(b=>b.disabled));assert.match(h.labels[0].textContent,/unavailable/);
});
test('publication completion does not re-enable an unchanged Publish button',async()=>{
 const h=harness();h.setState('unpublished');await h.context.checkSponsors();h.buttons[0].isConnected=true;
 await h.context.action(async()=>{assert(h.buttons.every(b=>b.disabled));h.setState('published');await h.context.checkSponsors()},h.buttons[0]);
 assert(h.buttons.every(b=>b.disabled));
});

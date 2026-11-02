import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../2_WEBSITE/COPY_TO_GITHUB/admin/assets/sponsor-finance.mjs',import.meta.url),'utf8');
function harness(){
 const nodes=Object.fromEntries(['#poerror','#estimate','#monthtotals','#savepo'].map(k=>[k,{hidden:true,textContent:'',scrollIntoView(){}}]));
 const global={hidden:false,textContent:'Discount exceeds order value'};
 const body={lines:[{slot_id:'a',standard_cents:9000}],discount_type:'FIXED',discount_value:10000};
 const c=vm.createContext({container:{ownerDocument:{querySelector:()=>global}},$:s=>nodes[s],working:false,loading:false,onError:()=>{throw Error('Unexpected global error')},getBody:()=>body,available:[{slot_id:'a',locality_id:'A'}],monthSummary:()=>[['2026-11',1]],euro:n=>'€'+(n/100).toFixed(2),Set});
 vm.runInContext(source.slice(source.indexOf('function clearErrors()'),source.indexOf('\n function file(')),c);
 vm.runInContext(source.slice(source.indexOf('const estimate=()=>'),source.indexOf('\n const showChoices='))+'\nglobalThis.estimate=estimate;',c);
 return {nodes,global,body,c};
}
test('excessive discount appears beside review; correcting it clears local and stale global errors',()=>{
 const h=harness();h.c.estimate();assert.equal(h.global.hidden,true);assert.equal(h.nodes['#poerror'].hidden,false);assert.match(h.nodes['#poerror'].textContent,/€90.00/);
 h.body.discount_value=1000;h.c.estimate();assert.equal(h.nodes['#poerror'].hidden,true);assert.equal(h.nodes['#poerror'].textContent,'');assert.match(h.nodes['#estimate'].textContent,/€80.00/);
});
test('preview or creation server errors stay near the action and clear on successful retry',async()=>{
 const h=harness();await h.c.run(async()=>{throw Error('Server rejected preview')},null,true);assert.equal(h.nodes['#poerror'].textContent,'Server rejected preview');assert.equal(h.global.hidden,true);
 await h.c.run(async()=>{},null,true);assert.equal(h.nodes['#poerror'].hidden,true);
});

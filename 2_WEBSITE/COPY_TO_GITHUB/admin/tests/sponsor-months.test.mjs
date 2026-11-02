import {test} from 'node:test';import assert from 'node:assert/strict';
import {expandSelection,monthSummary} from '../assets/sponsor-months.mjs';
test('extending a selected 68-locality month selects the second month and retains prices',()=>{
 const november=Array.from({length:68},(_,i)=>({slot_id:'SL'+i,locality_id:'L'+i,advertising_month:'2026-11-01',selected:true,price:'30.00'}));
 const december=november.map(r=>({...r,slot_id:'NEW~'+r.locality_id+'~2026-12-01',advertising_month:'2026-12-01',new_slot:true}));
 const result=expandSelection([...november,...december],new Map(november.map(r=>[r.slot_id,r])),true,'99.00');
 assert.equal(result.filter(r=>r.selected).length,136);assert.equal(result.reduce((n,r)=>n+Number(r.price),0),4080);assert.deepEqual(monthSummary(result),[['2026-11',68],['2026-12',68]]);
 assert.equal(Math.round(result.reduce((n,r)=>n+Number(r.price)*100,0)*0.3),122400);
});
test('partial locality selection carries to new months; occupied/linked slots stay unselected',()=>{
 const old={slot_id:'a',locality_id:'L1',advertising_month:'2026-11-01',selected:true,price:'45.00'},other={slot_id:'b',locality_id:'L2',advertising_month:'2026-11-01',selected:false,price:'30.00'};
 const next=[old,other,{slot_id:'new-a',locality_id:'L1',advertising_month:'2026-12-01'},{slot_id:'new-b',locality_id:'L2',advertising_month:'2026-12-01'},{slot_id:'full',locality_id:'L1',advertising_month:'2027-01-01',blocked:true}];
 const result=expandSelection(next,new Map([[old.slot_id,old],[other.slot_id,other]]),false,'30.00');assert.deepEqual(result.map(r=>r.selected),[true,false,true,false,false]);assert.equal(result[2].price,'45.00');assert.equal(expandSelection(next,new Map(),true,'30.00').at(-1).selected,false);
});

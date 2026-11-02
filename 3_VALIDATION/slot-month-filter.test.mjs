import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('existing allocations stay empty until a valid month is entered and match only that month',()=>{
 const source=readFileSync(new URL('../2_WEBSITE/COPY_TO_GITHUB/admin/assets/app.mjs',import.meta.url),'utf8');
 const values={'#slotfilter':'','#monthfilter':'','#statusfilter':'ACTIVE'};
 const context=vm.createContext({$:s=>({value:values[s]}),data:{slots:[{slot_id:'a',sponsor_id:'s',advertising_month:'2026-10-01',status:'APPROVED'},{slot_id:'b',sponsor_id:'s',advertising_month:'2026-11-01',status:'APPROVED'}]}});
 vm.runInContext(source.slice(source.indexOf('function shownSlots()'),source.indexOf('\nfunction slotRows()')),context);
 assert.equal(context.shownSlots().length,0);values['#monthfilter']='2026';assert.equal(context.shownSlots().length,0);
 values['#monthfilter']='2026-11';assert.equal(context.shownSlots().length,1);assert.equal(context.shownSlots()[0].slot_id,'b');
 values['#monthfilter']='';assert.equal(context.shownSlots().length,0);
});

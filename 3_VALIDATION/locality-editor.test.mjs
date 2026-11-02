import {test} from 'node:test';
import assert from 'node:assert/strict';
import {localityFields,readLocalityFields,bindLocalityFields} from '../2_WEBSITE/COPY_TO_GITHUB/admin/assets/locality-location.mjs';
import {node} from './dom-fixture.mjs';
test('locality editor shows saved or bundled starting coordinates and source',()=>{
 const saved=localityFields({name:'Żejtun',center_latitude:35.856123,center_longitude:14.531456,center_source:'Administrator'});
 assert.match(saved,/35.856123/);assert.match(saved,/Source: Administrator/);
 const fallback=localityFields({name:'Żejtun'});assert.match(fallback,/35.857/);assert.match(fallback,/Bundled locality starting point/);
 assert.match(localityFields({name:'Unknown'}),/General Malta starting point/);
});
test('unchanged form omits coordinates; manual edits and bundled reset produce numeric pairs',()=>{
 const dialog=node('dialog'),form=node('form');form.innerHTML='<input name="name" value="Żejtun">'+localityFields({name:'Żejtun'});form.closest=()=>dialog;const query=form.querySelector.bind(form);form.querySelector=s=>s==='[name=name]'?form.parsed.find(el=>el.attrs.name==='name'):query(s);
 bindLocalityFields(form,{name:'Żejtun'});assert.deepEqual(readLocalityFields(form),{});
 const lat=form.querySelector('#localityLatitude');lat.value='35.856123';lat.listeners.input();
 assert.deepEqual(readLocalityFields(form),{center_latitude:35.856123,center_longitude:14.532});
 lat.value='';assert.throws(()=>readLocalityFields(form),/valid latitude/);
 form.querySelector('#localityDefaultPoint').onclick();assert.deepEqual(readLocalityFields(form),{center_latitude:35.857,center_longitude:14.532});
});

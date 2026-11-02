import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {node} from './dom-fixture.mjs';
import {renderNoticeOptions} from '../2_WEBSITE/COPY_TO_GITHUB/admin/assets/notice-options.mjs';
import {normaliseOptions,optionsSignature,setOptionDeleted,validateGrid} from '../2_WEBSITE/COPY_TO_GITHUB/admin/assets/notice-options-model.mjs';
import {loadOptions,optionSelect,noticeTags} from '../2_WEBSITE/COPY_TO_GITHUB/noticeboard/options.mjs';
const defaults={categories:[{id:'activity',label:'Activities'},{id:'other',label:'Other'}],audiences:[{id:'all',label:'All'},{id:'families',label:'Families'}]};
async function harness(){const container=node();let data=normaliseOptions(defaults),published='',revision=1;const calls=[];const result=()=>({...structuredClone(data),revision:String(revision),publication:{state:published===optionsSignature(data)?'published':'unpublished',published_at:published?'2026-10-31T07:00:00Z':null}});await renderNoticeOptions({container,esc:s=>String(s??''),isCurrent:()=>true,api:{request:async(path,req)=>{if(req){calls.push(req.body);data=normaliseOptions(req.body);revision++;if(req.body.publish)published=optionsSignature(data)}return result()}}});return {container,calls,$:s=>container.querySelector(s),rows:()=>container.querySelector('#choiceRows').innerHTML};}
test('grid has cells and distinct Save/Publish; editing stays local until save, then publication is separate',async()=>{
 const h=await harness();assert.match(h.container.innerHTML,/<th scope="col">Name<\/th>/);assert(h.$('#saveChoices').disabled);assert(!h.$('#publishChoices').disabled);
 const input=h.container.querySelectorAll('[data-id]').find(n=>n.dataset.id==='activity');input.value='Family activities';input.oninput();assert(!h.$('#saveChoices').disabled);assert(h.$('#publishChoices').disabled);assert.equal(h.calls.length,0);
 await h.$('#choicesForm').onsubmit({preventDefault(){}});assert.equal(h.calls.length,1);assert.equal(h.calls[0].publish,false);assert(!h.$('#publishChoices').disabled);assert.match(h.$('#choicesStatus').textContent,/waiting for publication/);
 await h.$('#publishChoices').onclick();assert.equal(h.calls.length,2);assert.equal(h.calls[1].publish,true);assert(h.$('#publishChoices').disabled);assert.match(h.$('#choicesStatus').textContent,/up to date/);
});
test('delete/restore is staged and preserves IDs; All/Other have no delete actions',async()=>{
 const h=await harness();assert(!h.container.querySelectorAll('[data-delete]').some(n=>n.dataset.delete==='other'));h.container.querySelectorAll('[data-delete]').find(n=>n.dataset.delete==='activity').onclick();assert.match(h.rows(),/Deleted/);assert(h.$('#publishChoices').disabled);
 await h.$('#choicesForm').onsubmit({preventDefault(){}});assert.equal(h.calls[0].categories.find(o=>o.id==='activity').active,false);h.container.querySelectorAll('[data-delete]').find(n=>n.dataset.delete==='activity').onclick();await h.$('#choicesForm').onsubmit({preventDefault(){}});assert.equal(h.calls[1].categories.find(o=>o.id==='activity').active,true);
 h.container.querySelectorAll('[data-kind]').find(n=>n.dataset.kind==='audiences').onclick();assert.match(h.rows(),/Families/);assert(!h.container.querySelectorAll('[data-delete]').some(n=>n.dataset.delete==='all'));
});
test('adding a row and invalid duplicate names require correction before saving',async()=>{
 const h=await harness();h.$('#addChoice').onclick();await h.$('#choicesForm').onsubmit({preventDefault(){}});assert.equal(h.calls.length,0);assert.match(h.$('#choicesStatus').textContent,/Enter a name/);const input=h.container.querySelectorAll('[data-id]').find(n=>n.dataset.id.startsWith('option-'));input.value='Activities';input.oninput();await h.$('#choicesForm').onsubmit({preventDefault(){}});assert.equal(h.calls.length,0);assert.match(h.$('#choicesStatus').textContent,/unique/);input.value='Workshops';input.oninput();await h.$('#choicesForm').onsubmit({preventDefault(){}});assert.equal(h.calls[0].categories.length,3);
});
test('deleted choices disappear from new dropdown selections but remain readable on old notices',async()=>{
 const saved=globalThis.fetch;globalThis.fetch=async()=>new Response(JSON.stringify({...defaults,categories:[{id:'activity',label:'Activities',active:false},{id:'other',label:'Other'}]}),{status:200});try{await loadOptions();assert(!optionSelect('categories','',true).includes('value="activity"'));assert.match(optionSelect('categories','activity'),/Activities \(deleted\)/);assert.match(noticeTags({category_id:'activity'}),/Activities/)}finally{globalThis.fetch=saved}
});
test('grid protects permanent choices and the Admin version uses central CONFIG',()=>{
 assert.throws(()=>setOptionDeleted(normaliseOptions(defaults),'categories','other',true),/permanent/);const data=normaliseOptions(defaults);data.categories.push({id:'dupe',label:'Activities',active:true});assert.throws(()=>validateGrid(data),/unique/);
 const app=readFileSync(new URL('../2_WEBSITE/COPY_TO_GITHUB/admin/assets/app.mjs',import.meta.url),'utf8');assert.match(app,/class="admin-version" aria-label="Admin frontend version \$\{esc\(CONFIG.version\)\}/);
});

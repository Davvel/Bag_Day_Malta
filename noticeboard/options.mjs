import {selectionIds} from './selection.mjs?v=1.1.126';
import {API,esc} from './shared.mjs?v=1.1.126';
let options={categories:[{id:'other',label:'Other'}],audiences:[{id:'all',label:'All'}]};
const CACHE_KEY='bagday-noticeboard-options-v1';
let loadedAt=0,pending=null,hasSaved=false;
export let optionsWarning='';
const valid=data=>data&&['categories','audiences'].every(k=>Array.isArray(data[k])&&data[k].length&&data[k].every(o=>o&&typeof o.id==='string'&&typeof o.label==='string'));
try{const saved=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');if(valid(saved?.options)){options=saved.options;hasSaved=true}}catch{}
export function loadOptions(){
 if(pending)return pending;if(Date.now()-loadedAt<60000)return Promise.resolve(options);
 pending=(async()=>{try{
  let failure;
  for(let attempt=0;attempt<2;attempt++){try{
   const r=await fetch(API+'/public/noticeboard-options.json',{credentials:'omit',signal:AbortSignal.timeout(10000)});
   if(!r.ok)throw Error('Could not load notice categories and audiences');const data=await r.json();if(!valid(data))throw Error('Invalid notice categories or audiences');
   options=data;hasSaved=true;loadedAt=Date.now();optionsWarning='';try{localStorage.setItem(CACHE_KEY,JSON.stringify({saved_at:loadedAt,options}))}catch{}return options;
  }catch(e){failure=e}}
  optionsWarning=hasSaved?'Using saved categories and audiences. Connect and try again to refresh them.':'Categories and audiences are temporarily unavailable. Try again to load them.';
  if(hasSaved)return options;throw failure;
 }finally{pending=null}})();return pending;
}
export function optionSelect(kind,selected='',filter=false){return (filter?'<option value="">'+(kind==='categories'?'All categories':'All audiences')+'</option>':kind==='categories'?'<option value="" disabled '+(!selected?'selected':'')+'>Select a category *</option>':'')+options[kind].filter(o=>(o.active!==false||o.id===selected)&&!(filter&&kind==='audiences'&&o.id==='all')).map(o=>`<option value="${esc(o.id)}" ${o.id===selected?'selected':''}>${esc(o.label)}${o.active===false?' (deleted)':''}</option>`).join('')}
export function noticeTags(i){const label=(kind,id)=>options[kind].find(o=>o.id===id)?.label||id;return `<p class="hint notice-tags">${selectionIds(i.category_id||'other').map(id=>esc(label('categories',id))).join(' · ')}<br>${selectionIds(i.audience_id||'all').map(id=>esc(label('audiences',id))).join(' · ')}</p>`}
export function multiSelectionHTML(kind,value){const selected=selectionIds(value).filter(id=>id!=='all'),name=kind==='categories'?'category_id':'audience_id',label=kind==='categories'?'Categories':'Target audiences';return `<fieldset class="notice-multiselect compact-multiselect" data-kind="${kind}" data-field="${name}"><legend>${label} <span class="hint">(optional)</span></legend><details><summary><span class="selection-count"></span><span aria-hidden="true">⌄</span></summary><div class="selection-choices">${options[kind].filter(o=>o.id!=='all'&&(o.active!==false||selected.includes(o.id))).map(o=>`<label><input type="checkbox" value="${esc(o.id)}" ${selected.includes(o.id)?'checked':''}>${esc(o.label)}${o.active===false?' (deleted)':''}</label>`).join('')}</div></details><p class="hint">Choose up to 5, or leave blank.</p></fieldset>`}
export function bindMultiSelections(form){for(const box of form.querySelectorAll('.notice-multiselect')){const checks=[...box.querySelectorAll('input[type="checkbox"]')];const update=()=>{const picked=checks.filter(c=>c.checked);box.querySelector('.selection-count').textContent=picked.length?picked.length+' selected':'None selected';checks.forEach(c=>c.disabled=!c.checked&&picked.length>=5)};checks.forEach(c=>c.addEventListener('change',update));update()}}
export function readMultiSelections(form){const data={};for(const box of form.querySelectorAll('.notice-multiselect')){const ids=[...box.querySelectorAll('input:checked')].map(c=>c.value);if(ids.length>5)throw Error('Choose up to 5 selections.');data[box.dataset.field]=ids}return data}


export const optionLabel=(kind,id)=>options[kind].find(o=>o.id===id)?.label||id;

import {API,esc} from './shared.mjs?v=1.1.122';
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
export function noticeTags(i){const label=(kind,id)=>options[kind].find(o=>o.id===id)?.label||id;return `<p class="hint notice-tags">${esc(label('categories',i.category_id||'other'))} · ${esc(label('audiences',i.audience_id||'all'))}</p>`}

export const optionLabel=(kind,id)=>options[kind].find(o=>o.id===id)?.label||id;

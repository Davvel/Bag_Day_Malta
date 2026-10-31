import {API,esc} from './shared.mjs?v=1.1.112';
let options={categories:[{id:'other',label:'Other'}],audiences:[{id:'all',label:'All'}]};
let loadedAt=0;export async function loadOptions(){if(Date.now()-loadedAt<60000)return options;const r=await fetch(API+'/public/noticeboard-options.json',{credentials:'omit',signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('Could not load notice categories and audiences');options=await r.json();loadedAt=Date.now();return options}
export function optionSelect(kind,selected='',filter=false){return (filter?'<option value="">'+(kind==='categories'?'All categories':'All audiences')+'</option>':kind==='categories'?'<option value="" disabled '+(!selected?'selected':'')+'>Select a category *</option>':'')+options[kind].filter(o=>!(filter&&kind==='audiences'&&o.id==='all')).map(o=>`<option value="${esc(o.id)}" ${o.id===selected?'selected':''}>${esc(o.label)}</option>`).join('')}
export function noticeTags(i){const label=(kind,id)=>options[kind].find(o=>o.id===id)?.label||id;return `<p class="hint notice-tags">${esc(label('categories',i.category_id||'other'))} · ${esc(label('audiences',i.audience_id||'all'))}</p>`}

export const optionLabel=(kind,id)=>options[kind].find(o=>o.id===id)?.label||id;

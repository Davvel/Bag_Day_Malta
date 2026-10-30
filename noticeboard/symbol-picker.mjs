import {EMOJI_PALETTE} from '../reuse/emoji-palette.mjs?v=1.1.103';
import {isEmoji} from '../reuse/custom-emoji.mjs?v=1.1.103';
import {esc,request} from './shared.mjs?v=1.1.103';
const events=[['📌','pin announcement'],['🎉','celebration festa party'],['🎵','music concert'],['🎭','theatre drama'],['🎲','bingo games'],['⛪','church mass parish'],['🚧','road works closure'],['🚓','police safety'],['🏛️','council meeting'],['⚽','football sport'],['🎨','art exhibition'],['📚','books library'],['🩸','blood donation'],['🌳','environment tree'],['🧹','cleanup'],['🍽️','food dinner'],['🚶','walk hike'],['🎄','christmas'],['🐣','easter'],['🚌','bus transport'],['💃','dance'],['🎬','cinema film'],['❤️','health charity'],['🎤','talk singing'],['🏃','run race']].map(([symbol,name])=>({symbol,name,group:'Events'}));
const palette=[...events,...EMOJI_PALETTE].filter((v,i,a)=>a.findIndex(x=>x.symbol===v.symbol)===i);
let calls=[],lastInput='',lastSymbol='';
export function symbolPickerHTML(value=''){return `<fieldset class="notice-symbol-picker"><legend>Calendar symbol (optional)</legend><div class="symbol-current"><span id="symbolPreview" aria-hidden="true">${esc(value||'📌')}</span><label>Paste one emoji<input name="icon_emoji" value="${esc(value)}" maxlength="128" placeholder="📌 default pin" autocomplete="off"></label></div><div class="toolbar"><button type="button" class="secondary" id="autoNoticeSymbol">Auto Find</button><button type="button" class="secondary" id="manualNoticeSymbol" aria-expanded="false">Manual Select</button><button type="button" class="secondary" id="clearNoticeSymbol">Use default 📌</button></div><p class="hint">No selection? We show 📌. Tap calendar symbols to read events.</p><p id="symbolStatus" class="hint" role="status"></p><div id="symbolPalette" hidden><label>Find a symbol<input id="symbolSearch" type="search" placeholder="Music, church, bingo…"></label><div id="symbolChoices" class="symbol-choices"></div></div></fieldset>`}
export function bindSymbolPicker(form,token){
 const field=form.elements.icon_emoji,preview=form.querySelector('#symbolPreview'),status=form.querySelector('#symbolStatus'),auto=form.querySelector('#autoNoticeSymbol');
 function show(value){field.value=value;field.setCustomValidity(value&&!isEmoji(value)?'Paste one complete emoji, or leave empty for the default pin.':'');preview.textContent=isEmoji(value)?value:'📌'}
 field.oninput=()=>show(field.value.trim());
 form.querySelector('#clearNoticeSymbol').onclick=()=>show('');
 function choices(q=''){const words=q.toLowerCase().trim().split(/\s+/);const matches=palette.filter(e=>words.every(w=>(e.name+' '+(e.keywords||'')+' '+e.group+' '+e.symbol).toLowerCase().includes(w)));const list=form.querySelector('#symbolChoices');list.innerHTML=matches.map(e=>`<button type="button" title="${esc(e.name)}" aria-label="${esc(e.name)}" data-symbol="${esc(e.symbol)}">${esc(e.symbol)}</button>`).join('')||'<p>No matching symbols. You can paste an emoji instead.</p>';list.querySelectorAll('[data-symbol]').forEach(b=>b.onclick=()=>{show(b.dataset.symbol);form.querySelector('#symbolPalette').hidden=true;form.querySelector('#manualNoticeSymbol').setAttribute('aria-expanded','false')})}
 form.querySelector('#manualNoticeSymbol').onclick=e=>{const p=form.querySelector('#symbolPalette');p.hidden=!p.hidden;e.currentTarget.setAttribute('aria-expanded',String(!p.hidden));if(!p.hidden){choices();form.querySelector('#symbolSearch').focus()}};
 form.querySelector('#symbolSearch').oninput=e=>choices(e.target.value);
 auto.onclick=async()=>{
  if(!form.elements.title.value.trim()){status.textContent='Enter a title first.';form.elements.title.focus();return}
  const input={title:form.elements.title.value.trim(),description:form.elements.description.value.trim()},key=JSON.stringify(input);
  if(key===lastInput&&lastSymbol){show(lastSymbol);status.textContent='Using the previous suggestion for this text.';return}
  calls=calls.filter(t=>Date.now()-t<60000);if(calls.length>=4){status.textContent='You have used 4 suggestions. Try again in a minute, or select manually.';return}
  auto.disabled=true;calls.push(Date.now());status.textContent='Finding a symbol…';
  try{const data=await request('/noticeboard/icons-suggest',{method:'POST',body:input,token});if(!form.isConnected)return;if(!isEmoji(data.icon_emoji))throw Error('No usable suggestion. Choose manually.');lastInput=key;lastSymbol=data.icon_emoji;show(lastSymbol);status.textContent='Symbol suggested. You can change it.'}catch(e){if(form.isConnected)status.textContent=e.message}finally{auto.disabled=false}
 };
 show(field.value);
}

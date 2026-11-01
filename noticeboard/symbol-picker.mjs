import {EMOJI_PALETTE} from '../reuse/emoji-palette.mjs?v=1.1.135';
import {isEmoji} from '../reuse/custom-emoji.mjs?v=1.1.135';
import {esc} from './shared.mjs?v=1.1.135';
const events=[['📌','pin announcement'],['🎉','celebration festa party'],['🎵','music concert'],['🎭','theatre drama'],['🎲','bingo games'],['⛪','church mass parish'],['🚧','road works closure'],['🚓','police safety'],['🏛️','council meeting'],['⚽','football sport'],['🎨','art exhibition'],['📚','books library'],['🩸','blood donation'],['🌳','environment tree'],['🧹','cleanup'],['🍽️','food dinner'],['🚶','walk hike'],['🎄','christmas'],['🐣','easter'],['🚌','bus transport'],['💃','dance'],['🎬','cinema film'],['❤️','health charity'],['🎤','talk singing'],['🏃','run race']].map(([symbol,name])=>({symbol,name,group:'Events'}));
const palette=[...events,...EMOJI_PALETTE].filter((v,i,a)=>a.findIndex(x=>x.symbol===v.symbol)===i);
const segmenter=new Intl.Segmenter('en',{granularity:'grapheme'});
export function symbolPickerHTML(value=''){
 return `<fieldset class="notice-symbol-picker simple-symbol-picker"><legend>Choose a symbol</legend>
 <label class="single-symbol-label">Your symbol<input name="icon_emoji" required value="${esc(value)}" autocomplete="off" spellcheck="false" aria-describedby="symbolHint symbolStatus"></label>
 <p id="symbolHint" class="hint">Choose an icon below, or paste one emoji.</p>
 <label>Find a symbol<input id="symbolSearch" type="search" placeholder="Music, church, bingo…" autocomplete="off"></label>
 <div id="symbolChoices" class="symbol-choices" aria-label="Available symbols"></div>
 <button type="button" id="usePinSymbol" class="secondary">I can’t find a suitable icon — use 📌</button>
 <p id="symbolStatus" class="hint" role="status"></p></fieldset>`;
}
export function bindSymbolPicker(form){
 const field=form.elements.icon_emoji,list=form.querySelector('#symbolChoices'),status=form.querySelector('#symbolStatus');
 function highlight(){
  for(const button of list.querySelectorAll('[data-symbol]'))button.setAttribute('aria-pressed',String(button.dataset.symbol===field.value));
 }
 function readInput(){
  const value=Array.from(segmenter.segment(field.value.trim()),part=>part.segment)[0]||'';
  field.value=value;
  const valid=!value||isEmoji(value);
  field.setCustomValidity(valid?'':'Choose one emoji from the grid, or paste an emoji.');
  status.textContent=valid?'':field.validationMessage;
  highlight();
 }
 field.addEventListener('input',event=>{if(!event.isComposing)readInput()});
 field.addEventListener('compositionend',readInput);
 field.addEventListener('focus',()=>field.select());
 list.addEventListener('click',event=>{
  const button=event.target.closest('[data-symbol]');if(!button)return;
  field.value=button.dataset.symbol;
  field.dispatchEvent(new Event('input',{bubbles:true}));
 });
 function choices(query=''){
  const words=query.toLowerCase().trim().split(/\s+/);
  const matches=palette.filter(entry=>entry.symbol!=='📌'&&words.every(word=>(entry.name+' '+(entry.keywords||'')+' '+entry.group+' '+entry.symbol).toLowerCase().includes(word)));
  list.innerHTML=matches.map(entry=>`<button type="button" title="${esc(entry.name)}" aria-label="${esc(entry.name)}" data-symbol="${esc(entry.symbol)}">${esc(entry.symbol)}</button>`).join('')||'<p>No matching symbols. Try another word or paste an emoji above.</p>';
  highlight();
 }
 form.querySelector('#symbolSearch').addEventListener('input',event=>choices(event.target.value));
 form.querySelector('#usePinSymbol').onclick=()=>{field.value='📌';field.dispatchEvent(new Event('input',{bubbles:true}))};
 choices();readInput();
}

import {noticeLink} from './links.mjs?v=1.1.109';
import {syncNoticeboardSponsors} from './sponsors.mjs?v=1.1.109';
import {localityNames,localityKey} from './routes.mjs?v=1.1.109';
import {sections,esc,icon,today,visibleItems,calendarURL,readPublishedCSV} from './shared.mjs?v=1.1.109';
import {eventSymbol,longDate,filterNoticeBoards,highlightNotice,monthCells,moveMonth} from './discovery.mjs?v=1.1.109';
const root=document.querySelector('#root'),dialog=document.querySelector('#noticeDialog');
let pages=[],loaded=false,error='',generation=0,renderedDate='',lookup=new Map(),expanded=new Set(),selectedDay='',swipe=null,suppressUntil=0,searchTimer=0;
const params=()=>new URLSearchParams(location.search);
// Backwards-compatible entry for old event-search bookmarks; dates no longer constrain notice search.
if(params().get('view')==='search'){const u=new URL(location.href);for(const k of ['view','section','range','from','to'])u.searchParams.delete(k);history.replaceState(history.state,'',u);}
const savedLocality=()=>{try{return localStorage.getItem('bag-day-locality-v1')}catch{return null}};
let locality=params().get('locality')||savedLocality()||'Żejtun';
function section(){return sections[params().get('section')]?params().get('section'):null}
function href(patch){const u=new URL(location.href);for(const [k,v] of Object.entries(patch)){if(v===null||v==='')u.searchParams.delete(k);else u.searchParams.set(k,v)}return u.pathname+u.search;}
function navigate(patch,{replace=false,entry=false}={}){
 if(dialog.open)dialog.close();
 const steps=history.state?.bagDayHomeSteps,state={noticeboard:true,noticeEntry:entry,...(Number.isInteger(steps)&&steps>0?{bagDayHomeSteps:steps+(replace?0:1)}:{})};
 history[replace?'replaceState':'pushState'](state,'',href(patch));render();if(!entry)window.scrollTo(0,0);
}
function openEntry(item){navigate({locality:item.locality||locality,section:item.section||section(),view:params().get('view')==='calendar'?'calendar':null,entry:item.entry_id},{entry:true})}
function closeEntry(){if(history.state?.noticeEntry)history.back();else navigate({entry:null},{replace:true})}
function badge(item){if(item.kind==='info')return `<span class="notice-emoji" aria-hidden="true">${esc(eventSymbol(item))}</span><span>Info</span>`;
 const d=new Date(item.end_date+'T12:00:00Z');return `<span class="date-weekday">${d.toLocaleDateString('en-GB',{weekday:'short',timeZone:'UTC'}).toUpperCase()}</span><strong>${d.getUTCDate()}</strong><span>${d.toLocaleDateString('en-GB',{month:'short',timeZone:'UTC'}).toUpperCase()}</span>`;}
function card(item,search=false){
 const id=String(lookup.size);lookup.set(id,item);
 return `<article class="notice notice-with-symbol"><button type="button" class="notice-symbol" data-open="${id}" aria-label="Read ${esc(item.title)}"><span aria-hidden="true">${esc(eventSymbol(item))}</span></button><div class="notice-copy"><button class="notice-open" data-open="${id}"><span class="notice-title">${highlightNotice(item.title,search?params().get('q')||'':'')}</span>${search?`<span class="result-place">${esc(item.locality)} · ${esc(sections[item.section]?.name||'')}</span>`:''}<span class="notice-description">${highlightNotice(item.description,search?params().get('q')||'':'')}</span></button>${noticeLink(item)}</div>${item.kind==='event'?`<a class="notice-date-add" href="${esc(calendarURL(item,item.locality||locality))}" target="_blank" rel="noopener" aria-label="${esc(longDate(item.end_date))}. Add ${esc(item.title)} to Google Calendar" title="Add to Google Calendar"><span class="date-chip">${badge(item)}</span><span class="date-add-action">${icon('calendar')}<span>Add</span></span></a>`:'<span class="notice-info-tag">Info</span>'}</article>`;
}
function showDetails(item){dialog.innerHTML=`<div class="notice-modal-heading"><span class="pill">${esc(eventSymbol(item))} ${item.kind==='event'?esc(longDate(item.end_date)):'Information'}</span><button type="button" class="notice-circle-close" id="closeNotice" aria-label="Close notice" title="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div><h2>${esc(item.title)}</h2><p class="hint">${esc(locality)} · ${esc(sections[section()]?.name||'Community')}</p><p class="modal-text">${esc(item.description)}</p>${noticeLink(item)}<div class="toolbar">${item.kind==='event'?`<a class="primary" href="${esc(calendarURL(item,locality))}" target="_blank" rel="noopener">${icon('calendar')} Add to Google Calendar</a>`:''}</div>`;dialog.querySelector('#closeNotice').onclick=closeEntry;dialog.showModal();}
function calendarHTML(items,key){const p=params(),month=/^\d{4}-(0[1-9]|1[0-2])$/.test(p.get('month')||'')?p.get('month'):today().slice(0,7),events=items.filter(i=>i.kind==='event'),byDate=new Map();for(const i of events){if(!byDate.has(i.end_date))byDate.set(i.end_date,[]);byDate.get(i.end_date).push(i)}
 const monthName=new Date(month+'-01T12:00:00Z').toLocaleDateString('en-GB',{month:'long',year:'numeric',timeZone:'UTC'});
 return `<div class="events-calendar" data-calendar data-month="${month}"><div class="month-nav"><button class="secondary" data-month-step="-1" aria-label="Previous month">‹</button><label>Month<input type="month" id="eventMonth" value="${month}" aria-label="Calendar month"></label><button class="secondary" data-month-step="1" aria-label="Next month">›</button></div><h3 class="month-name" aria-live="polite">${esc(monthName)}</h3><p class="hint">Dated events only. Swipe left or right to change month. Tap a symbol or underlined title to read a notice.</p><div class="event-weekdays" aria-hidden="true">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>`<span>${d}</span>`).join('')}</div><div class="event-month-grid">${monthCells(month).map(date=>{if(!date)return '<div class="empty-day" aria-hidden="true"></div>';const entries=byDate.get(date)||[];return `<div class="event-day ${date===today()?'is-today':''}" aria-label="${esc(longDate(date))}"><span class="day-number">${Number(date.slice(-2))}</span><div class="event-symbols">${entries.slice(0,2).map(i=>{const id=String(lookup.size);lookup.set(id,{...i,section:key});return `<button type="button" data-open="${id}" title="${esc(i.title)} — ${esc(longDate(date))}" aria-label="${esc(i.title)} — ${esc(longDate(date))}"><span class="calendar-event-symbol" aria-hidden="true">${esc(eventSymbol(i))}</span><span class="calendar-event-title" aria-hidden="true">${esc(i.title)}</span></button>`}).join('')}${entries.length>2?`<button class="more-events" data-day="${date}" aria-label="Show all ${entries.length} events on ${esc(longDate(date))}">+${entries.length-2}</button>`:''}</div></div>`}).join('')}</div>${!events.some(i=>i.end_date.startsWith(month))?'<p class="empty">No published events this month.</p>':''}${selectedDay&&byDate.has(selectedDay)?`<div class="day-events" tabindex="-1"><h3>${esc(longDate(selectedDay))}</h3>${byDate.get(selectedDay).map(i=>card({...i,section:key})).join('')}</div>`:''}</div>`;
}
function searchHTML(){const p=params(),all=p.get('all')==='1';return `<form id="noticeSearch" class="notice-search"><div class="notice-search-heading"><label for="noticeQuery">Search for a notice</label><label class="notice-scope"><span id="noticeScopeText">${all?'In all localities':'In this locality only'}</span><span class="notice-switch"><input id="noticeScope" type="checkbox" role="switch" aria-label="Search in all localities" ${all?'checked':''}><span aria-hidden="true" class="notice-switch-track"></span></span></label></div><div class="notice-search-input"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/></svg><input id="noticeQuery" name="q" type="search" autocomplete="off" placeholder="Type to find a notice…" value="${esc(p.get('q')||'')}" aria-label="Search for a notice"><button id="clearNoticeSearch" type="button" aria-label="Clear notice search" title="Clear search" ${p.get('q')?'':'disabled'}>×</button></div></form>`;}
function searchOptions(){const p=params();return {q:p.get('q')||'',locality,allLocalities:p.get('all')==='1'};}
function writeSearchURL(query,all){
 const u=new URL(location.href);if(query)u.searchParams.set('q',query);else u.searchParams.delete('q');if(all)u.searchParams.set('all','1');else u.searchParams.delete('all');
 for(const key of ['range','from','to'])u.searchParams.delete(key);
 history.replaceState(history.state,'',u);
}
function bindSearch(){
 const form=root.querySelector('#noticeSearch');if(!form)return;
 const input=form.querySelector('#noticeQuery'),scope=form.querySelector('#noticeScope'),clear=form.querySelector('#clearNoticeSearch');
 const apply=(immediate=false)=>{writeSearchURL(input.value,scope.checked);clear.disabled=!input.value;clearTimeout(searchTimer);if(immediate)renderBoards();else searchTimer=setTimeout(renderBoards,100);};
 input.addEventListener('input',e=>{if(!e.isComposing)apply()});input.addEventListener('compositionend',()=>apply());
 scope.onchange=()=>{form.querySelector('#noticeScopeText').textContent=scope.checked?'In all localities':'In this locality only';apply(true)};
 clear.onclick=()=>{input.value='';apply(true);input.focus({preventScroll:true})};
 form.onsubmit=e=>{e.preventDefault();apply(true)};
}
function renderBoards(){
 clearTimeout(searchTimer);const p=params(),kind=section(),options=searchOptions(),searching=!!options.q.trim(),groups=filterNoticeBoards(pages,options,today());lookup=new Map();
 const container=root.querySelector('#sections');if(!container)return;container.replaceChildren();
 let count=0;
 for(const key of kind?[kind]:groups.map(g=>g.section)){
  const info=sections[key],items=groups.find(g=>g.section===key)?.items||[],isExpanded=!!kind||searching||expanded.has(locality+':'+key),isCalendar=kind&&p.get('view')==='calendar';count+=items.length;
  const s=document.createElement('section');s.className=`section ${key} ${kind?'detail-list':'overview'} ${isExpanded?'expanded':''} ${searching?'search-matches':''}`;
  s.innerHTML=`<div class="section-heading"><span class="section-symbol">${icon(info.icon)}</span><h2>${info.name}</h2><span class="count">${items.length} ${searching?(items.length===1?'match':'matches'):(items.length===1?'notice':'notices')}</span></div><div class="section-controls">${!kind&&!searching?`<button class="secondary" data-expand="${key}" aria-expanded="${!!isExpanded}" aria-controls="list-${key}">${isExpanded?'▴ Show less':'▾ Show all'}</button>`:''}<a class="secondary" href="${esc(href({locality,section:key,view:isCalendar?null:'calendar',entry:null}))}" data-route title="${isCalendar?'View notices':'Events calendar'}" aria-label="${info.name}: ${isCalendar?'view notices':'events calendar'}">${icon(isCalendar?'info':'calendar')}<span>${isCalendar?'Notices':'Calendar'}</span></a>${!kind?`<a class="secondary" href="${esc(href({locality,section:key,view:null,entry:null}))}" data-route aria-label="Open ${info.name} section on its own"><span aria-hidden="true">↗</span><span>Open section</span></a>`:''}</div>${isCalendar?calendarHTML(items,key):`<div class="notice-list" id="list-${key}" aria-label="${info.name} notices">${items.length?(isExpanded?items:items.slice(0,1)).map(i=>card(i,searching)).join(''):`<p class="empty">${loaded?(searching?'No matching notices.':'No current notices.'):'Notices will appear here.'}</p>`}</div>${!kind&&!isExpanded&&items.length>1?`<p class="hint">Showing 1 of ${items.length} notices · select Show all to expand.</p>`:''}`}`;
  container.append(s);
 }
 if(!kind&&searching&&!groups.length){const empty=document.createElement('p');empty.className='empty';empty.setAttribute('role','status');empty.textContent=loaded?'No matching notices'+(options.allLocalities?' in Malta & Gozo.':' in this locality.'):'Loading notices…';container.append(empty);}
 const resultStatus=root.querySelector('#noticeSearchStatus');if(resultStatus)resultStatus.textContent=searching?`${count} matching notices in ${groups.length} sections.`:'';
 root.querySelectorAll('[data-route]').forEach(a=>a.onclick=e=>{e.preventDefault();selectedDay='';const u=new URL(a.href);navigate({section:u.searchParams.get('section'),view:u.searchParams.get('view'),entry:null})});
 root.querySelectorAll('[data-expand]').forEach(b=>b.onclick=()=>{const key=locality+':'+b.dataset.expand;expanded.has(key)?expanded.delete(key):expanded.add(key);renderBoards();root.querySelector(`[data-expand="${b.dataset.expand}"]`)?.focus({preventScroll:true})});
 root.querySelectorAll('[data-open]').forEach(b=>b.onclick=e=>{if(e.detail&&performance.now()<suppressUntil)return;openEntry(lookup.get(b.dataset.open))});
 root.querySelectorAll('[data-month-step]').forEach(b=>b.onclick=()=>changeMonth(Number(b.dataset.monthStep)));
 root.querySelector('#eventMonth')?.addEventListener('change',e=>{if(/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value)){selectedDay='';navigate({month:e.target.value},{replace:true})}});
 root.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>{selectedDay=b.dataset.day;renderBoards();root.querySelector('.day-events')?.focus()});
}
function render(){
 clearTimeout(searchTimer);const p=params(),kind=section();renderedDate=today();
 const oldInput=root.querySelector('#noticeQuery'),restoreFocus=oldInput&&document.activeElement===oldInput,selection=restoreFocus?[oldInput.selectionStart,oldInput.selectionEnd]:null;
 locality=p.get('locality')||locality;const names=localityNames(window.WASTE_DATA?.localities||[],pages,locality);locality=names.find(n=>localityKey(n)===localityKey(locality))||locality;syncNoticeboardSponsors(locality);
 const heading=document.querySelector('#noticeboardTitle');if(heading)heading.textContent=kind?sections[kind].name+' notices':'Community noticeboard';
 root.innerHTML=`${kind?'<button id="overviewBack" class="secondary">← All noticeboards</button>':''}<div class="locality"><label class="locality-prompt" for="locality">Community Notices for</label><select id="locality" aria-label="Change noticeboard locality">${names.map(n=>`<option ${n===locality?'selected':''}>${esc(n)}</option>`).join('')}</select></div>${error?`<p class="status error" role="alert">${esc(error)} <button id="retry" class="secondary">Try again</button></p>`:''}${!loaded&&!error?'<p class="status">Loading notices…</p>':''}${!kind?searchHTML():`<a href="${esc(href({section:null,view:null,entry:null}))}" data-overview-search class="search-invitation">⌕ Search for a notice <span aria-hidden="true">›</span></a>`}<span id="noticeSearchStatus" class="notice-search-status" role="status" aria-live="polite"></span><div id="sections"></div>`;
 bindSearch();renderBoards();
 if(restoreFocus){const input=root.querySelector('#noticeQuery');input?.focus({preventScroll:true});if(input&&selection)input.setSelectionRange(...selection);}
 root.querySelector('#locality').onchange=e=>{selectedDay='';navigate({locality:e.target.value,entry:null,day:null},{replace:true})};
 root.querySelector('#overviewBack')?.addEventListener('click',()=>navigate({view:null,section:null,entry:null}));
 root.querySelector('[data-overview-search]')?.addEventListener('click',e=>{e.preventDefault();navigate({view:null,section:null,entry:null});root.querySelector('#noticeQuery')?.focus()});
 root.querySelector('#retry')?.addEventListener('click',load);
 const entry=p.get('entry');if(entry){const page=pages.find(p=>p.section===kind&&localityKey(p.locality_name)===localityKey(locality)),item=visibleItems(page?.csv,today()).find(i=>i.entry_id===entry);if(item){if(dialog.open)dialog.close();showDetails(item)}else if(loaded){if(dialog.open)dialog.close();const el=document.createElement('p');el.className='status';el.textContent='This notice has expired or is no longer published.';root.prepend(el)}}else if(dialog.open)dialog.close();
}
function changeMonth(delta){const el=root.querySelector('[data-calendar]');if(!el)return;selectedDay='';const month=moveMonth(el.dataset.month,delta);if(month<'0001-01'||month>'9999-12')return;navigate({month},{replace:true})}
const blocked=()=>window.BAG_DAY_VIEWPORT?.gesturesBlocked()||Number(window.visualViewport?.scale||1)>1.01;
root.addEventListener('touchstart',e=>{swipe=null;if(blocked()||e.touches.length!==1||!e.target.closest('[data-calendar]')||e.target.closest('input,select'))return;const t=e.touches[0];swipe={x:t.clientX,y:t.clientY,dx:0,dy:0};},{passive:true});
root.addEventListener('touchmove',e=>{if(blocked()||e.touches.length!==1){swipe=null;return}if(!swipe)return;const t=e.touches[0];swipe.dx=t.clientX-swipe.x;swipe.dy=t.clientY-swipe.y;},{passive:true});
root.addEventListener('touchend',e=>{const g=swipe;swipe=null;if(!g||e.touches.length||blocked())return;if(Math.abs(g.dx)>55&&Math.abs(g.dx)>Math.abs(g.dy)*1.5){suppressUntil=performance.now()+350;changeMonth(g.dx<0?1:-1)}},{passive:true});
for(const name of ['touchcancel','bag-day-gesture-cancel'])window.addEventListener(name,()=>{swipe=null});
for(const name of ['blur','pagehide','pageshow'])window.addEventListener(name,()=>{swipe=null});
dialog.addEventListener('cancel',e=>{e.preventDefault();closeEntry()});
async function load(){const seq=++generation;try{const data=await readPublishedCSV();if(seq!==generation)return;pages=data.pages;loaded=true;error='';try{localStorage.setItem('bagday-noticeboard-public-v1',JSON.stringify({saved_at:Date.now(),pages}))}catch{}render()}catch(e){if(seq!==generation)return;error=loaded?'Showing saved notices. Connect to refresh.':e.message;render()}}
try{const saved=JSON.parse(localStorage.getItem('bagday-noticeboard-public-v1')||'null');if(Array.isArray(saved?.pages)){pages=saved.pages;loaded=true}}catch{}
window.addEventListener('popstate',()=>{if(dialog.open)dialog.close();render()});window.addEventListener('pageshow',render);document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();load()}});setInterval(()=>{if(!document.hidden&&renderedDate!==today())render()},60000);window.addEventListener('online',load);render();load();

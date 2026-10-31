import {calendarDays,calendarContext} from './calendar-model.mjs?v=1.1.113';
import {loadOptions,optionSelect,noticeTags,optionLabel} from './options.mjs?v=1.1.113';
import {noticeLink} from './links.mjs?v=1.1.113';
import {syncNoticeboardSponsors} from './sponsors.mjs?v=1.1.113';
import {localityNames,localityKey} from './routes.mjs?v=1.1.113';
import {sections,esc,icon,today,visibleItems,calendarURL,readPublishedCSV} from './shared.mjs?v=1.1.113';
import {eventSymbol,longDate,filterNoticeBoards,highlightNotice,automaticNoticeSearch,pageNoticeResults,NOTICE_SEARCH_PAGE_SIZE,monthCells,moveMonth} from './discovery.mjs?v=1.1.113';
const root=document.querySelector('#root'),dialog=document.querySelector('#noticeDialog');
let pages=[],loaded=false,error='',generation=0,renderedDate='',lookup=new Map(),expanded=new Set(),selectedDay='',swipe=null,suppressUntil=0,searchTimer=0;
const params=()=>new URLSearchParams(location.search);
let draftQuery=params().get('q')||'',searchLimit=NOTICE_SEARCH_PAGE_SIZE,searchIdentity='',dayLimit=NOTICE_SEARCH_PAGE_SIZE,dayIdentity='';
// Backwards-compatible entry for old event-search bookmarks; dates no longer constrain notice search.
if(params().get('view')==='search'){const u=new URL(location.href);for(const k of ['view','section','range','from','to'])u.searchParams.delete(k);history.replaceState(history.state,'',u);}
// Old public audience=all links now mean the unfiltered All audiences choice.
if(params().get('audience')==='all'){const u=new URL(location.href);u.searchParams.delete('audience');history.replaceState(history.state,'',u);}
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
 return `<article class="notice notice-with-symbol"><button type="button" class="notice-symbol" data-open="${id}" aria-label="Read ${esc(item.title)}"><span aria-hidden="true">${esc(eventSymbol(item))}</span></button><div class="notice-copy"><button class="notice-open" data-open="${id}">${search?`<span class="result-place">${highlightNotice(item.locality,params().get('q')||'')}</span>`:''}<span class="notice-title">${highlightNotice(item.title,search?params().get('q')||'':'')}</span><span class="notice-description">${highlightNotice(item.description,search?params().get('q')||'':'')}</span></button>${noticeTags(item)}${noticeLink(item)}</div>${item.kind==='event'?`<a class="notice-date-add" href="${esc(calendarURL(item,item.locality||locality))}" target="_blank" rel="noopener" aria-label="${esc(longDate(item.end_date))}. Add ${esc(item.title)} to Google Calendar" title="Add to Google Calendar"><span class="date-chip">${badge(item)}</span><span class="date-add-action">${icon('calendar')}<span>Add</span></span></a>`:'<span class="notice-info-tag">Info</span>'}</article>`;
}
function showDetails(item){dialog.innerHTML=`<div class="notice-modal-heading"><span class="pill">${esc(eventSymbol(item))} ${item.kind==='event'?esc(longDate(item.end_date)):'Information'}</span><button type="button" class="notice-circle-close" id="closeNotice" aria-label="Close notice" title="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div><h2>${esc(item.title)}</h2><p class="hint">${esc(locality)} · ${esc(sections[section()]?.name||'Community')}</p>${noticeTags(item)}<p class="modal-text">${esc(item.description)}</p>${noticeLink(item)}<div class="toolbar">${item.kind==='event'?`<a class="primary" href="${esc(calendarURL(item,locality))}" target="_blank" rel="noopener">${icon('calendar')} Add to Google Calendar</a>`:''}</div>`;dialog.querySelector('#closeNotice').onclick=closeEntry;dialog.showModal();}
function calendarHTML(items,key){
 const p=params(),month=/^\d{4}-(0[1-9]|1[0-2])$/.test(p.get('month')||'')?p.get('month'):today().slice(0,7),byDate=calendarDays(items),options=searchOptions(),day=p.get('day')||selectedDay;
 const context=calendarContext({...options,section:sections[key]?.name||'',category:options.category?optionLabel('categories',options.category):'',audience:options.audience?optionLabel('audiences',options.audience):''});
 const dayKey=JSON.stringify([searchIdentity,key,day]);if(dayKey!==dayIdentity){dayIdentity=dayKey;dayLimit=NOTICE_SEARCH_PAGE_SIZE}
 const selected=byDate.get(day)||[],monthName=new Date(month+'-01T12:00:00Z').toLocaleDateString('en-GB',{month:'long',year:'numeric',timeZone:'UTC'});
 return `<div class="events-calendar" data-calendar data-month="${month}"><h3 class="calendar-context">${esc(context)}</h3><p class="hint">Dated notices only. Information notices remain in the notice list.</p><div class="month-nav"><button class="secondary" data-month-step="-1" aria-label="Previous month">‹</button><label>Month<input type="month" id="eventMonth" value="${month}" aria-label="Calendar month"></label><button class="secondary" data-month-step="1" aria-label="Next month">›</button></div><h3 class="month-name" aria-live="polite">${esc(monthName)}</h3><p class="hint">Tap a date to see its notices below. Swipe left or right to change month.</p><div class="event-weekdays" aria-hidden="true">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>`<span>${d}</span>`).join('')}</div><div class="event-month-grid">${monthCells(month).map(date=>{
 if(!date)return '<div class="empty-day" aria-hidden="true"></div>';const entries=byDate.get(date)||[],count=entries.length;
 return `<button type="button" class="event-day calendar-day ${date===today()?'is-today':''} ${date===day?'is-selected':''}" data-day="${date}" aria-pressed="${date===day}" aria-label="${esc(longDate(date))}: ${count} ${count===1?'notice':'notices'}"><span class="day-number">${Number(date.slice(-2))}</span>${count?`<span class="calendar-count"><strong>${count}</strong><span>${count===1?'notice':'notices'}</span></span>${!options.allLocalities?`<span class="calendar-day-symbols" aria-hidden="true">${entries.slice(0,2).map(i=>esc(eventSymbol(i))).join('')}</span>`:''}`:''}</button>`;
 }).join('')}</div>${![...byDate.keys()].some(d=>d.startsWith(month))?'<p class="empty">No matching dated notices this month.</p>':''}${day&&day.startsWith(month)?`<div class="day-events" tabindex="-1" aria-live="polite"><h3>${esc(longDate(day))} · ${selected.length} matching ${selected.length===1?'notice':'notices'}</h3><p class="hint">${esc(context)}</p>${selected.length?selected.slice(0,dayLimit).map(i=>card(i,true)).join(''):'<p class="empty">No matching dated notices on this day.</p>'}${selected.length?`<p role="status">Showing ${Math.min(dayLimit,selected.length)} of ${selected.length} notices</p>`:''}${selected.length>dayLimit?'<button type="button" class="secondary" id="moreDayResults">Show more</button>':''}</div>`:'<p class="empty">Select a date to view its notices.</p>'}</div>`;
}
function searchHTML(){const p=params(),all=p.get('all')==='1';return `<form id="noticeSearch" class="notice-search"><div class="notice-search-heading"><label for="noticeQuery">Search for a notice</label><label class="notice-scope"><span id="noticeScopeText">${all?'In all localities':'In this locality only'}</span><span class="notice-switch"><input id="noticeScope" type="checkbox" role="switch" aria-label="Search in all localities" ${all?'checked':''}><span aria-hidden="true" class="notice-switch-track"></span></span></label></div><div class="notice-search-input"><button type="submit" class="notice-search-submit" aria-label="Search notices" title="Search notices"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/></svg></button><input id="noticeQuery" name="q" type="search" autocomplete="off" placeholder="Type to find a notice…" value="${esc(draftQuery)}" aria-label="Search for a notice"><button id="clearNoticeSearch" type="button" aria-label="Clear notice search" title="Clear search" ${draftQuery?'':'disabled'}>×</button></div><div class="notice-filters"><label>Category<select id="noticeCategory">${optionSelect('categories',p.get('category')||'',true)}</select></label><label>Target audience<select id="noticeAudience">${optionSelect('audiences',p.get('audience')||'',true)}</select></label></div><div class="calendar-view-toolbar"><a class="secondary" data-route href="${esc(href({view:p.get('view')==='calendar'?null:'calendar',entry:null,day:null}))}" aria-label="${p.get('view')==='calendar'?'Show notices':'Open calendar for all matching notices'}">${icon(p.get('view')==='calendar'?'info':'calendar')} ${p.get('view')==='calendar'?'Show notices':'Calendar'}</a></div></form>`;}
function searchOptions(){const p=params();return {q:p.get('q')||'',locality,allLocalities:p.get('all')==='1',category:p.get('category')||'',audience:p.get('audience')==='all'?'':p.get('audience')||''};}
function writeSearchURL(query,all){
 const u=new URL(location.href);if(query)u.searchParams.set('q',query);else u.searchParams.delete('q');if(all)u.searchParams.set('all','1');else u.searchParams.delete('all');
 for(const key of ['range','from','to'])u.searchParams.delete(key);
 history.replaceState(history.state,'',u);
}
function bindSearch(){
 const form=root.querySelector('#noticeSearch');if(!form)return;
 const input=form.querySelector('#noticeQuery'),scope=form.querySelector('#noticeScope'),clear=form.querySelector('#clearNoticeSearch');
 let composing=false;for(const id of ['noticeCategory','noticeAudience'])form.querySelector('#'+id).onchange=()=>apply({immediate:true});
 const apply=({explicit=false,immediate=false}={})=>{
  clearTimeout(searchTimer);searchTimer=0;draftQuery=input.value;clear.disabled=!draftQuery;
  const query=draftQuery.trim(),all=scope.checked;
  const filterURL=new URL(location.href);for(const [key,id] of [['category','noticeCategory'],['audience','noticeAudience']]){const value=form.querySelector('#'+id).value;if(value)filterURL.searchParams.set(key,value);else filterURL.searchParams.delete(key)}history.replaceState(history.state,'',filterURL);
  // A short query runs only when deliberately submitted (Enter or the lens).
  if(query&&!explicit&&!automaticNoticeSearch(query)&&!form.querySelector('#noticeCategory').value&&!form.querySelector('#noticeAudience').value){
   writeSearchURL('',all);renderBoards();
   root.querySelector('#noticeSearchStatus').textContent='Type at least 3 characters, or press Enter or the search button.';
   return;
  }
  const commit=()=>{writeSearchURL(query,all);const u=new URL(location.href);for(const [key,id] of [['category','noticeCategory'],['audience','noticeAudience']]){const value=form.querySelector('#'+id).value;if(value)u.searchParams.set(key,value);else u.searchParams.delete(key)}history.replaceState(history.state,'',u);renderBoards()};
  if(immediate||!query)commit();else searchTimer=setTimeout(commit,400);
 };
 input.addEventListener('compositionstart',()=>{composing=true;clearTimeout(searchTimer);searchTimer=0});
 input.addEventListener('input',e=>{if(!e.isComposing&&!composing)apply()});
 input.addEventListener('compositionend',()=>{composing=false;apply()});
 scope.onchange=()=>{form.querySelector('#noticeScopeText').textContent=scope.checked?'In all localities':'In this locality only';apply({immediate:true,explicit:input.value.trim()===(params().get('q')||'')})};
 clear.onclick=()=>{input.value='';apply({immediate:true});input.focus({preventScroll:true})};
 form.onsubmit=e=>{e.preventDefault();if(!composing)apply({explicit:true,immediate:true})};
}
function renderBoards(){
 clearTimeout(searchTimer);searchTimer=0;const p=params(),kind=section(),options=searchOptions(),searching=options.allLocalities||!!options.q.trim()||!!options.category||!!options.audience;
 const identity=JSON.stringify([options.category,options.audience,options.q,options.allLocalities?'*':options.locality,options.allLocalities]);if(identity!==searchIdentity){searchIdentity=identity;searchLimit=NOTICE_SEARCH_PAGE_SIZE;}
 const isCalendarView=p.get('view')==='calendar',allGroups=filterNoticeBoards(pages,options,today()).filter(g=>!kind||g.section===kind),result=searching?pageNoticeResults(allGroups,searchLimit,options.allLocalities):null,groups=result?result.groups:allGroups;lookup=new Map();
 const container=root.querySelector('#sections');if(!container)return;container.replaceChildren();
 if(isCalendarView){
  const panel=document.createElement('section');panel.className='section '+(kind||'combined')+' detail-list calendar-panel';
  panel.innerHTML=`<div class="section-heading"><span class="section-symbol">${icon(sections[kind]?.icon||'calendar')}</span><h2>${sections[kind]?.name||'All noticeboards'}</h2><a class="heading-calendar" data-route href="${esc(href({view:null,entry:null,day:null}))}" aria-label="Show notices">${icon('info')}</a></div>${calendarHTML(allGroups.flatMap(g=>g.items),kind)}`;container.append(panel);
 }else{
 for(const key of kind?[kind]:groups.map(g=>g.section)){
  const info=sections[key],items=groups.find(g=>g.section===key)?.items||[],isExpanded=!!kind||searching||expanded.has(locality+':'+key),isCalendar=kind&&p.get('view')==='calendar';
  if(searching&&!items.length)continue;
  const s=document.createElement('section');
  if(loaded&&!searching&&!items.length&&!isCalendar){
   s.className=`section ${key} empty-board-banner`;s.innerHTML=`<span class="empty-board-icon">${icon(info.icon)}</span><span>No ${esc(info.name)} Notices found for ${esc(locality)}.</span>`;container.append(s);continue;
  }
  s.className=`section ${key} ${kind?'detail-list':'overview'} ${isExpanded?'expanded':''} ${searching?'search-matches':''}`;
  s.innerHTML=`<div class="section-heading"><span class="section-symbol">${icon(info.icon)}</span><h2>${info.name}</h2><a class="heading-calendar" href="${esc(href({section:key,view:'calendar',entry:null,day:null}))}" data-route aria-label="Open ${info.name} calendar">${icon('calendar')}</a><span class="count">${searching&&items.length!==(allGroups.find(g=>g.section===key)?.items.length||0)?items.length+' of '+allGroups.find(g=>g.section===key).items.length:items.length} ${searching?(items.length===1?'match':'matches'):(items.length===1?'notice':'notices')}</span></div><div class="section-controls" ${searching?'hidden':''}>${!kind&&!searching?`<button class="secondary" data-expand="${key}" aria-expanded="${!!isExpanded}" aria-controls="list-${key}">${isExpanded?'▴ Show less':'▾ Show all'}</button>`:''}${!kind?`<a class="secondary" href="${esc(href({locality,section:key,view:null,entry:null}))}" data-route aria-label="Open ${info.name} section on its own"><span aria-hidden="true">↗</span><span>Open section</span></a>`:''}</div>${isCalendar?calendarHTML(items,key):`<div class="notice-list" id="list-${key}" aria-label="${info.name} notices">${items.length?(isExpanded?items:items.slice(0,1)).map(i=>card(i,searching)).join(''):`<p class="empty">${loaded?(searching?'No matching notices.':'No current notices.'):'Notices will appear here.'}</p>`}</div>${!kind&&!isExpanded&&items.length>1?`<p class="hint">Showing 1 of ${items.length} notices · select Show all to expand.</p>`:''}`}`;
  container.append(s);
 }
 if(!kind&&searching&&!groups.length){const empty=document.createElement('p');empty.className='empty';empty.setAttribute('role','status');empty.textContent=loaded?'No matching notices'+(options.allLocalities?' in Malta & Gozo.':' in this locality.'):'Loading notices…';container.append(empty);}
 if(searching&&result.total){
  const paging=document.createElement('div');paging.className='notice-search-paging';
  paging.innerHTML=`<p role="status">Showing ${result.shown} of ${result.total} matching notices</p>${result.shown<result.total?'<button type="button" class="secondary" id="moreNoticeResults">Show more</button>':''}`;
  container.append(paging);
  paging.querySelector('#moreNoticeResults')?.addEventListener('click',()=>{const previous=new Set([...lookup.values()].map(i=>JSON.stringify([i.page_id,i.entry_id])));searchLimit+=NOTICE_SEARCH_PAGE_SIZE;renderBoards();const added=[...lookup].find(([,i])=>!previous.has(JSON.stringify([i.page_id,i.entry_id])));const next=added?root.querySelector(`.notice-open[data-open="${added[0]}"]`):null;next?.focus({preventScroll:true});next?.scrollIntoView({block:'nearest'})});
 }
 }
 const resultStatus=root.querySelector('#noticeSearchStatus');if(resultStatus)resultStatus.textContent=searching&&!isCalendarView?`${result.total} matching notices. Showing ${result.shown}.`:'';
 root.querySelectorAll('[data-route]').forEach(a=>a.onclick=e=>{e.preventDefault();selectedDay='';const u=new URL(a.href);navigate({section:u.searchParams.get('section'),view:u.searchParams.get('view'),entry:null,day:null})});
 root.querySelectorAll('[data-expand]').forEach(b=>b.onclick=()=>{const key=locality+':'+b.dataset.expand;expanded.has(key)?expanded.delete(key):expanded.add(key);renderBoards();root.querySelector(`[data-expand="${b.dataset.expand}"]`)?.focus({preventScroll:true})});
 root.querySelectorAll('[data-open]').forEach(b=>b.onclick=e=>{if(e.detail&&performance.now()<suppressUntil)return;openEntry(lookup.get(b.dataset.open))});
 root.querySelectorAll('[data-month-step]').forEach(b=>b.onclick=()=>changeMonth(Number(b.dataset.monthStep)));
 root.querySelector('#eventMonth')?.addEventListener('change',e=>{if(/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value)){selectedDay='';navigate({month:e.target.value,day:null},{replace:true})}});
 root.querySelector('#moreDayResults')?.addEventListener('click',()=>{dayLimit+=NOTICE_SEARCH_PAGE_SIZE;renderBoards();root.querySelector('#moreDayResults')?.focus({preventScroll:true})});
 root.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>{selectedDay=b.dataset.day;history.replaceState(history.state,'',href({day:selectedDay,entry:null}));renderBoards();root.querySelector('.day-events')?.focus({preventScroll:true});root.querySelector('.day-events')?.scrollIntoView({block:'start',behavior:'smooth'})});
}
function render(){
 const pendingSearch=!!searchTimer;clearTimeout(searchTimer);searchTimer=0;const p=params(),kind=section();renderedDate=today();
 const oldInput=root.querySelector('#noticeQuery'),restoreFocus=oldInput&&document.activeElement===oldInput,selection=restoreFocus?[oldInput.selectionStart,oldInput.selectionEnd]:null;
 locality=p.get('locality')||locality;const names=localityNames(window.WASTE_DATA?.localities||[],pages,locality);locality=names.find(n=>localityKey(n)===localityKey(locality))||locality;syncNoticeboardSponsors(locality);
 const heading=document.querySelector('#noticeboardTitle');if(heading)heading.textContent=kind?sections[kind].name+' notices':'Community noticeboard';
 root.innerHTML=`${kind?'<button id="overviewBack" class="secondary">← All noticeboards</button>':''}<div class="locality"><label class="locality-prompt" for="locality">Community Notices for</label><select id="locality" aria-label="Change noticeboard locality">${names.map(n=>`<option ${n===locality?'selected':''}>${esc(n)}</option>`).join('')}</select></div>${error?`<p class="status error" role="alert">${esc(error)} <button id="retry" class="secondary">Try again</button></p>`:''}${!loaded&&!error?'<p class="status">Loading notices…</p>':''}${searchHTML()}<span id="noticeSearchStatus" class="notice-search-status" role="status" aria-live="polite"></span><div id="sections"></div>`;
 bindSearch();renderBoards();if(pendingSearch)root.querySelector('#noticeQuery')?.dispatchEvent(new Event('input'));
 if(restoreFocus){const input=root.querySelector('#noticeQuery');input?.focus({preventScroll:true});if(input&&selection)input.setSelectionRange(...selection);}
 root.querySelector('#locality').onchange=e=>{selectedDay='';navigate({locality:e.target.value,entry:null,day:null},{replace:true})};
 root.querySelector('#overviewBack')?.addEventListener('click',()=>navigate({view:null,section:null,entry:null}));
 root.querySelector('[data-overview-search]')?.addEventListener('click',e=>{e.preventDefault();navigate({view:null,section:null,entry:null});root.querySelector('#noticeQuery')?.focus()});
 root.querySelector('#retry')?.addEventListener('click',load);
 const entry=p.get('entry');if(entry){const page=pages.find(p=>p.section===kind&&localityKey(p.locality_name)===localityKey(locality)),item=visibleItems(page?.csv,today()).find(i=>i.entry_id===entry);if(item){if(dialog.open)dialog.close();showDetails(item)}else if(loaded){if(dialog.open)dialog.close();const el=document.createElement('p');el.className='status';el.textContent='This notice has expired or is no longer published.';root.prepend(el)}}else if(dialog.open)dialog.close();
}
function changeMonth(delta){const el=root.querySelector('[data-calendar]');if(!el)return;selectedDay='';const month=moveMonth(el.dataset.month,delta);if(month<'0001-01'||month>'9999-12')return;navigate({month,day:null},{replace:true})}
const blocked=()=>window.BAG_DAY_VIEWPORT?.gesturesBlocked()||Number(window.visualViewport?.scale||1)>1.01;
root.addEventListener('touchstart',e=>{swipe=null;if(blocked()||e.touches.length!==1||!e.target.closest('[data-calendar]')||e.target.closest('input,select'))return;const t=e.touches[0];swipe={x:t.clientX,y:t.clientY,dx:0,dy:0};},{passive:true});
root.addEventListener('touchmove',e=>{if(blocked()||e.touches.length!==1){swipe=null;return}if(!swipe)return;const t=e.touches[0];swipe.dx=t.clientX-swipe.x;swipe.dy=t.clientY-swipe.y;},{passive:true});
root.addEventListener('touchend',e=>{const g=swipe;swipe=null;if(!g||e.touches.length||blocked())return;if(Math.abs(g.dx)>55&&Math.abs(g.dx)>Math.abs(g.dy)*1.5){suppressUntil=performance.now()+350;changeMonth(g.dx<0?1:-1)}},{passive:true});
for(const name of ['touchcancel','bag-day-gesture-cancel'])window.addEventListener(name,()=>{swipe=null});
for(const name of ['blur','pagehide','pageshow'])window.addEventListener(name,()=>{swipe=null});
dialog.addEventListener('cancel',e=>{e.preventDefault();closeEntry()});
async function load(){
 try{await loadOptions()}catch(e){error='Notice filters could not load. '+e.message;render();return;}const seq=++generation;try{const data=await readPublishedCSV();if(seq!==generation)return;pages=data.pages;loaded=true;error='';try{localStorage.setItem('bagday-noticeboard-public-v1',JSON.stringify({saved_at:Date.now(),pages}))}catch{}render()}catch(e){if(seq!==generation)return;error=loaded?'Showing saved notices. Connect to refresh.':e.message;render()}}
try{const saved=JSON.parse(localStorage.getItem('bagday-noticeboard-public-v1')||'null');if(Array.isArray(saved?.pages)){pages=saved.pages;loaded=true}}catch{}
window.addEventListener('popstate',()=>{draftQuery=params().get('q')||'';if(dialog.open)dialog.close();render()});window.addEventListener('pageshow',render);document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();load()}});setInterval(()=>{if(!document.hidden&&renderedDate!==today())render()},60000);window.addEventListener('online',load);render();load();

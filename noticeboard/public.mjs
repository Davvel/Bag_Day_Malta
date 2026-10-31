import {calendarDays,calendarContext,calendarMonthCells} from './calendar-model.mjs?v=1.1.114';
import {loadOptions,optionSelect,noticeTags,optionLabel} from './options.mjs?v=1.1.114';
import {noticeLink} from './links.mjs?v=1.1.114';
import {syncNoticeboardSponsors} from './sponsors.mjs?v=1.1.114';
import {localityNames,localityKey} from './routes.mjs?v=1.1.114';
import {sections,esc,icon,today,visibleItems,calendarURL,readPublishedCSV} from './shared.mjs?v=1.1.114';
import {eventSymbol,longDate,filterNoticeBoards,highlightNotice,pageNoticeResults,NOTICE_SEARCH_PAGE_SIZE,moveMonth} from './discovery.mjs?v=1.1.114';
const root=document.querySelector('#root'),dialog=document.querySelector('#noticeDialog'),filterDialog=document.querySelector('#filterDialog');
let pages=[],loaded=false,error='',generation=0,renderedDate='',lookup=new Map(),swipe=null,suppressUntil=0,searchLimit=NOTICE_SEARCH_PAGE_SIZE,dayLimit=NOTICE_SEARCH_PAGE_SIZE,searchIdentity='',dayIdentity='',pendingFilters=null,renderedURL=location.href;
const params=()=>new URLSearchParams(location.search);
const savedLocality=()=>{try{return localStorage.getItem('bag-day-locality-v1')}catch{return null}};
let locality=params().get('locality')||savedLocality()||'Żejtun';
if(params().get('audience')==='all'||params().get('view')==='search'){
 const u=new URL(location.href);if(u.searchParams.get('audience')==='all')u.searchParams.delete('audience');if(u.searchParams.get('view')==='search')u.searchParams.delete('view');history.replaceState(history.state,'',u);
}
function section(){return sections[params().get('section')]?params().get('section'):null}
function view(){return ['calendar','day'].includes(params().get('view'))?params().get('view'):'list'}
function currentMonth(){const m=params().get('month')||'';return /^\d{4}-(0[1-9]|1[0-2])$/.test(m)?m:today().slice(0,7)}
function href(patch){const u=new URL(location.href);for(const [k,v] of Object.entries(patch)){if(v===null||v==='')u.searchParams.delete(k);else u.searchParams.set(k,v)}return u.pathname+u.search}
function rememberPosition(){history.replaceState({...history.state,noticeScroll:window.scrollY||0,noticeLimit:searchLimit,noticeDayLimit:dayLimit},'',location.href)}
function restorePosition(){searchLimit=history.state?.noticeLimit||NOTICE_SEARCH_PAGE_SIZE;dayLimit=history.state?.noticeDayLimit||NOTICE_SEARCH_PAGE_SIZE;renderBoards();requestAnimationFrame(()=>window.scrollTo(0,history.state?.noticeScroll||0))}
function navigate(patch,{replace=false,entry=false,scroll=true,day=false}={}){
 if(dialog.open)dialog.close();if(!replace)rememberPosition();
 const steps=history.state?.bagDayHomeSteps,returnCalendar=day?href({view:'calendar',day:patch.day,month:currentMonth(),entry:null,page:null,filters:null}):history.state?.returnCalendar;
 const state={noticeboard:true,noticeEntry:entry,noticeDay:day,...(returnCalendar?{returnCalendar}:{}),...(Number.isInteger(steps)&&steps>0?{bagDayHomeSteps:steps+(replace?0:1)}:{})};
 history[replace?'replaceState':'pushState'](state,'',href(patch));render();if(scroll&&!entry)window.scrollTo(0,0);
}
function openEntry(item){navigate({entry:item.entry_id,page:item.page_id},{entry:true,scroll:false})}
function closeEntry(){if(history.state?.noticeEntry)history.back();else navigate({entry:null,page:null},{replace:true,scroll:false})}
function returnToCalendar(){if(history.state?.noticeDay)history.back();else navigate({view:'calendar',entry:null,page:null,filters:null},{replace:true})}
function searchOptions(){const p=params();return {q:p.get('q')||'',locality,allLocalities:p.get('all')==='1',category:p.get('category')||'',audience:p.get('audience')==='all'?'':p.get('audience')||''}}
function contextText(){const o=searchOptions();return calendarContext({...o,section:sections[section()]?.name||'',category:o.category?optionLabel('categories',o.category):'',audience:o.audience?optionLabel('audiences',o.audience):''})}
function filterCount(){const o=searchOptions();return [o.category,o.audience,o.q.trim()].filter(Boolean).length}
function compactToolbar(names){const mode=view(),all=params().get('all')==='1',count=filterCount();return `<div class="notice-controls"><div class="compact-toolbar"><label class="compact-locality"><span class="sr-only">Locality</span><select id="locality" aria-label="Change noticeboard locality"><option value="*" ${all?'selected':''}>All localities</option>${names.map(n=>`<option value="${esc(n)}" ${!all&&n===locality?'selected':''}>${esc(n)}</option>`).join('')}</select></label><div class="view-switch" role="group" aria-label="Noticeboard view"><button type="button" data-view="list" aria-pressed="${mode==='list'}">List</button><button type="button" data-view="calendar" aria-pressed="${mode!=='list'}">Calendar</button></div><button type="button" id="openFilters" class="filter-button" aria-haspopup="dialog" aria-controls="filterDialog">${icon('filter')}<span>Filters${count?' · '+count:''}</span></button></div><button class="compact-context" id="contextFilters" aria-label="${esc(contextText())}. Edit filters" title="${esc(contextText())}">${esc(contextText())}</button></div>`}
function openFilters(){if(filterDialog.open)return;rememberPosition();history.pushState({...history.state,noticeFilter:true},'',href({filters:'1',entry:null,page:null}));renderFilterPanel()}
function closeFilters(){if(history.state?.noticeFilter)history.back();else{history.replaceState(history.state,'',href({filters:null}));filterDialog.close()}}
function renderFilterPanel(){
 if(filterDialog.open)return;const o=searchOptions();
 filterDialog.innerHTML=`<div class="sheet-handle" aria-hidden="true"></div><div class="filter-sheet-heading"><h2>Filter notices</h2><button type="button" id="closeFilters" class="sheet-close" aria-label="Close filters">×</button></div><form id="filterForm"><label>Search<input type="search" name="q" autocomplete="off" placeholder="Find a notice…" value="${esc(o.q)}"></label><fieldset class="scope-choice"><legend>Localities</legend><label><input type="radio" name="scope" value="local" ${!o.allLocalities?'checked':''}> This locality</label><label><input type="radio" name="scope" value="all" ${o.allLocalities?'checked':''}> All localities</label></fieldset><label>Noticeboard<select name="section"><option value="">All noticeboards</option>${Object.entries(sections).map(([id,s])=>`<option value="${id}" ${section()===id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></label><label>Category<select name="category">${optionSelect('categories',o.category,true)}</select></label><label>Target audience<select name="audience">${optionSelect('audiences',o.audience,true)}</select></label><div class="filter-actions"><button type="button" class="secondary" id="clearFilters">Clear</button><button class="primary" type="submit">Apply filters</button></div></form>`;
 filterDialog.querySelector('#closeFilters').onclick=closeFilters;
 const form=filterDialog.querySelector('#filterForm');
 filterDialog.querySelector('#clearFilters').onclick=()=>{for(const key of ['q','section','category','audience'])form.elements[key].value='';form.elements.scope.value='local'};
 form.onsubmit=e=>{e.preventDefault();const data=Object.fromEntries(new FormData(form));applyFilters(data)};
 filterDialog.showModal();
}
function applyFilters(data){
 const patch={q:String(data.q||'').trim(),section:sections[data.section]?data.section:null,category:data.category||null,audience:data.audience==='all'?null:data.audience||null,all:data.scope==='all'?'1':null,filters:null,entry:null,page:null};
 const previous=view()==='calendar'?(history.state?.noticeScroll||0):0;
 pendingFilters={patch,previous};filterDialog.close();if(history.state?.noticeFilter){history.back();return}commitFilters();
}
function commitFilters(){const {patch,previous}=pendingFilters;pendingFilters=null;history.replaceState({...history.state,noticeFilter:false,noticeScroll:previous,noticeLimit:NOTICE_SEARCH_PAGE_SIZE,noticeDayLimit:NOTICE_SEARCH_PAGE_SIZE},'',href(patch));render();requestAnimationFrame(()=>window.scrollTo(0,previous))}
function handlePopState(){
 if(pendingFilters){commitFilters();return}
 const previous=new URL(renderedURL),current=new URL(location.href);
 if(previous.searchParams.get('view')==='day'&&!previous.searchParams.get('entry')&&current.searchParams.get('view')==='calendar'){
  for(const key of ['locality','all','section','category','audience','q','month','day']){const value=previous.searchParams.get(key);if(value)current.searchParams.set(key,value);else current.searchParams.delete(key)}history.replaceState(history.state,'',current);
 }
 if(dialog.open)dialog.close();render();restorePosition();
}
function badge(item){if(item.kind==='info')return `<span class="notice-emoji" aria-hidden="true">${esc(eventSymbol(item))}</span><span>Info</span>`;
 const d=new Date(item.end_date+'T12:00:00Z');return `<span class="date-weekday">${d.toLocaleDateString('en-GB',{weekday:'short',timeZone:'UTC'}).toUpperCase()}</span><strong>${d.getUTCDate()}</strong><span>${d.toLocaleDateString('en-GB',{month:'short',timeZone:'UTC'}).toUpperCase()}</span>`;}
function card(item,search=false){
 const id=String(lookup.size);lookup.set(id,item);
 return `<article class="notice notice-with-symbol"><button type="button" class="notice-symbol" data-open="${id}" aria-label="Read ${esc(item.title)}"><span aria-hidden="true">${esc(eventSymbol(item))}</span></button><div class="notice-copy"><button class="notice-open" data-open="${id}">${search?`<span class="result-place">${highlightNotice(item.locality,params().get('q')||'')}</span>`:''}<span class="notice-title">${highlightNotice(item.title,search?params().get('q')||'':'')}</span><span class="notice-description">${highlightNotice(item.description,search?params().get('q')||'':'')}</span></button><span class="notice-publisher">${esc(sections[item.section]?.name||'Community')}</span>${noticeTags(item)}${noticeLink(item)}</div>${item.kind==='event'?`<a class="notice-date-add" href="${esc(calendarURL(item,item.locality||locality))}" target="_blank" rel="noopener" aria-label="${esc(longDate(item.end_date))}. Add ${esc(item.title)} to Google Calendar" title="Add to Google Calendar"><span class="date-chip">${badge(item)}</span><span class="date-add-action">${icon('calendar')}<span>Add</span></span></a>`:'<span class="notice-info-tag">Info</span>'}</article>`;
}
function showDetails(item){dialog.innerHTML=`<div class="notice-modal-heading"><span class="pill">${esc(eventSymbol(item))} ${item.kind==='event'?esc(longDate(item.end_date)):'Information'}</span><button type="button" class="notice-circle-close" id="closeNotice" aria-label="Close notice" title="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div><h2>${esc(item.title)}</h2><p class="hint">${esc(item.locality||locality)} · ${esc(sections[item.section||section()]?.name||'Community')}</p>${noticeTags(item)}<p class="modal-text">${esc(item.description)}</p>${noticeLink(item)}<div class="toolbar">${item.kind==='event'?`<a class="primary" href="${esc(calendarURL(item,item.locality||locality))}" target="_blank" rel="noopener">${icon('calendar')} Add to Google Calendar</a>`:''}</div>`;dialog.querySelector('#closeNotice').onclick=closeEntry;dialog.showModal();}
function calendarHTML(items){
 const month=currentMonth(),day=params().get('day'),byDate=calendarDays(items),all=searchOptions().allLocalities,monthName=new Date(month+'-01T12:00:00Z').toLocaleDateString('en-GB',{month:'long',year:'numeric',timeZone:'UTC'});
 return `<div class="events-calendar steady-calendar" data-calendar data-month="${month}"><div class="steady-month-nav"><button type="button" class="month-arrow" data-month-step="-1" aria-label="Previous month">‹</button><label class="month-picker"><span>${esc(monthName)}</span><input type="month" id="eventMonth" value="${month}" aria-label="Calendar month"></label><button type="button" class="month-arrow" data-month-step="1" aria-label="Next month">›</button></div><div class="event-weekdays" aria-hidden="true">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>`<span>${d}</span>`).join('')}</div><div class="event-month-grid">${calendarMonthCells(month).map(date=>{
 if(!date)return '<div class="empty-day" aria-hidden="true"></div>';const entries=byDate.get(date)||[],count=entries.length;
 return `<button type="button" class="event-day calendar-day ${date===today()?'is-today':''} ${date===day?'is-selected':''}" data-day="${date}" aria-pressed="${date===day}" aria-label="${esc(longDate(date))}: ${count} ${count===1?'notice':'notices'}"><span class="day-number">${Number(date.slice(-2))}</span>${count?`<span class="calendar-count"><strong>${count}</strong><span>${count===1?'notice':'notices'}</span></span>${!all?`<span class="calendar-day-symbols" aria-hidden="true">${entries.slice(0,2).map(i=>esc(eventSymbol(i))).join('')}</span>`:''}`:''}</button>`;
 }).join('')}</div><p class="calendar-footnote" role="status">${[...byDate.keys()].some(d=>d.startsWith(month))?'Tap a date to see its notices.':'No matching dated notices this month.'}</p></div>`;
}
function dayListHTML(items){
 const day=params().get('day')||'',valid=/^\d{4}-\d{2}-\d{2}$/.test(day)&&!Number.isNaN(Date.parse(day)),selected=valid?(calendarDays(items).get(day)||[]):[],identity=JSON.stringify([searchIdentity,section(),day]);
 if(identity!==dayIdentity){dayIdentity=identity;dayLimit=history.state?.noticeDayLimit||NOTICE_SEARCH_PAGE_SIZE}
 return `<div class="day-events" tabindex="-1"><div class="day-list-heading"><button type="button" class="secondary" id="backCalendar">← Calendar</button><h2>${valid?esc(longDate(day)):'Choose a date'}</h2></div><p class="day-total" role="status">${selected.length} matching ${selected.length===1?'notice':'notices'}</p>${selected.slice(0,dayLimit).map(i=>card(i,true)).join('')}${!selected.length?'<p class="empty">No matching dated notices on this day.</p>':`<p class="paging-status" role="status">Showing ${Math.min(dayLimit,selected.length)} of ${selected.length}</p>`}${selected.length>dayLimit?'<button type="button" class="secondary" id="moreDayResults">Show more</button>':''}</div>`;
}
function renderBoards(){
 const p=params(),kind=section(),options=searchOptions(),mode=view(),identity=JSON.stringify([options,kind]);
 if(identity!==searchIdentity){searchIdentity=identity;searchLimit=history.state?.noticeLimit||NOTICE_SEARCH_PAGE_SIZE}
 const allGroups=filterNoticeBoards(pages,options,today()).filter(g=>!kind||g.section===kind),container=root.querySelector('#sections');if(!container)return;
 lookup=new Map();container.replaceChildren();
 if(mode==='calendar'||mode==='day'){
  const panel=document.createElement('section');panel.className='section '+(kind||'combined')+' detail-list '+(mode==='calendar'?'calendar-panel':'day-list-panel');
  panel.innerHTML=mode==='calendar'?calendarHTML(allGroups.flatMap(g=>g.items)):dayListHTML(allGroups.flatMap(g=>g.items));container.append(panel);
 }else{
  const result=pageNoticeResults(allGroups,searchLimit,options.allLocalities);
  const normalOverview=!kind&&!options.allLocalities&&!options.q&&!options.category&&!options.audience;
  const displayGroups=normalOverview?allGroups.map(g=>result.groups.find(r=>r.section===g.section)||{section:g.section,items:[],empty:g.items.length===0}).filter(g=>g.items.length||g.empty):result.groups;
  for(const group of displayGroups){if(group.empty){const panel=document.createElement('section');panel.className='section '+group.section+' empty-board-banner';panel.innerHTML=`<span class="empty-board-icon">${icon(sections[group.section].icon)}</span><span>No ${esc(sections[group.section].name)} Notices found for ${esc(locality)}.</span>`;container.append(panel);continue}const info=sections[group.section],panel=document.createElement('section');panel.className='section '+group.section+' detail-list';panel.innerHTML=`<div class="section-heading"><span class="section-symbol">${icon(info.icon)}</span><h2>${esc(info.name)}</h2><a class="heading-calendar" href="${esc(href({section:group.section,view:'calendar',entry:null,page:null}))}" data-route aria-label="Open ${info.name} calendar">${icon('calendar')}</a><span class="count">${group.items.length} ${group.items.length===1?'notice':'notices'}</span></div><div class="notice-list">${group.items.map(i=>card(i,true)).join('')}</div>`;container.append(panel)}
  if(!result.total&&!normalOverview){const empty=document.createElement('p');empty.className='empty';empty.textContent=loaded?'No matching notices.':'Loading notices…';container.append(empty)}
  if(result.total){const paging=document.createElement('div');paging.className='notice-search-paging';paging.innerHTML=`<p role="status">Showing ${result.shown} of ${result.total} matching notices</p>${result.shown<result.total?'<button type="button" class="secondary" id="moreNoticeResults">Show more</button>':''}`;container.append(paging);paging.querySelector('#moreNoticeResults')?.addEventListener('click',()=>{searchLimit+=NOTICE_SEARCH_PAGE_SIZE;renderBoards();root.querySelector('#moreNoticeResults')?.focus({preventScroll:true})})}
 }
 root.querySelectorAll('[data-route]').forEach(a=>a.onclick=e=>{e.preventDefault();const u=new URL(a.href);navigate({section:u.searchParams.get('section'),view:u.searchParams.get('view'),entry:null,page:null});});
 root.querySelectorAll('[data-open]').forEach(b=>b.onclick=e=>{if(e.detail&&(blocked()||performance.now()<suppressUntil))return;openEntry(lookup.get(b.dataset.open))});
 root.querySelectorAll('[data-day]').forEach(b=>b.onclick=e=>{if(e.detail&&(blocked()||performance.now()<suppressUntil))return;history.replaceState(history.state,'',href({day:b.dataset.day}));navigate({view:'day',day:b.dataset.day,month:currentMonth(),entry:null,page:null},{day:true});});
 root.querySelectorAll('[data-month-step]').forEach(b=>b.onclick=()=>changeMonth(Number(b.dataset.monthStep)));
 root.querySelector('#eventMonth')?.addEventListener('change',e=>{if(/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value))navigate({month:e.target.value},{replace:true,scroll:false})});
 root.querySelector('#backCalendar')?.addEventListener('click',returnToCalendar);
 root.querySelector('#moreDayResults')?.addEventListener('click',()=>{dayLimit+=NOTICE_SEARCH_PAGE_SIZE;renderBoards();root.querySelector('#moreDayResults')?.focus({preventScroll:true})});
}
function render(){
 const p=params();renderedURL=location.href;renderedDate=today();locality=p.get('locality')||locality;
 const names=localityNames(window.WASTE_DATA?.localities||[],pages,locality);locality=names.find(n=>localityKey(n)===localityKey(locality))||locality;syncNoticeboardSponsors(locality);
 const heading=document.querySelector('#noticeboardTitle');if(heading)heading.textContent='Community notices';document.body.dataset.noticeView=view();
 root.innerHTML=`${compactToolbar(names)}${error?`<p class="status error" role="alert">${esc(error)} <button id="retry" class="secondary">Try again</button></p>`:''}<div id="sections"></div>`;
 renderBoards();
 root.querySelector('#locality').onchange=e=>navigate({locality:e.target.value==='*'?locality:e.target.value,all:e.target.value==='*'?'1':null,day:null,view:view()==='day'?'calendar':view(),entry:null,page:null});
 root.querySelector('#openFilters').onclick=openFilters;root.querySelector('#contextFilters').onclick=openFilters;
 root.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{if(b.dataset.view==='calendar'&&view()==='day'){returnToCalendar();return}if(b.dataset.view===view())return;navigate({view:b.dataset.view,entry:null,page:null})});
 root.querySelector('#retry')?.addEventListener('click',load);
 if(p.get('filters')==='1'){if(!filterDialog.open)renderFilterPanel()}else if(filterDialog.open)filterDialog.close();
 const entry=p.get('entry');if(entry){const page=pages.find(r=>p.get('page')?r.page_id===p.get('page'):r.section===section()&&localityKey(r.locality_name)===localityKey(locality)),item=visibleItems(page?.csv,today()).find(i=>i.entry_id===entry);if(item){if(dialog.open)dialog.close();showDetails({...item,locality:page.locality_name,section:page.section,page_id:page.page_id})}else if(loaded){if(dialog.open)dialog.close();const el=document.createElement('p');el.className='status';el.textContent='This notice has expired or is no longer published.';root.prepend(el)}}else if(dialog.open)dialog.close();
}
function changeMonth(delta){if(view()!=='calendar')return;const month=moveMonth(currentMonth(),delta);if(month<'0001-01'||month>'9999-12')return;navigate({month},{replace:true,scroll:false})}
filterDialog.addEventListener('cancel',e=>{e.preventDefault();closeFilters()});
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
window.addEventListener('popstate',handlePopState);window.addEventListener('pageshow',render);document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();load()}});setInterval(()=>{if(!document.hidden&&renderedDate!==today())render()},60000);window.addEventListener('online',load);render();load();

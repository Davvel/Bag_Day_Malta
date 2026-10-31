import {animateCalendarGrid,slideCalendarPages} from './calendar-motion.mjs?v=1.1.118';
import {calendarDays,calendarContext,calendarMonthCells,calendarBounds,boundedCalendarMonth} from './calendar-model.mjs?v=1.1.118';
import {loadOptions,optionSelect,noticeTags,optionLabel} from './options.mjs?v=1.1.118';
import {noticeLink} from './links.mjs?v=1.1.118';
import {syncNoticeboardSponsors} from './sponsors.mjs?v=1.1.118';
import {localityNames,localityKey} from './routes.mjs?v=1.1.118';
import {sections,esc,icon,today,visibleItems,calendarURL,readPublishedCSV} from './shared.mjs?v=1.1.118';
import {eventSymbol,longDate,filterNoticeBoards,highlightNotice,pageNoticeResults,NOTICE_SEARCH_PAGE_SIZE,moveMonth} from './discovery.mjs?v=1.1.118';
const root=document.querySelector('#root'),dialog=document.querySelector('#noticeDialog'),filterDialog=document.querySelector('#filterDialog');
let pages=[],loaded=false,error='',generation=0,renderedDate='',lookup=new Map(),swipe=null,suppressUntil=0,searchLimit=NOTICE_SEARCH_PAGE_SIZE,dayLimit=NOTICE_SEARCH_PAGE_SIZE,searchIdentity='',dayIdentity='',pendingFilters=null,renderedURL=location.href,monthBusy=false,renderEpoch=0,searchTimer=null;
const params=()=>new URLSearchParams(location.search);
const savedLocality=()=>{try{return localStorage.getItem('bag-day-locality-v1')}catch{return null}};
const homeLocality=savedLocality()||'Żejtun';
let locality=params().get('locality')||homeLocality;
// New visits and reloads return to the saved Home locality. In-document Back
// and browser history restoration retain the current browsing context.
const restoringVisit=performance.getEntriesByType?.('navigation')?.[0]?.type==='back_forward'&&history.state?.noticeboard;
if(!restoringVisit&&!params().get('entry')){const u=new URL(location.href);u.searchParams.set('locality',homeLocality);u.searchParams.delete('all');history.replaceState(history.state,'',u);locality=homeLocality;}

if(params().get('audience')==='all'||params().get('view')==='search'){
 const u=new URL(location.href);if(u.searchParams.get('audience')==='all')u.searchParams.delete('audience');if(u.searchParams.get('view')==='search')u.searchParams.delete('view');history.replaceState(history.state,'',u);
}
function section(){return sections[params().get('section')]?params().get('section'):null}
function view(){return ['calendar','day'].includes(params().get('view'))?params().get('view'):'list'}
function currentMonth(){return boundedCalendarMonth(params().get('month'),today())}
function href(patch){const u=new URL(location.href);for(const [k,v] of Object.entries(patch)){if(v===null||v==='')u.searchParams.delete(k);else u.searchParams.set(k,v)}return u.pathname+u.search}
function rememberPosition(){history.replaceState({...history.state,noticeScroll:root.querySelector('#sections')?.scrollTop||0,noticeLimit:searchLimit,noticeDayLimit:dayLimit},'',location.href)}
function restorePosition(){searchLimit=history.state?.noticeLimit||NOTICE_SEARCH_PAGE_SIZE;dayLimit=history.state?.noticeDayLimit||NOTICE_SEARCH_PAGE_SIZE;renderBoards();requestAnimationFrame(()=>root.querySelector('#sections')?.scrollTo?.(0,history.state?.noticeScroll||0))}
function navigate(patch,{replace=false,entry=false,scroll=true,day=false}={}){
 const feedPosition=root.querySelector('#sections')?.scrollTop||0;if(dialog.open)dialog.close();if(!replace)rememberPosition();
 const steps=history.state?.bagDayHomeSteps,returnCalendar=day?href({view:'calendar',day:patch.day,month:currentMonth(),entry:null,page:null,filters:null}):history.state?.returnCalendar;
 const state={noticeboard:true,noticeEntry:entry,noticeDay:day,...(returnCalendar?{returnCalendar}:{}),...(Number.isInteger(steps)&&steps>0?{bagDayHomeSteps:steps+(replace?0:1)}:{})};
 history[replace?'replaceState':'pushState'](state,'',href(patch));render();if(!scroll&&root.querySelector('#sections'))root.querySelector('#sections').scrollTop=feedPosition;if(scroll&&!entry)root.querySelector('#sections')?.scrollTo?.(0,0);
}
function openEntry(item){navigate({entry:item.entry_id,page:item.page_id},{entry:true,scroll:false})}
function closeEntry(){if(history.state?.noticeEntry)history.back();else navigate({entry:null,page:null},{replace:true,scroll:false})}
function returnToCalendar(){if(history.state?.noticeDay)history.back();else navigate({view:'calendar',entry:null,page:null,filters:null},{replace:true})}
function searchOptions(){const p=params();return {q:p.get('q')||'',locality,allLocalities:p.get('all')==='1',category:p.get('category')||'',audience:p.get('audience')==='all'?'':p.get('audience')||''}}
function contextText(){const o=searchOptions();return calendarContext({...o,section:sections[section()]?.name||'',category:o.category?optionLabel('categories',o.category):'',audience:o.audience?optionLabel('audiences',o.audience):''})}
function filterCount(){const o=searchOptions();return [o.category,o.audience,o.q.trim()].filter(Boolean).length}
function selectedSections(){const raw=params().get('sources');return raw===null?(section()?[section()]:Object.keys(sections)):raw.split(',').filter(k=>sections[k])}
function compactToolbar(names){const mode=view(),o=searchOptions(),selected=selectedSections();return `<div class="notice-controls"><form id="noticeSearch" class="inline-search" role="search"><input id="noticeQuery" type="search" name="q" aria-label="Search notices" placeholder="Search notices…" autocomplete="off" value="${esc(o.q)}"><button aria-label="Search notices" type="submit">${icon('search')}</button></form><div class="locality-controls"><label class="compact-locality"><select id="locality" aria-label="Noticeboard locality"><option value="" ${o.allLocalities?'selected':''}>All localities</option>${names.map(n=>`<option value="${esc(n)}" ${!o.allLocalities&&n===locality?'selected':''}>${esc(n)}</option>`).join('')}</select></label><label class="locality-scope"><span>All localities</span><span class="locality-toggle"><input id="localityScope" type="checkbox" role="switch" aria-label="Show all localities" ${o.allLocalities?'checked':''}><span aria-hidden="true"></span></span></label></div><div class="inline-filter-row"><select id="noticeCategory" aria-label="Category">${optionSelect('categories',o.category,true)}</select><select id="noticeAudience" aria-label="Audience">${optionSelect('audiences',o.audience,true)}</select><div class="view-switch" role="group" aria-label="Noticeboard view"><button type="button" data-view="list" aria-pressed="${mode==='list'}">List</button><button type="button" data-view="calendar" aria-pressed="${mode!=='list'}">Calendar</button></div></div><div class="source-checks">${['church','police','council'].map(k=>`<label><input type="checkbox" data-source="${k}" ${selected.includes(k)?'checked':''}>${k==='council'?'Council':esc(sections[k].name)}</label>`).join('')}<button type="button" id="noticeHelp" class="notice-help">ⓘ Help</button></div><hr class="notice-filter-divider"></div>`}
function updateTextSearch(value){
 const q=value.trim();clearTimeout(searchTimer);searchTimer=null;
 history.replaceState({...history.state,noticeLimit:NOTICE_SEARCH_PAGE_SIZE,noticeDayLimit:NOTICE_SEARCH_PAGE_SIZE},'',href({q:q||null,entry:null,page:null}));
 renderedURL=location.href;renderEpoch++;searchLimit=dayLimit=NOTICE_SEARCH_PAGE_SIZE;renderBoards();root.querySelector('#sections')?.scrollTo?.(0,0);
}
function queueTextSearch(value,composing=false){clearTimeout(searchTimer);searchTimer=null;if(composing)return;const q=value.trim();if(!q){updateTextSearch('');return}if([...q].length>2)searchTimer=setTimeout(()=>updateTextSearch(value),300);else if(params().get('q'))updateTextSearch('')}
function openNoticeHelp(){
 clearTimeout(searchTimer);searchTimer=null;rememberPosition();history.pushState({...history.state,noticeHelp:true},'',href({help:'1'}));renderNoticeHelp();
}
function closeNoticeHelp(){if(history.state?.noticeHelp)history.back();else{history.replaceState(history.state,'',href({help:null}));filterDialog.close()}}
function renderNoticeHelp(){
 filterDialog.setAttribute('aria-label','Help finding notices');
 const o=searchOptions(),active=[o.q?`Search text “${o.q}”`:null,!o.allLocalities?`Locality: ${locality}`:null,o.category?`Category: ${optionLabel('categories',o.category)}`:null,o.audience?`Target audience: ${optionLabel('audiences',o.audience)}`:null,selectedSections().length<3?'Some noticeboards are switched off':null].filter(Boolean);
 filterDialog.innerHTML=`<div class="filter-sheet-heading"><h2>Help finding notices</h2><button type="button" id="closeNoticeHelp" class="sheet-close" aria-label="Close help">×</button></div>${active.length?`<p><strong>Your current filters</strong></p><ul>${active.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`:'<p>You are browsing all categories, audiences and noticeboards.</p>'}<ul class="notice-help-tips"><li><strong>Search text:</strong> words in the search bar limit the results. Clear the text to see more. Search starts automatically after 3 characters; use Enter or the search icon for shorter searches.</li><li><strong>Category:</strong> some categories may have few notices. Try All categories.</li><li><strong>Target audience:</strong> choosing a particular audience narrows the results. Try All audiences.</li><li><strong>Noticeboards:</strong> tick Church, Police and Council to include every source.</li><li><strong>Locality:</strong> switch on All localities to look beyond your current locality.</li><li><strong>Calendar:</strong> only dated events appear. Try another month or use List to include information notices. Close a day's results with the circled × to return to the month.</li></ul><button type="button" id="helpShowAll" class="secondary">Clear filters & show all notices</button>`;
 filterDialog.querySelector('#closeNoticeHelp').onclick=closeNoticeHelp;
 filterDialog.querySelector('#helpShowAll').onclick=()=>{filterDialog.close();navigate({q:null,category:null,audience:null,section:null,sources:null,all:'1',view:'list',day:null,help:null,entry:null,page:null},{replace:true})};
 if(!filterDialog.open)filterDialog.showModal();
}
function groupResults(items){
 const o=searchOptions(),groups=new Map();
 for(const item of items){const key=item.section+'|'+item.locality;if(!groups.has(key))groups.set(key,{section:item.section,locality:item.locality,items:[]});groups.get(key).items.push(item)}
 return [...groups.values()].sort((a,b)=>['police','church','council'].indexOf(a.section)-['police','church','council'].indexOf(b.section)||a.locality.localeCompare(b.locality,'en')).map(g=>`<section class="section ${g.section} result-group"><div class="result-group-heading"><h2>${esc(sections[g.section]?.name||'Community')}</h2><span class="result-group-icon" aria-hidden="true">${icon(sections[g.section]?.icon)}</span></div><div class="result-locality">${esc(g.locality||locality)}</div><p class="result-filters">Category: ${esc(o.category?optionLabel('categories',o.category):'All')} · Target audience: ${esc(o.audience?optionLabel('audiences',o.audience):'All')}</p><div class="notice-list">${g.items.map(i=>card(i,true)).join('')}</div></section>`).join('');
}
function openFilters(){if(filterDialog.open)return;rememberPosition();history.pushState({...history.state,noticeFilter:true},'',href({filters:'1',entry:null,page:null}));renderFilterPanel()}
function closeFilters(){if(history.state?.noticeFilter)history.back();else{history.replaceState(history.state,'',href({filters:null}));filterDialog.close()}}
function renderFilterPanel(){
 if(filterDialog.open)return;const o=searchOptions();
 filterDialog.innerHTML=`<div class="filter-sheet-heading"><h2>Filter notices</h2><button type="button" id="closeFilters" class="sheet-close" aria-label="Close filters">×</button></div><form id="filterForm"><label>Search<input type="search" name="q" autocomplete="off" placeholder="Find a notice…" value="${esc(o.q)}"></label><label>Noticeboard<select name="section"><option value="">All noticeboards</option>${Object.entries(sections).map(([id,s])=>`<option value="${id}" ${section()===id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></label><label>Category<select name="category">${optionSelect('categories',o.category,true)}</select></label><label>Target audience<select name="audience">${optionSelect('audiences',o.audience,true)}</select></label><div class="filter-actions"><button type="button" class="secondary" id="clearFilters">Clear</button><button class="primary" type="submit">Apply filters</button></div></form>`;
 filterDialog.querySelector('#closeFilters').onclick=closeFilters;
 const form=filterDialog.querySelector('#filterForm');
 filterDialog.querySelector('#clearFilters').onclick=()=>{for(const key of ['q','section','category','audience'])form.elements[key].value=''};
 form.onsubmit=e=>{e.preventDefault();const data=Object.fromEntries(new FormData(form));applyFilters(data)};
 filterDialog.showModal();
}
function applyFilters(data){
 const patch={q:String(data.q||'').trim(),section:sections[data.section]?data.section:null,category:data.category||null,audience:data.audience==='all'?null:data.audience||null,filters:null,entry:null,page:null};
 const previous=view()==='calendar'?(history.state?.noticeScroll||0):0;
 pendingFilters={patch,previous};filterDialog.close();if(history.state?.noticeFilter){history.back();return}commitFilters();
}
function commitFilters(){const {patch,previous}=pendingFilters;pendingFilters=null;history.replaceState({...history.state,noticeFilter:false,noticeScroll:previous,noticeLimit:NOTICE_SEARCH_PAGE_SIZE,noticeDayLimit:NOTICE_SEARCH_PAGE_SIZE},'',href(patch));render();requestAnimationFrame(()=>window.scrollTo(0,previous))}
function handlePopState(){
 if(pendingFilters){commitFilters();return}
 const previous=new URL(renderedURL),current=new URL(location.href);
 if(previous.searchParams.get('view')==='day'&&!previous.searchParams.get('entry')&&current.searchParams.get('view')==='calendar'){
  for(const key of ['locality','all','section','sources','category','audience','q','month','day']){const value=previous.searchParams.get(key);if(value)current.searchParams.set(key,value);else current.searchParams.delete(key)}history.replaceState(history.state,'',current);
 }
 if(dialog.open)dialog.close();render();restorePosition();
}
function badge(item){if(item.kind==='info')return `<span class="notice-emoji" aria-hidden="true">${esc(eventSymbol(item))}</span><span>Info</span>`;
 const d=new Date(item.end_date+'T12:00:00Z');return `<span class="date-weekday">${d.toLocaleDateString('en-GB',{weekday:'short',timeZone:'UTC'}).toUpperCase()}</span><strong>${d.getUTCDate()}</strong><span>${d.toLocaleDateString('en-GB',{month:'short',timeZone:'UTC'}).toUpperCase()}</span>`;}
function card(item,search=false){
 const id=String(lookup.size);lookup.set(id,item);
 return `<article class="notice notice-with-symbol"><button type="button" class="notice-symbol" data-open="${id}" aria-label="Read ${esc(item.title)}"><span aria-hidden="true">${esc(eventSymbol(item))}</span></button><div class="notice-copy"><button class="notice-open" data-open="${id}"><span class="notice-title">${highlightNotice(item.title,search?params().get('q')||'':'')}</span><span class="notice-description">${highlightNotice(item.description,search?params().get('q')||'':'')}</span></button>${noticeLink(item)}</div>${item.kind==='event'?`<a class="notice-date-add" href="${esc(calendarURL(item,item.locality||locality))}" target="_blank" rel="noopener" aria-label="${esc(longDate(item.end_date))}. Add ${esc(item.title)} to Google Calendar" title="Add to Google Calendar"><span class="date-chip">${badge(item)}</span><span class="date-add-action">${icon('calendar')}<span>Add</span></span></a>`:'<span class="notice-info-tag">Info</span>'}</article>`;
}
function showDetails(item){dialog.innerHTML=`<div class="notice-modal-heading"><span class="pill">${esc(eventSymbol(item))} ${item.kind==='event'?esc(longDate(item.end_date)):'Information'}</span><button type="button" class="notice-circle-close" id="closeNotice" aria-label="Close notice" title="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div><h2>${esc(item.title)}</h2><p class="hint">${esc(item.locality||locality)} · ${esc(sections[item.section||section()]?.name||'Community')}</p>${noticeTags(item)}<p class="modal-text">${esc(item.description)}</p>${noticeLink(item)}<div class="toolbar">${item.kind==='event'?`<a class="primary" href="${esc(calendarURL(item,item.locality||locality))}" target="_blank" rel="noopener">${icon('calendar')} Add to Google Calendar</a>`:''}</div>`;dialog.querySelector('#closeNotice').onclick=closeEntry;dialog.showModal();}
function calendarHTML(items,requestedMonth=currentMonth()){
 const limits=calendarBounds(today()),month=requestedMonth,day=params().get('day'),byDate=calendarDays(items),all=searchOptions().allLocalities,monthName=new Date(month+'-01T12:00:00Z').toLocaleDateString('en-GB',{month:'long',year:'numeric',timeZone:'UTC'});
 return `<div class="events-calendar steady-calendar" data-calendar data-month="${month}"><div class="steady-month-nav"><button type="button" class="month-arrow" data-month-step="-1" aria-label="Previous month">‹</button><label class="month-picker"><span>${esc(monthName)}</span><input type="month" id="eventMonth" min="${limits.min}" max="${limits.max}" value="${month}" aria-label="Calendar month"></label><button type="button" class="month-arrow" data-month-step="1" aria-label="Next month">›</button></div><div class="event-weekdays" aria-hidden="true">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>`<span>${d}</span>`).join('')}</div><div class="calendar-grid-window"><div class="event-month-grid" data-month-surface>${calendarMonthCells(month).map(date=>{
 if(!date)return '<div class="empty-day" aria-hidden="true"></div>';const entries=byDate.get(date)||[],count=entries.length;
 return `<button type="button" class="event-day calendar-day ${date===today()?'is-today':''} ${date===day?'is-selected':''}" data-day="${date}" aria-pressed="${date===day}" aria-label="${esc(longDate(date))}: ${count} ${count===1?'notice':'notices'}"><span class="day-number">${Number(date.slice(-2))}</span>${count?`<span class="calendar-count"><strong>${count}</strong><span>${count===1?'notice':'notices'}</span></span>${!all?`<span class="calendar-day-symbols" aria-hidden="true">${entries.slice(0,2).map(i=>esc(eventSymbol(i))).join('')}</span>`:''}`:''}</button>`;
 }).join('')}</div></div><p class="calendar-footnote" role="status">${[...byDate.keys()].some(d=>d.startsWith(month))?'Tap a date to see its notices.':'No matching dated notices this month.'}</p></div>`;
}
function dayListHTML(items){
 const day=params().get('day')||'',valid=/^\d{4}-\d{2}-\d{2}$/.test(day)&&!Number.isNaN(Date.parse(day)),selected=valid?(calendarDays(items).get(day)||[]):[],identity=JSON.stringify([searchIdentity,section(),day]);
 if(identity!==dayIdentity){dayIdentity=identity;dayLimit=history.state?.noticeDayLimit||NOTICE_SEARCH_PAGE_SIZE}
 return `<div class="day-events" tabindex="-1"><div class="day-results-heading"><h2>${valid?esc(longDate(day)):'Choose a date'}</h2><button type="button" class="day-circle-close" id="backCalendar" aria-label="Close day and return to calendar" title="Return to calendar">×</button></div>${groupResults(selected.slice(0,dayLimit))}${!selected.length?'<p class="empty">No matching dated notices on this day.</p>':''}${selected.length>dayLimit?'<button type="button" class="secondary" id="moreDayResults">Show more</button>':''}</div>`;
}
function renderBoards(){
 const p=params(),kind=section(),options=searchOptions(),mode=view(),identity=JSON.stringify([options,selectedSections()]);
 if(identity!==searchIdentity){searchIdentity=identity;searchLimit=history.state?.noticeLimit||NOTICE_SEARCH_PAGE_SIZE}
 const allGroups=filterNoticeBoards(pages,options,today()).filter(g=>selectedSections().includes(g.section)),container=root.querySelector('#sections');if(!container)return;
 lookup=new Map();container.replaceChildren();
 if(mode==='calendar'||mode==='day'){
  const panel=document.createElement('section');panel.className=mode==='calendar'?'section combined detail-list calendar-panel':'day-list-panel';
  panel.innerHTML=mode==='calendar'?calendarHTML(allGroups.flatMap(g=>g.items)):dayListHTML(allGroups.flatMap(g=>g.items));container.append(panel);
 }else{
  const result=pageNoticeResults(allGroups,searchLimit,options.allLocalities);
  const normalOverview=selectedSections().length===3&&!kind&&!options.allLocalities&&!options.q&&!options.category&&!options.audience;
  const displayGroups=normalOverview?allGroups.map(g=>result.groups.find(r=>r.section===g.section)||{section:g.section,items:[],empty:g.items.length===0}).filter(g=>g.items.length||g.empty):result.groups;
  const grouped=document.createElement('div');grouped.className='grouped-notices';grouped.innerHTML=groupResults(displayGroups.flatMap(g=>g.items));container.append(grouped);
  for(const group of displayGroups.filter(g=>g.empty)){const panel=document.createElement('section');panel.className='section '+group.section+' empty-board-banner';panel.innerHTML=`<span class="empty-board-icon">${icon(sections[group.section].icon)}</span><span>No ${esc(sections[group.section].name)} Notices found for ${esc(locality)}.</span>`;container.append(panel)}
  if(!result.total&&!normalOverview){const empty=document.createElement('p');empty.className='empty';empty.textContent=loaded?'No matching notices.':'Loading notices…';container.append(empty)}
  if(result.shown<result.total){const paging=document.createElement('div');paging.className='notice-search-paging';paging.innerHTML=`${result.shown<result.total?'<button type="button" class="secondary" id="moreNoticeResults">Show more</button>':''}`;container.append(paging);paging.querySelector('#moreNoticeResults')?.addEventListener('click',()=>{searchLimit+=NOTICE_SEARCH_PAGE_SIZE;renderBoards();root.querySelector('#moreNoticeResults')?.focus({preventScroll:true})})}
 }
 root.querySelectorAll('[data-route]').forEach(a=>a.onclick=e=>{e.preventDefault();const u=new URL(a.href);navigate({section:u.searchParams.get('section'),view:u.searchParams.get('view'),entry:null,page:null});});
 root.querySelectorAll('[data-open]').forEach(b=>b.onclick=e=>{if(e.detail&&(blocked()||performance.now()<suppressUntil))return;openEntry(lookup.get(b.dataset.open))});
 root.querySelectorAll('[data-day]').forEach(b=>b.onclick=e=>{if(e.detail&&(blocked()||performance.now()<suppressUntil))return;history.replaceState(history.state,'',href({day:b.dataset.day}));navigate({view:'day',day:b.dataset.day,month:currentMonth(),entry:null,page:null},{day:true});});
 root.querySelectorAll('[data-month-step]').forEach(b=>b.onclick=()=>changeMonth(Number(b.dataset.monthStep)));
 root.querySelector('#eventMonth')?.addEventListener('change',e=>{if(/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value))selectCalendarMonth(e.target.value)});
 root.querySelector('#backCalendar')?.addEventListener('click',returnToCalendar);
 root.querySelector('#moreDayResults')?.addEventListener('click',()=>{dayLimit+=NOTICE_SEARCH_PAGE_SIZE;renderBoards();root.querySelector('#moreDayResults')?.focus({preventScroll:true})});
}
function render(){
 clearTimeout(searchTimer);searchTimer=null;const feedScroll=root.querySelector('#sections')?.scrollTop||0;
 const p=params();renderEpoch++;renderedURL=location.href;renderedDate=today();locality=p.get('locality')||locality;
 const names=localityNames(window.WASTE_DATA?.localities||[],pages,locality);locality=names.find(n=>localityKey(n)===localityKey(locality))||locality;syncNoticeboardSponsors(locality);
 const heading=document.querySelector('#noticeboardTitle');if(heading)heading.textContent='Community notices';document.body.dataset.noticeView=view();
 root.innerHTML=`${compactToolbar(names)}${error?`<p class="status error" role="alert">${esc(error)} <button id="retry" class="secondary">Try again</button></p>`:''}<div id="sections"></div>`;
 renderBoards();if(p.get('entry')||history.state?.noticeEntry)root.querySelector('#sections').scrollTop=feedScroll;
 root.querySelector('#locality').onchange=e=>navigate({locality:e.target.value||locality,all:e.target.value?null:'1',entry:null,page:null});
 root.querySelector('#localityScope').onchange=e=>navigate({all:e.target.checked?'1':null,locality,entry:null,page:null});
 const applyInline=patch=>navigate({...patch,entry:null,page:null},{replace:view()==='day'});
 root.querySelector('#noticeSearch').onsubmit=e=>{e.preventDefault();updateTextSearch(e.target.elements.q.value)};
 root.querySelector('#noticeQuery').addEventListener('input',e=>queueTextSearch(e.target.value,e.isComposing));
 root.querySelector('#noticeQuery').addEventListener('compositionend',e=>queueTextSearch(e.target.value));
 root.querySelector('#noticeHelp').onclick=openNoticeHelp;
 root.querySelector('#noticeCategory').onchange=e=>applyInline({category:e.target.value});
 root.querySelector('#noticeAudience').onchange=e=>applyInline({audience:e.target.value});
 root.querySelectorAll('[data-source]').forEach(c=>c.onchange=()=>applyInline({section:null,sources:[...root.querySelectorAll('[data-source]')].filter(x=>x.checked).map(x=>x.dataset.source).join(',')||'none'}));
 root.querySelector('#toolbarCalendar')?.addEventListener('click',returnToCalendar);
 root.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{if(b.dataset.view==='calendar'&&view()==='day'){returnToCalendar();return}if(b.dataset.view===view())return;navigate({view:b.dataset.view,entry:null,page:null})});
 root.querySelector('#retry')?.addEventListener('click',load);
 if(p.get('help')==='1'){renderNoticeHelp()}else if(p.get('filters')==='1'){if(!filterDialog.open)renderFilterPanel()}else if(filterDialog.open)filterDialog.close();
 const entry=p.get('entry');if(entry){const page=pages.find(r=>p.get('page')?r.page_id===p.get('page'):r.section===section()&&localityKey(r.locality_name)===localityKey(locality)),item=visibleItems(page?.csv,today()).find(i=>i.entry_id===entry);if(item){if(dialog.open)dialog.close();showDetails({...item,locality:page.locality_name,section:page.section,page_id:page.page_id})}else if(loaded){if(dialog.open)dialog.close();const el=document.createElement('p');el.className='status';el.textContent='This notice has expired or is no longer published.';root.prepend(el)}}else if(dialog.open)dialog.close();
}
async function selectCalendarMonth(target){
 if(view()!=='calendar'||monthBusy||filterDialog.open||blocked())return;
 const before=currentMonth(),direction=target<before?-1:1,{min,max}=calendarBounds(today()),surface=root.querySelector('[data-month-surface]'),reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
 if(target===before)return;monthBusy=true;const epoch=renderEpoch;
 try{
  if(target<min||target>max){const note=root.querySelector('.calendar-footnote');if(note)note.textContent=target<min?'The current month is the earliest available.':'You can browse up to six months ahead.';await animateCalendarGrid(surface,direction,'bounce',reduced);return}
  const preview=document.createElement('div'),options=searchOptions();
  preview.innerHTML=calendarHTML(filterNoticeBoards(pages,options,today()).filter(g=>selectedSections().includes(g.section)).flatMap(g=>g.items),target);
  const incoming=preview.querySelector('[data-month-surface]');
  await slideCalendarPages(surface,incoming,direction,reduced);
  if(blocked()||filterDialog.open||view()!=='calendar'||epoch!==renderEpoch)return;
  navigate({month:target},{replace:true,scroll:false});
 }finally{monthBusy=false}
}
function changeMonth(delta){return selectCalendarMonth(moveMonth(currentMonth(),delta))}
filterDialog.addEventListener('cancel',e=>{e.preventDefault();if(params().get('help')==='1')closeNoticeHelp();else closeFilters()});
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

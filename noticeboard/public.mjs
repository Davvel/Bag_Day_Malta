import {animateCalendarGrid,slideCalendarPages,pageTurnTransform,settleCalendarDrag} from './calendar-motion.mjs?v=1.1.125';
import {calendarDays,calendarMonthCells,calendarBounds,boundedCalendarMonth,calendarSectors,cappedNoticeCount} from './calendar-model.mjs?v=1.1.125';
import {loadOptions,optionSelect,noticeTags,optionsWarning} from './options.mjs?v=1.1.125';
import {noticeLink} from './links.mjs?v=1.1.125';
import {syncNoticeboardSponsors} from './sponsors.mjs?v=1.1.125';
import {localityNames,localityKey} from './routes.mjs?v=1.1.125';
import {sections,esc,icon,today,visibleItems,calendarURL,readPublishedCSV} from './shared.mjs?v=1.1.125';
import {eventSymbol,longDate,filterNoticeBoards,highlightNotice,pageNoticeResults,NOTICE_SEARCH_PAGE_SIZE,moveMonth,noticeboardTab} from './discovery.mjs?v=1.1.125';
const root=document.querySelector('#root'),dialog=document.querySelector('#noticeDialog');
let pages=[],loaded=false,error='',filterWarning='',generation=0,renderedDate='',lookup=new Map(),swipe=null,suppressUntil=0,searchLimit=NOTICE_SEARCH_PAGE_SIZE,dayLimit=NOTICE_SEARCH_PAGE_SIZE,searchIdentity='',dayIdentity='',renderedURL=location.href,monthBusy=false,renderEpoch=0,searchTimer=null;
const params=()=>new URLSearchParams(location.search);
const savedLocality=()=>{try{return localStorage.getItem('bag-day-locality-v1')}catch{return null}};
const homeLocality=savedLocality()||'Żejtun';
let locality=params().get('locality')||homeLocality;
// New visits and reloads return to the saved Home locality. In-document Back
// and browser history restoration retain the current browsing context.
const restoringVisit=performance.getEntriesByType?.('navigation')?.[0]?.type==='back_forward'&&history.state?.noticeboard;
if(!restoringVisit){const u=new URL(location.href);u.searchParams.set('locality',homeLocality);u.searchParams.delete('all');history.replaceState(history.state,'',u);locality=homeLocality;}

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
const sourceOrder=['council','church','police'];
let activeTab='council';
const retainedTab=()=>null;
function compactToolbar(names){const mode=view(),o=searchOptions();return `<div class="notice-controls"><div class="notice-half-row search-view-row"><form id="noticeSearch" class="inline-search" role="search"><input id="noticeQuery" type="search" name="q" aria-label="Search notices" placeholder="Search notices…" autocomplete="off" value="${esc(o.q)}"><button aria-label="Search notices" type="submit">${icon('search')}</button></form></div><div class="notice-half-row locality-controls"><label class="compact-locality"><select id="locality" aria-label="Noticeboard locality"><option value="" ${o.allLocalities?'selected':''}>All localities</option>${names.map(n=>`<option value="${esc(n)}" ${!o.allLocalities&&n===locality?'selected':''}>${esc(n)}</option>`).join('')}</select></label><label class="locality-scope"><span>All localities</span><span class="locality-toggle"><input id="localityScope" type="checkbox" role="switch" aria-label="Show all localities" ${o.allLocalities?'checked':''}><span aria-hidden="true"></span></span></label></div><div class="notice-half-row category-audience-row"><select id="noticeCategory" aria-label="Category">${optionSelect('categories',o.category,true)}</select><select id="noticeAudience" aria-label="Audience">${optionSelect('audiences',o.audience,true)}</select></div></div>`}
function viewTitleBar(){const calendar=view()!=='list';return `<header class="notice-view-titlebar"><h2>${icon(calendar?'calendar':'list')}<span>${calendar?'Calendar View':'List View'}</span></h2><button type="button" class="view-mode-button" data-view="${calendar?'list':'calendar'}" aria-label="Switch to ${calendar?'list':'calendar'} view">${icon(calendar?'list':'calendar')}<span>${calendar?'List View':'Calendar View'}</span></button></header>`}
function sourcePanel(){const combined=view()!=='list';return `<div class="source-panel section ${combined?'combined-calendar':'council'}" id="sourcePanel">${viewTitleBar()}${combined?'':`<div class="source-tabs" role="tablist" aria-label="Noticeboard source">${sourceOrder.map(k=>`<button type="button" role="tab" class="source-tab ${k}" id="source-${k}" data-source-tab="${k}" aria-selected="false" aria-controls="sections">${icon(sections[k].icon)}<span class="source-label">${esc(sections[k].name)}</span><span class="source-count" id="count-${k}" aria-hidden="true">0</span></button>`).join('')}</div>`}<div id="sections" role="${combined?'region':'tabpanel'}" ${combined?'aria-label="Combined community notices"':'aria-labelledby="source-council"'}></div></div>`}
function chooseSource(groups,mode=view(),month=currentMonth(),requested=params().get('tab')){return noticeboardTab(groups.flatMap(g=>g.items),{view:mode,month,day:params().get('day')||'',requested})}
function showAllNotices(){clearTimeout(searchTimer);searchTimer=null;navigate({locality:savedLocality()||homeLocality,all:null,view:view()==='day'?'calendar':view(),q:null,category:null,audience:null,section:null,sources:null,tab:retainedTab(),help:null,filters:null,entry:null,page:null},{replace:view()==='day'})}
function updateTextSearch(value){
 const q=value.trim();clearTimeout(searchTimer);searchTimer=null;
 history.replaceState({...history.state,noticeLimit:NOTICE_SEARCH_PAGE_SIZE,noticeDayLimit:NOTICE_SEARCH_PAGE_SIZE},'',href({q:q||null,tab:retainedTab(),section:null,sources:null,entry:null,page:null}));
 renderedURL=location.href;renderEpoch++;searchLimit=dayLimit=NOTICE_SEARCH_PAGE_SIZE;renderBoards();root.querySelector('#sections')?.scrollTo?.(0,0);
}
function queueTextSearch(value,composing=false){clearTimeout(searchTimer);searchTimer=null;if(composing)return;const q=value.trim();if(!q){updateTextSearch('');return}if([...q].length>2)searchTimer=setTimeout(()=>updateTextSearch(value),300);else if(params().get('q'))updateTextSearch('')}
function groupResults(items){
 const groups=new Map();
 for(const item of items){const key=item.section+'|'+item.locality;if(!groups.has(key))groups.set(key,{section:item.section,locality:item.locality,items:[]});groups.get(key).items.push(item)}
 const order=view()==='day'?sourceOrder:['police','church','council'];
 return [...groups.values()].sort((a,b)=>order.indexOf(a.section)-order.indexOf(b.section)||a.locality.localeCompare(b.locality,'en')).map(g=>`<section class="section ${g.section} result-group">${view()==='day'?`<h3 class="day-source-heading">${icon(sections[g.section].icon)} ${esc(sections[g.section].name)}</h3>`:''}<div class="result-locality">${esc(g.locality||locality)}</div><div class="notice-list">${g.items.map(i=>card(i,true)).join('')}</div></section>`).join('');
}
function handlePopState(){
 const previous=new URL(renderedURL),current=new URL(location.href);
 if(previous.searchParams.get('view')==='day'&&!previous.searchParams.get('entry')&&current.searchParams.get('view')==='calendar'){
  for(const key of ['locality','all','section','sources','tab','category','audience','q','month','day']){const value=previous.searchParams.get(key);if(value)current.searchParams.set(key,value);else current.searchParams.delete(key)}history.replaceState(history.state,'',current);
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
 const limits=calendarBounds(today()),month=requestedMonth,day=params().get('day'),byDate=calendarDays(items),monthCount=[...byDate].filter(([date])=>date.startsWith(month)).reduce((sum,[,rows])=>sum+rows.length,0),monthName=new Date(month+'-01T12:00:00Z').toLocaleDateString('en-GB',{month:'long',year:'numeric',timeZone:'UTC'});
 return `<div class="events-calendar steady-calendar" data-calendar data-month="${month}"><div class="steady-month-nav"><button type="button" class="month-arrow" data-month-step="-1" aria-label="Previous month">‹</button><label class="month-picker"><span>${esc(monthName)}</span><input type="month" id="eventMonth" min="${limits.min}" max="${limits.max}" value="${month}" aria-label="Calendar month"></label><button type="button" class="month-arrow" data-month-step="1" aria-label="Next month">›</button></div><div class="calendar-sector-legend" aria-label="Stripe order: Local Council, Church, Police">${sourceOrder.map(k=>`<span class="sector-${k}"><i aria-hidden="true"></i>${k==='council'?'Council':esc(sections[k].name)}</span>`).join('')}</div><div class="event-weekdays" aria-hidden="true">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>`<span>${d}</span>`).join('')}</div><div class="calendar-grid-window"><div class="event-month-grid" data-month-surface>${calendarMonthCells(month).map(date=>{
 if(!date)return '<div class="empty-day" aria-hidden="true"></div>';const entries=byDate.get(date)||[],count=entries.length,sectors=calendarSectors(entries);
 return `<button type="button" class="event-day calendar-day ${date===today()?'is-today':''} ${date===day?'is-selected':''}" data-day="${date}" aria-pressed="${date===day}" aria-label="${esc(longDate(date))}: ${count} ${count===1?'notice':'notices'}. ${sectors.map(s=>sections[s.section].name+' '+s.count).join(', ')}"><span class="day-number">${Number(date.slice(-2))}</span><span class="calendar-sector-stripes" aria-hidden="true">${sectors.map(s=>`<span class="calendar-sector sector-${s.section} ${s.count?'has-notices':''}">${s.count?`<span class="sector-notice-icon">${esc(eventSymbol(s.first))}</span><strong>${cappedNoticeCount(s.count)}</strong>`:''}</span>`).join('')}</span></button>`;
 }).join('')}</div></div><p class="calendar-footnote" role="status">${[...byDate.keys()].some(d=>d.startsWith(month))?'Tap a date to see its notices.':'No matching dated notices this month.'}</p></div>`;
}
function dayListHTML(items){
 const day=params().get('day')||'',valid=/^\d{4}-\d{2}-\d{2}$/.test(day)&&!Number.isNaN(Date.parse(day)),selected=valid?(calendarDays(items).get(day)||[]):[],identity=JSON.stringify([searchIdentity,day]);
 if(identity!==dayIdentity){dayIdentity=identity;dayLimit=history.state?.noticeDayLimit||NOTICE_SEARCH_PAGE_SIZE}
 return `<div class="day-events" tabindex="-1"><div class="day-results-heading"><h2 id="dayDialogTitle">${valid?esc(longDate(day)):'Choose a date'}</h2><button type="button" class="day-circle-close" id="backCalendar" aria-label="Close day and return to calendar" title="Return to calendar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div><div class="day-modal-content">${groupResults(selected.slice(0,dayLimit))}${!selected.length?'<p class="empty">No matching dated notices on this day.</p>':''}${selected.length>dayLimit?'<button type="button" class="secondary" id="moreDayResults">Show more</button>':''}</div>`;
}
function renderBoards(){
 root.querySelector('#dayDialog')?.remove();
 clearDrag();
 const p=params(),options=searchOptions(),mode=view(),groups=filterNoticeBoards(pages,options,today());activeTab=chooseSource(groups);
 const combined=mode!=='list',identity=JSON.stringify([options,combined?'combined':activeTab]);
 root.querySelector('#sourcePanel').className='source-panel section '+(combined?'combined-calendar':activeTab);if(!combined)root.querySelector('#sections').setAttribute('aria-labelledby','source-'+activeTab);
 root.querySelectorAll('[data-source-tab]').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.sourceTab===activeTab));b.setAttribute('tabindex',b.dataset.sourceTab===activeTab?'0':'-1');const key=b.dataset.sourceTab,items=groups.filter(g=>g.section===key).flatMap(g=>g.items),count=mode==='list'?items.length:items.filter(i=>i.kind==='event'&&i.end_date.startsWith(currentMonth())).length;const badge=root.querySelector('#count-'+key);if(badge){badge.textContent=cappedNoticeCount(count);badge.className='source-count'+(count?' has-notices':'');}b.setAttribute('aria-label',sections[key].name+': '+count+' matching notices'+(mode==='list'?'':' in '+currentMonth()))});
 if(identity!==searchIdentity){searchIdentity=identity;searchLimit=history.state?.noticeLimit||NOTICE_SEARCH_PAGE_SIZE}
 const allGroups=combined?groups:groups.filter(g=>g.section===activeTab),container=root.querySelector('#sections');if(!container)return;
 lookup=new Map();container.replaceChildren();
 if(mode==='calendar'||mode==='day'){
  const panel=document.createElement('section');panel.className='section detail-list calendar-panel';
  panel.innerHTML=calendarHTML(allGroups.flatMap(g=>g.items));container.append(panel);
  if(mode==='day'){
   const dayDialog=document.createElement('dialog');dayDialog.id='dayDialog';dayDialog.className='calendar-day-modal day-list-panel';dayDialog.setAttribute('aria-labelledby','dayDialogTitle');dayDialog.setAttribute('aria-modal','true');
   dayDialog.innerHTML=dayListHTML(allGroups.flatMap(g=>g.items));root.append(dayDialog);
   dayDialog.addEventListener('cancel',e=>{e.preventDefault();returnToCalendar()});dayDialog.showModal();
  }
 }else{
  const result=pageNoticeResults(allGroups,searchLimit,options.allLocalities);
  const grouped=document.createElement('div');grouped.className='grouped-notices';grouped.innerHTML=groupResults(result.groups.flatMap(g=>g.items));container.append(grouped);
  if(!result.total){const empty=document.createElement('p');empty.className='empty';empty.textContent=loaded?'No '+sections[activeTab].name+' notices found'+(options.allLocalities?' in all localities.':' for '+locality+'.'):'Loading notices…';container.append(empty)}
  if(result.shown<result.total){const paging=document.createElement('div');paging.className='notice-search-paging';paging.innerHTML=`${result.shown<result.total?'<button type="button" class="secondary" id="moreNoticeResults">Show more</button>':''}`;container.append(paging);paging.querySelector('#moreNoticeResults')?.addEventListener('click',()=>{searchLimit+=NOTICE_SEARCH_PAGE_SIZE;renderBoards();root.querySelector('#moreNoticeResults')?.focus({preventScroll:true})})}
 }
 root.querySelectorAll('[data-route]').forEach(a=>a.onclick=e=>{e.preventDefault();const u=new URL(a.href);navigate({section:u.searchParams.get('section'),view:u.searchParams.get('view'),entry:null,page:null});});
 root.querySelectorAll('[data-open]').forEach(b=>b.onclick=e=>{if(e.detail&&(blocked()||performance.now()<suppressUntil))return;openEntry(lookup.get(b.dataset.open))});
 root.querySelectorAll('[data-day]').forEach(b=>b.onclick=e=>{if(e.detail&&(blocked()||performance.now()<suppressUntil))return;history.replaceState(history.state,'',href({day:b.dataset.day}));navigate({view:'day',tab:null,day:b.dataset.day,month:currentMonth(),entry:null,page:null},{day:true});});
 root.querySelectorAll('[data-month-step]').forEach(b=>b.onclick=()=>changeMonth(Number(b.dataset.monthStep)));
 root.querySelector('#eventMonth')?.addEventListener('change',e=>{if(/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value))selectCalendarMonth(e.target.value)});
 root.querySelector('#backCalendar')?.addEventListener('click',returnToCalendar);
 root.querySelector('#moreDayResults')?.addEventListener('click',()=>{dayLimit+=NOTICE_SEARCH_PAGE_SIZE;renderBoards();root.querySelector('#moreDayResults')?.focus({preventScroll:true})});
}
function render(){
 const oldQuery=root.querySelector('#noticeQuery'),editing=oldQuery&&document.activeElement===oldQuery,draft=oldQuery?.value,caret=oldQuery?.selectionStart;
 clearTimeout(searchTimer);searchTimer=null;const feedScroll=root.querySelector('#sections')?.scrollTop||0;
 const p=params();renderEpoch++;renderedURL=location.href;renderedDate=today();locality=p.get('locality')||locality;
 const names=localityNames(window.WASTE_DATA?.localities||[],pages,locality);locality=names.find(n=>localityKey(n)===localityKey(locality))||locality;syncNoticeboardSponsors(locality);
 const heading=document.querySelector('#noticeboardTitle');if(heading)heading.textContent='Community notices';document.body.dataset.noticeView=view();
 root.innerHTML=`${compactToolbar(names)}${error?`<p class="status error" role="alert">${esc(error)} <button id="retry" class="secondary">Try again</button></p>`:''}${sourcePanel()}`;
 renderBoards();if(p.get('entry')||history.state?.noticeEntry)root.querySelector('#sections').scrollTop=feedScroll;
 root.querySelector('#locality').onchange=e=>navigate({tab:retainedTab(),locality:e.target.value||locality,all:e.target.value?null:'1',entry:null,page:null});
 root.querySelector('#localityScope').onchange=e=>navigate({tab:retainedTab(),all:e.target.checked?'1':null,locality,entry:null,page:null});
 const applyInline=patch=>navigate({...patch,tab:retainedTab(),section:null,sources:null,entry:null,page:null},{replace:view()==='day'});
 root.querySelector('#noticeSearch').onsubmit=e=>{e.preventDefault();updateTextSearch(e.target.elements.q.value)};
 root.querySelector('#noticeQuery').addEventListener('input',e=>queueTextSearch(e.target.value,e.isComposing));
 root.querySelector('#noticeQuery').addEventListener('compositionend',e=>queueTextSearch(e.target.value));
 document.querySelector('#noticeShowAll').onclick=showAllNotices;
 root.querySelectorAll('[data-source-tab]').forEach(b=>{b.onclick=()=>{navigate({tab:b.dataset.sourceTab,section:null,sources:null,entry:null,page:null},{replace:view()==='day'});root.querySelector('#source-'+b.dataset.sourceTab)?.focus({preventScroll:true})};b.addEventListener('keydown',e=>{const index=sourceOrder.indexOf(b.dataset.sourceTab);let next;if(e.key==='ArrowRight')next=(index+1)%3;else if(e.key==='ArrowLeft')next=(index+2)%3;else if(e.key==='Home')next=0;else if(e.key==='End')next=2;else return;e.preventDefault();root.querySelector('#source-'+sourceOrder[next]).onclick()})});
 root.querySelector('#noticeCategory').onchange=e=>applyInline({category:e.target.value});
 root.querySelector('#noticeAudience').onchange=e=>applyInline({audience:e.target.value});
 root.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{if(b.dataset.view==='calendar'){navigate({view:'calendar',month:today().slice(0,7),day:null,tab:null,entry:null,page:null});return}if(b.dataset.view===view())return;navigate({view:b.dataset.view,tab:null,entry:null,page:null})});
 if(editing){const field=root.querySelector('#noticeQuery');field.value=draft;field.focus({preventScroll:true});try{field.setSelectionRange(caret,caret)}catch{}queueTextSearch(draft)}
 root.querySelector('#retry')?.addEventListener('click',load);root.querySelector('#retryFilters')?.addEventListener('click',load);
 const entry=p.get('entry');if(entry){const page=pages.find(r=>p.get('page')?r.page_id===p.get('page'):r.section===section()&&localityKey(r.locality_name)===localityKey(locality)),item=visibleItems(page?.csv,today()).find(i=>i.entry_id===entry);if(item){if(dialog.open)dialog.close();showDetails({...item,locality:page.locality_name,section:page.section,page_id:page.page_id})}else if(loaded){if(dialog.open)dialog.close();const el=document.createElement('p');el.className='status';el.textContent='This notice has expired or is no longer published.';root.prepend(el)}}else if(dialog.open)dialog.close();
}
async function selectCalendarMonth(target){
 if(view()!=='calendar'||monthBusy||blocked())return;
 const before=currentMonth(),direction=target<before?-1:1,{min,max}=calendarBounds(today()),surface=root.querySelector('[data-month-surface]'),reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
 if(target===before){await settleCalendarDrag(surface);return;}monthBusy=true;const epoch=renderEpoch;
 try{
  if(target<min||target>max){const note=root.querySelector('.calendar-footnote');if(note)note.textContent=target<min?'The current month is the earliest available.':'You can browse up to six months ahead.';await settleCalendarDrag(surface,reduced);await animateCalendarGrid(surface,direction,'bounce',reduced);return}
  const preview=document.createElement('div'),options=searchOptions();
  const nextGroups=filterNoticeBoards(pages,options,today());preview.innerHTML=calendarHTML(nextGroups.flatMap(g=>g.items),target);
  const incoming=preview.querySelector('[data-month-surface]');
  await slideCalendarPages(surface,incoming,direction,reduced);
  if(blocked()||view()!=='calendar'||epoch!==renderEpoch)return;
  navigate({month:target,tab:null},{replace:true,scroll:false});
 }finally{clearDrag();monthBusy=false}
}
function changeMonth(delta){return selectCalendarMonth(moveMonth(currentMonth(),delta))}
const blocked=()=>window.BAG_DAY_VIEWPORT?.gesturesBlocked()||Number(window.visualViewport?.scale||1)>1.01;
function clearDrag(){const surface=root.querySelector?.('[data-month-surface]');if(surface){surface.style.transform='';surface.style.filter='';delete surface.dataset.dragX}swipe=null}
root.addEventListener('touchstart',e=>{clearDrag();if(blocked()||monthBusy||e.touches.length!==1||!e.target.closest('[data-calendar]')||e.target.closest('input,select'))return;const t=e.touches[0];swipe={x:t.clientX,y:t.clientY,dx:0,dy:0,axis:null};},{passive:true});
root.addEventListener('touchmove',e=>{
 if(blocked()||e.touches.length!==1){clearDrag();return}if(!swipe)return;
 const t=e.touches[0];swipe.dx=t.clientX-swipe.x;swipe.dy=t.clientY-swipe.y;
 if(!swipe.axis&&Math.max(Math.abs(swipe.dx),Math.abs(swipe.dy))>6)swipe.axis=Math.abs(swipe.dx)>Math.abs(swipe.dy)*1.5?'x':'y';
 if(swipe.axis!=='x')return;if(e.cancelable)e.preventDefault();
 const surface=root.querySelector?.('[data-month-surface]');if(!surface)return;
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;if(reduced)return;
 const width=surface.getBoundingClientRect().width||300,dx=Math.max(-width*.65,Math.min(width*.65,swipe.dx));
 surface.dataset.dragX=String(dx);surface.style.transform=pageTurnTransform(dx,width);surface.style.filter=`brightness(${1-Math.abs(dx)/width*.16})`;
},{passive:false});
root.addEventListener('touchend',e=>{
 const g=swipe;swipe=null;if(!g||e.touches.length||blocked()){clearDrag();return}
 if(g.axis==='x'){suppressUntil=performance.now()+500;if(Math.abs(g.dx)>55){changeMonth(g.dx<0?1:-1);return}}
 settleCalendarDrag(root.querySelector?.('[data-month-surface]'));
},{passive:true});
for(const name of ['touchcancel','bag-day-gesture-cancel','blur','pagehide','pageshow'])window.addEventListener(name,clearDrag);
dialog.addEventListener('cancel',e=>{e.preventDefault();closeEntry()});
// List gestures preserve vertical scrolling and leave magnified panning to the browser.
let listSwipe=null,listSettling=false;
const listSurface=()=>root.querySelector('#sections');
const reducedMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function clearListDrag(){listSwipe=null;const el=listSurface();if(el){el.style.transform='';el.style.transition='';el.style.opacity=''}}
function settleList(){const el=listSurface();if(el){el.style.transition=reducedMotion()?'':'transform 180ms ease-out';el.style.transform=''}listSwipe=null}
root.addEventListener('touchstart',e=>{if(listSettling)return;clearListDrag();if(view()!=='list'||blocked()||e.touches.length!==1||!e.target.closest('#sourcePanel')||e.target.closest('input,select,textarea,summary'))return;const t=e.touches[0];listSwipe={x:t.clientX,y:t.clientY,dx:0,dy:0,axis:null}},{passive:true});
root.addEventListener('touchmove',e=>{if(blocked()||e.touches.length!==1){clearListDrag();return}if(!listSwipe)return;const t=e.touches[0],g=listSwipe;g.dx=t.clientX-g.x;g.dy=t.clientY-g.y;if(!g.axis&&Math.max(Math.abs(g.dx),Math.abs(g.dy))>8)g.axis=Math.abs(g.dx)>Math.abs(g.dy)*1.5?'x':'y';if(g.axis!=='x')return;if(e.cancelable)e.preventDefault();const el=listSurface();if(!el||reducedMotion())return;const next=sourceOrder.indexOf(activeTab)+(g.dx<0?1:-1),edge=next<0||next>=sourceOrder.length;el.style.transition='none';el.style.transform=`translateX(${Math.max(-160,Math.min(160,g.dx*(edge?.2:.65)))}px)`},{passive:false});
root.addEventListener('touchend',async e=>{const g=listSwipe;listSwipe=null;if(!g||e.touches.length||blocked()||view()!=='list'){clearListDrag();return}if(g.axis!=='x'){settleList();return}suppressUntil=performance.now()+500;const next=sourceOrder.indexOf(activeTab)+(g.dx<0?1:-1);if(Math.abs(g.dx)<55||next<0||next>=sourceOrder.length){settleList();return}listSettling=true;try{const el=listSurface();if(el&&!reducedMotion()){el.style.transition='transform 120ms ease-out, opacity 120ms ease-out';el.style.transform=`translateX(${g.dx<0?-160:160}px)`;el.style.opacity='0';await new Promise(resolve=>setTimeout(resolve,120))}if(blocked()||view()!=='list')return;navigate({tab:sourceOrder[next],entry:null,page:null},{scroll:false});const panel=listSurface();if(panel)panel.scrollTop=0}finally{clearListDrag();listSettling=false}},{passive:true});
root.addEventListener('click',e=>{if(e.detail&&performance.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation()}},true);
for(const name of ['touchcancel','bag-day-gesture-cancel','blur','pagehide','pageshow'])window.addEventListener(name,clearListDrag);
async function load(){
 const seq=++generation;
 // Each completion updates independently; a slow filter request cannot delay notices.
 const filterTask=loadOptions().then(()=>{if(seq!==generation)return;filterWarning=optionsWarning;render()},()=>{if(seq!==generation)return;filterWarning=optionsWarning||'Categories and audiences are temporarily unavailable. Try again to load them.';render()});
 const noticeTask=readPublishedCSV().then(data=>{if(seq!==generation)return;pages=data.pages;loaded=true;error='';try{localStorage.setItem('bagday-noticeboard-public-v1',JSON.stringify({saved_at:Date.now(),pages}))}catch{}render()},()=>{if(seq!==generation)return;error=loaded?'Showing saved notices. Connect to refresh.':'Notices could not load. Please try again.';render()});
 await Promise.allSettled([filterTask,noticeTask]);
}
try{const saved=JSON.parse(localStorage.getItem('bagday-noticeboard-public-v1')||'null');if(Array.isArray(saved?.pages)){pages=saved.pages;loaded=true}}catch{}
window.addEventListener('popstate',handlePopState);window.addEventListener('pageshow',render);document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();load()}});setInterval(()=>{if(!document.hidden){if(renderedDate!==today())render();if(filterWarning)load()}},60000);window.addEventListener('online',load);render();load();

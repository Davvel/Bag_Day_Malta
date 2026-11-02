import {noticeBadge,detailHTML} from '../2_WEBSITE/COPY_TO_GITHUB/noticeboard/presentation.mjs';
import {mapURL} from '../2_WEBSITE/COPY_TO_GITHUB/noticeboard/locations.mjs';
import {animateCalendarGrid,slideCalendarPages,settleCalendarDrag} from '../2_WEBSITE/COPY_TO_GITHUB/noticeboard/calendar-motion.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as shared from '../2_WEBSITE/COPY_TO_GITHUB/noticeboard/shared.mjs';
import * as discovery from '../2_WEBSITE/COPY_TO_GITHUB/noticeboard/discovery.mjs';
import * as calendar from '../2_WEBSITE/COPY_TO_GITHUB/noticeboard/calendar-model.mjs';
const source=readFileSync(new URL('../2_WEBSITE/COPY_TO_GITHUB/noticeboard/public.mjs',import.meta.url),'utf8');
import {node} from './dom-fixture.mjs';

const fixture=Array.from({length:68},(_,i)=>({page_id:'P'+i,locality_name:i===67?'Żejtun':'Locality '+String(i+1).padStart(2,'0'),section:'church',csv:'entry_id,kind,title,description,end_date,category_id,audience_id\n'+`E${i},event,Christmas ${i},Community activity,2099-12-25,activity,${i<40?'families':'children'}`}));
function harness(url='?all=1&view=calendar&month=2099-12',{fresh=false,home='Żejtun'}={}){
 const root=node(),dialog=node('dialog'),sheet=node('dialog'),header=node(),reset=node('button');let pos=0,ctx;
 const loc={href:'https://bag.test/noticeboard/'+url,get search(){return new URL(this.href).search}},stack=[{url:loc.href,state:{noticeboard:true}}];let index=0;
 const history={get state(){return stack[index].state},replaceState(state,_,url){loc.href=new URL(url,loc.href).href;stack[index]={state,url:loc.href}},pushState(state,_,url){loc.href=new URL(url,loc.href).href;stack.splice(index+1);stack.push({state,url:loc.href});index++},back(){if(index){index--;loc.href=stack[index].url;vm.runInContext('handlePopState()',ctx)}}};
 const optionSelect=(kind,selected)=>'<option value="">All</option>'+(['activity','other', 'families','children'].map(v=>`<option value="${v}" ${v===selected?'selected':''}>${v}</option>`).join(''));
 ctx=vm.createContext({...shared,...discovery,...calendar,noticeBadge,detailHTML,mapURL,animateCalendarGrid,slideCalendarPages,settleCalendarDrag,setTimeout,clearTimeout,optionsWarning:'',today:()=>'2099-12-01',optionSelect,optionLabel:(k,id)=>({activity:'Activities',families:'Families',children:'Children'}[id]||id),noticeTags:()=>'',noticeLink:()=>'',syncNoticeboardSponsors(){},localityNames:()=>['Żejtun',...fixture.slice(0,67).map(p=>p.locality_name)],localityKey:s=>s,document:{querySelector:s=>({'#root':root,'#noticeDialog':dialog,'#filterDialog':sheet,'#noticeboardTitle':header,'#noticeShowAll':reset}[s]),createElement:node,body:{dataset:{}}},window:{get scrollY(){return pos},scrollTo(_,y){pos=y},WASTE_DATA:{}},location:loc,history,URL,URLSearchParams,requestAnimationFrame:f=>f(),localStorage:{getItem:key=>key==='bag-day-locality-v1'?home:null},performance:{now:()=>1000,getEntriesByType:()=>[{type:fresh?'navigate':'back_forward'}]},blocked:()=>false,FormData:class{constructor(form){this.values=Object.entries(form.elements).map(([k,v])=>[k,v.value])}[Symbol.iterator](){return this.values[Symbol.iterator]()}}});
 ctx.clearDrag=()=>{};
 const extracted=source.slice(0,source.indexOf('const blocked=')).replace(/^import .*;\n/gm,'');vm.runInContext(extracted+'\nglobalThis.setup=data=>{pages=data;loaded=true;render()};globalThis.cards=()=>[...lookup.values()];',ctx);ctx.setup(fixture);
 const html=()=>root.innerHTML+(root.querySelector('#dayDialog')?.innerHTML||'')+(root.querySelector('#sections')?.children||[]).map(c=>c.innerHTML).join('');
 const click=(el)=>{assert(el,'Missing control');const e={preventDefault(){},detail:0};return el.onclick?.(e)??el.listeners.click?.(e)};
 return {ctx,root,sheet,reset,history,loc,html,click,url:()=>new URL(loc.href),cards:ctx.cards,scroll:y=>{pos=y;root.querySelector('#sections').scrollTop=y},position:()=>root.querySelector('#sections').scrollTop,set:(patch)=>{for(const [k,v] of Object.entries(patch)){const u=new URL(loc.href);if(v===null)u.searchParams.delete(k);else u.searchParams.set(k,v);history.replaceState(history.state,'',u)}vm.runInContext('render()',ctx)}};
}
test('compact calendar has 42 cells, counts all 68 matches and contains no filter form or day cards',()=>{
 const h=harness();assert.equal(h.root.querySelectorAll('[data-day]').length,31);assert.equal((h.html().match(/class="empty-day"/g)||[]).length,11);assert.match(h.html(),/: 68 notices\./);assert.equal(h.cards().length,0);assert(!h.html().includes('id="filterForm"'));assert(h.root.querySelector('#noticeCategory'));assert(!h.html().includes('compact-context'));
});
test('month arrows replace current month without scrolling; six-week cell count stays stable',async()=>{
 const h=harness();h.scroll(45);await h.click(h.root.querySelectorAll('[data-month-step]')[1]);assert.equal(h.url().searchParams.get('month'),'2100-01');assert.equal(h.position(),45);assert.equal(h.root.querySelectorAll('[data-day]').length+(h.html().match(/class="empty-day"/g)||[]).length,42);
});
test('date opens a focused list of 20 then 40/60/68; Back restores calendar, date, month and position',()=>{
 const h=harness();h.scroll(25);h.click(h.root.querySelectorAll('[data-day]').find(n=>n.dataset.day==='2099-12-25'));assert.equal(h.url().searchParams.get('view'),'day');assert.equal(h.cards().length,20);assert(h.html().includes('data-calendar'));assert(h.root.querySelector('#dayDialog').open);assert.equal(h.position(),0);
 for(const count of [40,60,68]){h.click(h.root.querySelector('#moreDayResults'));assert.equal(h.cards().length,count)}h.click(h.root.querySelector('#backCalendar'));assert.equal(h.url().searchParams.get('view'),'calendar');assert.equal(h.url().searchParams.get('day'),'2099-12-25');assert.equal(h.url().searchParams.get('month'),'2099-12');assert.equal(h.position(),25);
});
test('List shows all matching dates; Calendar opens current month and clears selected date',()=>{
 const h=harness('?all=1&view=calendar&month=2099-12&day=2099-12-25');h.click(h.root.querySelectorAll('[data-view]').find(n=>n.dataset.view==='list'));assert.equal(h.cards().length,20);assert.equal(h.url().searchParams.get('view'),'list');h.click(h.root.querySelectorAll('[data-view]').find(n=>n.dataset.view==='calendar'));assert.equal(h.url().searchParams.get('month'),'2099-12');assert.equal(h.url().searchParams.get('day'),null);assert.equal(h.cards().length,0);
});
test('All Localities list starts with 20 alphabetical localities and Show more preserves order',()=>{
 const h=harness('?all=1');assert.equal(h.cards().length,20);assert.equal(h.cards()[0].locality,'Locality 01');h.click(h.root.querySelector('#moreNoticeResults'));assert.equal(h.cards().length,40);
});
test('empty day is a usable focused list with a return to calendar',()=>{
 const h=harness();h.click(h.root.querySelectorAll('[data-day]').find(n=>n.dataset.day==='2099-12-24'));assert.equal(h.cards().length,0);assert.match(h.html(),/No matching dated notices on this day/);assert(h.root.querySelector('#backCalendar'));
});
test('opening and closing a notice restores the focused day list and expanded paging',()=>{
 const h=harness('?all=1&view=day&month=2099-12&day=2099-12-25');h.click(h.root.querySelector('#moreDayResults'));assert.equal(h.cards().length,40);h.scroll(300);h.click(h.root.querySelectorAll('[data-open]')[0]);assert(h.url().searchParams.has('entry'));h.history.back();assert.equal(h.url().searchParams.get('view'),'day');assert.equal(h.cards().length,40);assert.equal(h.position(),300);
});


test('fresh visits always start at saved Home locality, while subsequent scope and locality choices work',()=>{
 const h=harness('?all=1&locality=Locality+09',{fresh:true,home:'Locality 02'});assert.equal(h.url().searchParams.get('locality'),'Locality 02');assert.equal(h.url().searchParams.get('all'),null);assert.equal(h.cards().length,1);
 h.root.querySelector('#localityScope').onchange({target:{checked:true}});assert.equal(h.cards().length,20);assert.equal(h.url().searchParams.get('all'),'1');h.root.querySelector('#locality').onchange({target:{value:'Locality 03'}});assert.equal(h.url().searchParams.get('all'),null);assert.equal(h.cards()[0].locality,'Locality 03');h.root.querySelector('#localityScope').onchange({target:{checked:true}});h.root.querySelector('#localityScope').onchange({target:{checked:false}});assert.equal(h.url().searchParams.get('locality'),'Locality 03');
});
test('calendar blocks past months and a seventh future month with a bounce and no navigation',async()=>{
 const h=harness();let animations=[];h.root.querySelector('[data-month-surface]').animate=(frames,opts)=>{animations.push({frames,opts});return {finished:Promise.resolve(),cancel(){}}};await h.click(h.root.querySelectorAll('[data-month-step]')[0]);assert.equal(h.url().searchParams.get('month'),'2099-12');assert.equal(animations.length,1);assert.equal(animations[0].opts.duration,300);
 h.set({month:'2100-06'});h.root.querySelector('[data-month-surface]').animate=(frames,opts)=>{animations.push({frames,opts});return {finished:Promise.resolve(),cancel(){}}};await h.click(h.root.querySelectorAll('[data-month-step]')[1]);assert.equal(h.url().searchParams.get('month'),'2100-06');assert.equal(animations.length,2);
});


test('inline audience and category apply immediately without a modal',()=>{const h=harness();h.root.querySelector('#noticeAudience').onchange({target:{value:'families'}});assert.equal(h.url().searchParams.get('audience'),'families');assert.match(h.html(),/: 40 notices\./);assert(!h.sheet.open);h.root.querySelector('#noticeCategory').onchange({target:{value:'other'}});assert.equal(h.cards().length,0);assert.match(h.html(),/No matching dated notices/)});
test('inline search permits one letter on submit and clear resets it',()=>{const h=harness();const form=h.root.querySelector('#noticeSearch');form.elements.q.value='C';form.onsubmit({preventDefault(){},target:form});assert.equal(h.url().searchParams.get('q'),'C');assert.match(h.html(),/: 68 notices\./);h.root.querySelector('#noticeQuery').listeners.input({target:{value:''}});assert.equal(h.url().searchParams.get('q'),null)});
test('automatic text search waits for 3 characters, debounces and preserves the search field',async()=>{
 const h=harness('?all=1');const field=h.root.querySelector('#noticeQuery');field.listeners.input({target:{value:'Ch'}});await new Promise(r=>setTimeout(r,340));assert.equal(h.url().searchParams.get('q'),null);
 field.listeners.input({target:{value:'Chr'}});field.listeners.input({target:{value:'Christmas'}});await new Promise(r=>setTimeout(r,340));assert.equal(h.url().searchParams.get('q'),'Christmas');assert.equal(h.cards().length,20);assert.equal(h.root.querySelector('#noticeQuery'),field);
 field.listeners.input({target:{value:'missing'}});field.listeners.input({target:{value:''}});await new Promise(r=>setTimeout(r,340));assert.equal(h.url().searchParams.get('q'),null);assert.equal(h.cards().length,20);
});
test('day filtering stays on the selected day and uses coloured locality groups without repeated card metadata',()=>{
 const h=harness('?all=1&view=day&month=2099-12&day=2099-12-25');h.root.querySelector('#noticeAudience').onchange({target:{value:'families'}});assert.equal(h.url().searchParams.get('view'),'day');assert.equal(h.url().searchParams.get('day'),'2099-12-25');assert.equal(h.cards().length,20);assert.match(h.html(),/section church result-group/);assert.match(h.html(),/result-locality/);assert(!h.html().includes('result-filters'));assert(!h.html().includes('matching notices'));assert(!h.html().includes('notice-publisher'));assert(!h.html().includes('result-place'));h.click(h.root.querySelector('#backCalendar'));assert.equal(h.url().searchParams.get('view'),'calendar');assert.equal(h.url().searchParams.get('audience'),'families');assert.match(h.html(),/: 40 notices\./);
});

test('source tabs auto-select sole Church data and allow an empty tab to be selected manually',()=>{
 const h=harness('?all=1');const tabs=h.root.querySelectorAll('[data-source-tab]');assert.deepEqual(tabs.map(x=>x.dataset.sourceTab),['council','church','police']);assert.equal(h.root.querySelector('#source-church').attrs['aria-selected'],'true');h.click(h.root.querySelector('#source-police'));assert.equal(h.cards().length,0);assert.equal(h.root.querySelector('#source-police').attrs['aria-selected'],'true');assert.match(h.root.querySelector('#sections').children[1].textContent,/No Police notices/);h.click(h.root.querySelector('#source-church'));assert.equal(h.cards().length,20);
});
test('Reset filters clears text/category/audience without restricting the combined day to an old tab',()=>{
 for(const scope of ['', '&all=1']){const h=harness('?view=day&month=2099-12&day=2099-12-25&locality=Locality+02&category=activity&audience=families&q=missing&tab=police'+scope);h.click(h.reset);assert.equal(h.url().searchParams.get('locality'),'Żejtun');assert.equal(h.url().searchParams.get('all'),null);assert.equal(h.url().searchParams.get('view'),'calendar');for(const k of ['q','category','audience','tab'])assert.equal(h.url().searchParams.get(k),null);assert.equal(h.root.querySelectorAll('[data-source-tab]').length,0);assert.equal(h.cards().length,0)}
});
test('keyboard source navigation follows Council, Church, Police and updates the associated panel',()=>{
 const h=harness('?all=1');h.root.querySelector('#source-church').listeners.keydown({key:'ArrowRight',preventDefault(){}});assert.equal(h.root.querySelector('#sections').attrs['aria-labelledby'],'source-police');h.root.querySelector('#source-police').listeners.keydown({key:'Home',preventDefault(){}});assert.equal(h.root.querySelector('#sections').attrs['aria-labelledby'],'source-council');
});
test('two populated sources default to Council; manual Church stays until a filter change',()=>{
 const h=harness('?all=1');h.ctx.setup([fixture[0],{...fixture[0],page_id:'Council',section:'council',csv:fixture[0].csv.replace('E0,','Council0,')}]);assert.equal(h.root.querySelector('#source-council').attrs['aria-selected'],'true');assert(h.cards().every(x=>x.section==='council'));h.click(h.root.querySelector('#source-church'));assert(h.cards().every(x=>x.section==='church'));h.root.querySelector('#noticeAudience').onchange({target:{value:'families'}});assert.equal(h.root.querySelector('#source-council').attrs['aria-selected'],'true');
});

test('Calendar combines all sources, has no tabs and ignores a legacy tab URL',async()=>{
 const h=harness('?all=1&tab=police');const church={...fixture[0],csv:fixture[0].csv.replace('2099-12-25','2100-01-05')};h.ctx.setup([church,{...church,page_id:'police',section:'police'}]);
 h.click(h.root.querySelectorAll('[data-view]').find(n=>n.dataset.view==='calendar'));
 assert.equal(h.url().searchParams.get('tab'),null);assert.equal(h.root.querySelectorAll('[data-source-tab]').length,0);
 await h.click(h.root.querySelectorAll('[data-month-step]')[1]);assert.equal(h.url().searchParams.get('month'),'2100-01');assert.match(h.html(),/: 2 notices\./);
 h.root.querySelector('#noticeAudience').onchange({target:{value:'children'}});assert.match(h.html(),/: 0 notices\./);
 h.click(h.reset);assert.match(h.html(),/No matching dated notices/);h.root.querySelector('#localityScope').onchange({target:{checked:true}});assert.match(h.html(),/: 2 notices\./);assert.equal(h.root.querySelectorAll('[data-source-tab]').length,0);
 h.click(h.root.querySelectorAll('[data-view]').find(n=>n.dataset.view==='list'));assert.equal(h.root.querySelectorAll('[data-source-tab]').length,3);
});
test('horizontal stripes use the first selected icon, cap 9+ and retain every notice in day results',()=>{
 const h=harness('?all=1&view=calendar&month=2099-12&tab=police');
 const make=(section,n)=>({...fixture[0],page_id:section,section,csv:'entry_id,kind,title,description,end_date,category_id,audience_id,icon_emoji\n'+Array.from({length:n},(_,i)=>`${section}${i},event,${section} notice ${i},Description,2099-12-25,activity,families,${i?'🎵':'🌳'}`).join('\n')});
 h.ctx.setup([make('council',1),make('church',1),make('police',12)]);
 assert.equal(h.root.querySelectorAll('[data-source-tab]').length,0);assert.match(h.html(),/: 14 notices\./);
 const day=h.root.querySelectorAll('[data-day]').find(n=>n.dataset.day==='2099-12-25');assert.match(day.attrs['aria-label'],/Local Council 1, Church 1, Police 12/);
 assert.match(h.html(),/calendar-sector sector-police has-notices"><span class="sector-notice-icon">🌳<\/span><strong>9\+<\/strong>/);
 h.click(day);assert.equal(h.cards().length,14);assert.equal(h.cards().filter(i=>i.section==='police').length,12);assert.match(h.html(),/day-source-heading/);assert.equal(h.url().searchParams.get('tab'),null);
 h.click(h.root.querySelector('#backCalendar'));assert.equal(h.url().searchParams.get('month'),'2099-12');assert.equal(h.root.querySelectorAll('[data-source-tab]').length,0);
});
test('list counts include all matching notices, cap at 9+ and highlight only nonzero badges',()=>{
 const h=harness('?all=1');assert.equal(h.root.querySelector('#count-church').textContent,'9+');assert.match(h.root.querySelector('#count-church').className,/has-notices/);assert.doesNotMatch(h.root.querySelector('#count-police').className,/has-notices/);assert.match(h.root.querySelector('#source-church').attrs['aria-label'],/68 matching/);assert.equal(h.cards().length,20);
});

test('a notice click counts one opening; rerendering and closing do not double count',()=>{
 const h=harness('?all=1&view=list'),events=[];h.ctx.window.BAG_DAY_ANALYTICS={event:(...args)=>events.push(args)};
 h.click(h.root.querySelectorAll('[data-open]')[0]);assert.equal(events.filter(e=>e[0]==='notice_open').length,1);assert.equal(events[0][1].notice_section,'church');assert.ok(events[0][1].notice_id);
 vm.runInContext('render()',h.ctx);assert.equal(events.length,1);h.history.back();assert.equal(events.length,1);
});

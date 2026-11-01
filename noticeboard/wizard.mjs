import {esc,icon,sections} from './shared.mjs?v=1.1.132';
import {eventDateMaximum} from './notice-dates.mjs?v=1.1.132';
import {locationFields,bindLocationFields,readLocationFields} from './map-picker.mjs?v=1.1.132';
import {symbolPickerHTML,bindSymbolPicker} from './symbol-picker.mjs?v=1.1.132';
import {multiSelectionHTML,bindMultiSelections,readMultiSelections} from './options.mjs?v=1.1.132';
import {normaliseNoticeURL} from './links.mjs?v=1.1.132';
import {detailHTML} from './presentation.mjs?v=1.1.132';
export const typeNames={info:'Information or advice',event:'Event or activity',disruption:'Disruption or temporary change'};
export function validateWizardData(data,today,maximumInfo,maximumEvent){
 if(!data.title.trim()||!data.description.trim())throw Error('Please enter a title and message.');
 if(!data.category_id.length)throw Error('Choose at least one category.');
 if(!data.end_date||data.end_date<today||data.end_date>(data.kind==='event'?maximumEvent:maximumInfo))throw Error('Choose a valid '+(data.kind==='event'?'event':'show-until')+' date.');
 if(data.kind==='event'&&(Boolean(data.start_time)!==Boolean(data.end_time)||data.start_time&&data.end_time<=data.start_time))throw Error('Enter both times, with the end later on the same day, or leave both blank.');
 if(data.location_mode==='physical'&&!data.where_text)throw Error('Describe the venue or affected place.');
 if(data.location_mode==='online'&&!data.link_url)throw Error('Enter the online joining or details link.');
 if(data.notice_type==='disruption'){
  if(!data.start_date||data.start_date>data.end_date)throw Error('Choose a start date on or before Show until.');
  if(data.expected_end_date&&(data.expected_end_date<data.start_date||data.expected_end_date>data.end_date))throw Error('Expected end must fall between the start and show-until dates.');
  if(data.expected_end_time&&!data.expected_end_date)throw Error('Choose an expected end date, or clear its time.');
 }
 return data;
}
export function openNoticeWizard({dialog,state,item,record,review=false,token,request,onComplete}){
 const page=state.page,section=sections[page.section],saved=record?JSON.parse(record.payload):item||{};
 const id=record?.entry_id||item?.entry_id||crypto.randomUUID();
 const path='/noticeboard/'+page.page_id+'/drafts/'+encodeURIComponent(id);
 const type=saved.notice_type||saved.kind||'info';
 const data={notice_type:type,kind:type==='event'?'event':'info',end_date:type==='event'?state.today:state.maximum_info_date,
  title:'',description:'',category_id:[],audience_id:[],link_url:'',link_title:'',icon_emoji:'',where_text:'',latitude:null,longitude:null,
  location_mode:saved.where_text?'physical':'none',start_time:'',end_time:'',start_date:state.today,expected_end_date:'',expected_end_time:''};
 for(const key of Object.keys(data))if(saved[key]!=null)data[key]=saved[key];
 data.notice_type=type;data.location_mode=data.location_mode||'none';
 for(const key of ['category_id','audience_id'])data[key]=(Array.isArray(data[key])?data[key]:String(data[key]).split('|')).filter(v=>v&&v!=='all');
 const steps=['Type and date','Write notice','Optional details','Preview'];
 let step=review?4:record?.step||1,detail='',pending=false,dirty=false;
 const oldClass=dialog.className;dialog.className='notice-wizard desk-wizard';dialog.setAttribute('aria-labelledby','wizardTitle');
 dialog.innerHTML='<form id="deskForm" novalidate><header class="desk-wizard-head"><p></p><button type="button" class="secondary" id="exitWizard">Close</button></header><div class="progress-dots" aria-hidden="true"></div><h2 id="wizardTitle" tabindex="-1"></h2><section id="deskFields"></section><p id="wizardError" role="alert" hidden></p><footer class="desk-controls"></footer></form>';
 const form=dialog.querySelector('form'),fields=form.querySelector('#deskFields'),footer=form.querySelector('footer'),err=form.querySelector('#wizardError');
 form.querySelector('header p').textContent=page.locality_name+' · '+section.name;
 function close(){if(!pending&&(!dirty||confirm('Discard your unsaved changes? Choose Cancel to keep editing.')))dialog.close()}
 function cancel(e){e.preventDefault();close()}
 dialog.addEventListener('cancel',cancel);dialog.addEventListener('close',()=>{dialog.removeEventListener('cancel',cancel);dialog.className=oldClass},{once:true});
 form.querySelector('#exitWizard').onclick=close;
 form.oninput=()=>{dirty=true};form.onchange=()=>{dirty=true};
 const input=(name,label,kind='text',attrs='')=>`<label>${label}<input name="${name}" type="${kind}" value="${esc(data[name]||'')}" ${attrs}></label>`;
 const maxEvent=state.maximum_event_date||eventDateMaximum(state.today);
 const event=()=>data.notice_type==='event',disruption=()=>data.notice_type==='disruption';
 const details={place:'Place or online event',link:'Web link',symbol:'Calendar symbol',audience:'Audience',times:'Event times',expected:'Expected end'};
 function collect(){
  for(const [k,v] of new FormData(form))if(Object.hasOwn(data,k))data[k]=v;
  for(const box of fields.querySelectorAll('.notice-multiselect'))data[box.dataset.field]=[...box.querySelectorAll('input:checked')].map(c=>c.value);
  if(detail==='place'&&data.location_mode==='physical')Object.assign(data,readLocationFields(form));
  if(data.location_mode!=='physical')Object.assign(data,{where_text:'',latitude:null,longitude:null});
 }
 function validate(){data.link_url=normaliseNoticeURL(data.link_url);return validateWizardData(data,state.today,state.maximum_info_date,maxEvent)}
 function showError(e){err.hidden=false;err.textContent=e.message;err.scrollIntoView?.({block:'nearest'})}
 async function save(mark){
  if(pending)return;collect();if(mark)validate();
  pending=true;form.inert=true;
  try{await request(path,{method:mark?'POST':'PATCH',token,body:{data,step,entry_revision:record?.entry_revision??item?.revision??0,draft_revision:record?.revision||0}});
  }catch(e){showError(e);return}finally{pending=false;form.inert=false}
  dirty=false;dialog.close();await onComplete(mark);
 }
 function render(){
  err.hidden=true;dialog.scrollTop=0;
  const title=form.querySelector('h2');title.textContent=step+' of 4 · '+(detail?details[detail]:steps[step-1]);
  form.querySelector('.progress-dots').innerHTML=steps.map((_,i)=>'<i class="'+(i<step?'done':'')+'"></i>').join('');
  if(step===1){
   fields.innerHTML='<p>What would you like to share?</p><div class="type-tiles">'+Object.entries(typeNames).map(([k,v])=>`<button type="button" data-type="${k}" aria-pressed="${data.notice_type===k}">${icon(k==='event'?'calendar':k==='disruption'?'info':'list')}${v}</button>`).join('')+'</div>'+input('end_date',event()?'Event date':'Show until','date',`required min="${state.today}" max="${event()?maxEvent:state.maximum_info_date}"`)+(disruption()?input('start_date','Starts on','date','required'):'');
   fields.querySelectorAll('[data-type]').forEach(b=>b.onclick=()=>{collect();const next=b.dataset.type;if(next===data.notice_type)return;dirty=true;data.notice_type=next;data.kind=event()?'event':'info';data.end_date=event()?state.today:state.maximum_info_date;if(!event()){if(data.location_mode==='online')data.location_mode='none';data.start_time=data.end_time=''}if(disruption()&&!data.start_date)data.start_date=state.today;render()});
  }else if(step===2){
   fields.innerHTML=input('title','Title','text','required maxlength="80"')+`<label>Message<textarea name="description" required maxlength="800">${esc(data.description)}</textarea></label>`+multiSelectionHTML('categories',data.category_id);
  }else if(step===3&&!detail){
   const summary={place:data.location_mode==='physical'?data.where_text:data.location_mode==='online'?'Online':'',link:data.link_title||data.link_url,symbol:data.icon_emoji||'📌',audience:data.audience_id.length?data.audience_id.length+' selected':'Everyone',times:data.start_time,expected:data.expected_end_date};
   fields.innerHTML='<p>You can go straight to preview, or add a detail.</p><div class="detail-tiles">'+Object.entries(details).filter(([k])=>(k!=='times'||event())&&(k!=='expected'||disruption())).map(([k,v])=>`<button type="button" data-detail="${k}"><b>${v}</b><span>${esc(summary[k]||'Add')} ›</span></button>`).join('')+'</div>';
   fields.querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>{detail=b.dataset.detail;render()});
  }else if(step===3){
   if(detail==='place'){
    fields.innerHTML='<label>Location<select name="location_mode"><option value="none">No specific place</option><option value="physical">A physical place</option>'+(event()?'<option value="online">Online</option>':'')+'</select></label><fieldset id="placeFields">'+locationFields(data)+'</fieldset><div id="onlineFields">'+input('link_url','Online joining link')+'</div>';
    const select=form.elements.location_mode;select.value=data.location_mode;const sync=()=>{const physical=select.value==='physical',online=select.value==='online';const group=fields.querySelector('#placeFields');group.hidden=group.disabled=!physical;form.elements.where_text.required=physical;fields.querySelector('#onlineFields').hidden=!online;form.elements.link_url.disabled=!online;form.elements.link_url.required=online};select.onchange=sync;sync();bindLocationFields(form,page);
   }else if(detail==='link')fields.innerHTML=input('link_url','Link URL','text','maxlength="2048"')+input('link_title','Link text','text','maxlength="80"');
   else if(detail==='audience')fields.innerHTML=multiSelectionHTML('audiences',data.audience_id);
   else if(detail==='symbol'){fields.innerHTML=input('title','','hidden')+input('description','','hidden')+symbolPickerHTML(data.icon_emoji);bindSymbolPicker(form,token)}
   else if(detail==='times')fields.innerHTML=input('start_time','Start time · Malta','time')+input('end_time','End time · Malta','time');
   else fields.innerHTML=input('expected_end_date','Expected end date','date')+input('expected_end_time','Expected end time · Malta','time');
  }else{
   fields.innerHTML=`<div class="wizard-preview"><article class="notice-detail-modal ${page.section}">${detailHTML({...data,locality:page.locality_name},section,page.locality_name)}</article></div><p class="wizard-preview-warning">Residents will only see these changes after you press <b>Publish all</b> on the ${esc(page.locality_name)} ${esc(section.name)} noticeboard.</p>`;
   fields.querySelector('#closeNotice')?.remove();fields.querySelectorAll('a').forEach(a=>{a.removeAttribute('href');a.tabIndex=-1});
  }
  bindMultiSelections(form);for(const panel of fields.querySelectorAll('.notice-multiselect details')){panel.open=true;panel.querySelector('summary').hidden=true}
  footer.innerHTML=(step>1?'<button id="backStep" type="button" class="secondary">Back</button>':'')+'<button id="draftExit" type="button" class="secondary">Save draft and exit</button><button class="primary" type="submit">'+(detail?'Done':(['Next · Write notice','Next · Details','Preview notice','Mark for publication'][step-1]))+'</button>';
  if(step>1)footer.querySelector('#backStep').onclick=()=>{collect();if(detail)detail='';else step--;render()};
  footer.querySelector('#draftExit').onclick=()=>save(false).catch(showError);
  title.focus({preventScroll:true});
 }
 form.onsubmit=e=>{e.preventDefault();if(pending)return;try{
  collect();if(!form.reportValidity())return;
  if(detail){if(detail==='link'||detail==='place')data.link_url=normaliseNoticeURL(data.link_url);detail='';render();return}
  if(step===1&&disruption()&&data.start_date>data.end_date)throw Error('Starts on must be on or before Show until.');
  if(step===2)readMultiSelections(form);if(step>=3)validate();
  if(step===4){save(true).catch(showError);return}step++;render();
 }catch(e){showError(e)}};
 dialog.showModal();render();
}

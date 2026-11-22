import {channelCopy,date,daysSinceLastUpvote,esc,labels,previewText,request,revealPhoto,shareConcern,support} from './shared.mjs?v=1.1.172';
import {mapURL} from '../noticeboard/locations.mjs?v=1.1.172';

export function mountCouncilConcerns(container,{page,token,onSignIn}){
 const endpoint='/concerns/council/'+page.page_id;
 const get=(path='',options={})=>request(endpoint+path,{...options,token});
 let filter='open',offset=0,seq=0,detailSeq=0,disposed=false,opener=null;
 const dialog=document.createElement('dialog');dialog.className='concern-dialog concern-review-dialog';dialog.setAttribute('aria-label','Council concern review');
 dialog.addEventListener('close',()=>{detailSeq++;opener?.focus()});
 container.innerHTML='<p data-concern-alert role="status" hidden></p><div data-concern-queue></div><section data-concern-detail hidden></section>';
 container.append(dialog);
 const queue=container.querySelector('[data-concern-queue]'),detail=dialog;
 const notice=container.querySelector('[data-concern-alert]');
 function message(copy){notice.textContent=copy;notice.hidden=!copy;const alert=detail.querySelector('[data-review-message]');if(alert){alert.textContent=copy;alert.hidden=!copy}}
 async function act(button,fn){
  if(button)button.disabled=true;
  message('');
  try{await fn()}catch(error){
   if(error.status===401)onSignIn(error.message);
   else message(error.message);
  }finally{if(button?.isConnected)button.disabled=false}
 }
 async function refresh(){
  const current=++seq;
  queue.setAttribute('aria-busy','true');
  try{
   const data=await get('?'+new URLSearchParams({filter,offset}));
   if(disposed||current!==seq||!container.isConnected)return;
   queue.innerHTML=`<details class="concern-settings" open><summary>Concern settings · ${esc(data.state)}</summary><form><div class="concern-actions"><label>Channel status
    <select name="state">${Object.keys(channelCopy).map(state=>`<option value="${state}" ${state===data.state?'selected':''}>${state[0].toUpperCase()+state.slice(1)}</option>`).join('')}</select></label>
    <label class="concern-photo-switch"><input type="checkbox" name="photos_enabled" ${data.photos_enabled?'checked':''} ${data.photos_available||data.photos_enabled?'':'disabled'}> Allow photo attachments</label>
    <button class="primary" type="submit" disabled>Save settings</button></div><p data-state-copy>${channelCopy[data.state]}</p><p class="hint">Only enable photos if your council can review each photo. Residents can see their own photo while it awaits approval; everyone else sees only the concern text.</p>${data.photos_available?'':'<p class="hint">Photo storage is unavailable, so photo attachments cannot be enabled.</p>'}</form></details>
    <details class="concern-settings" data-completed-report><summary>Completed concerns report</summary><form class="concern-actions" data-report-form>
     <label>From month <input type="month" name="from" required></label><label>To month <input type="month" name="to" required></label>
     <button class="secondary" type="submit">Show total</button><strong data-report-result role="status" aria-live="polite"></strong>
    </form><p class="hint">The report counts concerns completed in the selected inclusive month range.</p></details>
    <div class="concern-toolbar"><h2>Resident submissions</h2><label>Show <select data-filter>
    <option value="open" ${filter==='open'?'selected':''}>Open concerns</option><option value="photos" ${filter==='photos'?'selected':''}>All photos</option><option value="closed" ${filter==='closed'?'selected':''}>Closed and archived</option><option value="blocked" ${filter==='blocked'?'selected':''}>Blocked concerns</option><option value="all" ${filter==='all'?'selected':''}>All concerns</option></select></label></div>
    <details class="concern-help"><summary>How this board works</summary><p>Concern text is public as soon as it is submitted. A person can upvote once every 24 hours; each upvote renews the 30-day timer and moves the concern higher in the council’s support order. After 30 days without an upvote, only the council can revive it for 10 days. Unresolved concerns are deleted after day 40. Photos stay private until approved; you can later hide an approved photo again.</p></details>
    ${data.items.length?`<table class="desk-list concern-queue"><thead><tr><th>Concern</th><th>Date submitted</th><th>Since last upvote</th><th>Upvotes</th><th>Photo</th><th>Status</th><th>Action</th></tr></thead>
    <tbody>${data.items.map(item=>`<tr><td><strong>${esc(previewText(item.description))}</strong></td><td>${esc(date(item.submitted_at))}</td><td>${esc(daysSinceLastUpvote(item))}</td>
    <td>${support(item)}</td><td>${item.photo_url?`<button class="concern-thumb-button" type="button" data-open-concern="${esc(item.concern_id)}" aria-label="Review attached photo"><img class="concern-queue-thumb" src="${esc(item.photo_url)}" alt="Attached concern photo"></button><span>${esc(item.photo_state==='pending'?'Awaiting approval':item.photo_state==='approved'?'Public':'Hidden')}</span>`:'—'}</td><td>${esc(item.archived_at?'Archived':labels[item.status])}</td><td><button class="secondary" type="button" data-open-concern="${esc(item.concern_id)}">${item.photo_url?'Review':'Open'}</button></td></tr>`).join('')}</tbody></table>`:'<p>No concerns in this view.</p>'}
    <div class="concern-actions">${offset?'<button type="button" data-page="previous">Previous</button>':''}${data.more?'<button type="button" data-page="next">More concerns</button>':''}</div>`;
   queue.querySelectorAll('tbody tr').forEach(row=>[...row.cells].forEach((cell,i)=>cell.dataset.label=['Concern','Date submitted','Since last upvote','Upvotes','Photo','Status','Action'][i]));
   const reportForm=queue.querySelector('[data-report-form]'),reportResult=queue.querySelector('[data-report-result]');
   const maltaParts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Malta',year:'numeric',month:'2-digit'}).formatToParts(new Date());
   const part=type=>maltaParts.find(value=>value.type===type).value,currentMonth=part('year')+'-'+part('month');
   reportForm.elements.from.value ||= part('year')+'-01';reportForm.elements.to.value ||= currentMonth;
   reportForm.onsubmit=event=>{event.preventDefault();act(reportForm.querySelector('button'),async()=>{
    const from=reportForm.elements.from.value,to=reportForm.elements.to.value;
    if(from>to)throw Error('The starting month must be before or equal to the ending month.');
    const report=await get('?'+new URLSearchParams({filter:'completed_report',from,to}));
    reportResult.textContent=`${report.total} completed concern${report.total===1?'':'s'} from ${from} to ${to}.`;
   })};
   const form=queue.querySelector('form'),save=form.querySelector('button');
   form.elements.state.onchange=()=>{
    form.querySelector('[data-state-copy]').textContent=channelCopy[form.elements.state.value];
    save.disabled=form.elements.state.value===data.state&&form.elements.photos_enabled.checked===data.photos_enabled;
   };
   form.elements.photos_enabled.onchange=()=>{save.disabled=form.elements.state.value===data.state&&form.elements.photos_enabled.checked===data.photos_enabled};
   form.onsubmit=event=>{event.preventDefault();act(save,async()=>{
    await get('',{method:'PATCH',body:{state:form.elements.state.value,photos_enabled:form.elements.photos_enabled.checked}});
    await refresh();message('Channel status saved for '+page.locality_name+'.');
   })};
   queue.querySelector('[data-filter]').onchange=event=>act(event.currentTarget,async()=>{
    filter=event.target.value;offset=0;detail.close();await refresh();
   });
   queue.querySelectorAll('[data-page]').forEach(button=>button.onclick=()=>act(button,async()=>{
    offset=Math.max(0,offset+(button.dataset.page==='next'?30:-30));detail.close();await refresh();
   }));
   queue.querySelectorAll('[data-open-concern]').forEach(button=>button.onclick=()=>act(button,()=>{opener=button;return open(button.dataset.openConcern)}));
  }finally{if(current===seq)queue.removeAttribute('aria-busy')}
 }
 async function open(id){
  const current=++detailSeq;
  const item=await get('/'+id);
  if(disposed||current!==detailSeq||!container.isConnected)return;
  const needsAction=['collecting','ready','in_progress'].includes(item.status)&&!item.archived_at;
  const canRevive=Boolean(item.archived_at&&!item.blocked_at&&['collecting','ready','in_progress'].includes(item.status)&&Date.now()-Date.parse(item.archived_at)<=10*86400000);
  const photo=['pending','approved','rejected'].includes(item.photo_state)&&!item.photo_deleted_at;
  const link=mapURL(item);
  detail.className='concern-dialog concern-review-dialog';
  detail.innerHTML=`<div class="concern-toolbar"><div><p class="concern-caption">${esc(page.locality_name)} · Council</p><h2>Concern details</h2></div><button type="button" class="secondary" data-close-detail>Close</button></div>
   <p data-review-message class="concern-notice" role="status" hidden></p><div class="concern-review-grid"><section class="concern-reading"><p class="concern-full-text">${esc(item.description)}</p><p>Date submitted: ${esc(date(item.submitted_at))} · ${esc(daysSinceLastUpvote(item))}</p><p><strong class="concern-status" data-status="${esc(item.status)}">${esc(labels[item.status])}</strong> · ${support(item)}</p>
   ${needsAction?'<p>Upvotes show how much community support this concern has. The text is already public.</p>':''}
   ${link?`<p><a href="${esc(link)}" target="_blank" rel="noopener">Open pin in Google Maps</a></p>`:''}
   <div class="concern-actions">
   ${item.published_at?`<button type="button" class="secondary" data-share>Share concern</button>`:''}
   </div>
   ${photo?'<h3>Attached photo · '+esc(item.photo_state==='pending'?'Waiting for approval':item.photo_state==='approved'?'Public':'Hidden from public')+'</h3>':''}<div class="concern-photo" hidden></div>
   ${photo?`<div class="concern-actions"><button type="button" class="secondary" data-action="approve_photo" ${item.photo_state==='approved'?'disabled':''} disabled title="Wait for the photo to load before approving it">Approve / show photo</button><button type="button" class="secondary" data-action="reject_photo">Hide photo</button></div>`:''}
   </section><aside class="concern-decision">${needsAction?`<form><h3>Council response</h3><label class="concern-note">Update or closure reason<textarea name="note" maxlength="500" rows="2"></textarea><span class="concern-counter" data-note-count>0 / 500</span></label><div class="concern-actions">
    <button type="button" class="primary" data-action="in_progress">Record update</button><button type="button" class="secondary" data-action="completed">Close as completed</button><button type="button" class="secondary" data-action="cannot_complete">Close as cannot complete</button></div></form>`:''}
   ${item.blocked_at?'<p class="concern-notice">Blocked for everyone. Retained for council records.</p>':''}
   <div class="concern-actions">${canRevive?'<button type="button" class="primary" data-action="revive">Revive concern · 10-day grace period</button>':''}<button type="button" class="secondary" data-action="block_concern" ${item.blocked_at?'disabled':''}>Block concern for everyone</button><button type="button" class="concern-delete" data-delete-permanent>Delete permanently</button></div>
   </aside></div>${item.updates.length?`<section class="concern-timeline"><h3>Council updates</h3>${item.updates.map(update=>`<p><strong>${esc(date(update.created_at))} · ${esc(labels[update.status])}</strong><br>${esc(update.note)}</p>`).join('')}</section>`:''}`;
  detail.querySelector('[data-close-detail]').onclick=()=>{detail.close()};
  detail.querySelector('[data-share]')?.addEventListener('click',event=>act(event.currentTarget,async()=>{
   const result=await shareConcern(id);if(result)message(result);
  }));
  detail.querySelector('[data-delete-permanent]')?.addEventListener('click',event=>act(event.currentTarget,async()=>{
   if(!window.confirm('Permanently delete this concern, its votes, updates, and photo? This cannot be undone.'))return;
   await get('/'+id,{method:'DELETE'});detail.close();await refresh();message('Concern permanently deleted.');
  }));
  let photoLoaded=false;
  const photoBox=detail.querySelector('.concern-photo');
  const approvePhoto=detail.querySelector('[data-action="approve_photo"]');
  async function loadPhoto(){
   if(disposed||current!==detailSeq||!detail.open)return;
   photoLoaded=false;
   if(approvePhoto)approvePhoto.disabled=true;
   photoBox.hidden=false;
   const loaded=await revealPhoto(photoBox,endpoint+'/'+id+'/photo',token);
   if(disposed||current!==detailSeq||!detail.open||!photoBox.isConnected)return;
   photoLoaded=loaded;
   if(approvePhoto){approvePhoto.disabled=!loaded||item.photo_state==='approved';approvePhoto.title=loaded?'':'The photo must load before it can be approved';}
   if(!loaded){
    const retry=document.createElement('button');retry.type='button';retry.className='secondary';retry.textContent='Retry photo';
    retry.onclick=()=>act(retry,loadPhoto);photoBox.append(retry);
   }
  }
  const noteField=detail.querySelector('textarea'),noteLabel=detail.querySelector('.concern-note');
  async function irreversibleCannotComplete(){
   const modal=document.createElement('dialog');modal.className='concern-dialog concern-irreversible';modal.setAttribute('aria-labelledby','concernIrreversibleTitle');
   modal.innerHTML='<h2 id="concernIrreversibleTitle">Permanently close this concern?</h2><p>The same email with the council’s reason will be sent to the creator and council. Then the concern, photo and individual upvote records will be permanently deleted. This cannot be undone.</p><div class="concern-actions"><button type="button" class="secondary" data-cancel>Go back</button><button type="button" class="concern-delete" data-confirm>Send email and delete</button></div>';
   detail.append(modal);return await new Promise(resolve=>{let answer=false;modal.querySelector('[data-confirm]').onclick=()=>{answer=true;modal.close()};modal.querySelector('[data-cancel]').onclick=()=>modal.close();modal.addEventListener('close',()=>{modal.remove();resolve(answer)},{once:true});modal.showModal();modal.querySelector('[data-cancel]').focus()});
  }
  if(noteField)noteField.oninput=()=>{detail.querySelector('[data-note-count]').textContent=noteField.value.length+' / 500'};
  detail.querySelector('form')?.addEventListener('submit',event=>event.preventDefault());
  detail.querySelectorAll('[data-action]').forEach(button=>button.onclick=()=>act(button,async()=>{
   const action=button.dataset.action,note=detail.querySelector('textarea')?.value.trim()||undefined;
   if(disposed||current!==detailSeq)return;
   if(['in_progress','completed','cannot_complete'].includes(action)&&!note)throw Error('Add a short council update or closure reason first.');
   if(action==='cannot_complete'&&!await irreversibleCannotComplete())return;
   if(['block_concern','completed'].includes(action)&&button.dataset.confirmed!=='true'){
    if(noteLabel)noteLabel.hidden=false;
    button.dataset.confirmed='true';const original=button.textContent;button.textContent=action==='block_concern'?'Confirm block for everyone':action==='completed'?'Confirm completed closure':'Confirm cannot complete';
    const cancel=document.createElement('button');cancel.type='button';cancel.className='secondary';cancel.textContent='Cancel';button.after(cancel);
    cancel.onclick=()=>{delete button.dataset.confirmed;button.textContent=original;cancel.remove()};noteField?.focus();return;
   }
   if(action==='approve_photo'&&!photoLoaded)throw Error('Wait for the photo to load before approving it.');
   const result=await get('/'+id,{method:'PATCH',body:{action,note,revision:item.revision}});
   if(disposed||current!==detailSeq||!detail.open)return;
   if(action==='cannot_complete'&&result.deleted){detail.close();await refresh();message('The creator and council were emailed. The concern and its related data have been deleted.');return}
   if(action==='revive'){detail.close();await refresh();message('Concern revived. Its 30-day activity period has restarted.');return}
   await refresh();if(disposed||current!==detailSeq||!detail.open)return;await open(id);
   const copy=({approve_photo:'Photo is now visible to everyone.',reject_photo:'Photo hidden from everyone and retained for the council.',block_concern:'Concern blocked for everyone and retained for council records.',in_progress:'Update saved.',completed:'Concern marked completed. Its photo and individual upvote records were deleted; the total upvote count was kept.'}[action]||'Saved.');
   message(copy);
  }));
  if(!detail.open)detail.showModal();
  if(photo)void loadPhoto();
 }
 void act(null,refresh);
 return ()=>{disposed=true;seq++;detailSeq++;if(detail.open)detail.close();detail.remove()};
}

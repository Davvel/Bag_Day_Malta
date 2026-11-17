import {age,channelCopy,date,deadline,esc,labels,previewText,request,revealPhoto,shareConcern,support} from './shared.mjs?v=1.1.150';
import {mapURL} from '../noticeboard/locations.mjs?v=1.1.150';

export function mountCouncilConcerns(container,{page,token,onSignIn}){
 const endpoint='/concerns/council/'+page.page_id;
 const get=(path='',options={})=>request(endpoint+path,{...options,token});
 let filter='open',offset=0,seq=0;
 container.innerHTML='<p data-concern-alert role="status" hidden></p><div data-concern-queue></div><section data-concern-detail hidden></section>';
 const queue=container.querySelector('[data-concern-queue]'),detail=container.querySelector('[data-concern-detail]');
 const notice=container.querySelector('[data-concern-alert]');
 function message(copy){notice.textContent=copy;notice.hidden=!copy}
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
   if(current!==seq||!container.isConnected)return;
   queue.innerHTML=`<form class="concern-settings"><div class="concern-actions"><label>Channel status
    <select name="state">${Object.keys(channelCopy).map(state=>`<option value="${state}" ${state===data.state?'selected':''}>${state[0].toUpperCase()+state.slice(1)}</option>`).join('')}</select></label>
    <button class="primary" type="submit" disabled>Save status</button></div><p data-state-copy>${channelCopy[data.state]}</p></form>
    <div class="concern-toolbar"><h2>Resident submissions</h2><label>Show <select data-filter>
    <option value="open" ${filter==='open'?'selected':''}>Open concerns</option><option value="closed" ${filter==='closed'?'selected':''}>Closed and declined</option></select></label></div>
    <p>Approve to publish. Share the concern so residents can sign in and upvote. It reaches the council queue at three upvotes or 30 days after submission, whichever comes first.</p>
    ${data.items.length?`<table class="desk-list concern-queue"><thead><tr><th>Concern</th><th>Submitted</th><th>Upvotes</th><th>Status</th><th>Action</th></tr></thead>
    <tbody>${data.items.map(item=>`<tr><td><strong>${esc(previewText(item.description))}</strong></td><td>${esc(age(item))}</td>
    <td>${support(item)}</td><td>${esc(labels[item.status])}</td><td><button class="secondary" type="button" data-open-concern="${esc(item.concern_id)}">${item.status==='pending'?'Review':'Open'}</button></td></tr>`).join('')}</tbody></table>`:'<p>No concerns in this view.</p>'}
    <div class="concern-actions">${offset?'<button type="button" data-page="previous">Previous</button>':''}${data.more?'<button type="button" data-page="next">More concerns</button>':''}</div>`;
   const form=queue.querySelector('form'),save=form.querySelector('button');
   form.elements.state.onchange=()=>{
    form.querySelector('[data-state-copy]').textContent=channelCopy[form.elements.state.value];
    save.disabled=form.elements.state.value===data.state;
   };
   form.onsubmit=event=>{event.preventDefault();act(save,async()=>{
    await get('',{method:'PATCH',body:{state:form.elements.state.value}});
    await refresh();message('Channel status saved for '+page.locality_name+'.');
   })};
   queue.querySelector('[data-filter]').onchange=event=>act(event.currentTarget,async()=>{
    filter=event.target.value;offset=0;detail.hidden=true;await refresh();
   });
   queue.querySelectorAll('[data-page]').forEach(button=>button.onclick=()=>act(button,async()=>{
    offset=Math.max(0,offset+(button.dataset.page==='next'?30:-30));detail.hidden=true;await refresh();
   }));
   queue.querySelectorAll('[data-open-concern]').forEach(button=>button.onclick=()=>act(button,()=>open(button.dataset.openConcern)));
  }finally{if(current===seq)queue.removeAttribute('aria-busy')}
 }
 async function open(id){
  const item=await get('/'+id);
  if(!container.isConnected)return;
  const pending=item.status==='pending',needsAction=['ready','in_progress'].includes(item.status);
  const photo=['pending','approved'].includes(item.photo_state);
  const link=mapURL(item);
  detail.className='concern-details';detail.hidden=false;
  detail.innerHTML=`<div class="concern-toolbar"><h3>Concern details</h3><button type="button" class="secondary" data-close-detail>Close</button></div>
   <p>${esc(item.description)}</p><p>${esc(age(item))} · <strong>${esc(labels[item.status])}</strong></p><p>${support(item)}</p>
   ${item.status==='collecting'?`<p>${esc(deadline(item))} Share this concern and invite residents to sign in and upvote.</p>`:''}
   ${item.routing_reason==='deadline'?'<p>Sent to the council automatically at the 30-day deadline.</p>':''}
   ${link?`<p><a href="${esc(link)}" target="_blank" rel="noopener">Open pin in Google Maps</a></p>`:''}
   <div class="concern-actions">
   ${item.published_at?`<button type="button" class="secondary" data-share>Share concern</button>`:''}
   </div>
   <div class="concern-photo" hidden></div>
   ${photo?`<p>${item.photo_state==='pending'?'Photo awaiting separate moderation.':'Photo approved for public viewing.'}</p>
    <div class="concern-actions">${item.photo_state==='pending'?'<button type="button" class="secondary" data-action="approve_photo" disabled title="Wait for the photo to load before approving it">Approve photo</button>':''}<button type="button" class="secondary" data-action="reject_photo">Hide photo</button></div>`:''}
   ${pending||needsAction?`<form><label class="concern-note">${pending?'Reason if declining':'Short update or closure reason'}<textarea name="note" maxlength="500" rows="2"></textarea></label><div class="concern-actions">
    ${pending?'<button type="button" class="primary" data-action="publish">Approve and publish</button><button type="button" class="secondary" data-action="decline">Decline</button>':
    '<button type="button" class="primary" data-action="in_progress">Record action</button><button type="button" class="secondary" data-action="completed">Close as completed</button><button type="button" class="secondary" data-action="cannot_complete">Close as cannot complete</button>'}</div></form>`:''}
   ${item.status==='declined'&&item.last_note?`<p>${esc(item.last_note)}</p>`:''}
   ${item.updates.length?`<h3>Updates</h3>${item.updates.map(update=>`<p><strong>${esc(date(update.created_at))} · ${esc(labels[update.status])}</strong><br>${esc(update.note)}</p>`).join('')}`:''}`;
  detail.querySelector('[data-close-detail]').onclick=()=>{detail.hidden=true};
  detail.querySelector('[data-share]')?.addEventListener('click',event=>act(event.currentTarget,async()=>{
   const result=await shareConcern(id);if(result)message(result);
  }));
  let photoLoaded=false;
  const photoBox=detail.querySelector('.concern-photo');
  const approvePhoto=detail.querySelector('[data-action="approve_photo"]');
  async function loadPhoto(){
   photoLoaded=false;
   if(approvePhoto)approvePhoto.disabled=true;
   photoBox.hidden=false;
   const loaded=await revealPhoto(photoBox,endpoint+'/'+id+'/photo',token);
   if(!photoBox.isConnected)return;
   photoLoaded=loaded;
   if(approvePhoto){approvePhoto.disabled=!loaded;approvePhoto.title=loaded?'':'The photo must load before it can be approved';}
   if(!loaded){
    const retry=document.createElement('button');retry.type='button';retry.className='secondary';retry.textContent='Retry photo';
    retry.onclick=()=>act(retry,loadPhoto);photoBox.append(retry);
   }
  }
  detail.querySelector('form')?.addEventListener('submit',event=>event.preventDefault());
  detail.querySelectorAll('[data-action]').forEach(button=>button.onclick=()=>act(button,async()=>{
   const action=button.dataset.action,note=detail.querySelector('textarea')?.value.trim()||undefined;
   if(action==='approve_photo'&&!photoLoaded)throw Error('Wait for the photo to load before approving it.');
   const result=await get('/'+id,{method:'PATCH',body:{action,note,revision:item.revision}});
   await refresh();await open(id);
   const copy=action==='publish'&&result.status==='collecting'?'Concern published. Share it so residents can sign in and give it the first upvotes.':
    action==='publish'?'Concern published and sent to the council queue.':'Saved.';
   message(copy);
  }));
  if(photo)void loadPhoto();
 }
 return act(null,refresh);
}

import {age,boardURL,date,deadline,esc,labels,previewText,request,revealPhoto,shareConcern,standing,support} from './shared.mjs?v=1.1.149';
import {bindLocationFields,locationFields,readLocationFields} from '../noticeboard/map-picker.mjs?v=1.1.149';
import {mapURL} from '../noticeboard/locations.mjs?v=1.1.149';
import {compressPhoto,sendPhoto} from './photo.mjs?v=1.1.149';

const $=selector=>document.querySelector(selector);
const main=$('#concernMain'),compose=$('#concernCompose'),signin=$('#concernSignIn');
const params=new URLSearchParams(location.search);
let loc=params.get('locality'),itemId=params.get('concern'),archived=params.get('archive')==='1',offset=0;
let board=null,me=false,actionAfterLogin=null,googleTask=null,sequence=0,checkingSubmission=false;
try{loc ||= localStorage.getItem('bag-day-locality-v1')||'Żejtun'}catch{loc ||= 'Żejtun'}

function message(copy){
 const node=$('#concernMessage');node.textContent=copy;node.hidden=!copy;if(copy){node.focus();node.scrollIntoView({block:'nearest'})}
}
function signIn(next){
 actionAfterLogin=next;
 $('#concernSignInError').textContent='';
 $('#concernGoogle').replaceChildren();
 if(!signin.open)signin.showModal();
 openGoogle().catch(error=>$('#concernSignInError').textContent=error.message);
}
async function openGoogle(){
 const conf=await request('/auth/public/config');
 if(!window.google?.accounts){
  googleTask ||= new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';
   script.onload=resolve;script.onerror=()=>{script.remove();googleTask=null;reject(Error('Google sign-in could not load. Try again.'))};
   document.head.append(script);
  });
  await googleTask;
 }
 if(!signin.open)return;
 google.accounts.id.initialize({client_id:conf.google_client_id,nonce:conf.nonce,callback:async ({credential})=>{
  try{
   await request('/auth/public/google',{method:'POST',body:{credential}});
   me=true;const next=actionAfterLogin;actionAfterLogin=null;signin.close();message('');
   if(next)await next();else await load();
  }catch(error){
   if(signin.open)$('#concernSignInError').textContent=error.message;else message(error.message);
  }
 }});
 google.accounts.id.renderButton($('#concernGoogle'),{theme:'outline',size:'large',width:Math.max(200,Math.min(320,window.innerWidth-60))});
}
signin.querySelector('[data-dismiss]').onclick=()=>signin.close();
signin.addEventListener('close',()=>{actionAfterLogin=null});

const meta=item=>`<div class="concern-meta"><span class="concern-status">${esc(labels[item.status])}</span><span>${esc(age(item))}</span><span>${support(item)}</span></div>`;
function controls(item){
 const open=standing(item);
 return `<div class="concern-actions">${open&&!item.own?`<button type="button" class="secondary" data-upvote="${esc(item.concern_id)}" ${item.voted?'disabled':''}>${item.voted?'Upvoted':'Upvote'}</button>`:''}
 <button type="button" class="secondary" data-share="${esc(item.concern_id)}">Share concern</button>
 ${item.has_photo?`<button type="button" class="secondary" data-photo="${esc(item.concern_id)}">View photo</button>`:''}
 ${item.own?`<button type="button" class="concern-delete" data-delete-concern="${esc(item.concern_id)}">Delete my concern</button>`:''}</div>`;
}
function card(item){
 return `<article class="concern-card"><h2><a href="/concerns/?concern=${esc(item.concern_id)}">${esc(previewText(item.description))}</a></h2>
 ${meta(item)}${item.status==='collecting'?`<p class="concern-caption">${esc(deadline(item))}</p>`:''}${controls(item)}<div class="concern-photo" hidden></div></article>`;
}
const updates=items=>items.length?`<section><h2>Updates</h2>${items.map(item=>`<article class="concern-card"><strong>${esc(labels[item.status])} · ${esc(date(item.created_at))}</strong><p>${esc(item.note)}</p></article>`).join('')}</section>`:'';
function bind(items=[]){
 bindDeletes(items);
 main.querySelectorAll('[data-upvote]').forEach(button=>button.onclick=()=>act(button,async()=>{
  const vote=async()=>{
   const result=await request('/concerns/items/'+button.dataset.upvote+'/vote',{method:'POST',body:{}});
   message(result.status==='ready'&&result.upvotes===3?'Three upvotes! The concern is ready for council action.':'Your upvote has been recorded.');
   await load();
  };
  if(me)await vote();else signIn(vote);
 }));
 main.querySelectorAll('[data-share]').forEach(button=>button.onclick=()=>act(button,async()=>{
  const result=await shareConcern(button.dataset.share);if(result)message(result);
 }));
 main.querySelectorAll('[data-photo]').forEach(button=>button.onclick=()=>act(button,async()=>{
  const box=button.closest('article').querySelector('.concern-photo');box.hidden=false;button.hidden=true;
  await revealPhoto(box,'/concerns/items/'+button.dataset.photo+'/photo');
 }));
}
async function act(button,action){
 button.disabled=true;
 try{await action()}catch(error){message(error.message)}
 finally{if(button.isConnected)button.disabled=false}
}
async function load(){
 const version=++sequence;
 if(itemId){
  const item=await request('/concerns/items/'+encodeURIComponent(itemId));
  if(version!==sequence)return;
  loc=item.locality_id;me=item.signed_in;
  $('#concernLocality').textContent=item.locality_name;
  const pin=mapURL(item);
  main.innerHTML=`<p><a href="${esc(boardURL(loc,!!item.closed_at))}">← ${item.closed_at?'Past concerns':'Open concerns'}</a></p>
   <article class="concern-card"><h2>Concern</h2><p>${esc(item.description)}</p>${meta(item)}
   ${item.status==='collecting'?`<p>${item.upvotes===2?'One more to go! ':''}Think this would help your locality? Sign in and upvote.</p><p class="concern-caption">${esc(deadline(item))}</p>`:''}
   ${pin?`<p><a href="${esc(pin)}" target="_blank" rel="noopener">Open pin in Google Maps</a></p>`:''}
   ${controls(item)}<div class="concern-photo" hidden></div></article>${updates(item.updates||[])}`;
  bind([item]);return;
 }
 const query=new URLSearchParams({locality:loc,offset,...(archived?{archive:'1'}:{})});
 const data=await request('/concerns/board?'+query);
 if(version!==sequence)return;
 board=data;loc=data.locality.locality_id;me=data.signed_in;
 $('#concernLocality').textContent=data.locality.locality_name;
 const state=data.locality.state;
 const leaders=!data.archive&&!offset?data.items.slice(0,3):[];
 const otherItems=data.items.slice(leaders.length);
 const publicList=leaders.length
  ?`<section class="concern-leaders" aria-label="Most supported"><h2>Most supported</h2>${leaders.map(card).join('')}</section>${otherItems.map(card).join('')}`
  :otherItems.map(card).join('');

 main.innerHTML=`<div class="concern-toolbar"><h2>${data.archive?'Past concerns':'Open concerns'}</h2>
  ${state==='active'&&!data.archive?`<button type="button" class="primary" id="newConcern" ${data.open_concern?'disabled aria-describedby="concernSubmissionReason"':''}>Voice a concern</button>`:''}</div>
  ${data.open_concern?submissionNotice(data.open_concern):''}
  ${state==='paused'&&!data.archive?'<p>New submissions are temporarily paused. You can still upvote and follow updates.</p>':''}
  <div class="concern-actions">${state!=='inactive'?`<a href="${esc(boardURL(loc,!data.archive))}">${data.archive?'Open concerns':'Past concerns'}</a>`:''}
  ${me?'<button type="button" class="secondary" id="myConcerns">My concerns</button>':'<button type="button" class="secondary" id="concernLogin">Sign in</button>'}</div>
  ${publicList||`<p>${data.archive?'No past concerns yet.':'No open concerns yet.'}</p>`}
  <div class="concern-actions">${offset?'<button type="button" id="concernPrevious">Previous</button>':''}${data.more?'<button type="button" id="concernNext">More concerns</button>':''}</div>`;
 $('#newConcern')?.addEventListener('click',event=>act(event.currentTarget,()=>me?startConcern():signIn(async()=>{await load();await startConcern()})));
 $('#manageOpenConcern')?.addEventListener('click',event=>act(event.currentTarget,mine));
 $('#myConcerns')?.addEventListener('click',event=>act(event.currentTarget,mine));
 $('#concernLogin')?.addEventListener('click',()=>signIn());
 $('#concernPrevious')?.addEventListener('click',event=>act(event.currentTarget,async()=>{offset=Math.max(0,offset-30);await load();window.scrollTo(0,0)}));
 $('#concernNext')?.addEventListener('click',event=>act(event.currentTarget,async()=>{offset+=30;await load();window.scrollTo(0,0)}));
 bind(data.items);
}
async function mine(){
 const {items}=await request('/concerns/mine');
 main.innerHTML=`<div class="concern-toolbar"><h2>My concerns</h2><button class="secondary" type="button" id="backToConcerns">Back</button></div>
  ${items.map(item=>`<article class="concern-card"><h3>${esc(previewText(item.description))}</h3><p>${esc(item.locality_name)}</p>${meta(item)}
  ${item.moderation_note?`<p>${esc(item.moderation_note)}</p>`:''}
  ${!['pending','declined'].includes(item.status)?`<p><a href="/concerns/?concern=${esc(item.concern_id)}">View updates</a></p>`:''}
  <button type="button" class="concern-delete" data-delete-concern="${esc(item.concern_id)}">Delete my concern</button></article>`).join('')||'<p>You haven’t submitted any concerns.</p>'}`;
 bindDeletes(items);
 $('#backToConcerns').onclick=event=>act(event.currentTarget,load);
}


function submissionNotice(item){
 return `<section class="concern-notice" id="concernSubmissionReason" role="status" tabindex="-1">
  <strong>You already have an open concern in ${esc(item.locality_name)}.</strong>
  <p>You can have one open concern at a time, including one awaiting moderation. View or delete it in My concerns before submitting another.</p>
  <button type="button" class="secondary" id="manageOpenConcern">View or delete my concern</button></section>`;
}
function bindDeletes(items){
 main.querySelectorAll('[data-delete-concern]').forEach(button=>button.onclick=()=>{
  const item=items.find(item=>item.concern_id===button.dataset.deleteConcern);
  if(item)confirmDelete(item);
 });
}
function confirmDelete(item){
 const dialog=$('#concernDelete');
 if(dialog.open)return;
 dialog.innerHTML=`<h2 id="concernDeleteTitle">Delete your concern?</h2>
  <p>${esc(item.description)}</p><p><strong>This cannot be undone.</strong> The concern, its upvotes and council updates will be removed from Bag Day. Any attached photo will be removed from storage in the background.</p>
  <p>You can submit a new concern when you have no open concern and the locality is accepting submissions.</p>
  <p class="concern-notice concern-error" data-delete-error role="alert" tabindex="-1" hidden></p>
  <div class="concern-actions"><button type="button" class="secondary" data-keep-concern>Keep concern</button>
  <button type="button" class="concern-delete" data-confirm-delete>Delete concern</button></div>`;
 let deleting=false;
 const keep=dialog.querySelector('[data-keep-concern]'),confirm=dialog.querySelector('[data-confirm-delete]');
 keep.onclick=()=>{if(!deleting)dialog.close()};
 const cancel=event=>{if(deleting)event.preventDefault()};
 dialog.addEventListener('cancel',cancel);
 dialog.addEventListener('close',()=>dialog.removeEventListener('cancel',cancel),{once:true});
 confirm.onclick=async()=>{
  if(deleting)return;
  deleting=true;keep.disabled=true;confirm.disabled=true;confirm.textContent='Deleting…';
  try{
   await request('/concerns/items/'+encodeURIComponent(item.concern_id),{method:'DELETE'});
   dialog.close();
   if(itemId===item.concern_id){itemId=null;archived=false;offset=0;history.replaceState(null,'',boardURL(loc))}
   await load();message('Your concern has been deleted.');
  }catch(error){
   const notice=dialog.open?dialog.querySelector('[data-delete-error]'):$('#concernMessage');
   notice.textContent=error.message;notice.hidden=false;notice.focus();notice.scrollIntoView({block:'nearest'});
  }finally{deleting=false;keep.disabled=false;confirm.disabled=false;confirm.textContent='Delete concern'}
 };
 dialog.showModal();keep.focus();
}

async function startConcern(){
 if(checkingSubmission||compose.open||!board||board.locality.state!=='active')return;
 // Recheck immediately before building the form, including after sign-in and
 // when another tab may have submitted since this board was loaded.
 checkingSubmission=true;
 try{
  const eligibility=await request('/concerns/eligibility');
  if(!eligibility.can_submit){
   await load();
   const notice=$('#concernSubmissionReason');notice?.focus();notice?.scrollIntoView({block:'nearest'});
   return;
  }
 }catch(error){
  if(error.status===401){me=false;await load();signIn(async()=>{await load();await startConcern()});return}
  throw error;
 }finally{checkingSubmission=false}
 if(!board||board.locality.state!=='active')return;
 let photo=null,photoPreview='',submitting=false,confirmed=false;
 const concernId=crypto.randomUUID();
 compose.innerHTML=`<div class="concern-toolbar"><h2 id="concernComposeTitle">Voice a Concern</h2><button type="button" class="secondary" data-close>Close</button></div>
  <p>${esc(board.locality.locality_name)}</p><p class="concern-notice concern-error" data-form-message role="alert" tabindex="-1" hidden></p>
  <form class="concern-form"><label>What happened, and where?<textarea name="description" required maxlength="500" rows="4" placeholder="For example, broken streetlight outside number 14"></textarea></label>
  ${locationFields({},true)}
  ${board.photos_available?`<fieldset><legend>Photo (optional · one photo)</legend><div class="concern-actions">
    <button type="button" class="secondary" data-pick="camera">Take photo</button><button type="button" class="secondary" data-pick="gallery">Choose photo</button>
    <button type="button" class="secondary" data-remove hidden>Remove photo</button></div>
    <input type="file" accept="image/*" capture="environment" data-input="camera" hidden><input type="file" accept="image/*" data-input="gallery" hidden>
    <p data-photo-status aria-live="polite"></p><img class="concern-draft-photo" alt="Compressed photo preview" hidden></fieldset>`:''}
  <button type="submit" class="primary">Review concern</button></form>
  <section data-review hidden><h3>Review your concern</h3><div data-review-body></div>
  <div class="concern-actions"><button type="button" class="secondary" data-back>Back to edit</button><button type="button" class="primary" data-confirm>Confirm and submit</button></div></section>
  <section data-received hidden><h3>Submitted · Awaiting moderation</h3><p>Your concern is private until a moderator approves it.</p><p data-photo-failed hidden>Photo couldn’t be uploaded.</p>
  <button class="primary" type="button" data-done>Done</button></section>`;
 const select=s=>compose.querySelector(s),form=select('form'),review=select('[data-review]');
 const error=copy=>{const node=select('[data-form-message]');node.textContent=copy;node.hidden=!copy;if(copy){node.focus();node.scrollIntoView({block:'nearest'})}};
 const close=()=>{if(!submitting)compose.close()};
 select('[data-close]').onclick=close;
 select('[data-done]').onclick=()=>{close();load().catch(e=>message(e.message))};
 const cancel=event=>{if(submitting)event.preventDefault()};
 compose.addEventListener('cancel',cancel);
 compose.addEventListener('close',()=>{
  compose.removeEventListener('cancel',cancel);
  if(photoPreview)URL.revokeObjectURL(photoPreview);
 },{once:true});
 bindLocationFields(form,board.locality);
 const changePhoto=next=>{
  if(photoPreview)URL.revokeObjectURL(photoPreview);
  photo=next;
  photoPreview=next?URL.createObjectURL(next):'';
  const image=select('.concern-draft-photo');image.hidden=!photoPreview;
  if(photoPreview)image.src=photoPreview;else image.removeAttribute('src');
  select('[data-remove]').hidden=!photoPreview;
 };
 const photoControls=[...compose.querySelectorAll('[data-pick],[data-remove]')];
 for(const button of compose.querySelectorAll('[data-pick]')){
  const input=select('[data-input="'+button.dataset.pick+'"]');
  button.onclick=()=>input.click();
  input.onchange=async()=>{
   const file=input.files[0];input.value='';if(!file)return;
   const status=select('[data-photo-status]'),next=form.querySelector('[type="submit"]');
   const controls=[...photoControls,next];controls.forEach(el=>el.disabled=true);
   status.textContent='Preparing photo…';
   try{
    const compressed=await compressPhoto(file);
    if(!compose.open||!form.isConnected)return;
    changePhoto(compressed);status.textContent='Photo ready · '+(photo.size/1000).toFixed(1)+' KB';
   }catch{status.textContent='This photo couldn’t be prepared. Choose another or continue without it.'}
   finally{controls.forEach(el=>el.disabled=false)}
  };
 }
 select('[data-remove]')?.addEventListener('click',()=>{changePhoto(null);select('[data-photo-status]').textContent=''});
 form.onsubmit=event=>{
  event.preventDefault();
  if(!form.elements.description.value.trim()){error('Describe the concern and where it happened.');form.elements.description.focus();return}
  error('');const pin=mapURL(readLocationFields(form));
  select('[data-review-body]').innerHTML=`<p>${esc(form.elements.description.value.trim())}</p>
   ${pin?`<p><a href="${esc(pin)}" target="_blank" rel="noopener">Check map pin</a></p>`:''}
   ${photoPreview?`<img class="concern-draft-photo" src="${esc(photoPreview)}" alt="The compressed photo you are confirming"><p>You can’t change this photo after you submit. It stays private until a moderator approves it.</p>`:''}`;
  form.hidden=true;review.hidden=false;select('[data-back]').focus();
 };
 select('[data-back]').onclick=()=>{if(submitting||confirmed)return;error('');review.hidden=true;form.hidden=false;form.elements.description.focus()};
 select('[data-confirm]').onclick=async()=>{
  if(submitting||confirmed)return;
  submitting=true;error('');
  const buttons=[select('[data-confirm]'),select('[data-back]'),select('[data-close]')];
  buttons.forEach(b=>b.disabled=true);
  select('[data-confirm]').textContent='Submitting…';
  try{
   const {latitude,longitude}=readLocationFields(form);
   const result=await request('/concerns/submit',{method:'POST',body:{concern_id:concernId,locality_id:loc,
    description:form.elements.description.value.trim(),latitude,longitude,photo:!!photo}});
   confirmed=true;
   let accepted=result.photo_received;
   if(photo&&result.upload&&!accepted){
    let uploaded=false;
    try{uploaded=await sendPhoto(photo,result.upload)}catch{}
    try{
     const verified=await request('/concerns/items/'+concernId+'/photo',{method:'POST',body:{uploaded}});
     accepted=verified.photo_received;
    }catch{}
   }
   review.hidden=true;select('[data-received]').hidden=false;select('[data-photo-failed]').hidden=!photo||accepted;
   select('[data-done]').focus();
  }catch(e){
   if(e.code==='OPEN_CONCERN_EXISTS'){
    compose.close();await load();
    const notice=$('#concernSubmissionReason');notice?.focus();notice?.scrollIntoView({block:'nearest'});
   }else error(e.message);
  }
  finally{submitting=false;buttons.forEach(b=>b.disabled=false);select('[data-confirm]').textContent='Confirm and submit'}
 };
 compose.showModal();form.elements.description.focus();
}

load().catch(error=>{main.textContent='';message(error.message)});

import {age,boardURL,date,daysLeft,esc,labels,previewText,request,revealPhoto,shareConcern,standing,support,voteAgainIn} from './shared.mjs?v=1.1.177';
import {bindLocationFields,locationFields,readLocationFields} from '../noticeboard/map-picker.mjs?v=1.1.177';
import {mapURL} from '../noticeboard/locations.mjs?v=1.1.177';
import {compressPhoto,sendPhoto} from './photo.mjs?v=1.1.177';

const $=selector=>document.querySelector(selector);
const main=$('#concernMain'),compose=$('#concernCompose'),signin=$('#concernSignIn');
const params=new URLSearchParams(location.search);
let loc=params.get('locality'),itemId=params.get('concern'),archived=params.get('archive')==='1',offset=0,justMyConcern=false;
let activeView=archived?'past':'open',detailId=null,detailSequence=0;
let board=null,me=false,actionAfterLogin=null,googleTask=null,sequence=0,checkingSubmission=false;
try{loc ||= localStorage.getItem('bag-day-locality-v1')||'Żejtun'}catch{loc ||= 'Żejtun'}

const visitKey='bag-day-concerns-visit-v1';
let restoreScroll=null;
try{
 const saved=JSON.parse(sessionStorage.getItem(visitKey)||'null');
 if(saved&&!itemId&&!params.has('archive')&&(saved.loc===loc||(!params.has('locality')&&saved.home===localStorage.getItem('bag-day-locality-v1')))){
  loc=saved.loc;activeView=saved.view==='past'?'past':'open';archived=activeView==='past';offset=saved.offset||0;justMyConcern=!!saved.mine;restoreScroll=saved.scroll||0;
 }
}catch{}
function saveConcernVisit(){try{sessionStorage.setItem(visitKey,JSON.stringify({home:localStorage.getItem('bag-day-locality-v1'),loc,view:activeView,offset,mine:justMyConcern,scroll:window.scrollY}))}catch{}}
window.addEventListener('pagehide',saveConcernVisit);
window.addEventListener('bag-day-save-section',saveConcernVisit);
function message(copy){
 const detail=$('#concernDetail');let node=detail?.open?detail.querySelector('[data-detail-message]'):null;if(detail?.open&&!node){node=document.createElement('p');node.dataset.detailMessage='';node.className='concern-notice';node.setAttribute('role','status');detail.append(node)}node ||= $('#concernMessage');node.textContent=copy;node.hidden=!copy;if(copy){node.focus();node.scrollIntoView({block:'nearest'})}
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
   me=true;window.BAG_DAY_PUBLIC_ACCOUNT?.refresh();const next=actionAfterLogin;actionAfterLogin=null;signin.close();message('');
   if(next)await next();else await load();
  }catch(error){
   if(signin.open)$('#concernSignInError').textContent=error.message;else message(error.message);
  }
 }});
 google.accounts.id.renderButton($('#concernGoogle'),{theme:'outline',size:'large',width:Math.max(200,Math.min(320,window.innerWidth-60))});
}
signin.querySelector('[data-dismiss]').onclick=()=>signin.close();
signin.addEventListener('close',()=>{actionAfterLogin=null});

function detailFacts(item){
 const closed=Boolean(item.closed_at),left=daysLeft(item);
 const expiry=left<=0?'Today':left===1?'1 day':left+' days';
 return `<dl class="detail-facts">
 <div><dt class="detail-votes-label">Votes <button type="button" class="concern-info-button" data-concern-help="votes" ${helpContext(item)} aria-label="About votes">i</button></dt><dd>${esc(String(item.upvotes??0))}</dd></div>
 <div><dt>Submitted on</dt><dd>${esc(formatDay(item.submitted_at))}</dd></div>
 <div><dt>${closed?'Closed on':`Expires in <button type="button" class="concern-info-button" data-concern-help="expiry" ${helpContext(item)} aria-label="About expiry">i</button>`}</dt><dd class="${!closed&&left<=3?'concern-expiry-urgent':''}">${esc(closed?formatDay(item.closed_at):expiry)}</dd></div></dl>`;
}
function concernLocality(item){return item.locality_name||board?.locality?.locality_name||'this locality'}
function helpContext(item){return `data-help-own="${item.own?'1':'0'}" data-help-locality="${esc(concernLocality(item))}"`}
function votingEligibility(locality){return `To vote, sign in and have ${locality} selected as your home locality in Settings. Simply opening this locality’s concerns does not change your home locality.`}
function ownConcernCopy(locality){return `You cannot vote for your own concern. Share this concern with other people in ${locality} so they can upvote it. They must have ${locality} selected as their home locality to vote.`}
const helpCopy={
 expiry:'Each new vote resets the expiry countdown to 30 days. Eligible users can vote once every 24 hours.',
 votes:'Shows how many votes this concern has received. Eligible users can vote once every 24 hours.',
 pin:'Choose a map pin to show the council exactly where the issue is.'
};
function helpParagraphs(key,item){
 if(key==='pin')return [helpCopy.pin];
 if(!helpCopy[key])return [];
 const locality=concernLocality(item);
 return [helpCopy[key],votingEligibility(locality),...(item.own?[ownConcernCopy(locality)]:[])];
}
document.addEventListener('click',event=>{
 const trigger=event.target.closest('[data-concern-help]');if(!trigger)return;
 const dialog=$('#concernHelp'),key=trigger.dataset.concernHelp;
 if(!helpCopy[key]||!dialog)return;
 const paragraphs=helpParagraphs(key,{own:trigger.dataset.helpOwn==='1',locality_name:trigger.dataset.helpLocality});
 dialog.innerHTML=`<div class="concern-toolbar"><h2 id="concernHelpTitle">${key==='expiry'?'Expiry countdown':key==='votes'?'Vote count':'Location pin'}</h2><button type="button" class="detail-x" data-close-help aria-label="Close">×</button></div>${paragraphs.map(copy=>`<p>${esc(copy)}</p>`).join('')}`;
 dialog.querySelector('[data-close-help]').onclick=()=>dialog.close();dialog.showModal();
});
function formatDay(value){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Malta',day:'2-digit',month:'short',year:'numeric'}).formatToParts(new Date(value));
 const part=type=>parts.find(item=>item.type===type)?.value||'';
 return `${part('day')}-${part('month')}-${part('year')}`;
}
function voteButton(item){
 const selected=Boolean(item.voted);
 return `<button type="button" class="concern-vote-button vote-toggle" aria-pressed="${selected}" data-upvote="${esc(item.concern_id)}" data-vote-time="${selected?esc(item.my_vote_at):''}"><span aria-hidden="true">${selected?'✓':'👍'}</span> ${selected?'Undo vote':'Vote'}</button>`;
}
function card(item,past=false){
 const count=Math.max(0,Number(item.upvotes)||0),remaining=daysLeft(item),wait=item.voted?voteAgainIn(item):'';
 const photo=item.photo_url?`<a class="concern-thumb-link" href="/concerns/?concern=${esc(item.concern_id)}" aria-label="Open concern details"><img src="${esc(item.photo_url)}" alt="" loading="lazy" decoding="async"></a>`:'';
 const action=past?'':item.own?`<a class="concern-own-badge" href="/concerns/?concern=${esc(item.concern_id)}">My concern</a>`:voteButton(item);
 const expiryText=remaining<=0?'Expires today':`Expires in ${remaining} day${remaining===1?'':'s'}`;
 const expiry=past?`<p class="concern-closed-date">${"Closed on "+esc(formatDay(item.closed_at))}</p>`:`<p class="concern-expiry${remaining<=3?' concern-expiry-urgent':''}"><span>${esc(expiryText)}</span><button type="button" class="concern-info-button" data-concern-help="expiry" ${helpContext(item)} aria-label="About the expiry countdown">i</button></p>`;
 return `<article class="concern-card concern-list-card${photo?' has-photo':''}">${photo}<div class="concern-list-copy"><h3><a href="/concerns/?concern=${esc(item.concern_id)}">${esc(previewText(item.description))}</a></h3>${expiry}</div><div class="concern-support"><span class="concern-vote-count"><strong>${count} ${count===1?'vote':'votes'}</strong><button type="button" class="concern-info-button" data-concern-help="votes" ${helpContext(item)} aria-label="About the vote count">i</button></span>${action}</div></article>`;
}
function controls(item){
 const open=standing(item)&&!item.archived_at&&!item.closed_at;
 const wait=item.voted?voteAgainIn(item):'';
 return `${item.own?`<p class="concern-caption concern-owner-message">${esc(ownConcernCopy(concernLocality(item)))}</p>`:open?`<p class="concern-caption">${esc(votingEligibility(concernLocality(item)))}</p>`:''}<div class="detail-actions">${open&&!item.own?voteButton(item):''}
 <button type="button" class="secondary" data-share="${esc(item.concern_id)}">${item.own?'Share Concern':'Share'}</button>
 ${item.has_photo||item.own_photo?`<button type="button" class="secondary" data-photo="${esc(item.concern_id)}">Photo</button>`:''}
 ${item.own&&item.status!=='completed'?`<button type="button" class="concern-delete" data-delete-concern="${esc(item.concern_id)}" aria-label="Delete my concern">Delete</button>`:''}</div>`;
}
const updates=items=>items.length?`<section><h2>Council updates</h2>${items.map(item=>`<article class="concern-card"><strong>${esc(labels[item.status])} · ${esc(date(item.created_at))}</strong><p>${esc(item.note)}</p></article>`).join('')}</section>`:'';
function bind(items=[],scope=main){
 bindDeletes(items,scope);
 scope.querySelectorAll('a[href*="?concern="]').forEach(link=>link.onclick=event=>{event.preventDefault();const id=new URL(link.href,location.origin).searchParams.get('concern');act(link,()=>openDetail(id))});
 scope.querySelectorAll('[data-upvote]').forEach(button=>button.onclick=()=>act(button,async()=>{
  const vote=async()=>{
   const previous=button.dataset.voteTime;
   const result=await request('/concerns/items/'+button.dataset.upvote+'/vote',previous?
    {method:'DELETE',body:{voted_at:previous}}:{method:'POST',body:{}});
   await load();if(detailId&&$('#concernDetail')?.open)await openDetail(detailId);
   const feedback=previous?(result.removed?'Vote removed.':'Vote status refreshed.'):'Vote added.';
   document.querySelector('#voteFeedback').textContent=feedback;

  };
  if(me)await vote();else signIn(vote);
 }));
 scope.querySelectorAll('[data-share]').forEach(button=>button.onclick=()=>act(button,async()=>{
  const result=await shareConcern(button.dataset.share);if(result)message(result);
 }));
 scope.querySelectorAll('[data-photo]').forEach(button=>button.onclick=()=>act(button,async()=>{
  const box=button.closest('article').querySelector('.concern-photo');box.hidden=false;button.hidden=true;
  const loaded=await revealPhoto(box,'/concerns/items/'+button.dataset.photo+'/photo');
  if(!loaded){button.hidden=false;button.textContent='Retry photo'}
 }));
}
async function act(button,action){
 button.disabled=true;
 try{await action()}catch(error){message(error.message)}
 finally{if(button.isConnected)button.disabled=false}
}
let sponsorLocality=null;
function showConcernSponsors(name){
 sponsorLocality=name;
 if(!window.BAG_DAY_SPONSORS)return;
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Malta',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const part=type=>parts.find(p=>p.type===type).value;
 window.BAG_DAY_SPONSORS.render(name,new Date(part('year')+'-'+part('month')+'-'+part('day')+'T00:00:00Z'));
}
function sizeConcernDock(){
 const dock=$('#sponsorDock'),panel=$('#sponsorPanel');if(!dock||!panel)return;
 dock.hidden=panel.hidden;
 document.documentElement.style.setProperty('--noticeboard-dock-height',dock.hidden?'0px':dock.getBoundingClientRect().height+'px');
}
window.addEventListener('bag-day-sponsors-ready',()=>{if(sponsorLocality)showConcernSponsors(sponsorLocality);sizeConcernDock()});
window.addEventListener('resize',sizeConcernDock);
const dock=$('#sponsorDock'),sponsorPanel=$('#sponsorPanel');
if(dock&&sponsorPanel){
 new MutationObserver(sizeConcernDock).observe(sponsorPanel,{attributes:true,attributeFilter:['hidden'],childList:true});
 if(window.ResizeObserver)new ResizeObserver(sizeConcernDock).observe(dock);
 sizeConcernDock();
}
function updateTabs(){
 document.querySelectorAll('[data-concern-tab]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.concernTab===activeView)));
}
async function switchView(view){
 activeView=view;archived=view==='past';offset=0;sequence++;
 await load();
}
document.querySelectorAll('[data-concern-tab]').forEach(button=>button.onclick=()=>act(button,()=>switchView(button.dataset.concernTab)));
const concernParent=document.querySelector('.concern-parent');
const concernViews=['open','past'];
let concernSwipe=null,concernSettling=false,suppressConcernClickTarget=null;
const concernMotionReduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function clearConcernDrag(){concernSwipe=null;main.style.transition='';main.style.transform='';main.style.opacity='';}
concernParent?.addEventListener('touchstart',event=>{
 clearConcernDrag();
 if(concernSettling||event.touches.length!==1||$('#concernDetail')?.open||compose.open||signin.open||!event.target.closest('.concern-parent')||event.target.closest('input,select,textarea,summary,a,[data-concern-help],[data-upvote],[data-share],[data-photo],[data-delete-concern],#newConcern,#concernNext,#concernPrevious'))return;
 const touch=event.touches[0];concernSwipe={x:touch.clientX,y:touch.clientY,dx:0,dy:0,axis:null,target:event.target};
},{passive:true});
concernParent?.addEventListener('touchmove',event=>{
 if(!concernSwipe||concernSettling||event.touches.length!==1){clearConcernDrag();return}
 const touch=event.touches[0],gesture=concernSwipe;gesture.dx=touch.clientX-gesture.x;gesture.dy=touch.clientY-gesture.y;
 if(!gesture.axis&&Math.max(Math.abs(gesture.dx),Math.abs(gesture.dy))>8)gesture.axis=Math.abs(gesture.dx)>Math.abs(gesture.dy)*1.5?'x':'y';
 if(gesture.axis!=='x')return;
 if(event.cancelable)event.preventDefault();
 const next=concernViews.indexOf(activeView)+(gesture.dx<0?1:-1),edge=next<0||next>=concernViews.length;
 if(concernMotionReduced())return;
 main.style.transition='none';main.style.transform=`translateX(${Math.max(-160,Math.min(160,gesture.dx*(edge?.2:.65)))}px)`;
},{passive:false});
concernParent?.addEventListener('touchend',async event=>{
 const gesture=concernSwipe;concernSwipe=null;
 if(!gesture||event.touches.length||concernSettling){clearConcernDrag();return}
 if(gesture.axis!=='x'){clearConcernDrag();return}
 const next=concernViews.indexOf(activeView)+(gesture.dx<0?1:-1);
 if(Math.abs(gesture.dx)<55||next<0||next>=concernViews.length){
  if(!concernMotionReduced()){main.style.transition='transform 150ms ease-out, opacity 150ms ease-out';main.style.transform='translateX(0)'}
  setTimeout(clearConcernDrag,160);return;
 }
 suppressConcernClickTarget=gesture.target;
 setTimeout(()=>{if(suppressConcernClickTarget===gesture.target)suppressConcernClickTarget=null},500);
 concernSettling=true;
 try{
  if(!concernMotionReduced()){main.style.transition='transform 120ms ease-out, opacity 120ms ease-out';main.style.transform=`translateX(${gesture.dx<0?-160:160}px)`;main.style.opacity='0';await new Promise(resolve=>setTimeout(resolve,120))}
  main.style.transition='';main.style.transform='';main.style.opacity='';
  await switchView(concernViews[next]);
 }finally{clearConcernDrag();concernSettling=false}
},{passive:true});
concernParent?.addEventListener('touchcancel',clearConcernDrag,{passive:true});
window.addEventListener('bag-day-gesture-cancel',clearConcernDrag);
concernParent?.addEventListener('click',event=>{if(suppressConcernClickTarget&&(event.target===suppressConcernClickTarget||suppressConcernClickTarget.contains?.(event.target))){suppressConcernClickTarget=null;event.preventDefault();event.stopPropagation()}},true);
async function openDetail(id,provided){
 const dialog=$('#concernDetail');if(!dialog)return;
 const current=++detailSequence;
 const item=provided||await request('/concerns/items/'+encodeURIComponent(id));
 if(current!==detailSequence)return;
 detailId=id;const pin=mapURL(item);
 dialog.innerHTML=`<div class="concern-toolbar"><h2>Concern details</h2><button type="button" class="detail-x" data-close-detail aria-label="Close">×</button></div>
 <article><div class="detail-place"><strong>${esc(item.locality_name)}</strong>${pin?`<a class="detail-pin" href="${esc(pin)}" target="_blank" rel="noopener noreferrer" title="View in Google Maps (new tab)" aria-label="View location in Google Maps (new tab)"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 10c0 4-6 10-6 10s-6-6-6-10a6 6 0 1 1 12 0Z"/><circle cx="12" cy="10" r="2"/></svg></a>`:''}</div>
 <p class="detail-description">${esc(item.description)}</p>${detailFacts(item)}
 ${!item.closed_at&&!item.archived_at&&daysLeft(item)<=3?`<p class="detail-warning">Share this concern with people in ${esc(concernLocality(item))} who have it selected as their home locality so they can vote. Each new vote resets the countdown to 30 days.</p>`:''}
 ${item.own_photo&&item.photo_pending?'<small>Photo awaiting council approval.</small>':''}
 ${controls(item)}<div class="concern-photo" hidden></div></article>${updates(item.updates||[])}`;
 const mapLink=dialog.querySelector('.detail-pin');
 if(mapLink)mapLink.onclick=event=>{
  if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  const page=window.open('about:blank','_blank');
  if(page){page.opener=null;page.location.replace(mapLink.href);event.preventDefault()}
 };
 dialog.querySelector('[data-close-detail]').onclick=()=>dialog.close();dialog.onclose=()=>{detailSequence++;detailId=null};bind([item],dialog);
 if(!dialog.open)dialog.showModal();
}
async function load(){
 const version=++sequence;
 if(itemId){
  const id=itemId;itemId=null;
  const item=await request('/concerns/items/'+encodeURIComponent(id));
  loc=item.locality_id;archived=!!item.closed_at;activeView=archived?'past':'open';
  history.replaceState(history.state,'',boardURL(loc,archived));
  await load();await openDetail(id,item);return;
 }
 updateTabs();
 const query=new URLSearchParams({locality:loc,offset,...(archived?{archive:'1'}:{}),...(justMyConcern?{mine:'1'}:{})});
 const data=await request('/concerns/board?'+query);
 if(version!==sequence)return;
 board=data;loc=data.locality.locality_id;me=data.signed_in;
 $('#concernLocality').textContent=data.locality.locality_name+' · Your community, your voice';
 showConcernSponsors(data.locality.locality_name);
 const state=data.locality.state;
 const publicList=data.items.map(item=>card(item,Boolean(data.archive))).join('');
 const hasItems=data.items.length>0;
 const showFilter=!data.archive||hasItems||justMyConcern||offset>0;
 const ownerId=data.open_concern?.concern_id;
 const showAction=!data.archive&&(ownerId||state==='active');
 main.innerHTML=`<div class="concern-toolbar concern-list-heading"><h2>Concerns of ${esc(data.locality.locality_name)}</h2>
  ${showAction?`<button type="button" class="primary" id="newConcern">${ownerId?'View my concern':'Voice a concern'}</button>`:''}</div>
  ${showFilter?`<label class="concern-mine-filter"><input type="checkbox" id="concernMineFilter" ${justMyConcern?'checked':''}> <span>Show just my concern</span></label>`:''}
  ${state==='paused'&&!data.archive?'<p class="concern-caption">New submissions are temporarily paused. You can still vote and follow updates.</p>':''}
  ${publicList||`<p>${justMyConcern?'You have no concerns in this list.':data.archive?'No Concerns closed in last 30 days.':'No concerns in progress yet.'}</p>`}
  <div class="concern-actions">${offset?'<button type="button" id="concernPrevious">Previous</button>':''}${data.more?'<button type="button" id="concernNext">More concerns</button>':''}</div>
  ${data.archive&&hasItems?'<p class="concern-past-note">Only successfully closed concerns show here.</p>':''}`;
 $('#newConcern')?.addEventListener('click',event=>act(event.currentTarget,()=>ownerId?openDetail(ownerId):me?startConcern():signIn(async()=>{await load();await startConcern()})));
 const mineFilter=$('#concernMineFilter');mineFilter?.addEventListener('change',event=>{
  const enabled=event.currentTarget.checked;offset=0;
  if(enabled&&!me){event.currentTarget.checked=false;signIn(async()=>{justMyConcern=true;await load()});return}
  justMyConcern=enabled;load().catch(error=>message(error.message));
 });
 $('#concernLogin')?.addEventListener('click',()=>signIn());
 $('#concernPrevious')?.addEventListener('click',event=>act(event.currentTarget,async()=>{offset=Math.max(0,offset-30);await load();window.scrollTo(0,0)}));
 $('#concernNext')?.addEventListener('click',event=>act(event.currentTarget,async()=>{offset+=30;await load();window.scrollTo(0,0)}));
 bind(data.items);
 if(restoreScroll!==null){const top=restoreScroll;restoreScroll=null;requestAnimationFrame(()=>window.scrollTo(0,top))}
}
function bindDeletes(items,scope=main){
 scope.querySelectorAll('[data-delete-concern]').forEach(button=>button.onclick=()=>{
  const item=items.find(item=>item.concern_id===button.dataset.deleteConcern);
  if(item)confirmDelete(item);
 });
}
function confirmDelete(item){
 const dialog=$('#concernDelete');
 if(dialog.open)return;
 dialog.innerHTML=`<h2 id="concernDeleteTitle">Delete your concern?</h2>
  <p><strong>Are you sure?</strong> The concern’s text, photo and all upvotes will be permanently deleted. This cannot be undone. No email will be sent.</p>
  <p>You can then start again and submit a new concern if the locality is accepting submissions.</p>
  <p class="concern-notice concern-error" data-delete-error role="alert" tabindex="-1" hidden></p>
  <div class="concern-actions"><button type="button" class="secondary" data-keep-concern>Keep concern</button>
  <button type="button" class="concern-delete" data-confirm-delete>Delete concern</button></div>`;
 let deleting=false;
 dialog.bagDayCanClose=()=>!deleting;
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
   dialog.close();if($('#concernDetail')?.open)$('#concernDetail').close();
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
 compose.innerHTML=`<div class="concern-toolbar"><h2 id="concernComposeTitle">Voice a Concern</h2><button type="button" class="detail-x" data-close aria-label="Close">×</button></div>
  <p class="concern-locality">${esc(board.locality.locality_name)}</p><ol class="concern-steps"><li data-step="write" aria-current="step">1 Write</li><li data-step="review">2 Review</li></ol><p class="concern-notice concern-error" data-form-message role="alert" tabindex="-1" hidden></p>
  <form class="concern-form"><label>What happened, and where?<textarea name="description" required maxlength="500" rows="4" placeholder="For example, broken streetlight outside number 14"></textarea><span class="concern-counter" data-counter>0 / 500</span></label>
  ${locationFields({},true)}
  ${board.photos_available?`<fieldset><legend>Photo · Optional · one photo</legend><div class="concern-actions">
    <button type="button" class="secondary" data-pick="camera">Take photo</button><button type="button" class="secondary" data-pick="gallery">Choose photo</button>
    <button type="button" class="secondary" data-remove hidden>Remove photo</button></div>
    <input type="file" accept="image/*" capture="environment" data-input="camera" hidden><input type="file" accept="image/*" data-input="gallery" hidden>
    <p data-photo-status aria-live="polite"></p><img class="concern-draft-photo" alt="Compressed photo preview" hidden></fieldset>`:''}
  <button type="submit" class="primary">Review concern</button></form>
  <section data-review hidden><h3>Check your concern</h3><div data-review-body></div>
  <div class="concern-actions"><button type="button" class="secondary" data-back>Back to edit</button><button type="button" class="primary" data-confirm>Confirm and submit</button></div></section>
  <section data-received hidden><h3>Concern submitted</h3><p>Your concern is now visible to the community. Share it with other people in ${esc(board.locality.locality_name)} so they can upvote it. They must have ${esc(board.locality.locality_name)} selected as their home locality to vote.</p><p data-photo-pending hidden>Your photo is visible only to you until the council approves it.</p><p data-photo-failed hidden>Your concern was submitted, but the photo could not be uploaded.</p>
  <button class="primary" type="button" data-done>Done</button></section>`;
 const select=s=>compose.querySelector(s),form=select('form'),review=select('[data-review]');
 const error=copy=>{const node=select('[data-form-message]');node.textContent=copy;node.hidden=!copy;if(copy){node.focus();node.scrollIntoView({block:'nearest'})}};
 const dirty=()=>!!(form.elements.description.value.trim()||photo||form.elements.latitude.value||form.elements.longitude.value);
 compose.bagDayCanClose=()=>!submitting&&(confirmed||!dirty()||window.confirm('Discard your unfinished concern? Your text, photo and map pin will be lost.'));
 const close=()=>{if(compose.bagDayCanClose())compose.close()};
 select('[data-close]').onclick=close;
 select('[data-done]').onclick=()=>{close();load().catch(e=>message(e.message))};
 const cancel=event=>{event.preventDefault();close()};
 compose.addEventListener('cancel',cancel);
 compose.addEventListener('close',()=>{
  compose.removeEventListener('cancel',cancel);
  if(photoPreview)URL.revokeObjectURL(photoPreview);
 },{once:true});
 bindLocationFields(form,board.locality);
 const pinHelp=document.createElement('button');pinHelp.type='button';pinHelp.className='concern-info-button';pinHelp.dataset.concernHelp='pin';pinHelp.setAttribute('aria-label','About the location pin');pinHelp.textContent='i';
 form.querySelector('#chooseMapPin')?.insertAdjacentElement('afterend',pinHelp);
 form.elements.description.addEventListener('input',()=>{select('[data-counter]').textContent=form.elements.description.value.length+' / 500'});
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
    changePhoto(compressed);status.textContent='Photo ready';
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
   ${photoPreview?`<img class="concern-draft-photo" src="${esc(photoPreview)}" alt="The compressed photo you are confirming"><p>Your concern will be public immediately. The photo will be visible only to you until the council approves it.</p>`:''}`;
  select('[data-step=write]').removeAttribute('aria-current');select('[data-step=review]').setAttribute('aria-current','step');form.hidden=true;review.hidden=false;select('[data-back]').focus();
 };
 select('[data-back]').onclick=()=>{if(submitting||confirmed)return;error('');select('[data-step=review]').removeAttribute('aria-current');select('[data-step=write]').setAttribute('aria-current','step');review.hidden=true;form.hidden=false;form.elements.description.focus()};
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
   review.hidden=true;select('[data-received]').hidden=false;select('[data-photo-failed]').hidden=!photo||accepted;select('[data-photo-pending]').hidden=!photo||!accepted;
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

window.addEventListener('bag-day-account-changed',event=>{me=event.detail.signed_in;if(!me){activeView='open';archived=false;justMyConcern=false;$('#concernDetail')?.close();compose.close();signin.close()}load().catch(error=>message(error.message))});
load().catch(error=>{main.textContent='';message(error.message)});

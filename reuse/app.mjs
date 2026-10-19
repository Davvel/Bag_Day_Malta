import {request,esc} from './client.mjs';
import {ageLabel,postedDate,newestFirst} from './item-dates.mjs?v=1.1.8';
import {detectLocality,matchLocality} from './location.mjs?v=1.1.8';
const $=s=>document.querySelector(s),content=$('#content'),loginDialog=$('#signinDialog'),itemDialog=$('#itemDialog'),detailsDialog=$('#detailsDialog');
let localities=[],me=null,view='browse',locality='',preferredLocality='',allLocalities=false,page=0,loading=false,afterLogin=null,feedRequest=0,selectionRevision=0,locationHint='';
const contactCache=new Map(),revealing=new Set();let currentDetail=null,sponsorKey='';
const hasPhone=item=>!!(item.has_phone??(item.contact_mode==='PHONE'));
const publicURL=value=>{try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:null}catch{return null}};
const track=(name,params={})=>window.BAG_DAY_ANALYTICS?.event(name,params);
const contactStats=item=>({has_phone:item.contact_phone?1:0,has_url:item.external_url?1:0,contact_type:item.contact_phone?(item.external_url?'both':'phone'):'url'});
const failed=(operation,e)=>track('reuse_action_error',{operation,status_code:Number(e.status)||0});
const date=s=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Malta',day:'numeric',month:'short',year:'numeric'}).format(new Date(s));
const choices=(selected='')=>localities.map(l=>`<option value="${esc(l.locality_id)}" ${l.locality_id===selected?'selected':''}>${esc(l.name)}</option>`).join('');
function message(s){$('#message').textContent=s;$('#message').hidden=!s;const detail=detailsDialog.querySelector('#detailError');if(detailsDialog.open&&detail){detail.textContent=s;detail.hidden=!s}}
function account(){const signed=!!me;if(!signed)contactCache.clear();$('#signin').hidden=signed;$('#signout').hidden=!signed;$('#mineTab').hidden=!signed;$('#mineTab').textContent='My items'}
function tabs(){for(const [id,v] of [['browseTab','browse'],['mineTab','mine']])v===view?$('#'+id).setAttribute('aria-current','page'):$('#'+id).removeAttribute('aria-current')}
async function run(fn,button){if(loading)return;loading=true;if(button)button.disabled=true;try{await fn()}catch(e){if(e.status===401){me=null;account()}message(e.message)}finally{loading=false;if(button?.isConnected)button.disabled=false}}
async function refreshMe(){try{me=await request('/reuse/me')}catch(e){if(e.status===401)me=null;else throw e}account()}
async function signIn(next){track('reuse_signin_open');afterLogin=next;$('#signinError').hidden=true;$('#googleButton').replaceChildren();loginDialog.showModal();
 try{
  const config=await request('/auth/public/config');
  if(!window.google?.accounts){await new Promise((resolve,reject)=>{const old=$('#gsi-script');if(old)old.remove();const s=document.createElement('script');s.id='gsi-script';s.src='https://accounts.google.com/gsi/client';s.async=true;s.onload=resolve;s.onerror=()=>reject(Error('Google sign-in could not load. Please try again.'));document.head.append(s)})}
  google.accounts.id.initialize({client_id:config.google_client_id,nonce:config.nonce,callback:async r=>{
   try{await request('/auth/public/google',{method:'POST',body:{credential:r.credential}});await refreshMe();track('reuse_signin_success');loginDialog.close();const next=afterLogin;afterLogin=null;message('');if(next)await next()}catch(e){failed('signin',e);$('#signinError').textContent=e.message;$('#signinError').hidden=false}
  }});
  google.accounts.id.renderButton($('#googleButton'),{theme:'outline',size:'large',width:Math.min(320,window.innerWidth-96)});
 }catch(e){failed('signin',e);$('#signinError').textContent=e.message;$('#signinError').hidden=false}
}
async function needLogin(next){if(!me)return signIn(next);return next()}
function showLocationHint(){const hint=$('#locationHint');if(hint){hint.textContent=locationHint;hint.hidden=allLocalities}}
function reloadFeed(){page=0;$('#prev').hidden=true;$('#next').hidden=true;feed().catch(e=>message(e.message))}
async function browse(){view='browse';tabs();content.innerHTML=`<div class="locality-filters"><label id="localityChoice" ${allLocalities?'hidden':''}><span>Collection locality</span><select id="browseLocality" aria-label="Collection locality" aria-describedby="locationHint">${locality?'':'<option value="" selected disabled>Choose a locality</option>'}${choices(locality)}</select></label><label class="check all-localities"><input id="allLocalities" type="checkbox" ${allLocalities?'checked':''}><span>All localities</span></label></div><p id="locationHint" class="locality-context" role="status"></p><p id="feedSummary" role="status"></p><div id="feed" class="item-list"></div><div class="pagination"><button id="prev" class="quiet" ${page?'':'hidden'}>← Previous</button><button id="next" class="quiet" hidden>More items →</button></div>`;
 showLocationHint();
 $('#browseLocality').onchange=e=>{track('reuse_filter_changed',{search_scope:'locality'});selectionRevision++;locality=e.target.value;allLocalities=false;$('#allLocalities').checked=false;locationHint='';showLocationHint();reloadFeed()};
 $('#allLocalities').onchange=e=>{track('reuse_filter_changed',{search_scope:e.target.checked?'all':'locality'});selectionRevision++;allLocalities=e.target.checked;$('#localityChoice').hidden=allLocalities;showLocationHint();reloadFeed()};
 $('#prev').onclick=()=>run(async()=>{page=Math.max(0,page-1);await browse();$('#reuseScroll').scrollTop=0});$('#next').onclick=()=>run(async()=>{page++;await browse();$('#reuseScroll').scrollTop=0});await feed();
}
function renderSponsors(){
 const chosen=localities.find(l=>l.locality_id===(preferredLocality||locality));if(!chosen||!window.BAG_DAY_SPONSORS)return;
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Malta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const key=chosen.name+'|'+day;if(key===sponsorKey)return;sponsorKey=key;
 window.BAG_DAY_SPONSORS.render(chosen.name,new Date(day+'T00:00:00Z'));
}
async function defaultToGps(){
 const revision=selectionRevision;
 const detected=await detectLocality(localities,window.WASTE_DATA?.localities||[]);
 if(detected)preferredLocality=detected.locality_id;renderSponsors();
 if(selectionRevision!==revision)return;
 locationHint=detected?'Using your GPS locality.':locality?'GPS unavailable. Using your saved locality.':'GPS unavailable. Choose a locality or tick All localities.';
 if(detected&&locality!==detected.locality_id){locality=detected.locality_id;page=0;if(view==='browse')await browse()}
 else if(view==='browse')showLocationHint();
}
async function feed(){
 const target=$('#feed'),requestNumber=++feedRequest,selected=allLocalities?'':locality,pageNumber=page;if(!localities.length){target.innerHTML='<p class="empty">No localities are available yet.</p>';return}
 if(!allLocalities&&!selected){target.innerHTML='<p class="empty">Choose a collection locality or tick All localities to see free items.</p>';$('#feedSummary').textContent='';$('#next').hidden=true;return}
 target.innerHTML='<p class="muted">Looking for a second life…</p>';
 $('#next').hidden=true;
 const query=new URLSearchParams({limit:'20',offset:String(pageNumber*20)});if(selected)query.set('locality_id',selected);
 const data=await request('/public/reuse/items?'+query);if(view!=='browse'||requestNumber!==feedRequest||!target.isConnected)return;
 const items=newestFirst(data.items.filter(i=>Date.parse(i.delete_at)>Date.now()));
 track('reuse_search',{search_scope:selected?'locality':'all',result_count:items.length,page_index:pageNumber});
 const area=selected?(localities.find(l=>l.locality_id===selected)?.name||'this locality'):'all localities';
 $('#feedSummary').textContent=items.length?`${items.length} free ${items.length===1?'item':'items'}${pageNumber?' on this page':''} · ${area} · Newest first`:'';
 target.innerHTML=items.map(i=>itemRow(i)).join('')||'<div class="empty"><span class="empty-reuse" aria-hidden="true">♻</span><h3>Room for another useful life</h3><p>No free items here yet. Have something to pass on?</p><button id="emptyGive">Give something away</button></div>';
 for(const row of target.querySelectorAll('.item-row')){const item=items.find(i=>i.item_id===row.dataset.itemId);row.onclick=()=>openDetails(item);window.BAG_DAY_ANALYTICS?.observe(row,'reuse_item_impression',{has_phone:hasPhone(item)?1:0,has_url:publicURL(item.external_url)?1:0},'reuse:'+item.item_id)}
 if($('#emptyGive'))$('#emptyGive').onclick=()=>give('empty_state');$('#next').hidden=data.items.length<20;
}
function itemMetadata(item){
 const place=item.locality_name||localities.find(l=>l.locality_id===item.locality_id)?.name||'Locality unavailable';
 const posted=postedDate(item),age=ageLabel(item);
 return `<span class="item-place"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M15.5 8c0 4-5.5 9-5.5 9S4.5 12 4.5 8a5.5 5.5 0 1 1 11 0Z"/><circle cx="10" cy="8" r="1.8"/></svg>${esc(place)}</span><span class="meta-dot" aria-hidden="true">·</span><time ${posted?`datetime="${esc(item.submitted_at)}" title="Posted ${esc(posted)}" data-submitted-at="${esc(item.submitted_at)}"`:''}>${esc(age)}</time>`;
}
function itemRow(item){return `<button type="button" class="item-row" data-item-id="${esc(item.item_id)}" aria-haspopup="dialog"><span class="item-copy"><span class="item-description">${esc(item.description)}</span><span class="item-meta">${itemMetadata(item)}</span></span><span class="item-chevron" aria-hidden="true">›</span></button>`}
function refreshItemAges(){for(const time of document.querySelectorAll('time[data-submitted-at]'))time.textContent=ageLabel({submitted_at:time.dataset.submittedAt})}
function contactMessage(text){const el=detailsDialog.querySelector('#contactMessage');if(el){el.textContent=text;el.hidden=!text}}
function showPhone(item,phone,owned=false){
 const container=detailsDialog.querySelector('[data-contact-id]');if(!container||container.dataset.contactId!==item.item_id)return;
 const clean=String(phone).replace(/[^+0-9]/g,'');if(!/^\+?[0-9]{8,15}$/.test(clean)){contactMessage('This contact number is unavailable. Please try again.');return}
 container.innerHTML=`<span class="muted small">Contact number</span><div class="phone-number">${esc(phone)}</div><div class="phone-actions"><a href="tel:${esc(clean)}" id="callOwner">Call${owned?'':' owner'}</a><button type="button" id="copyPhone" class="quiet">Copy number</button></div><p id="contactMessage" class="contact-hint" role="status" hidden></p>`;
 $('#callOwner').onclick=()=>{if(!owned)track('reuse_phone_call_click')};
 $('#copyPhone').onclick=async()=>{try{if(!navigator.clipboard?.writeText)throw Error('unavailable');await navigator.clipboard.writeText(String(phone));if(!owned)track('reuse_phone_copy');contactMessage('Number copied.')}catch{const el=container.querySelector('.phone-number'),range=document.createRange();range.selectNodeContents(el);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);contactMessage('Number selected. Use Copy to copy it.')}};
}
function openDetails(item,owned=false){
 currentDetail={item,owned};const link=publicURL(item.external_url),place=item.locality_name||localities.find(l=>l.locality_id===item.locality_id)?.name||'';
 const state=owned?(item.status==='LIVE'?'AVAILABLE':item.status==='PENDING'?'AWAITING APPROVAL':item.status):'FREE TO A NEW HOME';
 detailsDialog.innerHTML=`<button type="button" id="closeDetails" class="close" aria-label="Close item details">×</button><span class="pill ${owned&&item.status==='PENDING'?'pending':owned&&item.status==='REJECTED'?'rejected':''}">${esc(state)}</span><h2 id="detailTitle">${esc(item.description)}</h2><div class="detail-location item-meta">${itemMetadata(item)}</div><p class="detail-expiry">${postedDate(item)?'Posted '+esc(postedDate(item))+' · ':''}Expires ${esc(date(item.delete_at))}</p><p id="detailError" class="notice" role="alert" hidden></p>${owned&&item.decision_note?`<p class="notice small">${esc(item.decision_note)}</p>`:''}${hasPhone(item)||item.contact_phone?`<div class="detail-contact" data-contact-id="${esc(item.item_id)}"><button type="button" id="revealPhone">View phone number</button><p id="contactMessage" class="contact-hint" role="status">${me?'':'Sign in with Google to see the number.'}</p></div>`:''}${link?`<a href="${esc(link)}" target="_blank" rel="noopener noreferrer" class="detail-link" id="detailAdvert">Open original advert ↗</a>`:''}${owned?`<div class="detail-actions"><div class="item-actions">${['LIVE','PENDING','REJECTED'].includes(item.status)?'<button type="button" class="quiet" id="editDetail">Edit</button>':''}${['LIVE','PENDING'].includes(item.status)?'<button type="button" id="takeDetail">Mark as taken</button><button type="button" class="quiet" id="withdrawDetail">Withdraw</button>':''}</div></div>`:''}`;
 $('#closeDetails').onclick=()=>detailsDialog.close();
 if($('#revealPhone'))$('#revealPhone').onclick=()=>{if(owned&&item.contact_phone){showPhone(item,item.contact_phone,true);return}track('reuse_phone_request');needLogin(()=>reveal(item))};
 if($('#detailAdvert')){const click=()=>track('reuse_advert_click');$('#detailAdvert').addEventListener('click',click);$('#detailAdvert').addEventListener('auxclick',e=>{if(e.button===1)click()})}
 if(owned){if($('#editDetail'))$('#editDetail').onclick=()=>{detailsDialog.close();itemForm(item)};if($('#takeDetail'))$('#takeDetail').onclick=e=>endItem(item,'TAKEN',e.currentTarget);if($('#withdrawDetail'))$('#withdrawDetail').onclick=e=>endItem(item,'WITHDRAW',e.currentTarget)}
 if(!detailsDialog.open)detailsDialog.showModal();detailsDialog.scrollTop=0;
 if(owned&&item.contact_phone)showPhone(item,item.contact_phone,true);else if(me&&contactCache.has(item.item_id))showPhone(item,contactCache.get(item.item_id));
 if(!owned)track('reuse_item_open',{has_phone:hasPhone(item)?1:0,has_url:link?1:0});
}
async function reveal(item){
 if(!me||revealing.has(item.item_id))return;const session=me,button=$('#revealPhone');if(contactCache.has(item.item_id)){showPhone(item,contactCache.get(item.item_id));return}
 revealing.add(item.item_id);if(button){button.disabled=true;button.textContent='Opening number…'}
 try{const data=await request('/reuse/items/'+encodeURIComponent(item.item_id)+'/contact');if(!me||me!==session)return;contactCache.set(item.item_id,data.contact_phone);track('reuse_phone_revealed');if(detailsDialog.open&&currentDetail?.item.item_id===item.item_id)showPhone(item,data.contact_phone)}
 catch(e){if(e.status===401){me=null;account();await signIn(()=>reveal(item))}else{failed('phone',e);if(detailsDialog.open&&currentDetail?.item.item_id===item.item_id)contactMessage(e.message)}}
 finally{revealing.delete(item.item_id);if(button?.isConnected){button.disabled=false;button.textContent='View phone number'}}
}
function endItem(item,action,button){run(async()=>{await request('/reuse/items/'+encodeURIComponent(item.item_id),{method:'PATCH',body:{action,revision:item.revision}});track(action==='TAKEN'?'reuse_item_taken':'reuse_item_withdrawn');detailsDialog.close();await mine();message(action==='TAKEN'?'Marked as taken. Thank you for passing it on.':'Your item has been withdrawn.')},button)}
async function mine(){if(!me)return needLogin(mine);await refreshMe();if(!me){await browse();return needLogin(mine)}view='mine';tabs();const c=me.contributor;
 if(!c||c.status==='REJECTED')return enrolment(c);
 if(c.status==='PENDING'){content.innerHTML=`<div class="panel"><span class="pill pending">ENROLMENT WAITING FOR APPROVAL</span><h2>Thank you, ${esc(c.display_name.split(' ')[0])}.</h2><p>Your request is with us. Once approved, you can list your first free item.</p><p class="muted small">You can still browse items and see contact numbers while you wait.</p><button id="checkStatus" class="quiet">Check status</button></div>`;$('#checkStatus').onclick=()=>run(mine);return}
 if(c.status==='SUSPENDED'){content.innerHTML=`<div class="panel"><h2>Your contributor account is paused</h2><p>${esc(c.decision_note||'Posting is currently unavailable.')}</p></div>`;return}
 const visible=newestFirst(me.items.filter(i=>!['TAKEN','WITHDRAWN'].includes(i.status)&&Date.parse(i.delete_at)>Date.now())),active=visible.filter(i=>['PENDING','LIVE'].includes(i.status)).length;
 content.innerHTML=`<div class="toolbar"><div><h2>My items</h2><p class="muted small">${active} of ${me.listing_limit} active items${c.trust_level==='TRUSTED'?' · Trusted contributor':''}</p></div><button id="addItem" class="quiet" ${active>=me.listing_limit?'disabled':''}>+ Add</button></div>${c.trust_level==='TRUSTED'&&!me.trusted_autopublish?'<details class="review-help"><summary>Items are reviewed before publication</summary><p>You can have up to three active items. Tap an item to see its status and manage it.</p></details>':''}<div class="item-list">${visible.map(i=>itemRow(i)).join('')||'<div class="empty"><h3>Ready for a second life?</h3><p>No items to manage. Use + Give to add something.</p></div>'}</div>`;
 $('#addItem').onclick=()=>itemForm();for(const row of content.querySelectorAll('.item-row'))row.onclick=()=>openDetails(visible.find(i=>i.item_id===row.dataset.itemId),true);
}
async function give(entry_point='give_button'){track('reuse_give_click',{entry_point});await needLogin(async()=>{await mine();if(me?.contributor?.status==='APPROVED'){const active=me.items.filter(i=>['LIVE','PENDING'].includes(i.status)).length;if(active<me.listing_limit)itemForm()}})}
function enrolment(old){track('reuse_enrolment_start');const name=old?.display_name||me.user.display_name,chosen=old?.locality_id||locality||preferredLocality;
 content.innerHTML=`<section class="panel"><span class="eyebrow">JOIN THE REUSE COMMUNITY</span><h2>A few details. A useful difference.</h2><p class="muted">Tell us a little about you before your first contribution.</p>${old?.decision_note?`<p class="notice">${esc(old.decision_note)}</p>`:''}<form id="enrolForm"><label>Your name<input name="display_name" autocomplete="name" value="${esc(name)}" maxlength="100" required></label><label>Google account email<input value="${esc(me.user.email||'')}" type="email" readonly><span class="field-hint">Already supplied by Google.</span></label><div class="field-row"><label>Home locality<select name="locality_id" required>${choices(chosen)}</select></label><label>Contact number<input name="contact_phone" type="tel" autocomplete="tel" value="${esc(old?.contact_phone||'')}" placeholder="9912 3456 or +356 9912 3456" maxlength="32" required></label></div><label class="reflection">Why does giving something a second life matter to you?<textarea id="why" name="why_reuse" maxlength="240" rows="3" required placeholder="A few words in your own way are enough.">${esc(old?.why_reuse||'')}</textarea><span id="whyCount" class="counter">0 / 240</span><span class="field-hint">Your answer stays between you and the administrator.</span></label><p class="muted small">Your number is used for items you choose to list by phone. Those numbers are shown only to signed-in users. Your name, email and reflection do not appear in public item listings.</p><div id="enrolError" class="notice" hidden role="alert"></div><button>Request to join</button></form></section>`;
 const enrolPhone=$('#enrolForm [name=contact_phone]');enrolPhone.oninput=()=>{const digits=enrolPhone.value.replace(/[\s().-]/g,'');enrolPhone.setCustomValidity(digits&&!/^(?:\+?356)?[0-9]{8}$/.test(digits)?'Enter 8 digits, optionally starting with 356 or +356.':'')};enrolPhone.oninput();const count=()=>$('#whyCount').textContent=$('#why').value.length+' / 240';$('#why').oninput=count;count();$('#enrolForm').onsubmit=async e=>{e.preventDefault();if(loading)return;loading=true;e.submitter.disabled=true;try{const b=Object.fromEntries(new FormData(e.target));track('reuse_enrolment_submit');const result=await request('/reuse/enrolment',{method:'POST',body:b});if(!result.already_submitted)track('reuse_enrolment_success');await mine()}catch(err){failed('enrolment',err);$('#enrolError').textContent=err.message;$('#enrolError').hidden=false}finally{loading=false;if(e.submitter?.isConnected)e.submitter.disabled=false}};
}
function itemForm(old){
 track('reuse_item_form_open',{operation:old?'edit':'create'});
 const c=me.contributor,id=old?.item_id||crypto.randomUUID();
 itemDialog.innerHTML=`<button id="closeItem" class="close" aria-label="Close item form">×</button><span class="eyebrow">A NEW SECOND LIFE</span><h2 id="itemTitle">${old?'Edit your item':'What are you passing on?'}</h2><form id="itemForm"><label>Short description<textarea id="description" name="description" maxlength="120" rows="2" required placeholder="e.g. Small wooden bookcase, good condition. Collection only.">${esc(old?.description||'')}</textarea><span id="descriptionCount" class="counter"></span></label><label>Collection locality<select name="locality_id" required>${choices(old?.locality_id||c.locality_id)}</select></label><label id="phoneField">Phone number<input id="phone" name="contact_phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="32" value="${esc(old?old.contact_phone||'':c.contact_phone||'')}" placeholder="9912 3456 or +356 9912 3456"><span class="field-hint">8 digits, optionally starting with 356 or +356. Visible only after Google sign-in.</span></label><label id="linkField"><span>Advert URL <span class="muted">(optional)</span></span><input id="link" name="external_url" type="url" maxlength="2048" value="${esc(old?.external_url||'')}" placeholder="https://…"><span class="field-hint">You can add a link as well as a phone number. If you leave the URL empty, a phone number is required. Anyone can open the link without signing in.</span></label><label class="check"><input id="free" type="checkbox" required><span>This item is completely free. No payment or purchase is required.</span></label><p class="muted small">${old?'Edits are reviewed again. The original expiry date stays the same.':'Listings expire automatically. The expiry date appears in item details.'}</p><div id="itemError" class="notice" role="alert" hidden></div><div class="form-actions"><button>${old?'Save changes':'Submit free item'}</button><button type="button" id="cancelItem" class="quiet">Cancel</button></div></form>`;
 const validateContacts=()=>{const phone=$('#phone'),link=$('#link'),digits=phone.value.replace(/[\s().-]/g,'');phone.required=!link.value.trim();link.required=!phone.value.trim();phone.setCustomValidity(digits&&!/^(?:\+?356)?[0-9]{8}$/.test(digits)?'Enter 8 digits, optionally starting with 356 or +356.':'');link.setCustomValidity(link.value.trim()&&!/^https:\/\//i.test(link.value.trim())?'Use a complete https:// advert URL.':'')};$('#phone').oninput=$('#link').oninput=validateContacts;validateContacts();const count=()=>$('#descriptionCount').textContent=$('#description').value.length+' / 120';$('#description').oninput=count;count();$('#closeItem').onclick=$('#cancelItem').onclick=()=>itemDialog.close();itemDialog.showModal();$('#description').focus();
 $('#itemForm').onsubmit=async e=>{e.preventDefault();if(loading)return;loading=true;e.submitter.disabled=true;try{const b={...Object.fromEntries(new FormData(e.target)),free_only:$('#free').checked,...(old?{revision:old.revision}:{item_id:id})};track('reuse_item_submit',{operation:old?'edit':'create',...contactStats(b)});const r=await request('/reuse/items'+(old?'/'+old.item_id:''),{method:old?'PATCH':'POST',body:b});if(!r.replayed)track(old?'reuse_item_edit_saved':'reuse_item_submitted',{...contactStats(b),listing_state:r.item.status==='LIVE'?'live':'pending'});itemDialog.close();await mine();message(r.item.status==='LIVE'?'Your free item is now available.':'Your item is waiting for approval.')}catch(err){failed(old?'edit':'create',err);$('#itemError').textContent=err.message;$('#itemError').hidden=false}finally{loading=false;if(e.submitter?.isConnected)e.submitter.disabled=false}};
}
loginDialog.addEventListener('cancel',()=>{track('reuse_signin_cancel');afterLogin=null});
$('#signin').onclick=()=>signIn(()=>view==='mine'?mine():browse());$('#signout').onclick=()=>run(async()=>{detailsDialog.close();itemDialog.close();await request('/auth/public/logout',{method:'POST',body:{}});track('reuse_signout');me=null;account();message('');await browse()});$('#closeSignin').onclick=()=>{track('reuse_signin_cancel');afterLogin=null;loginDialog.close()};$('#give').onclick=()=>give('give_button');$('#mineTab').onclick=()=>{track('reuse_my_items_open');run(mine)};$('#browseTab').onclick=()=>run(browse);
async function start(){try{
 const [ls]=await Promise.all([request('/public/reuse/localities'),refreshMe()]);
 localities=ls.items.sort((a,b)=>a.name.localeCompare(b.name,'en'));
 let saved='';try{saved=localStorage.getItem('bag-day-locality-v1')||''}catch{}
 preferredLocality=matchLocality(saved,localities,window.WASTE_DATA?.localities||[])?.locality_id||localities.find(l=>l.locality_id===me?.contributor?.locality_id)?.locality_id||'';
 locality=preferredLocality;allLocalities=false;page=0;locationHint='Finding your GPS locality…';renderSponsors();
 const initialBrowse=browse();defaultToGps().catch(e=>message(e.message));await initialBrowse;
 if(location.hash==='#mine'||location.hash==='#join')await needLogin(mine);
 }catch(e){content.innerHTML='<div class="empty"><h3>REUSE is taking a moment.</h3><p>We couldn’t connect. Please try again shortly.</p><button id="retry">Try again</button></div>';$('#retry').onclick=start;message(e.message)}}
const sponsorDock=$('#sponsorDock'),sponsorPanel=$('#sponsorPanel');
function sizeDock(){sponsorDock.hidden=sponsorPanel.hidden;document.documentElement.style.setProperty('--reuse-sponsor-count',String(Math.max(1,sponsorPanel.querySelectorAll('.sponsor-link').length)));document.documentElement.style.setProperty('--sponsor-dock-height',sponsorDock.hidden?'0px':sponsorDock.getBoundingClientRect().height+'px')}
new MutationObserver(sizeDock).observe(sponsorPanel,{attributes:true,attributeFilter:['hidden'],childList:true});
if(window.ResizeObserver)new ResizeObserver(sizeDock).observe(sponsorDock);
window.addEventListener('bag-day-sponsors-ready',sizeDock);window.addEventListener('resize',sizeDock);
const viewport=window.visualViewport;function fitViewport(){if(viewport)document.documentElement.style.setProperty('--usable-height',viewport.height+'px');sizeDock()}if(viewport)viewport.addEventListener('resize',fitViewport);fitViewport();
function refreshVisibleState(){renderSponsors();refreshItemAges()}window.addEventListener('pageshow',refreshVisibleState);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshVisibleState()});setInterval(refreshVisibleState,60000);
for(const dialog of [detailsDialog,itemDialog,loginDialog])dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()});
start();

if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('../service-worker.js').catch(()=>{}));

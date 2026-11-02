import {openNoticeWizard} from './wizard.mjs?v=1.1.145';
import {loadOptions} from './options.mjs?v=1.1.145';
import {openSlotHelp} from './editor-help.mjs?v=1.1.145';
import {noticeStatus,publishedPages} from './publication.mjs?v=1.1.145';
import {EDITOR_ROUTES,sectionFromPath,editorURL,authorisedPages,selectEditorPage} from './routes.mjs?v=1.1.145';
import {sections,esc,icon,request,addDays,today} from './shared.mjs?v=1.1.145';
const root=document.querySelector('#root'),dialog=document.querySelector('#noticeDialog');let token='',profile=null,state=null,busy=false,pageId='',activeSection=sectionFromPath(location.pathname),loadSeq=0;
function updateEditorTitle(){const brand=document.querySelector('.editor-desk .brand');if(brand&&activeSection){brand.dataset.section=activeSection;brand.innerHTML=icon(sections[activeSection].icon)+'<span>Bag Day Malta</span>'}const title=(activeSection?sections[activeSection].name:'Community')+' Noticeboard Editor';const header=document.querySelector('#noticeboardTitle');if(header)header.textContent=title;document.title=title+' · Bag Day Malta'}
updateEditorTitle();
function publishedTime(value){return new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Malta',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date(value)).replaceAll('/','-').replace(',','')}
let legacyPageId=location.pathname.match(/^\/EditorPage[1-9]\d*\/?$/)?.[0].replaceAll('/','')||new URLSearchParams(location.search).get('page');
function message(text,type='error'){let el=document.querySelector('#message');if(!el){el=document.createElement('p');el.id='message';el.className='status error';el.setAttribute('role','alert');root.prepend(el)}el.className='status '+type;el.textContent=text}
async function run(fn){if(busy)return;busy=true;const controls=[...root.querySelectorAll('button,select')].filter(b=>!b.disabled);controls.forEach(b=>b.disabled=true);try{await fn()}catch(e){if(e.status===401){token='';login(e.message)}else message(e.message)}finally{busy=false;controls.forEach(b=>{if(b.isConnected)b.disabled=false})}}
function login(error=''){
 root.innerHTML=`<section class="desk-hero login-hero ${activeSection||''}"><h1>${esc(activeSection?sections[activeSection].name+' noticeboard':'Community noticeboards')}</h1><p>Sign in with your assigned Google account to manage notices.</p><div id="google"></div><p id="message" class="hint" role="status">${esc(error||'Loading Google sign-in…')}</p></section>`;
 request('/auth/public/client-config').then(c=>{if(!c.google_client_id)throw Error('Google sign-in is not configured');const load=()=>{google.accounts.id.initialize({client_id:c.google_client_id,callback:r=>run(async()=>{const auth=await request('/noticeboard/login',{method:'POST',body:{credential:r.credential}});token=auth.token;profile=await request('/noticeboard/me',{token});await enter()})});google.accounts.id.renderButton(document.querySelector('#google'),{theme:'outline',size:'large'});if(!error)document.querySelector('#message').textContent=''};if(window.google?.accounts)load();else{let s=document.querySelector('#google-script');if(!s){s=document.createElement('script');s.id='google-script';s.src='https://accounts.google.com/gsi/client';s.async=true;document.head.append(s)}s.onload=load;s.onerror=()=>message('Google sign-in could not load. Please reconnect and refresh.')}}).catch(e=>message(e.message));
}
function availableLinks(){return Object.keys(EDITOR_ROUTES).filter(k=>profile.pages.some(p=>p.section===k)).map(k=>`<p><a class="secondary" href="/${EDITOR_ROUTES[k]}/">${sections[k].name} noticeboard</a></p>`).join('')}
function signoutButton(){return '<button id="logout" class="secondary">Sign out</button>'}
function bindSignout(){root.querySelector('#logout')?.addEventListener('click',()=>run(async()=>{try{await request('/noticeboard/logout',{method:'POST',token})}finally{token='';profile=null;state=null;pageId='';login()}}))}
function pickerHTML(){const allowed=authorisedPages(profile.pages,activeSection);return `<label class="editor-locality">Locality<select id="editorLocality" aria-label="Choose an authorised locality"><option value="" ${!pageId?'selected':''} disabled>Choose a locality</option>${allowed.map(p=>`<option value="${esc(p.page_id)}" ${pageId===p.page_id?'selected':''}>${esc(p.locality_name)}</option>`).join('')}</select></label>`}
function bindPicker(){root.querySelector('#editorLocality')?.addEventListener('change',e=>run(async()=>{
 const previous=pageId,page=profile.pages.find(p=>p.page_id===e.target.value&&p.section===activeSection);
 if(!page)throw Error('This locality is not assigned to your account');
 pageId=page.page_id;try{await refresh();history.replaceState(history.state,'',editorURL(page));window.scrollTo(0,0)}
 catch(error){pageId=previous;e.target.value=previous;throw error}
}))}
async function enter(){
 await loadOptions();
 if(legacyPageId){const old=profile.pages.find(p=>p.page_id===legacyPageId);if(!old){root.innerHTML=`<h1>Noticeboard access</h1><p>This link is not assigned to your Google account.</p>${availableLinks()}${signoutButton()}`;bindSignout();return}activeSection=old.section;pageId=old.page_id;legacyPageId=null;history.replaceState(history.state,'',editorURL(old));}
 if(!activeSection){root.innerHTML=`<h1>Your noticeboards</h1>${availableLinks()}${signoutButton()}`;bindSignout();return}
 const allowed=authorisedPages(profile.pages,activeSection);if(!allowed.length){root.innerHTML=`<h1>${sections[activeSection].name} noticeboard</h1><p>Your Google account has no editing access for this section.</p>${availableLinks()}${signoutButton()}`;bindSignout();return}
 const wanted=new URLSearchParams(location.search).get('locality')||'';const chosen=pageId?allowed.find(p=>p.page_id===pageId):selectEditorPage(profile.pages,activeSection,wanted);
 pageId=chosen?.page_id||'';
 if(!pageId){root.innerHTML=`<p class="hint">${esc(profile.name)}</p><h1>${sections[activeSection].name} noticeboard</h1>${pickerHTML()}<p class="muted">${wanted?'Choose a locality assigned to your Google account.':'Choose the locality you want to edit.'}</p>${signoutButton()}`;bindPicker();bindSignout();return}
 history.replaceState(history.state,'',editorURL(chosen));await refresh();
}
async function refresh(){updateEditorTitle();const seq=++loadSeq,id=pageId;if(!profile.pages.some(p=>p.page_id===id&&p.section===activeSection))throw Error('This locality is not assigned to your account');const data=await request('/noticeboard/'+id+'/entries',{token});if(seq!==loadSeq||id!==pageId)return;try{data.published=(await publishedPages()).find(p=>p.page_id===id)||{csv:'',published_at:null}}catch{data.published=null}if(seq!==loadSeq||id!==pageId)return;state=data;render()}
function render(){
 const p=state.page,status=noticeStatus(state.items,state.published),drafts=state.drafts||[];
 const ready=status.changed.size+status.removed,section=sections[p.section];
 const allowed=authorisedPages(profile.pages,activeSection);
 const row=(id,title,date,label,action,draft=false)=>`<tr><td>${esc(title||'Untitled notice')}</td><td>${esc(date||'—')}</td><td><span class="desk-badge" data-status="${label}">${label}</span></td><td><button class="secondary" ${draft?'data-draft':'data-edit'}="${esc(id)}">${action}</button> <button class="row-remove" aria-label="${draft?'Discard draft':'Delete notice'}: ${esc(title)}" title="${draft?'Discard draft':'Delete notice'}" ${draft?'data-discard':'data-delete'}="${esc(id)}">×</button></td></tr>`;
 const date=i=>(i.kind==='event'?'':'Until ')+(i.end_date?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(i.end_date+'T12:00:00Z')):'—');
 const draftRows=drafts.map(record=>{const i=JSON.parse(record.payload);return row(record.entry_id,i.title,date(i),'Draft','Continue',true)});
 const rows=state.items.map(i=>{const changed=status.changed.has(i.entry_id);return row(i.entry_id,i.title,date(i),i.end_date<today()?'Expired':status.state==='unknown'?'Unverified':changed?'Ready':'Published',changed?'Review':'Edit')});
 const occupied=state.items.length;
 root.innerHTML=`<section class="desk-hero ${p.section}"><h1>${esc(p.locality_name)} · ${section.name} noticeboard</h1><details class="desk-account"><summary>${esc(profile.name)}</summary>${signoutButton()}</details></section>
 <div class="desk-toolbar"><strong>All notices (${rows.length+draftRows.length})</strong>${allowed.length>1?pickerHTML():`<span>${esc(p.locality_name)}</span>`}<button id="add" class="primary">+ New notice</button></div>
 <div id="message" role="status"></div>
 <table class="desk-list"><thead><tr><th>Title</th><th>Date</th><th>Status</th><th>Action</th></tr></thead><tbody>${[...draftRows,...rows].join('')}</tbody></table>
 ${!rows.length&&!draftRows.length?'<p class="empty">Add your first notice.</p>':''}
 <div class="desk-publication" ${ready?'':'hidden'}><span>${ready} change${ready===1?'':'s'} ready for ${esc(p.locality_name)}${status.removed?' · '+status.removed+' removal(s)':''}</span><button id="publish" class="primary ${ready?'publish-attention':''}" ${ready?'':'disabled'}>Publish all (${ready})</button></div>
 <footer class="desk-foot"><span>${occupied}/20 notice slots used <button id="slotHelp" class="row-remove" aria-label="About notice slots">${icon('info')}</button></span><span>${status.state==='unknown'?'Publication status unavailable':status.state==='published'?'All current notices published':''} ${state.publication?.published_at?' · Last published '+esc(publishedTime(state.publication.published_at)):''}</span><button id="checkPublication" class="secondary">Refresh status</button></footer>`;
 bindPicker();bindSignout();
 root.querySelector('#slotHelp').onclick=event=>openSlotHelp(state,event.currentTarget);
 root.querySelectorAll('[data-draft]').forEach(b=>b.onclick=()=>edit(null,drafts.find(d=>d.entry_id===b.dataset.draft)));
 root.querySelectorAll('[data-discard]').forEach(b=>b.onclick=()=>{const record=drafts.find(d=>d.entry_id===b.dataset.discard);if(confirm('Discard this unfinished draft?'))run(async()=>{await request('/noticeboard/'+pageId+'/drafts/'+encodeURIComponent(record.entry_id),{method:'DELETE',token,body:{draft_revision:record.revision}});await refresh()})});
 root.querySelector('#checkPublication').onclick=()=>run(async()=>{await refresh();if(noticeStatus(state.items,state.published).state==='published')message('All current notices are published and verified.','success')});
 root.querySelector('#add').onclick=()=>edit();root.querySelector('#publish').onclick=()=>{if(noticeStatus(state.items,state.published).state!=='unpublished')return;return run(async()=>{const button=root.querySelector('#publish');button.textContent='Publishing…';message('Publishing and checking the public copy…','pending');try{await request('/noticeboard/'+pageId+'/publish',{method:'POST',token,body:{revision:state.page.revision}});await refresh();if(noticeStatus(state.items,state.published).state!=='published')throw Error('Publish completed, but the latest public copy could not be confirmed. Your saved changes are retained. Use Refresh status to check again.');message('Published and verified successfully, including links. Public visitors may see the previous copy for up to one minute.','success')}finally{if(button.isConnected)button.textContent='Publish all ('+ready+')'}})};

 root.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(state.items.find(i=>i.entry_id===b.dataset.edit),null,status.changed.has(b.dataset.edit)));
 root.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{const item=state.items.find(i=>i.entry_id===b.dataset.delete);if(confirm('Delete “'+item.title+'”? Publish afterwards to remove it from the public board.'))run(async()=>{await request('/noticeboard/'+pageId+'/entries/'+encodeURIComponent(item.entry_id),{method:'DELETE',token,body:{revision:item.revision}});await refresh()})});
}
function edit(item=null,record=null,review=false){
 if(!Array.isArray(state.drafts)){message('Install backend v1.1.38 and refresh before editing notices.');return}
 if(item&&!record&&state.drafts.some(d=>d.entry_id===item.entry_id)&&!review){message('Choose Continue on the draft row to edit your saved changes.');return}
 openNoticeWizard({dialog,state,item,record,review:review&&!record,token,request,
  onComplete:async marked=>{try{await refresh();message(marked?'Marked for publication. Press Publish all when you are ready.':'Draft saved. Choose Continue to finish it later.','success')}catch(e){message('Saved successfully. Refresh the list to see your change. '+e.message)}}
 });
}
login();

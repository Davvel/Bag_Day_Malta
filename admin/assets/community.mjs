export async function renderCommunity({container,api,esc,dialog,flash,onError=()=>{},isCurrent=()=>true}){
 let records=[],filter='ALL',query='';
 const today=()=>{const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Malta',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),get=t=>p.find(v=>v.type===t).value;return get('year')+'-'+get('month')+'-'+get('day')};
 const status=r=>!r.active?'PAUSED':r.start_date>today()?'SCHEDULED':r.end_date<today()?'EXPIRED':'LIVE';
 const date=value=>new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',dateStyle:'medium'}).format(new Date(value+'T00:00:00Z'));
 function error(message){const el=container.querySelector('#communityError');if(el){el.textContent=message;el.hidden=false}}
 async function load(){
  records=await api.all('/admin/community-adverts');if(!isCurrent())return;
  container.innerHTML=`<div class="heading"><div><h1>Community adverts</h1><p class="muted">One global pool. Start and end dates are inclusive, using Malta time.</p></div><button id="communityAdd">+ Add advert</button></div><div id="communityError" class="message error" role="alert" hidden></div><div class="card"><div class="toolbar control-row"><label>Show<select id="communityStatus">${['ALL','LIVE','SCHEDULED','EXPIRED','PAUSED'].map(s=>`<option ${filter===s?'selected':''}>${s}</option>`).join('')}</select></label><input id="communitySearch" class="search" type="search" aria-label="Search community adverts" placeholder="Organisation or advert…" value="${esc(query)}"><button id="communityRefresh" class="secondary">Refresh</button></div><p class="smalltext muted">Saving publishes the pool automatically. Existing sponsor CSV publication is unchanged.</p><div class="scroll"><table><thead><tr><th>Organisation / advert</th><th>Dates</th><th>Status</th><th>Actions</th></tr></thead><tbody id="communityRows"></tbody></table></div></div>`;
  container.querySelector('#communityAdd').onclick=()=>edit();
  container.querySelector('#communityRefresh').onclick=()=>load().catch(e=>error(e.message));
  container.querySelector('#communityStatus').onchange=e=>{filter=e.target.value;draw()};
  container.querySelector('#communitySearch').oninput=e=>{query=e.target.value;draw()};draw();
 }
 function draw(){
  const q=query.toLocaleLowerCase(),shown=records.filter(r=>(filter==='ALL'||status(r)===filter)&&(!q||(r.organisation_name+' '+r.display_text).toLocaleLowerCase().includes(q))),body=container.querySelector('#communityRows');
  body.innerHTML=shown.map((r,i)=>`<tr><td><strong>${esc(r.organisation_name)}</strong><div class="smalltext muted">${esc(r.display_text)}</div></td><td class="smalltext">${date(r.start_date)}<br>${date(r.end_date)}</td><td><span class="pill ${status(r)==='LIVE'?'approved':status(r)==='PAUSED'||status(r)==='EXPIRED'?'cancelled':'draft'}">${status(r)}</span></td><td><button class="secondary" data-edit="${i}">Edit</button><button class="danger" data-delete="${i}">Delete</button></td></tr>`).join('')||'<tr><td colspan="4" class="empty">No community adverts in this view.</td></tr>';
  body.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(shown[Number(b.dataset.edit)]));
  body.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>remove(shown[Number(b.dataset.delete)]));
 }
 function edit(old){
  const id=old?.advert_id||crypto.randomUUID(),r=old||{};
  dialog.innerHTML=`<h2>${old?'Edit':'Add'} community advert</h2><form id="communityForm"><label>Organisation name<input name="organisation_name" value="${esc(r.organisation_name||'')}" maxlength="200" required autofocus></label><label>Advert text<textarea aria-label="Advert text" name="display_text" rows="2" maxlength="500" placeholder="Uses the organisation name if left empty">${esc(r.display_text||'')}</textarea></label><label>Banner image URL <span class="muted">optional</span><input name="banner_url" type="url" value="${esc(r.banner_url||'')}" placeholder="https://…"></label><label>Destination link<input name="destination_url" type="url" value="${esc(r.destination_url||'')}" required placeholder="https://…"></label><div class="grid"><label>Start date<input name="start_date" type="date" value="${esc(r.start_date||today())}" required></label><label>End date<input name="end_date" type="date" value="${esc(r.end_date||'')}" required></label></div><p class="smalltext muted">Both dates include the whole Malta calendar day. Expired adverts stay saved for reuse.</p><label class="check-label"><input name="active" type="checkbox" ${r.active===0?'':'checked'}> Enabled</label><div id="communityPreview" class="preview"></div><div id="communityFormError" class="message error" role="alert" hidden></div><div class="dialog-actions toolbar"><button type="submit">Save advert</button><button type="button" class="secondary" id="communityCancel">Cancel</button></div></form>`;
  dialog.showModal();const f=dialog.querySelector('#communityForm'),err=dialog.querySelector('#communityFormError');
  dialog.querySelector('#communityCancel').onclick=()=>dialog.close();
  const preview=()=>{const el=dialog.querySelector('#communityPreview');el.replaceChildren();try{const u=new URL(f.elements.banner_url.value);if(['https:','http:'].includes(u.protocol)&&!u.username&&!u.password){const image=document.createElement('img');image.src=u.href;image.alt='Community banner preview';image.referrerPolicy='no-referrer';image.style='width:100%;height:44px;object-fit:fill';image.onerror=()=>image.remove();el.append(image)}}catch{}el.append(document.createTextNode(f.elements.display_text.value||f.elements.organisation_name.value||'Advert preview'))};
  f.addEventListener('input',preview);preview();
  f.onsubmit=async event=>{
   event.preventDefault();const button=event.submitter;button.disabled=true;err.hidden=true;
   const b=Object.fromEntries(new FormData(f));b.active=f.elements.active.checked;
   if(b.start_date>b.end_date){err.textContent='End date must be on or after start date.';err.hidden=false;button.disabled=false;return}
   try{
    await api.request('/admin/community-adverts'+(old?'/'+encodeURIComponent(id):''),{method:old?'PATCH':'POST',body:{...b,...(old?{revision:old.revision}:{advert_id:id})}});
    if(dialog.contains(f))dialog.close();if(isCurrent()){await load();flash('Community advert saved. Its dates control when it can appear.')}
   }catch(e){if(f.isConnected){err.textContent=e.message;err.hidden=false}if(e.status===401)onError(e)}
   finally{if(button.isConnected)button.disabled=false}
  };
 }
 function remove(r){
  dialog.innerHTML=`<h2>Delete community advert?</h2><p>${esc(r.organisation_name)}</p><p>Changing its dates or pausing it keeps the record available for reuse.</p><div id="communityDeleteError" class="message error" role="alert" hidden></div><div class="toolbar"><button class="danger" id="communityDelete">Delete advert</button><button class="secondary" id="communityKeep">Keep advert</button></div>`;
  dialog.showModal();dialog.querySelector('#communityKeep').onclick=()=>dialog.close();
  dialog.querySelector('#communityDelete').onclick=async event=>{const button=event.currentTarget;button.disabled=true;try{await api.request('/admin/community-adverts/'+encodeURIComponent(r.advert_id),{method:'DELETE',body:{revision:r.revision}});dialog.close();if(isCurrent()){await load();flash('Community advert deleted.')}}catch(e){const el=dialog.querySelector('#communityDeleteError');if(el){el.textContent=e.message;el.hidden=false}}finally{if(button.isConnected)button.disabled=false}};
 }
 await load();
}

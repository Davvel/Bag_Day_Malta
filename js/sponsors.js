(() => {
  'use strict';
  const siteRoot=new URL('../',document.currentScript.src);
  const normal = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  function parseCSV(text) {
    const rows=[]; let row=[],value='',quoted=false;
    text=String(text).replace(/^\uFEFF/,'');
    for(let i=0;i<text.length;i++){
      const c=text[i];
      if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}
      else if(c===','&&!quoted){row.push(value);value='';}
      else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(value);if(row.some(v=>v.trim()))rows.push(row);row=[];value='';}
      else value+=c;
    }
    if(quoted)throw new Error('Unclosed CSV quote');
    row.push(value);if(row.some(v=>v.trim()))rows.push(row);
    const headers=(rows.shift()||[]).map(normal);
    return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,(r[i]||'').trim()])));
  }
  function safeURL(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:null;}catch(_){return null;}}
  function bannerURLs(value){
    const u=new URL(value);
    if(u.origin==='https://bagdaymalta.eu'&&u.pathname.toLowerCase()==='/images/sponsors/google.png'){
      u.searchParams.set('v','1.1.48');
      // Keep the published path; try the alternative case for Windows/GitHub uploads.
      const original=u.href;
      u.pathname=u.pathname.endsWith('/google.png')?'/images/sponsors/Google.png':'/images/sponsors/google.png';
      return [original,u.href];
    }
    return [u.href];
  }
  function canonical(value){
    const key=normal(value);
    const row=window.WASTE_DATA.localities.find(r=>[r[0],...(r[3]||[])].some(v=>normal(v)===key));
    return row?normal(row[0]):key;
  }
  function bookings(rows,locality,date,master=[]){
    const sponsors=new Map(master.map(r=>[String(r.sponsorid||'').trim().toUpperCase(),r]));
    const usedSlots=new Set(),usedSponsors=new Set();
    return rows.map(r=>({...r,advert:sponsors.get(String(r.sponsorid||'').trim().toUpperCase())}))
      .filter(r=>canonical(r.locality)===canonical(locality)&&Number(r.month)===date.getUTCMonth()+1&&Number(r.year)===date.getUTCFullYear()&&Number.isInteger(Number(r.slot))&&Number(r.slot)>0&&r.advert&&r.advert.displaytext&&safeURL(r.advert.url))
      .sort((a,b)=>Number(a.slot)-Number(b.slot))
      .filter(r=>{
        const id=String(r.sponsorid).trim().toUpperCase(),slot=Number(r.slot);
        if(usedSlots.has(slot)||usedSponsors.has(id))return false;
        usedSlots.add(slot);usedSponsors.add(id);return true;
      });
  }
  let sponsorRows=[],slotRows=[],councilRows=[],last=null,sponsorStale=false,publicationVersion=null,lastExportError=null;
  function sponsorDate(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Malta',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const get=type=>parts.find(p=>p.type===type).value;return new Date(get('year')+'-'+get('month')+'-'+get('day')+'T00:00:00Z');}
  const link=(text,url,cls)=>{const a=document.createElement('a');a.textContent=text;a.href=url;a.className=cls;a.target='_blank';a.rel='noopener noreferrer sponsored';return a;};
  const panelState=new Map();
  let pickerState={};try{pickerState=JSON.parse(sessionStorage.getItem('bag-day-community-order-v1')||'{}')}catch{}
  const freePicker=new window.BAG_DAY_ADVERT_POLICY.FreePicker(pickerState,state=>{try{sessionStorage.setItem('bag-day-community-order-v1',JSON.stringify(state))}catch{}});
  function advertLink(entry,index,locality,today){
    const a=link(entry.displayText,entry.url,'sponsor-link sponsor-slot-'+((index%3)+1));
    a.dataset.sponsorId=entry.id;a.dataset.advertKind=entry.kind;
    const label=document.createElement('span');label.className='sponsor-copy';label.textContent=entry.displayText;a.replaceChildren(label);a.setAttribute('aria-label',entry.displayText);
    if(entry.imageURL){
      const image=document.createElement('img');image.alt=entry.displayText;image.className='sponsor-banner';
      const candidates=bannerURLs(entry.imageURL);let candidate=0;
      image.onerror=()=>{candidate++;if(candidate<candidates.length){image.src=candidates[candidate];return}a.classList.remove('sponsor-link-image');a.replaceChildren(label)};
      a.classList.add('sponsor-link-image');a.replaceChildren(image);image.src=candidates[0];
    }
    const placement=window.WASTE_DATA.localities.find(row=>canonical(row[0])===canonical(locality))?.[0];
    const params=entry.kind==='paid'?{sponsor_id:entry.id,placement_locality:placement,booking_month:entry.month,booking_year:entry.year,sponsor_slot:entry.position,data_source:sponsorStale?'saved':'live'}:{community_advert_id:entry.advert_id,placement_locality:placement};
    const currentParams=()=>({...params,advert_kind:entry.kind,advert_format:a.classList.contains('sponsor-link-image')?'image':'text'});
    const eventPrefix=entry.kind==='paid'?'sponsor':'community';
    const key=entry.kind==='paid'?['sponsor',entry.id,canonical(locality),entry.year,entry.month,entry.position].join(':'):['community',entry.advert_id,canonical(locality),window.BAG_DAY_ADVERT_POLICY.dayKey(today)].join(':');
    const trackClick=()=>{const analytics=window.BAG_DAY_ANALYTICS;analytics?.event(eventPrefix+'_click',currentParams());if(analytics?.viewed(key))analytics.once(eventPrefix+'_click_after_view',currentParams(),'click:'+key)};
    a.addEventListener('click',trackClick);a.addEventListener('auxclick',event=>{if(event.button===1)trackClick()});
    window.BAG_DAY_ANALYTICS?.observe(a,eventPrefix+'_impression',currentParams,key);return a;
  }
  function renderPlacement(panel,entries,mode,locality,today,channel){
    panel.hidden=!entries.length;
    const fingerprint=JSON.stringify([canonical(locality),mode,entries,sponsorStale]);
    const old=panelState.get(panel.id);if(old?.fingerprint===fingerprint)return;
    old?.controller?.destroy();
    const state={fingerprint,controller:null};panelState.set(panel.id,state);
    if(!entries.length){panel.replaceChildren();delete panel.dataset.carouselCount;return}
    const links=entries.map((entry,i)=>advertLink(entry,i,locality,today));
    const paidCount=entries.filter(e=>e.kind==='paid').length,freeIds=entries.filter(e=>e.kind==='community').map(e=>e.id);
    const freeIndex=()=>{const id=freePicker.next(freeIds);return entries.findIndex(e=>e.id===id)};
    const nextIndex=(index,direction)=>{
      if(direction<0)return(index-1+entries.length)%entries.length;
      if(mode==='community')return freeIndex();
      if(mode==='mixed')return index<paidCount-1?index+1:index===paidCount-1?freeIndex():0;
      return(index+1)%entries.length;
    };
    const key=[canonical(locality),today.getUTCFullYear(),today.getUTCMonth()+1,...links.map(a=>a.dataset.sponsorId)].join('|');
    state.controller=window.BAG_DAY_SPONSOR_CAROUSEL.mount(panel,links,key,'Sponsored',{
      channel,startCount:paidCount||entries.length,label:freeIds.length?'advert':'sponsor',nextIndex,
      ...(mode==='community'?{initialIndex:freeIndex}:{}),
      onSelect:index=>{if(entries[index].kind==='community')freePicker.seen(entries[index].id)},
      heading:a=>a.dataset.advertKind==='community'?'Community':sponsorStale?'Sponsored · saved data':'Sponsored'
    });
  }
  function render(locality,date){
    last=[locality,date];
    const council=document.getElementById('councilPanel'),panel=document.getElementById('sponsorPanel');
    if(!panel)return;
    if(council){
    council.replaceChildren();
    const details=councilRows.find(r=>canonical(r.locality||r.council)===canonical(locality));
    const name=document.createElement('strong');name.textContent=details?.councilname||locality+' Local Council';const emblem=document.createElement('span');emblem.className='council-emblem';emblem.innerHTML='<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 12 16 5l12 7H4ZM7 14v11m6-11v11m6-11v11m6-11v11M4 27h24"/></svg>';emblem.setAttribute('aria-hidden','true');const identity=document.createElement('div');identity.className='council-identity';identity.append(name);council.append(emblem,identity);
    const noticeboard=document.createElement('a');noticeboard.className='council-noticeboard';
    const noticeURL=new URL('noticeboard/',siteRoot);noticeURL.searchParams.set('locality',locality);noticeboard.href=noticeURL.href;
    noticeboard.title='Community noticeboard';noticeboard.setAttribute('aria-label','Open community noticeboard for '+locality);
    const boardIcon=document.createElement('img');boardIcon.src=new URL('icons/community-billboard.svg',siteRoot).href;boardIcon.alt='';boardIcon.width=40;boardIcon.height=40;noticeboard.append(boardIcon);council.append(noticeboard);

    const actions=document.createElement('div');actions.className='council-actions';
    const actionContent=(node,icon,label)=>{
      const image=document.createElement('img');image.src=new URL('icons/council-'+icon+'.svg',siteRoot).href;image.alt='';image.width=26;image.height=26;
      const caption=document.createElement('span');caption.textContent=label;node.replaceChildren(image,caption);
    };
    const placement=window.WASTE_DATA.localities.find(r=>canonical(r[0])===canonical(details?.locality||details?.council||''))?.[0];
    const councilParams=placement?{placement_locality:placement}:{};
    if(details&&safeURL(details.website||details.websiteurl)){const a=link('Website ↗',safeURL(details.website||details.websiteurl),'council-link');a.rel='noopener noreferrer';actionContent(a,'website','Council Website');a.setAttribute('aria-label','Open '+locality+' council website (opens a new tab)');a.addEventListener('click',()=>window.BAG_DAY_ANALYTICS?.event('council_website_click',councilParams));actions.append(a);}
    const phone=(details?.bulkytelephone||details?.phone||'').replace(/[^+0-9]/g,'');
    if(phone.length>=8){const a=document.createElement('button');a.type='button';a.className='council-link council-bulky';actionContent(a,'bulky','Bulky Refuse');a.setAttribute('aria-label','Bulky refuse collection information for '+locality);a.setAttribute('aria-haspopup','dialog');a.setAttribute('aria-controls','bulkyOverlay');a.onclick=()=>window.BAG_DAY_BULKY.open({locality,council:name.textContent,phone,website:safeURL(details?.website||details?.websiteurl),dedicated:!!details?.bulkytelephone,analyticsPlacement:placement});actions.append(a);}
    const truck=link('', 'https://www.wsm.com.mt/en/roadshow','council-link council-roadshow');
    actionContent(truck,'truck','WasteServ Truck');truck.rel='noopener noreferrer';
    truck.setAttribute('aria-label','WasteServ Roadshow Truck: check the official schedule for cooking oil, batteries and more (opens a new tab)');
    truck.title='Check the official schedule for cooking oil, batteries and more';
    truck.addEventListener('click',()=>window.BAG_DAY_ANALYTICS?.event('roadshow_schedule_click',councilParams));actions.append(truck);
    const whatsapp=(details?.whatsapp||details?.whatsappnumber||'').replace(/\D/g,'');
    const whatsappMode=(details?.whatsappmode||'disabled').toLowerCase();
    if(window.BAG_DAY_WHATSAPP_VISIBLE===true&&whatsappMode==='enabled'&&whatsapp.length>=8){const a=link('WhatsApp ↗','https://wa.me/'+(whatsapp.length===8?'356':'')+whatsapp,'council-link');a.rel='noopener noreferrer';a.addEventListener('click',()=>window.BAG_DAY_ANALYTICS?.event('council_whatsapp_click',councilParams));actions.append(a);}
    if(window.BAG_DAY_WHATSAPP_VISIBLE===true&&whatsappMode!=='hidden'&&(whatsappMode!=='enabled'||whatsapp.length<8)){
      const button=document.createElement('button');button.type='button';button.className='council-link council-whatsapp-disabled';button.textContent='WhatsApp';button.disabled=true;button.title='Council WhatsApp is not available yet';actions.append(button);
    }
    if(actions.childElementCount)council.append(actions);
    window.BAG_DAY_ANALYTICS?.observe(council,'council_impression',councilParams,'council:'+(placement||'generic'));
    }
    const today=sponsorDate(),paid=bookings(slotRows,locality,today,sponsorRows).map(r=>({id:String(r.sponsorid).trim().toUpperCase(),kind:'paid',displayText:r.advert.displaytext,imageURL:safeURL(r.advert.imageurl),url:safeURL(r.advert.url),month:Number(r.month),year:Number(r.year),position:Number(r.slot)}));
    const snapshot=window.BAG_DAY_COMMUNITY.snapshot(),community=snapshot.adverts.map(a=>({...a,id:'COMMUNITY_'+a.advert_id,kind:'community',displayText:a.display_text,imageURL:safeURL(a.banner_url),url:safeURL(a.destination_url)}));
    const dashboard=document.getElementById('dashboard'),plan=window.BAG_DAY_ADVERT_POLICY.plan(paid,community,snapshot.capacity,!!dashboard,new Date(),dashboard?date:null);
    renderPlacement(panel,plan.primary.entries,plan.primary.mode,locality,today,'primary');
    if(dashboard){
      let upper=document.getElementById('communityPanel');
      if(!upper){upper=document.createElement('section');upper.id='communityPanel';upper.className='sponsor-panel';upper.hidden=true;upper.setAttribute('aria-label','Community');panel.before(upper)}
      renderPlacement(upper,plan.community,'community',locality,today,'community');
      dashboard.dataset.sponsorCount=paid.length||Number(!!plan.primary.entries.length||!!plan.community.length);
    }
  }
  async function load(file){try{if(location.protocol==='file:'){return parseCSV(window.BAG_DAY_LOCAL_FILES?.[file]??'');}const r=await fetch(new URL(file,siteRoot),{cache:'no-cache'});if(!r.ok)throw new Error(r.status);return parseCSV(await r.text());}catch(e){console.warn('Bag Day could not load '+file,e);return [];}}
  const EXPORT_BASE='https://bagday-sponsor-export.davvel.workers.dev';
  const PUBLIC_CACHE_KEY='bag-day-cloudflare-sponsor-pair-v1';
  const REFRESH_INTERVAL_MS=24*60*60*1000;
  let refreshPromise=null,lastAttempt=0;
  function saveCheckedPair(){try{localStorage.setItem(PUBLIC_CACHE_KEY,JSON.stringify({format:1,version:publicationVersion,checked_at:Date.now(),sponsors:sponsorRows,slots:slotRows}));}catch(e){console.warn('Public sponsor offline cache unavailable',e);}}
  const notify=()=>{if(last)render(...last);window.dispatchEvent(new Event('bag-day-sponsors-ready'));};
  function validatePair(sponsors,slots){
    if(!Array.isArray(sponsors)||!Array.isArray(slots))throw new Error('Invalid sponsor pair');
    const ids=new Set();
    sponsors.forEach(s=>{const id=String(s.sponsorid||'').trim().toUpperCase();if(!id||ids.has(id)||typeof s.displaytext!=='string'||!s.displaytext||typeof s.sponsorname!=='string'||!s.sponsorname)throw new Error('Invalid sponsor record');if(s.url&&!safeURL(s.url)||s.imageurl&&!safeURL(s.imageurl))throw new Error('Invalid sponsor URL');ids.add(id);});
    const positions=new Set();
    slots.forEach(s=>{const month=Number(s.month),year=Number(s.year),position=Number(s.slot),id=String(s.sponsorid||'').trim().toUpperCase();if(!ids.has(id)||!s.locality||!Number.isInteger(month)||month<1||month>12||!Number.isInteger(year)||year<1||!Number.isInteger(position)||position<1)throw new Error('Invalid slot record');const key=canonical(s.locality)+'|'+year+'|'+month+'|'+position;if(positions.has(key))throw new Error('Duplicate slot position');positions.add(key);});
  }
  function readExportCSV(text,header){const first=String(text).replace(/^\uFEFF/,'').split(/\r\n|\n|\r/)[0].trim();if(first!==header)throw new Error('Unexpected CSV header');return parseCSV(text);}
  function publicationURL(path,version,file){const u=new URL(path,EXPORT_BASE);if(!/^[A-Za-z0-9_-]+$/.test(version)||u.origin!==EXPORT_BASE||u.pathname!=='/exports/'+version+'/'+file||u.search||u.hash)throw new Error('Unexpected publication URL');return u.href;}
  function readSavedPair(){try{const saved=JSON.parse(localStorage.getItem(PUBLIC_CACHE_KEY)||'null');if(saved?.format!==1||typeof saved.version!=='string')return;validatePair(saved.sponsors,saved.slots);sponsorRows=saved.sponsors;slotRows=saved.slots;publicationVersion=saved.version;const checked=Number(saved.checked_at);if(Number.isFinite(checked)&&checked>0&&checked<=Date.now()){lastAttempt=checked;}sponsorStale=!(lastAttempt&&Date.now()-lastAttempt<REFRESH_INTERVAL_MS);}catch(e){console.warn('Ignoring invalid saved sponsor data',e);}}
  async function refresh(force=false){
    if(refreshPromise)return refreshPromise;
    if(!force&&Date.now()-lastAttempt<REFRESH_INTERVAL_MS)return;
    lastAttempt=Date.now();
    refreshPromise=(async()=>{
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
      try{
        const m=await fetch(EXPORT_BASE+'/current.json',{cache:'no-cache',credentials:'omit',signal:controller.signal});if(!m.ok)throw new Error('Sponsor manifest HTTP '+m.status);const manifest=await m.json();
        if(manifest.format_version!==1||typeof manifest.version!=='string'||!Number.isInteger(manifest.sponsor_count)||manifest.sponsor_count<0||!Number.isInteger(manifest.slot_count)||manifest.slot_count<0)throw new Error('Invalid sponsor manifest');
        const urls=[publicationURL(manifest.sponsors_url,manifest.version,'sponsors.csv'),publicationURL(manifest.sponsor_slots_url,manifest.version,'sponsor_slots.csv')];
        if(manifest.version===publicationVersion){saveCheckedPair();sponsorStale=false;lastExportError=null;notify();return;}
        const texts=await Promise.all(urls.map(async url=>{const r=await fetch(url,{cache:'default',credentials:'omit',signal:controller.signal});if(!r.ok)throw new Error('Sponsor CSV HTTP '+r.status);return r.text();}));
        const s=readExportCSV(texts[0],'SponsorID,SponsorName,DisplayText,ImageURL,URL'),b=readExportCSV(texts[1],'Month,Year,Locality,Slot,SponsorID');validatePair(s,b);
        if(s.length!==manifest.sponsor_count||b.length!==manifest.slot_count)throw new Error('CSV row counts differ from manifest');
        // No await between the two assignments: activate only a complete pair.
        sponsorRows=s;slotRows=b;publicationVersion=manifest.version;sponsorStale=false;lastExportError=null;
        saveCheckedPair();
        notify();
      }catch(e){lastExportError=String(e);sponsorStale=!!publicationVersion;console.warn('Cloudflare sponsor refresh failed; retaining last complete pair',e);notify();}
      finally{clearTimeout(timer);}
    })().finally(()=>{refreshPromise=null;});
    return refreshPromise;
  }
  window.BAG_DAY_SPONSORS={render,parseCSV,bookings,safeURL,bannerURLs,refresh,status:()=>({source:'Cloudflare',version:publicationVersion,saved_data:sponsorStale,last_error:lastExportError})};
  window.addEventListener('bag-day-community-ready',()=>{if(last)render(...last);window.dispatchEvent(new Event('bag-day-sponsors-ready'))});
  function midnight(){setTimeout(()=>{notify();midnight()},Math.max(1,window.BAG_DAY_ADVERT_POLICY.nextMidnight()-Date.now()+1))}midnight();
  // Council data remains in the existing GitHub-hosted file.
  load('data/councils.csv').then(c=>{councilRows=c;notify();});
  readSavedPair();notify();refresh();
  window.addEventListener('online',()=>refresh());
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){refresh();notify()}});
  setInterval(()=>{if(document.visibilityState==='visible')refresh();},REFRESH_INTERVAL_MS);
  setInterval(()=>{if(document.visibilityState==='visible'&&last)render(...last);},60000);
})();

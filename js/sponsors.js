(() => {
  'use strict';
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
  const link=(text,url,cls)=>{const a=document.createElement('a');a.textContent=text;a.href=url;a.className=cls;a.target='_blank';a.rel='noopener noreferrer sponsored';return a;};
  function render(locality,date){
    last=[locality,date];
    const council=document.getElementById('councilPanel'),panel=document.getElementById('sponsorPanel');
    council.replaceChildren();panel.replaceChildren();
    const details=councilRows.find(r=>canonical(r.locality||r.council)===canonical(locality));
    const name=document.createElement('strong');name.textContent=details?.councilname||locality+' Local Council';const emblem=document.createElement('span');emblem.className='council-emblem';emblem.innerHTML='<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 12 16 5l12 7H4ZM7 14v11m6-11v11m6-11v11m6-11v11M4 27h24"/></svg>';emblem.setAttribute('aria-hidden','true');const identity=document.createElement('div');identity.className='council-identity';identity.append(name);council.append(emblem,identity);
    const actions=document.createElement('div');actions.className='council-actions';
    if(details&&safeURL(details.website||details.websiteurl)){const a=link('Website ↗',safeURL(details.website||details.websiteurl),'council-link');a.rel='noopener noreferrer';actions.append(a);}
    const phone=(details?.bulkytelephone||details?.phone||'').replace(/[^+0-9]/g,'');
    if(phone.length>=8){const a=document.createElement('button');a.type='button';a.className='council-link council-bulky';a.textContent='Bulky Refuse Collection';a.setAttribute('aria-haspopup','dialog');a.setAttribute('aria-controls','bulkyOverlay');a.onclick=()=>window.BAG_DAY_BULKY.open({locality,council:name.textContent,phone,website:safeURL(details?.website||details?.websiteurl),dedicated:!!details?.bulkytelephone});actions.append(a);}
    const whatsapp=(details?.whatsapp||details?.whatsappnumber||'').replace(/\D/g,'');
    const whatsappMode=(details?.whatsappmode||'disabled').toLowerCase();
    if(window.BAG_DAY_WHATSAPP_VISIBLE===true&&whatsappMode==='enabled'&&whatsapp.length>=8){const a=link('WhatsApp ↗','https://wa.me/'+(whatsapp.length===8?'356':'')+whatsapp,'council-link');a.rel='noopener noreferrer';actions.append(a);}
    if(window.BAG_DAY_WHATSAPP_VISIBLE===true&&whatsappMode!=='hidden'&&(whatsappMode!=='enabled'||whatsapp.length<8)){
      const button=document.createElement('button');button.type='button';button.className='council-link council-whatsapp-disabled';button.textContent='WhatsApp';button.disabled=true;button.title='Council WhatsApp is not available yet';actions.append(button);
    }
    if(actions.childElementCount)council.append(actions);
    const active=bookings(slotRows,locality,date,sponsorRows);panel.hidden=!active.length;
    if(active.length){
      const heading=document.createElement('div');heading.className='sponsor-heading';heading.textContent=sponsorStale?'Sponsored · saved data':'Sponsored';panel.append(heading);
      active.forEach((r,index)=>{
        const advert=r.advert;
        const a=link(advert.displaytext,safeURL(advert.url),'sponsor-link sponsor-slot-'+((index%3)+1));
        const imageURL=safeURL(advert.imageurl);
        if(imageURL){
          const image=document.createElement('img');
          image.alt=advert.displaytext;image.className='sponsor-banner';
          a.setAttribute('aria-label',advert.displaytext);
          image.onerror=()=>{a.classList.remove('sponsor-link-image');a.textContent=advert.displaytext;};
          a.classList.add('sponsor-link-image');a.replaceChildren(image);const bannerAsset=new URL(imageURL);if(bannerAsset.origin==='https://bagdaymalta.eu'&&bannerAsset.pathname.toLowerCase()==='/images/sponsors/google.png'){bannerAsset.pathname='/images/sponsors/google.png';bannerAsset.searchParams.set('v','1.0.100');}image.src=bannerAsset.href;
        }
        const trackClick=()=>{
          try{
            window.BAG_DAY_ANALYTICS?.event('sponsor_click',{
              sponsor_id:String(r.sponsorid).trim().toUpperCase(),
              sponsor_name:advert.sponsorname,
              locality,
              booking_month:Number(r.month),
              booking_year:Number(r.year),
              sponsor_slot:Number(r.slot),
              advert_format:a.classList.contains('sponsor-link-image')?'image':'text'
            });
          }catch(_){ /* Analytics must never prevent opening the sponsor website. */ }
        };
        a.addEventListener('click',trackClick);
        a.addEventListener('auxclick',event=>{if(event.button===1)trackClick();});
        panel.append(a);
      });
    }
    document.getElementById('dashboard').dataset.sponsorCount=active.length;
  }
  async function load(file){try{if(location.protocol==='file:'){return parseCSV(window.BAG_DAY_LOCAL_FILES?.[file]??'');}const r=await fetch(file,{cache:'no-cache'});if(!r.ok)throw new Error(r.status);return parseCSV(await r.text());}catch(e){console.warn('Bag Day could not load '+file,e);return [];}}
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
  window.BAG_DAY_SPONSORS={render,parseCSV,bookings,safeURL,refresh,status:()=>({source:'Cloudflare',version:publicationVersion,saved_data:sponsorStale,last_error:lastExportError})};
  // Council data remains in the existing GitHub-hosted file.
  load('data/councils.csv').then(c=>{councilRows=c;notify();});
  readSavedPair();notify();refresh();
  window.addEventListener('online',()=>refresh());
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh();});
  setInterval(()=>{if(document.visibilityState==='visible')refresh();},REFRESH_INTERVAL_MS);
})();

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
      }).slice(0,3);
  }
  let sponsorRows=[],slotRows=[],councilRows=[],last=null;
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
      const heading=document.createElement('div');heading.className='sponsor-heading';heading.textContent='Sponsored';panel.append(heading);
      active.forEach((r,index)=>{
        const advert=r.advert;
        const a=link(advert.displaytext,safeURL(advert.url),'sponsor-link sponsor-slot-'+(index+1));
        const imageURL=safeURL(advert.imageurl);
        if(imageURL){
          const image=document.createElement('img');
          image.alt=advert.displaytext;image.className='sponsor-banner';
          a.setAttribute('aria-label',advert.displaytext);
          image.onerror=()=>{a.classList.remove('sponsor-link-image');a.textContent=advert.displaytext;};
          a.classList.add('sponsor-link-image');a.replaceChildren(image);image.src=imageURL;
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
  window.BAG_DAY_SPONSORS={render,parseCSV,bookings,safeURL};
  Promise.all([load('data/sponsors.csv'),load('data/sponsor_slots.csv'),load('data/councils.csv')]).then(([s,b,c])=>{sponsorRows=s;slotRows=b;councilRows=c;if(last)render(...last);window.dispatchEvent(new Event('bag-day-sponsors-ready'));});
})();

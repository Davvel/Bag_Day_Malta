(() => {
  'use strict';
  const data = window.WASTE_DATA;
  const $ = id => document.getElementById(id);
  const localityKey = 'bag-day-locality-v1';
  const languageKey = 'bag-day-language-v1';
  const locationPromptKey = 'bag-day-location-prompt-v1';
  const followLocationKey = 'bag-day-follow-location-v1';
  const promptCooldownMs = 24*60*60*1000;
  const maxDaysAhead = 30;
  const names = data.localities.map(row => row[0]);
  let selected = names.includes(localStorage.getItem(localityKey)) ? localStorage.getItem(localityKey) : null;
  let language = localStorage.getItem(languageKey) === 'mt' ? 'mt' : 'en';
  let followLocation = (localStorage.getItem(followLocationKey) || '').toLowerCase() === 'true';
  let temporaryView = null;
  let pending = null;
  let detected = null;
  let dayOffset = 0;
  let returnTimer = null;
  let lastGpsAttempt = 0;
  let touchStart = null;
  let locationFailed = false;
  let analyticsReady = false;
  let donationConfig = null;

  function promptIsDismissed() {
    try {
      const dismissal=JSON.parse(localStorage.getItem(locationPromptKey)||'null');
      return dismissal?.selected===selected && dismissal?.detected===detected && dismissal?.until>Date.now();
    } catch (_) { return false; }
  }

  const copy = {
    mt: {
      eyebrow:'ĠBIR TAL-ISKART MILL-BIEB', previous:'Jum ta’ qabel', next:'Jum ta’ wara',
      morning:'Filgħodu',afternoon:'Wara nofsinhar',evening:'Filgħaxija',
      organic:'Skart organiku',mixed:'Skart imħallat',recycle:'Materjal riċiklabbli',
      collection:'Ħin tal-ġbir',putOut:time=>`Oħroġ minn ${time}`,glass:'Il-ħġieġ ukoll f’kontenitur li jerġa’ jintuża',glassBottles:'Fliexken tal-ħġieġ',
      noCollection:'Illum ma jinġabarx skart',swipe:'Żerżaq biex tara jum ieħor ↔',
      notice:place=>`Jidher li bħalissa tinsab f’${place}.`,noticeQuestion:'Trid tara l-iskeda ta’ hemm mingħajr ma tibdel il-lokalità tiegħek?',yes:'Ara',
      source:'Skeda uffiċjali ↗',sourceNote:'Il-ħinijiet jistgħu jinbidlu. Iċċekkja s-sit uffiċjali.',
      settings:'Is-settings',schedule:'L-ISKEDA TIEGĦEK',choose:'Agħżel il-lokalità tiegħek',
      nearby:place=>`Lokalità misjuba: ${place}. Ikkonferma jew agħżel oħra.`,
      chooseBelow:'Agħżel lokalità hawn taħt.',locating:'Qed infittxu l-lokalità tiegħek…',
      unavailable:'Ma stajniex insibu l-lokalità. Agħżilha hawn taħt.',
      locality:'Lokalità',search:'Fittex lokalità',localities:'Lokalitajiet',empty:'Ma nstabet l-ebda lokalità',
      cancel:'Ikkanċella',save:'Uża din il-lokalità',
      settingsNote:'Il-lokalità magħżula tibqa’ ssejvjata. Il-mod awtomatiku juża l-lokalità attwali biss meta jkun mixgħul.',
      locationBehaviour:'IMĠIBA TAL-LOKALITÀ',
      keepTitle:'Żomm il-lokalità magħżula',keepHelp:'Default. Il-PWA ma tibdilx il-lokalità waħedha meta tivvjaġġa.',
      followTitle:'Segwi l-lokalità attwali awtomatikament',followHelp:'Meta l-GPS isib lokalità oħra, turi l-iskeda tagħha mingħajr ma tħassar il-lokalità ssejvjata.',
      following:place=>`📍 Qed issegwi l-lokalità attwali: ${place}`,
      viewing:place=>`📍 Qed tara temporanjament: ${place}`,
      backHome:place=>`Lura għal ${place}`
    },
    en: {
      eyebrow:'HOUSEHOLD KERBSIDE COLLECTION', previous:'Previous day', next:'Next day',
      morning:'Morning',afternoon:'Afternoon',evening:'Evening',today:'TODAY',tomorrow:'TOMORROW',days:n=>`IN ${n} DAYS`,
      organic:'Organic waste',mixed:'Mixed waste',recycle:'Recyclables',
      collection:'Collection time',putOut:time=>`Put out from ${time}`,glass:'Also put out glass in a reusable container',glassBottles:'Glass bottles',
      noCollection:'No collection today',swipe:'Swipe to see another day ↔',
      notice:place=>`You seem to be in ${place} now.`,noticeQuestion:'View its schedule without changing your saved locality?',yes:'View',
      source:'Official schedule ↗',sourceNote:'Times may change. Check the official site.',
      settings:'Settings',schedule:'YOUR SCHEDULE',choose:'Choose your locality',
      nearby:place=>`Detected nearby: ${place}. Confirm or choose another.`,
      chooseBelow:'Choose a locality below.',locating:'Finding your locality…',
      unavailable:'Could not detect your locality. Choose it below.',
      locality:'Locality',search:'Search a locality',localities:'Localities',empty:'No locality found',
      cancel:'Cancel',save:'Use this locality',
      settingsNote:'Your chosen locality stays saved. Automatic mode only follows your current locality while that option is enabled.',
      locationBehaviour:'LOCATION BEHAVIOUR',
      keepTitle:'Keep my chosen locality',keepHelp:'Default. The PWA does not silently switch locality when you travel.',
      followTitle:'Follow my current location automatically',followHelp:'When GPS detects another locality, show its schedule without replacing your saved locality.',
      following:place=>`📍 Following current location: ${place}`,
      viewing:place=>`📍 Temporarily viewing: ${place}`,
      backHome:place=>`Back to ${place}`
    }
  };
  const t = () => copy[language];
  const malteseDays=['Il-Ħadd','It-Tnejn','It-Tlieta','L-Erbgħa','Il-Ħamis','Il-Ġimgħa','Is-Sibt'];
  const malteseMonths=['Jannar','Frar','Marzu','April','Mejju','Ġunju','Lulju','Awwissu','Settembru','Ottubru','Novembru','Diċembru'];
  const timeOfDay = time => {const hour=Number(time.slice(0,2));return hour<12?t().morning:hour<18?t().afternoon:t().evening;};
  const normal = s => (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[ħĦ]/g,'h').replace(/[’']/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const rowFor = name => data.localities.find(row => row[0] === name);
  const activeLocality = () => (followLocation && detected) ? detected : (temporaryView || selected);

  const maltaToday = () => {
    const parts = new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Malta',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const get = type => Number(parts.find(p => p.type === type).value);
    return new Date(Date.UTC(get('year'),get('month')-1,get('day'),12));
  };
  const shownDate = () => { const date=maltaToday();date.setUTCDate(date.getUTCDate()+dayOffset);return date; };
  const formatTime = time => {const [h,m]=time.split(':').map(Number);return `${String((h+20)%24).padStart(2,'0')}:${String(m).padStart(2,'0')}`;};
  const bagSvg = type => {
    const p={organic:['#f6f9fa','#d0dce4','#8496a1'],mixed:['#273341','#101c2a','#475a6c'],recycle:['#a5acb0','#707c83','#5a6871']}[type];
    return `<svg viewBox="0 0 150 160" role="img" aria-label="${t()[type]}"><defs><linearGradient id="bagFill" x1="0" x2="1"><stop stop-color="${p[0]}"/><stop offset=".58" stop-color="${p[1]}"/><stop offset="1" stop-color="${p[0]}"/></linearGradient></defs><path d="M56 25 47 11l14 7 14-10 14 10 14-7-9 14-4 14 15 17 20 81q3 14-12 17H37q-15-3-12-17l20-81 15-17Z" fill="url(#bagFill)" stroke="${p[2]}" stroke-width="2"/><path d="M56 40q19 9 38 0M61 49q15 6 28 0" fill="none" stroke="${p[2]}" stroke-width="3" stroke-linecap="round" opacity=".8"/><path d="M48 74q-9 32-11 55" fill="none" stroke="white" stroke-width="5" stroke-linecap="round" opacity=".22"/></svg>`;
  };

  function scheduleFor(date) {
    const weekday=date.getUTCDay();
    const bags={1:'organic',2:'mixed',3:'organic',4:'recycle',5:'organic',6:'mixed'};
    const fridayNumber=Math.floor((date.getUTCDate()-1)/7)+1;
    return {bag:bags[weekday]||null,glass:weekday===5&&(fridayNumber===1||fridayNumber===3)};
  }

  function parseConfig(text){
    const out={};
    for(const raw of text.split(/\r?\n/)){
      const line=raw.trim();
      if(!line || line.startsWith('#')) continue;
      const idx=line.indexOf('=');
      if(idx<0) continue;
      out[line.slice(0,idx).trim()]=line.slice(idx+1).trim();
    }
    return out;
  }

  async function fetchLiveConfig(file){
    const sep=file.includes('?')?'&':'?';
    const url=`${file}${sep}v=${Date.now()}`;
    const response=await fetch(url,{cache:'no-store',headers:{'Cache-Control':'no-cache'}});
    if(!response.ok) throw new Error('Config unavailable');
    return parseConfig(await response.text());
  }

  function analyticsEvent(name,params={}){
    if(!analyticsReady || typeof window.gtag!=='function') return;
    window.gtag('event',name,params);
  }

  async function loadAnalytics(){
    try{
      const cfg=await fetchLiveConfig('./analytics_config.txt');
      if(String(cfg.Analytics_Enabled||'').toLowerCase()!=='true') return;
      const id=String(cfg.Measurement_ID||'').trim();
      if(!/^G-[A-Z0-9]+$/i.test(id) || id==='G-XXXXXXXXXX') return;
      window.dataLayer=window.dataLayer||[];
      window.gtag=function(){window.dataLayer.push(arguments);};
      window.gtag('js',new Date());
      window.gtag('config',id,{anonymize_ip:true,allow_google_signals:false,allow_ad_personalization_signals:false});
      const script=document.createElement('script');
      script.async=true; script.src=`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
      script.onload=()=>{analyticsReady=true;};
      document.head.appendChild(script);
    }catch(_){ /* analytics is optional */ }
  }

  function renderDonation(){
    const card=$('donationCard');
    const cfg=donationConfig;
    card.hidden=true;
    card.removeAttribute('href');
    if(!cfg || String(cfg.Donation_Visible||'').toLowerCase()!=='true') return;
    const text=String((language==='mt' && cfg.Donation_Text_MT) || cfg.Donation_Text || '').trim();
    const link=String(cfg.Donation_Link||'').trim();
    let url;
    try{url=new URL(link);}catch(_){return;}
    if(!text || url.protocol!=='https:') return;
    const detail=String((language==='mt' && cfg.Donation_Detail_MT) || cfg.Donation_Detail || '').trim();
    const label=String((language==='mt' && cfg.Donation_Button_MT) || cfg.Donation_Button || (language==='mt'?'Appoġġ':'Support')).trim();
    $('donationText').textContent=text;
    $('donationDetail').textContent=detail;
    $('donationDetail').hidden=!detail;
    $('donationButton').textContent=label;
    card.href=url.href;
    card.setAttribute('aria-label',`${text}. ${label}. ${detail}`);
    card.hidden=false;
  }

  async function loadDonation(){
    try{
      donationConfig=await fetchLiveConfig('./donation_config.txt');
    }catch(_){donationConfig=null;}
    renderDonation();
  }

  function renderStaticText() {
    const c=t();
    renderDonation();
    document.documentElement.lang=language;
    $('langMt').setAttribute('aria-pressed',String(language==='mt'));
    $('langEn').setAttribute('aria-pressed',String(language==='en'));
    $('settingsButton').setAttribute('aria-label',c.settings);
    $('settingsButton').title=c.settings;
    $('eyebrow').textContent=c.eyebrow;
    $('prevDay').setAttribute('aria-label',c.previous);
    $('nextDay').setAttribute('aria-label',c.next);
    $('swipeHint').textContent=c.swipe;
    $('noticeQuestion').textContent=c.noticeQuestion;
    $('switchButton').textContent=c.yes;
    $('sourceLink').textContent=c.source;
    $('sourceNote').textContent=c.sourceNote;
    $('settingsEyebrow').textContent=c.schedule;
    $('settingsTitle').textContent=c.choose;
    $('closeSettings').setAttribute('aria-label',c.cancel);
    $('localityLabel').textContent=c.locality;
    $('localitySearch').placeholder=c.search;
    $('localityList').setAttribute('aria-label',c.localities);
    $('cancelSettings').textContent=c.cancel;
    $('saveSettings').textContent=c.save;
    $('settingsNote').textContent=c.settingsNote;
    $('locationBehaviourLabel').textContent=c.locationBehaviour;
    $('keepLocalityTitle').textContent=c.keepTitle;
    $('keepLocalityHelp').textContent=c.keepHelp;
    $('followLocationTitle').textContent=c.followTitle;
    $('followLocationHelp').textContent=c.followHelp;
    $('keepLocalityMode').checked=!followLocation;
    $('followLocationMode').checked=followLocation;
    updateGpsStatus();
  }

  function renderLocationMode(){
    const bar=$('locationModeBar'), text=$('locationModeText'), back=$('returnHomeButton');
    const current=activeLocality();
    if(followLocation && detected){
      bar.hidden=false; text.textContent=t().following(detected); back.hidden=true; return;
    }
    if(temporaryView && temporaryView!==selected){
      bar.hidden=false; text.textContent=t().viewing(temporaryView); back.hidden=false; back.textContent=t().backHome(selected); return;
    }
    bar.hidden=true; back.hidden=true;
  }

  function render() {
    renderStaticText();
    const locality=activeLocality();
    $('dashboard').hidden=!locality;
    if(!locality)return;
    const c=t(),date=shownDate();
    const day=language==='mt'?malteseDays[date.getUTCDay()]:new Intl.DateTimeFormat('en-GB',{weekday:'long',timeZone:'UTC'}).format(date);
    $('title').textContent=locality;
    const fullDate=language==='mt'?`${date.getUTCDate()} ta’ ${malteseMonths[date.getUTCMonth()]} ${date.getUTCFullYear()}`:new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(date);
    $('date').textContent=`${day}, ${fullDate}`;
    $('todayPill').hidden=language==='mt';
    if(language==='en')$('todayPill').textContent=dayOffset===0?c.today:dayOffset===1?c.tomorrow:c.days(dayOffset);
    renderLocationMode();
    $('prevDay').disabled=dayOffset===0;
    $('nextDay').disabled=dayOffset===maxDaysAhead;
    const schedule=scheduleFor(date);
    if(!schedule.bag){
      $('bagArea').innerHTML=`<div class="collection-card no-collection"><div class="rest-icon" aria-hidden="true">☀</div><div class="bag-name">${c.noCollection}</div></div>`;
    }else{
      const row=rowFor(locality),time=date.getUTCDay()===6&&row[2]?row[2]:row[1];
      const figures=schedule.glass
        ? `<div class="collection-figures"><div class="collection-item"><div class="bag-figure">${bagSvg(schedule.bag)}</div><span class="collection-item-label">${c[schedule.bag]}</span></div><div class="collection-item"><div class="bag-figure"><img src="icons/glass-carrier.svg" alt="${c.glassBottles}"></div><span class="collection-item-label">${c.glassBottles}</span></div></div>`
        : `<div class="bag-figure">${bagSvg(schedule.bag)}</div><div class="bag-name">${c[schedule.bag]}</div>`;
      $('bagArea').innerHTML=`<div class="collection-card">${figures}<div class="time-box"><div class="time-label">${c.collection}</div><div class="time-value"><span>${time}</span><span class="time-period">(${timeOfDay(time)})</span></div><div class="put-out">${c.putOut(formatTime(time))}</div></div>${schedule.glass?`<div class="glass-note">${c.glass}</div>`:''}</div>`;
    }
    const different=!followLocation && !temporaryView && detected&&detected!==selected&&!promptIsDismissed();
    $('locationNotice').hidden=!different;
    if(different)$('noticeText').textContent=c.notice(detected);
  }

  function updateGpsStatus() {
    if($('settingsOverlay').hidden)return;
    $('gpsStatus').textContent=detected?t().nearby(detected):locationFailed?t().unavailable:lastGpsAttempt?t().locating:t().chooseBelow;
  }

  function setLanguage(value) {
    language=value;
    localStorage.setItem(languageKey,value);
    analyticsEvent('language_changed',{language:value});
    render();
    if(!$('settingsOverlay').hidden)listOptions();
  }

  function changeDay(delta) {
    dayOffset=Math.max(0,Math.min(maxDaysAhead,dayOffset+delta));render();
    clearTimeout(returnTimer);
    if(dayOffset)returnTimer=setTimeout(()=>{dayOffset=0;render();},60000);
  }

  function listOptions() {
    const query=normal($('localitySearch').value);
    const matching=data.localities.filter(row=>[row[0],...(row[3]||[])].some(name=>normal(name).includes(query)));
    $('localityList').replaceChildren();
    if(!matching.length){const empty=document.createElement('div');empty.className='empty-list';empty.textContent=t().empty;$('localityList').append(empty);return;}
    matching.forEach(row=>{
      const button=document.createElement('button');button.type='button';button.className='locality-option';button.setAttribute('role','option');
      button.setAttribute('aria-selected',String(row[0]===pending));button.textContent=row[0];
      button.onclick=()=>{pending=row[0];$('localitySearch').value=row[0];$('saveSettings').disabled=false;listOptions();};
      $('localityList').append(button);
    });
  }

  function openSettings(suggestion) {
    pending=suggestion||selected||detected||null;
    $('localitySearch').value=pending||'';
    $('settingsOverlay').hidden=false;
    $('closeSettings').hidden=!selected;
    $('cancelSettings').hidden=!selected;
    $('saveSettings').disabled=!pending;
    renderStaticText();listOptions();
    // Do not force the on-screen keyboard open on phones/tablets.
    // Desktop users still get the convenience of immediate typing.
    const mobileLike = window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 600;
    if (mobileLike) {
      $('localitySearch').blur();
      $('.settings')?.scrollTo?.({top:0,behavior:'instant'});
    } else {
      $('localitySearch').focus({preventScroll:true});
    }
  }
  function closeSettings(){if(selected){$('settingsOverlay').hidden=true;pending=null;}}

  function identifyPlace(address,latitude) {
    const candidates=[address.city,address.town,address.village,address.municipality,address.suburb,address.neighbourhood,address.city_district,address.county].filter(Boolean);
    for(const candidate of candidates){
      if(normal(candidate)==='rabat'&&latitude>36.015)return 'Rabat (Gozo)';
      if(normal(candidate)==='zebbug'&&latitude>36.015)return 'Żebbuġ (Gozo)';
      const hits=data.localities.filter(row=>[row[0],...(row[3]||[])].some(alias=>normal(alias)===normal(candidate)));
      if(hits.length===1)return hits[0][0];
      if(hits.length>1){const island=latitude>36.015?'Gozo':'Malta';const hit=hits.find(row=>row[0].includes(island));if(hit)return hit[0];}
    }
    return null;
  }

  function detectionUnavailable() {locationFailed=true;updateGpsStatus();}
  function detectLocation() {
    if(!navigator.geolocation){detectionUnavailable();return;}
    if(Date.now()-lastGpsAttempt<60000)return;
    lastGpsAttempt=Date.now();updateGpsStatus();
    navigator.geolocation.getCurrentPosition(async position=>{
      try{
        const {latitude,longitude}=position.coords;
        analyticsEvent('gps_used');
        if(latitude<35.78||latitude>36.09||longitude<14.17||longitude>14.6){detectionUnavailable();return;}
        const url=`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=14&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`;
        const response=await fetch(url,{headers:{'Accept-Language':'en'}});
        if(!response.ok){detectionUnavailable();return;}
        const newlyDetected=identifyPlace((await response.json()).address||{},latitude);
        if(!newlyDetected){detectionUnavailable();return;}
        if(detected && newlyDetected!==detected && temporaryView) temporaryView=null;
        detected=newlyDetected;
        locationFailed=false;
        if(!selected&&!$('settingsOverlay').hidden&&!$('localitySearch').value.trim()){
          pending=detected;$('localitySearch').value=detected;$('saveSettings').disabled=false;listOptions();
        }
        updateGpsStatus();render();
      }catch(_){detectionUnavailable();}
    },detectionUnavailable,{enableHighAccuracy:false,timeout:10000,maximumAge:300000});
  }

  $('langMt').onclick=()=>setLanguage('mt');
  $('langEn').onclick=()=>setLanguage('en');
  function finishLanguage(value){setLanguage(value);$('languageOverlay').hidden=true;if(!selected)openSettings();detectLocation();}
  $('chooseMt').onclick=()=>finishLanguage('mt');
  $('chooseEn').onclick=()=>finishLanguage('en');
  $('settingsButton').onclick=()=>openSettings();
  $('switchButton').onclick=()=>{
    if(!detected)return;
    temporaryView=detected;
    localStorage.setItem(locationPromptKey,JSON.stringify({selected,detected,until:Date.now()+promptCooldownMs}));
    analyticsEvent('current_locality_viewed');
    dayOffset=0;render();
  };
  $('returnHomeButton').onclick=()=>{temporaryView=null;dayOffset=0;render();};
  $('keepLocalityMode').onchange=()=>{
    if(!$('keepLocalityMode').checked)return;
    followLocation=false;temporaryView=null;localStorage.setItem(followLocationKey,'false');render();
  };
  $('followLocationMode').onchange=()=>{
    if(!$('followLocationMode').checked)return;
    followLocation=true;temporaryView=null;localStorage.setItem(followLocationKey,'true');analyticsEvent('follow_location_enabled');detectLocation();render();
  };
  $('closeSettings').onclick=closeSettings;
  $('cancelSettings').onclick=closeSettings;
  $('saveSettings').onclick=()=>{
    if(!pending)return;
    selected=pending;temporaryView=null;localStorage.setItem(localityKey,selected);
    analyticsEvent('locality_changed');
    $('settingsOverlay').hidden=true;dayOffset=0;render();
  };
  $('localitySearch').oninput=()=>{pending=null;$('saveSettings').disabled=true;listOptions();};
  $('prevDay').onclick=()=>changeDay(-1);
  $('nextDay').onclick=()=>changeDay(1);
  $('donationCard').addEventListener('click',()=>analyticsEvent('donation_click',{language}));
  $('dashboard').addEventListener('touchstart',e=>{touchStart={x:e.changedTouches[0].screenX,y:e.changedTouches[0].screenY};},{passive:true});
  $('dashboard').addEventListener('touchend',e=>{if(!touchStart)return;const dx=e.changedTouches[0].screenX-touchStart.x,dy=e.changedTouches[0].screenY-touchStart.y;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5)changeDay(dx<0?1:-1);touchStart=null;},{passive:true});
  document.addEventListener('keydown',e=>{if(!$('languageOverlay').hidden)return;if(!$('settingsOverlay').hidden){if(e.key==='Escape')closeSettings();return;}if(e.key==='ArrowRight')changeDay(1);if(e.key==='ArrowLeft')changeDay(-1);});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();loadDonation();if($('languageOverlay').hidden)detectLocation();}});
  setInterval(()=>{if(dayOffset===0)render();},60000);
  render();
  loadDonation();
  loadAnalytics();
  if(!selected)openSettings();detectLocation();
  if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
})();

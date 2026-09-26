(() => {
  'use strict';
  const data = window.WASTE_DATA;
  const $ = id => document.getElementById(id);
  const localityKey = 'bag-day-locality-v1';
  const languageKey = 'bag-day-language-v1';
  const locationPromptKey = 'bag-day-location-prompt-v1';
  const promptCooldownMs = 24*60*60*1000;
  const names = data.localities.map(row => row[0]);
  let selected = names.includes(localStorage.getItem(localityKey)) ? localStorage.getItem(localityKey) : null;
  let language = localStorage.getItem(languageKey) === 'mt' ? 'mt' : 'en';
  let pending = null;
  let detected = null;
  let dayOffset = 0;
  let returnTimer = null;
  let lastGpsAttempt = 0;
  let touchStart = null;
  let locationFailed = false;
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
      notice:place=>`Jidher li bħalissa tinsab f’${place}.`,noticeQuestion:'Trid tuża l-iskeda ta’ hemm?',yes:'Iva',
      source:'Skeda uffiċjali ↗',sourceNote:'Il-ħinijiet jistgħu jinbidlu. Iċċekkja s-sit uffiċjali.',
      settings:'Is-settings',schedule:'L-ISKEDA TIEGĦEK',choose:'Agħżel il-lokalità tiegħek',
      nearby:place=>`Lokalità misjuba: ${place}. Ikkonferma jew agħżel oħra.`,
      chooseBelow:'Agħżel lokalità hawn taħt.',locating:'Qed infittxu l-lokalità tiegħek…',
      unavailable:'Ma stajniex insibu l-lokalità. Agħżilha hawn taħt.',
      locality:'Lokalità',search:'Fittex lokalità',localities:'Lokalitajiet',empty:'Ma nstabet l-ebda lokalità',
      cancel:'Ikkanċella',save:'Uża din il-lokalità',
      settingsNote:'L-għażla tiegħek tibqa’ l-istess meta tivvjaġġa. Tista’ tibdilha biss int.'
    },
    en: {
      eyebrow:'HOUSEHOLD KERBSIDE COLLECTION', previous:'Previous day', next:'Next day',
      morning:'Morning',afternoon:'Afternoon',evening:'Evening',today:'TODAY',tomorrow:'TOMORROW',days:n=>`IN ${n} DAYS`,
      organic:'Organic waste',mixed:'Mixed waste',recycle:'Recyclables',
      collection:'Collection time',putOut:time=>`Put out from ${time}`,glass:'Also put out glass in a reusable container',glassBottles:'Glass bottles',
      noCollection:'No collection today',swipe:'Swipe to see another day ↔',
      notice:place=>`You seem to be in ${place} now.`,noticeQuestion:'Would you like to use its schedule?',yes:'Yes',
      source:'Official schedule ↗',sourceNote:'Times may change. Check the official site.',
      settings:'Settings',schedule:'YOUR SCHEDULE',choose:'Choose your locality',
      nearby:place=>`Detected nearby: ${place}. Confirm or choose another.`,
      chooseBelow:'Choose a locality below.',locating:'Finding your locality…',
      unavailable:'Could not detect your locality. Choose it below.',
      locality:'Locality',search:'Search a locality',localities:'Localities',empty:'No locality found',
      cancel:'Cancel',save:'Use this locality',
      settingsNote:'Your selected locality stays the same when you travel. Only you can change it.'
    }
  };
  const t = () => copy[language];
  const malteseDays=['Il-Ħadd','It-Tnejn','It-Tlieta','L-Erbgħa','Il-Ħamis','Il-Ġimgħa','Is-Sibt'];
  const malteseMonths=['Jannar','Frar','Marzu','April','Mejju','Ġunju','Lulju','Awwissu','Settembru','Ottubru','Novembru','Diċembru'];
  const timeOfDay = time => {const hour=Number(time.slice(0,2));return hour<12?t().morning:hour<18?t().afternoon:t().evening;};
  const normal = s => (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[ħĦ]/g,'h').replace(/[’']/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const rowFor = name => data.localities.find(row => row[0] === name);
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
  function renderStaticText() {
    const c=t();
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
    updateGpsStatus();
  }
  function render() {
    renderStaticText();
    $('dashboard').hidden=!selected;
    if(!selected)return;
    const c=t(),date=shownDate();
    const day=language==='mt'?malteseDays[date.getUTCDay()]:new Intl.DateTimeFormat('en-GB',{weekday:'long',timeZone:'UTC'}).format(date);
    $('title').textContent=selected;
    const fullDate=language==='mt'?`${date.getUTCDate()} ta’ ${malteseMonths[date.getUTCMonth()]} ${date.getUTCFullYear()}`:new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(date);
    $('date').textContent=`${day}, ${fullDate}`;
    $('todayPill').hidden=language==='mt';
    if(language==='en')$('todayPill').textContent=dayOffset===0?c.today:dayOffset===1?c.tomorrow:c.days(dayOffset);
    $('prevDay').disabled=dayOffset===0;
    $('nextDay').disabled=dayOffset===6;
    const schedule=scheduleFor(date);
    if(!schedule.bag){
      $('bagArea').innerHTML=`<div class="collection-card no-collection"><div class="rest-icon" aria-hidden="true">☀</div><div class="bag-name">${c.noCollection}</div></div>`;
    }else{
      const row=rowFor(selected),time=date.getUTCDay()===6&&row[2]?row[2]:row[1];
      const figures=schedule.glass
        ? `<div class="collection-figures"><div class="collection-item"><div class="bag-figure">${bagSvg(schedule.bag)}</div><span class="collection-item-label">${c[schedule.bag]}</span></div><div class="collection-item"><div class="bag-figure"><img src="icons/glass-carrier.svg" alt="${c.glassBottles}"></div><span class="collection-item-label">${c.glassBottles}</span></div></div>`
        : `<div class="bag-figure">${bagSvg(schedule.bag)}</div><div class="bag-name">${c[schedule.bag]}</div>`;
      $('bagArea').innerHTML=`<div class="collection-card">${figures}<div class="time-box"><div class="time-label">${c.collection}</div><div class="time-value"><span>${time}</span><span class="time-period">(${timeOfDay(time)})</span></div><div class="put-out">${c.putOut(formatTime(time))}</div></div>${schedule.glass?`<div class="glass-note">${c.glass}</div>`:''}</div>`;
    }
    const different=detected&&detected!==selected&&!promptIsDismissed();
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
    render();
    if(!$('settingsOverlay').hidden)listOptions();
  }
  function changeDay(delta) {
    dayOffset=Math.max(0,Math.min(6,dayOffset+delta));render();
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
    pending=suggestion||detected||selected||null;
    $('localitySearch').value=pending||'';
    $('settingsOverlay').hidden=false;
    $('closeSettings').hidden=!selected;
    $('cancelSettings').hidden=!selected;
    $('saveSettings').disabled=!pending;
    renderStaticText();listOptions();
    $('localitySearch').focus();
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
        if(latitude<35.78||latitude>36.09||longitude<14.17||longitude>14.6){detectionUnavailable();return;}
        const url=`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=14&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`;
        const response=await fetch(url,{headers:{'Accept-Language':'en'}});
        if(!response.ok){detectionUnavailable();return;}
        detected=identifyPlace((await response.json()).address||{},latitude);
        if(!detected){detectionUnavailable();return;}
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
    localStorage.setItem(locationPromptKey,JSON.stringify({selected,detected,until:Date.now()+promptCooldownMs}));
    render();
    openSettings(detected);
  };
  $('closeSettings').onclick=closeSettings;
  $('cancelSettings').onclick=closeSettings;
  $('saveSettings').onclick=()=>{if(!pending)return;selected=pending;localStorage.setItem(localityKey,selected);$('settingsOverlay').hidden=true;dayOffset=0;render();};
  $('localitySearch').oninput=()=>{pending=null;$('saveSettings').disabled=true;listOptions();};
  $('prevDay').onclick=()=>changeDay(-1);
  $('nextDay').onclick=()=>changeDay(1);
  $('dashboard').addEventListener('touchstart',e=>{touchStart={x:e.changedTouches[0].screenX,y:e.changedTouches[0].screenY};},{passive:true});
  $('dashboard').addEventListener('touchend',e=>{if(!touchStart)return;const dx=e.changedTouches[0].screenX-touchStart.x,dy=e.changedTouches[0].screenY-touchStart.y;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5)changeDay(dx<0?1:-1);touchStart=null;},{passive:true});
  document.addEventListener('keydown',e=>{if(!$('languageOverlay').hidden)return;if(!$('settingsOverlay').hidden){if(e.key==='Escape')closeSettings();return;}if(e.key==='ArrowRight')changeDay(1);if(e.key==='ArrowLeft')changeDay(-1);});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();if($('languageOverlay').hidden)detectLocation();}});
  setInterval(()=>{if(dayOffset===0)render();},60000);
  render();
  if(!selected)openSettings();detectLocation();
  if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
})();

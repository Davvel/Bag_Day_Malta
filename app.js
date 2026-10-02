(() => {
  'use strict';
  const data = window.WASTE_DATA;
  const $ = id => document.getElementById(id);
  // Show once per tab session; refreshes go directly to the app.
  const splash = $('splashScreen');
  const appContent = $('appContent');
  const splashSeenKey = 'bag-day-splash-session-v1';
  let splashSeen = false;
  try {
    splashSeen = sessionStorage.getItem(splashSeenKey) === 'true';
    sessionStorage.setItem(splashSeenKey, 'true');
  } catch (_) {
    // Retain refresh behaviour if browser storage is unavailable.
    splashSeen = window.performance?.getEntriesByType('navigation')[0]?.type === 'reload';
  }
  let splashTimer;
  let splashFadeTimer;
  let splashFading = false;
  function finishSplash() {
    clearTimeout(splashTimer);
    clearTimeout(splashFadeTimer);
    splash.hidden = true;
    setTimeout(maybeShowSupport,400);
    appContent.inert = false;
    if (document.activeElement === splash) {
      const target = !$('settingsOverlay').hidden ? $('homeLocalitySelect') : $('settingsButton');
      target.focus({preventScroll:true});
    }
  }
  function fadeSplash() {
    if (splash.hidden || splashFading) return;
    splashFading = true;
    splash.classList.add('splash-leaving');
    splashFadeTimer = setTimeout(finishSplash, 600);
  }
  splash.addEventListener('pointerdown', e => { e.preventDefault(); finishSplash(); });
  splash.addEventListener('click', finishSplash);
  splash.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); finishSplash(); }
  });
  if (!splashSeen) {
    splash.hidden = false;
    appContent.inert = true;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    splashTimer = setTimeout(reducedMotion ? finishSplash : fadeSplash, reducedMotion ? 6000 : 5400);
  }

  const localityKey = 'bag-day-locality-v1';
  const locationPromptKey = 'bag-day-location-prompt-v1';
  const followLocationKey = 'bag-day-follow-location-v1';
  const promptCooldownMs = 24*60*60*1000;
  const maxDaysAhead = 30;
  const names = data.localities.map(row => row[0]);
  let selected = names.includes(localStorage.getItem(localityKey)) ? localStorage.getItem(localityKey) : null;
  const language = 'en';
  let followLocation = (localStorage.getItem(followLocationKey) || '').toLowerCase() === 'true';
  let temporaryView = null;
  let detected = null;
  let dayOffset = 0;
  let returnTimer = null;
  let lastGpsAttempt = 0;

  let locationFailed = false;
  let analyticsReady = false;
  const analyticsConsentKey='bag-day-analytics-consent-v1';
  let analyticsLoading=false,analyticsId='';
  function analyticsAllowed(){return localStorage.getItem(analyticsConsentKey)==='granted';}
  function setAnalyticsChoice(allowed){
    localStorage.setItem(analyticsConsentKey,allowed?'granted':'denied');
    $('analyticsConsent').hidden=true;
    $('allowAnalytics').checked=allowed;
    if(allowed){loadAnalytics();return;}
    analyticsReady=false;
    if(analyticsId)window['ga-disable-'+analyticsId]=true;
    // Remove existing Analytics cookies after withdrawal.
    document.cookie.split(';').forEach(pair=>{
      const name=pair.trim().split('=')[0];if(!/^_ga($|_)/.test(name))return;
      const parts=location.hostname.split('.');
      document.cookie=name+'=; Max-Age=0; path=/';
      for(let i=0;i<parts.length-1;i++)document.cookie=name+'=; Max-Age=0; path=/; domain=.'+parts.slice(i).join('.');
    });
    if(analyticsId)location.reload();
  }
  $('acceptAnalytics').onclick=()=>setAnalyticsChoice(true);
  $('declineAnalytics').onclick=()=>setAnalyticsChoice(false);
  $('allowAnalytics').checked=analyticsAllowed();
  $('allowAnalytics').onchange=e=>setAnalyticsChoice(e.target.checked);
  let donationConfig = null;
  const supportHiddenKey='bag-day-support-hidden-until-v2';
  const supportLastShownKey='bag-day-support-last-shown-v2';
  const supportPeriod=30*24*60*60*1000;
  // Convert the previous permanent hide preference to a 30-day pause once.
  if(localStorage.getItem('bag-day-support-hidden-v1')==='true'&&!localStorage.getItem(supportHiddenKey))localStorage.setItem(supportHiddenKey,String(Date.now()+supportPeriod));
  localStorage.removeItem('bag-day-support-hidden-v1');
  let supportHidden=false,donationUrl=null,supportReturnFocus=null,previousOverflow='';
  const tipAmounts=[2,5,10,20];
  let chosenTip=null,sliderValue=0,sliderDrag=null,checkoutOpening=false;
  function supportIsHidden(){
    const until=Number(localStorage.getItem(supportHiddenKey))||0;
    supportHidden=until>Date.now();
    if(until&&!supportHidden)localStorage.removeItem(supportHiddenKey);
    return supportHidden;
  }

  function promptIsDismissed() {
    try {
      const dismissal=JSON.parse(localStorage.getItem(locationPromptKey)||'null');
      return dismissal?.selected===selected && dismissal?.detected===detected && dismissal?.until>Date.now();
    } catch (_) { return false; }
  }

  const copy = {
    en: {
      eyebrow:'HOUSEHOLD KERBSIDE COLLECTION', previous:'Previous day', next:'Next day',
      morning:'Morning',afternoon:'Afternoon',evening:'Evening',today:'TODAY',tomorrow:'TOMORROW',days:n=>`IN ${n} DAYS`,
      organic:'Organic waste',mixed:'Mixed waste',recycle:'Recyclables',
      collection:'Collection time',putOut:time=>`Put out from ${time}`,glass:'Also put out glass in a reusable container',glassBottles:'Glass bottles',
      noCollection:'No collection today',swipe:'Swipe to see another day ↔',
      notice:place=>`You seem to be in ${place} now.`,noticeQuestion:'View its schedule without changing your saved locality?',yes:'View',
      source:'Official schedule ↗',sourceNote:'Times may change. Check the official site.',
      settings:'Settings',schedule:'BAG DAY MALTA',choose:'Choose your locality',
      nearby:place=>`Detected nearby: ${place}`,
      chooseBelow:'Choose a locality below.',locating:'Finding your locality…',
      unavailable:'Could not detect your locality. Choose it below.',
      locality:'Locality',search:'Search a locality',localities:'Localities',empty:'No locality found',
      cancel:'Cancel',save:'Set as my home locality',done:'Done',homeLocalityTitle:'Home locality',homeLocalityHelp:'Choose the locality whose collection schedule you want to keep as your home.',savedHome:place=>`Saved home: ${place}`,noSavedHome:'No home locality saved yet.',locationModeNote:'Choose what to show when you travel. Changes save immediately.',supportSettingsTitle:'Support Bag Day',
      settingsNote:'Select a locality, then tap “Set as my home locality” to save it.',
      locationBehaviour:'Location when travelling',
      keepTitle:'Keep my home locality',keepHelp:'Default. The PWA does not silently switch locality when you travel.',
      followTitle:'Follow my current location automatically',followHelp:'When GPS detects another locality, show its schedule without replacing your saved locality.',
      following:place=>`📍 Following current location: ${place}`,
      viewing:place=>`📍 Temporarily viewing: ${place}`,
      backHome:place=>`Back to ${place}`,
      supportTitle:'Glad you found this app useful.',
      supportIntro:'Buy us a Coffee',


      showSupport:'Support button and monthly reminder',

      tipThanks:'Thank you for your tip.',tipAmountLabel:amount=>`Choose €${amount} — slide to confirm`,tipAmountsLabel:'Choose a tip amount',
      dismissSupport:'Maybe later',closeSupport:'Close support panel' 
    }
  };
  const t = () => copy[language];
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
  const bagSvg = type => `<img src="icons/bag-${type}.svg" alt="${t()[type]} bag with a large waste sorting symbol">`;
  const bagButton = (type, label) => `<button type="button" class="bag-figure bag-button" data-waste-type="${type}" aria-label="What goes in ${label.toLowerCase()}?" aria-haspopup="dialog" aria-controls="wasteOverlay">${type==='glass'?'<img src="icons/glass-carrier.svg" alt="Glass bottles and jars in a reusable container">':bagSvg(type)}<span class="tap-hand" aria-hidden="true"><svg viewBox="0 0 40 48"><path d="M14 26V8a4 4 0 0 1 8 0v13c1-4 7-4 8 0 3-3 8-1 8 3v10c0 7-5 12-12 12h-3c-5 0-8-2-11-6L4 29c-3-5 3-9 7-5l3 2Z" fill="#fff" stroke="#123453" stroke-width="2.5" stroke-linejoin="round"/></svg></span></button>`;

  let wasteReturnFocus = null;
  let wastePreviousOverflow = '';
  let wasteCloseTimer = null;
  let wasteAppWasInert = false;
  function openWasteGuide(type, trigger) {
    const info=window.WASTE_GUIDE[type];
    if(!info)return;
    clearTimeout(wasteCloseTimer);
    wasteReturnFocus=trigger;
    wastePreviousOverflow=document.body.style.overflow;
    wasteAppWasInert=appContent.inert;
    document.body.style.overflow='hidden';
    appContent.inert=true;
    $('wasteOverlay').classList.remove('waste-closing');
    $('wasteColour').textContent=info.colour;
    $('wasteTitle').textContent=info.title;
    $('wasteSummary').textContent=info.summary;
    $('wasteNote').textContent=info.note;
    $('wasteKeepOut').textContent=info.keepOut;
    $('wastePreview').innerHTML=type==='glass'?'<img src="icons/glass-carrier.svg" alt="">':bagSvg(type);
    $('wasteItems').replaceChildren();
    for(const [heading,items] of info.groups){
      const section=document.createElement('section');
      const title=document.createElement('h3');title.textContent=heading;section.append(title);
      const list=document.createElement('ul');
      for(const text of items){const item=document.createElement('li');item.textContent=text;list.append(item);}
      section.append(list);$('wasteItems').append(section);
    }
    $('wasteOverlay').hidden=false;
    $('wasteScroll').scrollTop=0;
    $('closeWaste').focus({preventScroll:true});
  }
  function closeWasteGuide() {
    if($('wasteOverlay').hidden || $('wasteOverlay').classList.contains('waste-closing'))return;
    const finish=()=>{
      $('wasteOverlay').hidden=true;
      $('wasteOverlay').classList.remove('waste-closing');
      document.body.style.overflow=wastePreviousOverflow;
      appContent.inert=wasteAppWasInert;
      if(wasteReturnFocus?.isConnected)wasteReturnFocus.focus({preventScroll:true});
      else $('settingsButton').focus({preventScroll:true});
    };
    if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)finish();
    else {$('wasteOverlay').classList.add('waste-closing');wasteCloseTimer=setTimeout(finish,150);}
  }
  function wasteKeydown(e){
    if(e.key==='Escape'){e.preventDefault();closeWasteGuide();return;}
    if(e.key!=='Tab')return;
    const items=Array.from($('wasteDialog').querySelectorAll('button,a[href],[tabindex="0"]'));
    const first=items[0],last=items[items.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }

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
    if(!analyticsAllowed() || !analyticsReady || typeof window.gtag!=='function') return;
    window.gtag('event',name,params);
  }

  async function loadAnalytics(){
    if(analyticsLoading||analyticsReady)return;
    try{
      const cfg=await fetchLiveConfig('./analytics_config.txt');
      if(String(cfg.Analytics_Enabled||'').toLowerCase()!=='true') return;
      const id=String(cfg.Measurement_ID||'').trim();
      if(!/^G-[A-Z0-9]+$/i.test(id) || id==='G-XXXXXXXXXX') return;
      if(!analyticsAllowed()){
        $('analyticsConsent').hidden=localStorage.getItem(analyticsConsentKey)==='denied';
        return;
      }
      analyticsLoading=true;analyticsId=id;window['ga-disable-'+id]=false;
      window.dataLayer=window.dataLayer||[];
      window.gtag=function(){window.dataLayer.push(arguments);};
      window.gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
      window.gtag('consent','update',{analytics_storage:'granted'});
      window.gtag('js',new Date());
      window.gtag('config',id,{anonymize_ip:true,allow_google_signals:false,allow_ad_personalization_signals:false});
      const script=document.createElement('script');
      script.async=true; script.src=`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
      script.onload=()=>{analyticsLoading=false;analyticsReady=analyticsAllowed();};
      script.onerror=()=>{analyticsLoading=false;};
      document.head.appendChild(script);
    }catch(_){ /* analytics is optional */ }
  }

  function renderDonation(){
    const card=$('donationCard');
    const cfg=donationConfig;
    card.hidden=true;
    donationUrl=null;
    tipAmounts.forEach(amount=>{$(`tip${amount}`).disabled=true;});
    if(!cfg || String(cfg.Donation_Visible||'').toLowerCase()!=='true') return;
    const text=String(cfg.Donation_Text || '').trim();
    const link=String(cfg.Donation_Link||'').trim();
    let url;
    try{url=new URL(link);}catch(_){return;}
    if(!text || url.protocol!=='https:') return;
    const detail=String(cfg.Donation_Detail || '').trim();
    const label=String(cfg.Donation_Button || 'Support').trim();
    $('donationText').textContent=text;
    $('donationDetail').textContent=detail;
    $('donationDetail').hidden=!detail;
    $('donationButton').textContent=label;
    donationUrl=url.href;
    updateSupportPayment();
    card.setAttribute('aria-label',`${text}. ${label}. ${detail}`);
    card.hidden=supportIsHidden();
  }

  function updateSupportPayment(){
    tipAmounts.forEach(amount=>{$(`tip${amount}`).disabled=!donationUrl;});
  }
  function renderSupport(){
    const c=t();
    for(const [id,key] of Object.entries({supportTitle:'supportTitle',supportIntro:'supportIntro',showSupportLabel:'showSupport',tipThanks:'tipThanks',dismissSupport:'dismissSupport'}))$(id).textContent=c[key];
    updateSupportPayment();
    $('tipAmounts').setAttribute('aria-label',c.tipAmountsLabel);
    tipAmounts.forEach(amount=>$(`tip${amount}`).setAttribute('aria-label',c.tipAmountLabel(amount)));
    $('closeSupport').setAttribute('aria-label',c.closeSupport);
    $('showSupport').checked=!supportIsHidden();
    $('supportHiddenUntil').hidden=!supportHidden;
    if(supportHidden)$('supportHiddenUntil').textContent=`Hidden until ${new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/Malta'}).format(Number(localStorage.getItem(supportHiddenKey)))}.`;
  }
  function setSupportHidden(value){
    if(value)localStorage.setItem(supportHiddenKey,String(Date.now()+supportPeriod));
    else {localStorage.removeItem(supportHiddenKey);localStorage.removeItem(supportLastShownKey);}
    renderSupport();renderDonation();
  }
  function supportCanOpen(){
    return selected&&donationUrl&&!supportIsHidden()&&splash.hidden&&!document.hidden&&
      ['settingsOverlay','supportOverlay','wasteOverlay','timeOverlay'].every(id=>$(id).hidden);
  }
  function maybeShowSupport(){
    if(!supportCanOpen()||homeGesture||changingDay)return;
    const last=Number(localStorage.getItem(supportLastShownKey))||0;
    if(!last||Date.now()-last>=supportPeriod)openSupport(true);
  }
  function openSupport(automatic=false){
    if(!supportCanOpen())return;
    supportReturnFocus=document.activeElement;
    previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    chosenTip=null;checkoutOpening=false;resetSlider();
    $('supportChoice').hidden=false;$('supportConfirm').hidden=true;
    renderSupport();renderDonation();
    $('supportOverlay').hidden=false;document.querySelector('main.app').inert=true;
    localStorage.setItem(supportLastShownKey,String(Date.now()));
    $('closeSupport').focus({preventScroll:true});
    analyticsEvent('donation_prompt_open',{language,automatic:automatic===true});
  }
  function closeSupport(){
    if($('supportOverlay').hidden)return;
    $('supportOverlay').hidden=true;chosenTip=null;resetSlider();
    document.querySelector('main.app').inert=false;
    document.body.style.overflow=previousOverflow;
    const target=supportIsHidden()||!supportReturnFocus?.isConnected?$('settingsButton'):supportReturnFocus;
    target?.focus?.({preventScroll:true});
  }
  function supportKeydown(e){
    if(e.key==='Escape'){e.preventDefault();closeSupport();return;}
    if(e.key!=='Tab')return;
    const items=Array.from($('supportDialog').querySelectorAll('button:not([disabled]),[tabindex="0"]')).filter(el=>el.getClientRects().length);
    const first=items[0],last=items[items.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
  function setSlider(value){
    sliderValue=Math.max(0,Math.min(100,value));
    const slider=$('donationSlider'),travel=Math.max(0,slider.clientWidth-68);
    slider.style.setProperty('--slider-x',`${travel*sliderValue/100}px`);
    slider.style.setProperty('--slider-progress',`${sliderValue}%`);
    slider.setAttribute('aria-valuenow',String(Math.round(sliderValue)));
    slider.setAttribute('aria-valuetext',sliderValue>=95?'Ready. Release to open Stripe.':`${Math.round(sliderValue)} percent`);
    slider.classList.toggle('slider-ready',sliderValue>=95);
  }
  function resetSlider(){
    sliderDrag=null;$('donationSlider').classList.remove('slider-dragging');
    setSlider(0);$('sliderStatus').textContent='';
  }
  function chooseTip(amount){
    if($('supportOverlay').hidden||!donationUrl)return;
    chosenTip=amount;resetSlider();
    $('supportChoice').hidden=true;$('supportConfirm').hidden=false;
    $('confirmAmount').textContent=`Your tip: €${amount}`;
    $('sliderLabel').textContent=`Slide to continue · €${amount}`;
    $('donationSlider').setAttribute('aria-label',`Slide to continue to Stripe for a €${amount} donation`);
    $('donationSlider').focus({preventScroll:true});
    analyticsEvent('donation_amount_selected',{language,amount});
  }
  function completeDonation(){
    if(checkoutOpening||!tipAmounts.includes(chosenTip)||!donationUrl||$('supportOverlay').hidden||$('supportConfirm').hidden)return;
    checkoutOpening=true;
    const amount=chosenTip,checkout=new URL(donationUrl);
    checkout.searchParams.set('prefilled_amount',String(amount*100));
    analyticsEvent('donation_click',{language,amount});
    closeSupport();
    const popup=window.open(checkout.href,'_blank');
    if(popup)popup.opener=null;else window.location.assign(checkout.href);
  }
  async function loadDonation(){
    try{
      donationConfig=await fetchLiveConfig('./donation_config.txt');
    }catch(_){donationConfig=null;}
    renderDonation();setTimeout(maybeShowSupport,600);
  }

  function renderStaticText() {
    const c=t();
    renderSupport();renderDonation();
    document.documentElement.lang=language;
    $('settingsButton').setAttribute('aria-label',c.settings);
    $('settingsButton').title=c.settings;
    $('prevDay').setAttribute('aria-label',c.previous);
    $('nextDay').setAttribute('aria-label',c.next);
    $('switchButton').textContent=c.yes;
    $('settingsEyebrow').textContent=c.schedule;
    $('settingsTitle').textContent=c.settings;
    $('homeLocalityTitle').textContent=c.homeLocalityTitle;
    $('supportSettingsTitle').textContent=c.supportSettingsTitle;
    $('closeSettings').setAttribute('aria-label',c.cancel);
    renderHomeLocality();
    $('cancelSettings').textContent=c.done;
    $('locationBehaviourLabel').textContent=c.locationBehaviour;
    $('keepLocalityTitle').textContent=c.keepTitle;
    $('followLocationTitle').textContent=c.followTitle;
    $('keepLocalityMode').checked=!followLocation;
    $('followLocationMode').checked=followLocation;
  }

  function renderLocationMode(){
    const chip=$('locationModeChip');
    const away=temporaryView && temporaryView!==selected;
    const mode=followLocation?'Auto':away?'Away':'Home';
    chip.textContent=`(${mode})`;
    chip.dataset.mode=mode.toLowerCase();
    chip.title=away?`Return to ${selected}`:followLocation?'Following your current location. Tap for settings.':'Saved home locality. Tap for settings.';
    chip.setAttribute('aria-label',chip.title);
  }
  const compactTime = value => {
    const [hour,minute]=value.split(':').map(Number);
    return {text:`${hour%12||12}:${String(minute).padStart(2,'0')}`,period:hour<12?'AM':'PM'};
  };
  const timeMarkup = value => {const time=compactTime(value);return `${time.text}<small>${time.period}</small>`;};
  const clockIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></svg>';
  let timeReturnFocus=null;
  function openTimeInfo(trigger){
    timeReturnFocus=trigger;
    const locality=activeLocality(), date=shownDate();
    const row=rowFor(locality),time=date.getUTCDay()===6&&row[2]?row[2]:row[1];
    const collection=compactTime(time),out=compactTime(formatTime(time));
    $('timeInfoDate').textContent=`${locality} — ${new Intl.DateTimeFormat('en-GB',{dateStyle:'full',timeZone:'UTC'}).format(date)}`;
    $('timeInfoDetails').textContent=`Collection: ${collection.text} ${collection.period}. Earliest put-out time: ${out.text} ${out.period}.`;
    appContent.inert=true;
    $('timeOverlay').hidden=false;
    $('timeInfoScroll').scrollTop=0;
    $('closeTimeInfo').focus({preventScroll:true});
  }
  function closeTimeInfo(){
    $('timeOverlay').hidden=true;appContent.inert=false;
    if(timeReturnFocus?.isConnected)timeReturnFocus.focus({preventScroll:true});
    else $('settingsButton').focus({preventScroll:true});
  }
  function timeInfoKeydown(e){
    if(e.key==='Escape'){e.preventDefault();closeTimeInfo();return;}
    if(e.key!=='Tab')return;
    const items=Array.from($('timeDialog').querySelectorAll('button,a[href],[tabindex="0"]'));
    const first=items[0],last=items[items.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }

  function render() {
    if(!$('wasteOverlay').hidden || !$('timeOverlay').hidden || !$('supportOverlay').hidden)return;
    renderStaticText();
    const locality=activeLocality();
    $('dashboard').hidden=!locality;
    if(!locality)return;
    const c=t(),date=shownDate();
    $('title').textContent=locality;
    $('title').title=locality;
    const fullDate=new Intl.DateTimeFormat('en-GB',{dateStyle:'full',timeZone:'UTC'}).format(date);
    $('date').textContent=new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'}).format(date);
    $('date').title=fullDate;$('date').setAttribute('aria-label',fullDate);
    $('date').setAttribute('datetime',date.toISOString().slice(0,10));
    $('todayPill').hidden=false;
    $('todayPill').textContent=dayOffset===0?'Today':dayOffset===1?'Tomorrow':`+${dayOffset}d`;
    $('todayPill').setAttribute('aria-label',dayOffset===0?'Today':dayOffset===1?'Tomorrow':`In ${dayOffset} days`);
    renderLocationMode();
    $('prevDay').disabled=dayOffset===0;
    $('nextDay').disabled=dayOffset===maxDaysAhead;
    const schedule=scheduleFor(date);
    if(!schedule.bag){
      $('bagArea').innerHTML=`<div class="collection-card no-collection"><div class="rest-icon" aria-hidden="true">☀</div><div class="bag-name">${c.noCollection}</div></div>`;
    }else{
      const row=rowFor(locality),time=date.getUTCDay()===6&&row[2]?row[2]:row[1];
      const figures=`<div class="collection-figures"><div class="collection-item">${bagButton(schedule.bag,c[schedule.bag])}<span class="bag-click-hint">Click Bag for Info</span><span class="collection-item-label">${c[schedule.bag]}</span></div>${schedule.glass?`<div class="collection-item">${bagButton('glass',c.glassBottles)}<span class="bag-click-hint">Click Bag for Info</span><span class="collection-item-label">${c.glassBottles}</span></div>`:''}</div>`;
      $('bagArea').innerHTML=`<div class="collection-card">${figures}<div class="compact-time-line"><button type="button" class="collection-time-button" data-time-info aria-label="Collection time ${time}. More information">${clockIcon}<span>${timeMarkup(time)}</span><span class="info-circle" aria-hidden="true">i</span></button><span class="time-divider" aria-hidden="true">·</span><span class="earliest-time" aria-label="Put bags out from ${formatTime(time)}"><span class="earliest-label">Out from</span> ${timeMarkup(formatTime(time))}</span></div></div>`;

    }
    const different=!followLocation && !temporaryView && detected&&detected!==selected&&!promptIsDismissed();
    $('locationNotice').hidden=!different;
    if(different)$('noticeText').textContent=`Nearby: ${detected}`;
  }


  const reducedMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let changingDay=false, suppressTapUntil=0;
  async function changeDay(delta) {
    if(changingDay)return;
    const next=Math.max(0,Math.min(maxDaysAhead,dayOffset+delta));
    const area=$('bagArea'),width=area.clientWidth;
    changingDay=true;
    if(next===dayOffset){
      await area.animate([{transform:area.style.transform||'translateX(0)'},{transform:'translateX(0)'}],{duration:reducedMotion()?0:360,easing:'cubic-bezier(.2,.9,.3,1.2)'}).finished;
    }else{
      await area.animate([{transform:area.style.transform||'translateX(0)',opacity:1},{transform:`translateX(${-delta*width}px)`,opacity:.3}],{duration:reducedMotion()?0:180,easing:'ease-in'}).finished;
      area.style.transform='';dayOffset=next;render();
      await area.animate([{transform:`translateX(${delta*width}px)`,opacity:.3},{transform:'translateX(0)',opacity:1}],{duration:reducedMotion()?0:260,easing:'cubic-bezier(.2,.8,.2,1)'}).finished;
    }
    area.style.transform='';changingDay=false;
    clearTimeout(returnTimer);
    if(dayOffset)returnTimer=setTimeout(()=>{dayOffset=0;render();},60000);
  }

  let homeOptionsReady=false;
  function renderHomeLocality(){
    const menu=$('homeLocalitySelect');
    if(!homeOptionsReady){
      for(const name of names){const option=document.createElement('option');option.value=name;option.textContent=name;menu.append(option);}
      homeOptionsReady=true;
    }
    $('homeLocalityPlaceholder').textContent=t().choose;
    menu.value=selected||'';
    $('closeSettings').hidden=!selected;
    $('cancelSettings').hidden=!selected;
  }

  function saveHomeLocality(name){
    if(!names.includes(name))return;
    selected=name;temporaryView=null;
    localStorage.setItem(localityKey,selected);
    analyticsEvent('locality_changed');
    dayOffset=0;render();
  }

  let settingsClosing=false, settingsOpener=null;
  function openSettings(){
    if(settingsClosing||!$('settingsOverlay').hidden)return;
    settingsOpener=document.activeElement;
    $('settingsOverlay').hidden=false;
    document.querySelector('main.app').inert=true;
    renderStaticText();
    $('settingsDialog').scrollTop=0;
    $('settingsOverlay').scrollTop=0;
    $('settingsDialog').animate([{transform:'translateY(-110vh)'},{transform:'translateY(0)'}],{duration:reducedMotion()?0:380,easing:'cubic-bezier(.2,.8,.2,1)'});
    $('settingsOverlay').animate([{opacity:0},{opacity:1}],{duration:reducedMotion()?0:240});
    ($('closeSettings').hidden?$('homeLocalitySelect'):$('closeSettings')).focus({preventScroll:true});
  }
  async function closeSettings(direction=-1){
    if(!selected||settingsClosing||$('settingsOverlay').hidden)return;
    settingsClosing=true;
    const panel=$('settingsDialog');
    await Promise.all([
      panel.animate([{transform:panel.style.transform||'translateY(0)'},{transform:`translateY(${(typeof direction==='number'?direction:-1)*110}vh)`}],{duration:reducedMotion()?0:280,easing:'cubic-bezier(.4,0,1,1)'}).finished,
      $('settingsOverlay').animate([{opacity:1},{opacity:0}],{duration:reducedMotion()?0:280}).finished
    ]);
    panel.style.transform='';$('settingsOverlay').hidden=true;
    document.querySelector('main.app').inert=false;settingsClosing=false;
    settingsOpener?.focus?.({preventScroll:true});
    setTimeout(maybeShowSupport,400);
  }

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

  function detectionUnavailable() {locationFailed=true;}
  function detectLocation() {
    if(!navigator.geolocation){detectionUnavailable();return;}
    if(Date.now()-lastGpsAttempt<60000)return;
    lastGpsAttempt=Date.now();
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
        // GPS may establish a home only before a home has been saved.
        // A manual choice made while GPS was pending always wins.
        if(!selected)saveHomeLocality(detected);
        render();
      }catch(_){detectionUnavailable();}
    },detectionUnavailable,{enableHighAccuracy:false,timeout:10000,maximumAge:300000});
  }

  $('bagArea').addEventListener('click',e=>{
    const timeTrigger=e.target.closest('[data-time-info]');
    if(timeTrigger){openTimeInfo(timeTrigger);return;}
    const trigger=e.target.closest('[data-waste-type]');
    if(trigger && $('bagArea').contains(trigger))openWasteGuide(trigger.dataset.wasteType,trigger);
  });
  $('closeWaste').onclick=closeWasteGuide;
  $('wasteOverlay').addEventListener('click',e=>{if(e.target===$('wasteOverlay'))closeWasteGuide();});
  $('settingsButton').onclick=()=>openSettings();
  $('switchButton').onclick=()=>{
    if(!detected)return;
    temporaryView=detected;
    localStorage.setItem(locationPromptKey,JSON.stringify({selected,detected,until:Date.now()+promptCooldownMs}));
    analyticsEvent('current_locality_viewed');
    dayOffset=0;render();
  };
  $('locationModeChip').onclick=()=>{if(temporaryView&&!followLocation){temporaryView=null;dayOffset=0;render();}else openSettings();};
  $('closeTimeInfo').onclick=closeTimeInfo;
  $('timeOverlay').onclick=e=>{if(e.target===$('timeOverlay'))closeTimeInfo();};
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
  $('homeLocalitySelect').onchange=()=>saveHomeLocality($('homeLocalitySelect').value);
  $('prevDay').onclick=()=>changeDay(-1);
  $('nextDay').onclick=()=>changeDay(1);
  $('donationCard').addEventListener('click',()=>openSupport());
  $('closeSupport').onclick=closeSupport;
  $('dismissSupport').onclick=closeSupport;
  $('cancelDonation').onclick=closeSupport;
  $('supportOverlay').onclick=e=>{if(e.target===$('supportOverlay'))closeSupport();};
  $('showSupport').onchange=()=>setSupportHidden(!$('showSupport').checked);
  tipAmounts.forEach(amount=>$(`tip${amount}`).onclick=()=>chooseTip(amount));
  const slider=$('donationSlider');
  slider.addEventListener('pointerdown',e=>{
    if(!e.isPrimary||e.button!==0||!e.target.closest('.slider-thumb')||checkoutOpening)return;
    e.preventDefault();slider.focus({preventScroll:true});
    sliderDrag={id:e.pointerId,x:e.clientX};slider.setPointerCapture(e.pointerId);
    slider.classList.add('slider-dragging');$('sliderStatus').textContent='';setSlider(0);
  });
  slider.addEventListener('pointermove',e=>{
    if(!sliderDrag||sliderDrag.id!==e.pointerId)return;
    setSlider((e.clientX-sliderDrag.x)/Math.max(1,slider.clientWidth-68)*100);
  });
  slider.addEventListener('pointerup',e=>{
    if(!sliderDrag||sliderDrag.id!==e.pointerId)return;
    const done=sliderValue>=95;resetSlider();if(done)completeDonation();
  });
  slider.addEventListener('pointercancel',resetSlider);
  slider.addEventListener('lostpointercapture',()=>{if(sliderDrag)resetSlider();});
  slider.addEventListener('keydown',e=>{
    if(e.key==='ArrowRight'||e.key==='ArrowUp'){e.preventDefault();setSlider(sliderValue+10);}
    else if(e.key==='ArrowLeft'||e.key==='ArrowDown'){e.preventDefault();setSlider(sliderValue-10);}
    else if(e.key==='Home'){e.preventDefault();resetSlider();}
    else if(e.key==='End'){e.preventDefault();setSlider(100);}
    else if((e.key==='Enter'||e.key===' ')&&sliderValue>=95){e.preventDefault();completeDonation();}
    $('sliderStatus').textContent=sliderValue>=95?'Press Enter to continue to Stripe.':'';
  });
  window.addEventListener('resize',()=>{if(!$('supportConfirm').hidden)resetSlider();});
  window.addEventListener('storage',e=>{
    if(e.key===supportHiddenKey){renderSupport();renderDonation();if(supportIsHidden())closeSupport();}
  });
  setInterval(()=>{renderSupport();renderDonation();maybeShowSupport();},15000);
  // One gesture owner locks the axis after a small intentional movement.
  let homeGesture=null;
  const pull=$('settingsPull');
  const openThreshold=()=>Math.min(150,Math.max(100,innerHeight*.19));
  $('dashboard').addEventListener('touchstart',e=>{
    if(e.touches.length!==1||changingDay)return;
    const t=e.touches[0];homeGesture={x:t.clientX,y:t.clientY,axis:null,dx:0,dy:0};
  },{passive:true});
  $('dashboard').addEventListener('touchmove',e=>{
    const g=homeGesture;if(!g)return;
    if(e.touches.length!==1){finishHomeGesture(true);return;}
    const t=e.touches[0];g.dx=t.clientX-g.x;g.dy=t.clientY-g.y;
    if(!g.axis&&Math.max(Math.abs(g.dx),Math.abs(g.dy))>12)g.axis=Math.abs(g.dx)>Math.abs(g.dy)*1.15?'x':'y';
    if(!g.axis)return;e.preventDefault();
    if(g.axis==='x'){
      const atEnd=(g.dx>0&&dayOffset===0)||(g.dx<0&&dayOffset===maxDaysAhead);
      const shift=atEnd?Math.sign(g.dx)*Math.min(65,Math.abs(g.dx)*.25):g.dx;
      $('bagArea').style.transform=`translateX(${shift}px)`;
    }else if(g.dy>0){
      const distance=Math.min(g.dy*.6,130);
      pull.style.transform=`translate(-50%,${distance-45}px)`;pull.style.opacity=Math.min(1,g.dy/70);
      pull.classList.toggle('pull-ready',g.dy>=openThreshold());
    }
  },{passive:false});
  function finishHomeGesture(cancelled=false){
    const g=homeGesture;homeGesture=null;if(!g)return;
    pull.style.transform='';pull.style.opacity='';pull.classList.remove('pull-ready');
    if(g.axis)suppressTapUntil=performance.now()+450;
    if(g.axis==='x')changeDay(!cancelled&&Math.abs(g.dx)>Math.min(90,$('bagArea').clientWidth*.22)?(g.dx<0?1:-1):0);
    else if(!cancelled&&g.axis==='y'&&g.dy>=openThreshold())openSettings();
  }
  $('dashboard').addEventListener('touchend',()=>finishHomeGesture(),{passive:true});
  $('dashboard').addEventListener('touchcancel',()=>finishHomeGesture(true),{passive:true});
  $('dashboard').addEventListener('click',e=>{if(performance.now()<suppressTapUntil){e.preventDefault();e.stopImmediatePropagation();}},{capture:true});
  // Scroll settings normally; only an outward pull at a scroll boundary dismisses it.
  let settingsGesture=null;
  const panel=$('settingsDialog'),overlay=$('settingsOverlay');
  panel.addEventListener('touchstart',e=>{
    if(e.touches.length!==1||settingsClosing||e.target.closest('select,input,button'))return;
    const t=e.touches[0];settingsGesture={x:t.clientX,y:t.clientY,dy:0,drag:false,
      top:panel.scrollTop<=1||!!e.target.closest('.settings-head,.settings-grip,h2'),bottom:panel.scrollTop+panel.clientHeight>=panel.scrollHeight-2||!!e.target.closest('.settings-head,.settings-grip,h2')};
  },{passive:true});
  panel.addEventListener('touchmove',e=>{
    const g=settingsGesture;if(!g||e.touches.length!==1)return;
    const t=e.touches[0];g.dy=t.clientY-g.y;
    if(Math.abs(t.clientX-g.x)>Math.abs(g.dy))return;
    if(!g.drag&&Math.abs(g.dy)>12)g.drag=(g.dy>0&&g.top)||(g.dy<0&&g.bottom);
    if(g.drag){e.preventDefault();panel.style.transform=`translateY(${g.dy*.8}px)`;}
  },{passive:false});
  function finishSettingsGesture(cancelled=false){
    const g=settingsGesture;settingsGesture=null;if(!g?.drag)return;
    if(!cancelled&&selected&&Math.abs(g.dy)>Math.min(150,Math.max(100,panel.clientHeight*.23)))closeSettings(Math.sign(g.dy));
    else {panel.animate([{transform:panel.style.transform},{transform:'translateY(0)'}],{duration:reducedMotion()?0:260,easing:'ease-out'});panel.style.transform='';}
  }
  panel.addEventListener('touchend',()=>finishSettingsGesture(),{passive:true});
  panel.addEventListener('touchcancel',()=>finishSettingsGesture(true),{passive:true});
  document.addEventListener('keydown',e=>{if(!splash.hidden)return;if(!$('timeOverlay').hidden){timeInfoKeydown(e);return;}if(!$('wasteOverlay').hidden){wasteKeydown(e);return;}if(!$('supportOverlay').hidden){supportKeydown(e);return;}if(!$('settingsOverlay').hidden){if(e.key==='Escape')closeSettings();if(e.key==='Tab'){const nodes=[...$('settingsDialog').querySelectorAll('button:not([hidden]),select,input')].filter(n=>!n.disabled);const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}return;}if(e.key==='ArrowRight')changeDay(1);if(e.key==='ArrowLeft')changeDay(-1);});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();loadDonation();detectLocation();}});
  setInterval(()=>{if(dayOffset===0&&!homeGesture&&!changingDay)render();},60000);
  setInterval(()=>{
    if(homeGesture||changingDay||document.hidden||!splash.hidden||!$('settingsOverlay').hidden||!$('supportOverlay').hidden||!$('wasteOverlay').hidden||!$('timeOverlay').hidden||reducedMotion())return;
    const figures=document.querySelector('.collection-figures');if(!figures)return;
    figures.classList.remove('tap-demo');void figures.offsetWidth;figures.classList.add('tap-demo');
  },10000);
  function syncViewport(){
    const height=window.visualViewport?.height||window.innerHeight;
    if(height)document.documentElement.style.setProperty('--app-height',`${height}px`);
  }
  syncViewport();
  window.addEventListener('resize',syncViewport);
  window.visualViewport?.addEventListener('resize',syncViewport);
  render();
  loadDonation();
  loadAnalytics();
  if(!selected)openSettings();detectLocation();
  if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
})();

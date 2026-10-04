(() => {
  'use strict';
  const data = window.WASTE_DATA;
  const $ = id => document.getElementById(id);
  const appearanceKey='bag-day-appearance-v1';
  function applyAppearance(){
    const saved=localStorage.getItem(appearanceKey);
    const preference=saved==='light'?'light':'dark';
    const dark=preference==='dark';
    document.documentElement.dataset.theme=dark?'dark':'light';
    document.querySelector('meta[name="theme-color"]').content=dark?'#0b1421':'#edf3f9';
    $('appearanceSelect').value=preference;
  }
  $('appearanceSelect').onchange=()=>{localStorage.setItem(appearanceKey,$('appearanceSelect').value);applyAppearance();};
  window.addEventListener('storage',e=>{if(e.key===appearanceKey)applyAppearance();});
  applyAppearance();
  // Persist the first two application openings across sessions.
  const splash = $('splashScreen');
  const appContent = $('appContent');
  let splashSeen = true;
  try {
    const opens = Math.max(0, Number(localStorage.getItem('bag-day-open-count-v1')) || 0);
    splashSeen = opens >= 2;
    localStorage.setItem('bag-day-open-count-v1', String(Math.min(3, opens + 1)));
  } catch (_) {}
  let splashTimer;
  let splashFadeTimer;
  let splashFading = false;
  function finishSplash() {
    clearTimeout(splashTimer);
    clearTimeout(splashFadeTimer);
    splash.hidden = true;
    
    appContent.inert = false;
    if(welcomeNeeded){openWelcome();return;}
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
  const localityOrder = new Intl.Collator('en', {sensitivity:'base'});
  const names = data.localities.map(row => row[0]).sort(localityOrder.compare);
  let selected = names.includes(localStorage.getItem(localityKey)) ? localStorage.getItem(localityKey) : null;
  const language = 'en';
  let followLocation = (localStorage.getItem(followLocationKey) || '').toLowerCase() === 'true';
  let temporaryView = null;
  let detected = null;
  const defaultDayOffset = () => {
    const parts = new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Malta',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
    const value = type => Number(parts.find(part=>part.type===type).value);
    return value('hour')*3600+value('minute')*60+value('second')>15*3600 ? 1 : 0;
  };
  let dayOffset = defaultDayOffset();
  let returnTimer = null;
  let lastGpsAttempt = 0;

  let locationFailed = false;
  // Saved drafts distinguish interrupted first-use setup from existing installs.
  const welcomeDraftKey='bag-day-welcome-draft-v1';
  const welcomeCompleteKey='bag-day-welcome-complete-v1';
  let welcomeDraft=null;
  try{welcomeDraft=JSON.parse(localStorage.getItem(welcomeDraftKey)||'null');}catch(_){}
  if(!welcomeDraft || typeof welcomeDraft!=='object' || Array.isArray(welcomeDraft))welcomeDraft=null;
  let welcomeNeeded=localStorage.getItem(welcomeCompleteKey)!=='true' && (!!welcomeDraft || !selected);
  if(!welcomeNeeded && selected){localStorage.setItem(welcomeCompleteKey,'true');localStorage.removeItem(welcomeDraftKey);}
  if(welcomeNeeded){
    welcomeDraft={step:Math.min(3,Math.max(1,Number(welcomeDraft?.step)||1)),locality:names.includes(welcomeDraft?.locality)?welcomeDraft.locality:'',mode:['auto','home'].includes(welcomeDraft?.mode)?welcomeDraft.mode:null};
    if(!welcomeDraft.locality)welcomeDraft.step=1;
    else if(!welcomeDraft.mode && welcomeDraft.step===3)welcomeDraft.step=2;
    localStorage.setItem(welcomeDraftKey,JSON.stringify(welcomeDraft));
  }
  let welcomeBusy=false,welcomeReadyTimer;
  let welcomeChoiceTimer=null,welcomeChoiceAnimation=null;
  function stopWelcomeChoiceCue(){
    clearTimeout(welcomeChoiceTimer);welcomeChoiceTimer=null;
    welcomeChoiceAnimation?.cancel();welcomeChoiceAnimation=null;
    $('welcomeChoiceHand').hidden=true;
  }
  function queueWelcomeChoiceCue(delay=3000){
    if(!welcomeNeeded || welcomeDraft.step!==2 || welcomeDraft.mode || welcomeBusy || document.hidden || $('welcomeOverlay').hidden){stopWelcomeChoiceCue();return;}
    if(welcomeChoiceTimer || welcomeChoiceAnimation || !$('welcomeChoiceHand').hidden)return;
    welcomeChoiceTimer=setTimeout(()=>{
      welcomeChoiceTimer=null;
      if(!welcomeNeeded || welcomeDraft.step!==2 || welcomeDraft.mode || document.hidden)return;
      const hand=$('welcomeChoiceHand');hand.hidden=false;
      hand.classList.toggle('still-hand',!!reducedMotion());
      if(reducedMotion()){hand.style.left='';hand.style.top='';return;}
      const group=$('welcomeModes').getBoundingClientRect();
      const auto=$('welcomeAuto').querySelector('.welcome-choice-mark').getBoundingClientRect();
      const home=$('welcomeHome').querySelector('.welcome-choice-mark').getBoundingClientRect();
      hand.style.left=`${auto.left-group.left+auto.width/2-17}px`;
      hand.style.top=`${auto.top-group.top+auto.height/2-8}px`;
      const distance=home.top-auto.top;
      welcomeChoiceAnimation=hand.animate([
        {opacity:0,transform:'translateY(12px)',offset:0},
        {opacity:1,transform:'translateY(0)',offset:.12},
        {opacity:1,transform:'translateY(-5px) scale(.92)',offset:.24},
        {opacity:1,transform:'translateY(0)',offset:.34},
        {opacity:1,transform:`translateY(${distance}px)`,offset:.60},
        {opacity:1,transform:`translateY(${distance-5}px) scale(.92)`,offset:.72},
        {opacity:1,transform:`translateY(${distance}px)`,offset:.82},
        {opacity:0,transform:`translateY(${distance+12}px)`,offset:1}
      ],{duration:2600,easing:'ease-in-out',fill:'forwards'});
      const animation=welcomeChoiceAnimation;
      animation.finished.then(()=>{
        if(welcomeChoiceAnimation!==animation)return;
        animation.cancel();hand.hidden=true;welcomeChoiceAnimation=null;
        queueWelcomeChoiceCue(5000);
      }).catch(()=>{});
    },delay);
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopWelcomeChoiceCue();else queueWelcomeChoiceCue();});
  window.addEventListener('resize',()=>{stopWelcomeChoiceCue();queueWelcomeChoiceCue();});

  function saveWelcomeDraft(){localStorage.setItem(welcomeDraftKey,JSON.stringify(welcomeDraft));}
  function welcomeFocus(){
    const step=welcomeNeeded?welcomeDraft.step:4;
    const target=step===1?$('welcomeLocality'):step===2?$('welcomeAuto'):step===3?$('welcomeTitle3'):$('welcomeStart');
    target.focus({preventScroll:true});
    $('welcomeDialog').scrollTop=0;
  }
  function renderWelcome(){
    const step=welcomeNeeded?welcomeDraft.step:4;
    ['welcomeStep1','welcomeStep2','welcomeStep3','welcomeReady'].forEach((id,i)=>$(id).hidden=i+1!==step);
    $('welcomeDialog').setAttribute('aria-labelledby',['welcomeTitle','welcomeTitle2','welcomeTitle3','welcomeTitle4'][step-1]);
    $('welcomeProgress').hidden=step===4;
    $('welcomeStepLabel').textContent=`Step ${step} of 3`;
    [...document.querySelectorAll('.welcome-dots i')].forEach((dot,i)=>{dot.classList.toggle('active',i+1===step);dot.classList.toggle('done',i+1<step);});
    $('welcomeNavigation').hidden=step===4;
    $('welcomeBack').hidden=step===1;
    $('welcomeNext').hidden=step>=3;
    $('welcomeNext').disabled=step===1?!welcomeDraft.locality:!welcomeDraft.mode;
    if(welcomeNeeded){
      $('welcomeLocality').value=welcomeDraft.locality;
      $('welcomeAuto').setAttribute('aria-pressed',String(welcomeDraft.mode==='auto'));
      $('welcomeHome').setAttribute('aria-pressed',String(welcomeDraft.mode==='home'));
    }
    queueWelcomeChoiceCue();
  }
  function openWelcome(){
    if(!welcomeNeeded || !splash.hidden || !$('welcomeOverlay').hidden)return;
    for(const name of names){const option=document.createElement('option');option.value=name;option.textContent=name;$('welcomeLocality').append(option);}
    $('welcomeOverlay').hidden=false;appContent.inert=true;
    renderWelcome();
    $('welcomeDialog').animate([{transform:'translateY(22px)',opacity:0},{transform:'translateY(0)',opacity:1}],{duration:reducedMotion()?0:320,easing:'ease-out'});
    welcomeFocus();detectLocation();
  }
  async function moveWelcome(step){
    if(welcomeBusy || !welcomeNeeded)return;
    welcomeBusy=true;stopWelcomeChoiceCue();
    const direction=step>welcomeDraft.step?1:-1;
    const body=$('welcomeBody');
    await body.animate([{opacity:1,transform:'translateX(0)'},{opacity:0,transform:`translateX(${-direction*18}px)`}],{duration:reducedMotion()?0:120}).finished;
    welcomeDraft.step=step;saveWelcomeDraft();renderWelcome();
    await body.animate([{opacity:0,transform:`translateX(${direction*18}px)`},{opacity:1,transform:'translateX(0)'}],{duration:reducedMotion()?0:180,easing:'ease-out'}).finished;
    welcomeBusy=false;welcomeFocus();queueWelcomeChoiceCue();
  }
  function suggestWelcomeLocality(){
    if(!welcomeNeeded)return;
    if(!welcomeDraft.locality && detected){welcomeDraft.locality=detected;saveWelcomeDraft();renderWelcome();}
    $('welcomeGps').textContent=detected?`Your location suggests ${detected}. Choose the locality you call home.`:'Location is unavailable. Choose your home from the list.';
  }
  function finishWelcome(allow){
    if(welcomeBusy || !welcomeNeeded || welcomeDraft.step!==3)return;
    saveHomeLocality(welcomeDraft.locality);
    followLocation=welcomeDraft.mode==='auto';temporaryView=null;
    localStorage.setItem(followLocationKey,String(followLocation));
    localStorage.setItem(welcomeCompleteKey,'true');localStorage.removeItem(welcomeDraftKey);
    welcomeNeeded=false;
    setAnalyticsChoice(allow);render();
    $('welcomeSummary').textContent=`Home: ${selected} · ${followLocation?'Auto':'Home'} mode. You can change your choices in Settings.`;
    renderWelcome();welcomeFocus();
    welcomeReadyTimer=setTimeout(closeWelcome,1800);
  }
  function closeWelcome(){
    if(welcomeNeeded)return;
    clearTimeout(welcomeReadyTimer);$('welcomeOverlay').hidden=true;appContent.inert=false;$('settingsButton').focus({preventScroll:true});
  }
  $('welcomeLocality').onchange=()=>{welcomeDraft.locality=$('welcomeLocality').value;saveWelcomeDraft();renderWelcome();};
  $('welcomeLocate').onclick=()=>{lastGpsAttempt=0;$('welcomeGps').textContent='Finding your locality…';detectLocation();};
  for(const mode of ['auto','home'])$(mode==='auto'?'welcomeAuto':'welcomeHome').onclick=()=>{welcomeDraft.mode=mode;saveWelcomeDraft();renderWelcome();};
  $('welcomeNext').onclick=()=>{
    if(welcomeDraft.step===1&&welcomeDraft.locality){saveHomeLocality(welcomeDraft.locality);moveWelcome(2);}
    else if(welcomeDraft.step===2&&welcomeDraft.mode){followLocation=welcomeDraft.mode==='auto';localStorage.setItem(followLocationKey,String(followLocation));moveWelcome(3);}
  };
  $('welcomeBack').onclick=()=>moveWelcome(welcomeDraft.step-1);
  $('welcomeAllow').onclick=()=>finishWelcome(true);
  $('welcomeDecline').onclick=()=>finishWelcome(false);
  $('welcomeStart').onclick=closeWelcome;
  $('welcomeOverlay').addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();if(!welcomeNeeded)closeWelcome();return;}
    if(e.key!=='Tab')return;
    const nodes=[...$('welcomeDialog').querySelectorAll('button,select,a[href]')].filter(n=>!n.disabled&&n.getClientRects().length);
    const first=nodes[0],last=nodes[nodes.length-1];
    if(e.shiftKey&&(document.activeElement===first || !nodes.includes(document.activeElement))){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  });

  let analyticsReady = false, pendingGameOpens=0;
  const analyticsConsentKey='bag-day-analytics-consent-v1';
  let analyticsLoading=false,analyticsId='';
  function analyticsAllowed(){return localStorage.getItem(analyticsConsentKey)==='granted';}
  function setAnalyticsChoice(allowed){
    localStorage.setItem(analyticsConsentKey,allowed?'granted':'denied');
    $('allowAnalytics').checked=allowed;
    if(allowed){loadAnalytics();return;}
    analyticsReady=false;pendingGameOpens=0;
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
  $('allowAnalytics').checked=analyticsAllowed();
  $('allowAnalytics').onchange=e=>setAnalyticsChoice(e.target.checked);
  let donationConfig = null;
  const supportLastShownKey='bag-day-support-last-shown-v2';
  const supportFirstUseKey='bag-day-first-use-v3';
  const supportInteractionKey='bag-day-support-last-open-v4';
  const supportDonationAttemptKey='bag-day-support-donation-attempt-v4';
  const supportDay=24*60*60*1000;
  let donationUrl=null,supportReturnFocus=null,previousOverflow='';
  let supportActiveElapsed=0,supportActiveStamp=null;
  function recordSupportUsage(){
    if(selected && !document.hidden && !localStorage.getItem(supportFirstUseKey))
      localStorage.setItem(supportFirstUseKey,String(Date.now()));
  }
  function supportInvitationEligible(){
    const first=Number(localStorage.getItem(supportFirstUseKey));
    const anchor=Math.max(first||0,Number(localStorage.getItem(supportLastShownKey))||0,Number(localStorage.getItem(supportInteractionKey))||0);
    const days=localStorage.getItem(supportDonationAttemptKey)==='true'?30:5;
    return first>0 && Date.now()-anchor>=days*supportDay;
  }
  function resetSupportCountdown(){
    localStorage.setItem(supportInteractionKey,String(Date.now()));
    supportActiveElapsed=0;supportActiveStamp=null;
  }
  function queueSupportInvitation(){
    recordSupportUsage();
    const now=performance.now();
    if(supportActiveStamp!==null)supportActiveElapsed+=Math.max(0,now-supportActiveStamp);
    const active=selected && !welcomeNeeded && splash.hidden && !appContent.inert && !document.hidden && supportInvitationEligible();
    supportActiveStamp=active?now:null;
    if(!supportInvitationEligible())supportActiveElapsed=0;
    if(active && supportActiveElapsed>=60000)maybeShowSupport();
  }
  const tipAmounts=[2,5,10,20];
  let chosenTip=null,sliderValue=0,sliderDrag=null,checkoutOpening=false;

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
      cancel:'Cancel',save:'Set as my home locality',done:'Done',homeLocalityTitle:'Home locality',homeLocalityHelp:'Choose the locality whose collection schedule you want to keep as your home.',savedHome:place=>`Saved home: ${place}`,noSavedHome:'No home locality saved yet.',locationModeNote:'Choose what to show when you travel. Changes save immediately.',
      settingsNote:'Select a locality, then tap “Set as my home locality” to save it.',
      locationBehaviour:'Location when travelling',
      keepTitle:'Keep my home locality',keepHelp:'Default. The PWA does not silently switch locality when you travel.',
      followTitle:'Follow my current location automatically',followHelp:'When GPS detects another locality, show its schedule without replacing your saved locality.',
      following:place=>`📍 Following current location: ${place}`,
      viewing:place=>`📍 Temporarily viewing: ${place}`,
      backHome:place=>`Back to ${place}`,
      supportTitle:'Glad you found this app useful.',
      supportIntro:'Buy us a Coffee',




      tipThanks:'Thank you for your tip.',tipAmountLabel:amount=>`Choose €${amount} — slide to confirm`,tipAmountsLabel:'Choose a tip amount',
      dismissSupport:'Maybe later',closeSupport:'Close support panel' 
    }
  };
  const t = () => copy[language];
  const timeOfDay = time => {const hour=Number(time.slice(0,2));return hour<12?t().morning:hour<18?t().afternoon:t().evening;};
  const normal = s => (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[ħĦ]/g,'h').replace(/[’']/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const rowFor = name => data.localities.find(row => row[0] === name);
  const activeLocality = () => temporaryView || ((followLocation && detected) ? detected : selected);

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
      queueSupportInvitation();
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

  $('gameModeButton').addEventListener('click',()=>{
    if($('gameModeButton').hidden || appContent.inert || !splash.hidden || $('dashboard').hidden || !analyticsAllowed())return;
    if(analyticsReady)analyticsEvent('game_open');
    else{pendingGameOpens++;loadAnalytics();}
  },true);

  async function loadAnalytics(){
    if(analyticsLoading||analyticsReady)return;
    try{
      const cfg=await fetchLiveConfig('./analytics_config.txt');
      if(String(cfg.Analytics_Enabled||'').toLowerCase()!=='true') return;
      const id=String(cfg.Measurement_ID||'').trim();
      if(!/^G-[A-Z0-9]+$/i.test(id) || id==='G-XXXXXXXXXX') return;
      if(!analyticsAllowed())return;
      analyticsLoading=true;analyticsId=id;window['ga-disable-'+id]=false;
      window.dataLayer=window.dataLayer||[];
      window.gtag=function(){window.dataLayer.push(arguments);};
      window.gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
      window.gtag('consent','update',{analytics_storage:'granted'});
      window.gtag('js',new Date());
      window.gtag('config',id,{anonymize_ip:true,allow_google_signals:false,allow_ad_personalization_signals:false});
      const script=document.createElement('script');
      script.async=true; script.src=`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
      script.onload=()=>{analyticsLoading=false;analyticsReady=analyticsAllowed();const clicks=pendingGameOpens;pendingGameOpens=0;if(analyticsReady)for(let n=0;n<clicks;n++)analyticsEvent('game_open');};
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
    card.hidden=false;
  }

  function updateSupportPayment(){
    tipAmounts.forEach(amount=>{$(`tip${amount}`).disabled=!donationUrl;});
  }
  function renderSupport(){
    const c=t();
    for(const [id,key] of Object.entries({supportTitle:'supportTitle',supportIntro:'supportIntro',tipThanks:'tipThanks',dismissSupport:'dismissSupport'}))$(id).textContent=c[key];
    updateSupportPayment();
    $('tipAmounts').setAttribute('aria-label',c.tipAmountsLabel);
    tipAmounts.forEach(amount=>$(`tip${amount}`).setAttribute('aria-label',c.tipAmountLabel(amount)));
    $('closeSupport').setAttribute('aria-label',c.closeSupport);
  }
  function supportCanOpen(){
    return selected&&donationUrl&&splash.hidden&&!appContent.inert&&!document.hidden&&
      ['settingsOverlay','supportOverlay','wasteOverlay','timeOverlay','welcomeOverlay','calendarOverlay','localityOverlay'].every(id=>$(id).hidden);
  }
  function maybeShowSupport(){
    if(!supportInvitationEligible()||!supportCanOpen()||homeGesture||changingDay)return;
    openSupport(true);
  }
  function openSupport(automatic=false){
    if(!supportCanOpen())return;
    resetSupportCountdown();
    supportReturnFocus=document.activeElement;
    previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    chosenTip=null;checkoutOpening=false;resetSlider();
    $('supportChoice').hidden=false;$('supportConfirm').hidden=true;
    $('supportTitle').hidden=false;$('supportCoffee').hidden=false;
    $('supportDialog').setAttribute('aria-labelledby','supportTitle');
    $('supportDialog').setAttribute('aria-describedby','supportIntro');
    renderSupport();renderDonation();
    $('supportOverlay').hidden=false;document.querySelector('main.app').inert=true;
    if(automatic)localStorage.setItem(supportLastShownKey,String(Date.now()));
    $('closeSupport').focus({preventScroll:true});
    analyticsEvent('donation_prompt_open',{language,automatic:automatic===true});
  }
  function closeSupport(){
    if($('supportOverlay').hidden)return;
    $('supportOverlay').hidden=true;chosenTip=null;resetSlider();
    document.querySelector('main.app').inert=false;
    document.body.style.overflow=previousOverflow;
    const target=!supportReturnFocus?.isConnected?$('settingsButton'):supportReturnFocus;
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
    slider.setAttribute('aria-valuetext',sliderValue>=95?'Ready. Release to open the card payment page.':`${Math.round(sliderValue)} percent`);
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
    $('supportTitle').hidden=true;$('supportCoffee').hidden=true;
    $('supportDialog').setAttribute('aria-labelledby','confirmAmount');
    $('supportDialog').setAttribute('aria-describedby','donationConfirmNote');
    $('confirmAmount').textContent=`Your tip: €${amount}`;
    $('sliderLabel').textContent='Slide to go to card payment page';
    $('donationSlider').setAttribute('aria-label','Slide to go to card payment page');
    $('donationSlider').focus({preventScroll:true});
    analyticsEvent('donation_amount_selected',{language,amount});
  }
  function completeDonation(){
    if(checkoutOpening||!tipAmounts.includes(chosenTip)||!donationUrl||$('supportOverlay').hidden||$('supportConfirm').hidden)return;
    checkoutOpening=true;
    const amount=chosenTip,checkout=new URL(donationUrl);
    checkout.searchParams.set('prefilled_amount',String(amount*100));
    localStorage.setItem(supportDonationAttemptKey,'true');
    resetSupportCountdown();
    analyticsEvent('donation_click',{language,amount});
    closeSupport();
    const popup=window.open(checkout.href,'_blank');
    if(popup)popup.opener=null;else window.location.assign(checkout.href);
  }
  async function loadDonation(){
    try{
      donationConfig=await fetchLiveConfig('./donation_config.txt');
    }catch(_){donationConfig=null;}
    renderDonation();
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
    $('settingsTitle').textContent=c.settings;
    $('homeLocalityTitle').textContent=c.homeLocalityTitle;
    $('closeSettings').setAttribute('aria-label',c.cancel);
    renderHomeLocality();
    $('locationBehaviourLabel').textContent=c.locationBehaviour;
    $('keepLocalityTitle').textContent=c.keepTitle;
    $('followLocationTitle').textContent=c.followTitle;
    $('keepLocalityMode').checked=!followLocation;
    $('followLocationMode').checked=followLocation;
  }

  function fitLocalityTitle(){
    const title=$('title');
    title.style.fontSize='';
    if(!title.clientWidth)return;
    // Start at the full heading size; reduce only when the name would be clipped.
    const button=$('localityButton');
    let size=parseFloat(getComputedStyle(title).fontSize);
    for(let attempt=0;attempt<3&&button.scrollWidth>button.clientWidth+1;attempt++){
      size=Math.max(12,size*button.clientWidth/button.scrollWidth-.2);
      title.style.fontSize=`${size}px`;
    }
  }
  function renderLocationMode(){
    const chip=$('locationModeChip');
    const locality=activeLocality();
    const mode=locality===selected?'Home':locality===detected?'Auto':'Away';
    chip.textContent=`(${mode})`;
    chip.dataset.mode=mode.toLowerCase();
    chip.title=temporaryView?`Return to ${followLocation?'automatic location':selected}`:followLocation?'Following your current location. Tap for settings.':'Saved home locality. Tap for settings.';
    chip.setAttribute('aria-label',chip.title);
  }
  const compactTime = value => {
    const [hour,minute]=value.split(':').map(Number);
    return {text:`${hour%12||12}:${String(minute).padStart(2,'0')}`,period:hour<12?'AM':'PM'};
  };
  const timeMarkup = value => {const time=compactTime(value);return `${time.text}<small>${time.period}</small>`;};
  const truckIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h11v12H3zM14 9h4l3 4v4h-7"/><path d="M18 9v4h3"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>';
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

  function usageStreakBar(){
    const record=window.BAG_DAY_STREAK.snapshot(),days=value=>`${value} ${value===1?'day':'days'}`;
    return `<div class="usage-streak-bar" aria-label="Bag Day app usage streaks"><div><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2c1 6-5 7-4 12-2-1-2-3-2-4-5 6-2 12 5 12 8 0 10-8 6-13 0 3-2 4-3 4 2-4 0-8-2-11Z"/></svg><span>Current streak<strong>${days(record.current)}</strong></span></div><div><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 3h10v6a5 5 0 0 1-10 0V3ZM7 5H3v2c0 4 2 5 5 5M17 5h4v2c0 4-2 5-5 5M12 14v6M7 21h10"/></svg><span>Longest streak<strong>${days(record.longest)}</strong></span></div></div>`;
  }
  function render() {
    if(!$('localityOverlay').hidden || !$('wasteOverlay').hidden || !$('timeOverlay').hidden || !$('supportOverlay').hidden || !$('calendarOverlay').hidden)return;
    renderStaticText();
    const locality=activeLocality();
    $('dashboard').hidden=!locality;
    $('usageStreakArea').hidden=!locality;
    if(locality)$('usageStreakArea').innerHTML=usageStreakBar();
    if(!locality)return;
    recordSupportUsage();
    const c=t(),date=shownDate();
    $('localityName').textContent=locality;
    $('localityButton').setAttribute('aria-label',`${locality}. Choose a locality`);
    const fullDate=new Intl.DateTimeFormat('en-GB',{dateStyle:'full',timeZone:'UTC'}).format(date);
    $('date').textContent=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',timeZone:'UTC'}).format(date);
    $('dateButton').setAttribute('aria-label',`${fullDate}. Choose a date`);
    $('date').title=fullDate;$('date').setAttribute('aria-label',fullDate);
    $('date').setAttribute('datetime',date.toISOString().slice(0,10));
    $('todayPill').hidden=false;
    const weekday=new Intl.DateTimeFormat('en-GB',{weekday:'long',timeZone:'UTC'}).format(date);
    $('todayPill').textContent=dayOffset===0?'Today':dayOffset===1?`Tomorrow (${weekday})`:weekday;
    $('todayPill').setAttribute('aria-label',dayOffset===0?'Today':dayOffset===1?`Tomorrow (${weekday})`:weekday);
    renderLocationMode();
    fitLocalityTitle();
    $('prevDay').disabled=dayOffset===0;
    $('nextDay').disabled=dayOffset===maxDaysAhead;
    for(const [delta,id,label] of [[-1,'previousDayName','Previous day'],[1,'nextDayName','Next day']]){
      const neighbour=new Date(date);neighbour.setUTCDate(neighbour.getUTCDate()+delta);
      const weekday=new Intl.DateTimeFormat('en-GB',{weekday:'long',timeZone:'UTC'}).format(neighbour);
      $(id).textContent=weekday;
      const button=$(delta<0?'prevDay':'nextDay');
      button.setAttribute('aria-label',`${label}: ${new Intl.DateTimeFormat('en-GB',{dateStyle:'full',timeZone:'UTC'}).format(neighbour)}`);
      button.title=button.disabled?(delta<0?'You are viewing Today':'You can look up to 30 days ahead'):button.getAttribute('aria-label');
    }
    requestAnimationFrame(syncDayNavigationLayout);
    const schedule=scheduleFor(date);
    if(!schedule.bag){
      $('collectionCardBody').innerHTML=`<div class="collection-card no-collection"><div class="no-collection-message"><div class="rest-icon" aria-hidden="true">☀</div><div class="bag-name">No collection on ${weekday}</div></div></div>`;
    }else{
      const row=rowFor(locality),time=date.getUTCDay()===6&&row[2]?row[2]:row[1];
      const figures=`<div class="collection-figures"><div class="collection-item">${bagButton(schedule.bag,c[schedule.bag])}<span class="bag-click-hint">Tap bag for info</span><span class="collection-item-label">${c[schedule.bag]}</span></div>${schedule.glass?`<div class="collection-item">${bagButton('glass',c.glassBottles)}<span class="bag-click-hint">Tap bag for info</span><span class="collection-item-label">${c.glassBottles}</span></div>`:''}</div>`;
      $('collectionCardBody').innerHTML=`<div class="collection-card">${figures}<div class="collection-timing"><div class="put-out-instruction"><span>Put your bag outside</span><strong>between <span class="time-value">${timeMarkup(formatTime(time))}</span> and <span class="time-value">${timeMarkup(time)}</span></strong></div><button type="button" class="collection-time-button" data-time-info aria-label="Collection starts at ${compactTime(time).text} ${compactTime(time).period}. More information">${truckIcon}<span class="collection-start-label">Collection starts at <strong>${timeMarkup(time)}</strong></span><span class="info-circle" aria-hidden="true">i</span></button></div></div>`;

    }
    const different=!followLocation && !temporaryView && detected&&detected!==selected&&!promptIsDismissed();
    $('locationNotice').hidden=!different;
    if(different)$('noticeText').textContent=`Nearby: ${detected}`;
  }


  function syncDayNavigationLayout(){
    const heading=document.querySelector('.collection-date');
    if($('dashboard').hidden)return;
    const top=heading.offsetTop+heading.offsetHeight+8;
    $('collectionStage').style.setProperty('--day-card-heading-space',`${top+4}px`);
  }

  function setDayNavigationMoving(moving){
    $('dayNavigation').classList.toggle('day-navigation-moving',moving);
    $('prevDay').disabled=dayOffset===0;
    $('nextDay').disabled=dayOffset===maxDaysAhead;
    $('dateButton').disabled=moving;
    $('bagArea').setAttribute('aria-busy',String(moving));
  }
  let calendarMonthIndex=0,calendarWasInert=false;
  const addDays=(date,days)=>{const copy=new Date(date);copy.setUTCDate(copy.getUTCDate()+days);return copy;};
  const monthIndex=date=>date.getUTCFullYear()*12+date.getUTCMonth();
  function renderCalendar(){
    const today=maltaToday(),last=addDays(today,maxDaysAhead);
    calendarMonthIndex=Math.max(monthIndex(today),Math.min(monthIndex(last),calendarMonthIndex));
    const first=new Date(Date.UTC(Math.floor(calendarMonthIndex/12),calendarMonthIndex%12,1,12));
    const length=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
    $('calendarMonth').textContent=new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}).format(first);
    $('calendarPreviousMonth').disabled=calendarMonthIndex<=monthIndex(today);
    $('calendarNextMonth').disabled=calendarMonthIndex>=monthIndex(last);
    const grid=$('calendarDays');grid.replaceChildren();
    for(let i=0;i<(first.getUTCDay()+6)%7;i++){const blank=document.createElement('span');blank.setAttribute('aria-hidden','true');grid.append(blank);}
    const selectedIso=shownDate().toISOString().slice(0,10);
    for(let day=1;day<=length;day++){
      const date=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth(),day,12)),iso=date.toISOString().slice(0,10);
      const button=document.createElement('button');button.type='button';button.textContent=String(day);button.dataset.date=iso;
      button.disabled=date<today || date>last;
      button.setAttribute('aria-label',new Intl.DateTimeFormat('en-GB',{dateStyle:'full',timeZone:'UTC'}).format(date));
      button.setAttribute('aria-pressed',String(iso===selectedIso));
      if(date.getTime()===today.getTime())button.setAttribute('aria-current','date');
      button.onclick=()=>selectCalendarDate(iso);grid.append(button);
    }
  }
  function openCalendar(){
    if(changingDay || performance.now()<suppressTapUntil || welcomeNeeded || !$('calendarOverlay').hidden)return;
    clearTimeout(returnTimer);
    calendarMonthIndex=monthIndex(shownDate());calendarWasInert=appContent.inert;
    $('calendarOverlay').hidden=false;appContent.inert=true;renderCalendar();
    $('calendarDialog').animate([{opacity:0,transform:'translateY(16px)'},{opacity:1,transform:'translateY(0)'}],{duration:reducedMotion()?0:220,easing:'ease-out'});
    ($('calendarDays').querySelector('[aria-pressed=true]:not(:disabled)') || $('calendarToday')).focus({preventScroll:true});
  }
  function closeCalendar(){
    if($('calendarOverlay').hidden)return;
    $('calendarOverlay').hidden=true;appContent.inert=calendarWasInert;
    $('dateButton').focus({preventScroll:true});
    if(dayOffset)returnTimer=setTimeout(()=>{dayOffset=defaultDayOffset();render();},60000);
  }
  function selectCalendarDate(iso){
    const offset=Math.round((new Date(`${iso}T12:00:00Z`)-maltaToday())/86400000);
    if(!Number.isFinite(offset) || offset<0 || offset>maxDaysAhead){renderCalendar();return;}
    closeCalendar();changeDay(offset-dayOffset);
  }
  function calendarKeydown(e){
    if(e.key==='Escape'){e.preventDefault();closeCalendar();return;}
    if(e.key==='Tab'){
      const nodes=[...$('calendarDialog').querySelectorAll('button:not(:disabled)')];
      const first=nodes[0],last=nodes[nodes.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
      return;
    }
    const active=document.activeElement;
    if(!active.dataset.date)return;
    const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[e.key];
    if(delta===undefined)return;
    e.preventDefault();
    const target=addDays(new Date(`${active.dataset.date}T12:00:00Z`),delta),today=maltaToday();
    if(target<today || target>addDays(today,maxDaysAhead))return;
    calendarMonthIndex=monthIndex(target);renderCalendar();
    $('calendarDays').querySelector(`[data-date="${target.toISOString().slice(0,10)}"]`)?.focus();
  }
  $('dateButton').onclick=openCalendar;
  $('closeCalendar').onclick=closeCalendar;
  $('calendarToday').onclick=()=>selectCalendarDate(maltaToday().toISOString().slice(0,10));
  $('calendarPreviousMonth').onclick=()=>{calendarMonthIndex--;renderCalendar();};
  $('calendarNextMonth').onclick=()=>{calendarMonthIndex++;renderCalendar();};
  $('calendarOverlay').onclick=e=>{if(e.target===$('calendarOverlay'))closeCalendar();};

  const reducedMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let changingDay=false, suppressTapUntil=0;
  async function changeDay(delta) {
    if(changingDay || !$('welcomeOverlay').hidden)return;
    const previousOffset=dayOffset;
    const next=Math.max(0,Math.min(maxDaysAhead,dayOffset+delta));
    const area=$('bagArea'),distance=area.clientWidth+24;
    changingDay=true;setDayNavigationMoving(true);
    if(next===dayOffset){
      await area.animate([{transform:area.style.transform||'translateX(0)'},{transform:'translateX(0)'}],{duration:reducedMotion()?0:300,easing:'cubic-bezier(.2,.8,.2,1)'}).finished;
    }else if(reducedMotion()){
      area.style.transform='';
      await area.animate([{opacity:1},{opacity:0}],{duration:90,easing:'ease-out'}).finished;
      dayOffset=next;render();
      await area.animate([{opacity:0},{opacity:1}],{duration:120,easing:'ease-in'}).finished;
    }else{
      await area.animate([{transform:area.style.transform||'translateX(0)'},{transform:`translateX(${-Math.sign(delta)*distance}px)`}],{duration:180,easing:'ease-in'}).finished;
      area.style.transform='';dayOffset=next;
      render();
      await area.animate([{transform:`translateX(${Math.sign(delta)*distance}px)`},{transform:'translateX(0)'}],{duration:280,easing:'cubic-bezier(.2,.8,.2,1)'}).finished;
    }
    area.style.transform='';changingDay=false;setDayNavigationMoving(false);syncDayNavigationLayout();
    if(previousOffset>0&&dayOffset===0)queueSupportInvitation();
    clearTimeout(returnTimer);
    if(dayOffset)returnTimer=setTimeout(()=>{dayOffset=defaultDayOffset();render();},60000);
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
  }

  function saveHomeLocality(name){
    if(!names.includes(name))return;
    selected=name;temporaryView=null;
    localStorage.setItem(localityKey,selected);
    analyticsEvent('locality_changed');
    dayOffset=defaultDayOffset();render();
  }

  let localityReturnFocus=null;
  function renderLocalityChoices(){
    const list=$('localityChoices'),query=normal($('localitySearch').value);
    list.replaceChildren();
    const matches=names.filter(name=>normal(name).includes(query));
    for(const name of matches){
      const button=document.createElement('button');
      button.type='button';button.className='locality-choice';
      button.setAttribute('aria-pressed',String(name===activeLocality()));
      const label=document.createElement('span');label.textContent=name;button.append(label);
      if(name===selected || name===detected){
        const mode=name===selected?'Home':'Auto';
        const chip=document.createElement('span');chip.className='mode-chip';chip.dataset.mode=mode.toLowerCase();chip.textContent=mode;button.append(chip);
      }
      button.onclick=()=>{
        temporaryView=name;
        analyticsEvent('locality_view_changed');
        closeLocalityPicker();render();
      };
      list.append(button);
    }
    $('localityEmpty').hidden=matches.length>0;
  }
  function openLocalityPicker(){
    if(changingDay || performance.now()<suppressTapUntil || welcomeNeeded || !localityModalFree())return;
    clearTimeout(returnTimer);localityReturnFocus=document.activeElement;
    $('localitySearch').value='';
    $('localityHomeNote').textContent=`Your saved home: ${selected}`;
    $('localityOverlay').hidden=false;appContent.inert=true;
    renderLocalityChoices();
    $('localityDialog').animate([{opacity:0,transform:'translateY(16px)'},{opacity:1,transform:'translateY(0)'}],{duration:reducedMotion()?0:220,easing:'ease-out'});
    $('closeLocality').focus({preventScroll:true});
    requestAnimationFrame(()=>$('localityChoices').querySelector('[aria-pressed=true]')?.scrollIntoView({block:'nearest'}));
  }
  function localityModalFree(){
    return ['settingsOverlay','supportOverlay','wasteOverlay','timeOverlay','welcomeOverlay','calendarOverlay','localityOverlay'].every(id=>$(id).hidden);
  }
  function closeLocalityPicker(){
    if($('localityOverlay').hidden)return;
    $('localityOverlay').hidden=true;appContent.inert=false;
    (localityReturnFocus?.isConnected?localityReturnFocus:$('localityButton')).focus({preventScroll:true});
    if(dayOffset)returnTimer=setTimeout(()=>{dayOffset=defaultDayOffset();render();},60000);
  }
  function localityKeydown(e){
    if(e.key==='Escape'){e.preventDefault();closeLocalityPicker();return;}
    if(e.key!=='Tab')return;
    const nodes=[...$('localityDialog').querySelectorAll('button,input')].filter(node=>node.getClientRects().length);
    const first=nodes[0],last=nodes[nodes.length-1];
    if(e.shiftKey && document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus();}
  }
  $('localityButton').onclick=openLocalityPicker;
  $('closeLocality').onclick=closeLocalityPicker;
  $('localitySearch').oninput=renderLocalityChoices;
  $('localityOverlay').onclick=e=>{if(e.target===$('localityOverlay'))closeLocalityPicker();};

  let settingsClosing=false, settingsOpener=null;
  function openSettings(){
    if(welcomeNeeded || !$('welcomeOverlay').hidden || settingsClosing||!$('settingsOverlay').hidden)return;
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

  function detectionUnavailable() {locationFailed=true;suggestWelcomeLocality();}
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
        detected=newlyDetected;
        locationFailed=false;
        // GPS may establish a home only before a home has been saved.
        // A manual choice made while GPS was pending always wins.
        if(welcomeNeeded)suggestWelcomeLocality();
        else if(!selected)saveHomeLocality(detected);
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
    dayOffset=defaultDayOffset();render();
  };
  $('locationModeChip').onclick=()=>{if(changingDay||performance.now()<suppressTapUntil)return;if(temporaryView){temporaryView=null;dayOffset=defaultDayOffset();render();}else openSettings();};
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
  $('homeLocalitySelect').onchange=()=>saveHomeLocality($('homeLocalitySelect').value);
  $('prevDay').onclick=()=>changeDay(-1);
  $('nextDay').onclick=()=>changeDay(1);
  $('donationCard').addEventListener('click',()=>openSupport());
  $('closeSupport').onclick=closeSupport;
  $('dismissSupport').onclick=closeSupport;
  $('supportOverlay').onclick=e=>{if(e.target===$('supportOverlay'))closeSupport();};
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
    $('sliderStatus').textContent=sliderValue>=95?'Press Enter to open the card payment page.':'';
  });
  window.addEventListener('resize',()=>{if(!$('supportConfirm').hidden)resetSlider();});
  window.addEventListener('storage',e=>{
    if([supportInteractionKey,supportLastShownKey,supportDonationAttemptKey].includes(e.key)){
      supportActiveElapsed=0;supportActiveStamp=null;
    }
  });
  setInterval(queueSupportInvitation,1000);
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
      setDayNavigationMoving(true);
      const atEnd=(g.dx>0&&dayOffset===0)||(g.dx<0&&dayOffset===maxDaysAhead);
      const shift=atEnd?Math.sign(g.dx)*Math.min(65,Math.abs(g.dx)*.25):g.dx;
      if(!reducedMotion())$('bagArea').style.transform=`translateX(${shift}px)`;
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
  document.addEventListener('keydown',e=>{if(!splash.hidden || !$('welcomeOverlay').hidden)return;if(!$('localityOverlay').hidden){localityKeydown(e);return;}if(!$('calendarOverlay').hidden){calendarKeydown(e);return;}if(!$('timeOverlay').hidden){timeInfoKeydown(e);return;}if(!$('wasteOverlay').hidden){wasteKeydown(e);return;}if(!$('supportOverlay').hidden){supportKeydown(e);return;}if(!$('settingsOverlay').hidden){if(e.key==='Escape')closeSettings();if(e.key==='Tab'){const nodes=[...$('settingsDialog').querySelectorAll('button:not([hidden]),select,input')].filter(n=>!n.disabled);const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}return;}if(e.key==='ArrowRight')changeDay(1);if(e.key==='ArrowLeft')changeDay(-1);});
  document.addEventListener('visibilitychange',()=>{queueSupportInvitation();if(!document.hidden){render();loadDonation();detectLocation();}});
  setInterval(()=>{if(dayOffset===0&&!homeGesture&&!changingDay)render();},60000);
  setInterval(()=>{
    if(homeGesture||changingDay||document.hidden||!splash.hidden||!$('settingsOverlay').hidden||!$('supportOverlay').hidden||!$('wasteOverlay').hidden||!$('timeOverlay').hidden||!$('welcomeOverlay').hidden||!$('calendarOverlay').hidden||!$('localityOverlay').hidden||reducedMotion())return;
    const figures=document.querySelector('.collection-figures');if(!figures)return;
    figures.classList.remove('tap-demo');void figures.offsetWidth;figures.classList.add('tap-demo');
  },10000);
  function syncViewport(){
    const height=window.visualViewport?.height||window.innerHeight;
    requestAnimationFrame(()=>{fitLocalityTitle();syncDayNavigationLayout();});
    if(height)document.documentElement.style.setProperty('--app-height',`${height}px`);
  }
  syncViewport();
  window.addEventListener('resize',syncViewport);
  window.visualViewport?.addEventListener('resize',syncViewport);
  render();
  loadDonation();
  loadAnalytics();
  if(welcomeNeeded){if(splash.hidden)openWelcome();}
  else detectLocation();
  if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
  // Hardware Back uses the same close routines as each panel's own controls.
  for(const [id,close] of [['settingsOverlay',closeSettings],['supportOverlay',closeSupport],['wasteOverlay',closeWasteGuide],['timeOverlay',closeTimeInfo],['calendarOverlay',closeCalendar],['localityOverlay',closeLocalityPicker]]){
    window.BAG_DAY_BACK?.register(id,{isOpen:()=>!$(id).hidden,close});
  }
})();

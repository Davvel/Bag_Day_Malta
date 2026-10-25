/* Shared, consent-gated GA4 measurement. No account, contact or free-text fields. */
(() => {
 'use strict';
 if(window.BAG_DAY_ANALYTICS)return;
 const VERSION='1.1.50',scriptURL=new URL(document.currentScript.src),root=new URL('../',scriptURL);
 const area=location.pathname.startsWith(new URL('reuse/',root).pathname)?'reuse':location.pathname.startsWith(new URL('game/',root).pathname)?'game':'home';
 const consentKey='bag-day-analytics-consent-v1',excludeKey='bag-day-analytics-exclude-v1';
 const get=k=>{try{return localStorage.getItem(k)}catch{return null}},put=(k,v)=>{try{localStorage.setItem(k,v)}catch{}};
 // Unlisted device-testing links, applied before any analytics can start.
 // This is a local preference, not an authenticated administrator control.
 try{
  const url=new URL(location.href),choice=url.searchParams.get('exclude_usage');
  if(choice==='1'||choice==='0'){
   put(excludeKey,String(choice==='1'));
   url.searchParams.delete('exclude_usage');
   try{history.replaceState(history.state,'',url.href)}catch{}
  }
 }catch{}
 const allowed=()=>get(consentKey)==='granted'&&get(excludeKey)!=='true';
 const names=new Set(('help_preference_changed help_tip_shown help_tip_click page_view bagday_open bagday_daily_use app_resume app_install_prompt app_install schedule_view calendar_open day_changed time_info_open waste_guide_open settings_open appearance_changed locality_picker_open locality_changed locality_view_changed gps_used gps_unavailable current_locality_viewed follow_location_enabled onboarding_complete donation_prompt_open donation_amount_selected donation_click sponsor_impression sponsor_click sponsor_click_after_view community_impression community_click community_click_after_view council_impression council_website_click council_whatsapp_click bulky_info_open bulky_call_click bulky_source_click game_open game_ready game_unavailable game_round_start game_round_complete game_round_abandon game_pause game_resume game_guide_open reuse_entry_click reuse_open reuse_search reuse_filter_changed reuse_item_impression reuse_item_open reuse_phone_copy reuse_advert_click reuse_phone_request reuse_phone_revealed reuse_phone_call_click reuse_give_click reuse_my_items_open reuse_signin_open reuse_signin_success reuse_signin_cancel reuse_signout reuse_enrolment_start reuse_enrolment_submit reuse_enrolment_success reuse_item_form_open reuse_item_submit reuse_item_submitted reuse_item_edit_saved reuse_item_taken reuse_item_withdrawn reuse_action_error').split(' '));
 const enums={help_state:['on','off'],feature:['game','calendar','reuse'],entry_point:['header','settings','direct','give_button','empty_state','my_items','phone','account'],search_scope:['all','locality'],contact_type:['phone','url','both'],listing_state:['pending','live'],operation:['signin','enrolment','create','edit','taken','withdraw','phone','search'],bag_type:['organic','mixed','recycle','glass','none'],direction:['forward','back'],appearance:['light','dark'],advert_kind:['paid','community'],advert_format:['image','text'],data_source:['live','saved'],source_type:['government','wasteserv','council'],mode:['practice','timed'],outcome:['passed','retry'],choice:['accepted','dismissed'],language:['en']};
 const numeric={has_search:[0,1],day_offset:[0,30],booking_month:[1,12],booking_year:[2020,2200],sponsor_slot:[1,100],result_count:[0,200],page_index:[0,100000],has_phone:[0,1],has_url:[0,1],status_code:[0,599],level:[1,100],score:[0,10000],mistakes:[0,10000],accuracy:[0,100],duration_seconds:[0,86400]};
 function clean(params){const out={};for(const[k,v]of Object.entries(params||{})){
  if(enums[k]?.includes(v))out[k]=v;
  else if(numeric[k]&&typeof v==='number'&&Number.isFinite(v)&&v>=numeric[k][0]&&v<=numeric[k][1])out[k]=Math.round(v);
  else if(k==='community_advert_id'&&/^[A-Za-z0-9_-]{1,100}$/.test(String(v)))out[k]=String(v);
  else if(k==='sponsor_id'&&/^[A-Za-z0-9_-]{1,80}$/.test(String(v)))out[k]=String(v);
  else if(k==='placement_locality'&&window.WASTE_DATA?.localities?.some(r=>r[0]===v))out[k]=v;
 }return out;}
 let id='',ready=false,loading=null,configured=false,lastAttempt=0,state='waiting_for_consent',queue=[],pageCounted=false,hiddenAt=0;
 const seen=new Set(),actions=new Set(),watches=new Set();
 const safeLocation=()=>new URL(area==='reuse'?'reuse/':area==='game'?'game/':'./',root).href;
 const safeReferrer=()=>{try{return new URL(document.referrer).origin+'/'}catch{return ''}};
 function emit(name,params={}){if(!allowed()||!ready)return false;try{window.gtag('event',name,{...params,app_version:VERSION,app_area:area,display_mode:matchMedia('(display-mode: standalone)').matches?'standalone':'browser',page_location:safeLocation(),page_referrer:safeReferrer(),send_to:id});return true}catch{return false}}
 function daily(){const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Malta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),key='bag-day-analytics-last-day-v1';if(get(key)!==date&&emit('bagday_daily_use'))put(key,date)}
 function activate(){if(!allowed()||!ready)return;if(!pageCounted){emit('page_view',{page_title:area==='reuse'?'REUSE · Bag Day Malta':area==='game'?'The 1 Minute Sorting Game':'Bag Day Malta'});emit('bagday_open');if(area==='reuse')emit('reuse_open',{entry_point:location.hash==='#mine'||location.hash==='#join'?'settings':'direct'});pageCounted=true}daily();const pending=queue;queue=[];for(const e of pending)if(Date.now()-e.at<30000)emit(e.name,e.params);window.dispatchEvent(new Event('bag-day-analytics-ready'))}
 async function start(){
  if(!allowed()){state=get(excludeKey)==='true'?'excluded':'waiting_for_consent';return}
  if(ready){activate();return}if(loading)return loading;if(Date.now()-lastAttempt<60000)return;
  lastAttempt=Date.now();state='loading';
  loading=(async()=>{try{
   let text;if(location.protocol==='file:')text=window.BAG_DAY_LOCAL_FILES?.['analytics_config.txt']||'';
   else{const r=await fetch(new URL('analytics_config.txt',root),{cache:'no-store'});if(!r.ok)throw Error('configuration_missing');text=await r.text()}
   const cfg=Object.fromEntries(text.split(/\r?\n/).filter(l=>!/^\s*#/.test(l)).map(l=>{const p=l.indexOf('=');return p<0?[]:[l.slice(0,p).trim(),l.slice(p+1).trim()]}).filter(r=>r.length));
   if(String(cfg.Analytics_Enabled).toLowerCase()!=='true'){state='disabled_in_configuration';queue=[];return}
   id=String(cfg.Measurement_ID||'');if(!/^G-[A-Z0-9]+$/i.test(id)||id==='G-XXXXXXXXXX')throw Error('measurement_id_missing');if(!allowed())return;
   window['ga-disable-'+id]=false;
   if(!configured){window.dataLayer=window.dataLayer||[];window.gtag=function(){window.dataLayer.push(arguments)};
    window.gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
    window.gtag('consent','update',{analytics_storage:'granted'});window.gtag('js',new Date());
    window.gtag('config',id,{send_page_view:false,page_location:safeLocation(),page_referrer:safeReferrer(),page_title:area==='reuse'?'REUSE · Bag Day Malta':area==='game'?'The 1 Minute Sorting Game':'Bag Day Malta',allow_google_signals:false,allow_ad_personalization_signals:false});
    configured=true;
   }else window.gtag('consent','update',{analytics_storage:'granted'});
   if(document.querySelector('script[data-bagday-ga-loaded="true"]')){ready=true;state='ready';activate();return}
   document.querySelector('script[data-bagday-ga]')?.remove();
   await new Promise(resolve=>{const s=document.createElement('script');s.async=true;s.dataset.bagdayGa='true';s.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(id);let settled=false;const done=ok=>{if(settled)return;settled=true;clearTimeout(timer);if(ok){s.dataset.bagdayGaLoaded='true';ready=allowed();state=ready?'ready':'waiting_for_consent';activate()}else{state='tag_unavailable';queue=[]}resolve()};const timer=setTimeout(()=>done(false),10000);s.onload=()=>done(true);s.onerror=()=>done(false);document.head.append(s)});
  }catch(e){state=['configuration_missing','measurement_id_missing'].includes(e.message)?e.message:'unavailable';queue=[]}finally{loading=null}})();return loading;
 }
 function event(name,params={}){if(!names.has(name)||name==='page_view'||!allowed())return false;const safe=clean(params);if(ready)return emit(name,safe);queue.push({name,params:safe,at:Date.now()});if(queue.length>100)queue.shift();start();return true}
 function removeCookies(){document.cookie.split(';').forEach(pair=>{const n=pair.trim().split('=')[0];if(!/^_ga($|_)/.test(n))return;const parts=location.hostname.split('.');for(const p of ['/',new URL('reuse/',root).pathname]){document.cookie=n+'=; Max-Age=0; path='+p;for(let i=0;i<parts.length-1;i++)document.cookie=n+'=; Max-Age=0; path='+p+'; domain=.'+parts.slice(i).join('.')}})}
 function sync(){for(const w of watches)w.since=0;if(!allowed()){queue=[];ready=false;state=get(excludeKey)==='true'?'excluded':'waiting_for_consent';if(id)window['ga-disable-'+id]=true;window.gtag?.('consent','update',{analytics_storage:'denied'});removeCookies()}else{if(id)window['ga-disable-'+id]=false;lastAttempt=0;start()}window.dispatchEvent(new Event('bag-day-analytics-choice'))}
 function setConsent(value){put(consentKey,value?'granted':'denied');sync()}
 function setExcluded(value){put(excludeKey,String(!!value));sync()}
 function visible(element){
  if(document.hidden||!element.isConnected||element.closest('[hidden],[inert]'))return false;
  const modal=document.querySelector('dialog[open]');if(modal&&!modal.contains(element))return false;
  if([...element.querySelectorAll('img')].some(i=>!i.complete||!i.naturalWidth))return false;
  const r=element.getBoundingClientRect(),s=getComputedStyle(element);if(r.width<=0||r.height<=0||s.visibility==='hidden'||s.display==='none'||Number(s.opacity)===0)return false;
  let left=Math.max(0,r.left),right=Math.min(innerWidth,r.right),top=Math.max(0,r.top),bottom=Math.min(innerHeight,r.bottom);
  for(let p=element.parentElement;p;p=p.parentElement){const css=getComputedStyle(p),rect=p.getBoundingClientRect();if(/^(auto|scroll|hidden|clip)$/.test(css.overflowX)){left=Math.max(left,rect.left);right=Math.min(right,rect.right)}if(/^(auto|scroll|hidden|clip)$/.test(css.overflowY)){top=Math.max(top,rect.top);bottom=Math.min(bottom,rect.bottom)}}
  return Math.max(0,right-left)*Math.max(0,bottom-top)>=r.width*r.height*.5;
 }

 function observe(element,name,params,key){if(!element||seen.has(key)||[...watches].some(w=>w.element===element&&w.key===key))return;watches.add({element,name,params,key,since:0})}
 setInterval(()=>{const time=performance.now();for(const w of watches){if(!w.element.isConnected||seen.has(w.key)){watches.delete(w);continue}if(!allowed()||!visible(w.element)){w.since=0;continue}if(!w.since)w.since=time;if(time-w.since>=1000&&event(w.name,typeof w.params==='function'?w.params():w.params)){seen.add(w.key);watches.delete(w)}}},200);
 window.addEventListener('storage',e=>{if([consentKey,excludeKey].includes(e.key)||e.key===null)sync()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){hiddenAt=Date.now();for(const w of watches)w.since=0}else{if(hiddenAt&&Date.now()-hiddenAt>=30000)event('app_resume');hiddenAt=0;if(allowed()){start();if(ready)daily()}}});
 window.addEventListener('appinstalled',()=>event('app_install'));window.addEventListener('beforeinstallprompt',()=>event('app_install_prompt'));
 function once(name,params,key){if(actions.has(key)||!event(name,params))return false;actions.add(key);return true}
 window.BAG_DAY_ANALYTICS={event,once,viewed:key=>seen.has(key),observe,start,allowed,setConsent,setExcluded,status:()=>({state,consent:get(consentKey)||'unset',excluded:get(excludeKey)==='true',measurement_id:id||null,ready,version:VERSION})};
 start();
})();

importScripts('./app-config.js?v=1.1.125');
const CACHE='bag-day-malta-'+globalThis.BAG_DAY_CONFIG.version;
const ASSETS=["./noticeboard/calendar-motion.mjs?v=1.1.125","./noticeboard/notice-dates.mjs?v=1.1.125","./noticeboard/calendar-model.mjs?v=1.1.125","./noticeboard/options.mjs?v=1.1.125","./noticeboard/editor-help.mjs?v=1.1.125","./noticeboard/discovery.mjs?v=1.1.125","./noticeboard/symbol-picker.mjs?v=1.1.125","./icons/sunday-features.webp","./css/sunday-hub.css?v=1.1.125","./js/sunday-hub.js?v=1.1.125","./icons/bag-organic-light.webp","./icons/bag-mixed-light.webp","./icons/bag-recycle-light.webp","./icons/glass-light.webp","./noticeboard/links.mjs?v=1.1.125","./app-config.js?v=1.1.125","./reuse/show-until.mjs?v=1.1.125","./reuse/app.mjs?v=1.1.125","./reuse/style.css?v=1.1.125","./js/sponsors.js?v=1.1.125","./js/home-fit.js?v=1.1.125","./css/home-redesign.css?v=1.1.125","./noticeboard/sponsors.mjs?v=1.1.125","./js/home-link.js?v=1.1.125","./icons/bag-day-malta-brand.svg","./css/brand.css?v=1.1.125","./noticeboard/routes.mjs?v=1.1.125","./icons/community-notices.png","./noticeboard/appearance.js?v=1.1.125","./reuse/public-feed.mjs?v=1.1.125","./reuse/feed-data.mjs?v=1.1.125","./reuse/config.mjs?v=1.1.125","./reuse/client.mjs?v=1.1.125","./noticeboard/index.html","./noticeboard/style.css?v=1.1.125","./noticeboard/shared.mjs?v=1.1.125","./noticeboard/public.mjs?v=1.1.125","./icons/council-website.svg","./icons/council-bulky.svg","./icons/council-truck.svg","./icons/hospice-battery.svg","./js/zoom-awareness.js?v=1.1.125","./css/zoom-awareness.css?v=1.1.125","./reuse/custom-emoji.mjs?v=1.1.125","./js/help-preferences.js?v=1.1.125","./css/discovery.css?v=1.1.125","./icons/reuse-free-stuff-v1.png","./reuse/purchase-info.mjs?v=1.1.125","./js/startup.js?v=1.1.125","./css/startup.css?v=1.1.125","./js/advert-policy.js?v=1.1.125","./js/community-adverts.js?v=1.1.125","./js/sponsor-carousel.js?v=1.1.125","./css/sponsor-carousel.css?v=1.1.125","./reuse/title-text.mjs?v=1.1.125","./reuse/title-icons.mjs?v=1.1.125","./reuse/ai-icon-state.mjs?v=1.1.125","./reuse/item-attributes.mjs?v=1.1.125","./reuse/emoji-palette.mjs?v=1.1.125","./reuse/item-symbols.mjs?v=1.1.125","./reuse/item-dates.mjs?v=1.1.125","./js/analytics.js?v=1.1.125","./reuse/analytics-ui.js?v=1.1.125","./reuse/location.mjs?v=1.1.125","./reuse/index.html","./reuse/client.mjs","./reuse/config.mjs","./reuse/entry.mjs?v=1.1.125","./icons/card-recycling.svg","./icons/sorting-minute.svg","./js/bulky-refuse.js?v=1.1.125","./icons/council-backdrop.svg","./icons/card-botanical.svg","./js/local-preview-data.js?v=1.1.125","./data/councils.csv","./js/info-panel.js?v=1.1.125","./css/info-panel.css?v=1.1.125","./js/home-hints.js?v=1.1.125","./icons/hint-hand.svg","./js/usage-streak.js?v=1.1.125","./js/navigation.js?v=1.1.125","./","./index.html","./css/styles.css?v=1.1.125","./js/data.js?v=1.1.125","./js/app.js?v=1.1.125","./js/waste-guide.js?v=1.1.125","./manifest.webmanifest?v=1.1.125","./icons/icon-192.png?v=1.1.125","./icons/icon-512.png?v=1.1.125","./icons/icon-maskable-512.png?v=1.1.125","./icons/apple-touch-icon.png?v=1.1.125","./icons/favicon-32.png?v=1.1.125","./icons/zejtunsoft-profile.png"];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE)
    .then(cache=>cache.addAll(ASSETS.map(asset=>new Request(new URL(asset,self.location.href),{cache:'reload'}))))
    .then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('bag-day-malta-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  if(url.pathname.includes('/api/')||event.request.headers.has('Authorization'))return;
  if(/^\/Edit(?:Police|Council|Church)NoticeBoard(?:\/|$)/.test(url.pathname)||/\/EditorPage[1-9]\d*(?:\/|$)/.test(url.pathname)||url.pathname.includes('/noticeboard/editor'))return;
  // Admin manages its own application shell; never intercept it here.
  const adminRoot=new URL('./admin/',self.location.href).pathname;
  if(url.pathname===adminRoot.slice(0,-1)||url.pathname.startsWith(adminRoot))return;
  // Old bundled sponsor CSV files are no longer a public data source.
  if(url.pathname.endsWith('/data/sponsors.csv')||url.pathname.endsWith('/data/sponsor_slots.csv'))return;
  // Optional game assets use their own worker/cache and never enter the core precache.
  const optionalGameRoot=new URL('./game/',self.location.href).pathname;
  if(url.pathname.startsWith(optionalGameRoot)||url.pathname.endsWith('/js/game-launcher.js')||url.pathname.endsWith('/css/game-launcher.css'))return;
  // Live configuration must never be satisfied from the service-worker cache.
  if(url.pathname.endsWith('/game_config.txt')||url.pathname.endsWith('/donation_config.txt')||url.pathname.endsWith('/analytics_config.txt')||url.pathname.endsWith('/service-worker.js')){
    event.respondWith(fetch(event.request,{cache:'no-store'}));
    return;
  }
  // Online navigation always fetches the latest HTML; cached pages are offline fallbacks.
  if(event.request.mode==='navigate'){
    const homeRoot=new URL('./',self.location.href);
    const homeDocument=url.pathname===homeRoot.pathname||url.pathname===new URL('./index.html',self.location.href).pathname;
    const noticeDocument=url.pathname===new URL('./noticeboard/',self.location.href).pathname||url.pathname===new URL('./noticeboard/index.html',self.location.href).pathname;
    const key=homeDocument?new URL('./index.html',self.location.href).href:noticeDocument?new URL('./noticeboard/index.html',self.location.href).href:event.request;
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      try{
        const response=await fetch(event.request,{cache:'no-store'});
        if(response.ok)await cache.put(key,response.clone()).catch(()=>{});
        return response;
      }catch{
        // Use this release's canonical Home shell for Settings too. Never
        // search older caches or return a stale query-specific Home copy.
        return (await cache.match(key))||Response.error();
      }
    })());
    return;
  }
  // Versioned code/styles and local images are immutable within this release.
  if(url.searchParams.has('v') || /\.(?:svg|png|webp|ico)$/.test(url.pathname)){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE),cached=await cache.match(event.request);
      if(cached)return cached;
      const response=await fetch(event.request);
      if(response.ok)event.waitUntil(cache.put(event.request,response.clone()).catch(()=>{}));
      return response;
    })());
    return;
  }
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
    return response;
  }).catch(()=>caches.match(event.request).then(hit=>hit||(event.request.mode==='navigate'&&new URL(event.request.url).searchParams.get('panel')==='settings'?caches.match('./index.html'):undefined))));
});

// v34: versioned shell assets prevent old installed PWAs from mixing HTML with stale JS/CSS.

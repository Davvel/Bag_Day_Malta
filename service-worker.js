const CACHE='bag-day-malta-1.1.44';
const ASSETS=['./icons/council-website.svg','./icons/council-bulky.svg','./icons/council-truck.svg','./icons/hospice-battery.svg','./js/zoom-awareness.js?v=1.1.44','./css/zoom-awareness.css?v=1.1.44','./reuse/custom-emoji.mjs?v=1.1.44','./js/help-preferences.js?v=1.1.44','./css/discovery.css?v=1.1.44','./icons/reuse-free-stuff-v1.png','./reuse/purchase-info.mjs?v=1.1.44','./js/startup.js?v=1.1.44','./css/startup.css?v=1.1.44','./js/advert-policy.js?v=1.1.44','./js/community-adverts.js?v=1.1.44','./js/sponsor-carousel.js?v=1.1.44','./css/sponsor-carousel.css?v=1.1.44','./reuse/title-text.mjs?v=1.1.44','./reuse/title-icons.mjs?v=1.1.44','./reuse/ai-icon-state.mjs?v=1.1.44','./reuse/item-attributes.mjs?v=1.1.44','./reuse/emoji-palette.mjs?v=1.1.44','./reuse/item-symbols.mjs?v=1.1.44','./reuse/item-dates.mjs?v=1.1.44','./js/analytics.js?v=1.1.44','./reuse/analytics-ui.js?v=1.1.44','./reuse/location.mjs?v=1.1.44','./reuse/index.html','./reuse/style.css?v=1.1.44','./reuse/app.mjs?v=1.1.44','./reuse/client.mjs','./reuse/config.mjs','./reuse/entry.mjs?v=1.1.44','./icons/card-recycling.svg','./icons/sorting-minute.svg','./js/bulky-refuse.js?v=1.1.44','./icons/council-backdrop.svg','./icons/glass-real.webp','./icons/card-botanical.svg','./css/home-redesign.css?v=1.1.44','./js/local-preview-data.js?v=1.1.44','./icons/bag-organic-real.webp','./icons/bag-mixed-real.webp','./icons/bag-recycle-real.webp','./js/sponsors.js?v=1.1.44','./data/councils.csv','./js/info-panel.js?v=1.1.44','./css/info-panel.css?v=1.1.44','./js/home-hints.js?v=1.1.44','./icons/hint-hand.svg','./js/usage-streak.js?v=1.1.44','./js/navigation.js?v=1.1.44','./','./index.html','./css/styles.css?v=1.1.44','./js/data.js?v=1.1.44','./js/app.js?v=1.1.44','./js/waste-guide.js?v=1.1.44','./icons/bag-organic.svg','./icons/bag-mixed.svg','./icons/bag-recycle.svg','./manifest.webmanifest?v=1.1.44','./icons/icon-192.png?v=1.1.44','./icons/icon-512.png?v=1.1.44','./icons/icon-maskable-512.png?v=1.1.44','./icons/apple-touch-icon.png?v=1.1.44','./icons/favicon-32.png?v=1.1.44','./icons/glass-carrier.svg','./icons/zejtunsoft-profile.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS.map(asset=>/^(?:\.\/|\.\/index\.html|\.\/reuse\/index\.html)$/.test(asset)?new Request(new URL(asset,self.location.href),{cache:'reload'}):asset))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('bag-day-malta-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  if(url.pathname.includes('/api/')||event.request.headers.has('Authorization'))return;
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
  // Revalidate HTML instead of allowing a previously visited Settings query
  // to reuse an older document from the browser's HTTP cache.
  if(event.request.mode==='navigate'){
    const homeRoot=new URL('./',self.location.href);
    const homeDocument=url.pathname===homeRoot.pathname||url.pathname===new URL('./index.html',self.location.href).pathname;
    const key=homeDocument?new URL('./index.html',self.location.href).href:event.request;
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      try{
        const response=await fetch(event.request,{cache:'no-cache'});
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
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
    return response;
  }).catch(()=>caches.match(event.request).then(hit=>hit||(event.request.mode==='navigate'&&new URL(event.request.url).searchParams.get('panel')==='settings'?caches.match('./index.html'):undefined))));
});

// v34: versioned shell assets prevent old installed PWAs from mixing HTML with stale JS/CSS.

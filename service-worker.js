const CACHE='bag-day-malta-1.1.22';
const ASSETS=['./js/advert-policy.js?v=1.1.22','./js/community-adverts.js?v=1.1.22','./js/sponsor-carousel.js?v=1.1.22','./css/sponsor-carousel.css?v=1.1.22','./reuse/title-text.mjs?v=1.1.22','./reuse/title-icons.mjs?v=1.1.22','./reuse/ai-icon-state.mjs?v=1.1.22','./reuse/item-attributes.mjs?v=1.1.22','./reuse/emoji-palette.mjs?v=1.1.22','./reuse/item-symbols.mjs?v=1.1.22','./reuse/item-dates.mjs?v=1.1.22','./js/analytics.js?v=1.1.22','./reuse/analytics-ui.js?v=1.1.22','./reuse/location.mjs?v=1.1.22','./reuse/index.html','./reuse/style.css?v=1.1.22','./reuse/app.mjs?v=1.1.22','./reuse/client.mjs','./reuse/config.mjs','./reuse/entry.mjs?v=1.1.22','./icons/card-recycling.svg','./icons/sorting-minute.svg','./js/bulky-refuse.js?v=1.1.22','./icons/council-backdrop.svg','./icons/glass-real.png','./icons/card-botanical.svg','./css/home-redesign.css?v=1.1.22','./js/local-preview-data.js?v=1.1.22','./icons/bag-organic-real.png','./icons/bag-mixed-real.png','./icons/bag-recycle-real.png','./js/sponsors.js?v=1.1.22','./data/councils.csv','./js/info-panel.js?v=1.1.22','./css/info-panel.css?v=1.1.22','./js/home-hints.js?v=1.1.22','./icons/hint-hand.svg','./js/usage-streak.js?v=1.1.22','./js/navigation.js?v=1.1.22','./','./index.html','./css/styles.css?v=1.1.22','./js/data.js?v=1.1.22','./js/app.js?v=1.1.22','./js/waste-guide.js?v=1.1.22','./icons/bag-organic.svg','./icons/bag-mixed.svg','./icons/bag-recycle.svg','./manifest.webmanifest?v=1.1.22','./icons/icon-192.png?v=1.1.22','./icons/icon-512.png?v=1.1.22','./icons/icon-maskable-512.png?v=1.1.22','./icons/apple-touch-icon.png?v=1.1.22','./icons/favicon-32.png?v=1.1.22','./icons/glass-carrier.svg','./icons/zejtunsoft-profile.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));});
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
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
    return response;
  }).catch(()=>caches.match(event.request)));
});

// v34: versioned shell assets prevent old installed PWAs from mixing HTML with stale JS/CSS.

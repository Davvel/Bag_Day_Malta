const CACHE='bag-day-malta-2026-10-v36';
const ASSETS=['./','./index.html','./styles.css?v=36','./data.js?v=36','./app.js?v=36','./waste-guide.js?v=36','./icons/bag-organic.svg','./icons/bag-mixed.svg','./icons/bag-recycle.svg','./manifest.webmanifest','./icons/icon.svg','./icons/icon-192.png','./icons/icon-512.png','./icons/glass-carrier.svg','./icons/zejtunsoft-profile.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  // Live configuration must never be satisfied from the service-worker cache.
  if(url.pathname.endsWith('/donation_config.txt')||url.pathname.endsWith('/analytics_config.txt')||url.pathname.endsWith('/service-worker.js')){
    event.respondWith(fetch(event.request,{cache:'no-store'}));
    return;
  }
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
    return response;
  }).catch(()=>caches.match(event.request)));
});

// v34: versioned shell assets prevent old installed PWAs from mixing HTML with stale JS/CSS.

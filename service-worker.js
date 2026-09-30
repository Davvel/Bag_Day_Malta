const CACHE='bag-day-malta-2026-09-v18';
const ASSETS=['./','./index.html','./styles.css?v=14','./data.js?v=14','./app.js?v=14','./manifest.webmanifest','./icons/icon.svg','./icons/icon-192.png','./icons/icon-512.png','./icons/glass-carrier.svg','./icons/mt.svg','./icons/gb.svg'];
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

// v18: versioned shell assets prevent old installed PWAs from mixing HTML with stale JS/CSS.

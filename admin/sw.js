const CACHE='bagday-admin-shell-v1.1.43';
const SHELL=['./assets/purchase-info.mjs?v=1.1.43','./assets/community.mjs','./assets/item-attributes.mjs?v=1.1.43','./','./index.html','./manifest.webmanifest','./assets/style.css','./assets/app.mjs','./assets/config.mjs','./assets/data.mjs','./assets/api.mjs','./assets/exporter.mjs','./assets/reuse.mjs','./assets/icon-192.png','./assets/icon-512.png'];
const permitted=new Set(SHELL.map(p=>new URL(p,self.registration.scope).href));
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('bagday-admin-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||e.request.headers.has('Authorization')||!permitted.has(e.request.url))return;e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(e.request,copy)))}return r}).catch(()=>caches.match(e.request)))});

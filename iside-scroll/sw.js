// No precache of external photographs: latest text and images are requested online.
const NAME='iside-scroll-v2';
self.addEventListener('install',e=>{e.waitUntil(caches.open(NAME).then(c=>c.addAll(['./','index.html','favicon.svg','manifest.webmanifest'])).catch(()=>{}));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('iside-scroll-')&&k!==NAME).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;if(new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(NAME).then(c=>c.put(e.request,copy))}return r}).catch(()=>caches.match(e.request)))});
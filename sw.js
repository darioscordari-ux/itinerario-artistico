self.addEventListener('install',event=>{self.skipWaiting()});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    try{const keys=await caches.keys();await Promise.all(keys.map(k=>caches.delete(k)))}catch{}
    try{await self.registration.unregister()}catch{}
    try{const clientsList=await self.clients.matchAll({type:'window'});clientsList.forEach(c=>c.navigate(c.url))}catch{}
  })());
});

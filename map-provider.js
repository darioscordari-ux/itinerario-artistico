(()=>{
  'use strict';
  if (!window.L || !L.tileLayer) return;
  const original = L.tileLayer;
  L.tileLayer = function(url, options){
    const opts = {...(options||{})};
    const isBasemap = /arcgisonline\.com|cartocdn\.com|openstreetmap\.fr\/hot/i.test(String(url));
    if (isBasemap){
      url = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
      delete opts.subdomains;
      opts.maxZoom = 19;
      opts.attribution = '&copy; OpenStreetMap contributors';
      opts.crossOrigin = true;
      opts.referrerPolicy = 'strict-origin-when-cross-origin';
    }
    return original.call(L, url, opts);
  };
})();

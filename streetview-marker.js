(()=>{
  'use strict';

  let timer=null;

  function streetViewUrl(lat,lng){
    return 'https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=' +
      encodeURIComponent(lat + ',' + lng);
  }

  function bindMarker(layer){
    const el=layer?._icon;
    const number=el?.querySelector?.('.markerPin span');
    if(!number || number.dataset.streetviewBound==='1') return;

    number.dataset.streetviewBound='1';
    number.title='Apri vista 3D / Street View';
    number.setAttribute('aria-label','Apri vista 3D / Street View di questa tappa');
    number.style.cursor='pointer';

    const openView=(e)=>{
      if(document.body.classList.contains('routeEditing')) return;
      e.preventDefault();
      e.stopPropagation();
      if(typeof e.stopImmediatePropagation==='function') e.stopImmediatePropagation();
      const ll=layer.getLatLng?.();
      if(!ll) return;
      window.open(streetViewUrl(ll.lat,ll.lng),'_blank','noopener,noreferrer');
    };

    number.addEventListener('click',openView,true);
  }

  function scan(){
    const map=window.__IA_MAP;
    if(!map?.eachLayer) return;
    map.eachLayer(layer=>{
      if(layer?._icon?.querySelector?.('.markerPin span')) bindMarker(layer);
    });
  }

  function schedule(){
    clearTimeout(timer);
    timer=setTimeout(scan,60);
  }

  window.addEventListener('load',()=>{
    const map=window.__IA_MAP;
    if(map?.on){
      map.on('layeradd',schedule);
      map.on('zoomend moveend',schedule);
    }
    const mapNode=document.getElementById('map');
    if(mapNode) new MutationObserver(schedule).observe(mapNode,{childList:true,subtree:true});
    schedule();
  });
})();

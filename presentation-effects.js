(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const PROJECT_STORE='itinerarioArtistico.projects.v4';
  const MODE_STORE='itinerarioArtistico.transportModes.v1';
  let bypass=false,busy=false;

  function read(key,fallback){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}}
  function currentProject(){
    const title=$('projectName')?.textContent?.trim();if(!title)return null;
    return read(PROJECT_STORE,[]).filter(p=>p?.title===title).sort((a,b)=>(b.updated||0)-(a.updated||0))[0]||null;
  }
  function stopKey(project,index){
    const s=project?.stops?.[index];if(!s)return'index:'+index;
    const lat=Number(s.lat),lon=Number(s.lon);
    return Number.isFinite(lat)&&Number.isFinite(lon)?lat.toFixed(6)+','+lon.toFixed(6):'index:'+index;
  }
  function transportModeFor(index){
    const p=currentProject();if(!p)return'walk';
    const api=window.__IA_TRANSPORT;
    if(api?.modeForIndex)return api.modeForIndex(p,index)||'walk';
    const raw=read(MODE_STORE,{})?.[p.id];
    if(raw==='transit')return'transit';
    if(raw&&typeof raw==='object')return raw[stopKey(p,index)]==='transit'?'transit':'walk';
    if(p._transportModes&&typeof p._transportModes==='object')return p._transportModes[stopKey(p,index)]==='transit'?'transit':'walk';
    return p._transportMode==='transit'?'transit':'walk';
  }

  function stepInfo(){
    const m=($('stepText')?.textContent||'').match(/(\d+)\s*\/\s*(\d+)/);
    return m?{current:Number(m[1]),total:Number(m[2])}:{current:1,total:1};
  }
  function segmentIndex(next){const s=stepInfo();return next?s.current-1:s.current-2}
  function canMove(btn){
    const s=stepInfo();
    return btn.id==='nextBtn'?s.current<s.total:s.current>1;
  }
  function clearClasses(slide){
    slide.classList.remove('iaSlideLeavingNext','iaSlideLeavingPrev','iaSlideArriveNext','iaSlideArrivePrev');
  }

  function routeLines(){
    const map=window.__IA_MAP;
    if(!map||!window.L)return[];
    const out=[];
    map.eachLayer(layer=>{
      if(layer instanceof L.Polyline && !(layer instanceof L.Polygon) && !layer.__iaRouteEditor){
        const pts=flattenLatLngs(layer.getLatLngs?.()||[]);
        if(pts.length>1)out.push(layer);
      }
    });
    return out.sort((a,b)=>(a._leaflet_id||0)-(b._leaflet_id||0));
  }

  function flattenLatLngs(value,out=[]){
    if(!Array.isArray(value))return out;
    value.forEach(v=>{
      if(v&&typeof v.lat==='number'&&typeof v.lng==='number')out.push(L.latLng(v.lat,v.lng));
      else if(Array.isArray(v))flattenLatLngs(v,out);
    });
    return out;
  }

  function pathForMove(next){
    const lines=routeLines();
    const index=segmentIndex(next);
    const line=lines[index];
    if(!line)return[];
    const pts=flattenLatLngs(line.getLatLngs?.()||[]);
    return next?pts:pts.reverse();
  }

  function travelIcon(mode){
    const transit=mode==='transit';
    return L.divIcon({
      className:'iaWalkerLeaflet '+(transit?'iaBusLeaflet':''),
      iconSize:[44,44],
      iconAnchor:[22,34],
      html:`<div class="iaWalkerAvatar ${transit?'iaBusAvatar':''}" aria-label="${transit?'Spostamento con mezzo pubblico':'Spostamento a piedi'}"><span>${transit?'🚌':'🚶'}</span></div>`
    });
  }

  function cumulativePath(points,map){
    const cum=[0];
    let total=0;
    for(let i=1;i<points.length;i++){
      total+=map.distance(points[i-1],points[i]);
      cum.push(total);
    }
    return {cum,total};
  }

  function pointAtDistance(points,cum,total,d){
    if(d<=0)return points[0];
    if(d>=total)return points[points.length-1];
    let lo=1,hi=cum.length-1;
    while(lo<hi){
      const mid=(lo+hi)>>1;
      if(cum[mid]<d)lo=mid+1;else hi=mid;
    }
    const i=Math.max(1,lo);
    const a=points[i-1],b=points[i];
    const span=Math.max(.000001,cum[i]-cum[i-1]);
    const t=(d-cum[i-1])/span;
    return L.latLng(a.lat+(b.lat-a.lat)*t,a.lng+(b.lng-a.lng)*t);
  }

  function easeInOut(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2}

  function animateTravel(next){
    return new Promise(resolve=>{
      const map=window.__IA_MAP;
      const points=pathForMove(next);
      const mode=transportModeFor(segmentIndex(next));
      const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if(!map||points.length<2||reduced){resolve();return}

      const bounds=L.latLngBounds(points);
      try{map.fitBounds(bounds,{padding:[44,44],maxZoom:17,animate:true,duration:.35})}catch{}

      const {cum,total}=cumulativePath(points,map);
      if(!Number.isFinite(total)||total<=0){resolve();return}
      const duration=mode==='transit'
        ?Math.max(900,Math.min(1800,900+total*.35))
        :Math.max(1200,Math.min(2600,1250+total*.9));

      document.body.classList.add('iaWalking');
      if(mode==='transit')document.body.classList.add('iaRiding');
      const marker=L.marker(points[0],{icon:travelIcon(mode),interactive:false,zIndexOffset:5000}).addTo(map);
      marker.__iaWalker=true;

      setTimeout(()=>{
        const started=performance.now();
        function frame(now){
          const raw=Math.min(1,(now-started)/duration);
          const travelled=total*easeInOut(raw);
          marker.setLatLng(pointAtDistance(points,cum,total,travelled));
          if(raw<1){requestAnimationFrame(frame);return}
          marker.setLatLng(points[points.length-1]);
          marker.getElement()?.classList.add('iaWalkerArrived');
          setTimeout(()=>{
            try{marker.remove()}catch{}
            document.body.classList.remove('iaWalking','iaRiding');
            resolve();
          },230);
        }
        requestAnimationFrame(frame);
      },380);
    });
  }


  // In modalità Presenta, la mappa diventa protagonista solo durante il viaggio.
  // Nessun avanzamento automatico: un clic su Avanti/Indietro avvia una sola sequenza.
  function startMapJourney(){
    document.body.classList.add('iaMapJourney');
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    return new Promise(resolve=>{
      setTimeout(()=>{
        try{window.__IA_MAP?.invalidateSize({pan:false})}catch{}
        resolve();
      },reduced?20:440);
    });
  }
  function finishMapJourney(){
    document.body.classList.remove('iaMapJourney');
    setTimeout(()=>{try{window.__IA_MAP?.invalidateSize({pan:false})}catch{}},440);
  }

  function slideTransition(btn,next){
    const slide=$('slide');
    if(!slide||!document.body.classList.contains('presentation')){
      finishMapJourney();
      busy=false;
      return;
    }
    clearClasses(slide);
    slide.classList.add(next?'iaSlideLeavingNext':'iaSlideLeavingPrev');

    setTimeout(()=>{
      if(!document.body.classList.contains('presentation')){
        finishMapJourney();clearClasses(slide);busy=false;return;
      }
      bypass=true;
      btn.click();
      requestAnimationFrame(()=>{
        clearClasses(slide);
        finishMapJourney();
        slide.classList.add(next?'iaSlideArriveNext':'iaSlideArrivePrev');
        setTimeout(()=>{clearClasses(slide);busy=false},490);
      });
    },155);
  }

  document.addEventListener('click',e=>{
    const btn=e.target?.closest?.('#nextBtn,#prevBtn');
    if(!btn||!document.body.classList.contains('presentation'))return;
    if(bypass){bypass=false;return}
    if(busy||!canMove(btn))return;

    e.preventDefault();
    e.stopImmediatePropagation();
    busy=true;
    const next=btn.id==='nextBtn';

    startMapJourney()
      .then(()=>document.body.classList.contains('presentation')?animateTravel(next):undefined)
      .catch(()=>{})
      .finally(()=>slideTransition(btn,next));
  },true);

  document.addEventListener('click',e=>{
    const marker=e.target?.closest?.('.leaflet-marker-icon');
    if(!marker||marker.classList.contains('iaWalkerLeaflet')||!document.body.classList.contains('presentation'))return;
    const slide=$('slide');if(!slide)return;
    setTimeout(()=>{
      clearClasses(slide);
      slide.classList.add('iaSlideArriveNext');
      setTimeout(()=>clearClasses(slide),430);
    },30);
  },true);
})();
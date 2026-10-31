(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const PROJECT_STORE='itinerarioArtistico.projects.v4';
  const MODE_STORE='itinerarioArtistico.transportModes.v1';
  const EXTRA_STORE='itinerarioArtistico.slideExtras.v1';
  let bypass=false,busy=false;
  const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const combinedView=()=>!window.__IA_PRESENTATION_VIEW||window.__IA_PRESENTATION_VIEW()==='both';
  const sharedViewer=()=>document.body.classList.contains('sharedViewer');
  const motionReduced=()=>!!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

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
    if(!line){
      // A standalone HTML may open before remote route calculation completes.
      // Animate the same walking/bus marker along the direct segment instead.
      const p=currentProject();
      const a=p?.stops?.[index],b=p?.stops?.[index+1];
      if(!a||!b)return [];
      const coords=[a,b].map(stop=>L.latLng(Number(stop.lat),Number(stop.lon)));
      if(coords.some(point=>!Number.isFinite(point.lat)||!Number.isFinite(point.lng)))return [];
      return next?coords:coords.reverse();
    }
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
    return new Promise(resolve=>{
      setTimeout(()=>{
        try{window.__IA_MAP?.invalidateSize({pan:false})}catch{}
        resolve();
      },motionReduced()?20:520);
    });
  }
  function finishMapJourney(){
    hideArrival();
    hideDestinationPhoto();
    document.body.classList.remove('iaMapJourney');
    setTimeout(()=>{try{window.__IA_MAP?.invalidateSize({pan:false})}catch{}},440);
  }

  // Dopo il viaggio, zoom sulla destinazione e nome del luogo prima della slide.
  function arrivalStop(next){
    const info=stepInfo(),project=currentProject();
    const index=next===null?info.current-1:next?info.current:info.current-2;
    return {index,stop:project?.stops?.[index]};
  }
  function arrivalBanner(){
    const panel=document.querySelector('.mapPanel');
    if(!panel)return null;
    let banner=$('iaArrivalBanner');
    if(!banner){
      banner=document.createElement('div');
      banner.id='iaArrivalBanner';
      banner.className='iaArrivalBanner';
      banner.setAttribute('role','status');
      banner.setAttribute('aria-live','polite');
      const caption=document.createElement('small');
      caption.textContent='ARRIVO ALLA TAPPA';
      const title=document.createElement('strong');
      title.className='iaArrivalTitle';
      banner.append(caption,title);
      panel.appendChild(banner);
    }
    return banner;
  }
  function hideArrival(){
    $('iaArrivalBanner')?.classList.remove('iaArrivalVisible');
  }
  // Dissolvenza dalla mappa alla foto della tappa, prima della scheda.
  // Prima immagine principale, poi eventuali immagini della galleria.
  function arrivalImages(next){
    const project=currentProject();
    const {index,stop}=arrivalStop(next);
    if(!project||!stop||index<0)return[];
    const gallery=read(EXTRA_STORE,{})?.[project.id]?.[String(index)]?.images;
    const sources=[stop.image,...(Array.isArray(gallery)?gallery:[])];
    return [...new Set(sources.filter(src=>typeof src==='string' && /^(https?:\/\/|data:image\/)/i.test(src.trim())))];
  }
  function preloadArrivalImage(src){
    return new Promise(resolve=>{
      const img=new Image();
      let settled=false;
      const finish=ok=>{
        if(settled)return;
        settled=true;clearTimeout(timer);
        img.onload=null;img.onerror=null;
        resolve(ok?img:null);
      };
      const timer=setTimeout(()=>finish(false),5000);
      img.onload=()=>finish(true);
      img.onerror=()=>finish(false);
      img.decoding='async';
      img.src=src;
      if(img.complete && img.naturalWidth>0)finish(true);
    });
  }
  function hideDestinationPhoto(){
    document.querySelectorAll('.iaDestinationPhoto').forEach(node=>{
      node.classList.remove('iaDestinationPhotoVisible');
      setTimeout(()=>node.remove(),470);
    });
  }
  async function revealDestinationPhoto(next){
    const panel=document.querySelector('.mapPanel');
    if(!panel||!document.body.classList.contains('presentation')||!combinedView())return;
    const sources=arrivalImages(next);
    if(!sources.length)return;
    // Load the whole gallery together so the second photo is ready in time.
    const pending=sources.map(src=>preloadArrivalImage(src));
    for(const ready of pending){
      const img=await ready;
      if(!document.body.classList.contains('presentation')||!combinedView())return;
      if(!img)continue;
      hideDestinationPhoto();
      const photo=document.createElement('div');
      photo.className='iaDestinationPhoto';
      photo.setAttribute('aria-hidden','true');
      img.alt='';
      photo.appendChild(img);
      panel.appendChild(photo);
      requestAnimationFrame(()=>photo.classList.add('iaDestinationPhotoVisible'));
      // Give each photo time on screen before the next dissolve.
      await pause(motionReduced()?1800:2400);
    }
    // Foto non disponibile: si procede normalmente alla slide.
  }
  function revealArrival(next){
    return new Promise(resolve=>{
      if(!document.body.classList.contains('presentation')){resolve();return}
      const reduced=motionReduced();
      const map=window.__IA_MAP;
      const {index,stop}=arrivalStop(next);
      const route=pathForMove(next);
      const last=route[route.length-1];
      const lat=Number(stop?.lat??last?.lat),lon=Number(stop?.lon??last?.lng);
      if(map&&Number.isFinite(lat)&&Number.isFinite(lon)){
        try{
          const zoom=Math.min(map.getMaxZoom(),Math.max(16,Math.min(18,map.getZoom()+1)));
          if(reduced)map.setView([lat,lon],zoom,{animate:false});
          else map.flyTo([lat,lon],zoom,{animate:true,duration:.66});
        }catch{}
      }
      setTimeout(()=>{
        if(!document.body.classList.contains('presentation')){resolve();return}
        const banner=arrivalBanner();
        if(banner){
          banner.querySelector('.iaArrivalTitle').textContent=
            String(stop?.title||stop?.name||'Tappa '+(index+1));
          banner.classList.remove('iaArrivalVisible');
          void banner.offsetWidth;
          banner.classList.add('iaArrivalVisible');
        }
        setTimeout(resolve,reduced?240:650);
      },reduced?0:480);
    });
  }

  // Ponte fotografico: la stessa immagine passa dalla mappa alla slide.
  // Il ponte è puramente visivo: non sostituisce né modifica la foto della tappa.
  function photoBridge(){
    const photo=document.querySelector('.iaDestinationPhoto.iaDestinationPhotoVisible');
    const source=photo?.querySelector('img');
    if(!photo||!source||motionReduced())return null;
    const bounds=photo.getBoundingClientRect();
    if(bounds.width<30||bounds.height<30)return null;
    const bridge=document.createElement('div');
    bridge.className='iaPhotoBridge';
    bridge.style.left=bounds.left+'px';
    bridge.style.top=bounds.top+'px';
    bridge.style.width=bounds.width+'px';
    bridge.style.height=bounds.height+'px';
    const img=source.cloneNode(false);
    img.removeAttribute('style');
    bridge.appendChild(img);
    document.body.appendChild(bridge);
    return {node:bridge,bounds};
  }

  async function landPhotoBridge(bridge,slide){
    if(!bridge)return;
    const el=bridge.node;
    try{
      // La mappa torna alle dimensioni normali prima di misurare la foto finale.
      await pause(480);
      if(!document.body.classList.contains('presentation'))return;
      const source=el.querySelector('img')?.src;
      const destination=[...slide.querySelectorAll('.hero > img')].find(img=>img.src===source)||slide.querySelector('.hero > img')||slide.querySelector('.hero');
      if(!destination)return;
      const target=destination.getBoundingClientRect(),start=bridge.bounds;
      if(!target.width||!target.height||!start.width||!start.height)return;
      const dx=target.left-start.left,dy=target.top-start.top;
      const sx=target.width/start.width,sy=target.height/start.height;
      const anim=el.animate?.([
        {transform:'translate3d(0,0,0) scale(1,1)',borderRadius:'16px',opacity:1},
        {transform:`translate3d(${dx}px,${dy}px,0) scale(${sx},${sy})`,borderRadius:'22px',opacity:.98}
      ],{duration:670,easing:'cubic-bezier(.22,.8,.22,1)',fill:'forwards'});
      if(anim)await anim.finished.catch(()=>{});
      // Una dissolvenza finale lascia visibile la vera immagine della slide.
      const fade=el.animate?.([{opacity:.98},{opacity:0}],{duration:180,fill:'forwards',easing:'ease-out'});
      if(fade)await fade.finished.catch(()=>{});
    }finally{
      el.remove();
    }
  }

  async function slideTransition(btn,next){
    const slide=$('slide');
    if(!slide||!document.body.classList.contains('presentation')){
      finishMapJourney();busy=false;return;
    }
    const bridge=photoBridge();
    clearClasses(slide);
    try{
      // Aggiorna il contenuto mentre la fotografia della mappa resta davanti.
      bypass=true;
      btn.click();
      await new Promise(resolve=>requestAnimationFrame(resolve));
      finishMapJourney();
      slide.classList.add(next?'iaSlideArriveNext':'iaSlideArrivePrev');
      if(bridge)await landPhotoBridge(bridge,slide);
      else await pause(motionReduced()?40:530);
    }finally{
      bridge?.node.remove();
      finishMapJourney();
      clearClasses(slide);
      busy=false;
    }
  }

  // The cover opens the current first slide without advancing the route.
  window.__IA_PRESENT_FIRST_STOP=async closeCover=>{
    if(busy)return;
    if(!combinedView()||sharedViewer()){closeCover();return;}
    busy=true;
    let bridge=null;
    const slide=$('slide');
    try{
      await startMapJourney();
      closeCover();
      await pause(motionReduced()?0:430);
      if(!document.body.classList.contains('presentation'))return;
      await revealDestinationPhoto(null);
      if(!document.body.classList.contains('presentation'))return;
      bridge=photoBridge();
      finishMapJourney();
      if(slide){
        slide.classList.add('iaSlideArriveNext');
        if(bridge)await landPhotoBridge(bridge,slide);
      }
    }finally{
      bridge?.node.remove();
      finishMapJourney();
      if(slide)clearClasses(slide);
      busy=false;
    }
  };

  document.addEventListener('click',e=>{
    const btn=e.target?.closest?.('#nextBtn,#prevBtn');
    if(!btn||!document.body.classList.contains('presentation'))return;
    if(bypass){bypass=false;return}
    // Blocca i doppi tocchi mentre il viaggio/arrivo è in corso.
    if(busy){
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    if(!combinedView()||sharedViewer()||!canMove(btn))return;

    e.preventDefault();
    e.stopImmediatePropagation();
    busy=true;
    const next=btn.id==='nextBtn';

    startMapJourney()
      .then(()=>document.body.classList.contains('presentation')?animateTravel(next):undefined)
      .then(()=>document.body.classList.contains('presentation')?revealArrival(next):undefined)
      .then(()=>document.body.classList.contains('presentation')?revealDestinationPhoto(next):undefined)
      .catch(()=>{})
      .finally(()=>slideTransition(btn,next).catch(()=>{busy=false;finishMapJourney()}));
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

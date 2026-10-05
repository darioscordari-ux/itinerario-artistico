(()=>{
  'use strict';

  const PROJECT_STORE='itinerarioArtistico.projects.v4';
  const ROUTE_STORE='itinerarioArtistico.customRoutes.v1';
  let editing=false, segmentIndex=0, waypointMarkers=[], currentWaypoints=[], currentRoute=null;
  let originalSnapshot=null, selectedLine=null, selectedLabel=null, addPointMode=false, applyingSaved=false, applyTimer=null;

  const $=id=>document.getElementById(id);

  function map(){ return window.__IA_MAP || null; }
  function allLayers(){ const out=[]; map()?.eachLayer(l=>out.push(l)); return out; }
  function stopMarkers(){
    return allLayers().filter(l=>l instanceof L.Marker && l.getElement()?.querySelector?.('.markerPin'))
      .sort((a,b)=>Number(a.getElement().querySelector('.markerPin span')?.textContent||0)-Number(b.getElement().querySelector('.markerPin span')?.textContent||0));
  }
  function routeLines(){
    return allLayers().filter(l=>l instanceof L.Polyline && !(l instanceof L.Polygon) && !l.__iaRouteEditor)
      .sort((a,b)=>(a._leaflet_id||0)-(b._leaflet_id||0));
  }
  function routeLabels(){
    return allLayers().filter(l=>l instanceof L.Marker && l.getElement()?.classList?.contains('routeLabel'))
      .sort((a,b)=>{
        const an=Number((a.getElement()?.textContent||'').match(/^(\d+)/)?.[1]||0);
        const bn=Number((b.getElement()?.textContent||'').match(/^(\d+)/)?.[1]||0);
        return an-bn;
      });
  }
  function currentStep(){
    const m=($('stepText')?.textContent||'1 / 1').match(/(\d+)\s*\/\s*(\d+)/);
    return m?Math.max(1,Number(m[1])):1;
  }
  function currentProjectId(){
    const title=$('projectName')?.textContent?.trim();
    if(!title) return null;
    try{
      const ps=JSON.parse(localStorage.getItem(PROJECT_STORE)||'[]');
      return ps.find(p=>p.title===title)?.id||null;
    }catch{return null;}
  }
  function loadStore(){ try{return JSON.parse(localStorage.getItem(ROUTE_STORE)||'{}')}catch{return{}} }
  function saveStore(data){ localStorage.setItem(ROUTE_STORE,JSON.stringify(data)); }
  function savedFor(index){
    const pid=currentProjectId(); if(!pid)return null;
    return loadStore()?.[pid]?.[String(index)]||null;
  }
  function saveFor(index,data){
    const pid=currentProjectId(); if(!pid)return;
    const store=loadStore(); store[pid]=store[pid]||{}; store[pid][String(index)]=data; saveStore(store);
  }
  function removeSaved(index){
    const pid=currentProjectId(); if(!pid)return;
    const store=loadStore(); if(store[pid]){delete store[pid][String(index)]; if(!Object.keys(store[pid]).length)delete store[pid]; saveStore(store);}
  }
  function latLngsToArray(latlngs){
    const flat=[];
    (function walk(v){
      if(!Array.isArray(v))return;
      if(v.length && v[0] && typeof v[0].lat==='number'){v.forEach(x=>flat.push([x.lat,x.lng]));return;}
      v.forEach(walk);
    })(latlngs);
    return flat;
  }
  function fmtDist(m){return m<1000?Math.round(m)+' m':(m/1000).toFixed(m<10000?1:0).replace('.',',')+' km'}
  function fmtTime(s){const m=Math.max(1,Math.round(s/60));return m<60?m+' min':Math.floor(m/60)+' h '+(m%60?m%60+' min':'')}
  function decodePolyline6(str){
    let index=0,lat=0,lng=0,out=[];
    while(index<str.length){
      let b,shift=0,result=0;
      do{b=str.charCodeAt(index++)-63;result|=(b&0x1f)<<shift;shift+=5}while(b>=0x20);
      lat+=(result&1)?~(result>>1):(result>>1);
      shift=0;result=0;
      do{b=str.charCodeAt(index++)-63;result|=(b&0x1f)<<shift;shift+=5}while(b>=0x20);
      lng+=(result&1)?~(result>>1):(result>>1);
      out.push([lat/1e6,lng/1e6]);
    }
    return out;
  }
  async function pedestrianRoute(points){
    const req={locations:points.map(p=>({lat:p.lat,lon:p.lng})),costing:'pedestrian',costing_options:{pedestrian:{walking_speed:5.0}},units:'kilometers',directions_options:{units:'kilometers'}};
    const r=await fetch('https://valhalla1.openstreetmap.de/route?json='+encodeURIComponent(JSON.stringify(req)));
    if(!r.ok)throw new Error('route');
    const j=await r.json(); const legs=j.trip?.legs||[]; if(!legs.length)throw new Error('route');
    const line=[];
    legs.forEach((leg,i)=>{const pts=decodePolyline6(leg.shape||'');if(i&&pts.length)pts.shift();line.push(...pts)});
    if(line.length<2)throw new Error('route');
    return {points:line,distance:(j.trip.summary?.length||0)*1000,time:j.trip.summary?.time||0};
  }
  function updateLabel(index,route){
    const labels=routeLabels(); const lab=labels[index]; if(!lab||!route?.points?.length)return;
    const mid=route.points[Math.floor(route.points.length/2)];
    lab.setLatLng(mid);
    lab.setIcon(L.divIcon({className:'routeLabel',html:`${index+1}→${index+2} · ${fmtDist(route.distance)} · ${fmtTime(route.time)}`}));
  }
  function applyRouteToSegment(index,route){
    const line=routeLines()[index]; if(!line||!route?.points?.length)return false;
    line.setLatLngs(route.points);
    line.setStyle({color:'#b42318',opacity:.9,dashArray:null,weight:5});
    updateLabel(index,route);
    return true;
  }
  function applySavedRoutes(){
    if(editing||applyingSaved||!map()||$('app')?.classList.contains('hidden'))return;
    const lines=routeLines(); if(!lines.length)return;
    const pid=currentProjectId(); if(!pid)return;
    const projectRoutes=loadStore()?.[pid]; if(!projectRoutes)return;
    applyingSaved=true;
    Object.entries(projectRoutes).forEach(([i,r])=>{const idx=Number(i);if(idx>=0&&idx<lines.length)applyRouteToSegment(idx,r)});
    setTimeout(()=>{applyingSaved=false},50);
  }
  function scheduleApplySaved(){
    clearTimeout(applyTimer); applyTimer=setTimeout(applySavedRoutes,350);
  }

  function status(text,bad=false){
    const el=$('routeEditStatus'); if(!el)return; el.textContent=text||''; el.className='routeEditStatus'+(bad?' bad':'');
  }
  function setButtonsBusy(busy){
    ['routeAddPoint','routeSave','routeReset','routeSegment'].forEach(id=>{const el=$(id);if(el)el.disabled=busy});
  }
  function waypointIcon(n){
    return L.divIcon({className:'',iconSize:[30,30],iconAnchor:[15,15],html:`<div class="routeHandle" title="Trascina questo punto">${n}</div>`});
  }
  function clearWaypointMarkers(){ waypointMarkers.forEach(m=>m.remove()); waypointMarkers=[]; }
  function renderWaypointMarkers(){
    clearWaypointMarkers();
    currentWaypoints.forEach((p,i)=>{
      const m=L.marker([p.lat,p.lng],{draggable:true,icon:waypointIcon(i+1),zIndexOffset:2000}).addTo(map());
      m.__iaRouteEditor=true;
      m.on('dragend',async()=>{const ll=m.getLatLng();currentWaypoints[i]={lat:ll.lat,lng:ll.lng};await recalcPreview()});
      waypointMarkers.push(m);
    });
  }
  function restoreSnapshot(){
    if(!originalSnapshot)return;
    selectedLine?.setLatLngs(originalSnapshot.points);
    if(selectedLine)selectedLine.setStyle(originalSnapshot.style);
    if(selectedLabel&&originalSnapshot.label){
      selectedLabel.setLatLng(originalSnapshot.label.latlng);
      selectedLabel.setIcon(L.divIcon({className:'routeLabel',html:originalSnapshot.label.html}));
    }
  }
  function detachLineClick(){ if(selectedLine)selectedLine.off('click',onLineClick); }
  function onLineClick(e){
    if(!editing)return;
    if(e.originalEvent)L.DomEvent.stopPropagation(e.originalEvent);
    addWaypoint(e.latlng);
  }
  function snapshotSegment(){
    const lines=routeLines(), labels=routeLabels(); selectedLine=lines[segmentIndex]; selectedLabel=labels[segmentIndex];
    if(!selectedLine)return false;
    const labelEl=selectedLabel?.getElement();
    originalSnapshot={
      points:latLngsToArray(selectedLine.getLatLngs()),
      style:{color:selectedLine.options.color,opacity:selectedLine.options.opacity,dashArray:selectedLine.options.dashArray,weight:selectedLine.options.weight},
      label:selectedLabel?{latlng:selectedLabel.getLatLng(),html:labelEl?.innerHTML||labelEl?.textContent||`${segmentIndex+1}→${segmentIndex+2}`} : null
    };
    selectedLine.on('click',onLineClick);
    selectedLine.setStyle({weight:8,opacity:1});
    return true;
  }
  function loadSegment(index){
    detachLineClick(); clearWaypointMarkers(); restoreSnapshot();
    segmentIndex=index; originalSnapshot=null; selectedLine=null; selectedLabel=null; addPointMode=false;
    if(!snapshotSegment()){status('Tratto non ancora disponibile. Attendi un istante.',true);return;}
    const saved=savedFor(index);
    currentWaypoints=(saved?.waypoints||[]).map(p=>({lat:+p.lat,lng:+p.lng}));
    currentRoute=saved||{points:originalSnapshot.points,distance:0,time:0};
    if(saved)applyRouteToSegment(index,saved);
    renderWaypointMarkers();
    status(currentWaypoints.length?`${currentWaypoints.length} punto/i di passaggio. Trascinali oppure clicca sulla linea.`:'La linea evidenziata è modificabile: cliccala per creare un punto di passaggio, oppure premi “+ Punto”.');
  }
  async function recalcPreview(){
    const stops=stopMarkers(); if(stops.length<segmentIndex+2)return;
    const a=stops[segmentIndex].getLatLng(), b=stops[segmentIndex+1].getLatLng();
    setButtonsBusy(true); status('Calcolo del nuovo percorso…');
    try{
      const route=await pedestrianRoute([a,...currentWaypoints,b]); currentRoute={...route,waypoints:currentWaypoints.map(p=>({lat:p.lat,lng:p.lng}))};
      applyRouteToSegment(segmentIndex,currentRoute); renderWaypointMarkers();
      if(selectedLine)selectedLine.setStyle({weight:8,opacity:1});
      status('Percorso aggiornato. Trascina il punto numerato per rifinirlo, poi premi “Salva percorso”.');
    }catch{ status('Non riesco a calcolare il percorso da questi punti. Spostane uno e riprova.',true); }
    finally{setButtonsBusy(false)}
  }
  async function addWaypoint(latlng){
    if(!latlng)return; currentWaypoints.push({lat:latlng.lat,lng:latlng.lng}); addPointMode=false; $('map')?.classList.remove('routeAddCursor'); await recalcPreview();
  }
  function mapAddPoint(e){ if(editing&&addPointMode)addWaypoint(e.latlng); }

  function closeEditor(save){
    if(!editing)return;
    if(!save)restoreSnapshot();
    detachLineClick(); clearWaypointMarkers(); map()?.off('click',mapAddPoint); editing=false; addPointMode=false;
    $('map')?.classList.remove('routeAddCursor');
    const back=$('modalBack'); if(back){back.classList.remove('routeEditing');back.classList.add('hidden');}
    if($('modal'))$('modal').innerHTML='';
    if(save)scheduleApplySaved();
  }
  function openEditor(){
    const m=map(), stops=stopMarkers(), lines=routeLines();
    if(!m||stops.length<2||lines.length<1){alert('Aggiungi almeno due tappe e attendi il calcolo del percorso.');return;}
    $('showAllBtn')?.click();
    editing=true;
    const max=stops.length-2; segmentIndex=Math.min(Math.max(currentStep()-1,0),max);
    const options=Array.from({length:stops.length-1},(_,i)=>`<option value="${i}" ${i===segmentIndex?'selected':''}>Tratto ${i+1} → ${i+2}</option>`).join('');
    $('modal').innerHTML=`<h2>Modifica percorso</h2>
      <div class="field"><label>Tratto da modificare</label><select id="routeSegment">${options}</select></div>
      <div class="routeEditHelp"><b>La mappa resta attiva.</b> Clicca sulla linea evidenziata per creare un punto di passaggio, poi trascina il punto numerato sulla strada che preferisci.</div>
      <div class="routeEditActions"><button class="btn" id="routeAddPoint">＋ Punto sulla mappa</button><button class="btn" id="routeReset">Ripristina automatico</button></div>
      <div id="routeEditStatus" class="routeEditStatus"></div>
      <div class="modalFoot"><button class="btn" id="routeCancel">Annulla</button><button class="btn primary" id="routeSave">Salva percorso</button></div>`;
    const back=$('modalBack'); back.classList.add('routeEditing'); back.classList.remove('hidden');
    $('routeSegment').onchange=e=>loadSegment(Number(e.target.value));
    $('routeAddPoint').onclick=()=>{addPointMode=true;$('map')?.classList.add('routeAddCursor');status('Ora clicca sulla mappa nel punto da cui vuoi far passare il percorso.');};
    $('routeReset').onclick=async()=>{currentWaypoints=[];renderWaypointMarkers();await recalcPreview();status('Percorso automatico ripristinato. Premi “Salva percorso” per confermare.');};
    $('routeCancel').onclick=()=>closeEditor(false);
    $('routeSave').onclick=()=>{
      if(currentWaypoints.length===0)removeSaved(segmentIndex);
      else if(currentRoute)saveFor(segmentIndex,{...currentRoute,waypoints:currentWaypoints.map(p=>({lat:p.lat,lng:p.lng}))});
      closeEditor(true);
    };
    m.on('click',mapAddPoint);
    loadSegment(segmentIndex);
  }

  function installUI(){
    if($('editRouteBtn'))return;
    const ref=$('editStopBtn'); if(!ref)return;
    const b=document.createElement('button'); b.id='editRouteBtn'; b.className='btn'; b.textContent='🛣 Modifica percorso'; b.onclick=openEditor; ref.insertAdjacentElement('afterend',b);
    const style=document.createElement('style');
    style.textContent=`
      .routeHandle{width:30px;height:30px;border-radius:50%;background:#fff;border:3px solid #b42318;color:#b42318;font:800 13px/24px system-ui;text-align:center;box-shadow:0 2px 10px #0006;cursor:grab;box-sizing:border-box}
      .routeHandle:active{cursor:grabbing}.routeEditHelp{padding:10px 12px;background:#f5f1e9;border-radius:10px;font-size:13px;line-height:1.4;margin:8px 0 12px}
      .routeEditActions{display:flex;gap:8px;flex-wrap:wrap}.routeEditStatus{min-height:22px;margin-top:10px;font-size:13px;color:#405044}.routeEditStatus.bad{color:#b42318}
      #routeSegment{width:100%;padding:10px;border:1px solid #bbb;border-radius:8px;background:white;font:inherit}
      .modalBack.routeEditing{background:transparent;pointer-events:none;align-items:flex-start;justify-content:flex-end;padding:72px 14px 14px}
      .modalBack.routeEditing .modal{pointer-events:auto;width:min(370px,92vw);max-height:calc(100vh - 90px);box-shadow:0 12px 35px #0005;border:1px solid #d9d2c8}
      #map.routeAddCursor,.routeEditing~* #map.routeAddCursor{cursor:crosshair!important}
      @media(max-width:640px){.modalBack.routeEditing{padding:58px 6px 6px;justify-content:flex-end}.modalBack.routeEditing .modal{width:min(320px,86vw);padding:14px}.modalBack.routeEditing .modal h2{font-size:21px}}
    `;
    document.head.appendChild(style);
  }

  const observer=new MutationObserver(()=>scheduleApplySaved());
  window.addEventListener('load',()=>{
    installUI();
    const mapEl=$('map'); if(mapEl)observer.observe(mapEl,{childList:true,subtree:true});
    document.addEventListener('click',e=>{
      if(e.target?.closest?.('.projectCard [data-o], .projectCard [data-p], #addStopBtn, #deleteStop, #homeBtn, #backBtn'))scheduleApplySaved();
    });
    scheduleApplySaved();
  });
})();
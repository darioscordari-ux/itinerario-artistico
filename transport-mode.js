(()=>{
  'use strict';
  const PROJECT_STORE='itinerarioArtistico.projects.v4';
  const MODE_STORE='itinerarioArtistico.transportModes.v1';
  const $=id=>document.getElementById(id);
  const transitCache=new Map();
  let applying=false,applyToken=0,applyTimer=null,lastRouteSignature='';

  function read(key,fallback){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}}
  function write(key,value){localStorage.setItem(key,JSON.stringify(value))}
  function currentProject(){
    const title=$('projectName')?.textContent?.trim();if(!title)return null;
    return read(PROJECT_STORE,[]).filter(p=>p?.title===title).sort((a,b)=>(b.updated||0)-(a.updated||0))[0]||null;
  }
  function currentIndex(){
    const m=($('stepText')?.textContent||'').match(/(\d+)\s*\/\s*(\d+)/);
    return m?Math.max(0,Number(m[1])-1):0;
  }
  function stopKey(project,index){
    const s=project?.stops?.[index];
    if(!s)return'index:'+index;
    const lat=Number(s.lat),lon=Number(s.lon);
    return Number.isFinite(lat)&&Number.isFinite(lon)?lat.toFixed(6)+','+lon.toFixed(6):'index:'+index;
  }
  function normalizeMode(v){return v==='transit'?'transit':'walk'}
  function expandedModes(project,raw){
    if(raw&&typeof raw==='object'&&!Array.isArray(raw))return {...raw};
    const mode=normalizeMode(raw);
    const out={};
    for(let i=0;i<Math.max(0,(project?.stops?.length||0)-1);i++)out[stopKey(project,i)]=mode;
    return out;
  }
  function modeMap(project=currentProject()){
    if(!project)return{};
    const store=read(MODE_STORE,{}),raw=store?.[project.id];
    if(raw&&typeof raw==='object'&&!Array.isArray(raw))return raw;
    if(raw==='walk'||raw==='transit')return expandedModes(project,raw);
    if(project._transportModes&&typeof project._transportModes==='object')return project._transportModes;
    if(project._transportMode==='walk'||project._transportMode==='transit')return expandedModes(project,project._transportMode);
    return{};
  }
  function modeForIndex(project,index){
    if(!project||index<0||index>=(project.stops?.length||0)-1)return null;
    const map=modeMap(project);return normalizeMode(map[stopKey(project,index)]);
  }
  function saveModeForIndex(project,index,mode){
    if(!project||index<0||index>=(project.stops?.length||0)-1)return;
    const store=read(MODE_STORE,{}),raw=store?.[project.id];
    const map=expandedModes(project,raw??project._transportModes??project._transportMode??'walk');
    map[stopKey(project,index)]=normalizeMode(mode);
    store[project.id]=map;write(MODE_STORE,store);
    updateButton();
  }
  function fmtDist(m){return m<1000?Math.round(m)+' m':(m/1000).toFixed(m<10000?1:0).replace('.',',')+' km'}
  function fmtTime(sec){const m=Math.max(1,Math.round(sec/60));return m<60?m+' min':Math.floor(m/60)+' h '+(m%60?m%60+' min':'')}
  function flatten(v,out=[]){
    if(!Array.isArray(v))return out;
    v.forEach(x=>{if(x&&typeof x.lat==='number'&&typeof x.lng==='number')out.push(L.latLng(x.lat,x.lng));else if(Array.isArray(x))flatten(x,out)});
    return out;
  }
  function routeLines(){
    const map=window.__IA_MAP;if(!map||!window.L)return[];const out=[];
    map.eachLayer(l=>{if(l instanceof L.Polyline&&!(l instanceof L.Polygon)&&!l.__iaRouteEditor&&flatten(l.getLatLngs?.()||[]).length>1)out.push(l)});
    return out.sort((a,b)=>(a._leaflet_id||0)-(b._leaflet_id||0));
  }
  function routeSignature(){return routeLines().map(l=>l._leaflet_id||0).join(',')}
  function routeLabels(){
    const map=window.__IA_MAP;if(!map||!window.L)return[];const out=[];
    map.eachLayer(l=>{if(l instanceof L.Marker&&l.getElement?.()?.classList?.contains('routeLabel'))out.push(l)});
    return out.sort((a,b)=>(a._leaflet_id||0)-(b._leaflet_id||0));
  }
  function decodePolyline6(str){let index=0,lat=0,lng=0,out=[];while(index<str.length){let b,shift=0,result=0;do{b=str.charCodeAt(index++)-63;result|=(b&0x1f)<<shift;shift+=5}while(b>=0x20);lat+=(result&1)?~(result>>1):(result>>1);shift=0;result=0;do{b=str.charCodeAt(index++)-63;result|=(b&0x1f)<<shift;shift+=5}while(b>=0x20);lng+=(result&1)?~(result>>1):(result>>1);out.push([lat/1e6,lng/1e6])}return out}
  async function roadRoute(a,b){
    const ck=[+a.lat,+a.lon,+b.lat,+b.lon].map(x=>Number(x).toFixed(6)).join('|');
    if(transitCache.has(ck))return transitCache.get(ck);
    const req={locations:[{lat:+a.lat,lon:+a.lon},{lat:+b.lat,lon:+b.lon}],costing:'auto',units:'kilometers',directions_options:{units:'kilometers'}};
    const r=await fetch('https://valhalla1.openstreetmap.de/route?json='+encodeURIComponent(JSON.stringify(req)));
    if(!r.ok)throw new Error('route');
    const j=await r.json(),leg=j.trip?.legs?.[0];if(!leg?.shape)throw new Error('route');
    const baseTime=leg.summary?.time||j.trip.summary?.time||0;
    const result={points:decodePolyline6(leg.shape),distance:(leg.summary?.length||j.trip.summary?.length||0)*1000,time:baseTime+240};
    transitCache.set(ck,result);return result;
  }
  function haversine(a,b,c,d){const R=6371000,p=Math.PI/180,x=(c-a)*p,y=(d-b)*p,A=Math.sin(x/2)**2+Math.cos(a*p)*Math.cos(c*p)*Math.sin(y/2)**2;return 2*R*Math.asin(Math.sqrt(A))}
  function fallbackTransit(a,b){const d=haversine(+a.lat,+a.lon,+b.lat,+b.lon);return{points:[[+a.lat,+a.lon],[+b.lat,+b.lon]],distance:d,time:d/18000*3600+240}}
  function backupWalk(line,lab){
    if(line.__iaWalkBackup)return line.__iaWalkBackup;
    const raw=lab?.getElement()?.innerHTML||'';
    line.__iaWalkBackup={
      points:flatten(line.getLatLngs?.()||[]).map(x=>[x.lat,x.lng]),
      style:{color:line.options.color,weight:line.options.weight,opacity:line.options.opacity,dashArray:line.options.dashArray},
      label:lab?{latlng:lab.getLatLng(),html:raw.replace(/^(?:🚶|🚌)\s*/,'')}:null
    };
    return line.__iaWalkBackup;
  }
  function restoreWalkSegment(line,lab){
    const b=line.__iaWalkBackup;if(!b){line.__iaTransport='walk';return}
    line.setLatLngs(b.points);line.setStyle(b.style||{});line.__iaTransport='walk';
    if(lab&&b.label){
      lab.setLatLng(b.label.latlng);
      const html=`🚶 ${b.label.html}`;
      if(lab.getElement()?.innerHTML!==html)lab.setIcon(L.divIcon({className:'routeLabel',html}));
    }
  }

  async function applyModes(){
    if(applying||$('app')?.classList.contains('hidden'))return false;
    const p=currentProject(),map=window.__IA_MAP;if(!p||!map||!Array.isArray(p.stops)||p.stops.length<2)return false;
    const lines=routeLines(),labels=routeLabels();if(lines.length<p.stops.length-1)return false;
    lastRouteSignature=lines.map(l=>l._leaflet_id||0).join(',');
    const token=++applyToken;applying=true;
    try{
      for(let i=0;i<p.stops.length-1;i++){
        if(token!==applyToken)return false;
        const line=lines[i],lab=labels[i],a=p.stops[i],b=p.stops[i+1];
        backupWalk(line,lab);
        const mode=modeForIndex(p,i);
        if(mode==='transit'){
          let seg;try{seg=await roadRoute(a,b)}catch{seg=fallbackTransit(a,b)}
          if(token!==applyToken)return false;
          line.setLatLngs(seg.points);line.setStyle({color:'#2563eb',weight:5,opacity:.92,dashArray:null});line.__iaTransport='transit';
          if(lab){
            const mid=seg.points[Math.floor(seg.points.length/2)]||seg.points[0];lab.setLatLng(mid);
            const html=`🚌 ${i+1}→${i+2} · ${fmtDist(seg.distance)} · ~${fmtTime(seg.time)}`;
            if(lab.getElement()?.innerHTML!==html)lab.setIcon(L.divIcon({className:'routeLabel',html}));
          }
        }else{
          restoreWalkSegment(line,lab);
        }
      }
      document.body.dataset.transportMode=modeForIndex(p,currentIndex())||'walk';
      updateButton();
      return true;
    }finally{applying=false}
  }
  function waitAndApply(){
    clearTimeout(applyTimer);let tries=0;
    const tick=()=>{tries++;Promise.resolve(applyModes()).then(ok=>{if(!ok&&tries<14)applyTimer=setTimeout(tick,260)}).catch(()=>{if(tries<14)applyTimer=setTimeout(tick,260)})};
    applyTimer=setTimeout(tick,180);
  }

  function ensureButton(){
    const show=$('showAllBtn');if(!show||$('transportModeBtn'))return;
    const b=document.createElement('button');b.id='transportModeBtn';b.type='button';b.className='btn';show.insertAdjacentElement('afterend',b);
    b.onclick=()=>{
      const p=currentProject(),idx=currentIndex();if(!p||idx>=p.stops.length-1)return;
      const next=modeForIndex(p,idx)==='transit'?'walk':'transit';saveModeForIndex(p,idx,next);waitAndApply();
    };
    updateButton();
  }
  function updateButton(){
    const b=$('transportModeBtn'),p=currentProject();if(!b)return;
    const idx=currentIndex();
    if(!p||idx>=(p.stops?.length||0)-1){b.textContent='✓ Arrivo';b.disabled=true;b.title='Ultima tappa';return}
    b.disabled=false;
    const m=modeForIndex(p,idx);b.textContent=m==='transit'?'🚌 Mezzo pubblico':'🚶 A piedi';
    b.title=`Tappa ${idx+1} → ${idx+2}: ${m==='transit'?'mezzo pubblico (tempo stimato)':'a piedi'}`;
    document.body.dataset.transportMode=m;
  }
  function injectEditChoice(){
    const modal=$('modal'),save=$('saveEdit');if(!modal||!save||$('iaTransportSelect'))return;
    const p=currentProject(),idx=currentIndex();if(!p)return;
    const foot=modal.querySelector('.modalFoot');if(!foot)return;
    const box=document.createElement('div');box.className='field';
    if(idx>=p.stops.length-1){
      box.innerHTML='<label>Spostamento</label><div class="note">Questa è l’ultima tappa: non c’è uno spostamento successivo.</div>';
      foot.insertAdjacentElement('beforebegin',box);return;
    }
    box.innerHTML=`<label for="iaTransportSelect">Da questa tappa alla tappa ${idx+2}</label><select id="iaTransportSelect"><option value="walk">🚶 A piedi</option><option value="transit">🚌 Mezzo pubblico</option></select><div class="note" style="margin-top:6px">Con il mezzo pubblico il tempo è una stima del percorso stradale più circa 4 minuti di attesa; non usa gli orari reali delle linee.</div>`;
    foot.insertAdjacentElement('beforebegin',box);
    const sel=$('iaTransportSelect');sel.value=modeForIndex(p,idx)||'walk';
    save.addEventListener('click',()=>{saveModeForIndex(p,idx,sel.value);setTimeout(waitAndApply,80)},true);
  }

  document.addEventListener('click',e=>{
    if(e.target?.closest?.('#editStopBtn'))setTimeout(injectEditChoice,0);
    if(e.target?.closest?.('#nextBtn,#prevBtn,.leaflet-marker-icon'))setTimeout(updateButton,70);
    if(e.target?.closest?.('.projectCard [data-o],.projectCard [data-p]'))setTimeout(()=>{ensureButton();waitAndApply();updateButton()},120);
    if(e.target?.closest?.('#iaOrderSave'))setTimeout(waitAndApply,300);
  },true);

  const mapNode=$('map');if(mapNode)new MutationObserver(()=>{
    if(applying)return;
    setTimeout(()=>{const sig=routeSignature();if(sig!==lastRouteSignature)waitAndApply()},80);
  }).observe(mapNode,{childList:true,subtree:true});
  window.__IA_TRANSPORT={modeForIndex,currentProject,currentIndex,applyModes,saveModeForIndex,stopKey};
  window.addEventListener('load',()=>{ensureButton();waitAndApply();updateButton()});
  setTimeout(ensureButton,120);
})();
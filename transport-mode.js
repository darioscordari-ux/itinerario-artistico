(()=>{
  'use strict';
  const PROJECT_STORE='itinerarioArtistico.projects.v4';
  const MODE_STORE='itinerarioArtistico.transportModes.v1';
  const $=id=>document.getElementById(id);
  let applying=false,applyToken=0;

  function read(key,fallback){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}}
  function write(key,value){localStorage.setItem(key,JSON.stringify(value))}
  function currentProject(){
    const title=$('projectName')?.textContent?.trim();if(!title)return null;
    return read(PROJECT_STORE,[]).filter(p=>p?.title===title).sort((a,b)=>(b.updated||0)-(a.updated||0))[0]||null;
  }
  function modeFor(project=currentProject()){
    if(!project)return'walk';
    return read(MODE_STORE,{})?.[project.id]==='transit'?'transit':'walk';
  }
  function saveMode(project,mode){
    if(!project)return;
    const s=read(MODE_STORE,{});s[project.id]=mode==='transit'?'transit':'walk';write(MODE_STORE,s);
    document.body.dataset.transportMode=s[project.id];
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
  function routeLabels(){
    const map=window.__IA_MAP;if(!map||!window.L)return[];const out=[];
    map.eachLayer(l=>{if(l instanceof L.Marker&&l.getElement?.()?.classList?.contains('routeLabel'))out.push(l)});
    return out.sort((a,b)=>(a._leaflet_id||0)-(b._leaflet_id||0));
  }
  function decodePolyline6(str){let index=0,lat=0,lng=0,out=[];while(index<str.length){let b,shift=0,result=0;do{b=str.charCodeAt(index++)-63;result|=(b&0x1f)<<shift;shift+=5}while(b>=0x20);lat+=(result&1)?~(result>>1):(result>>1);shift=0;result=0;do{b=str.charCodeAt(index++)-63;result|=(b&0x1f)<<shift;shift+=5}while(b>=0x20);lng+=(result&1)?~(result>>1):(result>>1);out.push([lat/1e6,lng/1e6])}return out}
  async function roadRoute(a,b){
    const req={locations:[{lat:+a.lat,lon:+a.lon},{lat:+b.lat,lon:+b.lon}],costing:'auto',units:'kilometers',directions_options:{units:'kilometers'}};
    const r=await fetch('https://valhalla1.openstreetmap.de/route?json='+encodeURIComponent(JSON.stringify(req)));
    if(!r.ok)throw new Error('route');
    const j=await r.json(),leg=j.trip?.legs?.[0];if(!leg?.shape)throw new Error('route');
    const baseTime=leg.summary?.time||j.trip.summary?.time||0;
    return {points:decodePolyline6(leg.shape),distance:(leg.summary?.length||j.trip.summary?.length||0)*1000,time:baseTime+240};
  }
  function haversine(a,b,c,d){const R=6371000,p=Math.PI/180,x=(c-a)*p,y=(d-b)*p,A=Math.sin(x/2)**2+Math.cos(a*p)*Math.cos(c*p)*Math.sin(y/2)**2;return 2*R*Math.asin(Math.sqrt(A))}
  function fallbackTransit(a,b){const d=haversine(+a.lat,+a.lon,+b.lat,+b.lon);return{points:[[+a.lat,+a.lon],[+b.lat,+b.lon]],distance:d,time:d/18000*3600+240}}

  async function applyTransit(){
    if(applying||$('app')?.classList.contains('hidden'))return false;
    const p=currentProject(),map=window.__IA_MAP;if(!p||!map||!Array.isArray(p.stops)||p.stops.length<2)return false;
    const lines=routeLines(),labels=routeLabels();if(lines.length<p.stops.length-1)return false;
    const token=++applyToken;applying=true;
    try{
      for(let i=0;i<p.stops.length-1;i++){
        if(token!==applyToken)return false;
        const line=lines[i],lab=labels[i],a=p.stops[i],b=p.stops[i+1];
        if(!line.__iaWalkBackup){
          line.__iaWalkBackup={points:flatten(line.getLatLngs?.()||[]).map(x=>[x.lat,x.lng]),style:{color:line.options.color,weight:line.options.weight,opacity:line.options.opacity,dashArray:line.options.dashArray},label:lab?{latlng:lab.getLatLng(),html:lab.getElement()?.innerHTML||''}:null};
        }
        let seg;try{seg=await roadRoute(a,b)}catch{seg=fallbackTransit(a,b)}
        line.setLatLngs(seg.points);line.setStyle({color:'#2563eb',weight:5,opacity:.92,dashArray:null});line.__iaTransport='transit';
        if(lab){const mid=seg.points[Math.floor(seg.points.length/2)]||seg.points[0];lab.setLatLng(mid);lab.setIcon(L.divIcon({className:'routeLabel',html:`🚌 ${i+1}→${i+2} · ${fmtDist(seg.distance)} · ~${fmtTime(seg.time)}`}))}
      }
      document.body.dataset.transportMode='transit';
      return true;
    }finally{applying=false}
  }
  function restoreWalk(){
    applyToken++;
    const lines=routeLines(),labels=routeLabels();
    lines.forEach((line,i)=>{
      const b=line.__iaWalkBackup;if(!b)return;
      line.setLatLngs(b.points);line.setStyle(b.style||{});line.__iaTransport='walk';
      const lab=labels[i];if(lab&&b.label){lab.setLatLng(b.label.latlng);lab.setIcon(L.divIcon({className:'routeLabel',html:b.label.html}))}
      delete line.__iaWalkBackup;
    });
    document.body.dataset.transportMode='walk';
  }
  function applyMode(){
    const mode=modeFor();updateButton();
    if(mode==='transit')return applyTransit();
    restoreWalk();return Promise.resolve(true);
  }
  function waitAndApply(){
    let tries=0;const tick=()=>{tries++;Promise.resolve(applyMode()).then(ok=>{if(!ok&&tries<14)setTimeout(tick,260)}).catch(()=>{if(tries<14)setTimeout(tick,260)})};setTimeout(tick,220);
  }

  function ensureButton(){
    const show=$('showAllBtn');if(!show||$('transportModeBtn'))return;
    const b=document.createElement('button');b.id='transportModeBtn';b.type='button';b.className='btn';show.insertAdjacentElement('afterend',b);
    b.onclick=()=>{const p=currentProject();if(!p)return;const next=modeFor(p)==='walk'?'transit':'walk';saveMode(p,next);if(next==='transit')waitAndApply();else restoreWalk()};
    updateButton();
  }
  function updateButton(){
    const b=$('transportModeBtn');if(!b)return;
    const m=modeFor();b.textContent=m==='transit'?'🚌 Mezzo pubblico':'🚶 A piedi';b.title=m==='transit'?'Tempo stimato su percorso stradale, inclusa un’attesa media di 4 minuti':'Percorso pedonale';
  }
  function injectSettings(){
    const modal=$('modal'),save=$('saveSet');if(!modal||!save||$('iaTransportSelect'))return;
    const foot=modal.querySelector('.modalFoot');if(!foot)return;
    const box=document.createElement('div');box.className='field';
    box.innerHTML='<label for="iaTransportSelect">Spostamento</label><select id="iaTransportSelect"><option value="walk">🚶 A piedi</option><option value="transit">🚌 Mezzo pubblico</option></select><div class="note" style="margin-top:6px">Per il mezzo pubblico il tempo è una stima basata sul percorso stradale più circa 4 minuti di attesa; non usa gli orari reali delle linee.</div>';
    foot.insertAdjacentElement('beforebegin',box);$('iaTransportSelect').value=modeFor();
  }

  document.addEventListener('click',e=>{
    if(e.target?.closest?.('#settingsBtn'))setTimeout(injectSettings,0);
    const save=e.target?.closest?.('#saveSet');
    if(save){
      const sel=$('iaTransportSelect'),p=currentProject();if(sel&&p){const value=sel.value;setTimeout(()=>{saveMode(p,value);waitAndApply()},20)}
    }
    if(e.target?.closest?.('.projectCard [data-o],.projectCard [data-p]')){setTimeout(()=>{ensureButton();waitAndApply()},120)}
    if(e.target?.closest?.('#iaOrderSave'))setTimeout(waitAndApply,300);
  },true);

  window.addEventListener('load',()=>{ensureButton();waitAndApply()});
  setTimeout(ensureButton,120);
})();
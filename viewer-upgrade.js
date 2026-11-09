(()=>{
'use strict';
let routeSegments=[],running=false,prepared=false,firstMap=null;
const $=id=>document.getElementById(id);
const reduced=()=>window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function decodePolyline6(str){
 let index=0,lat=0,lng=0,out=[];
 while(index<str.length){
  let b,shift=0,v=0;
  do{b=str.charCodeAt(index++)-63;v|=(b&31)<<shift;shift+=5;}while(b>=32&&index<=str.length);
  lat+=(v&1)?~(v>>1):(v>>1);shift=0;v=0;
  do{b=str.charCodeAt(index++)-63;v|=(b&31)<<shift;shift+=5;}while(b>=32&&index<=str.length);
  lng+=(v&1)?~(v>>1):(v>>1);
  out.push([lat/1e6,lng/1e6]);
 }
 return out;
}
async function routeBetween(a,b){
 const start=[Number(a.lat),Number(a.lon)],end=[Number(b.lat),Number(b.lon)];
 if([...start,...end].some(n=>!Number.isFinite(n)))return [];
 if(a.transfer&&a.transfer.mode==='ferry')return [start,end];
 try{
  const req={locations:[{lat:start[0],lon:start[1]},{lat:end[0],lon:end[1]}],costing:'pedestrian',units:'kilometers'};
  const response=await fetch('https://valhalla1.openstreetmap.de/route?json='+encodeURIComponent(JSON.stringify(req)),{signal:AbortSignal.timeout(9500)});
  if(!response.ok)throw Error('routing unavailable');
  const data=await response.json();
  const shape=data.trip?.legs?.[0]?.shape;
  if(!shape)throw Error('route shape unavailable');
  const path=decodePolyline6(shape);
  return path.length>=2?path:[start,end];
 }catch(error){console.warn('Percorso a piedi non disponibile',error);return [start,end];}
}
async function prepareRoutes(){
 const p=window.__IA_PUBLIC_PROJECT,m=window.__IA_PUBLIC_MAP;
 if(!p||!m||prepared)return;
 prepared=true;firstMap=m;
 const ss=p.stops||[];
 // Remove the original straight connector; keep markers and the tile layer.
 m.eachLayer(layer=>{if(layer instanceof L.Polyline&&!(layer instanceof L.Polygon)){try{m.removeLayer(layer)}catch{}}});
 for(let i=0;i<ss.length-1;i++){
  const path=await routeBetween(ss[i],ss[i+1]);routeSegments[i]=path;
  if(path.length>=2)L.polyline(path,{color:'#aa291f',weight:5,opacity:.9,dashArray:path.length===2?'8 7':null}).addTo(m);
 }
}
function banner(title){
 let b=$('arrivalPublic');
 if(!b){b=document.createElement('div');b.id='arrivalPublic';b.hidden=true;$('viewer').appendChild(b)}
 b.textContent=title||'Tappa';b.hidden=false;
 return b;
}
function getCoords(path){
 const m=window.__IA_PUBLIC_MAP;if(!m)return null;
 const pts=path.map(p=>L.latLng(p[0],p[1])),cum=[0];let total=0;
 for(let i=1;i<pts.length;i++){total+=m.distance(pts[i-1],pts[i]);cum.push(total)}
 return {pts,cum,total};
}
function interpolate(path,progress){
 const d=path.total*progress;
 if(d<=0)return path.pts[0];if(d>=path.total)return path.pts[path.pts.length-1];
 let i=1;while(i<path.cum.length-1&&path.cum[i]<d)i++;
 const fraction=(d-path.cum[i-1])/Math.max(1e-6,path.cum[i]-path.cum[i-1]);
 const a=path.pts[i-1],b=path.pts[i];
 return L.latLng(a.lat+(b.lat-a.lat)*fraction,a.lng+(b.lng-a.lng)*fraction);
}
function ease(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2}
async function navigate(delta){
 const p=window.__IA_PUBLIC_PROJECT,m=window.__IA_PUBLIC_MAP,step=$('progress')?.textContent?.split('/')[0];
 const from=Number(step)-1,to=from+delta;
 if(!p||!m||running||to<0||to>=p.stops.length)return;
 running=true;$('viewer').classList.add('is-travelling');
 [$('next'),$('prev'),$('mapNext'),$('mapBack')].forEach(b=>{if(b)b.disabled=true});
 try{
  const start=p.stops[from],finish=p.stops[to];
  const pair=routeSegments[Math.min(from,to)];
  const raw=pair?.length>=2?pair:[[Number(start.lat),Number(start.lon)],[Number(finish.lat),Number(finish.lon)]];
  const coords=delta>0?raw:raw.slice().reverse();
  if(coords.length>=2&&!reduced()){
   const path=getCoords(coords);
   if(path?.total>0){
    m.fitBounds(L.latLngBounds(path.pts),{padding:[28,28],maxZoom:17,animate:true,duration:.35});
    const icon=L.divIcon({className:'ia-public-walker',iconSize:[42,42],iconAnchor:[21,25],html:'<div>🚶</div>'});
    const walker=L.marker(path.pts[0],{icon,interactive:false,zIndexOffset:3000}).addTo(m);
    await new Promise(resolve=>{
     const duration=Math.max(900,Math.min(2400,1100+path.total*.65));
     const started=performance.now();
     function frame(now){
      const t=Math.min(1,(now-started)/duration);
      walker.setLatLng(interpolate(path,ease(t)));
      if(t<1)requestAnimationFrame(frame);else resolve();
     }
     requestAnimationFrame(frame);
    });
    walker.remove();
   }
  }
  const b=banner(finish.title);
  await new Promise(resolve=>setTimeout(resolve,reduced()?80:650));
  b.hidden=true;
  window.__IA_PUBLIC_GO(to);
  const sc=$('slideContent');sc.classList.remove('ia-arriving');void sc.offsetHeight;sc.classList.add('ia-arriving');
  m.panTo([Number(finish.lat),Number(finish.lon)],{animate:true,duration:.4});
 }catch(err){console.error('Animazione presentazione',err);window.__IA_PUBLIC_GO(to);}
 finally{
  running=false;$('viewer').classList.remove('is-travelling');
  const i=Number($('progress').textContent.split('/')[0])-1;
  [$('next'),$('mapNext')].forEach(b=>{if(b)b.disabled=i>=p.stops.length-1});
  [$('prev'),$('mapBack')].forEach(b=>{if(b)b.disabled=i<=0});
 }
}
function hook(){
 if(!window.__IA_PUBLIC_PROJECT||!window.__IA_PUBLIC_MAP)return;
 prepareRoutes();
 if($('next').dataset.iaHooked)return;
 for(const [id,d] of [['next',1],['prev',-1]]){
  const btn=$(id);btn.dataset.iaHooked='1';
  btn.addEventListener('click',event=>{
   if(document.body.dataset.view!=='both')return;
   event.stopImmediatePropagation();event.preventDefault();navigate(d);
  },true);
 }
 $('mapNext').onclick=()=>window.__IA_PUBLIC_GO(Math.min(window.__IA_PUBLIC_PROJECT.stops.length-1,Number($('progress').textContent.split('/')[0])));
 $('mapBack').onclick=()=>window.__IA_PUBLIC_GO(Math.max(0,Number($('progress').textContent.split('/')[0])-2));
}
const observer=new MutationObserver(()=>{if(window.__IA_PUBLIC_MAP&&window.__IA_PUBLIC_PROJECT)hook()});
observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
window.addEventListener('load',hook);
})();
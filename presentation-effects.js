(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  let bypass=false,busy=false;

  function stepInfo(){
    const m=($('stepText')?.textContent||'').match(/(\d+)\s*\/\s*(\d+)/);
    return m?{current:Number(m[1]),total:Number(m[2])}:{current:1,total:1};
  }
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
    const s=stepInfo();
    const lines=routeLines();
    const index=next?s.current-1:s.current-2;
    const line=lines[index];
    if(!line)return[];
    const pts=flattenLatLngs(line.getLatLngs?.()||[]);
    return next?pts:pts.reverse();
  }

  function walkingIcon(){
    return L.divIcon({
      className:'iaWalkerLeaflet',
      iconSize:[44,44],
      iconAnchor:[22,34],
      html:'<div class="iaWalkerAvatar" aria-label="Spostamento a piedi"><span>🚶</span></div>'
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

  function animateWalker(next){
    return new Promise(resolve=>{
      const map=window.__IA_MAP;
      const points=pathForMove(next);
      const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if(!map||points.length<2||reduced){resolve();return}

      const bounds=L.latLngBounds(points);
      try{map.fitBounds(bounds,{padding:[44,44],maxZoom:17,animate:true,duration:.35})}catch{}

      const {cum,total}=cumulativePath(points,map);
      if(!Number.isFinite(total)||total<=0){resolve();return}
      const duration=Math.max(1200,Math.min(2600,1250+total*.9));

      document.body.classList.add('iaWalking');
      const marker=L.marker(points[0],{icon:walkingIcon(),interactive:false,zIndexOffset:5000}).addTo(map);
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
            document.body.classList.remove('iaWalking');
            resolve();
          },230);
        }
        requestAnimationFrame(frame);
      },380);
    });
  }

  function slideTransition(btn,next){
    const slide=$('slide');
    if(!slide){busy=false;return}
    clearClasses(slide);
    slide.classList.add(next?'iaSlideLeavingNext':'iaSlideLeavingPrev');

    setTimeout(()=>{
      bypass=true;
      btn.click();
      requestAnimationFrame(()=>{
        clearClasses(slide);
        slide.classList.add(next?'iaSlideArriveNext':'iaSlideArrivePrev');
        setTimeout(()=>{clearClasses(slide);busy=false},430);
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

    animateWalker(next)
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

(()=>{
  'use strict';
  const PROJECT_STORE='itinerarioArtistico.projects.v4';
  const MODE_STORE='itinerarioArtistico.transportModes.v1';
  function stopKey(project,index){
    const s=project?.stops?.[index];if(!s)return'index:'+index;
    const lat=Number(s.lat),lon=Number(s.lon);
    return Number.isFinite(lat)&&Number.isFinite(lon)?lat.toFixed(6)+','+lon.toFixed(6):'index:'+index;
  }
  function expandLegacy(project,mode){
    const out={};
    for(let i=0;i<Math.max(0,(project?.stops?.length||0)-1);i++)out[stopKey(project,i)]=mode==='transit'?'transit':'walk';
    return out;
  }
  function migrate(){
    let projects=[],modes={};
    try{projects=JSON.parse(localStorage.getItem(PROJECT_STORE)||'[]')}catch{}
    try{modes=JSON.parse(localStorage.getItem(MODE_STORE)||'{}')}catch{}
    let changed=false;
    projects.forEach(p=>{
      if(!p?.id)return;
      const existing=modes[p.id];
      if(existing&&typeof existing==='object'&&!Array.isArray(existing))return;
      if(existing==='walk'||existing==='transit'){
        modes[p.id]=expandLegacy(p,existing);changed=true;return;
      }
      if(p._transportModes&&typeof p._transportModes==='object'){
        modes[p.id]={...p._transportModes};changed=true;return;
      }
      if(p._transportMode==='transit'||p._transportMode==='walk'){
        modes[p.id]=expandLegacy(p,p._transportMode);changed=true;
      }
    });
    if(changed)localStorage.setItem(MODE_STORE,JSON.stringify(modes));
  }
  migrate();
  document.addEventListener('change',e=>{if(e.target?.id==='importPicker')setTimeout(migrate,300)},true);
  document.addEventListener('click',e=>{if(e.target?.closest?.('.projectCard [data-o],.projectCard [data-p]'))setTimeout(migrate,50)},true);
})();
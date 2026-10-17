(()=>{
  'use strict';
  const PROJECT_STORE='itinerarioArtistico.projects.v4';
  const MODE_STORE='itinerarioArtistico.transportModes.v1';
  function migrate(){
    let projects=[],modes={};
    try{projects=JSON.parse(localStorage.getItem(PROJECT_STORE)||'[]')}catch{}
    try{modes=JSON.parse(localStorage.getItem(MODE_STORE)||'{}')}catch{}
    let changed=false;
    projects.forEach(p=>{
      if(!p?.id||modes[p.id])return;
      if(p._transportMode==='transit'||p._transportMode==='walk'){
        modes[p.id]=p._transportMode;changed=true;
      }
    });
    if(changed)localStorage.setItem(MODE_STORE,JSON.stringify(modes));
  }
  migrate();
  document.addEventListener('change',e=>{if(e.target?.id==='importPicker')setTimeout(migrate,300)},true);
  document.addEventListener('click',e=>{if(e.target?.closest?.('.projectCard [data-o],.projectCard [data-p]'))setTimeout(migrate,50)},true);
})();
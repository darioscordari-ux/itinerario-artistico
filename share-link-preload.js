(()=>{
  'use strict';

  const STORE='itinerarioArtistico.projects.v4';
  const OPEN_KEY='itinerarioArtistico.openShared.v1';
  const PRESENT_KEY='itinerarioArtistico.openSharedPresentation.v1';

  function fromBase64Url(value){
    const base64=value.replace(/-/g,'+').replace(/_/g,'/');
    const pad='='.repeat((4-base64.length%4)%4);
    const binary=atob(base64+pad);
    const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function uid(){
    return Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  }

  window.__IA_SHARED_READY=(async()=>{try{
    const hash=location.hash||'';
    const key=new URLSearchParams(location.search).get('s');
    if(!hash.startsWith('#share=')&&!key)return;
    let encoded,obj;
    if(key){
      if(!/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/.test(key))throw Error('Identificativo non valido');
      document.documentElement.classList.add('iaSharedCoverPending');
      const response=await fetch('https://api.jsonstorage.net/v1/json/'+key,{cache:'no-store'});
      if(!response.ok)throw Error('Presentazione non disponibile');
      obj=await response.json();
      encoded='s:'+key;
    }else{
      encoded=hash.slice(7);
      if(!encoded)return;
      obj=JSON.parse(fromBase64Url(encoded));
    }
    const source=obj?.project||obj;
    if(!source||!Array.isArray(source.stops))throw new Error('Dati itinerario non validi');

    const mode=obj?.mode==='presentation'?'presentation':'work';
    if(mode==='presentation')document.documentElement.classList.add('iaSharedCoverPending');
    let cached=null;
    try{cached=JSON.parse(sessionStorage.getItem('itinerarioArtistico.sharedSession.v1')||'null')}catch{}
    if(cached?.encoded===encoded){
      let saved=[];try{saved=JSON.parse(localStorage.getItem(STORE)||'[]')}catch{}
      if(Array.isArray(saved)&&saved.some(p=>p.id===cached.id)){
        sessionStorage.setItem(OPEN_KEY,cached.id);
        if(mode==='presentation')sessionStorage.setItem(PRESENT_KEY,'1');
        else sessionStorage.removeItem(PRESENT_KEY);
        return;
      }
    }
    const now=Date.now();
    const project={
      ...source,
      id:uid(),
      created:now,
      updated:now,
      sharedCopy:true,
      sharedPresentation:mode==='presentation',
      title:source.title||'Itinerario condiviso'
    };

    let projects=[];
    try{projects=JSON.parse(localStorage.getItem(STORE)||'[]')}catch{}
    if(!Array.isArray(projects))projects=[];
    // Avoid ambiguous title-based lookups in existing presentation modules.
    const baseTitle=project.title;let suffix=1;
    while(projects.some(p=>p.title===project.title))project.title=baseTitle+' · condiviso '+suffix++;
    if(source._slideExtras&&typeof source._slideExtras==='object'){
      let extras={};try{extras=JSON.parse(localStorage.getItem('itinerarioArtistico.slideExtras.v1')||'{}')}catch{}
      extras[project.id]=source._slideExtras;
      localStorage.setItem('itinerarioArtistico.slideExtras.v1',JSON.stringify(extras));
    }
    projects.push(project);
    localStorage.setItem(STORE,JSON.stringify(projects));
    sessionStorage.setItem(OPEN_KEY,project.id);
    if(mode==='presentation')sessionStorage.setItem(PRESENT_KEY,'1');
    else sessionStorage.removeItem(PRESENT_KEY);

    sessionStorage.setItem('itinerarioArtistico.sharedSession.v1',JSON.stringify({encoded,id:project.id}));
  }catch(err){
    document.documentElement.classList.remove('iaSharedCoverPending');
    console.error('Impossibile aprire itinerario condiviso',err);
    sessionStorage.setItem('itinerarioArtistico.sharedError.v1','1');
    sessionStorage.removeItem(PRESENT_KEY);
    sessionStorage.removeItem(OPEN_KEY);
    history.replaceState(null,'',location.pathname+location.search);
  }})();
})();

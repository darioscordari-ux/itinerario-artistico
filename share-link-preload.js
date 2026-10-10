(()=>{
  'use strict';

  const STORE='itinerarioArtistico.projects.v4';
  const OPEN_KEY='itinerarioArtistico.openShared.v1';

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

  try{
    const hash=location.hash||'';
    if(!hash.startsWith('#share='))return;

    const encoded=hash.slice(7);
    if(!encoded)return;

    const obj=JSON.parse(fromBase64Url(encoded));
    const source=obj?.project||obj;
    if(!source||!Array.isArray(source.stops))throw new Error('Dati itinerario non validi');

    const now=Date.now();
    const project={
      ...source,
      id:uid(),
      created:now,
      updated:now,
      sharedCopy:true,
      title:source.title||'Itinerario condiviso'
    };

    let projects=[];
    try{projects=JSON.parse(localStorage.getItem(STORE)||'[]')}catch{}
    if(!Array.isArray(projects))projects=[];
    projects.push(project);
    localStorage.setItem(STORE,JSON.stringify(projects));
    sessionStorage.setItem(OPEN_KEY,project.id);

    history.replaceState(null,'',location.pathname+location.search);
  }catch(err){
    console.error('Impossibile aprire itinerario condiviso',err);
    sessionStorage.setItem('itinerarioArtistico.sharedError.v1','1');
    history.replaceState(null,'',location.pathname+location.search);
  }
})();

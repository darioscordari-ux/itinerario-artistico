(()=>{
  'use strict';

  const STORE='itinerarioArtistico.projects.v4';
  const LINK_VERSION='20261109-3';
  const OPEN_KEY='itinerarioArtistico.openShared.v1';
  const PRESENT_KEY='itinerarioArtistico.openSharedPresentation.v1';

  function fromBase64Url(value){
    const base64=value.replace(/-/g,'+').replace(/_/g,'/');
    const pad='='.repeat((4-base64.length%4)%4);
    const binary=atob(base64+pad);
    const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  async function fromCompressedBase64Url(value){
    const base64=value.replace(/-/g,'+').replace(/_/g,'/');
    const pad='='.repeat((4-base64.length%4)%4);
    const binary=atob(base64+pad);
    const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
    if(typeof DecompressionStream!=='function')throw Error('Browser non compatibile con collegamenti compressi');
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new TextDecoder().decode(await new Response(stream).arrayBuffer());
  }

  function uid(){
    return Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  }

  window.__IA_SHARED_READY=(async()=>{try{
    const hash=location.hash||'';
    const key=new URLSearchParams(location.search).get('s');
    if(!hash.startsWith('#share=')&&!hash.startsWith('#sharez=')&&!key)return;
    let encoded,obj;
    if(key){
      let resource;
      const modern=/^(jb|sj)\.([a-zA-Z0-9-]{12,80})$/.exec(key);
      if(/^sb\.[a-f0-9-]{36}$/.test(key)){
        resource='https://xcnsipeozpexqsephmsu.supabase.co/rest/v1/shared_itineraries?id=eq.'+encodeURIComponent(key.slice(3))+'&select=payload';
      }else if(modern){
        resource=(modern[1]==='jb'?'https://jsonblob.com/api/jsonBlob/':'https://superjsonblob.com/api/jsonBlob/')+encodeURIComponent(modern[2]);
      }else if(/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/.test(key)){
        resource='https://api.jsonstorage.net/v1/json/'+key;
      }else throw Error('Identificativo non valido');
      document.documentElement.classList.add('iaSharedCoverPending');
      // A temporary network failure is not evidence that a link was truncated.
      let lastError=null;
      for(let attempt=0;attempt<3;attempt++){
        try{
          const response=await fetch(resource,{cache:'no-store',headers:key.startsWith('sb.')?{'apikey':'sb_publishable_d2KJWQld78oSUy3mtdYiNA_NdbaMvQT'}:{}});
          if(!response.ok){
            const message=response.status===401||response.status===403
              ?'Accesso al servizio di condivisione non autorizzato ('+response.status+')'
              :'Il servizio di condivisione non risponde ('+response.status+')';
            throw Error(message);
          }
          const result=await response.json();
          const restored=key.startsWith('sb.')?(Array.isArray(result)?result[0]?.payload:null):result;
          if(!restored)throw Error('Presentazione non trovata: il codice del link non esiste nell’archivio');
          obj=restored;
          lastError=null;
          break;
        }catch(error){
          lastError=error;
          if(attempt<2)await new Promise(resolve=>setTimeout(resolve,400*(attempt+1)));
        }
      }
      if(lastError)throw lastError;
      encoded='s:'+key;
    }else{
      const compressed=hash.startsWith('#sharez=');
      encoded=hash.slice(compressed?8:7);
      if(!encoded)return;
      obj=JSON.parse(compressed?await fromCompressedBase64Url(encoded):fromBase64Url(encoded));
    }
    const source=obj?.project||obj;
    if(!source||!Array.isArray(source.stops))throw new Error('Dati itinerario non validi');

    // Shared URLs open as a read-only presentation by default, including older\n    // URLs marked 'work'. An intentional &import=1 opts into copying for editing.\n    const mode=(obj?.mode==='work'&&new URLSearchParams(location.search).get('import')==='1')?'work':'presentation';
    // Public presentations are read-only: render the Supabase payload in memory.
    // Never copy image-heavy slides into the recipient's localStorage/sessionStorage.
    if(mode==='presentation'){
      const now=Date.now();
      const remote={...source,id:'ia-remote-'+now,created:now,updated:now,
        sharedCopy:true,sharedPresentation:true,title:source.title||'Itinerario condiviso'};
      window.__IA_REMOTE_PRESENTATION={project:remote,extras:source._slideExtras||{}};
      sessionStorage.removeItem(OPEN_KEY);
      sessionStorage.removeItem(PRESENT_KEY);
      const show=()=>{
        try{
          if(typeof window.__IA_OPEN_REMOTE_PRESENTATION!=='function')throw Error('Visualizzatore non inizializzato');
          window.__IA_OPEN_REMOTE_PRESENTATION(remote);
          document.documentElement.classList.remove('iaSharedCoverPending');
          // Leave the share token in the URL so a refresh/reopen still works.
        }catch(error){
          document.documentElement.classList.remove('iaSharedCoverPending');
          console.error('Visualizzazione presentazione non riuscita',error);
          alert('La presentazione è stata scaricata, ma non può essere visualizzata: '+(error?.message||'errore del visualizzatore'));
        }
      };
      if(document.readyState==='complete')setTimeout(show,0);
      else window.addEventListener('load',show,{once:true});
      return;
    }

    if(mode==='presentation')document.documentElement.classList.add('iaSharedCoverPending');
    let cached=null;
    try{cached=JSON.parse(sessionStorage.getItem('itinerarioArtistico.sharedSession.v1')||'null')}catch{}
    if(cached?.encoded===encoded){
      let saved=[];try{saved=JSON.parse(localStorage.getItem(STORE)||'[]')}catch{}
      if(Array.isArray(saved)&&saved.some(p=>p.id===cached.id)){
        sessionStorage.setItem(OPEN_KEY,cached.id);
        if(mode==='presentation')sessionStorage.setItem(PRESENT_KEY,'1');
        else sessionStorage.removeItem(PRESENT_KEY);
        history.replaceState(null,'',location.pathname);
        location.reload();
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
    // Opening a link on its originating device should not duplicate a large
    // project (photos can exceed the browser localStorage quota).
    const existing=projects.find(p=>p?.title===source.title&&
      Array.isArray(p.stops)&&p.stops.length===source.stops.length&&
      p.stops.every((s,i)=>s.title===source.stops[i]?.title&&s.lat===source.stops[i]?.lat&&s.lon===source.stops[i]?.lon));
    if(existing){
      // The same route already lives on this device: reuse it without saving
      // another copy of all its photographs.
      sessionStorage.setItem(OPEN_KEY,existing.id);
      if(mode==='presentation')sessionStorage.setItem(PRESENT_KEY,'1');
      else sessionStorage.removeItem(PRESENT_KEY);
      sessionStorage.setItem('itinerarioArtistico.sharedSession.v1',JSON.stringify({encoded,id:existing.id}));
      history.replaceState(null,'',location.pathname);
      location.reload();
      return;
    }
    if(source._slideExtras&&typeof source._slideExtras==='object'){
      let extras={};try{extras=JSON.parse(localStorage.getItem('itinerarioArtistico.slideExtras.v1')||'{}')}catch{}
      extras[project.id]=source._slideExtras;
      localStorage.setItem('itinerarioArtistico.slideExtras.v1',JSON.stringify(extras));
    }
    projects.push(project);
    try{localStorage.setItem(STORE,JSON.stringify(projects));}
    catch(storageError){
      if(storageError?.name==='QuotaExceededError'||storageError?.name==='NS_ERROR_DOM_QUOTA_REACHED')
        throw Error('Memoria del browser piena: il collegamento è valido ma le fotografie non entrano nello spazio disponibile. Non cancellare i dati del sito: esporta prima gli itinerari.');
      throw storageError;
    }
    sessionStorage.setItem(OPEN_KEY,project.id);
    if(mode==='presentation')sessionStorage.setItem(PRESENT_KEY,'1');
    else sessionStorage.removeItem(PRESENT_KEY);

    sessionStorage.setItem('itinerarioArtistico.sharedSession.v1',JSON.stringify({encoded,id:project.id}));
    // app.js reads projects into memory at startup. Reload so the new shared project appears in its library.
    history.replaceState(null,'',location.pathname);
    location.reload();
  }catch(err){
    document.documentElement.classList.remove('iaSharedCoverPending');
    console.error('Impossibile aprire itinerario condiviso',err);
    sessionStorage.removeItem('itinerarioArtistico.sharedError.v1');
    sessionStorage.removeItem(PRESENT_KEY);
    sessionStorage.removeItem(OPEN_KEY);
    // Async errors may occur after DOMContentLoaded: display them immediately.
    if(location.hash.startsWith('#share'))history.replaceState(null,'',location.pathname+location.search);
    setTimeout(()=>alert('Impossibile aprire il link condiviso: '+(err?.message||'errore imprevisto')),0);
  }})();
})();

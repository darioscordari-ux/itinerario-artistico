(()=>{
  'use strict';

  const STORE='itinerarioArtistico.projects.v4';

  function currentProject(){
    const title=document.getElementById('projectName')?.textContent?.trim();
    if(!title)return null;
    try{
      const projects=JSON.parse(localStorage.getItem(STORE)||'[]');
      const matches=projects.filter(p=>p?.title===title);
      if(!matches.length)return null;
      return matches.sort((a,b)=>(b.updated||0)-(a.updated||0))[0];
    }catch{return null;}
  }

  function toBase64Url(text){
    const bytes=new TextEncoder().encode(text);
    let binary='';
    const step=0x8000;
    for(let i=0;i<bytes.length;i+=step){
      binary+=String.fromCharCode(...bytes.subarray(i,i+step));
    }
    return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }

  function shareableProject(project){
    let removedLocalImages=0;
    const clone=JSON.parse(JSON.stringify(project));
    clone.stops=(clone.stops||[]).map(stop=>{
      const next={...stop};
      if(typeof next.image==='string' && next.image.startsWith('data:')){
        next.image='';
        next.credit='';
        next.source='';
        removedLocalImages++;
      }
      return next;
    });
    delete clone.id;
    delete clone.created;
    delete clone.updated;
    delete clone.sharedCopy;
    return {project:clone,removedLocalImages};
  }

  function makeLink(project){
    const prepared=shareableProject(project);
    const encoded=toBase64Url(JSON.stringify({version:1,project:prepared.project}));
    const base=location.origin+location.pathname;
    return {url:base+'#share='+encoded,removedLocalImages:prepared.removedLocalImages};
  }

  async function copyLink(url){
    try{
      await navigator.clipboard.writeText(url);
      alert('Link copiato. Ora puoi incollarlo in Classroom, Teams, WhatsApp o Gmail.');
    }catch{
      prompt('Copia questo link:',url);
    }
  }

  async function shareLink(project){
    const {url,removedLocalImages}=makeLink(project);
    if(url.length>60000){
      alert('Questo itinerario è troppo grande per essere condiviso come link. Usa “Condividi file” oppure “Scarica file”.');
      return;
    }

    const warning=removedLocalImages
      ? '\n\nNota: '+removedLocalImages+' immagin'+(removedLocalImages===1?'e caricata':'i caricate')+' dal dispositivo non può essere inserita nel link; testo, tappe e immagini online vengono condivisi.'
      : '';

    if(navigator.share){
      try{
        await navigator.share({
          title:project.title||'Itinerario Artistico',
          text:'Apri questo itinerario in Itinerario Artistico.'+warning,
          url
        });
        return;
      }catch(err){
        if(err?.name==='AbortError')return;
      }
    }

    if(removedLocalImages)alert(warning.trim());
    await copyLink(url);
  }

  function prepareButton(){
    const exportBtn=document.getElementById('exportBtn');
    if(!exportBtn||document.getElementById('shareLinkBtn'))return;

    const btn=document.createElement('button');
    btn.id='shareLinkBtn';
    btn.type='button';
    btn.className='btn primary';
    btn.textContent='🔗 Condividi link';
    btn.title='Condividi un link che apre direttamente questo itinerario';

    const shareFile=document.getElementById('shareExportBtn');
    if(shareFile)shareFile.insertAdjacentElement('afterend',btn);
    else exportBtn.insertAdjacentElement('afterend',btn);
  }

  document.addEventListener('click',e=>{
    if(e.target?.closest?.('#settingsBtn'))setTimeout(prepareButton,10);
  });

  document.addEventListener('click',e=>{
    const btn=e.target?.closest?.('#shareLinkBtn');
    if(!btn)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const project=currentProject();
    if(!project){
      alert('Non riesco a individuare l’itinerario da condividere.');
      return;
    }
    shareLink(project);
  },true);
})();

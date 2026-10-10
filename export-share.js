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

  function safeName(name){
    return (name||'itinerario')
      .trim()
      .replace(/[^a-z0-9à-ù]+/gi,'-')
      .replace(/^-+|-+$/g,'') || 'itinerario';
  }

  function projectPayload(project){
    return JSON.stringify({version:3,project},null,2);
  }

  function makeFile(project,type='application/json'){
    const filename=safeName(project.title)+'.json';
    return new File([projectPayload(project)],filename,{type});
  }

  function forceDownload(project){
    const filename=safeName(project.title)+'.json';
    const blob=new Blob([projectPayload(project)],{type:'application/octet-stream'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=filename;
    a.rel='noopener';
    a.style.display='none';
    document.body.appendChild(a);
    a.click();
    setTimeout(()=>{
      a.remove();
      URL.revokeObjectURL(url);
    },2500);
  }

  function getProjectOrWarn(){
    const project=currentProject();
    if(!project)alert('Non riesco a individuare l’itinerario da esportare.');
    return project;
  }

  async function shareProject(project){
    if(!navigator.share){
      alert('La condivisione diretta non è supportata da questo browser. Prova ad aprire l’app in Chrome oppure usa “Scarica file”.');
      return;
    }

    const candidates=[makeFile(project,'application/json'),makeFile(project,'text/plain')];
    let file=null;
    for(const candidate of candidates){
      try{
        if(!navigator.canShare || navigator.canShare({files:[candidate]})){
          file=candidate;
          break;
        }
      }catch{}
    }

    if(!file){
      alert('Questo browser non consente di condividere direttamente il file. Usa “Scarica file” oppure apri l’app in Chrome.');
      return;
    }

    try{
      await navigator.share({
        files:[file],
        title:'Itinerario Artistico',
        text:'Itinerario “'+project.title+'”'
      });
    }catch(err){
      if(err?.name!=='AbortError'){
        alert('Non è stato possibile aprire la condivisione. Prova ad aprire l’app in Chrome.');
      }
    }
  }

  function prepareSettingsButtons(){
    const exportBtn=document.getElementById('exportBtn');
    if(!exportBtn)return;

    exportBtn.textContent='⬇ Scarica file';
    exportBtn.title='Salva il file JSON dell’itinerario sul dispositivo';

    if(!document.getElementById('shareExportBtn')){
      const shareBtn=document.createElement('button');
      shareBtn.className='btn primary';
      shareBtn.id='shareExportBtn';
      shareBtn.type='button';
      shareBtn.textContent='↗ Condividi';
      shareBtn.title='Condividi il file con le app disponibili sul telefono';
      exportBtn.insertAdjacentElement('afterend',shareBtn);
    }
  }

  document.addEventListener('click',e=>{
    const btn=e.target?.closest?.('#exportBtn,#shareExportBtn');
    if(!btn)return;

    e.preventDefault();
    e.stopImmediatePropagation();

    const project=getProjectOrWarn();
    if(!project)return;

    if(btn.id==='exportBtn'){
      forceDownload(project);
    }else{
      shareProject(project);
    }
  },true);

  const observer=new MutationObserver(prepareSettingsButtons);
  observer.observe(document.documentElement,{subtree:true,childList:true});
  document.addEventListener('click',()=>setTimeout(prepareSettingsButtons,0));
})();

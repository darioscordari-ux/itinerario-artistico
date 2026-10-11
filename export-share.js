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

  function payload(project){
    return JSON.stringify({version:3,project},null,2);
  }

  function filename(project){
    return safeName(project.title)+'.json';
  }

  function downloadProject(project){
    const blob=new Blob([payload(project)],{type:'application/octet-stream'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=filename(project);
    a.rel='noopener';
    a.style.display='none';
    document.body.appendChild(a);
    a.click();
    setTimeout(()=>{
      a.remove();
      URL.revokeObjectURL(url);
    },2000);
  }

  function prepareSettingsButtons(){
    const exportBtn=document.getElementById('exportBtn');
    if(!exportBtn)return;

    if(exportBtn.dataset.shareReady!=='1'){
      exportBtn.dataset.shareReady='1';
      exportBtn.textContent='⬇ Scarica file';
      exportBtn.title='Salva il file JSON dell’itinerario sul dispositivo';
    }

    let shareBtn=document.getElementById('shareExportBtn');
    if(!shareBtn){
      shareBtn=document.createElement('button');
      shareBtn.className='btn';
      shareBtn.id='shareExportBtn';
      shareBtn.type='button';
      exportBtn.insertAdjacentElement('afterend',shareBtn);
    }
    shareBtn.textContent='▶ Condividi presentazione';
    shareBtn.title='Invia un link che apre direttamente questo itinerario in modalità presentazione';
  }

  document.addEventListener('click',e=>{
    if(e.target?.closest?.('#settingsBtn'))setTimeout(prepareSettingsButtons,0);
  });

  document.addEventListener('click',e=>{
    const btn=e.target?.closest?.('#exportBtn,#shareExportBtn');
    if(!btn)return;

    e.preventDefault();
    e.stopImmediatePropagation();

    const project=currentProject();
    if(!project){
      alert('Non riesco a individuare l’itinerario da esportare.');
      return;
    }

    if(btn.id==='exportBtn'){
      downloadProject(project);
      return;
    }

    const sharePresentation=window.__IA_SHARE_LINK?.sharePresentation;
    if(typeof sharePresentation==='function'){
      sharePresentation(project);
    }else{
      alert('La condivisione della presentazione non è ancora disponibile. Ricarica la pagina e riprova.');
    }
  },true);
})();

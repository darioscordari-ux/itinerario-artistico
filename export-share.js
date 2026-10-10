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

  function shareFiles(project){
    if(typeof File==='undefined')return [];
    const name=filename(project);
    const text=payload(project);
    return [
      new File([text],name,{type:'text/plain'}),
      new File([text],name,{type:'application/json'}),
      new File([text],name,{type:'application/octet-stream'})
    ];
  }

  async function shareProject(project){
    if(!navigator.share){
      alert('La condivisione diretta non è disponibile in questo browser. Usa “Scarica file” oppure apri l’app in Chrome.');
      return;
    }

    const files=shareFiles(project);
    let chosen=null;
    for(const file of files){
      try{
        if(!navigator.canShare || navigator.canShare({files:[file]})){
          chosen=file;
          break;
        }
      }catch{}
    }

    try{
      if(chosen){
        await navigator.share({
          files:[chosen],
          title:'Itinerario Artistico',
          text:'Itinerario “'+project.title+'”'
        });
      }else{
        await navigator.share({
          title:'Itinerario Artistico',
          text:'Itinerario “'+project.title+'”'
        });
      }
    }catch(err){
      if(err?.name!=='AbortError'){
        alert('Il telefono non ha aperto la condivisione del file. Prova ad aprire l’app in Chrome oppure usa “Scarica file”.');
      }
    }
  }

  function prepareSettingsButtons(){
    const exportBtn=document.getElementById('exportBtn');
    if(!exportBtn)return;

    if(exportBtn.dataset.shareReady!=='1'){
      exportBtn.dataset.shareReady='1';
      exportBtn.textContent='⬇ Scarica file';
      exportBtn.title='Salva il file JSON dell’itinerario sul dispositivo';
    }

    if(!document.getElementById('shareExportBtn')){
      const shareBtn=document.createElement('button');
      shareBtn.className='btn primary';
      shareBtn.id='shareExportBtn';
      shareBtn.type='button';
      shareBtn.textContent='↗ Condividi';
      shareBtn.title='Apri il menu di condivisione del telefono';
      exportBtn.insertAdjacentElement('afterend',shareBtn);
    }
  }

  document.addEventListener('click',e=>{
    if(e.target?.closest?.('#settingsBtn')){
      setTimeout(prepareSettingsButtons,0);
    }
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

    if(btn.id==='exportBtn')downloadProject(project);
    else shareProject(project);
  },true);
})();

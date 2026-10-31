(()=>{
  'use strict';

  const STORE='itinerarioArtistico.projects.v4';
  const RICH_STORE='itinerarioArtistico.richText.v1';
  const MODE_STORE='itinerarioArtistico.transportModes.v1';

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

  function enrichedProject(project){
    if(!project)return project;
    let rich=null,transport=null;
    try{
      const store=JSON.parse(localStorage.getItem(RICH_STORE)||'{}');
      rich=store?.[project.id]||project._richText||null;
    }catch{rich=project._richText||null}
    try{
      const modes=JSON.parse(localStorage.getItem(MODE_STORE)||'{}');
      const raw=modes?.[project.id];
      if(raw&&typeof raw==='object'&&!Array.isArray(raw))transport=raw;
      else if(raw==='walk'||raw==='transit')transport=expandLegacy(project,raw);
    }catch{}
    if(!transport&&project._transportModes&&typeof project._transportModes==='object')transport=project._transportModes;
    if(!transport&&(project._transportMode==='walk'||project._transportMode==='transit'))transport=expandLegacy(project,project._transportMode);
    const out={...project};
    try{const extras=JSON.parse(localStorage.getItem('itinerarioArtistico.slideExtras.v1')||'{}');out._slideExtras=extras[project.id]||project._slideExtras||{};}catch{out._slideExtras=project._slideExtras||{}}
    if(transport)out._transportModes=transport;
    delete out._transportMode;
    if(rich&&Object.keys(rich).length)out._richText=rich;
    return out;
  }

  function safeName(name){
    return (name||'itinerario')
      .trim()
      .replace(/[^a-z0-9à-ù]+/gi,'-')
      .replace(/^-+|-+$/g,'') || 'itinerario';
  }

  function payload(project){
    return JSON.stringify({version:6,project:enrichedProject(project)},null,2);
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
      exportBtn.textContent='⬇ Scarica presentazione HTML';
      exportBtn.title='Scarica la presentazione apribile in Chrome';
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
    exportBtn.onclick=e=>{
      e.preventDefault();e.stopPropagation();
      const project=currentProject();
      if(!project)return alert('Itinerario non trovato.');
      const download=window.__IA_DOWNLOAD_HTML;
      if(typeof download!=='function')return alert('Download HTML non disponibile. Ricarica la pagina.');
      download(enrichedProject(project)).catch(error=>alert('Download non riuscito: '+error.message));
    };
    shareBtn.onclick=()=>{
      const project=currentProject();
      if(!project){alert('Itinerario non trovato.');return;}
      const fn=window.__IA_SHARE_LINK?.sharePresentation;
      if(typeof fn!=='function'){alert('Modulo di condivisione non caricato. Chiudi e riapri Chrome.');return;}
      fn(enrichedProject(project));
    };
  }

  document.addEventListener('click',e=>{
    if(e.target?.closest?.('#settingsBtn'))setTimeout(prepareSettingsButtons,0);
  });

  document.addEventListener('click',e=>{
    const btn=e.target?.closest?.('#__no_export_listener');
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
      sharePresentation(enrichedProject(project));
    }else{
      alert('La condivisione della presentazione non è ancora disponibile. Ricarica la pagina e riprova.');
    }
  },true);
})();

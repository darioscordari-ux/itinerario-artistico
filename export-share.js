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

  function fallbackDownload(file,filename){
    const url=URL.createObjectURL(file);
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
    },1500);
  }

  async function exportProject(e){
    const btn=e.target?.closest?.('#exportBtn');
    if(!btn)return;

    e.preventDefault();
    e.stopImmediatePropagation();

    const project=currentProject();
    if(!project){
      alert('Non riesco a individuare l’itinerario da esportare.');
      return;
    }

    const filename=safeName(project.title)+'.json';
    const json=JSON.stringify({version:3,project},null,2);
    const file=new File([json],filename,{type:'application/json'});

    try{
      if(navigator.share && navigator.canShare && navigator.canShare({files:[file]})){
        await navigator.share({
          files:[file],
          title:'Itinerario Artistico',
          text:'File dell’itinerario “'+project.title+'”'
        });
        return;
      }
    }catch(err){
      if(err?.name==='AbortError')return;
    }

    fallbackDownload(file,filename);
  }

  document.addEventListener('click',exportProject,true);
})();

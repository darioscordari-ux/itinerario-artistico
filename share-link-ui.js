(()=>{
  'use strict';

  const STORE='itinerarioArtistico.projects.v4';
  const OPEN_KEY='itinerarioArtistico.openShared.v1';
  const PRESENT_KEY='itinerarioArtistico.openSharedPresentation.v1';
  const ERROR_KEY='itinerarioArtistico.sharedError.v1';

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
    try{const extras=JSON.parse(localStorage.getItem('itinerarioArtistico.slideExtras.v1')||'{}');clone._slideExtras=JSON.parse(JSON.stringify(extras[project.id]||clone._slideExtras||{}));}catch{}
    Object.values(clone._slideExtras||{}).forEach(extra=>{if(Array.isArray(extra.images))extra.images=extra.images.filter(src=>{if(typeof src==='string'&&src.startsWith('data:')){removedLocalImages++;return false;}return true;});});
    if(typeof clone.coverImage==='string'&&clone.coverImage.startsWith('data:')){clone.coverImage='';removedLocalImages++;}
    delete clone.id;
    delete clone.created;
    delete clone.updated;
    delete clone.sharedCopy;
    return {project:clone,removedLocalImages};
  }

  async function makeLink(project,mode='work'){
    const prepared=shareableProject(project);
    const data={version:2,mode:mode==='presentation'?'presentation':'work',project:prepared.project};
    const base=location.origin+location.pathname;
    try{
      const response=await fetch('https://api.jsonstorage.net/v1/json',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)
      });
      if(!response.ok)throw Error('HTTP '+response.status);
      const saved=await response.json();
      const uri=new URL(saved.uri);
      if(uri.origin!=='https://api.jsonstorage.net'||!uri.pathname.startsWith('/v1/json/'))throw Error('Risposta inattesa');
      const key=uri.pathname.slice('/v1/json/'.length);
      if(!/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/.test(key))throw Error('Identificativo non valido');
      return {url:base+'?s='+encodeURIComponent(key),removedLocalImages:prepared.removedLocalImages,short:true};
    }catch(error){
      console.warn('Condivisione breve non disponibile',error);
      const encoded=toBase64Url(JSON.stringify(data));
      return {url:base+'?v=share5#share='+encoded,removedLocalImages:prepared.removedLocalImages,short:false};
    }
  }

  async function copyLink(url,message){
    try{
      await navigator.clipboard.writeText(url);
      alert(message||'Link copiato. Ora puoi incollarlo in Classroom, Teams, WhatsApp o Gmail.');
    }catch{
      prompt('Copia questo link:',url);
    }
  }

  async function shareLink(project,mode='work'){
    const isPresentation=mode==='presentation';
    const {url,removedLocalImages,short}=await makeLink(project,mode);
    const back=document.getElementById('modalBack'),modal=document.getElementById('modal');
    if(!back||!modal)return;
    modal.replaceChildren();
    const title=document.createElement('h2');title.textContent=isPresentation?'Condividi solo presentazione':'Condividi itinerario';
    const info=document.createElement('p');info.textContent=isPresentation?'Chi apre il link vede copertina, tappe e immagini, senza comandi di modifica.':'Chi apre il link riceve una copia modificabile.';
    const field=document.createElement('textarea');field.readOnly=true;field.value=url;field.setAttribute('aria-label','Link da condividere');field.style.cssText='width:100%;height:90px;word-break:break-all';
    const status=document.createElement('p');status.setAttribute('role','status');
    if(removedLocalImages)status.textContent=removedLocalImages+' immagini locali non incluse nel link. Le immagini online sono incluse.';
    if(!short)status.textContent+=' Link breve non disponibile: il collegamento tradizionale potrebbe essere troppo lungo per WhatsApp.';
    const foot=document.createElement('div');foot.className='modalFoot';
    function button(label,fn){const el=document.createElement('button');el.type='button';el.className='btn';el.textContent=label;el.onclick=fn;foot.appendChild(el);return el;}
    button('Chiudi',()=>back.classList.add('hidden'));
    button('Copia link',async()=>{try{await navigator.clipboard.writeText(url);status.textContent='Link copiato. Puoi incollarlo in WhatsApp, Classroom o email.';}catch{field.focus();field.select();status.textContent='Link selezionato: usa Copia dal menu del dispositivo.';}}).classList.add('primary');
    if(navigator.share)button('Condividi…',async()=>{try{await navigator.share({title:project.title||'Itinerario',url});}catch(e){if(e?.name!=='AbortError')status.textContent='Usa Copia link per condividere questa presentazione.';}});
    const test=document.createElement('a');test.className='btn';test.textContent='Prova il link';test.href=url;test.target='_blank';test.rel='noopener';foot.appendChild(test);
    modal.append(title,info,field,status,foot);back.classList.remove('hidden');
  }

  function prepareButton(){
    const exportBtn=document.getElementById('exportBtn');
    if(!exportBtn||document.getElementById('shareLinkBtn'))return;

    const btn=document.createElement('button');
    btn.id='shareLinkBtn';
    btn.type='button';
    btn.className='btn primary';
    btn.textContent='🔗 Condividi link';
    btn.title='Condividi un link che apre normalmente questo itinerario';

    const sharePresentation=document.getElementById('shareExportBtn');
    if(sharePresentation)sharePresentation.insertAdjacentElement('afterend',btn);
    else exportBtn.insertAdjacentElement('afterend',btn);
  }

  function autoOpenShared(){
    if(sessionStorage.getItem(ERROR_KEY)==='1'){
      document.documentElement.classList.remove('iaSharedCoverPending');
      sessionStorage.removeItem(ERROR_KEY);
      sessionStorage.removeItem(PRESENT_KEY);
      setTimeout(()=>alert('Il link dell’itinerario non è valido oppure è stato tagliato durante la condivisione.'),50);
      return;
    }

    const id=sessionStorage.getItem(OPEN_KEY);
    if(!id){document.documentElement.classList.remove('iaSharedCoverPending');return;}

    const openAsPresentation=sessionStorage.getItem(PRESENT_KEY)==='1';

    try{
      const projects=JSON.parse(localStorage.getItem(STORE)||'[]');
      const index=Array.isArray(projects)?projects.findIndex(p=>p?.id===id):-1;
      const cards=document.querySelectorAll('.projectCard');
      const openBtn=index>=0?cards[index]?.querySelector('[data-o]'):null;
      if(!openBtn)document.documentElement.classList.remove('iaSharedCoverPending');
      if(openBtn){
        sessionStorage.removeItem(OPEN_KEY);
        sessionStorage.removeItem(PRESENT_KEY);
        openBtn.click();
        if(openAsPresentation){
          const presentBtn=document.getElementById('presentBtn');
          if(presentBtn&&!document.body.classList.contains('presentation'))presentBtn.click();
          window.__IA_SHOW_COVER?.();
        }else{
          setTimeout(()=>alert('Itinerario condiviso aperto. È stata salvata anche una copia su questo dispositivo.'),250);
        }
      }
    }catch{
      document.documentElement.classList.remove('iaSharedCoverPending');
      sessionStorage.removeItem(OPEN_KEY);
      sessionStorage.removeItem(PRESENT_KEY);
    }
  }

  const viewerStyle=document.createElement('style');
  viewerStyle.textContent='body.sharedViewer .photoActions,body.sharedViewer #iaCoverExit,body.sharedViewer #paneSplitter{display:none!important}body.sharedViewer .hero img{cursor:default!important}';
  document.head.appendChild(viewerStyle);
  document.addEventListener('click',e=>{
    if(!document.body.classList.contains('sharedViewer'))return;
    if(e.target.closest('.photoActions,#iaCoverExit,#editStopBtn,#addStopBtn,#deleteSelectedStopBtn,#settingsBtn,.hero img')){e.preventDefault();e.stopImmediatePropagation();}
  },true);
  window.__IA_SHARE_LINK={
    shareWork:project=>shareLink(project,'work'),
    sharePresentation:project=>shareLink(project,'presentation')
  };

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
    shareLink(project,'work');
  },true);

  function ready(){Promise.resolve(window.__IA_SHARED_READY).then(autoOpenShared).catch(autoOpenShared);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();


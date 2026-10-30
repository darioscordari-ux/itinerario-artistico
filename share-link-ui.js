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
    const clone=JSON.parse(JSON.stringify(project));
    try{const extras=JSON.parse(localStorage.getItem('itinerarioArtistico.slideExtras.v1')||'{}');clone._slideExtras=JSON.parse(JSON.stringify(extras[project.id]||clone._slideExtras||{}));}catch{}
    delete clone.id;delete clone.created;delete clone.updated;delete clone.sharedCopy;
    return {project:clone,removedLocalImages:0};
  }

  async function localLink(data,base){
    const raw=new TextEncoder().encode(JSON.stringify(data));
    let bytes=raw,marker='#share=';
    if(typeof CompressionStream==='function'){
      try{
        const stream=new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'));
        const compressed=new Uint8Array(await new Response(stream).arrayBuffer());
        if(compressed.length<raw.length){bytes=compressed;marker='#sharez=';}
      }catch(error){console.warn('Compressione non disponibile',error);}
    }
    let binary='';
    for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
    return base+marker+btoa(binary).split('+').join('-').split('/').join('_').replace(/=+$/,'');
  }

  // Make shared presentations independent from external image hosts whenever CORS permits.
  async function snapshotImages(project){
    const urls=new Set();
    function collect(src){if(typeof src==='string'&&/^https:\/\//i.test(src))urls.add(src);}
    collect(project.coverImage);
    for(const stop of project.stops||[])collect(stop.image);
    for(const extra of Object.values(project._slideExtras||{}))for(const src of extra?.images||[])collect(src);
    const replacements=new Map(),failed=[];
    for(const url of urls){
      try{
        const response=await fetch(url,{mode:'cors',cache:'no-store'});
        if(!response.ok)throw Error('HTTP '+response.status);
        const blob=await response.blob();
        if(!blob.type.startsWith('image/'))throw Error('Non è una fotografia');
        if(blob.size>2500000)throw Error('Immagine oltre 2,5 MB');
        const encoded=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Lettura fallita'));reader.readAsDataURL(blob);});
        replacements.set(url,encoded);
      }catch(error){failed.push(url);console.warn('Immagine esterna non archiviabile',url,error);}
    }
    const replace=src=>replacements.get(src)||src;
    project.coverImage=replace(project.coverImage);
    for(const stop of project.stops||[])stop.image=replace(stop.image);
    for(const extra of Object.values(project._slideExtras||{}))if(Array.isArray(extra?.images))extra.images=extra.images.map(replace);
    return failed;
  }

  async function makeLink(project,mode='work'){
    const prepared=shareableProject(project);
    const failed=await snapshotImages(prepared.project);
    if(failed.length)throw Error('Non posso garantire il salvataggio di '+failed.length+' fotografie esterne: il sito di origine ne impedisce il recupero. Scarica queste foto sul dispositivo e ricaricale nell’itinerario, poi riprova a condividere.');
    const data={version:2,mode:mode==='presentation'?'presentation':'work',project:prepared.project};
    const base=location.origin+location.pathname;
    // Store the complete project, including locally uploaded images, on Supabase.
    const endpoint='https://xcnsipeozpexqsephmsu.supabase.co/rest/v1/shared_itineraries';
    const key='sb_publishable_d2KJWQld78oSUy3mtdYiNA_NdbaMvQT';
    const body=JSON.stringify({payload:data});
    if(new TextEncoder().encode(body).length>8000000)throw Error('Il progetto supera 8 MB. Riduci la dimensione delle fotografie prima di condividere il link. Il file scaricabile rimane completo.');
    const response=await fetch(endpoint,{
      method:'POST',headers:{'apikey':key,'Content-Type':'application/json','Prefer':'return=representation'},body
    });
    if(!response.ok)throw Error('Non è stato possibile salvare la presentazione online ('+response.status+'). Riprova più tardi.');
    const rows=await response.json();
    const id=rows?.[0]?.id;
    if(!/^[a-f0-9-]{36}$/.test(id||''))throw Error('Salvataggio non verificato: link non creato.');
    return {url:base+'?s=sb.'+id,removedLocalImages:0,short:true};
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
    let link;
    try{link=await makeLink(project,mode);}catch(error){alert(error.message);return;}
    const {url,removedLocalImages,short}=link;
    const back=document.getElementById('modalBack'),modal=document.getElementById('modal');
    if(!back||!modal)return;
    modal.replaceChildren();
    const title=document.createElement('h2');title.textContent=isPresentation?'Condividi solo presentazione':'Condividi itinerario';
    const info=document.createElement('p');info.textContent=isPresentation?'Chi apre il link vede copertina, tappe e immagini, senza comandi di modifica.':'Chi apre il link riceve una copia modificabile.';
    const field=document.createElement('textarea');field.readOnly=true;field.value=url;field.setAttribute('aria-label','Link da condividere');field.style.cssText='width:100%;height:90px;word-break:break-all';
    const status=document.createElement('p');status.setAttribute('role','status');
    if(removedLocalImages)status.textContent=removedLocalImages+' immagini locali non incluse nel link. Le immagini online sono incluse.';

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
    // Keep editable sharing available internally, but do not add a confusing third button.
    return;

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


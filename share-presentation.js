(()=>{
  'use strict';
  const STORE='itinerarioArtistico.projects.v4';
  let activeProjectId=null;
  let activeReadonly=false;

  function getProjects(){try{return JSON.parse(localStorage.getItem(STORE)||'[]')}catch{return []}}
  function saveProjects(p){localStorage.setItem(STORE,JSON.stringify(p))}
  function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
  function slug(title){return (title||'itinerario').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase()}
  function fileName(title,mode){return `${slug(title)}-${mode==='presentation'?'presentazione':'lavoro'}.json`}

  function projectForCurrentView(){
    const projects=getProjects();
    if(activeProjectId){const p=projects.find(x=>x.id===activeProjectId);if(p)return p}
    const title=document.getElementById('projectName')?.textContent?.trim();
    return projects.filter(p=>p.title===title).sort((a,b)=>(b.updated||0)-(a.updated||0))[0]||null;
  }

  function setReadonlyMode(on){
    activeReadonly=!!on;
    document.body.classList.toggle('readonly-mode',activeReadonly);
    ['addStopBtn','editStopBtn','settingsBtn','shareBtn'].forEach(id=>document.getElementById(id)?.classList.toggle('hidden',activeReadonly));
  }

  async function sendPayload(p,mode){
    const clone=JSON.parse(JSON.stringify(p));
    delete clone.id;
    const isPresentation=mode==='presentation';
    clone.readOnly=isPresentation;
    clone.presentationOnly=isPresentation;
    const payload={
      type:isPresentation?'itinerario-artistico-presentation':'itinerario-artistico-work',
      version:2,
      presentationOnly:isPresentation,
      editable:!isPresentation,
      project:clone
    };
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const file=new File([blob],fileName(p.title,mode),{type:'application/json'});
    const shareText=isPresentation?'Presentazione Itinerario Artistico · sola lettura':'Itinerario Artistico · file di lavoro modificabile';
    try{
      if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){
        await navigator.share({title:p.title,text:shareText,files:[file]});
        return;
      }
    }catch(e){if(e?.name==='AbortError')return}
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download=file.name;a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1500);
  }

  function openShareMenu(){
    const p=projectForCurrentView();
    if(!p)return alert('Apri prima un itinerario.');
    const back=document.getElementById('modalBack'),modal=document.getElementById('modal');
    if(!back||!modal)return;
    modal.innerHTML=`
      <h2>Condividi itinerario</h2>
      <p style="margin-top:0;color:#6b6255">Scegli come vuoi inviarlo.</p>
      <div style="display:grid;gap:12px;margin-top:18px">
        <button id="shareWorkChoice" class="btn" style="text-align:left;padding:14px 16px;height:auto">
          <b style="display:block;font-size:15px;margin-bottom:4px">✎ Condividi lavoro</b>
          <span style="font-size:13px">Chi lo riceve può importarlo e modificarlo.</span>
        </button>
        <button id="sharePresentationChoice" class="btn primary" style="text-align:left;padding:14px 16px;height:auto">
          <b style="display:block;font-size:15px;margin-bottom:4px">▶ Condividi presentazione</b>
          <span style="font-size:13px">Prodotto finito: sola lettura, senza strumenti di modifica.</span>
        </button>
      </div>
      <div class="modalFoot"><button id="closeShareChoice" class="btn">Chiudi</button></div>`;
    back.classList.remove('hidden');
    document.getElementById('shareWorkChoice').onclick=async()=>{back.classList.add('hidden');await sendPayload(p,'work')};
    document.getElementById('sharePresentationChoice').onclick=async()=>{back.classList.add('hidden');await sendPayload(p,'presentation')};
    document.getElementById('closeShareChoice').onclick=()=>back.classList.add('hidden');
  }

  function ensureToolbarButton(){
    if(document.getElementById('shareBtn'))return;
    const settings=document.getElementById('settingsBtn');
    if(!settings)return;
    const b=document.createElement('button');
    b.id='shareBtn';b.className='btn';b.textContent='↗ Condividi';
    b.onclick=openShareMenu;
    settings.after(b);
    if(activeReadonly)b.classList.add('hidden');
  }

  function ensureImportButton(){
    if(document.getElementById('libraryImportBtn'))return;
    const top=document.querySelector('.libraryTop');
    if(!top)return;
    const wrap=document.createElement('div');wrap.style.marginTop='16px';
    const b=document.createElement('button');b.id='libraryImportBtn';b.className='btn';b.textContent='⇧ Importa itinerario / presentazione';
    b.onclick=()=>document.getElementById('importPicker')?.click();
    wrap.appendChild(b);top.appendChild(wrap);
  }

  function decorateCards(){
    const projects=getProjects();
    const cards=[...document.querySelectorAll('.projectCard')];
    cards.forEach((card,i)=>{
      const p=projects[i];if(!p)return;
      card.dataset.projectId=p.id;
      card.dataset.readonly=p.readOnly||p.presentationOnly?'1':'0';
      const old=card.querySelector('.readonlyBadge');if(old)old.remove();
      if(p.readOnly||p.presentationOnly){
        const badge=document.createElement('div');
        badge.className='readonlyBadge';
        badge.textContent='🔒 Presentazione · sola lettura';
        badge.style.cssText='font-size:12px;font-weight:700;margin:8px 0 0;color:#6b6255';
        card.querySelector('.cardBody')?.insertBefore(badge,card.querySelector('.cardActions'));
        const open=card.querySelector('[data-o]');if(open)open.textContent='Apri presentazione';
        const present=card.querySelector('[data-p]');if(present)present.style.display='none';
        const dup=card.querySelector('[data-d]');if(dup)dup.style.display='none';
      } else {
        const open=card.querySelector('[data-o]');if(open)open.textContent='Apri';
        const present=card.querySelector('[data-p]');if(present)present.style.display='';
        const dup=card.querySelector('[data-d]');if(dup)dup.style.display='';
      }
    });
  }

  document.addEventListener('click',e=>{
    const card=e.target?.closest?.('.projectCard');
    if(card && (e.target.matches('[data-o]')||e.target.matches('[data-p]'))){
      activeProjectId=card.dataset.projectId||null;
      const ro=card.dataset.readonly==='1';
      setTimeout(()=>{
        setReadonlyMode(ro);
        if(ro){
          const present=document.getElementById('presentBtn');
          if(present && !document.body.classList.contains('presentation'))present.click();
        }
      },500);
    }
    if(e.target?.id==='homeBtn')setTimeout(()=>{activeProjectId=null;setReadonlyMode(false);decorateCards();ensureImportButton()},80);
  },true);

  const picker=document.getElementById('importPicker');
  if(picker){
    picker.addEventListener('change',async e=>{
      const f=e.target.files?.[0];if(!f)return;
      e.stopImmediatePropagation();
      try{
        const obj=JSON.parse(await f.text());
        const p=obj.project||obj;
        if(!p||!Array.isArray(p.stops))throw new Error();
        const isPresentation=obj.presentationOnly===true||obj.type==='itinerario-artistico-presentation'||p.presentationOnly===true||p.readOnly===true;
        const imported={...p,id:uid(),created:Date.now(),updated:Date.now(),title:(p.title||'Itinerario')+(isPresentation?' · presentazione':' · condiviso')};
        imported.readOnly=!!isPresentation;
        imported.presentationOnly=!!isPresentation;
        if(!isPresentation){delete imported.readOnly;delete imported.presentationOnly}
        const projects=getProjects();projects.push(imported);saveProjects(projects);
        location.reload();
      }catch{alert('File non valido o non compatibile.')}
      e.target.value='';
    },true);
  }

  const style=document.createElement('style');
  style.textContent='body.readonly-mode #addStopBtn,body.readonly-mode #editStopBtn,body.readonly-mode #settingsBtn,body.readonly-mode #shareBtn{display:none!important}';
  document.head.appendChild(style);

  const observer=new MutationObserver(()=>{ensureToolbarButton();ensureImportButton();decorateCards()});
  observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('load',()=>{ensureToolbarButton();ensureImportButton();decorateCards()});
})();

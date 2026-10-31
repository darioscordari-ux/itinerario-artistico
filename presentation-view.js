(()=>{
  'use strict';
  const bar=document.querySelector('.toolbar');
  if(!bar)return;
  const control=document.createElement('div');
  control.className='iaViewControl';
  control.setAttribute('role','group');
  control.setAttribute('aria-label','Vista della presentazione');
  const modes=[['map','Solo mappa'],['slides','Solo slide'],['both','Entrambe']];
  let mode='both';
  control.innerHTML=modes.map(([value,label])=>`<button type="button" data-view="${value}" aria-pressed="${value===mode}">${label}</button>`).join('');
  bar.prepend(control);
  const nav=document.createElement('nav');
  nav.className='iaMapOnlyNav';
  nav.setAttribute('aria-label','Navigazione tappe sulla mappa');
  nav.innerHTML='<button type="button" aria-label="Tappa precedente">← Indietro</button><span aria-live="polite"></span><button type="button" aria-label="Tappa successiva">Avanti →</button>';
  document.querySelector('.workspace').appendChild(nav);
  nav.firstElementChild.onclick=()=>document.getElementById('prevBtn')?.click();
  nav.lastElementChild.onclick=()=>document.getElementById('nextBtn')?.click();
  function syncStep(){
    const text=document.getElementById('stepText')?.textContent||'';
    nav.querySelector('span').textContent=text;
    const m=text.match(/(\d+)\s*\/\s*(\d+)/);
    nav.firstElementChild.disabled=!m||Number(m[1])<=1;
    nav.lastElementChild.disabled=!m||Number(m[1])>=Number(m[2]);
  }
  const step=document.getElementById('stepText');
  if(step)new MutationObserver(syncStep).observe(step,{childList:true,characterData:true,subtree:true});
  function choose(value){
    if(!modes.some(([key])=>key===value))return;
    mode=value;document.body.dataset.presentationView=mode;
    control.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===mode)));
    if(mode!=='both')document.querySelectorAll('.iaPhotoBridge,.iaDestinationPhoto').forEach(el=>el.remove());
    // Switching views must never leave the slide hidden by a travel transition.
    document.body.classList.remove('iaMapJourney');
    const slide=document.getElementById('slide');
    slide?.classList.remove('iaSlideLeavingNext','iaSlideLeavingPrev','iaSlideArriveNext','iaSlideArrivePrev');
    if(mode==='both'){
      const panel=document.querySelector('.slidePanel');
      if(panel){panel.style.removeProperty('opacity');panel.style.removeProperty('transform');panel.style.removeProperty('pointer-events');}
      slide?.querySelectorAll('.hero img').forEach(img=>{if(img.loading==='lazy')img.loading='eager';});
    }
    requestAnimationFrame(()=>window.__IA_MAP?.invalidateSize?.({pan:false}));
    setTimeout(()=>window.__IA_MAP?.invalidateSize?.({pan:false}),550);
    syncStep();
  }
  control.addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b)choose(b.dataset.view)});
  window.__IA_PRESENTATION_VIEW=()=>mode;
  choose('both');
})();

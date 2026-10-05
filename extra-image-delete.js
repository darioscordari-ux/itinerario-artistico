(()=>{
  'use strict';
  const PROJECT_STORE='itinerarioArtistico.projects.v4';
  const EXTRA_STORE='itinerarioArtistico.slideExtras.v1';
  const $=id=>document.getElementById(id);
  let timer=null;

  function load(key){try{return JSON.parse(localStorage.getItem(key)||'{}')}catch{return{}}}
  function currentProjectId(){
    const title=$('projectName')?.textContent?.trim();
    if(!title)return null;
    try{
      const ps=JSON.parse(localStorage.getItem(PROJECT_STORE)||'[]');
      return ps.find(p=>p.title===title)?.id||null;
    }catch{return null}
  }
  function currentIndex(){
    const m=($('stepText')?.textContent||'').match(/(\d+)\s*\/\s*(\d+)/);
    return m?Math.max(0,Number(m[1])-1):0;
  }
  function currentExtra(){
    const pid=currentProjectId(); if(!pid)return null;
    const store=load(EXTRA_STORE), idx=String(currentIndex());
    return {store,pid,idx,data:store?.[pid]?.[idx]||null};
  }
  function save(store){localStorage.setItem(EXTRA_STORE,JSON.stringify(store))}
  function updateGrid(hero){
    hero.classList.remove('gallery2','gallery3','gallery4');
    const count=hero.querySelectorAll('img').length;
    if(count>1)hero.classList.add('gallery'+Math.min(4,count));
    if(count===0&&!hero.querySelector('.placeholder')){
      const p=document.createElement('div');
      p.className='placeholder';
      const title=$('slide')?.querySelector('h1')?.textContent||'Immagine';
      p.innerHTML=`<div><strong>${title}</strong><br>Aggiungi un’immagine</div>`;
      hero.appendChild(p);
    }
  }
  function removeExtra(index){
    const x=currentExtra();if(!x?.data)return;
    x.data.images=Array.isArray(x.data.images)?x.data.images:[];
    if(index<0||index>=x.data.images.length)return;
    x.data.images.splice(index,1);
    save(x.store);
    const hero=$('slide')?.querySelector('.hero');
    const nodes=hero?.querySelectorAll('.extraSlideImage');
    nodes?.[index]?.remove();
    if(hero)updateGrid(hero);
    refresh();
  }
  function refresh(){
    const slide=$('slide'),actions=slide?.querySelector('.photoActions'),hero=slide?.querySelector('.hero');
    if(!slide||!actions||!hero)return;
    const x=currentExtra(), images=Array.isArray(x?.data?.images)?x.data.images:[];
    const primary=!!hero.querySelector('img:not(.extraSlideImage)');
    const existing=[...actions.querySelectorAll('.extraImageDeleteBtn')];
    const sig=images.map((_,i)=>String(i)).join(',');
    const currentSig=existing.map(b=>b.dataset.extraIndex).join(',');
    if(existing.length===images.length&&sig===currentSig)return;
    existing.forEach(b=>b.remove());
    images.forEach((_,i)=>{
      const b=document.createElement('button');
      b.className='btn red extraImageDeleteBtn';
      b.dataset.extraIndex=String(i);
      b.textContent=`🗑 Elimina immagine ${i+(primary?2:1)}`;
      b.title='Elimina questa immagine dalla slide';
      b.onclick=e=>{
        e.preventDefault();e.stopPropagation();
        if(confirm('Eliminare questa immagine dalla slide?'))removeExtra(i);
      };
      actions.appendChild(b);
    });
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(refresh,80)}
  window.addEventListener('load',()=>{
    const slide=$('slide');
    if(slide)new MutationObserver(schedule).observe(slide,{childList:true,subtree:true});
    document.addEventListener('click',e=>{
      if(e.target?.closest?.('#nextBtn,#prevBtn,.leaflet-marker-icon,.projectCard [data-o],.projectCard [data-p],#photoBtn,#addSlideImage'))schedule();
    });
    schedule();
  });
})();

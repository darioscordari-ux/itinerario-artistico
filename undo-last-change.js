(()=>{
  'use strict';
  const UNDO_KEY='itinerarioArtistico.undo.v1';
  const REOPEN_KEY='itinerarioArtistico.undoReopen.v1';
  const WATCHED=[
    'itinerarioArtistico.projects.v4',
    'itinerarioArtistico.customRoutes.v1',
    'itinerarioArtistico.richText.v1',
    'itinerarioArtistico.slideExtras.v1',
    'itinerarioArtistico.transportModes.v1'
  ];
  const nativeSet=Storage.prototype.setItem;
  const nativeRemove=Storage.prototype.removeItem;
  let restoring=false,locked=false,lockTimer=null;

  function currentContext(){
    return {
      title:document.getElementById('projectName')?.textContent?.trim()||'',
      presentation:document.body.classList.contains('presentation')
    };
  }
  function snapshot(){
    const values={};
    WATCHED.forEach(k=>{values[k]=localStorage.getItem(k)});
    return {values,context:currentContext(),created:Date.now()};
  }
  function capture(){
    if(restoring||locked)return;
    const snap=snapshot();
    nativeSet.call(localStorage,UNDO_KEY,JSON.stringify(snap));
    locked=true;
    clearTimeout(lockTimer);
    lockTimer=setTimeout(()=>{locked=false},180);
    updateButton();
  }

  Storage.prototype.setItem=function(key,value){
    if(this===localStorage&&WATCHED.includes(String(key))&&!restoring){
      const old=this.getItem(key);
      if(old!==String(value))capture();
    }
    return nativeSet.call(this,key,value);
  };
  Storage.prototype.removeItem=function(key){
    if(this===localStorage&&WATCHED.includes(String(key))&&!restoring&&this.getItem(key)!==null)capture();
    return nativeRemove.call(this,key);
  };

  function readUndo(){try{return JSON.parse(localStorage.getItem(UNDO_KEY)||'null')}catch{return null}}
  function updateButton(){
    const b=document.getElementById('undoLastBtn');
    if(b)b.disabled=!readUndo();
  }
  function ensureButton(){
    const edit=document.getElementById('editStopBtn');
    if(!edit||document.getElementById('undoLastBtn'))return;
    const b=document.createElement('button');
    b.id='undoLastBtn';b.type='button';b.className='btn';b.textContent='↶ Annulla';b.title='Annulla l’ultima modifica';
    edit.insertAdjacentElement('afterend',b);
    b.onclick=undo;
    updateButton();
  }
  function undo(){
    const snap=readUndo();if(!snap)return;
    if(!confirm('Annullare l’ultima modifica?'))return;
    restoring=true;
    try{
      WATCHED.forEach(k=>{
        const v=snap.values?.[k];
        if(v===null||typeof v==='undefined')nativeRemove.call(localStorage,k);
        else nativeSet.call(localStorage,k,v);
      });
      nativeRemove.call(localStorage,UNDO_KEY);
      sessionStorage.setItem(REOPEN_KEY,JSON.stringify(snap.context||{}));
    }finally{restoring=false}
    location.reload();
  }
  function reopen(){
    let c=null;try{c=JSON.parse(sessionStorage.getItem(REOPEN_KEY)||'null')}catch{}
    if(!c?.title)return;
    sessionStorage.removeItem(REOPEN_KEY);
    setTimeout(()=>{
      const cards=[...document.querySelectorAll('.projectCard')];
      const card=cards.find(x=>x.querySelector('h3')?.textContent?.trim()===c.title);
      const btn=card?.querySelector(c.presentation?'[data-p]':'[data-o]');
      btn?.click();
    },240);
  }

  window.addEventListener('load',()=>{ensureButton();reopen()});
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('.projectCard [data-o],.projectCard [data-p],#homeBtn,#backBtn'))setTimeout(ensureButton,80);
  });
  setTimeout(ensureButton,100);
})();
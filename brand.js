(()=>{
  'use strict';
  const APP_NAME='prof.arte.scordari';
  let scheduled=false;

  function applyBrand(){
    scheduled=false;
    if(document.title!==APP_NAME) document.title=APP_NAME;

    const brand=document.querySelector('.brand b');
    if(brand && brand.textContent!==APP_NAME) brand.textContent=APP_NAME;

    const mark=document.querySelector('.brandmark');
    if(mark && mark.textContent!=='PA') mark.textContent='PA';

    const libraryName=document.querySelector('#library .libraryTop small');
    if(libraryName && libraryName.textContent!==APP_NAME) libraryName.textContent=APP_NAME;
  }

  function scheduleBrand(){
    if(scheduled) return;
    scheduled=true;
    requestAnimationFrame(applyBrand);
  }

  window.addEventListener('DOMContentLoaded',scheduleBrand,{once:true});
  window.addEventListener('load',scheduleBrand,{once:true});
  new MutationObserver(scheduleBrand).observe(document.body,{childList:true,subtree:true});
})();

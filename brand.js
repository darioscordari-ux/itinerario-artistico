(()=>{
  'use strict';
  const APP_NAME='prof.arte.scordari';
  function applyBrand(){
    document.title=APP_NAME;
    const brand=document.querySelector('.brand b');
    if(brand && brand.textContent!==APP_NAME) brand.textContent=APP_NAME;
    const mark=document.querySelector('.brandmark');
    if(mark && mark.textContent!=='PA') mark.textContent='PA';
    const libraryName=document.querySelector('#library .libraryTop small');
    if(libraryName && libraryName.textContent!==APP_NAME) libraryName.textContent=APP_NAME;
  }
  window.addEventListener('DOMContentLoaded',applyBrand);
  window.addEventListener('load',applyBrand);
  new MutationObserver(applyBrand).observe(document.documentElement,{childList:true,subtree:true});
})();

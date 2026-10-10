(()=>{
  'use strict';

  const $=id=>document.getElementById(id);

  function improveDescriptionField(){
    const ta=$('eDesc');
    if(!ta)return;
    ta.rows=6;
    ta.placeholder='Scrivi qui il testo della tappa…';
    ta.style.width='100%';
    ta.style.minHeight='120px';
    ta.style.boxSizing='border-box';
    ta.style.resize='vertical';
    ta.style.touchAction='manipulation';
  }

  document.addEventListener('click',e=>{
    const poiResult=e.target?.closest?.('#poiResults .result');
    if(!poiResult)return;
    setTimeout(()=>{
      const editBtn=$('editStopBtn');
      if(editBtn)editBtn.click();
      setTimeout(improveDescriptionField,30);
    },120);
  });

  const modal=$('modal');
  if(modal){
    new MutationObserver(improveDescriptionField).observe(modal,{childList:true,subtree:true});
  }
})();

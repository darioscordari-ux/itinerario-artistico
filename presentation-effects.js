(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  let bypass=false,busy=false;

  function stepInfo(){
    const m=($('stepText')?.textContent||'').match(/(\d+)\s*\/\s*(\d+)/);
    return m?{current:Number(m[1]),total:Number(m[2])}:{current:1,total:1};
  }
  function canMove(btn){
    const s=stepInfo();
    return btn.id==='nextBtn'?s.current<s.total:s.current>1;
  }
  function clearClasses(slide){
    slide.classList.remove('iaSlideLeavingNext','iaSlideLeavingPrev','iaSlideArriveNext','iaSlideArrivePrev');
  }

  document.addEventListener('click',e=>{
    const btn=e.target?.closest?.('#nextBtn,#prevBtn');
    if(!btn||!document.body.classList.contains('presentation'))return;
    if(bypass){bypass=false;return}
    if(busy||!canMove(btn))return;

    e.preventDefault();
    e.stopImmediatePropagation();
    busy=true;
    const slide=$('slide');
    if(!slide){busy=false;return}
    const next=btn.id==='nextBtn';
    clearClasses(slide);
    slide.classList.add(next?'iaSlideLeavingNext':'iaSlideLeavingPrev');

    setTimeout(()=>{
      bypass=true;
      btn.click();
      requestAnimationFrame(()=>{
        clearClasses(slide);
        slide.classList.add(next?'iaSlideArriveNext':'iaSlideArrivePrev');
        setTimeout(()=>{clearClasses(slide);busy=false},430);
      });
    },155);
  },true);

  document.addEventListener('click',e=>{
    const marker=e.target?.closest?.('.leaflet-marker-icon');
    if(!marker||!document.body.classList.contains('presentation'))return;
    const slide=$('slide');if(!slide)return;
    setTimeout(()=>{
      clearClasses(slide);
      slide.classList.add('iaSlideArriveNext');
      setTimeout(()=>clearClasses(slide),430);
    },30);
  },true);
})();

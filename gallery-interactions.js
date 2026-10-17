(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  let applying=false;

  function prepare(){
    if(applying)return;
    const hero=$('slide')?.querySelector('.hero');
    if(!hero)return;
    const imgs=[...hero.querySelectorAll(':scope > img')];
    hero.classList.toggle('iaGalleryReady',imgs.length>1);
    imgs.forEach((img,i)=>{
      img.dataset.galleryIndex=String(i);
      img.tabIndex=imgs.length>1?0:-1;
      img.setAttribute('role',imgs.length>1?'button':'img');
      if(imgs.length>1)img.setAttribute('aria-label',i===0?'Immagine principale':'Mostra questa immagine');
    });
  }

  function swapWithMain(img){
    const hero=img.closest('.hero');if(!hero)return;
    const main=hero.querySelector(':scope > img');
    if(!main||main===img)return;
    applying=true;
    const src=main.src,alt=main.alt;
    main.src=img.src;main.alt=img.alt;
    img.src=src;img.alt=alt;
    main.animate?.([{opacity:.55,transform:'scale(.985)'},{opacity:1,transform:'scale(1)'}],{duration:260,easing:'ease-out'});
    applying=false;
  }

  document.addEventListener('click',e=>{
    const img=e.target?.closest?.('.hero.iaGalleryReady > img');
    if(img&&img!==img.parentElement.querySelector(':scope > img'))swapWithMain(img);
  });
  document.addEventListener('keydown',e=>{
    if(e.key!=='Enter'&&e.key!==' ')return;
    const img=e.target?.closest?.('.hero.iaGalleryReady > img');
    if(!img)return;
    e.preventDefault();swapWithMain(img);
  });
  const slide=$('slide');if(slide)new MutationObserver(()=>setTimeout(prepare,70)).observe(slide,{childList:true,subtree:true});
  window.addEventListener('load',()=>setTimeout(prepare,100));
})();

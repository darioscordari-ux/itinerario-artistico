(()=>{
'use strict';
const slide=document.getElementById('slide');
if(!slide)return;
const classes=['iaAutoPhoto','iaAutoBalanced','iaAutoReading','iaAutoGallery','iaAutoCompact'];
let queued=false;
function apply(){
 queued=false;
 slide.classList.remove(...classes);
 if(!document.body.classList.contains('presentation'))return;
 const hero=slide.querySelector(':scope > .hero');
 const desc=slide.querySelector(':scope > .desc');
 if(!hero||!desc)return;
 const words=(desc.textContent||'').trim().split(/\s+/).filter(Boolean).length;
 const images=hero.querySelectorAll('img').length;
 const gallery=images>1||hero.matches('.gallery2,.gallery3,.gallery4');
 const hasVideo=!!slide.querySelector('.slideVideoWrap');
 const width=slide.getBoundingClientRect().width;
 let layout=gallery?'iaAutoGallery':words>=105||hasVideo?'iaAutoReading':words>=48?'iaAutoBalanced':'iaAutoPhoto';
 slide.classList.add(layout);
 if(width<540)slide.classList.add('iaAutoCompact');
 slide.dataset.autoLayout=layout;
}
function schedule(){
 if(queued)return;
 queued=true;requestAnimationFrame(apply);
}
const mo=new MutationObserver(schedule);
mo.observe(slide,{childList:true,subtree:true,characterData:true});
const body=new MutationObserver(schedule);
body.observe(document.body,{attributes:true,attributeFilter:['class']});
if(window.ResizeObserver)new ResizeObserver(schedule).observe(slide);
window.addEventListener('resize',schedule);
schedule();
})();
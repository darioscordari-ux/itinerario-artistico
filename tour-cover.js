(()=>{
'use strict';
const STORE='itinerarioArtistico.projects.v4';
const $=id=>document.getElementById(id);
let showing=false, suppress=false;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const projects=()=>{try{return JSON.parse(localStorage.getItem(STORE)||'[]')}catch{return[]}};
function currentProject(){
  const name=$('projectName')?.textContent?.trim();
  if(!name)return null;
  return projects().filter(p=>p?.title===name).sort((a,b)=>(b.updated||0)-(a.updated||0))[0]||null;
}
function closeCover(){
  showing=false;
  document.body.classList.remove('iaShowCover');
  const cover=$('iaTourCover');
  if(!cover)return;
  cover.classList.add('iaCoverClosing');
  setTimeout(()=>cover.remove(),420);
  setTimeout(()=>{try{window.__IA_MAP?.invalidateSize({pan:false})}catch{}},420);
}
function showCover(){
  if(showing||$('iaTourCover')||!document.body.classList.contains('presentation'))return;
  const p=currentProject();
  if(!p)return;
  const cover=document.createElement('section');
  cover.id='iaTourCover';
  cover.className='iaTourCover';
  cover.setAttribute('role','dialog');
  cover.setAttribute('aria-modal','true');
  cover.setAttribute('aria-label','Copertina dell’itinerario');
  const image=p.coverImage||p.stops?.find(s=>s?.image)?.image||'';
  const city=p.city?.name||p.stops?.[0]?.place||'';
  const count=Array.isArray(p.stops)?p.stops.length:0;
  cover.innerHTML=
    '<div class="iaCoverPhoto">'+(image?'<img src="'+esc(image)+'" alt="Immagine dell’itinerario">':'<div class="iaCoverFallback" aria-hidden="true">✧</div>')+
    '<div class="iaCoverPhotoShade"></div><div class="iaCoverSeal">GUIDA<br>ARTISTICA</div></div>'+
    '<div class="iaCoverContent">'+
      '<div class="iaCoverTopline"><span>ITINERARIO ARTISTICO</span><span>EDIZIONE DIGITALE</span></div>'+
      '<p class="iaCoverKicker">'+esc(p.coverSubtitle||'ALLA SCOPERTA DEL TERRITORIO')+'</p>'+
      '<h1>'+esc(p.coverTitle||p.title||'Itinerario artistico')+'</h1>'+
      ((p.coverDescription||p.desc)?'<p class="iaCoverDesc">'+esc(p.coverDescription||p.desc)+'</p>':'')+
      '<div class="iaCoverFacts">'+
        (city?'<span>⌖ '+esc(city)+'</span>':'')+
        '<span>◈ '+count+' '+(count===1?'tappa':'tappe')+'</span>'+
      '</div>'+
      ((p.authors?.length||p.schoolClass)?'<div class="iaCoverAuthors">'+(p.authors?.length?'<strong>REALIZZATO DA</strong> '+esc(p.authors.join(' · ')):'')+(p.schoolClass?'<span>CLASSE '+esc(p.schoolClass)+'</span>':'')+'</div>':'')+
      '<div class="iaCoverActions"><button type="button" id="iaCoverStart">Inizia il percorso <span aria-hidden="true">→</span></button>'+
      '<button type="button" id="iaCoverExit">Torna alla modifica</button></div>'+
      (p.coverCredit?'<p class="credit">Foto: '+esc(p.coverCredit)+(p.coverSource?' · <a href="'+esc(p.coverSource)+'" target="_blank" rel="noopener">fonte</a>':'')+'</p>':'')+
      '<div class="iaCoverBottom">UN VIAGGIO TRA ARTE, LUOGHI E STORIE <span>01 — INTRODUZIONE</span></div>'+
    '</div>';
  document.body.appendChild(cover);
  showing=true;
  document.body.classList.add('iaShowCover');
  $('iaCoverStart').addEventListener('click',closeCover);
  $('iaCoverExit').addEventListener('click',()=>{
    closeCover();
    document.body.classList.remove('presentation');
    setTimeout(()=>{try{window.__IA_MAP?.invalidateSize({pan:false})}catch{}},500);
  });
  $('iaCoverStart').focus({preventScroll:true});
}
let prev=document.body.classList.contains('presentation');
const observer=new MutationObserver(()=>{
  const now=document.body.classList.contains('presentation');
  if(now&&!prev && !suppress)requestAnimationFrame(showCover);
  if(!now&&prev){showing=false;document.body.classList.remove('iaShowCover');$('iaTourCover')?.remove();}
  prev=now;
});
observer.observe(document.body,{attributes:true,attributeFilter:['class']});
document.addEventListener('keydown',e=>{
  if(!showing)return;
  if(e.key==='Escape'){
    e.preventDefault();e.stopImmediatePropagation();
    $('iaCoverExit')?.click();
  }else if(e.key==='Enter' && e.target===document.body){
    e.preventDefault();e.stopImmediatePropagation();closeCover();
  }else if(e.key==='ArrowRight'||e.key==='ArrowLeft'){
    e.preventDefault();e.stopImmediatePropagation();
  }
},true);
})();
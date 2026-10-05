(()=>{
  'use strict';

  const PROJECT_STORE='itinerarioArtistico.projects.v4';
  const EXTRA_STORE='itinerarioArtistico.slideExtras.v1';
  let applying=false, timer=null, forceNext=false;
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function loadExtras(){try{return JSON.parse(localStorage.getItem(EXTRA_STORE)||'{}')}catch{return{}}}
  function saveExtras(v){localStorage.setItem(EXTRA_STORE,JSON.stringify(v))}
  function currentProject(){
    const title=$('projectName')?.textContent?.trim();
    if(!title)return null;
    try{
      const ps=JSON.parse(localStorage.getItem(PROJECT_STORE)||'[]');
      return ps.find(p=>p.title===title)||null;
    }catch{return null}
  }
  function currentIndex(){
    const m=($('stepText')?.textContent||'').match(/(\d+)\s*\/\s*(\d+)/);
    return m?Math.max(0,Number(m[1])-1):0;
  }
  function getExtra(create=false){
    const p=currentProject(); if(!p)return null;
    const idx=String(currentIndex()), store=loadExtras();
    if(create){store[p.id]=store[p.id]||{};store[p.id][idx]=store[p.id][idx]||{images:[],video:'',textMode:'paragraph',bullets:[]};return {store,data:store[p.id][idx],pid:p.id,idx};}
    return store?.[p.id]?.[idx]||null;
  }
  function mutate(fn){const x=getExtra(true);if(!x)return;fn(x.data);saveExtras(x.store);schedule(true)}

  function schedule(force=false){if(force)forceNext=true;clearTimeout(timer);timer=setTimeout(apply,50)}
  function closeModal(){const b=$('modalBack');if(b){b.classList.add('hidden');b.classList.remove('slideToolsModal')}if($('modal'))$('modal').innerHTML=''}
  function openModal(html){const b=$('modalBack'),m=$('modal');if(!b||!m)return;m.innerHTML=html;b.classList.add('slideToolsModal');b.classList.remove('hidden')}

  function youtubeEmbed(url){
    try{
      const u=new URL(url);
      let id='';
      if(u.hostname.includes('youtu.be'))id=u.pathname.split('/').filter(Boolean)[0]||'';
      else if(u.hostname.includes('youtube.com'))id=u.searchParams.get('v')||u.pathname.split('/').filter(Boolean).pop()||'';
      return id?`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`:'';
    }catch{return''}
  }
  function videoHtml(url){
    if(!url)return'';
    const yt=youtubeEmbed(url);
    if(yt)return `<div class="slideVideoWrap"><iframe src="${esc(yt)}" title="Video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
    if(/\.(mp4|webm|ogg)(\?|#|$)/i.test(url))return `<div class="slideVideoWrap"><video src="${esc(url)}" controls preload="metadata"></video></div>`;
    return `<div class="slideVideoLink"><a class="btn" href="${esc(url)}" target="_blank" rel="noopener">🎬 Apri video</a></div>`;
  }

  function imageData(file){
    return new Promise((resolve,reject)=>{
      const r=new FileReader();
      r.onerror=reject;
      r.onload=()=>{
        const im=new Image();
        im.onerror=()=>resolve(r.result);
        im.onload=()=>{
          try{
            const max=1400, scale=Math.min(1,max/Math.max(im.width,im.height));
            const c=document.createElement('canvas');c.width=Math.round(im.width*scale);c.height=Math.round(im.height*scale);
            c.getContext('2d').drawImage(im,0,0,c.width,c.height);
            resolve(c.toDataURL('image/jpeg',.82));
          }catch{resolve(r.result)}
        };
        im.src=r.result;
      };
      r.readAsDataURL(file);
    })
  }

  async function addImages(){
    const hero=$('slide')?.querySelector('.hero');
    if(!hero?.querySelector('img')){$('photoBtn')?.click();return}
    const input=document.createElement('input');input.type='file';input.accept='image/*';input.multiple=true;input.style.display='none';document.body.appendChild(input);
    input.onchange=async()=>{
      const files=[...input.files].slice(0,3);
      if(!files.length){input.remove();return}
      const imgs=[];
      for(const f of files)imgs.push(await imageData(f));
      mutate(d=>{d.images=Array.isArray(d.images)?d.images:[];d.images.push(...imgs);d.images=d.images.slice(0,3)});
      input.remove();
    };
    input.click();
  }

  function editVideo(){
    const d=getExtra(false)||{};
    openModal(`<h2>Video nella slide</h2><div class="field"><label>Link video</label><input id="slideVideoUrl" value="${esc(d.video||'')}" placeholder="YouTube oppure link diretto .mp4"></div><div class="note">Il video resta dentro la stessa slide. Per YouTube incolla semplicemente il link del video.</div><div class="modalFoot"><button class="btn" id="slideVideoRemove">Rimuovi video</button><button class="btn" id="slideVideoCancel">Annulla</button><button class="btn primary" id="slideVideoSave">Salva</button></div>`);
    $('slideVideoCancel').onclick=closeModal;
    $('slideVideoRemove').onclick=()=>{mutate(x=>x.video='');closeModal()};
    $('slideVideoSave').onclick=()=>{const v=$('slideVideoUrl').value.trim();mutate(x=>x.video=v);closeModal()};
  }

  function defaultBullets(){
    const txt=$('slide')?.querySelector('.desc')?.textContent?.trim()||'';
    if(!txt)return[];
    const byLine=txt.split(/\n+/).map(x=>x.trim()).filter(Boolean);
    if(byLine.length>1)return byLine;
    return txt.split(/(?<=[.!?;])\s+/).map(x=>x.trim()).filter(Boolean).slice(0,7);
  }
  function editText(){
    const d=getExtra(false)||{}, bullets=(Array.isArray(d.bullets)&&d.bullets.length?d.bullets:defaultBullets());
    openModal(`<h2>Testo della slide</h2><div class="field"><label>Modalità</label><select id="slideTextMode"><option value="paragraph" ${d.textMode!=='bullets'?'selected':''}>Testo continuo</option><option value="bullets" ${d.textMode==='bullets'?'selected':''}>Punti chiave</option></select></div><div class="field"><label>Punti chiave — uno per riga</label><textarea id="slideBullets" style="min-height:170px">${esc(bullets.join('\n'))}</textarea></div><div class="note">In modalità “Punti chiave” la descrizione originale non viene cancellata: cambia solo il modo in cui viene mostrata nella slide.</div><div class="modalFoot"><button class="btn" id="slideTextCancel">Annulla</button><button class="btn primary" id="slideTextSave">Salva</button></div>`);
    $('slideTextCancel').onclick=closeModal;
    $('slideTextSave').onclick=()=>{const mode=$('slideTextMode').value,lines=$('slideBullets').value.split(/\n+/).map(x=>x.trim()).filter(Boolean);mutate(x=>{x.textMode=mode;x.bullets=lines});closeModal()};
  }

  function manageMedia(){
    const d=getExtra(false)||{}, imgs=Array.isArray(d.images)?d.images:[];
    const rows=imgs.length?imgs.map((src,i)=>`<div style="display:grid;grid-template-columns:72px 1fr auto;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid #e5dfd6"><img src="${src}" alt="" style="width:72px;height:52px;object-fit:cover;border-radius:7px"><span>Immagine aggiuntiva ${i+1}</span><button class="btn red" data-remove-extra="${i}">Elimina</button></div>`).join(''):'<div class="note">Nessuna immagine aggiuntiva.</div>';
    openModal(`<h2>Contenuti aggiuntivi</h2>${rows}<div class="modalFoot"><button class="btn" id="slideRemoveVideo" ${d.video?'':'disabled'}>Rimuovi video</button><button class="btn" id="slideMediaClose">Chiudi</button></div>`);
    $('slideMediaClose').onclick=closeModal;
    document.querySelectorAll('[data-remove-extra]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.removeExtra);mutate(x=>{x.images=Array.isArray(x.images)?x.images:[];x.images.splice(i,1)});closeModal()});
    $('slideRemoveVideo').onclick=()=>{mutate(x=>x.video='');closeModal()};
  }

  function apply(){
    if(applying)return;
    const slide=$('slide');if(!slide||$('app')?.classList.contains('hidden'))return;
    const hero=slide.querySelector('.hero');const actions=slide.querySelector('.photoActions');if(!hero||!actions)return;
    const force=forceNext;forceNext=false;
    if(actions.dataset.slideToolsApplied==='1'&&!force)return;
    applying=true;
    try{
      const d=getExtra(false)||{};
      const extras=Array.isArray(d.images)?d.images.slice(0,3):[];
      hero.querySelectorAll('.extraSlideImage').forEach(x=>x.remove());
      hero.classList.remove('gallery2','gallery3','gallery4');
      const primary=hero.querySelector('img:not(.extraSlideImage)');
      if(!primary&&extras.length)hero.querySelector('.placeholder')?.remove();
      if(extras.length){
        extras.forEach(src=>{const im=document.createElement('img');im.className='extraSlideImage';im.src=src;im.alt='';hero.appendChild(im)});
        const total=(primary?1:0)+extras.length;if(total>1)hero.classList.add('gallery'+Math.min(4,total));
      }
      slide.querySelectorAll('.slideVideoWrap,.slideVideoLink').forEach(x=>x.remove());
      if(d.video){const box=document.createElement('div');box.innerHTML=videoHtml(d.video);const node=box.firstElementChild;if(node)actions.insertAdjacentElement('afterend',node)}
      const desc=slide.querySelector('.desc');
      if(desc&&d.textMode==='bullets'&&Array.isArray(d.bullets)&&d.bullets.length){desc.innerHTML=`<ul class="descBullets">${d.bullets.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`}
      if(!actions.querySelector('#addSlideImage')){
        actions.insertAdjacentHTML('beforeend',' <button class="btn" id="addSlideImage">＋ Altra immagine</button> <button class="btn" id="slideVideoBtn">🎬 Video</button> <button class="btn" id="slideTextBtn">☷ Testo</button> <button class="btn" id="slideMediaBtn">⋯ Media</button>');
        $('addSlideImage').onclick=addImages;$('slideVideoBtn').onclick=editVideo;$('slideTextBtn').onclick=editText;$('slideMediaBtn').onclick=manageMedia;
      }
      actions.dataset.slideToolsApplied='1';
    }finally{applying=false}
  }

  const observer=new MutationObserver(()=>schedule());
  window.addEventListener('load',()=>{
    const slide=$('slide');if(slide)observer.observe(slide,{childList:true,subtree:true});
    document.addEventListener('click',e=>{if(e.target?.closest?.('#nextBtn,#prevBtn,.leaflet-marker-icon,.projectCard [data-o],.projectCard [data-p]'))schedule()});
    schedule();
  });
})();
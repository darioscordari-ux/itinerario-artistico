(()=>{
  'use strict';
  const STORE='itinerarioArtistico.projects.v4';
  let activeProjectId=null;

  function getProjects(){try{return JSON.parse(localStorage.getItem(STORE)||'[]')}catch{return []}}
  function saveProjects(p){localStorage.setItem(STORE,JSON.stringify(p))}
  function currentTitle(){return document.getElementById('projectName')?.textContent?.trim()||''}
  function currentProject(){
    const ps=getProjects();
    if(activeProjectId){const p=ps.find(x=>x.id===activeProjectId);if(p)return p}
    return ps.filter(p=>p.title===currentTitle()).sort((a,b)=>(b.updated||0)-(a.updated||0))[0]||null;
  }
  function updateCurrent(mutator){
    const ps=getProjects();
    let i=activeProjectId?ps.findIndex(x=>x.id===activeProjectId):-1;
    if(i<0)i=ps.findIndex(x=>x.title===currentTitle());
    if(i<0)return null;
    mutator(ps[i]);ps[i].updated=Date.now();saveProjects(ps);activeProjectId=ps[i].id;return ps[i];
  }
  function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
  function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function openModal(html){const b=document.getElementById('modalBack'),m=document.getElementById('modal');if(!b||!m)return;m.innerHTML=html;b.classList.remove('hidden')}
  function closeModal(){document.getElementById('modalBack')?.classList.add('hidden')}

  function ensureButtons(){
    const present=document.getElementById('presentBtn');
    if(!present)return;
    if(!document.getElementById('coverBtn')){
      const b=document.createElement('button');b.id='coverBtn';b.className='btn';b.textContent='▣ Copertina';b.onclick=openCoverEditor;present.before(b);
    }
    if(!document.getElementById('orderStopsBtn')){
      const b=document.createElement('button');b.id='orderStopsBtn';b.className='btn';b.textContent='⇅ Ordina tappe';b.onclick=openOrder;present.before(b);
    }
    if(!document.getElementById('qrBtn')){
      const b=document.createElement('button');b.id='qrBtn';b.className='btn';b.textContent='▦ QR';b.onclick=openQr;present.after(b);
    }
    if(!document.getElementById('fullscreenBtn')){
      const b=document.createElement('button');b.id='fullscreenBtn';b.className='btn';b.textContent='⛶ Schermo intero';b.onclick=toggleFullscreen;present.after(b);
    }
  }

  function openCoverEditor(){
    const p=currentProject();if(!p)return;
    const c=p.cover||{};
    openModal(`<h2>Copertina</h2>
      <div class="field"><label>Sottotitolo</label><input id="cvSubtitle" value="${esc(c.subtitle||'')}"></div>
      <div class="row"><div class="field"><label>Autore/i</label><input id="cvAuthors" value="${esc(c.authors||'')}"></div><div class="field"><label>Classe</label><input id="cvClass" value="${esc(c.className||'')}"></div></div>
      <div class="field"><label>Data / anno scolastico</label><input id="cvDate" value="${esc(c.date||'')}"></div>
      <div class="field"><label>Immagine di copertina</label><input id="cvImage" type="file" accept="image/*"></div>
      ${c.image?`<div class="note">È già presente un'immagine di copertina.</div>`:''}
      <div class="modalFoot"><button id="cvCancel" class="btn">Annulla</button><button id="cvSave" class="btn primary">Salva copertina</button></div>`);
    document.getElementById('cvCancel').onclick=closeModal;
    document.getElementById('cvSave').onclick=async()=>{
      let img=c.image||'';const f=document.getElementById('cvImage').files?.[0];if(f)img=await fileData(f);
      updateCurrent(p=>p.cover={subtitle:document.getElementById('cvSubtitle').value.trim(),authors:document.getElementById('cvAuthors').value.trim(),className:document.getElementById('cvClass').value.trim(),date:document.getElementById('cvDate').value.trim(),image:img});
      closeModal();
    };
  }
  function fileData(f){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f)})}

  function resetToFirst(){
    let guard=20;
    const t=setInterval(()=>{
      const s=document.getElementById('stepText')?.textContent||'';
      if(/^1\s*\//.test(s)||guard--<=0){clearInterval(t);return}
      document.getElementById('prevBtn')?.click();
    },35);
  }

  function showCover(){
    const p=currentProject();if(!p)return;
    document.getElementById('coverOverlay')?.remove();
    const c=p.cover||{};const img=c.image||p.stops?.find(s=>s.image)?.image||'';
    const el=document.createElement('div');el.id='coverOverlay';el.innerHTML=`<div class="coverSheet">${img?`<div class="coverVisual"><img src="${esc(img)}" alt=""></div>`:''}<div class="coverText"><div class="eyebrow">Itinerario artistico</div><h1>${esc(p.title||'Itinerario')}</h1>${c.subtitle?`<p class="coverSubtitle">${esc(c.subtitle)}</p>`:''}<div class="coverMeta">${[c.authors&&`Realizzato da ${c.authors}`,c.className&&`Classe ${c.className}`,c.date].filter(Boolean).map(esc).join(' · ')}</div><button id="coverStart" class="btn primary">Inizia →</button></div></div>`;
    document.body.appendChild(el);
    document.getElementById('coverStart').onclick=()=>el.remove();
  }

  function openOrder(){
    const p=currentProject();if(!p||!p.stops?.length)return;
    const rows=p.stops.map((s,i)=>`<div class="orderRow" data-i="${i}"><span class="orderNo">${i+1}</span><b>${esc(s.title||'Tappa')}</b><span class="orderBtns"><button class="btn" data-up="${i}">↑</button><button class="btn" data-down="${i}">↓</button></span></div>`).join('');
    openModal(`<h2>Ordina tappe</h2><p class="note">Sposta le tappe con le frecce. Il percorso verrà ricalcolato automaticamente.</p><div id="orderList">${rows}</div><div class="modalFoot"><button id="orderClose" class="btn">Annulla</button><button id="orderSave" class="btn primary">Salva ordine</button></div>`);
    let order=p.stops.map((_,i)=>i);
    function render(){
      const list=document.getElementById('orderList');list.innerHTML=order.map((orig,pos)=>`<div class="orderRow"><span class="orderNo">${pos+1}</span><b>${esc(p.stops[orig].title||'Tappa')}</b><span class="orderBtns"><button class="btn" data-posup="${pos}" ${pos===0?'disabled':''}>↑</button><button class="btn" data-posdown="${pos}" ${pos===order.length-1?'disabled':''}>↓</button></span></div>`).join('');
      list.querySelectorAll('[data-posup]').forEach(b=>b.onclick=()=>{const i=+b.dataset.posup;[order[i-1],order[i]]=[order[i],order[i-1]];render()});
      list.querySelectorAll('[data-posdown]').forEach(b=>b.onclick=()=>{const i=+b.dataset.posdown;[order[i+1],order[i]]=[order[i],order[i+1]];render()});
    }
    render();document.getElementById('orderClose').onclick=closeModal;document.getElementById('orderSave').onclick=()=>{
      const id=p.id;updateCurrent(x=>x.stops=order.map(i=>x.stops[i]));sessionStorage.setItem('iaReopen',id);location.reload();
    };
  }

  async function toggleFullscreen(){
    try{
      if(!document.fullscreenElement){document.getElementById('presentBtn')?.click();await document.documentElement.requestFullscreen?.();try{await screen.orientation?.lock?.('landscape')}catch{}}
      else await document.exitFullscreen?.();
    }catch{document.getElementById('presentBtn')?.click()}
  }

  function presentationLink(){
    const p=currentProject();if(!p||!window.LZString)return {error:'QR non disponibile.'};
    const clone=JSON.parse(JSON.stringify(p));delete clone.id;clone.readOnly=true;clone.presentationOnly=true;
    const payload={type:'itinerario-artistico-presentation-link',version:1,project:clone};
    const packed=LZString.compressToEncodedURIComponent(JSON.stringify(payload));
    const base=location.origin+location.pathname;
    const url=base+'#p='+packed;
    if(url.length>2800)return {error:'Questo itinerario è troppo grande per essere inserito in un QR. Usa “Condividi → Condividi presentazione”.'};
    return {url};
  }

  function openQr(){
    const out=presentationLink();
    if(out.error){openModal(`<h2>QR presentazione</h2><div class="note">${esc(out.error)}</div><div class="modalFoot"><button id="qrClose" class="btn">Chiudi</button></div>`);document.getElementById('qrClose').onclick=closeModal;return}
    openModal(`<h2>QR presentazione</h2><p class="note">Chi lo scansiona apre direttamente una copia in sola lettura dell'itinerario.</p><div id="qrBox" style="display:grid;place-items:center;padding:18px"></div><div class="modalFoot"><button id="copyQrLink" class="btn">Copia link</button><button id="qrClose" class="btn primary">Chiudi</button></div>`);
    try{new QRCode(document.getElementById('qrBox'),{text:out.url,width:240,height:240,correctLevel:QRCode.CorrectLevel.L})}catch{document.getElementById('qrBox').textContent='Impossibile generare il QR.'}
    document.getElementById('copyQrLink').onclick=async()=>{try{await navigator.clipboard.writeText(out.url);document.getElementById('copyQrLink').textContent='Copiato ✓'}catch{}};
    document.getElementById('qrClose').onclick=closeModal;
  }

  function importFromHash(){
    if(!location.hash.startsWith('#p=')||!window.LZString)return false;
    try{
      const obj=JSON.parse(LZString.decompressFromEncodedURIComponent(location.hash.slice(3))||'');
      const p=obj.project;if(!p||!Array.isArray(p.stops))throw 0;
      p.id=uid();p.readOnly=true;p.presentationOnly=true;p.created=Date.now();p.updated=Date.now();p.title=(p.title||'Itinerario')+' · presentazione QR';
      const ps=getProjects();ps.push(p);saveProjects(ps);sessionStorage.setItem('iaReopen',p.id);history.replaceState(null,'',location.origin+location.pathname+location.search);location.reload();return true;
    }catch{return false}
  }

  function autoReopen(){
    const id=sessionStorage.getItem('iaReopen');if(!id)return;
    let tries=50;const t=setInterval(()=>{
      const card=[...document.querySelectorAll('.projectCard')].find(c=>c.dataset.projectId===id);
      if(card){clearInterval(t);sessionStorage.removeItem('iaReopen');card.querySelector('[data-o]')?.click()}
      else if(--tries<=0){clearInterval(t);sessionStorage.removeItem('iaReopen')}
    },100);
  }

  document.addEventListener('click',e=>{
    const card=e.target?.closest?.('.projectCard');
    if(card&&(e.target.matches('[data-o]')||e.target.matches('[data-p]')))activeProjectId=card.dataset.projectId||null;
    if(e.target?.id==='presentBtn'){resetToFirst();setTimeout(showCover,120)}
    if(e.target?.id==='homeBtn'){activeProjectId=null;document.getElementById('coverOverlay')?.remove()}
  },true);

  const css=document.createElement('style');css.textContent=`
    body.readonly-mode #coverBtn,body.readonly-mode #orderStopsBtn{display:none!important}
    body.presentation #fullscreenBtn{display:inline-flex!important}
    #coverOverlay{position:fixed;inset:0;z-index:4500;background:#151411;display:grid;place-items:center;padding:28px}
    .coverSheet{width:min(1050px,96vw);height:min(650px,90vh);background:#fffdf8;border-radius:24px;overflow:hidden;display:grid;grid-template-columns:1.15fr 1fr;box-shadow:0 24px 80px #0008}
    .coverVisual{min-height:0}.coverVisual img{width:100%;height:100%;object-fit:cover}.coverText{padding:50px;display:flex;flex-direction:column;justify-content:center}.coverText h1{font:500 52px/1.02 Georgia,serif;margin:10px 0 14px}.coverSubtitle{font:24px/1.3 Georgia,serif;color:#5d554c}.coverMeta{margin:18px 0 28px;color:#706c64}.coverText .btn{align-self:flex-start;padding:12px 18px}.orderRow{display:grid;grid-template-columns:34px 1fr auto;gap:10px;align-items:center;padding:9px;border-bottom:1px solid #ddd}.orderNo{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:#1f211e;color:#fff;font-weight:800}.orderBtns{display:flex;gap:5px}
    @media(max-width:700px){.coverSheet{grid-template-columns:1fr;grid-template-rows:42% 58%}.coverText{padding:24px}.coverText h1{font-size:34px}.coverSubtitle{font-size:18px}}
  `;document.head.appendChild(css);

  const obs=new MutationObserver(()=>ensureButtons());obs.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('load',()=>{if(importFromHash())return;ensureButtons();autoReopen()});
})();

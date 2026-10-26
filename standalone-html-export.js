(()=>{
'use strict';
const KEY='itinerarioArtistico.projects.v4',EXTRA='itinerarioArtistico.slideExtras.v1';
function current(){const t=document.getElementById('projectName')?.textContent?.trim();try{return JSON.parse(localStorage.getItem(KEY)||'[]').filter(x=>x.title===t).sort((a,b)=>(b.updated||0)-(a.updated||0))[0]}catch{return null}}
function pack(p){const c=JSON.parse(JSON.stringify(p));try{const e=JSON.parse(localStorage.getItem(EXTRA)||'{}');c._slideExtras=e[p.id]||p._slideExtras||{}}catch{}return c}
function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function build(p){
 const payload={version:2,mode:'presentation',project:p};
 const data=JSON.stringify(payload);
 const bytes=new TextEncoder().encode(data);
 let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
 const encoded=btoa(binary).split('+').join('-').split('/').join('_').replace(/=+$/,'');
 const appUrl='https://darioscordari-ux.github.io/itinerario-artistico/#share='+encoded;
 const safeTitle=escapeHtml(p.title||'Itinerario');
 return '<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+safeTitle+'</title>'+
 '<style>*{box-sizing:border-box}html,body{height:100%;width:100%;margin:0;background:#171614}iframe{width:100%;height:100%;border:0;display:block}noscript{color:white;font-family:system-ui}</style></head><body>'+
 '<iframe title="Itinerario Artistico – presentazione originale" src="'+appUrl+'" allow="fullscreen" allowfullscreen referrerpolicy="no-referrer"></iframe>'+
 '<noscript>Per aprire la presentazione abilita JavaScript nel browser.</noscript></body></html>';
}
async function exportHtml(p){
 const name=(p.title||'itinerario').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase()+'-presentazione.html';
 const file=new File([build(pack(p))],name,{type:'text/html'});
 try{if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({title:p.title||'Itinerario',text:'Apri la presentazione HTML con un browser.',files:[file]});return}}catch(e){if(e?.name==='AbortError')return;console.warn(e)}
 const u=URL.createObjectURL(file),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(u)},2000);
}
function setup(){const base=document.getElementById('exportBtn');if(!base||document.getElementById('shareHtmlStandalone'))return;const b=document.createElement('button');b.id='shareHtmlStandalone';b.type='button';b.className='btn primary';b.textContent='📄 Condividi file HTML';b.title='Esporta un file HTML autonomo per WhatsApp';(document.getElementById('shareExportBtn')||base).after(b)}
document.addEventListener('click',e=>{if(e.target.closest('#settingsBtn'))setTimeout(setup,20);if(!e.target.closest('#shareHtmlStandalone'))return;e.preventDefault();e.stopImmediatePropagation();const p=current();if(!p)return alert('Apri prima un itinerario.');exportHtml(p).catch(x=>alert('Esportazione non riuscita: '+x.message))},true);
window.__IA_EXPORT_HTML=exportHtml;
})();
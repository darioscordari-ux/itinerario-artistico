(()=>{
'use strict';
const KEY='itinerarioArtistico.projects.v4',EXTRA='itinerarioArtistico.slideExtras.v1';
function current(){const t=document.getElementById('projectName')?.textContent?.trim();try{return JSON.parse(localStorage.getItem(KEY)||'[]').filter(x=>x.title===t).sort((a,b)=>(b.updated||0)-(a.updated||0))[0]}catch{return null}}
function pack(p){const c=JSON.parse(JSON.stringify(p));try{const e=JSON.parse(localStorage.getItem(EXTRA)||'{}');c._slideExtras=e[p.id]||p._slideExtras||{}}catch{}return c}
function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function build(p){
 const origin='https://darioscordari-ux.github.io/itinerario-artistico/';
 const get=async path=>{const response=await fetch(new URL(path,origin),{cache:'no-store'});if(!response.ok)throw Error('Download risorsa: '+path);return response.text()};
 let page=await get('index.html');
 const scriptPattern=/<script src="\.\/([^"?]+\.js)(?:\?[^"]*)?"><\/script>/g;
 const cssPattern=/<link rel="stylesheet" href="\.\/([^"?]+\.css)(?:\?[^"]*)?">/g;
 const scripts=[...page.matchAll(scriptPattern)].map(x=>x[1]);
 const styles=[...page.matchAll(cssPattern)].map(x=>x[1]);
 const resources={};
 await Promise.all([...new Set([...scripts,...styles])].map(async name=>{resources[name]=await get(name)}));
 page=page.replace(cssPattern,(m,name)=>'<style>'+resources[name].replace(/<\/style/gi,'<\\/style')+'</style>');
 // Embed every original script except sharing/export/install and old shared link handling.
 const skip=new Set(['standalone-html-export.js','share-link-ui.js','share-link-preload.js','export-share.js','pwa-install.js']);
 page=page.replace(scriptPattern,(m,name)=>skip.has(name)?'':'<script>'+resources[name].replace(/<\/script/gi,'<\\/script')+'</script>');
 const id='ia-html-export';
 const stores={};
 stores['itinerarioArtistico.projects.v4']=JSON.stringify([{...p,id,sharedPresentation:true,sharedCopy:true}]);
 stores['itinerarioArtistico.slideExtras.v1']=JSON.stringify({[id]:p._slideExtras||{}});
 stores['itinerarioArtistico.richText.v1']=JSON.stringify({[id]:p._richText||{}});
 stores['itinerarioArtistico.transportModes.v1']=JSON.stringify({[id]:p._transportModes||{}});
 const json=JSON.stringify(stores).replace(/</g,'\\u003c');
 const seed='(function(){const records='+json+';try{for(const k in records)localStorage.setItem(k,records[k])}catch(e){const mem={...records};const storage={getItem:k=>mem[k]??null,setItem:(k,v)=>{mem[k]=String(v)},removeItem:k=>{delete mem[k]},clear:()=>{},key:n=>Object.keys(mem)[n]??null,get length(){return Object.keys(mem).length}};try{Object.defineProperty(window,"localStorage",{value:storage,configurable:true})}catch(x){console.error(x)}}})();';
 const starter='(function(){window.addEventListener("load",function(){const open=()=>{const btn=document.querySelector(".projectCard [data-o]");if(!btn)return setTimeout(open,80);btn.click();setTimeout(()=>{const present=document.getElementById("presentBtn");if(present&&!document.body.classList.contains("presentation"))present.click();window.__IA_SHOW_COVER?.()},280)};setTimeout(open,100)})})();';
 const pfx='<base href="'+origin+'"><script>'+seed+'</script>';
 page=page.replace('<head>','<head>'+pfx).replace('</body>','<script>'+starter+'</script></body>');
 page=page.replace(/<link rel="manifest"[^>]*>/,'');
 return page;
}
async function exportHtml(p){
 const name=(p.title||'itinerario').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase()+'-presentazione.html';
 const file=new File([await build(pack(p))],name,{type:'text/html'});
 try{if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({title:p.title||'Itinerario',text:'Apri la presentazione HTML con un browser.',files:[file]});return}}catch(e){if(e?.name==='AbortError')return;console.warn(e)}
 const u=URL.createObjectURL(file),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(u)},2000);
}
function setup(){const base=document.getElementById('exportBtn');if(!base||document.getElementById('shareHtmlStandalone'))return;const b=document.createElement('button');b.id='shareHtmlStandalone';b.type='button';b.className='btn primary';b.textContent='📄 Condividi file HTML';b.title='Esporta un file HTML autonomo per WhatsApp';(document.getElementById('shareExportBtn')||base).after(b)}
document.addEventListener('click',e=>{if(e.target.closest('#settingsBtn'))setTimeout(setup,20);if(!e.target.closest('#shareHtmlStandalone'))return;e.preventDefault();e.stopImmediatePropagation();const p=current();if(!p)return alert('Apri prima un itinerario.');exportHtml(p).catch(x=>alert('Esportazione non riuscita: '+x.message))},true);
window.__IA_EXPORT_HTML=exportHtml;
})();
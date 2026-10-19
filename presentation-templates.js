(()=>{
'use strict';
const STORE='itinerarioArtistico.projects.v4', $=id=>document.getElementById(id);
const themes={
 classico:{name:'Classico',desc:'Avorio, bordeaux e dettagli dorati',ink:'#302923',paper:'#faf7ef',accent:'#893e2e'},
 mediterraneo:{name:'Mediterraneo',desc:'Bianco, blu mare e azzurro',ink:'#173d56',paper:'#f5fbff',accent:'#146b98'},
 botanico:{name:'Botanico',desc:'Verde salvia e carta naturale',ink:'#314036',paper:'#f6f7ef',accent:'#50725b'},
 notte:{name:'Notte',desc:'Antracite, crema e rame',ink:'#f5eadc',paper:'#262b30',accent:'#dcaa78'},
 moderno:{name:'Moderno',desc:'Bianco, nero e rosso',ink:'#1e2529',paper:'#fff',accent:'#cb3b38'}
};
const layouts={automatico:'Automatico · si adatta ai contenuti',fotografico:'Fotografico · immagini protagoniste',editoriale:'Editoriale · testo e foto affiancati',essenziale:'Essenziale · pulito e leggibile'};
function project(){const title=$('projectName')?.textContent?.trim();if(!title)return null;try{return JSON.parse(localStorage.getItem(STORE)||'[]').filter(p=>p?.title===title).sort((a,b)=>(b.updated||0)-(a.updated||0))[0]||null}catch{return null}}
function apply(){const p=project(),theme=themes[p?.presentationTheme]||themes.classico;const layout=layouts[p?.presentationLayout]?p.presentationLayout:'automatico';
 const slide=$('slide');if(!slide)return;
 slide.dataset.iaTheme=Object.keys(themes).find(k=>themes[k]===theme)||'classico';
 slide.dataset.iaLayout=layout;
 slide.style.setProperty('--ia-paper',theme.paper);slide.style.setProperty('--ia-ink',theme.ink);slide.style.setProperty('--ia-accent',theme.accent);
}
function editor(){
 const p=project();if(!p||$('iaStyleDialog'))return;
 const background=document.createElement('div');background.id='iaStyleDialog';background.className='iaStyleDialog';
 const box=document.createElement('section');box.className='iaStylePanel';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label','Modelli della presentazione');
 const heading=document.createElement('div');heading.innerHTML='<h2>Modelli della presentazione</h2><p>Scegli colori e impaginazione delle schede. La mappa e i contenuti rimangono invariati.</p>';
 const gallery=document.createElement('div');gallery.className='iaStyleGallery';
 let chosenTheme=themes[p.presentationTheme]?p.presentationTheme:'classico',chosenLayout=layouts[p.presentationLayout]?p.presentationLayout:'automatico';
 const samples={};
 Object.entries(themes).forEach(([key,t])=>{
  const b=document.createElement('button');b.type='button';b.className='iaStyleSample';
  b.innerHTML='<span class="iaStyleSamplePaper"><span class="iaStyleSampleTop"></span><span class="iaStyleSamplePicture"></span><span class="iaStyleSampleLines"></span></span><strong></strong><small></small>';
  b.querySelector('strong').textContent=t.name;b.querySelector('small').textContent=t.desc;
  b.style.setProperty('--sample-paper',t.paper);b.style.setProperty('--sample-ink',t.ink);b.style.setProperty('--sample-accent',t.accent);
  b.onclick=()=>{chosenTheme=key;update()};samples[key]=b;gallery.append(b);
 });
 const label=document.createElement('label');label.className='iaStyleLayoutLabel';label.textContent='Impaginazione delle schede';
 const select=document.createElement('select');for(const [k,v] of Object.entries(layouts)){const opt=document.createElement('option');opt.value=k;opt.textContent=v;select.append(opt)}
 select.value=chosenLayout;select.onchange=()=>{chosenLayout=select.value};
 label.append(select);
 const note=document.createElement('p');note.className='iaStyleNote';note.textContent='Il modello automatico sceglie la disposizione in base al testo e alle fotografie. Gli altri modelli mantengono uno stile costante per tutte le tappe.';
 const actions=document.createElement('div');actions.className='iaStyleActions';
 const cancel=document.createElement('button');cancel.textContent='Annulla';cancel.type='button';
 const save=document.createElement('button');save.textContent='Salva modello';save.type='button';save.className='iaStyleSave';
 actions.append(cancel,save);box.append(heading,gallery,label,note,actions);background.append(box);document.body.append(background);
 function update(){for(const [key,b] of Object.entries(samples)){b.classList.toggle('selected',key===chosenTheme);b.setAttribute('aria-pressed',String(key===chosenTheme))}}
 function close(){background.remove();document.removeEventListener('keydown',escapeKey,true)}
 function escapeKey(e){if(e.key==='Escape'){e.stopImmediatePropagation();close()}}
 document.addEventListener('keydown',escapeKey,true);background.onclick=e=>{if(e.target===background)close()};
 cancel.onclick=close;save.onclick=()=>{
  const title=$('projectName')?.textContent?.trim();
  try{const ps=JSON.parse(localStorage.getItem(STORE)||'[]');const target=ps.filter(x=>x?.title===title).sort((a,b)=>(b.updated||0)-(a.updated||0))[0];if(!target)throw Error('progetto');
   target.presentationTheme=chosenTheme;target.presentationLayout=chosenLayout;target.updated=Date.now();localStorage.setItem(STORE,JSON.stringify(ps));apply();close();
  }catch{note.textContent='Impossibile salvare: verifica lo spazio di archiviazione disponibile.'}
 };
 update();
}
const btn=document.createElement('button');btn.type='button';btn.id='iaStyleButton';btn.className='btn';btn.textContent='🎨 Modelli PPT';btn.title='Scegli colori e impaginazione delle schede';
$('presentBtn')?.insertAdjacentElement('beforebegin',btn);btn.onclick=editor;
new MutationObserver(apply).observe($('stepText'),{childList:true,subtree:true,characterData:true});
new MutationObserver(apply).observe(document.body,{attributes:true,attributeFilter:['class']});
window.addEventListener('storage',apply);apply();
})();
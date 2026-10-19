(()=>{
'use strict';
const STORE='itinerarioArtistico.projects.v4';
const $=id=>document.getElementById(id);
function current(){
 const title=$('projectName')?.textContent?.trim();if(!title)return null;
 try{return JSON.parse(localStorage.getItem(STORE)||'[]').filter(p=>p?.title===title).sort((a,b)=>(b.updated||0)-(a.updated||0))[0]||null}catch{return null}
}
function el(tag,cl,text){const x=document.createElement(tag);if(cl)x.className=cl;if(text!==undefined)x.textContent=text;return x}
function openEditor(){
 const p=current();if(!p||$('iaCoverEditor'))return;
 const modal=el('div','iaCoverEditorOverlay');modal.id='iaCoverEditor';
 const panel=el('section','iaCoverEditorPanel');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Modifica copertina');
 const form=el('form','iaCoverEditorForm');
 const header=el('div','iaCoverEditorHeading');
 header.append(el('h2','', 'Personalizza la copertina'),el('p','', 'Titolo, sottotitolo, introduzione e fotografia. Le tappe non vengono modificate.'));
 form.append(header);
 const initial=p.coverImage||p.stops?.find(s=>s?.image)?.image||'';
 let image=p.coverImage||'';
 function field(title,tag,initialValue,max){
   const label=el('label','iaCoverField');
   label.append(el('span','',title));
   const input=el(tag,'');
   input.value=initialValue||'';
   input.maxLength=max;
   if(tag==='textarea')input.rows=3;
   label.append(input);form.append(label);
   return input;
 }
 const name=field('Titolo della copertina','input',p.coverTitle||p.title,120);
 const subtitle=field('Sottotitolo','input',p.coverSubtitle||'ALLA SCOPERTA DEL TERRITORIO',150);
 const intro=field('Testo introduttivo','textarea',p.coverDescription||p.desc,900);
 const modeLabel=el('label','iaCoverField');modeLabel.append(el('span','','Lavoro'));
 const mode=el('select');['Da solo','In coppia'].forEach((t,i)=>{const opt=el('option','',t);opt.value=String(i+1);mode.append(opt)});
 mode.value=p.authors?.length===2?'2':'1';modeLabel.append(mode);form.append(modeLabel);
 const author1=field('Studente 1','input',p.authors?.[0]||'',100);
 const author2Label=el('label','iaCoverField');author2Label.append(el('span','','Studente 2'));
 const author2=el('input');author2.maxLength=100;author2.value=p.authors?.[1]||'';author2Label.append(author2);form.append(author2Label);
 const className=field('Classe','input',p.schoolClass||'',50);
 const showSecond=()=>{author2Label.hidden=mode.value!=='2'};mode.addEventListener('change',showSecond);showSecond();
 const row=el('div','iaCoverEditorImageControls');
 const pick=el('button','', 'Scegli una fotografia');pick.type='button';
 const reset=el('button','', 'Usa la foto della prima tappa');reset.type='button';
 const uploader=el('input');uploader.type='file';uploader.accept='image/*';uploader.hidden=true;
 const info=el('p','iaCoverEditorInfo','La fotografia viene salvata sul dispositivo insieme all’itinerario.');
 row.append(pick,reset,uploader);form.append(row,info);
 const preview=el('div','iaCoverEditorPreview');
 const photo=el('div','iaCoverEditorPreviewPhoto');
 const cover=el('div','iaCoverEditorPreviewText');
 const kicker=el('small');const big=el('h3');const desc=el('p');
 cover.append(kicker,big,desc);preview.append(photo,cover);
 const render=()=>{
   photo.replaceChildren();
   const src=image||p.stops?.find(s=>s?.image)?.image||'';
   if(src){const im=el('img');im.src=src;im.alt='Anteprima fotografia';photo.append(im)}
   else photo.append(el('span','', 'Fotografia dell’itinerario'));
   kicker.textContent=subtitle.value||'ALLA SCOPERTA DEL TERRITORIO';
   big.textContent=name.value||p.title;
   desc.textContent=intro.value||'';
 };
 [name,subtitle,intro].forEach(x=>x.addEventListener('input',render));
 pick.addEventListener('click',()=>uploader.click());
 reset.addEventListener('click',()=>{image='';render()});
 uploader.addEventListener('change',async()=>{
   const file=uploader.files?.[0];if(!file)return;
   if(!file.type.startsWith('image/')){info.textContent='Seleziona un file immagine valido.';return}
   if(file.size>15*1024*1024){info.textContent='Immagine troppo grande: scegli un file inferiore a 15 MB.';return}
   info.textContent='Preparazione della fotografia…';
   try{
     const url=URL.createObjectURL(file);
     try{
       const img=new Image();
       await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url});
       const scale=Math.min(1,1400/Math.max(img.naturalWidth,img.naturalHeight));
       const canvas=document.createElement('canvas');
       canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
       canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
       canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
       image=canvas.toDataURL('image/jpeg',.79);
       info.textContent='Fotografia pronta. Premi Salva per confermare.';
       render();
     }finally{URL.revokeObjectURL(url)}
   }catch{info.textContent='Non sono riuscito a leggere la fotografia. Prova un’altra immagine.'}
 });
 const actions=el('div','iaCoverEditorActions');
 const cancel=el('button','','Annulla');cancel.type='button';
 const save=el('button','iaCoverEditorSave','Salva copertina');save.type='submit';
 actions.append(cancel,save);form.append(actions);
 panel.append(form,preview);modal.append(panel);document.body.append(modal);
 const close=()=>modal.remove();
 cancel.addEventListener('click',close);
 modal.addEventListener('click',e=>{if(e.target===modal)close()});
 const onKey=e=>{if(e.key==='Escape'){e.preventDefault();close();document.removeEventListener('keydown',onKey,true)}};
 document.addEventListener('keydown',onKey,true);
 const originalClose=close;
 form.addEventListener('submit',e=>{
   e.preventDefault();
   if(!name.value.trim()){info.textContent='Inserisci un titolo per la copertina.';name.focus();return}
   try{
     const ok=window.__IA_UPDATE_COVER?.({
       coverTitle:name.value.trim(),
       coverSubtitle:subtitle.value.trim(),
       coverDescription:intro.value.trim(),
       coverImage:image,
       authors:[author1.value.trim(),...(mode.value==='2'?[author2.value.trim()]:[])].filter(Boolean),
       schoolClass:className.value.trim()
     });
     if(!ok){info.textContent='Apri prima un itinerario e riprova.';return}
     document.removeEventListener('keydown',onKey,true);
     originalClose();
   }catch{
     info.textContent='Spazio di archiviazione insufficiente. Prova una fotografia più piccola.';
   }
 });
 render();name.focus();
}
function addButton(){
 const settings=$('settingsBtn'), toolbar=settings?.parentElement;
 if(!settings||!toolbar||$('iaEditCoverBtn'))return;
 const btn=el('button','btn','▤ Copertina');btn.id='iaEditCoverBtn';btn.type='button';
 btn.title='Modifica la copertina iniziale dell’itinerario';
 settings.insertAdjacentElement('beforebegin',btn);
 btn.addEventListener('click',openEditor);
}
addButton();
window.addEventListener('load',addButton);
})();
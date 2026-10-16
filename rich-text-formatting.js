(()=>{
  'use strict';

  const PROJECT_STORE='itinerarioArtistico.projects.v4';
  const RICH_STORE='itinerarioArtistico.richText.v1';
  const $=id=>document.getElementById(id);
  const FONTS={
    arial:'Arial, sans-serif',
    georgia:'Georgia, serif',
    times:'"Times New Roman", Times, serif',
    trebuchet:'"Trebuchet MS", Arial, sans-serif',
    verdana:'Verdana, sans-serif',
    garamond:'Garamond, Georgia, serif'
  };
  let applying=false;

  function loadProjects(){try{return JSON.parse(localStorage.getItem(PROJECT_STORE)||'[]')}catch{return[]}}
  function loadRich(){try{return JSON.parse(localStorage.getItem(RICH_STORE)||'{}')}catch{return{}}}
  function saveRich(v){localStorage.setItem(RICH_STORE,JSON.stringify(v))}
  function currentProject(){
    const title=$('projectName')?.textContent?.trim();
    if(!title)return null;
    const matches=loadProjects().filter(p=>p?.title===title);
    return matches.sort((a,b)=>(b.updated||0)-(a.updated||0))[0]||null;
  }
  function currentIndex(){
    const m=($('stepText')?.textContent||'').match(/(\d+)\s*\/\s*(\d+)/);
    return m?Math.max(0,Number(m[1])-1):0;
  }
  function stopKey(project,index=currentIndex()){
    const s=project?.stops?.[index];
    if(!s)return 'index:'+index;
    const lat=Number(s.lat),lon=Number(s.lon);
    if(Number.isFinite(lat)&&Number.isFinite(lon))return lat.toFixed(6)+','+lon.toFixed(6);
    return 'index:'+index;
  }
  function projectRich(project){
    if(!project)return{};
    const store=loadRich();
    if(!store[project.id]&&project._richText&&typeof project._richText==='object'){
      store[project.id]=project._richText;
      saveRich(store);
    }
    return store[project.id]||{};
  }
  function currentRich(){
    const project=currentProject();
    if(!project)return null;
    const key=stopKey(project);
    return {project,key,data:projectRich(project)[key]||{}};
  }
  function saveCurrentRich(titleHtml,descHtml){
    const project=currentProject();
    if(!project)return;
    const store=loadRich(),key=stopKey(project);
    store[project.id]=store[project.id]||{};
    store[project.id][key]={titleHtml,descHtml};
    saveRich(store);
  }

  function escText(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function fontFamilyFrom(value){
    const v=String(value||'').toLowerCase();
    if(v.includes('georgia'))return FONTS.georgia;
    if(v.includes('times'))return FONTS.times;
    if(v.includes('trebuchet'))return FONTS.trebuchet;
    if(v.includes('verdana'))return FONTS.verdana;
    if(v.includes('garamond'))return FONTS.garamond;
    if(v.includes('arial'))return FONTS.arial;
    return '';
  }
  function sanitize(html,singleLine=false){
    const src=document.createElement('template');
    src.innerHTML=String(html||'');
    const out=document.createElement('div');
    function walk(node,parent){
      if(node.nodeType===Node.TEXT_NODE){parent.appendChild(document.createTextNode(node.nodeValue||''));return}
      if(node.nodeType!==Node.ELEMENT_NODE)return;
      const tag=node.tagName.toUpperCase();
      if(tag==='BR'){
        if(!singleLine)parent.appendChild(document.createElement('br'));
        else parent.appendChild(document.createTextNode(' '));
        return;
      }
      if(tag==='DIV'||tag==='P'){
        [...node.childNodes].forEach(n=>walk(n,parent));
        if(!singleLine)parent.appendChild(document.createElement('br'));
        else parent.appendChild(document.createTextNode(' '));
        return;
      }
      let el=null;
      if(tag==='STRONG'||tag==='B')el=document.createElement('strong');
      else if(tag==='EM'||tag==='I')el=document.createElement('em');
      else if(tag==='SPAN'||tag==='FONT'){
        const fam=fontFamilyFrom(tag==='FONT'?node.getAttribute('face'):node.style.fontFamily);
        if(fam){el=document.createElement('span');el.style.fontFamily=fam}
      }
      if(el){parent.appendChild(el);[...node.childNodes].forEach(n=>walk(n,el))}
      else [...node.childNodes].forEach(n=>walk(n,parent));
    }
    [...src.content.childNodes].forEach(n=>walk(n,out));
    let result=out.innerHTML.replace(/(?:<br>\s*){3,}/gi,'<br><br>');
    result=result.replace(/(?:<br>\s*)+$/gi,'');
    return result;
  }
  function plain(editor,singleLine=false){
    if(singleLine)return (editor.textContent||'').replace(/\s+/g,' ').trim();
    return (editor.innerText||editor.textContent||'').replace(/\n{3,}/g,'\n\n').trim();
  }

  function injectCss(){
    if($('iaRichCss'))return;
    const style=document.createElement('style');
    style.id='iaRichCss';
    style.textContent=`
      .iaRichBox{margin-top:6px}
      .iaRichToolbar{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:0 0 7px}
      .iaRichToolbar select,.iaRichToolbar button{min-height:34px;border:1px solid #cfc7bc;border-radius:8px;background:#fff;color:#242424;padding:6px 9px;font:inherit}
      .iaRichToolbar select{min-width:132px}
      .iaRichToolbar button{min-width:38px;cursor:pointer}
      .iaRichToolbar .iaBold{font-weight:800}
      .iaRichToolbar .iaItalic{font-style:italic}
      .iaRichEditor{width:100%;box-sizing:border-box;border:1px solid #cfc7bc;border-radius:9px;background:#fff;color:#1f211e;padding:10px 11px;line-height:1.45;outline:none;overflow:auto}
      .iaRichEditor:focus{border-color:#7c6a55;box-shadow:0 0 0 2px rgba(124,106,85,.12)}
      .iaRichTitle{min-height:43px;white-space:nowrap;overflow-x:auto;overflow-y:hidden}
      .iaRichDesc{min-height:140px;max-height:330px;white-space:pre-wrap}
      .iaRichHint{font-size:11px;opacity:.65;margin-top:5px}
      @media(max-width:700px){.iaRichToolbar select{min-width:118px;max-width:160px}.iaRichToolbar{gap:5px}.iaRichEditor{font-size:16px}}
    `;
    document.head.appendChild(style);
  }

  function rememberSelection(editor){
    const sel=window.getSelection();
    if(!sel||!sel.rangeCount)return;
    const r=sel.getRangeAt(0);
    if(editor.contains(r.commonAncestorContainer))editor.__iaRange=r.cloneRange();
  }
  function restoreSelection(editor){
    editor.focus();
    const r=editor.__iaRange;
    if(!r)return;
    const sel=window.getSelection();
    try{sel.removeAllRanges();sel.addRange(r)}catch{}
  }
  function runCommand(editor,cmd,value=null){
    restoreSelection(editor);
    try{document.execCommand(cmd,false,value)}catch{}
    rememberSelection(editor);
  }
  function toolbar(editor){
    const bar=document.createElement('div');
    bar.className='iaRichToolbar';
    const select=document.createElement('select');
    select.setAttribute('aria-label','Scegli font');
    select.innerHTML='<option value="">Font</option><option value="Arial">Arial</option><option value="Georgia">Georgia</option><option value="Times New Roman">Times New Roman</option><option value="Trebuchet MS">Trebuchet</option><option value="Verdana">Verdana</option><option value="Garamond">Garamond</option>';
    const bold=document.createElement('button');bold.type='button';bold.className='iaBold';bold.textContent='B';bold.title='Grassetto';
    const italic=document.createElement('button');italic.type='button';italic.className='iaItalic';italic.textContent='I';italic.title='Corsivo';
    bold.addEventListener('mousedown',e=>{e.preventDefault();runCommand(editor,'bold')});
    italic.addEventListener('mousedown',e=>{e.preventDefault();runCommand(editor,'italic')});
    select.addEventListener('mousedown',()=>rememberSelection(editor));
    select.addEventListener('change',()=>{if(select.value)runCommand(editor,'fontName',select.value);select.value=''});
    bar.append(select,bold,italic);
    return bar;
  }
  function buildEditor(original,html,singleLine){
    original.style.display='none';
    const box=document.createElement('div');box.className='iaRichBox';
    const ed=document.createElement('div');
    ed.className='iaRichEditor '+(singleLine?'iaRichTitle':'iaRichDesc');
    ed.contentEditable='true';ed.spellcheck=true;ed.setAttribute('role','textbox');
    ed.setAttribute('aria-multiline',singleLine?'false':'true');
    ed.innerHTML=sanitize(html,singleLine)||'';
    if(singleLine)ed.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault()}});
    ['keyup','mouseup','input','focus'].forEach(type=>ed.addEventListener(type,()=>rememberSelection(ed)));
    box.append(toolbar(ed),ed);
    const hint=document.createElement('div');hint.className='iaRichHint';hint.textContent='Seleziona il testo e usa Font, B o I.';box.appendChild(hint);
    original.insertAdjacentElement('afterend',box);
    return ed;
  }

  function wireEditor(){
    const title=$('eTitle'),desc=$('eDesc'),save=$('saveEdit');
    if(!title||!desc||!save||title.dataset.richReady==='1')return;
    title.dataset.richReady='1';desc.dataset.richReady='1';
    const x=currentRich(),data=x?.data||{};
    const titleHtml=data.titleHtml||escText(title.value);
    const descHtml=data.descHtml||escText(desc.value).replace(/\n/g,'<br>');
    const titleEd=buildEditor(title,titleHtml,true);
    const descEd=buildEditor(desc,descHtml,false);
    save.addEventListener('click',()=>{
      const cleanTitle=sanitize(titleEd.innerHTML,true);
      const cleanDesc=sanitize(descEd.innerHTML,false);
      title.value=plain(titleEd,true)||'Tappa';
      desc.value=plain(descEd,false);
      saveCurrentRich(cleanTitle,cleanDesc);
    },true);
  }

  function applyRichToSlide(){
    if(applying)return;
    const slide=$('slide');if(!slide||$('app')?.classList.contains('hidden'))return;
    const x=currentRich();if(!x)return;
    const d=x.data||{};
    if(!d.titleHtml&&!d.descHtml)return;
    applying=true;
    try{
      const h=slide.querySelector('h1');
      if(h&&d.titleHtml&&h.dataset.iaRichKey!==x.key){h.innerHTML=sanitize(d.titleHtml,true);h.dataset.iaRichKey=x.key}
      const ph=slide.querySelector('.placeholder strong');
      if(ph&&d.titleHtml&&ph.dataset.iaRichKey!==x.key){ph.innerHTML=sanitize(d.titleHtml,true);ph.dataset.iaRichKey=x.key}
      const desc=slide.querySelector('.desc');
      if(desc&&d.descHtml&&!desc.querySelector('.descBullets')&&desc.dataset.iaRichKey!==x.key){desc.innerHTML=sanitize(d.descHtml,false);desc.dataset.iaRichKey=x.key}
    }finally{applying=false}
  }

  function copyRichOnDuplicate(e){
    const btn=e.target?.closest?.('.projectCard [data-d]');if(!btn)return;
    const card=btn.closest('.projectCard'),title=card?.querySelector('h3')?.textContent?.trim();if(!title)return;
    const before=loadProjects(),source=before.filter(p=>p.title===title).sort((a,b)=>(b.updated||0)-(a.updated||0))[0];
    if(!source)return;
    const sourceRich=projectRich(source);if(!Object.keys(sourceRich).length)return;
    const beforeIds=new Set(before.map(p=>p.id));
    setTimeout(()=>{
      const created=loadProjects().filter(p=>!beforeIds.has(p.id)).sort((a,b)=>(b.created||0)-(a.created||0))[0];
      if(!created)return;
      const store=loadRich();store[created.id]=JSON.parse(JSON.stringify(sourceRich));saveRich(store);
    },0);
  }

  injectCss();
  const modal=$('modal');
  if(modal)new MutationObserver(wireEditor).observe(modal,{childList:true,subtree:true});
  const slide=$('slide');
  if(slide)new MutationObserver(()=>setTimeout(applyRichToSlide,0)).observe(slide,{childList:true,subtree:true});
  document.addEventListener('selectionchange',()=>{
    document.querySelectorAll('.iaRichEditor').forEach(rememberSelection);
  });
  document.addEventListener('click',copyRichOnDuplicate);
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('#nextBtn,#prevBtn,.leaflet-marker-icon,#saveEdit,.projectCard [data-o],.projectCard [data-p]'))setTimeout(applyRichToSlide,0);
  });
  window.addEventListener('load',()=>{wireEditor();setTimeout(applyRichToSlide,0)});
})();

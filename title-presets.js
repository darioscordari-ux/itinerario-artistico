(()=>{
  'use strict';
  const PROJECT_STORE='itinerarioArtistico.projects.v4';
  const RICH_STORE='itinerarioArtistico.richText.v1';
  const $=id=>document.getElementById(id);
  const styles=new Set(['none','classic','modern','elegant','museum']);

  function projects(){try{return JSON.parse(localStorage.getItem(PROJECT_STORE)||'[]')}catch{return[]}}
  function rich(){try{return JSON.parse(localStorage.getItem(RICH_STORE)||'{}')}catch{return{}}}
  function saveRich(v){localStorage.setItem(RICH_STORE,JSON.stringify(v))}
  function currentProject(){
    const title=$('projectName')?.textContent?.trim();
    if(!title)return null;
    return projects().filter(p=>p?.title===title).sort((a,b)=>(b.updated||0)-(a.updated||0))[0]||null;
  }
  function currentIndex(){
    const m=($('stepText')?.textContent||'').match(/(\d+)\s*\/\s*(\d+)/);
    return m?Math.max(0,Number(m[1])-1):0;
  }
  function stopKey(project,index=currentIndex()){
    const s=project?.stops?.[index];
    if(!s)return 'index:'+index;
    const lat=Number(s.lat),lon=Number(s.lon);
    return Number.isFinite(lat)&&Number.isFinite(lon)?lat.toFixed(6)+','+lon.toFixed(6):'index:'+index;
  }
  function currentData(){
    const p=currentProject();if(!p)return null;
    const store=rich(),key=stopKey(p);
    return {p,key,store,data:store?.[p.id]?.[key]||{}};
  }
  function normalize(v){return styles.has(v)?v:'none'}

  function injectCss(){
    if($('iaTitlePresetCss'))return;
    const style=document.createElement('style');style.id='iaTitlePresetCss';
    style.textContent=`
      .iaTitlePresetBar{display:flex;gap:8px;align-items:center;margin:7px 0 8px;padding:8px 9px;border:1px solid #ddd4c8;border-radius:10px;background:#faf7f2}
      .iaTitlePresetBar label{font-size:12px;font-weight:800;white-space:nowrap}
      .iaTitlePresetBar select{min-height:34px;flex:1;border:1px solid #cfc7bc;border-radius:8px;background:#fff;padding:6px 8px;font:inherit}
      .slide h1.iaTitleStyle-classic{font-family:Georgia,'Times New Roman',serif;font-weight:700;letter-spacing:-.018em;color:#382b21}
      .slide h1.iaTitleStyle-modern{font-family:'Trebuchet MS',Arial,sans-serif;font-weight:900;letter-spacing:-.04em;color:#171a1d}
      .slide h1.iaTitleStyle-elegant{font-family:Garamond,Georgia,serif;font-weight:500;font-style:italic;letter-spacing:.006em;color:#574335}
      .slide h1.iaTitleStyle-museum{font-family:Georgia,'Times New Roman',serif;font-weight:700;letter-spacing:.075em;text-transform:uppercase;color:#6c4b2d}
      .presentation .slide h1.iaTitleStyle-classic{border-bottom:1px solid #d8c9b8;padding-bottom:.18em}
      .presentation .slide h1.iaTitleStyle-modern{line-height:.94}
      .presentation .slide h1.iaTitleStyle-elegant{font-size:clamp(38px,4.05vw,64px);line-height:1.02}
      .presentation .slide h1.iaTitleStyle-museum{font-size:clamp(29px,3.15vw,49px);line-height:1.06}
      @media(max-width:640px){.iaTitlePresetBar{align-items:stretch;flex-direction:column}.presentation .slide h1.iaTitleStyle-elegant{font-size:25px}.presentation .slide h1.iaTitleStyle-museum{font-size:18px}}
    `;
    document.head.appendChild(style);
  }
  function setClass(h,value){
    if(!h)return;
    [...h.classList].filter(c=>c.startsWith('iaTitleStyle-')).forEach(c=>h.classList.remove(c));
    const v=normalize(value);if(v!=='none')h.classList.add('iaTitleStyle-'+v);
    h.dataset.iaTitlePreset=v;
  }
  function apply(){
    const slide=$('slide'),x=currentData();if(!slide||!x)return;
    setClass(slide.querySelector('h1'),x.data.titleStyle||'none');
  }
  function wire(){
    const input=$('eTitle'),save=$('saveEdit');
    if(!input||!save||input.dataset.titlePresetReady==='1')return;
    input.dataset.titlePresetReady='1';
    const x=currentData(),box=input.nextElementSibling;
    const bar=document.createElement('div');bar.className='iaTitlePresetBar';
    bar.innerHTML='<label for="iaTitlePreset">Stile titolo</label><select id="iaTitlePreset"><option value="none">Personalizzato</option><option value="classic">Classico</option><option value="modern">Moderno</option><option value="elegant">Elegante</option><option value="museum">Museo</option></select>';
    if(box?.classList.contains('iaRichBox'))box.insertAdjacentElement('beforebegin',bar);else input.insertAdjacentElement('afterend',bar);
    const sel=$('iaTitlePreset');sel.value=normalize(x?.data?.titleStyle||'none');
    save.addEventListener('click',()=>{
      const now=currentData();if(!now)return;
      now.store[now.p.id]=now.store[now.p.id]||{};
      now.store[now.p.id][now.key]={...(now.store[now.p.id][now.key]||{}),titleStyle:normalize(sel.value)};
      saveRich(now.store);
      setTimeout(apply,0);
    },true);
  }

  injectCss();
  const modal=$('modal');if(modal)new MutationObserver(()=>setTimeout(wire,0)).observe(modal,{childList:true,subtree:true});
  const slide=$('slide');if(slide)new MutationObserver(()=>setTimeout(apply,0)).observe(slide,{childList:true,subtree:true});
  document.addEventListener('click',e=>{if(e.target?.closest?.('#nextBtn,#prevBtn,.leaflet-marker-icon,#saveEdit,.projectCard [data-o],.projectCard [data-p]'))setTimeout(apply,0)});
  window.addEventListener('load',()=>{wire();setTimeout(apply,0)});
})();

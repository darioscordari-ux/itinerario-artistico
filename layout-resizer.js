(()=>{
  'use strict';

  const STORAGE_KEY='itinerarioArtistico.layoutSplit.v1';
  const $=sel=>document.querySelector(sel);

  function defaultPercent(){
    if(window.innerWidth<=640) return 56;
    if(window.innerWidth<=900) return 58;
    return 64;
  }

  function readPercent(){
    const n=Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(n)&&n>0?n:defaultPercent();
  }

  function limits(){
    if(window.innerWidth<=640) return [28,78];
    return [24,82];
  }

  function clamp(value){
    const [min,max]=limits();
    return Math.max(min,Math.min(max,value));
  }

  function invalidateMap(){
    requestAnimationFrame(()=>{
      try{ window.__IA_MAP?.invalidateSize?.({pan:false,animate:false}); }catch{}
    });
  }

  function install(){
    const workspace=$('.workspace');
    const mapPanel=$('.mapPanel');
    const slidePanel=$('.slidePanel');
    if(!workspace||!mapPanel||!slidePanel||document.getElementById('paneSplitter')) return;

    workspace.classList.add('resizableWorkspace');

    const splitter=document.createElement('div');
    splitter.id='paneSplitter';
    splitter.className='paneSplitter';
    splitter.setAttribute('role','separator');
    splitter.setAttribute('aria-orientation','vertical');
    splitter.setAttribute('aria-label','Ridimensiona mappa e presentazione');
    splitter.setAttribute('tabindex','0');
    splitter.innerHTML='<div class="splitGrip" aria-hidden="true">↔</div><div class="splitReadout" aria-hidden="true"></div>';
    workspace.insertBefore(splitter,slidePanel);

    const style=document.createElement('style');
    style.textContent=`
      .workspace.resizableWorkspace{grid-template-columns:minmax(0,var(--map-pane,64%)) 12px minmax(0,1fr)}
      .paneSplitter{position:relative;z-index:850;background:linear-gradient(90deg,transparent 0 42%,#cfc6ba 42% 58%,transparent 58%);cursor:col-resize;touch-action:none;user-select:none;display:flex;align-items:center;justify-content:center;outline:none}
      .paneSplitter:after{content:"";position:absolute;inset:0 -9px;z-index:-1}
      .splitGrip{width:28px;height:42px;border:1px solid #d9d2c8;border-radius:999px;background:#fffdf8;box-shadow:0 3px 12px #0002;display:grid;place-items:center;font-size:16px;font-weight:900;color:#706c64;pointer-events:none}
      .paneSplitter:hover .splitGrip,.paneSplitter:focus .splitGrip,.paneSplitter.dragging .splitGrip{border-color:#b42318;color:#b42318;box-shadow:0 4px 16px #0003}
      .splitReadout{display:none;position:absolute;top:12px;left:50%;transform:translateX(-50%);background:#1f211ef2;color:#fff;border-radius:999px;padding:5px 8px;font-size:10px;font-weight:800;white-space:nowrap;pointer-events:none}
      .paneSplitter.dragging .splitReadout{display:block}
      body.resizingPanes{cursor:col-resize!important;user-select:none!important}
      body.resizingPanes *{cursor:col-resize!important}
      .presentation .paneSplitter{z-index:1200}
      @media(max-width:900px){.workspace.resizableWorkspace{grid-template-columns:minmax(0,var(--map-pane,58%)) 11px minmax(0,1fr)}}
      @media(max-width:640px){.workspace.resizableWorkspace{grid-template-columns:minmax(0,var(--map-pane,56%)) 10px minmax(0,1fr)}.splitGrip{width:24px;height:38px;font-size:14px}.paneSplitter:after{inset:0 -11px}.splitReadout{top:7px}}
    `;
    document.head.appendChild(style);

    let percent=clamp(readPercent());
    let dragging=false;

    function setPercent(value,{save=true,show=false}={}){
      percent=clamp(value);
      workspace.style.setProperty('--map-pane',percent.toFixed(1)+'%');
      splitter.setAttribute('aria-valuemin',String(limits()[0]));
      splitter.setAttribute('aria-valuemax',String(limits()[1]));
      splitter.setAttribute('aria-valuenow',String(Math.round(percent)));
      splitter.setAttribute('aria-valuetext',`Mappa ${Math.round(percent)}%, presentazione ${Math.round(100-percent)}%`);
      const readout=splitter.querySelector('.splitReadout');
      if(readout) readout.textContent=`Mappa ${Math.round(percent)}% · Presentazione ${Math.round(100-percent)}%`;
      if(save) localStorage.setItem(STORAGE_KEY,String(percent));
      if(show) splitter.classList.add('dragging');
      invalidateMap();
    }

    function fromClientX(clientX){
      const rect=workspace.getBoundingClientRect();
      if(!rect.width) return percent;
      return ((clientX-rect.left)/rect.width)*100;
    }

    splitter.addEventListener('pointerdown',e=>{
      dragging=true;
      splitter.classList.add('dragging');
      document.body.classList.add('resizingPanes');
      try{splitter.setPointerCapture(e.pointerId)}catch{}
      setPercent(fromClientX(e.clientX),{save:false,show:true});
      e.preventDefault();
    });

    splitter.addEventListener('pointermove',e=>{
      if(!dragging) return;
      setPercent(fromClientX(e.clientX),{save:false,show:true});
      e.preventDefault();
    });

    function finish(e){
      if(!dragging) return;
      dragging=false;
      document.body.classList.remove('resizingPanes');
      setPercent(percent,{save:true});
      setTimeout(()=>splitter.classList.remove('dragging'),180);
      try{if(e?.pointerId!=null)splitter.releasePointerCapture(e.pointerId)}catch{}
    }

    splitter.addEventListener('pointerup',finish);
    splitter.addEventListener('pointercancel',finish);

    splitter.addEventListener('dblclick',()=>{
      setPercent(defaultPercent(),{save:true});
      splitter.classList.add('dragging');
      setTimeout(()=>splitter.classList.remove('dragging'),500);
    });

    splitter.addEventListener('keydown',e=>{
      let next=percent;
      if(e.key==='ArrowLeft') next-=3;
      else if(e.key==='ArrowRight') next+=3;
      else if(e.key==='Home'||e.key==='Enter'||e.key===' ') next=defaultPercent();
      else return;
      e.preventDefault();
      setPercent(next,{save:true});
      splitter.classList.add('dragging');
      setTimeout(()=>splitter.classList.remove('dragging'),450);
    });

    window.addEventListener('resize',()=>{
      setPercent(percent,{save:false});
    });

    const ro='ResizeObserver' in window?new ResizeObserver(()=>invalidateMap()):null;
    if(ro){ro.observe(mapPanel);ro.observe(slidePanel)}

    setPercent(percent,{save:false});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
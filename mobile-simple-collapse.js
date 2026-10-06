(()=>{
  'use strict';

  const $=id=>document.getElementById(id);
  const isMobile=()=>window.matchMedia('(max-width: 760px)').matches;

  function ensureStyle(){
    if($('routeSimpleCollapseStyle'))return;
    const style=document.createElement('style');
    style.id='routeSimpleCollapseStyle';
    style.textContent=`
      #routeSimpleToggle{display:none}
      @media(max-width:760px){
        .modalBack.routeEditing .modal #routeSimpleToggle{
          display:block;
          margin:0 0 8px auto;
          border:0;
          border-radius:999px;
          padding:8px 12px;
          background:#1f211e;
          color:#fff;
          font:800 11px/1 system-ui,sans-serif;
          touch-action:manipulation;
        }

        .modalBack.routeEditing.routeSimpleCollapsed{
          align-items:flex-start!important;
          justify-content:flex-end!important;
          padding:58px 6px 6px!important;
        }

        .modalBack.routeEditing.routeSimpleCollapsed .modal{
          width:auto!important;
          max-width:none!important;
          max-height:none!important;
          padding:0!important;
          margin:0!important;
          overflow:visible!important;
          background:transparent!important;
          border:0!important;
          box-shadow:none!important;
        }

        .modalBack.routeEditing.routeSimpleCollapsed .modal>*:not(#routeSimpleToggle){
          display:none!important;
        }

        .modalBack.routeEditing.routeSimpleCollapsed #routeSimpleToggle{
          display:block!important;
          position:static!important;
          margin:0!important;
          padding:11px 15px!important;
          background:#1f211e!important;
          color:#fff!important;
          border:2px solid #fff!important;
          box-shadow:0 4px 18px #0006!important;
          white-space:nowrap!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function syncButton(){
    const back=$('modalBack');
    const btn=$('routeSimpleToggle');
    if(!back||!btn)return;
    const collapsed=back.classList.contains('routeSimpleCollapsed');
    btn.textContent=collapsed?'＋ Riapri':'− Riduci';
    btn.setAttribute('aria-expanded',collapsed?'false':'true');
  }

  function setup(){
    ensureStyle();
    if(!isMobile())return;
    const back=$('modalBack');
    const modal=$('modal');
    if(!back||!modal||!back.classList.contains('routeEditing')||back.classList.contains('hidden'))return;

    let btn=$('routeSimpleToggle');
    if(!btn){
      btn=document.createElement('button');
      btn.type='button';
      btn.id='routeSimpleToggle';
      btn.setAttribute('aria-label','Riduci o riapri i comandi di modifica percorso');
      btn.addEventListener('click',e=>{
        e.preventDefault();
        e.stopPropagation();
        back.classList.toggle('routeSimpleCollapsed');
        syncButton();
        setTimeout(()=>window.__IA_MAP?.invalidateSize?.(true),80);
      });
      modal.prepend(btn);
    }
    syncButton();
  }

  function reset(){
    const back=$('modalBack');
    if(back)back.classList.remove('routeSimpleCollapsed');
  }

  document.addEventListener('click',e=>{
    if(e.target?.closest?.('#editRouteBtn'))setTimeout(setup,0);
    if(e.target?.closest?.('#routeCancel,#routeSave'))setTimeout(reset,0);
  });

  window.addEventListener('resize',()=>{
    if(!isMobile())reset();
    else setup();
  });

  ensureStyle();
})();

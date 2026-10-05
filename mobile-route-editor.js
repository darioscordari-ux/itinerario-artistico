(()=>{
  'use strict';

  const $=id=>document.getElementById(id);
  const isMobile=()=>window.matchMedia('(max-width: 640px)').matches;
  let wiredModal=null;

  function ensureStyle(){
    if($('mobileRouteEditorStyle'))return;
    const style=document.createElement('style');
    style.id='mobileRouteEditorStyle';
    style.textContent=`
      #routeMobileToggle{display:none}
      @media(max-width:640px){
        body.routeEditorOpen .workspace{grid-template-columns:1fr!important}
        body.routeEditorOpen .slidePanel{display:none!important}
        body.routeEditorOpen .mapPanel,#map{min-height:0!important}

        .modalBack.routeEditing{
          align-items:flex-end!important;
          justify-content:center!important;
          padding:6px!important;
        }
        .modalBack.routeEditing .modal{
          width:calc(100vw - 12px)!important;
          max-width:none!important;
          max-height:min(42dvh,340px)!important;
          padding:12px!important;
          border-radius:16px!important;
          overflow:auto!important;
        }
        .modalBack.routeEditing .modal h2{font-size:19px!important;margin:0 42px 8px 0!important}
        .modalBack.routeEditing .routeEditHelp{font-size:11px!important;line-height:1.3!important;padding:7px 9px!important;margin:6px 0 8px!important}
        .modalBack.routeEditing .routeEditActions{gap:5px!important}
        .modalBack.routeEditing .routeEditActions .btn{font-size:10px!important;padding:6px 7px!important}
        .modalBack.routeEditing .field{margin:5px 0!important}
        .modalBack.routeEditing .modalFoot{margin-top:7px!important}
        .modalBack.routeEditing .modalFoot .btn{font-size:10px!important;padding:6px 8px!important}
        .modalBack.routeEditing .routeEditStatus{font-size:11px!important;min-height:18px!important;margin-top:6px!important}

        #routeMobileToggle{
          display:block;
          position:absolute;
          right:10px;
          top:9px;
          z-index:3;
          border:1px solid #d9d2c8;
          background:#fffdf8;
          color:#1f211e;
          border-radius:999px;
          padding:5px 8px;
          font:800 10px/1 system-ui,sans-serif;
          box-shadow:0 2px 8px #0002;
        }

        .modalBack.routeEditing.routeEditorCollapsed{
          align-items:flex-end!important;
          justify-content:flex-end!important;
          padding:0 7px 8px!important;
        }
        .modalBack.routeEditing.routeEditorCollapsed .modal{
          width:auto!important;
          min-width:0!important;
          max-height:none!important;
          overflow:visible!important;
          padding:0!important;
          background:transparent!important;
          border:0!important;
          box-shadow:none!important;
        }
        .modalBack.routeEditing.routeEditorCollapsed .modal>*:not(#routeMobileToggle){display:none!important}
        .modalBack.routeEditing.routeEditorCollapsed #routeMobileToggle{
          position:static!important;
          display:block!important;
          font-size:11px!important;
          padding:9px 12px!important;
          background:#1f211e!important;
          color:#fff!important;
          border-color:#1f211e!important;
          box-shadow:0 4px 16px #0005!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function syncToggle(back){
    const btn=$('routeMobileToggle');
    if(!btn)return;
    const collapsed=back.classList.contains('routeEditorCollapsed');
    btn.textContent=collapsed?'▲ Apri modifica':'▼ Riduci';
    btn.title=collapsed?'Riapri i comandi del percorso':'Riduci i comandi per usare tutta la mappa';
  }

  function wireRouteModal(){
    const back=$('modalBack');
    const modal=$('modal');
    if(!back||!modal)return;

    const open=back.classList.contains('routeEditing')&&!back.classList.contains('hidden');
    document.body.classList.toggle('routeEditorOpen',open);
    if(!open){
      back.classList.remove('routeEditorCollapsed');
      wiredModal=null;
      return;
    }

    if(wiredModal===modal && $('routeMobileToggle')){
      syncToggle(back);
      return;
    }
    wiredModal=modal;

    let toggle=$('routeMobileToggle');
    if(!toggle){
      toggle=document.createElement('button');
      toggle.type='button';
      toggle.id='routeMobileToggle';
      modal.prepend(toggle);
    }
    toggle.onclick=e=>{
      e.preventDefault();
      e.stopPropagation();
      if(!isMobile())return;
      back.classList.toggle('routeEditorCollapsed');
      syncToggle(back);
      setTimeout(()=>window.__IA_MAP?.invalidateSize?.(true),80);
    };

    ['routeSetStart','routeAddPoint','routeSetEnd'].forEach(id=>{
      const btn=$(id);
      if(!btn||btn.dataset.mobileCollapseBound==='1')return;
      btn.dataset.mobileCollapseBound='1';
      btn.addEventListener('click',()=>{
        if(!isMobile())return;
        setTimeout(()=>{
          back.classList.add('routeEditorCollapsed');
          syncToggle(back);
          window.__IA_MAP?.invalidateSize?.(true);
        },30);
      });
    });

    syncToggle(back);
    if(isMobile())setTimeout(()=>window.__IA_MAP?.invalidateSize?.(true),80);
  }

  function boot(){
    ensureStyle();
    const back=$('modalBack');
    const modal=$('modal');
    if(back)new MutationObserver(wireRouteModal).observe(back,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});
    if(modal)new MutationObserver(wireRouteModal).observe(modal,{childList:true,subtree:true});
    window.addEventListener('resize',()=>{
      wireRouteModal();
      setTimeout(()=>window.__IA_MAP?.invalidateSize?.(true),80);
    });
    wireRouteModal();
  }

  window.addEventListener('load',boot);
})();

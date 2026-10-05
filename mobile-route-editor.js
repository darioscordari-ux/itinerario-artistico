(()=>{
  'use strict';

  const $=id=>document.getElementById(id);
  const isCompact=()=>window.matchMedia('(max-width: 900px), (pointer: coarse)').matches;

  function ensureStyle(){
    if($('mobileRouteEditorStyle'))return;
    const style=document.createElement('style');
    style.id='mobileRouteEditorStyle';
    style.textContent=`
      #routeMobileToggle{display:none}

      @media(max-width:900px),(pointer:coarse){
        body.routeEditorOpen .workspace{grid-template-columns:1fr!important}
        body.routeEditorOpen .slidePanel{display:none!important}
        body.routeEditorOpen .mapPanel{min-height:0!important}
        body.routeEditorOpen #map{min-height:0!important;height:100%!important}

        .modalBack.routeEditing{
          inset:0!important;
          align-items:flex-end!important;
          justify-content:center!important;
          padding:0 6px calc(6px + env(safe-area-inset-bottom))!important;
          background:transparent!important;
          pointer-events:none!important;
        }

        .modalBack.routeEditing .modal{
          position:relative!important;
          pointer-events:auto!important;
          width:calc(100vw - 12px)!important;
          max-width:none!important;
          max-height:38dvh!important;
          padding:11px!important;
          border-radius:16px!important;
          overflow:auto!important;
          box-shadow:0 6px 24px #0005!important;
        }

        .modalBack.routeEditing .modal h2{
          font-size:18px!important;
          margin:0 132px 7px 0!important;
        }
        .modalBack.routeEditing .routeEditHelp{display:none!important}
        .modalBack.routeEditing .field{margin:4px 0 7px!important}
        .modalBack.routeEditing .field label{font-size:9px!important;margin-bottom:3px!important}
        .modalBack.routeEditing #routeSegment{padding:7px!important;font-size:11px!important}
        .modalBack.routeEditing .routeEditActions{
          gap:5px!important;
          display:grid!important;
          grid-template-columns:1fr 1fr!important;
        }
        .modalBack.routeEditing .routeEditActions .btn{
          font-size:10px!important;
          padding:8px 5px!important;
          min-width:0!important;
        }
        .modalBack.routeEditing .routeEditStatus{
          font-size:10px!important;
          line-height:1.2!important;
          min-height:14px!important;
          margin-top:6px!important;
        }
        .modalBack.routeEditing .modalFoot{margin-top:6px!important;gap:5px!important}
        .modalBack.routeEditing .modalFoot .btn{font-size:10px!important;padding:7px 9px!important}

        #routeMobileToggle{
          display:block!important;
          position:absolute!important;
          right:9px!important;
          top:8px!important;
          z-index:20!important;
          border:0!important;
          background:#1f211e!important;
          color:#fff!important;
          border-radius:999px!important;
          padding:8px 11px!important;
          font:800 11px/1 system-ui,sans-serif!important;
          box-shadow:0 3px 10px #0003!important;
          pointer-events:auto!important;
          touch-action:manipulation!important;
        }

        .modalBack.routeEditing.routeEditorCollapsed{
          padding:0!important;
          align-items:stretch!important;
          justify-content:stretch!important;
        }

        .modalBack.routeEditing.routeEditorCollapsed .modal{
          position:fixed!important;
          left:50%!important;
          bottom:calc(8px + env(safe-area-inset-bottom))!important;
          transform:translateX(-50%)!important;
          width:auto!important;
          min-width:0!important;
          height:auto!important;
          max-height:none!important;
          padding:0!important;
          margin:0!important;
          overflow:visible!important;
          background:transparent!important;
          border:0!important;
          box-shadow:none!important;
          pointer-events:auto!important;
          z-index:10000!important;
        }

        .modalBack.routeEditing.routeEditorCollapsed .modal>*:not(#routeMobileToggle){display:none!important}

        .modalBack.routeEditing.routeEditorCollapsed #routeMobileToggle{
          position:static!important;
          display:block!important;
          width:auto!important;
          height:auto!important;
          padding:11px 15px!important;
          background:#1f211e!important;
          color:#fff!important;
          border:2px solid #fff!important;
          box-shadow:0 4px 18px #0006!important;
          font-size:12px!important;
          white-space:nowrap!important;
          pointer-events:auto!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function invalidateMap(){
    setTimeout(()=>window.__IA_MAP?.invalidateSize?.(true),40);
    setTimeout(()=>window.__IA_MAP?.invalidateSize?.(true),180);
  }

  function syncToggle(back){
    const btn=$('routeMobileToggle');
    if(!btn)return;
    const collapsed=back.classList.contains('routeEditorCollapsed');
    btn.textContent=collapsed?'＋ Riapri comandi':'− Rimpicciolisci';
    btn.title=collapsed?'Riapri la maschera di modifica':'Rimpicciolisci la maschera per usare la mappa';
    btn.setAttribute('aria-expanded',collapsed?'false':'true');
  }

  function setCollapsed(back,value){
    if(!isCompact())return;
    back.classList.toggle('routeEditorCollapsed',!!value);
    syncToggle(back);
    invalidateMap();
  }

  function wireRouteModal(){
    const back=$('modalBack');
    const modal=$('modal');
    if(!back||!modal)return;

    const open=back.classList.contains('routeEditing')&&!back.classList.contains('hidden');
    document.body.classList.toggle('routeEditorOpen',open&&isCompact());

    if(!open){
      back.classList.remove('routeEditorCollapsed');
      return;
    }

    if(!isCompact()){
      back.classList.remove('routeEditorCollapsed');
      return;
    }

    let toggle=$('routeMobileToggle');
    if(!toggle){
      toggle=document.createElement('button');
      toggle.type='button';
      toggle.id='routeMobileToggle';
      toggle.setAttribute('aria-label','Rimpicciolisci o riapri la maschera di modifica percorso');
      modal.prepend(toggle);
    }

    toggle.onclick=e=>{
      e.preventDefault();
      e.stopPropagation();
      setCollapsed(back,!back.classList.contains('routeEditorCollapsed'));
    };

    syncToggle(back);
    invalidateMap();
  }

  function boot(){
    ensureStyle();
    const back=$('modalBack');
    const modal=$('modal');

    if(back){
      new MutationObserver(wireRouteModal).observe(back,{
        attributes:true,
        attributeFilter:['class'],
        childList:true,
        subtree:true
      });
    }
    if(modal)new MutationObserver(wireRouteModal).observe(modal,{childList:true,subtree:true});

    window.addEventListener('resize',()=>{
      wireRouteModal();
      invalidateMap();
    });

    wireRouteModal();
  }

  window.addEventListener('load',boot);
})();

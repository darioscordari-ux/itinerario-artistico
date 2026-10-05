(()=>{
  'use strict';

  const $=id=>document.getElementById(id);
  const isCompact=()=>window.matchMedia('(max-width: 900px), (pointer: coarse)').matches;

  function ensureStyle(){
    if($('mobileRouteEditorStyle'))return;
    const style=document.createElement('style');
    style.id='mobileRouteEditorStyle';
    style.textContent=`
      #routeMobileTools{display:none}

      @media(max-width:900px),(pointer:coarse){
        body.routeEditorOpen .workspace{grid-template-columns:1fr!important}
        body.routeEditorOpen .slidePanel{display:none!important}
        body.routeEditorOpen .mapPanel{min-height:0!important}
        body.routeEditorOpen #map{height:100%!important;min-height:0!important}

        .modalBack.routeEditing{
          inset:0!important;
          padding:0!important;
          background:transparent!important;
          pointer-events:none!important;
          display:block!important;
        }

        .modalBack.routeEditing .modal{
          position:fixed!important;
          left:6px!important;
          right:6px!important;
          bottom:calc(8px + env(safe-area-inset-bottom))!important;
          top:auto!important;
          width:auto!important;
          max-width:none!important;
          max-height:38dvh!important;
          padding:10px!important;
          border-radius:16px!important;
          overflow:auto!important;
          box-shadow:0 6px 24px #0005!important;
          pointer-events:auto!important;
          z-index:10001!important;
        }

        .modalBack.routeEditing.routeEditorTop .modal{
          top:54px!important;
          bottom:auto!important;
        }

        .modalBack.routeEditing .routeEditHelp{display:none!important}
        .modalBack.routeEditing .modal h2{font-size:17px!important;margin:36px 0 6px!important}
        .modalBack.routeEditing .field{margin:4px 0 7px!important}
        .modalBack.routeEditing .field label{font-size:9px!important;margin-bottom:3px!important}
        .modalBack.routeEditing #routeSegment{padding:7px!important;font-size:11px!important}
        .modalBack.routeEditing .routeEditActions{display:grid!important;grid-template-columns:1fr 1fr!important;gap:5px!important}
        .modalBack.routeEditing .routeEditActions .btn{font-size:10px!important;padding:8px 5px!important;min-width:0!important}
        .modalBack.routeEditing .routeEditStatus{font-size:10px!important;line-height:1.2!important;min-height:14px!important;margin-top:6px!important}
        .modalBack.routeEditing .modalFoot{margin-top:6px!important;gap:5px!important}
        .modalBack.routeEditing .modalFoot .btn{font-size:10px!important;padding:7px 9px!important}

        #routeMobileTools{
          display:flex!important;
          position:absolute!important;
          left:8px!important;
          right:8px!important;
          top:7px!important;
          z-index:60!important;
          gap:6px!important;
          justify-content:flex-end!important;
          pointer-events:auto!important;
        }
        #routeMobileTools button{
          border:0!important;
          border-radius:999px!important;
          padding:8px 10px!important;
          font:800 10px/1 system-ui,sans-serif!important;
          touch-action:manipulation!important;
          white-space:nowrap!important;
          box-shadow:0 2px 8px #0002!important;
        }
        #routeMoveTop,#routeMoveBottom{background:#eee8df!important;color:#1f211e!important}
        #routeMobileToggle{background:#1f211e!important;color:#fff!important}

        .modalBack.routeEditing.routeEditorCollapsed .modal{
          left:auto!important;
          right:8px!important;
          top:auto!important;
          bottom:calc(8px + env(safe-area-inset-bottom))!important;
          width:auto!important;
          max-height:none!important;
          padding:0!important;
          overflow:visible!important;
          background:transparent!important;
          border:0!important;
          box-shadow:none!important;
        }
        .modalBack.routeEditing.routeEditorCollapsed .modal>*:not(#routeMobileTools){display:none!important}
        .modalBack.routeEditing.routeEditorCollapsed #routeMobileTools{
          position:static!important;
          left:auto!important;
          right:auto!important;
          top:auto!important;
          display:block!important;
        }
        .modalBack.routeEditing.routeEditorCollapsed #routeMoveTop,
        .modalBack.routeEditing.routeEditorCollapsed #routeMoveBottom{display:none!important}
        .modalBack.routeEditing.routeEditorCollapsed #routeMobileToggle{
          padding:11px 15px!important;
          border:2px solid #fff!important;
          box-shadow:0 4px 18px #0006!important;
          font-size:12px!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function invalidateMap(){
    setTimeout(()=>window.__IA_MAP?.invalidateSize?.(true),50);
    setTimeout(()=>window.__IA_MAP?.invalidateSize?.(true),180);
  }

  function updateLabels(back){
    const toggle=$('routeMobileToggle');
    if(!toggle)return;
    const collapsed=back.classList.contains('routeEditorCollapsed');
    const wanted=collapsed?'＋ Riapri comandi':'− Riduci';
    if(toggle.textContent!==wanted)toggle.textContent=wanted;
    toggle.setAttribute('aria-expanded',collapsed?'false':'true');
  }

  function ensureControls(back,modal){
    if($('routeMobileTools')){
      updateLabels(back);
      return;
    }

    const tools=document.createElement('div');
    tools.id='routeMobileTools';
    tools.innerHTML='<button type="button" id="routeMoveTop">↑ Su</button><button type="button" id="routeMoveBottom">↓ Giù</button><button type="button" id="routeMobileToggle">− Riduci</button>';
    modal.prepend(tools);

    $('routeMoveTop').onclick=e=>{
      e.preventDefault();
      e.stopPropagation();
      back.classList.remove('routeEditorCollapsed');
      back.classList.add('routeEditorTop');
      updateLabels(back);
      invalidateMap();
    };

    $('routeMoveBottom').onclick=e=>{
      e.preventDefault();
      e.stopPropagation();
      back.classList.remove('routeEditorCollapsed','routeEditorTop');
      updateLabels(back);
      invalidateMap();
    };

    $('routeMobileToggle').onclick=e=>{
      e.preventDefault();
      e.stopPropagation();
      const collapse=!back.classList.contains('routeEditorCollapsed');
      back.classList.toggle('routeEditorCollapsed',collapse);
      if(collapse)back.classList.remove('routeEditorTop');
      updateLabels(back);
      invalidateMap();
    };
  }

  function sync(){
    const back=$('modalBack');
    const modal=$('modal');
    if(!back||!modal)return;

    const open=back.classList.contains('routeEditing')&&!back.classList.contains('hidden');
    const compact=open&&isCompact();
    document.body.classList.toggle('routeEditorOpen',compact);

    if(!open){
      back.classList.remove('routeEditorCollapsed','routeEditorTop');
      return;
    }

    if(!isCompact())return;
    ensureControls(back,modal);
    updateLabels(back);
    invalidateMap();
  }

  function boot(){
    ensureStyle();
    const back=$('modalBack');
    if(back){
      new MutationObserver(sync).observe(back,{attributes:true,attributeFilter:['class']});
    }
    window.addEventListener('resize',sync);
    document.addEventListener('click',e=>{
      if(e.target?.closest?.('#editRouteBtn'))setTimeout(sync,0);
    });
    sync();
  }

  window.addEventListener('load',boot);
})();

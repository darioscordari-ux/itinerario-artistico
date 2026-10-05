(()=>{
  'use strict';

  const $=id=>document.getElementById(id);
  const isCompact=()=>window.matchMedia('(max-width: 900px), (pointer: coarse)').matches;
  let dragState=null;

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
        body.routeEditorOpen #map{min-height:0!important;height:100%!important}

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
          bottom:calc(7px + env(safe-area-inset-bottom))!important;
          top:auto!important;
          width:auto!important;
          max-width:none!important;
          max-height:40dvh!important;
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

        .modalBack.routeEditing .modal h2{
          font-size:17px!important;
          margin:34px 0 6px!important;
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

        #routeMobileTools{
          display:flex!important;
          position:sticky!important;
          top:-10px!important;
          z-index:50!important;
          margin:-10px -10px 0!important;
          padding:7px 8px!important;
          gap:6px!important;
          align-items:center!important;
          background:#fffdf8f5!important;
          border-bottom:1px solid #d9d2c8!important;
          backdrop-filter:blur(6px)!important;
        }

        #routeMobileGrab{
          flex:1!important;
          min-width:70px!important;
          height:30px!important;
          border-radius:999px!important;
          border:1px solid #d9d2c8!important;
          background:#f5f1e9!important;
          display:flex!important;
          align-items:center!important;
          justify-content:center!important;
          font:800 11px/1 system-ui,sans-serif!important;
          color:#4f4a43!important;
          touch-action:none!important;
          user-select:none!important;
          cursor:grab!important;
        }
        #routeMobileGrab:active{cursor:grabbing!important}

        #routeMobileMove,#routeMobileToggle{
          border:0!important;
          border-radius:999px!important;
          padding:8px 10px!important;
          font:800 10px/1 system-ui,sans-serif!important;
          touch-action:manipulation!important;
          white-space:nowrap!important;
        }
        #routeMobileMove{background:#eee8df!important;color:#1f211e!important}
        #routeMobileToggle{background:#1f211e!important;color:#fff!important}

        .modalBack.routeEditing.routeEditorCollapsed .modal{
          left:auto!important;
          right:8px!important;
          bottom:calc(8px + env(safe-area-inset-bottom))!important;
          top:auto!important;
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
          margin:0!important;
          padding:0!important;
          border:0!important;
          background:transparent!important;
          backdrop-filter:none!important;
        }
        .modalBack.routeEditing.routeEditorCollapsed #routeMobileGrab,
        .modalBack.routeEditing.routeEditorCollapsed #routeMobileMove{display:none!important}
        .modalBack.routeEditing.routeEditorCollapsed #routeMobileToggle{
          display:block!important;
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
    setTimeout(()=>window.__IA_MAP?.invalidateSize?.(true),40);
    setTimeout(()=>window.__IA_MAP?.invalidateSize?.(true),180);
  }

  function clearManualPosition(modal){
    if(!modal)return;
    modal.style.removeProperty('top');
    modal.style.removeProperty('bottom');
    modal.style.removeProperty('left');
    modal.style.removeProperty('right');
    modal.style.removeProperty('transform');
  }

  function syncControls(back){
    const toggle=$('routeMobileToggle');
    const move=$('routeMobileMove');
    if(!toggle)return;
    const collapsed=back.classList.contains('routeEditorCollapsed');
    const top=back.classList.contains('routeEditorTop');
    toggle.textContent=collapsed?'＋ Riapri':'− Riduci';
    toggle.setAttribute('aria-expanded',collapsed?'false':'true');
    if(move)move.textContent=top?'↓ Sposta giù':'↑ Sposta su';
  }

  function setCollapsed(back,value){
    if(!isCompact())return;
    const modal=$('modal');
    clearManualPosition(modal);
    back.classList.toggle('routeEditorCollapsed',!!value);
    if(value)back.classList.remove('routeEditorTop');
    syncControls(back);
    invalidateMap();
  }

  function toggleTopBottom(back){
    if(!isCompact())return;
    const modal=$('modal');
    clearManualPosition(modal);
    back.classList.remove('routeEditorCollapsed');
    back.classList.toggle('routeEditorTop');
    syncControls(back);
    invalidateMap();
  }

  function beginDrag(e){
    if(!isCompact())return;
    const back=$('modalBack');
    const modal=$('modal');
    if(!back||!modal||back.classList.contains('routeEditorCollapsed'))return;
    const r=modal.getBoundingClientRect();
    dragState={pointerId:e.pointerId,startY:e.clientY,startTop:r.top,height:r.height};
    try{e.currentTarget.setPointerCapture(e.pointerId)}catch{}
    e.preventDefault();
  }

  function moveDrag(e){
    if(!dragState||e.pointerId!==dragState.pointerId)return;
    const modal=$('modal');
    const back=$('modalBack');
    if(!modal||!back)return;
    const minTop=48;
    const maxTop=Math.max(minTop,window.innerHeight-dragState.height-8);
    const next=Math.min(maxTop,Math.max(minTop,dragState.startTop+(e.clientY-dragState.startY)));
    back.classList.remove('routeEditorTop');
    modal.style.setProperty('top',next+'px','important');
    modal.style.setProperty('bottom','auto','important');
    e.preventDefault();
  }

  function endDrag(e){
    if(!dragState||e.pointerId!==dragState.pointerId)return;
    dragState=null;
    invalidateMap();
  }

  function ensureControls(modal,back){
    let tools=$('routeMobileTools');
    if(!tools){
      tools=document.createElement('div');
      tools.id='routeMobileTools';
      tools.innerHTML='<div id="routeMobileGrab" role="button" aria-label="Trascina la maschera">↕ Trascina</div><button type="button" id="routeMobileMove">↑ Sposta su</button><button type="button" id="routeMobileToggle">− Riduci</button>';
      modal.prepend(tools);

      const grab=$('routeMobileGrab');
      grab?.addEventListener('pointerdown',beginDrag);
      grab?.addEventListener('pointermove',moveDrag);
      grab?.addEventListener('pointerup',endDrag);
      grab?.addEventListener('pointercancel',endDrag);
    }

    const toggle=$('routeMobileToggle');
    const move=$('routeMobileMove');
    if(toggle)toggle.onclick=e=>{
      e.preventDefault();e.stopPropagation();
      setCollapsed(back,!back.classList.contains('routeEditorCollapsed'));
    };
    if(move)move.onclick=e=>{
      e.preventDefault();e.stopPropagation();
      toggleTopBottom(back);
    };
  }

  function wireRouteModal(){
    const back=$('modalBack');
    const modal=$('modal');
    if(!back||!modal)return;

    const open=back.classList.contains('routeEditing')&&!back.classList.contains('hidden');
    document.body.classList.toggle('routeEditorOpen',open&&isCompact());

    if(!open){
      back.classList.remove('routeEditorCollapsed','routeEditorTop');
      clearManualPosition(modal);
      return;
    }
    if(!isCompact())return;

    ensureControls(modal,back);
    syncControls(back);
    invalidateMap();
  }

  function boot(){
    ensureStyle();
    const back=$('modalBack');
    const modal=$('modal');
    if(back)new MutationObserver(wireRouteModal).observe(back,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});
    if(modal)new MutationObserver(wireRouteModal).observe(modal,{childList:true,subtree:true});
    window.addEventListener('resize',()=>{
      const back=$('modalBack');
      const modal=$('modal');
      back?.classList.remove('routeEditorTop');
      clearManualPosition(modal);
      wireRouteModal();
    });
    wireRouteModal();
  }

  window.addEventListener('load',boot);
})();

(()=>{
  'use strict';

  const $=id=>document.getElementById(id);
  const isMobile=()=>window.matchMedia('(max-width: 640px)').matches;
  let wiredSignature='';

  function ensureStyle(){
    if($('mobileRouteEditorStyle'))return;
    const style=document.createElement('style');
    style.id='mobileRouteEditorStyle';
    style.textContent=`
      #routeMobileToggle{display:none}
      @media(max-width:640px){
        body.routeEditorOpen .workspace{grid-template-columns:1fr!important}
        body.routeEditorOpen .slidePanel{display:none!important}
        body.routeEditorOpen .mapPanel{min-height:0!important}
        body.routeEditorOpen #map{min-height:0!important;height:100%!important}

        .modalBack.routeEditing{
          inset:0!important;
          align-items:flex-end!important;
          justify-content:center!important;
          padding:0 6px 6px!important;
          background:transparent!important;
          pointer-events:none!important;
        }
        .modalBack.routeEditing .modal{
          position:relative!important;
          pointer-events:auto!important;
          width:calc(100vw - 12px)!important;
          max-width:none!important;
          max-height:30dvh!important;
          padding:10px!important;
          border-radius:14px!important;
          overflow:auto!important;
          box-shadow:0 6px 24px #0005!important;
        }
        .modalBack.routeEditing .modal h2{font-size:17px!important;margin:0 82px 5px 0!important}
        .modalBack.routeEditing .routeEditHelp{display:none!important}
        .modalBack.routeEditing .field{margin:3px 0 6px!important}
        .modalBack.routeEditing .field label{font-size:9px!important;margin-bottom:3px!important}
        .modalBack.routeEditing #routeSegment{padding:7px!important;font-size:11px!important}
        .modalBack.routeEditing .routeEditActions{gap:4px!important;display:grid!important;grid-template-columns:1fr 1fr!important}
        .modalBack.routeEditing .routeEditActions .btn{font-size:10px!important;padding:7px 5px!important;min-width:0!important}
        .modalBack.routeEditing .routeEditStatus{font-size:10px!important;line-height:1.2!important;min-height:14px!important;margin-top:5px!important}
        .modalBack.routeEditing .modalFoot{margin-top:5px!important;gap:4px!important}
        .modalBack.routeEditing .modalFoot .btn{font-size:10px!important;padding:6px 8px!important}

        #routeMobileToggle{
          display:block!important;
          position:absolute!important;
          right:9px!important;
          top:8px!important;
          z-index:10!important;
          border:1px solid #d9d2c8!important;
          background:#fffdf8!important;
          color:#1f211e!important;
          border-radius:999px!important;
          padding:6px 9px!important;
          font:800 10px/1 system-ui,sans-serif!important;
          box-shadow:0 2px 8px #0002!important;
          pointer-events:auto!important;
        }

        .modalBack.routeEditing.routeEditorCollapsed{
          padding:0!important;
          align-items:stretch!important;
          justify-content:stretch!important;
        }
        .modalBack.routeEditing.routeEditorCollapsed .modal{
          position:static!important;
          width:0!important;
          height:0!important;
          max-height:none!important;
          min-width:0!important;
          padding:0!important;
          margin:0!important;
          overflow:visible!important;
          background:transparent!important;
          border:0!important;
          box-shadow:none!important;
          pointer-events:none!important;
        }
        .modalBack.routeEditing.routeEditorCollapsed .modal>*:not(#routeMobileToggle){display:none!important}
        .modalBack.routeEditing.routeEditorCollapsed #routeMobileToggle{
          position:fixed!important;
          top:54px!important;
          right:8px!important;
          display:block!important;
          width:auto!important;
          height:auto!important;
          padding:9px 12px!important;
          background:#1f211e!important;
          color:#fff!important;
          border-color:#1f211e!important;
          box-shadow:0 4px 16px #0005!important;
          pointer-events:auto!important;
          z-index:10000!important;
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
    btn.textContent=collapsed?'⚙ Comandi':'🗺 Mappa';
    btn.title=collapsed?'Riapri i comandi del percorso':'Nascondi i comandi e usa tutta la mappa';
  }

  function setCollapsed(back,value){
    if(!isMobile())return;
    back.classList.toggle('routeEditorCollapsed',!!value);
    syncToggle(back);
    invalidateMap();
  }

  function wireRouteModal(){
    const back=$('modalBack');
    const modal=$('modal');
    if(!back||!modal)return;

    const open=back.classList.contains('routeEditing')&&!back.classList.contains('hidden');
    document.body.classList.toggle('routeEditorOpen',open);
    if(!open){
      back.classList.remove('routeEditorCollapsed');
      wiredSignature='';
      return;
    }

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
      setCollapsed(back,!back.classList.contains('routeEditorCollapsed'));
    };

    const signature=['routeSetStart','routeAddPoint','routeSetEnd'].map(id=>$(id)?id:'').join('|');
    if(signature!==wiredSignature){
      wiredSignature=signature;
      ['routeSetStart','routeAddPoint','routeSetEnd'].forEach(id=>{
        const btn=$(id);
        if(!btn||btn.dataset.mobileCollapseBound==='1')return;
        btn.dataset.mobileCollapseBound='1';
        btn.addEventListener('click',()=>{
          if(!isMobile())return;
          setCollapsed(back,true);
        });
      });
    }

    syncToggle(back);
    invalidateMap();
  }

  function boot(){
    ensureStyle();
    const back=$('modalBack');
    const modal=$('modal');
    if(back)new MutationObserver(wireRouteModal).observe(back,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});
    if(modal)new MutationObserver(wireRouteModal).observe(modal,{childList:true,subtree:true});
    window.addEventListener('resize',()=>{wireRouteModal();invalidateMap();});
    wireRouteModal();
  }

  window.addEventListener('load',boot);
})();

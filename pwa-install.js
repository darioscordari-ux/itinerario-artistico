(()=>{
  'use strict';

  const isStandalone=()=>window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true;
  const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroid=()=>/android/i.test(navigator.userAgent);

  function installButtonAvailable(){
    const b=document.getElementById('installBtn');
    return !!(b && !b.classList.contains('hidden'));
  }

  function fallbackInstructions(){
    if(isIOS()){
      alert('Su iPhone/iPad: apri il menu Condividi del browser e scegli “Aggiungi alla schermata Home”.');
      return;
    }
    if(isAndroid()){
      alert('Se il pulsante di installazione non compare automaticamente, apri il menu ⋮ del browser e scegli “Installa app” oppure “Aggiungi a schermata Home”.');
      return;
    }
    alert('Apri il menu del browser e scegli “Installa app” o “Crea collegamento”.');
  }

  function requestInstall(){
    if(isStandalone())return;
    const nativeBtn=document.getElementById('installBtn');
    if(nativeBtn && !nativeBtn.classList.contains('hidden')){
      nativeBtn.click();
      return;
    }
    fallbackInstructions();
  }

  function ensureLibraryButton(){
    if(isStandalone())return;
    const top=document.querySelector('.libraryTop');
    if(!top || document.getElementById('libraryInstallBtn'))return;

    const box=document.createElement('div');
    box.id='libraryInstallBox';
    box.style.cssText='margin:18px 0 24px;padding:16px 18px;border:1px solid #d9d2c8;border-radius:16px;background:#fffdf8;box-shadow:0 10px 28px #392e2012;display:flex;align-items:center;gap:14px;flex-wrap:wrap';
    box.innerHTML='<div style="flex:1;min-width:220px"><b style="display:block;font-size:16px;margin-bottom:3px">Installa Itinerario Artistico</b><span style="font-size:12px;color:#706c64">Aggiungila alla schermata Home e aprila come una normale app.</span></div><button id="libraryInstallBtn" class="btn primary" style="padding:11px 15px">⬇ Installa app</button>';
    top.appendChild(box);
    document.getElementById('libraryInstallBtn').onclick=requestInstall;
  }

  function hideInstallUi(){
    document.getElementById('libraryInstallBox')?.remove();
    document.getElementById('installBtn')?.classList.add('hidden');
  }

  window.addEventListener('beforeinstallprompt',()=>setTimeout(ensureLibraryButton,0));
  window.addEventListener('appinstalled',hideInstallUi);

  document.addEventListener('click',e=>{
    if(e.target?.closest?.('#homeBtn'))setTimeout(ensureLibraryButton,120);
  });

  window.addEventListener('load',()=>{
    if(isStandalone())hideInstallUi();
    else ensureLibraryButton();
  });

  setTimeout(ensureLibraryButton,150);
})();

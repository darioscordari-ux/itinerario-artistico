(()=>{
  'use strict';
  let showComplete = false;
  let lastStep = 1;
  let applying = false;

  function currentStep(){
    const text = document.getElementById('stepText')?.textContent || '1 / 1';
    const m = text.match(/(\d+)\s*\/\s*(\d+)/);
    return m ? Math.max(1, Number(m[1])) : 1;
  }

  function routePaths(){
    return [...document.querySelectorAll('#map .leaflet-overlay-pane svg path.leaflet-interactive')];
  }

  function routeLabels(){
    return [...document.querySelectorAll('#map .leaflet-marker-pane .routeLabel')];
  }

  function stopMarkerIcons(){
    return [...document.querySelectorAll('#map .leaflet-marker-pane .leaflet-marker-icon')]
      .filter(el => el.querySelector('.markerPin'));
  }

  function animatePath(path){
    if (!path || typeof path.getTotalLength !== 'function') return;
    const len = path.getTotalLength();
    if (!Number.isFinite(len) || len <= 0) return;
    path.style.transition = 'none';
    path.style.strokeDasharray = `${len} ${len}`;
    path.style.strokeDashoffset = `${len}`;
    path.getBoundingClientRect();
    requestAnimationFrame(()=>{
      path.style.transition = 'stroke-dashoffset 900ms ease-in-out';
      path.style.strokeDashoffset = '0';
    });
    setTimeout(()=>{
      path.style.transition = '';
      path.style.strokeDasharray = '';
      path.style.strokeDashoffset = '';
    }, 980);
  }

  function applyProgressive(animateNew=false){
    if (applying) return;
    applying = true;
    const step = currentStep();
    const paths = routePaths();
    const labels = routeLabels();
    const markers = stopMarkerIcons();

    paths.forEach((p,i)=>{
      const visible = showComplete || i < step - 1;
      p.style.display = visible ? '' : 'none';
    });
    labels.forEach((l,i)=>{
      const visible = showComplete || i < step - 1;
      l.style.display = visible ? '' : 'none';
    });
    markers.forEach((m,i)=>{
      const visible = showComplete || i < step;
      m.style.display = visible ? '' : 'none';
    });

    if (!showComplete && animateNew && step > lastStep && step >= 2) {
      const newPath = paths[step - 2];
      if (newPath) {
        newPath.style.display = '';
        animatePath(newPath);
      }
    }
    lastStep = step;
    applying = false;
  }

  function goProgressive(animate=true){
    showComplete = false;
    setTimeout(()=>applyProgressive(animate), 40);
    setTimeout(()=>applyProgressive(false), 250);
  }

  document.addEventListener('click',e=>{
    const id = e.target?.id;
    if (id === 'showAllBtn') {
      showComplete = true;
      setTimeout(()=>applyProgressive(false), 30);
      return;
    }
    if (id === 'nextBtn') {
      setTimeout(()=>goProgressive(true), 20);
      return;
    }
    if (id === 'prevBtn' || id === 'presentBtn') {
      setTimeout(()=>goProgressive(false), 20);
      return;
    }
    if (e.target?.closest?.('.projectCard [data-o], .projectCard [data-p]')) {
      showComplete = false;
      lastStep = 1;
      setTimeout(()=>applyProgressive(false), 300);
      setTimeout(()=>applyProgressive(false), 900);
    }
    if (e.target?.closest?.('#map .markerPin')) {
      showComplete = false;
      setTimeout(()=>applyProgressive(false), 80);
    }
  }, true);

  const observer = new MutationObserver(()=>{
    if (document.getElementById('app')?.classList.contains('hidden')) return;
    setTimeout(()=>applyProgressive(false), 0);
  });
  observer.observe(document.body,{childList:true,subtree:true});

  window.addEventListener('load',()=>{
    setTimeout(()=>applyProgressive(false),400);
  });
})();

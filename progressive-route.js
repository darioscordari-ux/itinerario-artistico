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

  function parseDistance(text){
    const s = String(text || '').trim().toLowerCase().replace(',', '.');
    const n = parseFloat(s) || 0;
    return s.includes('km') ? n * 1000 : n;
  }

  function parseTime(text){
    const s = String(text || '').trim().toLowerCase();
    const h = Number((s.match(/(\d+)\s*h/) || [0,0])[1]);
    const m = Number((s.match(/(\d+)\s*min/) || [0,0])[1]);
    return h * 60 + m;
  }

  function formatDistance(m){
    if (m < 1000) return `${Math.round(m)} m`;
    const km = m / 1000;
    return `${km.toFixed(km < 10 ? 1 : 0).replace('.', ',')} km`;
  }

  function formatTime(min){
    const m = Math.max(0, Math.round(min));
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60), rest = m % 60;
    return rest ? `${h} h ${rest} min` : `${h} h`;
  }

  function segmentData(){
    return routeLabels().map((el, i)=>{
      const parts = (el.textContent || '').split('·').map(x=>x.trim());
      return {
        index: i,
        label: parts[0] || `${i+1}→${i+2}`,
        distance: parseDistance(parts[1]),
        time: parseTime(parts[2])
      };
    });
  }

  function updateProgressSummary(){
    const box = document.getElementById('routeSummary');
    if (!box) return;
    const step = currentStep();
    const segs = segmentData();
    if (!segs.length) {
      box.classList.add('hidden');
      return;
    }

    let html = '';
    if (showComplete) {
      const totalD = segs.reduce((s,x)=>s+x.distance,0);
      const totalT = segs.reduce((s,x)=>s+x.time,0);
      html = `<div class="group"><small>INTERO ITINERARIO</small><b>${formatDistance(totalD)} · ${formatTime(totalT)}</b></div>`;
    } else if (step <= 1) {
      html = `<div class="group"><small>PARTENZA</small><b>Tappa 1</b></div><div class="sep"></div><div class="group"><small>PERCORSO SVOLTO</small><b>0 m · 0 min</b></div>`;
    } else {
      const currentSeg = segs[Math.min(step - 2, segs.length - 1)];
      const completed = segs.slice(0, Math.min(step - 1, segs.length));
      const totalD = completed.reduce((s,x)=>s+x.distance,0);
      const totalT = completed.reduce((s,x)=>s+x.time,0);
      html = `<div class="group"><small>TRATTO ${currentSeg.label}</small><b>${formatDistance(currentSeg.distance)} · ${formatTime(currentSeg.time)}</b></div><div class="sep"></div><div class="group"><small>PERCORSO SVOLTO</small><b>${formatDistance(totalD)} · ${formatTime(totalT)}</b></div>`;
    }

    if (box.innerHTML !== html) box.innerHTML = html;
    box.classList.remove('hidden');
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

    paths.forEach((p,i)=>{
      const visible = showComplete || i < step - 1;
      p.style.display = visible ? '' : 'none';
    });
    labels.forEach((l,i)=>{
      const visible = showComplete || i < step - 1;
      l.style.display = visible ? '' : 'none';
    });

    if (!showComplete && animateNew && step > lastStep && step >= 2) {
      const newPath = paths[step - 2];
      if (newPath) {
        newPath.style.display = '';
        animatePath(newPath);
      }
    }

    updateProgressSummary();
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

  const observer = new MutationObserver(mutations=>{
    if (document.getElementById('app')?.classList.contains('hidden')) return;
    if (mutations.every(m=>m.target?.id === 'routeSummary' || m.target?.closest?.('#routeSummary'))) return;
    setTimeout(()=>applyProgressive(false), 0);
  });
  observer.observe(document.body,{childList:true,subtree:true,characterData:true});

  window.addEventListener('load',()=>{
    setTimeout(()=>applyProgressive(false),400);
  });
})();

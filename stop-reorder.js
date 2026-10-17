(()=>{
  'use strict';

  const PROJECT_STORE='itinerarioArtistico.projects.v4';
  const EXTRA_STORE='itinerarioArtistico.slideExtras.v1';
  const ROUTE_STORE='itinerarioArtistico.customRoutes.v1';
  const RICH_STORE='itinerarioArtistico.richText.v1';
  const REOPEN_KEY='itinerarioArtistico.reopenAfterReorder.v1';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function readStore(key,fallback){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}}
  function writeStore(key,value){localStorage.setItem(key,JSON.stringify(value))}

  function currentProject(){
    const title=$('projectName')?.textContent?.trim();
    if(!title)return null;
    return readStore(PROJECT_STORE,[])
      .filter(p=>p?.title===title)
      .sort((a,b)=>(b.updated||0)-(a.updated||0))[0]||null;
  }

  function closeModal(){
    $('modalBack')?.classList.add('hidden');
    if($('modal'))$('modal').innerHTML='';
  }

  function injectCss(){
    if($('iaReorderCss'))return;
    const style=document.createElement('style');
    style.id='iaReorderCss';
    style.textContent=`
      .iaOrderList{display:flex;flex-direction:column;gap:8px;max-height:min(58vh,520px);overflow:auto;padding:4px 2px 8px}
      .iaOrderItem{display:grid;grid-template-columns:30px 34px minmax(0,1fr) auto;gap:8px;align-items:center;padding:10px;border:1px solid #d8d0c5;border-radius:12px;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.035)}
      .iaOrderItem.iaMoving{opacity:.58;box-shadow:0 8px 22px rgba(0,0,0,.14)}
      .iaOrderNumber{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#1f211e;color:#fff;font-weight:800;font-size:13px}
      .iaOrderHandle{display:grid;place-items:center;width:32px;height:38px;border-radius:8px;background:#f2eee8;font-size:21px;cursor:grab;user-select:none;touch-action:none}
      .iaOrderText{min-width:0}.iaOrderText b,.iaOrderText small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.iaOrderText small{opacity:.65;margin-top:2px}
      .iaOrderArrows{display:flex;gap:4px}.iaOrderArrows button{width:34px;height:34px;padding:0}
      .iaOrderNote{margin:7px 0 12px;font-size:12px;opacity:.72}
      .iaToast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99999;background:#1f211e;color:#fff;padding:10px 15px;border-radius:999px;font-weight:700;box-shadow:0 10px 30px rgba(0,0,0,.2)}
      @media(max-width:650px){.iaOrderItem{grid-template-columns:28px 34px minmax(0,1fr);}.iaOrderArrows{grid-column:2/4;justify-content:flex-end}.iaOrderList{max-height:55vh}}
    `;
    document.head.appendChild(style);
  }

  function refreshList(list){
    const items=[...list.querySelectorAll('.iaOrderItem')];
    items.forEach((item,i)=>{
      item.querySelector('.iaOrderNumber').textContent=String(i+1);
      const up=item.querySelector('[data-up]'),down=item.querySelector('[data-down]');
      if(up)up.disabled=i===0;
      if(down)down.disabled=i===items.length-1;
    });
  }

  function moveItem(item,direction){
    const list=item.parentElement;
    if(!list)return;
    if(direction<0&&item.previousElementSibling)list.insertBefore(item,item.previousElementSibling);
    if(direction>0&&item.nextElementSibling)list.insertBefore(item.nextElementSibling,item);
    refreshList(list);
  }

  function wireDragging(list){
    let dragged=null;
    list.querySelectorAll('.iaOrderItem').forEach(item=>{
      item.draggable=true;
      item.addEventListener('dragstart',e=>{
        dragged=item;item.classList.add('iaMoving');
        if(e.dataTransfer){e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',item.dataset.oldIndex||'')}
      });
      item.addEventListener('dragend',()=>{item.classList.remove('iaMoving');dragged=null;refreshList(list)});
      item.querySelector('[data-up]').onclick=()=>moveItem(item,-1);
      item.querySelector('[data-down]').onclick=()=>moveItem(item,1);

      const handle=item.querySelector('.iaOrderHandle');
      let pointerId=null;
      handle.addEventListener('pointerdown',e=>{
        if(e.pointerType==='mouse')return;
        pointerId=e.pointerId;
        dragged=item;
        item.classList.add('iaMoving');
        try{handle.setPointerCapture(pointerId)}catch{}
        e.preventDefault();
      });
      handle.addEventListener('pointermove',e=>{
        if(pointerId!==e.pointerId||!dragged)return;
        const target=document.elementFromPoint(e.clientX,e.clientY)?.closest?.('.iaOrderItem');
        if(!target||target===dragged||target.parentElement!==list)return;
        const r=target.getBoundingClientRect();
        const after=e.clientY>r.top+r.height/2;
        if(after)list.insertBefore(dragged,target.nextElementSibling);
        else list.insertBefore(dragged,target);
        refreshList(list);
        e.preventDefault();
      });
      const finish=e=>{
        if(pointerId!==e.pointerId)return;
        try{handle.releasePointerCapture(pointerId)}catch{}
        pointerId=null;
        item.classList.remove('iaMoving');
        dragged=null;
        refreshList(list);
      };
      handle.addEventListener('pointerup',finish);
      handle.addEventListener('pointercancel',finish);
    });

    list.addEventListener('dragover',e=>{
      if(!dragged)return;
      e.preventDefault();
      const target=e.target.closest?.('.iaOrderItem');
      if(!target||target===dragged)return;
      const r=target.getBoundingClientRect();
      if(e.clientY>r.top+r.height/2)list.insertBefore(dragged,target.nextElementSibling);
      else list.insertBefore(dragged,target);
      refreshList(list);
    });
  }

  function migrateExtras(projectId,order){
    const store=readStore(EXTRA_STORE,{}),old=store?.[projectId];
    if(!old)return;
    const next={};
    order.forEach((oldIndex,newIndex)=>{
      if(Object.prototype.hasOwnProperty.call(old,String(oldIndex)))next[String(newIndex)]=old[String(oldIndex)];
    });
    store[projectId]=next;
    writeStore(EXTRA_STORE,store);
  }

  function migrateIndexRich(projectId,order){
    const store=readStore(RICH_STORE,{}),data=store?.[projectId];
    if(!data)return;
    const next={};
    Object.entries(data).forEach(([key,value])=>{if(!key.startsWith('index:'))next[key]=value});
    order.forEach((oldIndex,newIndex)=>{
      const oldKey='index:'+oldIndex;
      if(Object.prototype.hasOwnProperty.call(data,oldKey))next['index:'+newIndex]=data[oldKey];
    });
    store[projectId]=next;
    writeStore(RICH_STORE,store);
  }

  function clearCustomRoutes(projectId){
    const store=readStore(ROUTE_STORE,{});
    if(store[projectId]){delete store[projectId];writeStore(ROUTE_STORE,store)}
  }

  function saveOrder(project,list){
    const order=[...list.querySelectorAll('.iaOrderItem')].map(x=>Number(x.dataset.oldIndex));
    if(order.some(x=>!Number.isInteger(x)))return;
    const unchanged=order.every((x,i)=>x===i);
    if(unchanged){closeModal();return}

    const projects=readStore(PROJECT_STORE,[]);
    const p=projects.find(x=>x?.id===project.id);
    if(!p||!Array.isArray(p.stops))return;
    const oldStops=p.stops.slice();
    p.stops=order.map(i=>oldStops[i]).filter(Boolean);
    p.updated=Date.now();
    writeStore(PROJECT_STORE,projects);
    migrateExtras(project.id,order);
    migrateIndexRich(project.id,order);
    clearCustomRoutes(project.id);

    sessionStorage.setItem(REOPEN_KEY,JSON.stringify({title:p.title,notice:true}));
    location.reload();
  }

  function openReorder(){
    const project=currentProject();
    if(!project)return;
    const stops=Array.isArray(project.stops)?project.stops:[];
    if(stops.length<2){alert('Servono almeno due tappe per cambiarne l’ordine.');return}

    const rows=stops.map((s,i)=>`
      <div class="iaOrderItem" data-old-index="${i}">
        <span class="iaOrderNumber">${i+1}</span>
        <span class="iaOrderHandle" title="Trascina">☰</span>
        <div class="iaOrderText"><b>${esc(s.title||'Tappa '+(i+1))}</b><small>${esc(s.place||'')}</small></div>
        <div class="iaOrderArrows"><button class="btn" type="button" data-up title="Sposta su">↑</button><button class="btn" type="button" data-down title="Sposta giù">↓</button></div>
      </div>`).join('');

    $('modal').innerHTML=`<h2>Riordina tappe</h2><div class="iaOrderNote">Trascina una tappa con ☰. Su telefono puoi tenerla premuta e spostarla; le frecce ↑ ↓ sono un’alternativa.</div><div id="iaOrderList" class="iaOrderList">${rows}</div><div class="modalFoot"><button class="btn" id="iaOrderCancel">Annulla</button><button class="btn primary" id="iaOrderSave">Salva ordine</button></div>`;
    $('modalBack').classList.remove('hidden');
    const list=$('iaOrderList');
    wireDragging(list);refreshList(list);
    $('iaOrderCancel').onclick=closeModal;
    $('iaOrderSave').onclick=()=>saveOrder(project,list);
  }

  function ensureButton(){
    const edit=$('editStopBtn');
    if(!edit||$('reorderStopsBtn'))return;
    const b=document.createElement('button');
    b.id='reorderStopsBtn';b.className='btn';b.type='button';b.textContent='↕ Riordina';b.title='Cambia l’ordine delle tappe';
    edit.insertAdjacentElement('afterend',b);
    b.onclick=openReorder;
  }

  function showToast(text){
    const t=document.createElement('div');t.className='iaToast';t.textContent=text;document.body.appendChild(t);
    setTimeout(()=>t.remove(),2400);
  }

  function reopenAfterReload(){
    let data=null;
    try{data=JSON.parse(sessionStorage.getItem(REOPEN_KEY)||'null')}catch{}
    if(!data?.title)return;
    sessionStorage.removeItem(REOPEN_KEY);
    setTimeout(()=>{
      const cards=[...document.querySelectorAll('.projectCard')];
      const card=cards.find(c=>c.querySelector('h3')?.textContent?.trim()===data.title);
      const open=card?.querySelector('[data-o]');
      if(open){open.click();if(data.notice)setTimeout(()=>showToast('Ordine delle tappe salvato ✓'),350)}
    },180);
  }

  injectCss();
  window.addEventListener('load',()=>{ensureButton();reopenAfterReload()});
  setTimeout(ensureButton,100);
})();

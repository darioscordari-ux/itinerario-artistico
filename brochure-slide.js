(()=>{
  'use strict';
  const PROJECTS='itinerarioArtistico.projects.v4';
  const slide=document.getElementById('slide');
  const step=document.getElementById('stepText');
  if(!slide||!step)return;

  function read(key,fallback){
    try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}
    catch{return fallback}
  }
  function context(){
    const match=(step.textContent||'').match(/(\d+)\s*\/\s*(\d+)/);
    if(!match)return null;
    const index=Number(match[1])-1,total=Number(match[2]);
    if(index<0||total<1)return null;
    const title=document.getElementById('projectName')?.textContent?.trim()||'';
    const project=read(PROJECTS,[]).filter(p=>p&&p.title===title)
      .sort((a,b)=>(b.updated||0)-(a.updated||0))[0];
    if(!project?.stops?.[index])return null;
    return {index,total,project,stop:project.stops[index]};
  }
  function modeForIncoming(ctx){
    if(ctx.index===0)return null;
    const api=window.__IA_TRANSPORT;
    if(typeof api?.modeForIndex==='function'){
      return api.modeForIndex(ctx.project,ctx.index-1)==='transit'?'transit':'walk';
    }
    return 'walk';
  }
  function incomingLegText(ctx){
    if(ctx.index<=0)return '';
    const from=ctx.index,to=ctx.index+1;
    const label=[...document.querySelectorAll('#map .routeLabel')]
      .map(el=>(el.textContent||'').replace(/\s+/g,' ').trim())
      .find(t=>t.includes(from+'→'+to));
    if(!label)return '';
    const parts=label.split('·').slice(1).map(x=>x.trim()).filter(Boolean);
    return parts.join(' · ');
  }
  function node(tag,className,text){
    const el=document.createElement(tag);
    if(className)el.className=className;
    if(text!==undefined)el.textContent=String(text);
    return el;
  }
  function renderBrochure(){
    if(!document.body.classList.contains('presentation')||
       document.getElementById('app')?.classList.contains('hidden'))return;
    const ctx=context(),title=slide.querySelector('h1'),eyebrow=slide.querySelector('.eyebrow');
    if(!ctx||!title||!eyebrow)return;
    if(slide.querySelector(':scope > .iaBrochureHeader')){
      updateTravel(ctx);
      return;
    }
    slide.classList.add('iaBrochurePage');
    const header=node('div','iaBrochureHeader');
    const brand=node('div','iaBrochureBrand');
    brand.append(node('span','iaBrochureMonogram','A'),node('span','iaBrochureEdition','ITINERARIO ARTISTICO'));
    const issue=node('span','iaBrochureIssue',ctx.project.city?.name||'GUIDA CULTURALE');
    header.append(brand,issue);
    slide.insertBefore(header,eyebrow);

    const heading=node('div','iaBrochureOverline');
    heading.append(node('span','iaBrochureSectionName','GUIDA DEI LUOGHI'),node('span','iaBrochureFolio',String(ctx.index+1).padStart(2,'0')+' / '+String(ctx.total).padStart(2,'0')));
    slide.insertBefore(heading,title);

    const section=node('div','iaBrochureTextHeading');
    const textLabel=node('strong','iaBrochureTextLabel');
    section.append(textLabel,node('span','iaBrochureTextRule'));
    const description=slide.querySelector('.desc');
    if(description)slide.insertBefore(section,description);

    const footer=node('div','iaBrochureFooter');
    const left=node('div','iaBrochureTravel');
    left.append(node('small','iaBrochureTravelLabel',ctx.index===0?'PUNTO DI PARTENZA':'TRATTO PERCORSO'));
    left.append(node('strong','iaBrochureTravelValue',''));
    const right=node('div','iaBrochurePageNumber');
    right.append(node('span','', 'TAPPA'),node('strong','', String(ctx.index+1).padStart(2,'0')));
    footer.append(left,right);
    slide.appendChild(footer);
    updateTravel(ctx);
  }
  function updateTravel(ctx){
    const value=slide.querySelector('.iaBrochureTravelValue');
    if(!value)return;
    if(ctx.index===0){value.textContent=ctx.stop.place||'Inizio dell’itinerario';return;}
    const mode=modeForIncoming(ctx);
    const label=mode==='transit'?'🚌 Mezzo pubblico':'🚶 A piedi';
    const metric=incomingLegText(ctx);
    value.textContent=label+(metric?' · '+metric:'');
  }
  let timer=null;
  function schedule(){
    clearTimeout(timer);
    timer=setTimeout(renderBrochure,85);
  }
  const observer=new MutationObserver(schedule);
  observer.observe(slide,{childList:true});
  const bodyObserver=new MutationObserver(schedule);
  bodyObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('#nextBtn,#prevBtn,#presentBtn,.projectCard [data-p],.projectCard [data-o],.leaflet-marker-icon')) {
      setTimeout(schedule,90);
      setTimeout(schedule,1000);
    }
  });
  window.addEventListener('load',schedule);
  schedule();
})();
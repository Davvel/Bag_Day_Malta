(()=>{
 'use strict';
 let entries=null,expires=0,pending=null;
 const key=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[ħĦ]/g,'h').replace(/[^a-z0-9]/gi,'').toLowerCase();
 function getLocality(locality){
  if(Date.now()>=expires&&!pending){
   pending=fetch('https://api.bagdaymalta.eu/api/v1/concerns/home',{cache:'no-store',signal:AbortSignal.timeout(7000)})
    .then(response=>response.ok?response.json():Promise.reject(Error('Unavailable')))
    .then(data=>{entries=Array.isArray(data.items)?data.items:[];expires=Date.now()+30000})
    .catch(()=>{entries=[];expires=Date.now()+15000})
    .finally(()=>{pending=null});
  }
  const find=()=>entries?.find(item=>key(item.name)===key(locality));
  return pending?pending.then(find):Promise.resolve(find());
 }
 function append(locality,actions){
  const add=item=>{
   if(!item||!['active','paused'].includes(item.state)||!actions.isConnected||actions.querySelector('.council-concern-link'))return;
   const link=document.createElement('a');link.className='council-link council-concern-link';
   link.href='/concerns/?'+new URLSearchParams({locality:item.locality_id});
   link.setAttribute('aria-label','Voice a Concern, '+item.open_count+' open in '+locality);
   const visual=document.createElement('span');visual.className='council-concern-icon';visual.setAttribute('aria-hidden','true');
   visual.innerHTML='<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 14-4v12L3 13V9Zm14-4 3-2v16l-3-2M5 14l2 6h3l-2-5"/></svg>';
   const count=document.createElement('small');count.textContent=String(item.open_count);visual.append(count);
   const caption=document.createElement('span');caption.className='council-concern-caption';caption.textContent='Voice a Concern';
   link.append(visual,caption);actions.append(link);actions.classList.add('has-concerns');actions.style.setProperty('--council-action-count',String(actions.childElementCount));
  };
  getLocality(locality).then(add);
 }
 window.BAG_DAY_CONCERNS={getLocality,append};
})();

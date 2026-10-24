/* Pinch scale is read-only. One fresh-document attempt, then a manual fallback. */
(() => {
 'use strict';
 const key='bag-day-game-zoom-attempt-v1';
 const magnified=()=>Number(window.visualViewport?.scale)>1.01;
 let panel=null,ready=null;
 function fallback(){
  if(!panel){
   panel=document.createElement('dialog');panel.id='gameZoomHelp';
   panel.setAttribute('aria-labelledby','gameZoomTitle');
   panel.innerHTML='<h2 id="gameZoomTitle">Zoom out to play</h2><p>The game cannot be played while zoomed in. Pinch the screen to zoom out fully.</p><div><button type="button" id="zoomHelpClose">Back to game menu</button><button type="button" id="zoomHelpReady">I have zoomed out</button></div>';
   document.body.append(panel);ready=panel.querySelector('#zoomHelpReady');
   panel.querySelector('#zoomHelpClose').onclick=()=>panel.close();
   ready.onclick=()=>{if(!magnified())panel.close();};
   panel.addEventListener('close',()=>{window.BAG_DAY_BACK?.sync();document.getElementById('startGame')?.focus({preventScroll:true});});
   function fit(){
    if(!panel.open)return;
    const v=window.visualViewport;
    panel.style.width=Math.min(340,(v?.width||innerWidth)-24)+'px';
    panel.style.maxHeight=Math.max(120,(v?.height||innerHeight)-24)+'px';
    panel.style.left=(v?.offsetLeft||0)+12+'px';panel.style.top=(v?.offsetTop||0)+12+'px';
    ready.disabled=magnified();
   }
   window.visualViewport?.addEventListener('resize',fit);
   window.visualViewport?.addEventListener('scroll',fit);
   panel.fit=fit;
   window.BAG_DAY_BACK?.register('zoomHelp',{isOpen:()=>panel.open,close:()=>panel.close()});
  }
  if(!panel.open)panel.showModal();panel.fit();window.BAG_DAY_BACK?.sync();
 }
 function guard(intent){
  if(!magnified())return false;
  // Changing documents gives initial-scale=1 another opportunity without
  // restricting accessibility zoom or modifying the remembered Home document.
  try{
   const token=String(Date.now());
   sessionStorage.setItem(key,JSON.stringify({...intent,token,created:Date.now()}));
   const url=new URL(location.href);url.searchParams.set('zoomAttempt',token);
   location.replace(url.href);
  }catch{fallback();}
  return true;
 }
 function restore(start){
  const url=new URL(location.href),token=url.searchParams.get('zoomAttempt');
  if(!token)return;
  let intent=null;
  try{intent=JSON.parse(sessionStorage.getItem(key)||'null');sessionStorage.removeItem(key);}catch{}
  url.searchParams.delete('zoomAttempt');history.replaceState(history.state,'',url.href);
  // Allow the new page's viewport to settle before deciding whether help is needed.
  setTimeout(()=>{
   if(!intent||intent.token!==token||Date.now()-intent.created>30000){if(magnified())fallback();return;}
   if(magnified())fallback();else start(intent.next,intent.isPractice===true,intent.retryPlan||null);
  },350);
 }
 window.BAG_DAY_GAME_ZOOM={guard,restore};
})();

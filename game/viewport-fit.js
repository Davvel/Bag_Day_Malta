/* Game-only visible-height synchronization. Native pinch remains independent. */
(() => {
 'use strict';
 const root=document.documentElement;
 let lastHeight=0,queued=false;
 function sync(){
  const v=window.visualViewport,scale=Number(v?.scale)||1;
  if(Math.abs(scale-1)>0.01)return; // retain the established layout while magnified
  const height=Math.round(v?.height||window.innerHeight||root.clientHeight);
  if(!Number.isFinite(height)||height<=0)return;
  root.dataset.gameCompact=String(height<670);
  if(height===lastHeight)return;
  lastHeight=height;root.style.setProperty('--game-height',height+'px');
  window.dispatchEvent(new Event('bag-day-game-layout'));
 }
 function schedule(){
  sync();
  if(queued)return;queued=true;
  requestAnimationFrame(()=>{queued=false;sync();});
 }
 function settle(){schedule();[100,300,700].forEach(delay=>setTimeout(schedule,delay));}
 window.BAG_DAY_GAME_LAYOUT={sync};
 sync(); // head script: establish the height before the first layout
 window.addEventListener('resize',schedule);
 window.visualViewport?.addEventListener('resize',schedule);
 window.visualViewport?.addEventListener('scroll',schedule);
 window.addEventListener('pageshow',settle);
 window.addEventListener('load',settle);
 window.addEventListener('orientationchange',settle);
 document.addEventListener('DOMContentLoaded',settle);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)settle();});
 document.fonts?.ready.then(schedule);
})();

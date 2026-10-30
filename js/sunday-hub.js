/* Sunday discovery cards. Existing routes, game switch and launcher stay authoritative. */
(()=>{
 'use strict';
 const calendar='<svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><rect x="4" y="9" width="34" height="33" rx="6" fill="#27a96a"/><path d="M4 20h34" stroke="#dbf6df" stroke-width="3"/><path d="M13 5v10m16-10v10" stroke="#167448" stroke-width="4" stroke-linecap="round"/><path d="M12 27h5m6 0h5m-16 7h5" stroke="#dbf6df" stroke-width="4"/><circle cx="35" cy="35" r="11" fill="#079777" stroke="#e2f5df" stroke-width="2"/><path d="M32 31v8m6-8v8" stroke="white" stroke-width="3" stroke-linecap="round"/></svg>';
 window.BAG_DAY_SUNDAY={markup(date,today,locality){
  const notice=new URL('noticeboard/',location.href);notice.searchParams.set('locality',locality);
  const message=today?'No waste collection today':'No waste collection on Sunday';
  return `<section class="sunday-hub" aria-label="Sunday at Bag Day"><div class="sunday-rest">${calendar}<div><h2>${message}</h2><p>It’s Sunday—give, play and catch up locally.</p></div></div><div class="sunday-features"><a class="sunday-card sunday-give" href="reuse/" data-sunday-feature="reuse"><span class="sunday-art" aria-hidden="true"></span><span class="sunday-copy"><strong>Too good to throw away?</strong><span>Give it away—or find something useful.</span><span class="sunday-action">Browse Give Away <span aria-hidden="true">›</span></span></span></a><button type="button" class="sunday-card sunday-game" data-sunday-feature="game" hidden><span class="sunday-art" aria-hidden="true"></span><span class="sunday-copy"><strong>Got a minute?</strong><span>Test your waste-sorting skills.</span><span class="sunday-action">Play the Sorting Game <span aria-hidden="true">›</span></span></span></button><a class="sunday-card sunday-notices" href="${notice.href}" data-sunday-feature="noticeboard"><span class="sunday-art" aria-hidden="true"></span><span class="sunday-copy"><strong>Stay in the local loop</strong><span>Council, parish and police notices.</span><span class="sunday-action">View Community Notices <span aria-hidden="true">›</span></span></span></a></div></section>`;
 }};
 const launcher=document.getElementById('gameModeButton');
 function syncGame(){const card=document.querySelector('.sunday-game');if(card)card.hidden=!launcher||launcher.hidden;}
 new MutationObserver(syncGame).observe(launcher,{attributes:true,attributeFilter:['hidden']});
 new MutationObserver(syncGame).observe(document.getElementById('collectionCardBody'),{childList:true});
 document.getElementById('collectionCardBody').addEventListener('click',event=>{
  const card=event.target.closest('[data-sunday-feature]');if(!card)return;
  const feature=card.dataset.sundayFeature;
  window.BAG_DAY_ANALYTICS?.event('sunday_feature_click',{feature,entry_point:'sunday'});
  if(feature==='reuse')window.BAG_DAY_ANALYTICS?.event('reuse_entry_click',{entry_point:'sunday'});
  if(feature==='game')launcher.click();
 });
})();

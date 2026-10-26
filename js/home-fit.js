/* Keep home adverts in view and spend the remaining portrait space on artwork. */
(()=>{
 const dashboard=document.getElementById('dashboard'),app=document.querySelector('#appContent .app');
 if(!dashboard||!app)return;
 const dock=document.createElement('div');dock.id='homeSponsorDock';
 const sponsor=document.getElementById('sponsorPanel');sponsor.before(dock);dock.append(sponsor);
 let frame=0;
 const queue=()=>{if(!frame)frame=requestAnimationFrame(fit);};
 function fit(){
  frame=0;
  const community=document.getElementById('communityPanel');if(community&&community.parentElement!==dock)dock.prepend(community);
  const visible=!dashboard.hidden&&[...dock.children].some(n=>!n.hidden&&n.childElementCount);
  if(dock.hidden===visible)dock.hidden=!visible;
  const dockHeight=visible?Math.ceil(dock.getBoundingClientRect().height):0;
  app.style.setProperty('--home-dock-height',dockHeight+'px');
  if(dashboard.hidden)return;
  const viewport=window.visualViewport;
  // Native magnification keeps its natural, pannable document layout.
  if(viewport&&viewport.scale>1.05)return;
  const figures=dashboard.querySelector('.collection-figures');
  if(!figures||innerWidth>=560)return;
  dashboard.classList.remove('home-hide-battery');
  dashboard.style.removeProperty('--home-art-height');
  const art=figures.querySelector('.bag-button');if(!art)return;
  const preferred=art.getBoundingClientRect().height;
  const height=viewport?.height||innerHeight;
  const budget=()=>{
   const nodes=[document.getElementById('councilPanel'),document.getElementById('locationNotice'),document.getElementById('usageStreakArea'),document.getElementById('donationCard')];
   const bottom=Math.max(figures.getBoundingClientRect().bottom,...nodes.filter(n=>n&&n.getClientRects().length).map(n=>n.getBoundingClientRect().bottom));
   const total=bottom-app.getBoundingClientRect().top+parseFloat(getComputedStyle(app).paddingBottom);
   return preferred+height-total;
  };
  let target=budget();
  if(target<120){dashboard.classList.add('home-hide-battery');target=budget();}
  dashboard.style.setProperty('--home-art-height',Math.floor(Math.max(100,Math.min(preferred,target)))+'px');
 }
 const resize=new ResizeObserver(queue);resize.observe(app);resize.observe(dock);
 const mutations=new MutationObserver(queue);mutations.observe(dashboard,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
 window.addEventListener('resize',queue);window.visualViewport?.addEventListener('resize',queue);
 window.addEventListener('pageshow',queue);document.fonts?.ready.then(queue);queue();
})();

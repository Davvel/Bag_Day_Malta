import {today} from './shared.mjs?v=1.1.116';
let observed=false;
export function syncNoticeboardSponsors(locality){
 const dock=document.querySelector('#sponsorDock'),panel=document.querySelector('#sponsorPanel');if(!dock||!panel)return;
 const size=()=>{dock.hidden=panel.hidden;document.documentElement.style.setProperty('--noticeboard-dock-height',dock.hidden?'0px':dock.getBoundingClientRect().height+'px')};
 if(!observed){observed=true;new MutationObserver(size).observe(panel,{attributes:true,attributeFilter:['hidden'],childList:true});if(window.ResizeObserver)new ResizeObserver(size).observe(dock);window.addEventListener('bag-day-sponsors-ready',size);window.addEventListener('resize',size)}
 window.BAG_DAY_SPONSORS?.render(locality,new Date(today()+'T00:00:00Z'));size();
}

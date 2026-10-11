/* One browser history entry per open panel. Home keeps normal Back behavior. */
(() => {
 'use strict';
 const layers=new Map();let stack=[],busy=false;
 const state=keys=>({...history.state,bagDayPanels:keys});
 function actual(){return [...layers].filter(([,layer])=>layer.isOpen()).map(([id])=>id);}
 function sync(){
  if(busy)return;
  const visible=actual(),removed=stack.filter(id=>!visible.includes(id));
  if(removed.length){busy=true;history.go(-removed.length);return;}
  for(const id of visible){if(!stack.includes(id)){stack.push(id);history.pushState(state([...stack]),'');}}
 }
 window.BAG_DAY_BACK={register(id,layer){layers.set(id,layer);sync();},sync};
 window.addEventListener('popstate',async event=>{
  const desired=Array.isArray(event.state?.bagDayPanels)?event.state.bagDayPanels:[];
  const closing=stack.filter(id=>!desired.includes(id)).reverse();stack=stack.filter(id=>desired.includes(id));busy=true;
  for(const id of closing){const layer=layers.get(id);if(layer?.isOpen())await layer.close();}
  busy=false;sync();
 });
 new MutationObserver(sync).observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['hidden']});
 // A refreshed page starts with its visible UI, without stale modal entries.
 history.replaceState(state([]),'');
})();

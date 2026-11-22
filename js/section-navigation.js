/* Public section history: browsing replaces state; each dialog adds one Back step. */
(() => {
 'use strict';
 const tracked=()=>[...document.querySelectorAll('dialog[open]')].filter(node=>!['noticeDialog','dayDialog'].includes(node.id));
 let stack=[],busy=false,serial=0;
 const nodes=new Map();
 const state=ids=>({...history.state,sectionDialogs:ids});
 const steps=()=>Number.isInteger(history.state?.bagDayHomeSteps)?history.state.bagDayHomeSteps:0;
 try{const from=new URL(document.referrer);if(from.origin===location.origin&&['/','/index.html'].includes(from.pathname)&&!steps())history.replaceState({...history.state,bagDayHomeSteps:1},'')}catch{}
 history.replaceState(state([]),'');
 function sync(){
  if(busy)return;
  const open=tracked();
  const removed=stack.filter(id=>!open.includes(nodes.get(id)));
  if(removed.length){busy=true;history.go(-removed.length);return}
  for(const node of open){
   let id=node.dataset.sectionDialog;
   if(!id){id='dialog-'+(++serial);node.dataset.sectionDialog=id;nodes.set(id,node)}
   if(!stack.includes(id)){stack.push(id);history.pushState({...state([...stack]),bagDayHomeSteps:steps()?steps()+1:0},'')}
  }
 }
 const canClose=node=>!node?.bagDayCanClose||node.bagDayCanClose();
 window.addEventListener('popstate',event=>{
  const desired=event.state?.sectionDialogs||[];
  const closing=stack.filter(id=>!desired.includes(id)).reverse();busy=true;
  if(closing.some(id=>nodes.get(id)?.open&&!canClose(nodes.get(id)))){history.go(1);return}
  for(const id of closing){const node=nodes.get(id);if(node?.open)node.close()}
  stack=[...desired];
  for(const id of desired){const node=nodes.get(id);if(node?.isConnected&&!node.open)node.showModal()}
  busy=false;sync();
 });
 new MutationObserver(sync).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
 document.addEventListener('click',event=>{
  const link=event.target.closest?.('a.quick-home');
  if(!link||event.defaultPrevented||event.button>0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  event.preventDefault();
  if(tracked().reverse().some(node=>!canClose(node)))return;
  window.dispatchEvent(new Event('bag-day-save-section'));
  try{sessionStorage.setItem('bag-day-return-home-v1',String(Date.now()))}catch{}
  const count=steps();busy=true;for(const node of tracked().reverse())node.close();if(count>0&&count<history.length)history.go(-count);else location.replace(link.href);
 },true);
 window.addEventListener('pageshow',()=>{busy=false;sync()});
})();

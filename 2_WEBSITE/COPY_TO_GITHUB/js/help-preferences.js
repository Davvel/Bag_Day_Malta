(function(root){
 'use strict';
 const KEY='bag-day-help-animations-v1',TIP_KEY='bag-day-feature-tips-v1',TIP_INTERVAL_MS=3*86400000;
 let memory=true,memoryTip={};
 function enabled(){try{const saved=root.localStorage.getItem(KEY);return saved===null?memory:saved!=='false'}catch{return memory}}
 function sync(){root.document?.body?.classList.toggle('help-disabled',!enabled());root.dispatchEvent?.(new Event('bag-day-help-changed'))}
 function setEnabled(value){memory=!!value;try{root.localStorage.setItem(KEY,String(memory))}catch{}sync()}
 function tipState(){try{return JSON.parse(root.localStorage.getItem(TIP_KEY)||'null')||memoryTip}catch{return memoryTip}}
 function nextTip(state,now,available){
  if(Number.isFinite(state.lastAt)&&state.lastAt<=now&&now-state.lastAt<TIP_INTERVAL_MS)return null;
  const order=['game','calendar','reuse'],start=Number.isInteger(state.next)?state.next%order.length:0;
  for(let i=0;i<order.length;i++){const index=(start+i)%order.length;if(available.includes(order[index]))return {feature:order[index],next:(index+1)%order.length}}
  return null;
 }
 function markTip(choice,now=Date.now()){memoryTip={lastAt:now,next:choice.next};try{root.localStorage.setItem(TIP_KEY,JSON.stringify(memoryTip))}catch{}}
 root.addEventListener?.('storage',e=>{if(e.key===KEY||e.key===null){if(e.key===null)memory=true;sync()}});
 const api={enabled,setEnabled,tipState,nextTip,markTip,TIP_INTERVAL_MS};root.BAG_DAY_HELP=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);

(function(root){
 'use strict';
 const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Malta',year:'numeric',month:'2-digit',day:'2-digit'});
 function dayKey(now=new Date()){const p=formatter.formatToParts(now),get=t=>p.find(v=>v.type===t).value;return get('year')+'-'+get('month')+'-'+get('day')}
 function eligible(adverts,now=new Date()){const day=dayKey(now);return adverts.filter(a=>a.start_date<=day&&a.end_date>=day)}
 function plan(paid,community,capacity,isHome,now=new Date()){
  const free=eligible(community,now),sunday=new Date(dayKey(now)+'T00:00:00Z').getUTCDay()===0;
  const separate=isHome&&sunday;
  const mixed=!separate&&paid.length<capacity&&free.length>0;
  return {primary:{mode:mixed?(paid.length?'mixed':'community'):'paid',entries:mixed?[...paid,...free]:paid},community:separate?free:[],sunday};
 }
 function nextMidnight(now=new Date()){
  const day=dayKey(now);let lo=now.getTime(),hi=lo+27*3600000;
  while(hi-lo>1){const mid=Math.floor((lo+hi)/2);if(dayKey(new Date(mid))===day)lo=mid;else hi=mid}return hi;
 }
 class FreePicker {
  constructor(state={},save=()=>{},random=Math.random){this.queue=Array.isArray(state.queue)?state.queue.filter(x=>typeof x==='string'):[];this.last=typeof state.last==='string'?state.last:'';this.save=save;this.random=random}
  persist(){this.save({queue:this.queue,last:this.last})}
  next(ids){
   if(!ids.length)return null;
   this.queue=this.queue.filter((id,i,a)=>ids.includes(id)&&a.indexOf(id)===i&&!(ids.length>1&&id===this.last));
   if(!this.queue.length){
    this.queue=[...ids];for(let i=this.queue.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[this.queue[i],this.queue[j]]=[this.queue[j],this.queue[i]]}
    if(this.queue.length>1&&this.queue[0]===this.last){const i=this.queue.findIndex(id=>id!==this.last);[this.queue[0],this.queue[i]]=[this.queue[i],this.queue[0]]}
   }
   const id=this.queue.shift();this.last=id;this.persist();return id;
  }
  seen(id){this.queue=this.queue.filter(v=>v!==id);this.last=id;this.persist()}
 }
 const api={dayKey,eligible,plan,nextMidnight,FreePicker};root.BAG_DAY_ADVERT_POLICY=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);

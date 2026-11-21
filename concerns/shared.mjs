import {API,esc} from '../noticeboard/shared.mjs?v=1.1.159';
export {esc};
export const labels={pending:'Awaiting moderation',collecting:'Collecting support',ready:'Ready for council action',in_progress:'Action taken',completed:'Closed — Completed',cannot_complete:'Closed — Cannot complete',declined:'Declined'};
export const channelCopy={
 inactive:'The homepage button is hidden. New submissions are closed.',
 active:'The homepage button is visible. Residents can submit new concerns.',
 paused:'New submissions are temporarily paused. Residents can still vote and follow updates.'
};
const day=86400000;
export const standing=item=>['collecting','ready','in_progress'].includes(item.status);
export const date=value=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Malta',dateStyle:'medium'}).format(new Date(value));
export function age(item,time=Date.now()){
 if(item.closed_at)return 'Submitted '+date(item.submitted_at)+' · Closed '+date(item.closed_at);
 const days=Math.max(0,Math.floor((time-Date.parse(item.submitted_at))/day));
 return !days?'Submitted today':`Submitted ${days} day${days===1?'':'s'} ago`;
}
export function support(item){
 if(item.status!=='collecting')return item.status==='pending'||item.status==='declined'?'—':`${item.upvotes} upvote${item.upvotes===1?'':'s'}`;
 const n=Math.min(3,item.upvotes);
 return `<strong>${n} of 3 upvotes</strong><span class="concern-marks" aria-hidden="true">${[0,1,2].map(i=>`<i ${i<n?'class="filled"':''}></i>`).join('')}</span>`;
}
export function deadline(item,time=Date.now()){
 const days=Math.max(0,Math.ceil((Date.parse(item.council_due_at)-time)/day));
 return days?`Goes to the council at 3 upvotes or in ${days} day${days===1?'':'s'}.`:'The concern is due to reach the council.';
}
export const previewText=text=>text.length>95?text.slice(0,92).trimEnd()+'…':text;
export const boardURL=(locality,archive=false)=>'/concerns/?'+new URLSearchParams({locality,...(archive?{archive:'1'}:{})});
export const itemURL=id=>new URL('/concerns/?'+new URLSearchParams({concern:id}),location.origin).href;
export async function request(path,{method='GET',body,token}={}){
 let response;
 try{
  response=await fetch(API+path,{method,credentials:token?'omit':'include',cache:'no-store',signal:AbortSignal.timeout(22000),
   headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},
   ...(body?{body:JSON.stringify(body)}:{})});
 }catch{throw Error('Could not connect to Bag Day. Check your connection and try again.')}
 let value;
 try{value=await response.json()}catch{throw Error('Voice a Concern is temporarily unavailable.')}
 if(!response.ok)throw Object.assign(Error(value.error?.message||'Please try again.'),{status:response.status,code:value.error?.code});
 return value;
}
export async function shareConcern(id){
 const url=itemURL(id);
 if(navigator.share){
  try{await navigator.share({title:'Voice a Concern · Bag Day Malta',url});return 'Concern shared.'}
  catch(error){if(error.name==='AbortError')return ''}
 }
 try{await navigator.clipboard.writeText(url);return 'Concern link copied.'}
 catch{return url}
}
export async function revealPhoto(container,path,token){
 container.textContent='Loading photo…';
 try{
  const {url}=await request(path,{token});
  const image=document.createElement('img');image.alt='Photo of the concern';
  const loaded=new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject});
  image.src=url;await loaded;if(image.decode)await image.decode();if(!container.isConnected)return false;container.replaceChildren(image);return true;
 }catch{container.textContent='Photo temporarily unavailable.';return false;}
}

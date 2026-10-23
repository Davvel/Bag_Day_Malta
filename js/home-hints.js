(() => {
 const key='bag-day-home-hints-v1';let saved;try{saved=JSON.parse(localStorage.getItem(key)||'null');}catch(_){}
 saved=saved||{firstUse:Date.now(),launches:0,lastInvite:0};saved.launches=(saved.launches||0)+1;
 saved.hintsSeen=Array.isArray(saved.hintsSeen)?saved.hintsSeen.filter(n=>[0,1,2].includes(n)):[];
 function store(){try{localStorage.setItem(key,JSON.stringify(saved));}catch(_){}}store();
 let active=false,stage=0,nextAt=Date.now()+2000,animations=[],glove=null,generation=0,bubble=null,inviteTimer=null,inviteAttempt=Date.now()+8000;
 const help=()=>window.BAG_DAY_HELP?.enabled()!==false;
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const ready=()=>help()&&!document.hidden&&!document.getElementById('dashboard')?.hidden&&!document.getElementById('appContent')?.inert&&document.getElementById('splashScreen')?.hidden&&[...document.querySelectorAll('.overlay')].every(n=>n.hidden)&&!window.BAG_INFO?.isOpen()&&!document.getElementById('bagArea')?.hasAttribute('data-hint-moving')&&document.getElementById('bagArea')?.getAttribute('aria-busy')!=='true';
 function clear(){generation++;animations.forEach(a=>a.cancel());animations=[];glove?.remove();glove=null;active=false;}
 function stop(event){
  if(bubble&&!bubble.contains(event.target))dismiss();
  if(!ready())return;
  clear();nextAt=Date.now()+15000;

 }
 for(const event of ['pointerdown','touchstart','click','keydown','wheel'])document.addEventListener(event,stop,{capture:true,passive:true});
 function dismiss(){clearTimeout(inviteTimer);bubble?.remove();bubble=null;}
 function hint(index){
  const target=document.querySelector(index===0?'.collection-figures .bag-button':index===1?'#nextDay':'#bagArea');
  if(!target||target.disabled||!target.getClientRects().length)return false;
  const rect=target.getBoundingClientRect(),duration=index===2?2200:index===0?1800:1600;
  glove=document.createElement('img');glove.src='icons/hint-hand.svg';glove.className='sequence-glove';glove.alt='';glove.setAttribute('aria-hidden','true');
  const size=index===2?112:70;glove.style.width=size+'px';glove.style.left=(index===2?rect.left+rect.width*.58:rect.left+rect.width*.5-size*.35)+'px';glove.style.top=(index===2?rect.top+rect.height*.52:rect.top+rect.height*.45)+'px';document.body.append(glove);
  active=true;const token=++generation;
  if(index===2){animations=[target.animate([{transform:'translateX(0)'},{transform:'translateX(-55px)',offset:.55},{transform:'translateX(0)'}],{duration,easing:'ease-in-out'}),glove.animate([{opacity:0,transform:'translateX(20px)'},{opacity:1,transform:'translateX(0)',offset:.2},{opacity:1,transform:'translateX(-55px)',offset:.55},{opacity:0,transform:'translateX(-55px)',offset:.75},{opacity:0}],{duration})];}
  else {animations=[glove.animate([{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'translateY(0)',offset:.25},{opacity:1,transform:'translateY(-8px) scale(.92)',offset:.5},{opacity:1,transform:'translateY(0)',offset:.7},{opacity:0,transform:'translateY(15px)'}],{duration}),target.animate([{transform:'scale(1)'},{transform:'scale(1)',offset:.4},{transform:'scale(.95)',offset:.5},{transform:'scale(1)',offset:.65},{transform:'scale(1)'}],{duration})];}
  animations[0].onfinish=()=>{if(token!==generation)return;clear();if(!saved.hintsSeen.includes(index)){saved.hintsSeen.push(index);store();}
   stage=(index+1)%3;nextAt=Date.now()+(stage===0?45000:3000);};return true;
 }
 setInterval(()=>{
  const now=Date.now();
  if(!ready()){if(active){clear();stage=0;}nextAt=now+2000;inviteAttempt=now+8000;dismiss();return;}
  if(reduced()){if(active)clear();}
  else if(!bubble&&!active&&now>=nextAt){if(!hint(stage)){stage=(stage+1)%3;nextAt=now+2000;}}
 const play=document.getElementById('gameModeButton'),reuse=document.getElementById('reuseModeButton');
 const available=['calendar',...(!play?.hidden?['game']:[]),...(reuse?['reuse']:[])];
 const choice=window.BAG_DAY_HELP?.nextTip(window.BAG_DAY_HELP.tipState(),now,available);
 if(choice&&now>=inviteAttempt&&!bubble){
  const text={game:'Play The 1 Minute Sorting Game',calendar:'Use the Calendar to see the month',reuse:'Click REUSE to find free items available near you.'};
  clear();nextAt=now+20000;
  bubble=document.createElement('aside');bubble.className='feature-tip';bubble.setAttribute('aria-label','Bag Day tip');
  const action=document.createElement('button');action.type='button';action.className='feature-tip-action';
  if(choice.feature==='reuse'){const icon=document.createElement('img');icon.src='icons/reuse-free-stuff-v1.png';icon.alt='';action.append(icon)}
  const label=document.createElement('span');label.textContent=text[choice.feature];action.append(label);
  const close=document.createElement('button');close.type='button';close.className='feature-tip-close';close.textContent='×';close.setAttribute('aria-label','Dismiss tip');close.onclick=dismiss;
  action.onclick=()=>{const feature=choice.feature;dismiss();window.BAG_DAY_ANALYTICS?.event('help_tip_click',{feature});document.getElementById({game:'gameModeButton',calendar:'dateButton',reuse:'reuseModeButton'}[feature])?.click()};
  bubble.append(action,close);document.body.append(bubble);
  const top=document.querySelector('.topbar')?.getBoundingClientRect().bottom||70;bubble.style.top=Math.max(8,top+7)+'px';
  const box=bubble.getBoundingClientRect();
  if([...document.querySelectorAll('.sponsor-panel:not([hidden])')].some(panel=>{const r=panel.getBoundingClientRect();return r.left<box.right&&r.right>box.left&&r.top<box.bottom&&r.bottom>box.top})){dismiss();inviteAttempt=now+30000;return;}
  window.BAG_DAY_HELP.markTip(choice,now);window.BAG_DAY_ANALYTICS?.event('help_tip_shown',{feature:choice.feature});
  if(!reduced())bubble.animate([{opacity:0,transform:'translate(-50%,-5px)'},{opacity:1,transform:'translate(-50%,0)'}],{duration:250});
  inviteTimer=setTimeout(()=>{if(!bubble)return;const current=bubble;if(reduced()){dismiss();return}current.animate([{opacity:1},{opacity:0}],{duration:300}).onfinish=()=>{if(bubble===current)dismiss()}},9000);
 }

 },200);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){clear();dismiss();stage=0;}nextAt=Date.now()+2000;});
 window.addEventListener('resize',()=>{clear();dismiss();nextAt=Date.now()+2000;});
 window.addEventListener('bag-day-help-changed',()=>{clear();dismiss();nextAt=Date.now()+2000;});
 document.addEventListener('click',e=>{if(e.target.closest('#gameModeButton'))dismiss();});
})();

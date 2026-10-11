(() => {
 const key='bag-day-home-hints-v1';let saved;try{saved=JSON.parse(localStorage.getItem(key)||'null');}catch(_){}
 saved=saved||{firstUse:Date.now(),launches:0,lastInvite:0};saved.launches=(saved.launches||0)+1;
 saved.hintsSeen=Array.isArray(saved.hintsSeen)?saved.hintsSeen.filter(n=>[0,1,2].includes(n)):[];
 function store(){try{localStorage.setItem(key,JSON.stringify(saved));}catch(_){}}store();
 let interacted=false,homeInteraction=false,active=false,stage=0,nextAt=Date.now()+2000,animations=[],glove=null,generation=0,bubble=null,inviteTimer=null;
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const ready=()=>!document.hidden&&!document.getElementById('dashboard')?.hidden&&!document.getElementById('appContent')?.inert&&document.getElementById('splashScreen')?.hidden&&[...document.querySelectorAll('.overlay')].every(n=>n.hidden)&&!window.BAG_INFO?.isOpen()&&!document.getElementById('bagArea')?.hasAttribute('data-hint-moving')&&document.getElementById('bagArea')?.getAttribute('aria-busy')!=='true';
 function clear(){generation++;animations.forEach(a=>a.cancel());animations=[];glove?.remove();glove=null;active=false;}
 function stop(){
  if(!ready())return;
  homeInteraction=true;clear();nextAt=Date.now()+2000;
  if(saved.hintsSeen.length===3)interacted=true;
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
   stage=(index+1)%3;if(homeInteraction&&saved.hintsSeen.length===3)interacted=true;nextAt=Date.now()+2000;};return true;
 }
 setInterval(()=>{
  const now=Date.now(),age=(now-saved.firstUse)/86400000;
  if(!ready()){if(active){clear();stage=0;}nextAt=now+2000;dismiss();return;}
  if(interacted||age>=30||reduced()){if(active)clear();}
  else if(!active&&now>=nextAt){if(homeInteraction&&saved.hintsSeen.length<3&&saved.hintsSeen.includes(stage))stage=[0,1,2].find(n=>!saved.hintsSeen.includes(n));if(!hint(stage)){stage=(stage+1)%3;nextAt=now+2000;}}
 const play=document.getElementById('gameModeButton');if(age<60&&!play?.hidden&&now-saved.lastInvite>=5*86400000&&!bubble){saved.lastInvite=now;store();bubble=document.createElement('button');bubble.className='game-invitation';bubble.textContent='Play the Sorting Game';bubble.onclick=()=>{dismiss();play.click();};document.body.append(bubble);inviteTimer=setTimeout(()=>{if(!bubble)return;const current=bubble;current.animate([{opacity:1},{opacity:0}],{duration:400}).onfinish=()=>{if(bubble===current)dismiss();};},5000);}
 },200);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){clear();dismiss();stage=0;}nextAt=Date.now()+2000;});
 window.addEventListener('resize',()=>{clear();nextAt=Date.now()+2000;});
 document.addEventListener('click',e=>{if(e.target.closest('#gameModeButton'))dismiss();});
})();

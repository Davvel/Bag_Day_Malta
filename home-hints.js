(() => {
 const key='bag-day-home-hints-v1';let saved;try{saved=JSON.parse(localStorage.getItem(key)||'null');}catch(_){}saved=saved||{firstUse:Date.now(),launches:0,lastInvite:0};saved.launches++;const eligibleLaunch=saved.launches<=2;function store(){try{localStorage.setItem(key,JSON.stringify(saved));}catch(_){}}store();
 let interacted=false,animations=[],glove=null,bubble=null,inviteTimer=null,lastDemo=0,lastTap=Date.now(),tapGlove=null,tapAnimations=[],swipeStart=null;
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const ready=()=>!document.hidden&&!document.getElementById('dashboard')?.hidden&&!document.getElementById('appContent')?.inert&&document.getElementById('splashScreen')?.hidden&&[...document.querySelectorAll('.overlay')].every(n=>n.hidden)&&!window.BAG_INFO?.isOpen();
 function stopDemo(){interacted=true;animations.forEach(a=>a.cancel());animations=[];glove?.remove();glove=null;}
 function clearTap(){tapAnimations.forEach(a=>a.cancel());tapAnimations=[];tapGlove?.remove();tapGlove=null;}
 function learned(){saved.navigationLearned=true;store();stopDemo();clearTap();}
 document.addEventListener('pointerdown',e=>{stopDemo();if(e.target.closest('#prevDay,#nextDay'))learned();if(e.target.closest('#bagArea'))swipeStart={id:e.pointerId,x:e.clientX,y:e.clientY};},true);
 document.addEventListener('pointermove',e=>{if(swipeStart&&e.pointerId===swipeStart.id&&Math.abs(e.clientX-swipeStart.x)>25&&Math.abs(e.clientX-swipeStart.x)>Math.abs(e.clientY-swipeStart.y))learned();},true);
 document.addEventListener('pointerup',()=>{swipeStart=null;},true);document.addEventListener('pointercancel',()=>{swipeStart=null;},true);
 document.addEventListener('click',e=>{if(e.target.closest('#prevDay,#nextDay'))learned();},true);
 document.addEventListener('keydown',e=>{stopDemo();if(['ArrowLeft','ArrowRight'].includes(e.key)&&ready())learned();},true);
 function tapHint(){const button=document.getElementById('nextDay');if(!button||button.disabled)return;tapGlove=document.createElement('img');tapGlove.src='icons/hint-hand.svg';tapGlove.className='next-day-glove';tapGlove.alt='';button.append(tapGlove);tapAnimations=[tapGlove.animate([{opacity:0,transform:'translateY(15px)'},{opacity:1,transform:'translateY(0)',offset:.3},{opacity:1,transform:'translateY(-8px) scale(.92)',offset:.5},{opacity:1,transform:'translateY(0)',offset:.7},{opacity:0,transform:'translateY(12px)'}],{duration:1600}),button.animate([{transform:'scale(1)'},{transform:'scale(1)',offset:.4},{transform:'scale(.94)',offset:.5},{transform:'scale(1)',offset:.65},{transform:'scale(1)'}],{duration:1600})];tapAnimations[0].onfinish=clearTap;}

 function dismiss(){clearTimeout(inviteTimer);bubble?.remove();bubble=null;}
 function demo(){const card=document.getElementById('bagArea');if(!card)return;glove=document.createElement('img');glove.src='icons/hint-hand.svg';glove.className='onboarding-glove';glove.alt='';card.style.position='relative';card.append(glove);animations=[card.animate([{transform:'translateX(0)'},{transform:'translateX(-55px)',offset:.55},{transform:'translateX(0)'}],{duration:2200,easing:'ease-in-out'}),glove.animate([{transform:'translateX(20px)',opacity:0},{transform:'translateX(0)',opacity:1,offset:.2},{transform:'translateX(-25px)',opacity:1,offset:.55},{transform:'translateX(-25px)',opacity:0,offset:.75},{opacity:0}],{duration:2200})];animations[0].onfinish=()=>{glove?.remove();glove=null;animations=[];};}
 setInterval(()=>{if(!ready()){animations.forEach(a=>a.cancel());animations=[];glove?.remove();glove=null;clearTap();dismiss();return;}const now=Date.now(),age=(now-saved.firstUse)/86400000;
 if(eligibleLaunch&&!saved.navigationLearned&&!interacted&&!reduced()&&now-lastDemo>10000){lastDemo=now;demo();}
 if(age<30&&!saved.navigationLearned&&!reduced()&&now-lastTap>30000&&!glove){lastTap=now;tapHint();}
 const play=document.getElementById('gameModeButton');if(age<60&&!play?.hidden&&now-saved.lastInvite>=5*86400000&&!bubble){saved.lastInvite=now;store();bubble=document.createElement('button');bubble.className='game-invitation';bubble.textContent='Play the Sorting Game';bubble.onclick=()=>{dismiss();play.click();};document.body.append(bubble);inviteTimer=setTimeout(()=>{if(!bubble)return;const current=bubble;current.animate([{opacity:1},{opacity:0}],{duration:400}).onfinish=()=>{if(bubble===current)dismiss();};},5000);}
 },1500);
 document.addEventListener('click',e=>{if(e.target.closest('#gameModeButton'))dismiss();});
})();

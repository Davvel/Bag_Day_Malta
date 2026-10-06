(() => {
 const key='bag-day-home-hints-v1';let saved;try{saved=JSON.parse(localStorage.getItem(key)||'null');}catch(_){}saved=saved||{firstUse:Date.now(),launches:0,lastInvite:0};saved.launches++;const eligibleLaunch=saved.launches<=2;function store(){try{localStorage.setItem(key,JSON.stringify(saved));}catch(_){}}store();
 let interacted=false,animations=[],glove=null,bubble=null,inviteTimer=null,lastDemo=0,lastWiggle=0;
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const ready=()=>!document.hidden&&!document.getElementById('dashboard')?.hidden&&!document.getElementById('appContent')?.inert&&document.getElementById('splashScreen')?.hidden&&[...document.querySelectorAll('.overlay')].every(n=>n.hidden)&&!window.BAG_INFO?.isOpen();
 function stopDemo(){interacted=true;animations.forEach(a=>a.cancel());animations=[];glove?.remove();glove=null;}
 document.addEventListener('pointerdown',stopDemo,true);document.addEventListener('keydown',stopDemo,true);
 function dismiss(){clearTimeout(inviteTimer);bubble?.remove();bubble=null;}
 function demo(){const card=document.getElementById('bagArea');if(!card)return;glove=document.createElement('img');glove.src='game/assets/hand.svg';glove.className='onboarding-glove';glove.alt='';card.style.position='relative';card.append(glove);animations=[card.animate([{transform:'translateX(0)'},{transform:'translateX(-55px)',offset:.55},{transform:'translateX(0)'}],{duration:2200,easing:'ease-in-out'}),glove.animate([{transform:'translateX(20px)',opacity:0},{transform:'translateX(0)',opacity:1,offset:.2},{transform:'translateX(-25px)',opacity:1,offset:.55},{transform:'translateX(-25px)',opacity:0,offset:.75},{opacity:0}],{duration:2200})];animations[0].onfinish=()=>{glove?.remove();glove=null;animations=[];};}
 setInterval(()=>{if(!ready()){animations.forEach(a=>a.cancel());animations=[];glove?.remove();glove=null;dismiss();return;}const now=Date.now(),age=(now-saved.firstUse)/86400000;
 if(eligibleLaunch&&!interacted&&!reduced()&&now-lastDemo>10000){lastDemo=now;demo();}
 if(age<30&&!reduced()&&now-lastWiggle>45000){lastWiggle=now;for(const id of ['prevDay','nextDay']){const node=document.getElementById(id);node.classList.remove('nav-hint');void node.offsetWidth;node.classList.add('nav-hint');}}
 const play=document.getElementById('gameModeButton');if(age<60&&!play?.hidden&&now-saved.lastInvite>=5*86400000&&!bubble){saved.lastInvite=now;store();bubble=document.createElement('button');bubble.className='game-invitation';bubble.textContent='Play the Sorting Game';bubble.onclick=()=>{dismiss();play.click();};document.body.append(bubble);inviteTimer=setTimeout(()=>{if(!bubble)return;const current=bubble;current.animate([{opacity:1},{opacity:0}],{duration:400}).onfinish=()=>{if(bubble===current)dismiss();};},5000);}
 },1500);
 document.addEventListener('click',e=>{if(e.target.closest('#gameModeButton'))dismiss();});
})();

(() => {
 'use strict';
 const byId=id=>document.getElementById(id),catalog=window.SORTING_ITEMS;
 const bagNames=['Organic','Mixed','Recyclables'],progressKey='sort-belt-highest-unlocked-v1',lastLevelKey='sort-belt-last-level-v1';
 const storage={read(){try{return Math.max(10,Math.min(100,Math.floor(Number(localStorage.getItem(progressKey)))||10));}catch(_){return 1;}},write(value){try{localStorage.setItem(progressKey,String(value));}catch(_){}}};
 function savedLevel(){try{return Math.max(1,Math.min(storage.read(),Math.floor(Number(localStorage.getItem(lastLevelKey)))||1));}catch(_){return 1;}}
 function rememberLevel(value){try{localStorage.setItem(lastLevelKey,String(value));}catch(_){}}
 let hintItem=null;
 const activePointers=new Set();
 let unlocked=storage.read(),level=savedLevel(),mode='menu',practice=false,elapsed=0,hits=0,misses=0,items=[],mistakes=new Map(),deck=[],nextSpawn=0,serial=0,selected=null,drag=null,raf=null,lastFrame=0,lastInput=0,feedbackUntil=0;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 const belt=byId('conveyor'),itemsLayer=byId('fallingItems'),hand=byId('pushHand'),bags=[...document.querySelectorAll('#gameBags button')];
 const pace=()=>({travel:Math.max(5.2,12-(level-1)*.55),interval:Math.max(1.5,6-(level-1)*.35)});
 const heightFor=item=>Math.max(1,belt.clientHeight-item.node.offsetHeight);
 function showOnly(id){for(const name of ['gameMenu','gamePlay','gameResults'])byId(name).hidden=name!==id;}
 function renderMenu(){
  cancelAnimationFrame(raf);raf=null;mode='menu';drag=null;selected=null;hideHint();byId('pausePanel').hidden=true;byId('gamePlay').classList.remove('running');itemsLayer.replaceChildren();items=[];
  unlocked=storage.read();level=Math.min(level,unlocked);const menu=byId('levelChoice');menu.replaceChildren();
  for(let n=1;n<=unlocked;n++){const option=document.createElement('option');option.value=n;option.textContent=String(n);menu.append(option);}menu.value=String(level);
  byId('unlockedNote').textContent=`Levels 1–10 are available to everyone. Highest available: Level ${unlocked}.`;byId('resetConfirm').hidden=true;showOnly('gameMenu');
 }
 function fillDeck(){
  const count=Math.min(catalog.length,6+Math.floor((level-1)/2)*3);deck=catalog.slice(0,count).slice();
  for(let n=deck.length-1;n>0;n--){const index=Math.floor(Math.random()*(n+1));[deck[n],deck[index]]=[deck[index],deck[n]];}
 }
 function selectItem(item){
  if(mode!=='running'||!items.includes(item))return;selected=item;lastInput=performance.now();hideHint();
  for(const entry of items)entry.node.classList.toggle('selected',entry===item);
  bags.forEach((bag,index)=>bag.classList.toggle('target',index===item.lane));
  byId('controlHint').textContent=`${item.info.name} · tap a bag, or push sideways/down`;
 }
 function clearSelection(){selected=null;bags.forEach(bag=>bag.classList.remove('target'));byId('controlHint').textContent='Push sideways to sort · push down to send';}
 function spawn(){
  if(items.length>=5)return;if(!deck.length)fillDeck();const info=deck.pop(),node=document.createElement('button');node.type='button';node.className='falling-item';node.dataset.itemId=info.id;node.setAttribute('aria-label',`${info.name}. In Mixed lane. Select to sort.`);
  const img=document.createElement('img');img.src=`assets/${info.id}.svg`;img.alt='';img.draggable=false;const label=document.createElement('span');label.textContent=info.name;node.append(img,label);
  const item={info,node,lane:1,y:0,id:++serial};node.dataset.serial=String(item.id);items.push(item);itemsLayer.append(node);position(item);
  node.onclick=()=>{if(!drag && mode==='running')selectItem(item);};
  node.onpointerdown=event=>{
   if(mode!=='running'||!event.isPrimary||event.button!==0)return;
   event.preventDefault();selectItem(item);node.setPointerCapture(event.pointerId);drag={item,id:event.pointerId,x:event.clientX,y:event.clientY,lane:item.lane,progress:item.y,moved:false};
   hideHint();
  };
  node.onpointermove=event=>{
   if(!drag||drag.item!==item||drag.id!==event.pointerId||mode!=='running')return;
   const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(Math.abs(dx)>8||Math.abs(dy)>8)drag.moved=true;
   item.lane=Math.max(0,Math.min(2,drag.lane+Math.round(dx/(belt.clientWidth/3))));
   item.y=Math.max(item.y,Math.min(1,drag.progress+Math.max(0,dy)/heightFor(item)));
   item.node.setAttribute('aria-label',`${info.name}. In ${bagNames[item.lane]} lane. Select to sort.`);position(item);bags.forEach((bag,index)=>bag.classList.toggle('target',index===item.lane));lastInput=performance.now();
  };
  node.onpointerup=event=>{
   if(!drag||drag.item!==item||drag.id!==event.pointerId)return;const send=event.clientY-drag.y>45;drag=null;hideHint();lastInput=performance.now();
   if(mode==='running' && (send||item.y>=1))accept(item);
  };
  node.onpointercancel=()=>{if(drag?.item===item){drag=null;hideHint();}};
  node.onlostpointercapture=()=>{if(drag?.item===item){drag=null;hideHint();}};
  node.onkeydown=event=>{
   if(mode!=='running')return;
   if(['ArrowLeft','ArrowRight','ArrowDown'].includes(event.key)){event.preventDefault();selectItem(item);if(event.key==='ArrowDown'){accept(item);return;}item.lane=Math.max(0,Math.min(2,item.lane+(event.key==='ArrowLeft'?-1:1)));item.node.setAttribute('aria-label',`${info.name}. In ${bagNames[item.lane]} lane. Select to sort.`);position(item);bags.forEach((bag,index)=>bag.classList.toggle('target',index===item.lane));}
  };
 }
 function position(item){item.node.style.left=`${(item.lane+.5)*100/3}%`;item.node.style.transform=`translate(-50%,${item.y*heightFor(item)}px)`;}
 function hideHint(){hand.hidden=true;hand.classList.remove('demo');hintItem=null;delete hand.dataset.itemSerial;delete hand.dataset.direction;}
 function showHint(item){
  if(hintItem!==item){
   hideHint();hintItem=item;hand.dataset.itemSerial=String(item.id);
   const direction=item.info.bag===0?'left':item.info.bag===2?'right':'down';hand.dataset.direction=direction;
   const distance=Math.min(100,belt.clientWidth/3*.75);
   hand.style.setProperty('--hint-x',`${direction==='left'?-distance:direction==='right'?distance:0}px`);
   hand.style.setProperty('--hint-y',direction==='down'?'70px':'0px');
   hand.hidden=false;hand.classList.add('demo');
  }
  // Align the illustrated fingertip with the centre of the object's image.
  const img=item.node.querySelector('img');
  hand.style.left=`calc(50% + ${img.offsetLeft+img.offsetWidth/2-item.node.offsetWidth/2-17.5}px)`;
  hand.style.top=`${item.y*heightFor(item)+img.offsetTop+img.offsetHeight/2-4}px`;
 }

 function accept(item){
  if(!items.includes(item)||mode!=='running')return;
  const correct=item.lane===item.info.bag;if(correct)hits++;else{misses++;mistakes.set(item.info.id,item.info);}
  const bag=bags[item.lane];bag.classList.remove('good','bad');void bag.offsetWidth;bag.classList.add(correct?'good':'bad');
  bag.querySelector('.bag-feedback').textContent=correct?'✓':'✕';
  clearTimeout(bag.pulseTimer);bag.pulseTimer=setTimeout(()=>bag.classList.remove('good','bad'),700);
  byId('feedback').textContent=correct?`✓ ${item.info.name} → ${bagNames[item.info.bag]}`:`✕ ${item.info.name} belongs in ${bagNames[item.info.bag]}`;
  byId('feedback').className=`feedback shown ${correct?'good':'bad'}`;feedbackUntil=performance.now()+1700;
  byId('hitCount').textContent=String(hits);byId('missCount').textContent=String(misses);
  if(drag?.item===item)drag=null;if(selected===item)clearSelection();item.node.remove();items=items.filter(entry=>entry!==item);hideHint();
 }
 function tick(now){
  if(mode!=='running')return;const dt=Math.max(0,(now-lastFrame)/1000);lastFrame=now;elapsed+=dt;
  const settings=pace();
  for(const item of [...items]){item.y+=dt/settings.travel;position(item);if(item.y>=1)accept(item);}
  // Every spawned item gets a full natural journey before the 60-second cutoff.
  if((practice||elapsed<=60-settings.travel) && elapsed>=nextSpawn){spawn();nextSpawn=elapsed+settings.interval;}
  const seconds=Math.max(0,Math.ceil(60-elapsed));byId('timeLeft').textContent=practice?'∞':`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
  if(now>feedbackUntil)byId('feedback').classList.remove('shown');
  const middleItem=items.find(item=>item.lane===1);
  if(!drag && !activePointers.size && middleItem && now-lastInput>8000 && !reduced.matches)showHint(middleItem);else hideHint();
  if(!practice && elapsed>=60){finishRound();return;}raf=requestAnimationFrame(tick);
 }
 function startRound(next=Number(byId('levelChoice').value),isPractice=byId('practiceChoice').checked){
  level=Math.max(1,Math.min(unlocked,Number(next)||1));rememberLevel(level);practice=isPractice;elapsed=0;hits=0;misses=0;items=[];mistakes=new Map();deck=[];nextSpawn=0;selected=null;drag=null;
  itemsLayer.replaceChildren();byId('pausePanel').hidden=true;byId('feedback').classList.remove('shown');bags.forEach(bag=>bag.classList.remove('target','good','bad'));hideHint();
  byId('playingLevel').textContent=String(level);byId('hitCount').textContent='0';byId('missCount').textContent='0';byId('timeLeft').textContent=practice?'∞':'1:00';byId('controlHint').textContent='Push sideways to sort · push down to send';showOnly('gamePlay');mode='running';byId('gamePlay').classList.add('running');lastFrame=performance.now();lastInput=lastFrame;cancelAnimationFrame(raf);raf=requestAnimationFrame(tick);byId('pauseGame').focus({preventScroll:true});
 }
 function pause(){
  if(mode!=='running')return;mode='paused';cancelAnimationFrame(raf);drag=null;hideHint();byId('gamePlay').classList.remove('running');byId('pausePanel').hidden=false;byId('gamePlay').inert=true;byId('endPractice').hidden=!practice;byId('resumeGame').focus({preventScroll:true});
 }
 function resume(){if(mode!=='paused')return;byId('pausePanel').hidden=true;byId('gamePlay').inert=false;mode='running';lastFrame=performance.now();lastInput=lastFrame;byId('gamePlay').classList.add('running');raf=requestAnimationFrame(tick);byId('pauseGame').focus({preventScroll:true});}
 function finishRound(){
  cancelAnimationFrame(raf);raf=null;byId('gamePlay').classList.remove('running');byId('pausePanel').hidden=true;byId('gamePlay').inert=false;
  if(!practice && mode==='running')for(const item of [...items])accept(item);
  mode='results';drag=null;hideHint();const total=hits+misses,accuracy=total?Math.round(hits/total*100):0,passed=!practice&&total>0&&hits*5>=total*4;
  if(passed){unlocked=Math.max(unlocked,Math.min(100,level+1));storage.write(unlocked);}
  byId('resultsTitle').textContent=practice?'Practice complete':passed?'Level complete!':'Another try?';byId('resultSummary').textContent=`${hits} correct · ${misses} wrong · ${accuracy}% accuracy. ${practice?'Practice does not change unlocked levels.':passed?(level<10?`Ready for Level ${level+1}. Levels 1–10 are freely available.`:level<100?`Level ${level+1} is available.`:'You completed the highest level!'):'Reach 80% to unlock the next level.'}`;
  byId('nextLevel').hidden=!passed || level>=100;byId('nextLevel').textContent=`Play Level ${Math.min(100,level+1)}`;
  const review=byId('reviewList');review.replaceChildren();const heading=document.createElement('h2');heading.textContent=mistakes.size?'A few things to remember':'Nicely sorted!';review.append(heading);
  for(const info of mistakes.values()){const row=document.createElement('div');row.className='review-item';const img=document.createElement('img');img.src=`assets/${info.id}.svg`;img.alt='';const text=document.createElement('div'),name=document.createElement('strong'),help=document.createElement('p');name.textContent=`${info.name} → ${bagNames[info.bag]}`;help.textContent=info.why;text.append(name,help);row.append(img,text);review.append(row);}
  showOnly('gameResults');byId('gameResults').focus({preventScroll:true});
 }
 bags.forEach((bag,index)=>bag.onclick=()=>{if(selected && mode==='running'){selected.lane=index;accept(selected);lastInput=performance.now();}});
 byId('backToBagDay').onclick=()=>{pause();if(window.parent!==window)window.parent.postMessage({type:'bag-day-game-close'},location.origin);else location.replace('../');};
 byId('levelChoice').onchange=()=>{level=Math.max(1,Math.min(unlocked,Number(byId('levelChoice').value)||1));rememberLevel(level);};
 byId('startGame').onclick=()=>startRound();byId('practiceChoice').onchange=()=>{byId('startGame').textContent=byId('practiceChoice').checked?'Start relaxed practice':'Play · 1 minute';};
 byId('pauseGame').onclick=pause;byId('resumeGame').onclick=resume;
 byId('endPractice').onclick=finishRound;byId('quitRound').onclick=()=>{byId('gamePlay').inert=false;renderMenu();byId('startGame').focus();};
 byId('nextLevel').onclick=()=>startRound(level+1,false);byId('replayLevel').onclick=()=>startRound(level,practice);byId('chooseLevel').onclick=()=>{renderMenu();byId('startGame').focus();};
 byId('resetProgress').onclick=()=>{byId('resetConfirm').hidden=false;byId('confirmReset').focus();};byId('cancelReset').onclick=()=>{byId('resetConfirm').hidden=true;byId('resetProgress').focus();};byId('confirmReset').onclick=()=>{storage.write(10);unlocked=10;level=1;rememberLevel(1);renderMenu();byId('levelChoice').focus();};
 // Any touch/click, key or scroll restarts the eight-second idle cue delay.
 function recordInteraction(){lastInput=performance.now();hideHint();}
 document.addEventListener('pointerdown',event=>{activePointers.add(event.pointerId);recordInteraction();},true);
 document.addEventListener('pointerup',event=>{activePointers.delete(event.pointerId);recordInteraction();},true);
 document.addEventListener('pointercancel',event=>{activePointers.delete(event.pointerId);recordInteraction();},true);
 document.addEventListener('pointermove',event=>{if(event.buttons)recordInteraction();},true);
 document.addEventListener('keydown',recordInteraction,true);
 document.addEventListener('wheel',recordInteraction,{capture:true,passive:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){activePointers.clear();pause();}});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();if(mode==='running')pause();else if(mode==='paused')resume();}if(mode==='paused'&&event.key==='Tab'){const nodes=[byId('resumeGame'),byId('endPractice'),byId('quitRound')].filter(node=>!node.hidden);if(event.shiftKey&&document.activeElement===nodes[0]){event.preventDefault();nodes.at(-1).focus();}else if(!event.shiftKey&&document.activeElement===nodes.at(-1)){event.preventDefault();nodes[0].focus();}}});
 window.addEventListener('resize',()=>{if(mode==='running')pause();for(const item of items)position(item);});
 renderMenu();
 if(window.parent!==window)window.parent.postMessage({type:'bag-day-game-ready'},location.origin);else location.replace('../');
 // This worker owns only /game/ assets, never the collection app's cache.
 if('serviceWorker' in navigator)navigator.serviceWorker.register('./service-worker.js',{scope:'./'}).catch(()=>{});
})();

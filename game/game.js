(() => {
 'use strict';
 const byId=id=>document.getElementById(id),catalog=window.SORTING_ITEMS;
 const content=window.SORTING_CONTENT;
 let round=content.plan(1),lessonCursor=0,pendingRound=null,preparing=false,prepareSerial=0,lastSpawnId=null;
 const bagNames=['Organic','Mixed','Recyclables'],progressKey='sort-belt-highest-unlocked-v1',lastLevelKey='sort-belt-last-level-v1';
 const storage={read(){try{return Math.max(10,Math.min(100,Math.floor(Number(localStorage.getItem(progressKey)))||10));}catch(_){return 1;}},write(value){try{localStorage.setItem(progressKey,String(value));}catch(_){}}};
 function savedLevel(){try{return Math.max(1,Math.min(storage.read(),Math.floor(Number(localStorage.getItem(lastLevelKey)))||1));}catch(_){return 1;}}
 function rememberLevel(value){try{localStorage.setItem(lastLevelKey,String(value));}catch(_){}}
 let hintItem=null,helpEnabled=true;
 const readHelp=()=>{try{helpEnabled=localStorage.getItem('bag-day-help-animations-v1')!=='false'}catch{}};readHelp();
 window.addEventListener('storage',e=>{if(e.key==='bag-day-help-animations-v1'||e.key===null){readHelp();if(!helpEnabled)hideHint()}});
 const activePointers=new Set();
 let unlocked=storage.read(),level=savedLevel(),mode='menu',practice=false,elapsed=0,hits=0,misses=0,items=[],mistakes=new Map(),deck=[],nextSpawn=0,serial=0,selected=null,drag=null,raf=null,lastFrame=0,lastInput=0,feedbackUntil=0;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 const belt=byId('conveyor'),itemsLayer=byId('fallingItems'),hand=byId('pushHand'),bags=[...document.querySelectorAll('#gameBags button')];
 const pace=()=>({travel:Math.max(5.2,12-(level-1)*.55),interval:Math.max(1.5,6-(level-1)*.35)});
 const heightFor=item=>Math.max(1,belt.clientHeight-item.node.offsetHeight);
 function measure(name,params={}){if(parent!==window)parent.postMessage({type:'bag-day-game-analytics',name,params},location.protocol==='file:'?'*':location.origin);else window.BAG_DAY_ANALYTICS?.event(name,params)}
 function abandon(){if(['running','paused','info'].includes(mode))measure('game_round_abandon',{level,mode:practice?'practice':'timed'})}
 function showOnly(id){for(const name of ['gameMenu','gamePlay','gameResults'])byId(name).hidden=name!==id;}
 function renderMenu(){
  prepareSerial++;preparing=false;pendingRound=null;
  if(byId('lessonPanel').open)byId('lessonPanel').close();
  byId('startGame').disabled=false;byId('startGame').textContent='Play ▶';
  abandon();
  byId('winPanel').hidden=true;byId('gamePlay').inert=false;notifyWin();
  cancelAnimationFrame(raf);raf=null;mode='menu';drag=null;selected=null;hideHint();byId('pausePanel').hidden=true;byId('gamePlay').classList.remove('running');itemsLayer.replaceChildren();items=[];
  unlocked=storage.read();level=Math.min(level,unlocked);const menu=byId('levelChoice');menu.replaceChildren();
  for(let n=1;n<=unlocked;n++){const option=document.createElement('option');option.value=n;option.textContent=String(n);menu.append(option);}menu.value=String(level);
  renderRecords();showOnly('gameMenu');notifyPause();notifyRound();
 }
 function renderRecords(){const records=window.SORTING_STATS.snapshot();for(const name of ['highestLevel','bestRound','currentStreak','longestStreak'])byId(name).textContent=String(records[name]);}
 function notifyRound(){if(window.parent!==window)window.parent.postMessage({type:'bag-day-game-round',open:mode!=='menu'&&mode!=='closed'},location.protocol==='file:'?'*':location.origin);}
 function notifyPause(){if(window.parent!==window)window.parent.postMessage({type:'bag-day-game-pause',paused:mode==='paused'},location.protocol==='file:'?'*':location.origin);}
 function notifyWin(){if(window.parent!==window)window.parent.postMessage({type:'bag-day-game-win',open:!byId('winPanel').hidden},location.protocol==='file:'?'*':location.origin);}
 function celebrate(accuracy){
  showOnly('gamePlay');mode='won';byId('gamePlay').inert=true;byId('winPanel').hidden=false;
  const stars=accuracy>=95?3:accuracy>=90?2:1;
  byId('winStars').textContent='★'.repeat(stars);
  byId('winStars').setAttribute('aria-label',`${stars} ${stars===1?'star':'stars'} earned`);
  byId('winSummary').textContent=`Level ${level} complete · ${accuracy}% accuracy`;
  byId('playNextLevel').hidden=level>=100;
  const confetti=byId('confetti');confetti.replaceChildren();
  if(!reduced.matches)for(let n=0;n<52;n++){
   const flight=document.createElement('span');flight.className='confetti-flight';
   const reach=Math.min(260,innerWidth*.42);
   flight.style.setProperty('--burst-x',`${(Math.random()-.5)*reach*2}px`);
   flight.style.setProperty('--burst-y',`${-80-Math.random()*150}px`);
   flight.style.setProperty('--landing-y',`${100+Math.random()*100}px`);
   flight.style.setProperty('--drift',`${(Math.random()-.5)*80}px`);
   flight.style.setProperty('--duration',`${4.5+Math.random()*2}s`);
   flight.style.setProperty('--delay',`${Math.random()*.15}s`);
   const piece=document.createElement('i');
   piece.style.setProperty('--spin',`${Math.random()*360}deg`);
   piece.style.setProperty('--fall-duration',`${.7+Math.random()*.8}s`);
   piece.style.setProperty('--colour',['#ffd768','#6ff5c7','#89c8ff','#ee91d6','#ff947d'][n%5]);
   if(n%3===0){piece.style.borderRadius='50%';piece.style.height='8px';}
   flight.append(piece);confetti.append(flight);
  }
  notifyWin();(level<100?byId('playNextLevel'):byId('exitWin')).focus({preventScroll:true});
 }
 function closeGame(){prepareSerial++;preparing=false;pendingRound=null;abandon();cancelAnimationFrame(raf);mode='closed';hideHint();if(window.parent!==window)window.parent.postMessage({type:'bag-day-game-close'},location.protocol==='file:'?'*':location.origin);else if(new URLSearchParams(location.search).get('from')==='home'&&history.length>1)history.back();else location.replace('../');}
 function fillDeck(){deck=content.deck(round.pool,lastSpawnId);}
 const columnName=lane=>content.destinations[round.columns[lane]].name;
 function displayColumns(){bags.forEach((bag,index)=>{const d=content.destinations[round.columns[index]];bag.querySelector('img').src=d.image;bag.querySelector('strong').textContent=d.name;bag.querySelector('.destination-detail').textContent=d.detail;bag.setAttribute('aria-label','About '+d.name);});}
 function selectItem(item){
  if(mode!=='running'||!items.includes(item))return;selected=item;lastInput=performance.now();hideHint();
  for(const entry of items)entry.node.classList.toggle('selected',entry===item);
  bags.forEach((bag,index)=>bag.classList.toggle('target',index===item.lane));
  byId('controlHint').textContent=`${item.info.name} · tap a destination, or drag into a column`;
 }
 function clearSelection(){selected=null;bags.forEach(bag=>bag.classList.remove('target'));byId('controlHint').textContent='Drag to move · drop into a destination';}
 function spawn(){
  if(!deck.length)fillDeck();const info=deck.pop();lastSpawnId=info.id;const node=document.createElement('button');node.type='button';node.className='falling-item';node.dataset.itemId=info.id;node.setAttribute('aria-label',`${info.name}. In ${columnName(1)} lane. Select to sort.`);
  const img=document.createElement('img');img.src=`assets/${info.id}.svg?v=1.1.36`;img.alt='';img.draggable=false;const label=document.createElement('span');label.textContent=info.name;node.append(img,label);
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
   const lane=Math.max(0,Math.min(2,drag.lane+Math.round(dx/(belt.clientWidth/3))));
   moveItem(item,lane,drag.progress+dy/heightFor(item));ensureSupply();
   item.node.setAttribute('aria-label',`${info.name}. In ${columnName(item.lane)} lane. Select to sort.`);position(item);bags.forEach((bag,index)=>bag.classList.toggle('target',index===item.lane));lastInput=performance.now();
  };
  node.onpointerup=event=>{
   if(!drag||drag.item!==item||drag.id!==event.pointerId)return;
   const moved=drag.moved;drag=null;hideHint();lastInput=performance.now();
   const destination=bags.findIndex(bag=>{const box=bag.getBoundingClientRect();return event.clientX>=box.left&&event.clientX<=box.right&&event.clientY>=box.top&&event.clientY<=box.bottom;});
   if(mode==='running'&&moved&&destination>=0){item.lane=destination;accept(item);}

  };
  node.onpointercancel=()=>{if(drag?.item===item){drag=null;hideHint();}};
  node.onlostpointercapture=event=>{if(activePointers.delete(event.pointerId))recordObjectInteraction();if(drag?.item===item){drag=null;hideHint();}};
  node.onkeydown=event=>{
   if(mode!=='running')return;
   if(['ArrowLeft','ArrowRight','ArrowDown'].includes(event.key)){event.preventDefault();selectItem(item);if(event.key==='ArrowDown'){accept(item);return;}moveItem(item,Math.max(0,Math.min(2,item.lane+(event.key==='ArrowLeft'?-1:1))),item.y);ensureSupply();item.node.setAttribute('aria-label',`${info.name}. In ${columnName(item.lane)} lane. Select to sort.`);position(item);bags.forEach((bag,index)=>bag.classList.toggle('target',index===item.lane));}
  };
 }
 // Spawn as soon as the top-middle card footprint is clear.
 function ensureSupply(){
  if(mode!=='running'||elapsed>=60)return;
  const cardHeight=items[0]?.node.offsetHeight||0;
  const occupied=items.some(item=>item.lane===1&&item.y*heightFor(item)+.01<cardHeight);
  if(!occupied)spawn();
 }
 // Items move independently and may overlap like stacked cards.
 function moveItem(item,lane,progress){
  item.lane=Math.max(0,Math.min(2,lane));
  item.y=Math.max(0,Math.min(1,progress));
  position(item);
 }
 function position(item){item.node.style.left=`${(item.lane+.5)*100/3}%`;item.node.style.transform=`translate(-50%,${item.y*heightFor(item)}px)`;}
 function hideHint(){hand.hidden=true;hand.classList.remove('demo');hintItem=null;delete hand.dataset.itemSerial;delete hand.dataset.direction;}
 function showHint(item){
  if(hintItem!==item){
   hideHint();hintItem=item;hand.dataset.itemSerial=String(item.id);
   const target=content.laneFor(item.info,round.columns);
   const direction=target===0?'left':target===2?'right':'down';hand.dataset.direction=direction;
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
  const correct=content.accepts(item.info,round.columns[item.lane]);if(correct)hits++;else{misses++;mistakes.set(item.info.id,item.info);}
  const bag=bags[item.lane];bag.classList.remove('good','bad');void bag.offsetWidth;bag.classList.add(correct?'good':'bad');
  bag.querySelector('.bag-feedback').textContent=correct?'✓':'✕';
  clearTimeout(bag.pulseTimer);bag.pulseTimer=setTimeout(()=>bag.classList.remove('good','bad'),900);
  byId('feedback').textContent=correct?'Correct':item.info.name+' → '+columnName(content.laneFor(item.info,round.columns));

  byId('hitCount').textContent=String(hits);byId('missCount').textContent=String(misses);
  if(drag?.item===item)drag=null;if(selected===item)clearSelection();item.node.remove();items=items.filter(entry=>entry!==item);hideHint();if(elapsed<60)ensureSupply();
 }
 function tick(now){
  if(mode!=='running')return;const dt=Math.max(0,(now-lastFrame)/1000);lastFrame=now;elapsed+=dt;
  const settings=pace();
  for(const item of [...items]){if(drag?.item===item)continue;moveItem(item,item.lane,item.y+dt/settings.travel);if(item.y>=1)accept(item);}
  if(elapsed<60)ensureSupply();
  const seconds=Math.max(0,Math.ceil(60-elapsed));byId('timeLeft').textContent=practice?'∞':`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;

  const middleItem=items.find(item=>item.lane===1);
  if(helpEnabled && !drag && !activePointers.size && middleItem && level<=10 && now-lastInput>2000 && !reduced.matches)showHint(middleItem);else hideHint();
  if(!practice && elapsed>=60){finishRound();return;}raf=requestAnimationFrame(tick);
 }
 const lessonPanel=byId('lessonPanel');
 function startRound(next=Number(byId('levelChoice').value),isPractice=false){
  if(preparing||lessonPanel.open)return;
  next=Math.max(1,Math.min(unlocked,Number(next)||1));
  if(window.BAG_DAY_GAME_ZOOM?.guard({next,isPractice}))return;
  if(next<=10){prepareRound(next,isPractice,null);return;}
  const lesson=content.lessons[lessonCursor++%content.lessons.length];
  pendingRound={next,isPractice,lesson};
  byId('lessonTitle').textContent=lesson.title;byId('lessonText').textContent=lesson.text;byId('lessonExtra').textContent=lesson.extra;
  byId('lessonItem').src='assets/'+lesson.item+'.svg?v=1.1.36';byId('lessonItem').alt=catalog.find(i=>i.id===lesson.item).name;
  byId('lessonDestination').src=content.destinations[lesson.route].image;byId('lessonDestination').alt=content.destinations[lesson.route].name;
  byId('lessonColumns').replaceChildren(...content.plan(next,lesson).columns.map(route=>{const node=document.createElement('span');node.textContent=content.destinations[route].name;return node;}));
  byId('lessonSource').href=lesson.link;byId('lessonStatus').textContent='';
  byId('tryLesson').disabled=false;byId('classicLesson').disabled=false;
  lessonPanel.showModal();window.BAG_DAY_BACK?.sync();byId('tryLesson').focus({preventScroll:true});
 }
 function preloadRound(plan){
  const paths=[...plan.pool.map(i=>'assets/'+i.id+'.svg?v=1.1.36'),...plan.columns.map(r=>content.destinations[r].image)];
  return Promise.all(paths.map(src=>new Promise(resolve=>{
   const image=new Image();let done=false;
   const finish=ok=>{if(done)return;done=true;clearTimeout(timer);resolve(ok);};
   const timer=setTimeout(()=>finish(false),8000);
   image.onload=async()=>{try{if(image.decode)await image.decode();finish(image.naturalWidth>0);}catch{finish(false);}};
   image.onerror=()=>finish(false);image.src=src;
  })));
 }
 async function prepareRound(next,isPractice,lesson){
  if(preparing)return;
  if(window.BAG_DAY_GAME_ZOOM?.guard({next,isPractice}))return;
  preparing=true;const serial=++prepareSerial,plan=content.plan(next,lesson);
  byId('startGame').disabled=true;byId('startGame').textContent='Getting pictures ready…';
  byId('tryLesson').disabled=true;byId('classicLesson').disabled=true;byId('lessonStatus').textContent='Getting pictures ready…';
  const loaded=await preloadRound(plan);
  if(serial!==prepareSerial)return;
  preparing=false;byId('startGame').disabled=false;byId('startGame').textContent='Play ▶';
  if(loaded.some(ok=>!ok)){
   byId('tryLesson').disabled=false;byId('classicLesson').disabled=false;
   if(lessonPanel.open)byId('lessonStatus').textContent='Some pictures could not load. Please try again.';
   else window.BAG_INFO.open('Pictures could not load','<p>Please check your connection and press Play again.</p>');
   return;
  }
  if(window.BAG_DAY_GAME_ZOOM?.guard({next,isPractice}))return;
  pendingRound=null;if(lessonPanel.open)lessonPanel.close();
  round=plan;beginRound(next,isPractice);
 }
 byId('tryLesson').onclick=()=>{if(pendingRound)prepareRound(pendingRound.next,pendingRound.isPractice,pendingRound.lesson);};
 byId('classicLesson').onclick=()=>{if(pendingRound)prepareRound(pendingRound.next,pendingRound.isPractice,null);};
 window.addEventListener('pagehide',()=>{if(preparing){prepareSerial++;preparing=false;byId('startGame').disabled=false;byId('startGame').textContent='Play ▶';byId('tryLesson').disabled=false;byId('classicLesson').disabled=false;byId('lessonStatus').textContent='';}});
 byId('closeLesson').onclick=()=>lessonPanel.close();
 lessonPanel.addEventListener('close',()=>{if(pendingRound){prepareSerial++;preparing=false;pendingRound=null;byId('startGame').disabled=false;byId('startGame').textContent='Play ▶';}window.BAG_DAY_BACK?.sync();});
 function beginRound(next,isPractice=false){
  byId('winPanel').hidden=true;byId('gamePlay').inert=false;notifyWin();
  abandon();level=Math.max(1,Math.min(unlocked,Number(next)||1));rememberLevel(level);practice=isPractice;measure('game_round_start',{level,mode:practice?'practice':'timed'});elapsed=0;hits=0;misses=0;items=[];mistakes=new Map();deck=[];nextSpawn=0;selected=null;drag=null;lastSpawnId=null;displayColumns();
  itemsLayer.replaceChildren();byId('pausePanel').hidden=true;byId('feedback').classList.remove('shown');bags.forEach(bag=>bag.classList.remove('target','good','bad'));hideHint();
  byId('playingLevel').textContent=String(level);byId('hitCount').textContent='0';byId('missCount').textContent='0';byId('timeLeft').textContent=practice?'∞':'1:00';byId('controlHint').textContent='Drag to move · drop into a destination';showOnly('gamePlay');mode='running';ensureSupply();notifyRound();byId('gamePlay').classList.add('running');lastFrame=performance.now();lastInput=lastFrame;cancelAnimationFrame(raf);raf=requestAnimationFrame(tick);byId('pauseGame').focus({preventScroll:true});
 }
 function pause(){
  if(mode!=='running')return;measure('game_pause');mode='paused';cancelAnimationFrame(raf);drag=null;hideHint();byId('gamePlay').classList.remove('running');byId('pausePanel').hidden=false;byId('gamePlay').inert=true;notifyPause();byId('resumeGame').focus({preventScroll:true});
 }
 function resume(){if(mode!=='paused')return;measure('game_resume');byId('pausePanel').hidden=true;byId('gamePlay').inert=false;mode='running';notifyPause();lastFrame=performance.now();lastInput=lastFrame;byId('gamePlay').classList.add('running');raf=requestAnimationFrame(tick);byId('pauseGame').focus({preventScroll:true});}
 function finishRound(){
  cancelAnimationFrame(raf);raf=null;byId('gamePlay').classList.remove('running');byId('pausePanel').hidden=true;byId('gamePlay').inert=false;

  mode='results';drag=null;hideHint();const total=hits+misses,accuracy=total?Math.round(hits/total*100):0,passed=!practice&&total>0&&hits*5>=total*4;
  measure('game_round_complete',{level,mode:practice?'practice':'timed',score:hits,mistakes:misses,accuracy,duration_seconds:Math.round(elapsed),outcome:passed?'passed':'retry'});
  if(!practice && elapsed>=60)window.SORTING_STATS.complete({level,hits,passed});
  if(passed){unlocked=Math.max(unlocked,Math.min(100,level+1));storage.write(unlocked);}
  if(passed){celebrate(accuracy);return;}
  byId('resultsTitle').textContent='Try Again ?';byId('resultSummary').textContent=`${hits} correct · ${misses} wrong · ${accuracy}% accuracy` ;
  const review=byId('reviewList');review.replaceChildren();const heading=document.createElement('h2');heading.textContent='Items in this level';review.append(heading);
  for(const info of round.pool){const row=document.createElement('div');row.className='review-item';const img=document.createElement('img');img.src=`assets/${info.id}.svg?v=1.1.36`;img.alt='';const text=document.createElement('div'),name=document.createElement('strong'),help=document.createElement('p');name.textContent=`${info.name} → ${columnName(content.laneFor(info,round.columns))}`;help.textContent=info.why;text.append(name,help);row.append(img,text);review.append(row);}
  showOnly('gameResults');byId('gameResults').focus({preventScroll:true});
 }
 function explainBag(index,menu=false){const route=menu?content.classic[index]:round.columns[index];if(content.classic.includes(route))measure('game_guide_open',{bag_type:route==='recycle'?'recycle':route});const wasRunning=mode==='running';if(wasRunning){mode='info';cancelAnimationFrame(raf);drag=null;hideHint();byId('gamePlay').classList.remove('running');}const onClose=()=>{if(wasRunning&&mode==='info'){mode='running';lastFrame=performance.now();lastInput=lastFrame;byId('gamePlay').classList.add('running');raf=requestAnimationFrame(tick);}};
  if(content.classic.includes(route))window.BAG_INFO.bag(route,onClose);
  else {const lesson=round.lesson;window.BAG_INFO.open(content.destinations[route].name,'<p>'+lesson.text+'</p><p>'+lesson.extra+'</p>',onClose);}
 }
 bags.forEach((bag,index)=>{const detail=document.createElement('small');detail.className='destination-detail';bag.append(detail);bag.onclick=()=>{if(selected&&mode==='running'){selected.lane=index;accept(selected);}else explainBag(index);};bag.setAttribute('aria-label','What belongs in '+bagNames[index]+'?');});
 document.querySelectorAll('.menu-bags>div').forEach((node,index)=>{node.tabIndex=0;node.setAttribute('role','button');node.setAttribute('aria-label','What belongs in '+bagNames[index]+'?');node.onclick=()=>explainBag(index,true);node.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();node.click();}};});
 document.querySelectorAll('.record').forEach(node=>{node.tabIndex=0;node.setAttribute('role','button');node.onclick=()=>{const stats=window.SORTING_STATS.snapshot();if(node.classList.contains('level-record'))window.BAG_INFO.open('Highest level achieved',`<p>Your highest successfully completed level is <strong>${stats.highestLevel}</strong>.</p><p>Selecting or starting a level does not count; you must pass the round.</p>`);else if(node.classList.contains('score-record'))window.BAG_INFO.open('Most correct in one round',`<p>Your best completed round had <strong>${stats.bestRound} correctly sorted items</strong>.</p><p>This is your largest correct-item count in a single round, rather than a percentage or a lifetime total.</p>`);else window.BAG_INFO.streak(stats,true);};node.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();node.click();}};});
 let wakeLock=null,wakePending=false;
 async function syncWake(){if(mode!=='running'||document.hidden){if(wakeLock){const old=wakeLock;wakeLock=null;await old.release().catch(()=>{});}return;}if(wakeLock||wakePending||!navigator.wakeLock)return;wakePending=true;try{const lock=await navigator.wakeLock.request('screen');if(mode!=='running'||document.hidden)await lock.release();else{wakeLock=lock;lock.addEventListener('release',()=>{if(wakeLock===lock)wakeLock=null;});}}catch(_){}finally{wakePending=false;}}
 new MutationObserver(syncWake).observe(document.body,{subtree:true,attributes:true,attributeFilter:['hidden','class']});document.addEventListener('visibilitychange',syncWake);window.addEventListener('pagehide',()=>wakeLock?.release());
 byId('closeGameMenu').onclick=closeGame;for(const id of ['closeGamePlay','closeGameResults'])byId(id).onclick=()=>{renderMenu();byId('startGame').focus();};
 window.addEventListener('message',event=>{if(event.source===window.parent&&(location.protocol==='file:'?event.origin==='null':event.origin===location.origin)&&event.data?.type==='bag-day-game-resume')resume();if(event.source===window.parent&&(location.protocol==='file:'?event.origin==='null':event.origin===location.origin)&&event.data?.type==='bag-day-game-menu')renderMenu();});
 byId('levelChoice').onchange=()=>{level=Math.max(1,Math.min(unlocked,Number(byId('levelChoice').value)||1));rememberLevel(level);};
 byId('startGame').onclick=()=>startRound();
 byId('pauseGame').onclick=pause;byId('resumeGame').onclick=resume;byId('closePause').onclick=resume;
 byId('playNextLevel').onclick=()=>startRound(level+1,false);byId('exitWin').onclick=()=>{renderMenu();byId('startGame').focus();};
 byId('replayLevel').onclick=()=>startRound(level,false);
 // Only interaction with falling objects resets the two-second help delay.
 function recordObjectInteraction(){lastInput=performance.now();hideHint();}
 document.addEventListener('pointerdown',event=>{
  if(mode==='running' && event.isPrimary && event.button===0 && event.target.closest('.falling-item')){activePointers.add(event.pointerId);recordObjectInteraction();}
 },true);
 function endObjectTouch(event){if(activePointers.delete(event.pointerId))recordObjectInteraction();}
 document.addEventListener('pointerup',endObjectTouch,true);
 document.addEventListener('pointercancel',endObjectTouch,true);
 document.addEventListener('pointermove',event=>{if(activePointers.has(event.pointerId))recordObjectInteraction();},true);
 document.addEventListener('keydown',event=>{if(mode==='running' && event.target.closest('.falling-item'))recordObjectInteraction();},true);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){activePointers.clear();if(mode==='info'){window.BAG_INFO.close();}pause();}});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();if(mode==='running')pause();else if(mode==='paused')resume();else if(mode==='won')renderMenu();}if(mode==='won'&&event.key==='Tab'){const controls=[byId('playNextLevel'),byId('exitWin')].filter(n=>!n.hidden);if(event.shiftKey&&document.activeElement===controls[0]){event.preventDefault();controls.at(-1).focus();}else if(!event.shiftKey&&document.activeElement===controls.at(-1)){event.preventDefault();controls[0].focus();}}if(mode==='paused'&&event.key==='Tab'){const nodes=[byId('closePause'),byId('resumeGame')];if(event.shiftKey&&document.activeElement===nodes[0]){event.preventDefault();nodes.at(-1).focus();}else if(!event.shiftKey&&document.activeElement===nodes.at(-1)){event.preventDefault();nodes[0].focus();}}});
 window.addEventListener('resize',()=>{if(mode==='running')pause();for(const item of items)position(item);});
 if('ResizeObserver' in window){
  const record=document.querySelector('.record');
  new ResizeObserver(()=>{const height=record.getBoundingClientRect().height;if(height>0)byId('gameMenu').style.setProperty('--stat-height',`${height}px`);}).observe(record);
 }
 renderMenu();
 setInterval(()=>{if(mode==='menu')renderRecords();},60000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&mode==='menu')renderRecords();});
 if(window.parent!==window)window.parent.postMessage({type:'bag-day-game-ready'},location.protocol==='file:'?'*':location.origin);else {window.BAG_DAY_ANALYTICS?.start();window.BAG_DAY_ANALYTICS?.event('game_ready');}
 window.BAG_DAY_BACK?.register('round',{isOpen:()=>!['menu','closed'].includes(mode),close:renderMenu});
 window.BAG_DAY_BACK?.register('pause',{isOpen:()=>mode==='paused',close:resume});
 window.BAG_DAY_BACK?.register('lesson',{isOpen:()=>lessonPanel.open,close:()=>lessonPanel.close()});
 // Register information last, so Back closes it before its underlying round.
 window.BAG_DAY_BACK?.register('information',{isOpen:()=>window.BAG_INFO?.isOpen()===true,close:()=>window.BAG_INFO.close()});
 window.BAG_DAY_GAME_ZOOM?.restore(startRound);
 // This worker owns only /game/ assets, never the collection app's cache.
 if('serviceWorker' in navigator)navigator.serviceWorker.register('./service-worker.js',{scope:'./'}).catch(()=>{});
})();

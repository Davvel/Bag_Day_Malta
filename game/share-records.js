(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const button=$('shareGameRecords'),dialog=$('shareRecordsDialog');
  if(!button||!dialog||!window.SORTING_STATS)return;
  const url='https://bagdaymalta.eu/game/';
  const text=$('shareRecordsText'),status=$('shareRecordsStatus');
  const message=r=>`♻️ Bag Day Malta — The Waste Sorting Game

My personal bests:

🏆 Highest level reached: ${r.highestLevel}
🎯 Highest level with zero sorting mistakes: ${r.highestPerfectLevel}

⏱️ Most items sorted correctly in 1 minute: ${r.bestRound}
🌟 Most sorted in 1 minute with zero mistakes: ${r.bestPerfectRound}

Can you sort faster? 🫵

Play here 👇
${url}`;
  button.addEventListener('click',()=>{
    text.value=message(window.SORTING_STATS.snapshot());
    status.textContent='Copy your result, open Facebook, then paste it into the post box.';
    dialog.showModal();
  });
  let guideTimers=[];
  const guide=$('shareGuide'),scene=$('shareGuideScene'),caption=$('shareGuideCaption');
  function stopGuide(){
    guideTimers.forEach(clearTimeout);guideTimers=[];
    guide.hidden=true;guide.classList.remove('guide-fade');
    ['shareRecordsCopy','shareRecordsFacebook'].forEach(id=>$(id).classList.remove('guide-highlight'));
  }
  const example='♻️ Bag Day Malta<br>🏆 Highest level: 20<br>🎯 Level with zero mistakes: 5<br>⏱️ Most sorted in 1 minute: 22<br>🌟 Zero mistakes in 1 minute: 15<br>bagdaymalta.eu/game/';
  function guideStep(step){
    ['shareRecordsCopy','shareRecordsFacebook'].forEach(id=>$(id).classList.remove('guide-highlight'));
    if(step<2){
      $(step===0?'shareRecordsCopy':'shareRecordsFacebook').classList.add('guide-highlight');
      scene.innerHTML='<div class="guide-example">'+example+'</div><div class="guide-action">'+(step===0?'① Copy result':'② Open Facebook')+'</div><span class="guide-hand guide-hand-action">👆</span>';
      caption.textContent=step===0?'Copy Your Results':'Open Facebook page';
    }else{
      const pasted=step>=4,posted=step===6;
      scene.innerHTML='<div class="guide-facebook-head">Facebook · Create post</div><div class="guide-post-box">'+(pasted?example:"What’s on your mind?")+(step===3?'<span class="guide-paste-menu">Paste</span>':'')+'</div><div class="guide-post-button '+(step===5?'guide-post-tap':'')+'">'+(posted?'✓ Posted':'Post')+'</div>'+(step<4?'<span class="guide-hand guide-hand-hold">👆</span>':step===5?'<span class="guide-hand guide-hand-post">👆</span>':'');
      caption.textContent=['Press and hold in the post box','Choose Paste — paste here','Your results appear. Check your post.','Tap Post to share your results','Your results are shared!'][step-2];
    }
  }
  $('shareGuideHelp').addEventListener('click',()=>{
    stopGuide();guide.hidden=false;
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if(reduced){guideStep(4);caption.textContent='Copy result → Open Facebook → press and hold in the post box → Paste → Post.';return;}
    guideStep(0);
    [4500,9000,13500,17500,22500,27000].forEach((delay,i)=>guideTimers.push(setTimeout(()=>guideStep(i+1),delay)));
    guideTimers.push(setTimeout(()=>guide.classList.add('guide-fade'),30500));
    guideTimers.push(setTimeout(stopGuide,31300));
  });
  $('shareGuideClose').addEventListener('click',stopGuide);
  dialog.addEventListener('click',event=>{
    if(!guide.hidden&&!guide.contains(event.target)&&event.target!==$('shareGuideHelp')&&!$('shareGuideHelp').contains(event.target))stopGuide();
  });
  dialog.addEventListener('close',stopGuide);
  dialog.addEventListener('cancel',stopGuide);
  $('shareRecordsClose').addEventListener('click',()=>{stopGuide();dialog.close();});
  $('shareRecordsCopy').addEventListener('click',async()=>{
    try {
      if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text.value);
      status.textContent='Copied ✓ Now open Facebook and paste it into the post box.';
    } catch {
      text.focus();text.select();text.setSelectionRange(0,text.value.length);
      status.textContent='Copy the selected text using your device’s Copy option, then open Facebook and paste it.';
    }
  });
  $('shareRecordsFacebook').addEventListener('click',()=>{
    window.location.href='https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(url);
  });
})();

(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const button=$('shareGameRecords'),dialog=$('shareRecordsDialog');
  if(!button||!dialog||!window.SORTING_STATS)return;
  const url='https://bagdaymalta.eu/game/';
  const text=$('shareRecordsText'),status=$('shareRecordsStatus');
  const message=r=>`♻️ Bag Day Malta
The Waste Sorting Game

🏆 Highest Level: ${r.highestLevel}
⏱️ Most sorted in 1 minute: ${r.bestRound}
🌟 Most sorted in 1 minute with zero mistakes: ${r.bestPerfectRound}

Play here 👇
${url}`;
  button.addEventListener('click',()=>{
    const records=window.SORTING_STATS.snapshot();
    text.value=message(records);
    $('shareHighestLevel').textContent=records.highestLevel;
    $('shareBestRound').textContent=records.bestRound;
    $('sharePerfectRound').textContent=records.bestPerfectRound;
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
  function guideStep(step){
    scene.className='share-guide-scene guide-step-'+step;
    if(step<2){
      scene.innerHTML='<div class="guide-action">'+(step===0?'① Copy result':'② Open Facebook')+'</div><div class="guide-pointer"><span class="guide-hand">👆</span>'+(step===0?'<span class="guide-bubble">Score Copied</span>':'')+'</div>';
    }else{
      scene.innerHTML='<div class="guide-facebook-head">Facebook · Create post</div><div class="guide-post-box"></div><div class="guide-post-button">POST</div><div class="guide-pointer"><span class="guide-hand">👆</span><span class="guide-bubble">Paste here</span></div>';
    }
    caption.textContent=['Copy result. Score Copied.','Open Facebook.','Press and hold in the post box. Paste here.','Press POST.'][step];
  }
  $('shareGuideHelp').addEventListener('click',()=>{
    stopGuide();guide.hidden=false;
    guide.classList.toggle('guide-reduced',Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches));
    guideStep(0);
    [1000,2000].forEach((delay,i)=>guideTimers.push(setTimeout(()=>guideStep(i+1),delay)));
    guideTimers.push(setTimeout(()=>{
      scene.className='share-guide-scene guide-step-3';
      caption.textContent='Press POST.';
    },3500));
    guideTimers.push(setTimeout(()=>guide.classList.add('guide-fade'),4650));
    guideTimers.push(setTimeout(stopGuide,5000));
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
      text.hidden=false;text.focus();text.select();text.setSelectionRange(0,text.value.length);
      status.textContent='Copy the selected text using your device’s Copy option, then open Facebook and paste it.';
    }
  });
  $('shareRecordsFacebook').addEventListener('click',()=>{
    window.location.href='https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(url);
  });
})();

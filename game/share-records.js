(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const button=$('shareGameRecords'),dialog=$('shareRecordsDialog');
  if(!button||!dialog||!window.SORTING_STATS)return;
  const url='https://bagdaymalta.eu/game/';
  const text=$('shareRecordsText'),status=$('shareRecordsStatus');
  const copyButton=$('shareRecordsCopy'),facebookButton=$('shareRecordsFacebook');
  let shareSession=0;
  function copiedSuccessfully(){
    copyButton.textContent='✓ Copied successfully';
    copyButton.classList.add('copy-success');facebookButton.disabled=false;
    status.textContent='Copied ✓ Now open Facebook and paste it into the “What’s on your mind?” area.';
  }
  const message=r=>`♻️ Bag Day Malta
The Waste Sorting Game

🏆 Highest Level: ${r.highestLevel}
⏱️ Most sorted in 1 minute: ${r.bestRound}
🌟 Most sorted in 1 minute with zero mistakes: ${r.bestPerfectRound}

Play here 👇
${url}`;
  button.addEventListener('click',()=>{
    shareSession++;
    copyButton.textContent='① Copy result';copyButton.classList.remove('copy-success');
    facebookButton.disabled=true;text.hidden=true;
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
      scene.innerHTML='<div class="guide-action">'+(step===0?'① Copy result':'② Post on Facebook')+'</div><div class="guide-pointer"><span class="guide-hand">👆</span></div>'+(step===0?'<span class="guide-bubble" hidden>Score copied</span>':'');
    }else{
      scene.innerHTML='<span class="guide-bubble guide-paste-bubble" hidden>PASTE Copied Text Here</span><div class="guide-facebook-head">Facebook · Create post</div><div class="guide-post-box"><span class="guide-post-placeholder">What’s on your mind?</span><span class="guide-post-text" hidden></span><svg class="guide-paste-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5H5v16h14V5h-4M9 3h6v4H9zM12 10v7m-3-3 3 3 3-3"/></svg></div><div class="guide-post-button">Post</div><div class="guide-pointer"><span class="guide-hand">👆</span></div>';
    }
    caption.textContent=['Tap Copy result.','Tap Post on Facebook.','Tap the post box and paste your result.'][step];
  }
  const later=(ms,fn)=>guideTimers.push(setTimeout(fn,ms));
  $('shareGuideHelp').addEventListener('click',()=>{
    stopGuide();guide.hidden=false;
    guide.classList.toggle('guide-reduced',Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches));
    guideStep(0);
    later(1000,()=>scene.classList.add('guide-tap'));
    later(1500,()=>{
      scene.querySelector('.guide-bubble').hidden=false;
      caption.textContent='Score copied.';
    });
    later(2300,()=>scene.classList.add('guide-scene-out'));
    later(2550,()=>guideStep(1));
    later(3000,()=>scene.classList.add('guide-tap'));
    later(5000,()=>scene.classList.add('guide-scene-out'));
    later(5250,()=>guideStep(2));
    later(5750,()=>{
      scene.classList.add('guide-tap');
      scene.querySelector('.guide-paste-bubble').hidden=false;
      caption.textContent='PASTE Copied Text Here, in the What’s on your mind area.';
    });
    later(6000,()=>{
      scene.querySelector('.guide-post-placeholder').hidden=true;
      const preview=scene.querySelector('.guide-post-text');
      preview.textContent=text.value;preview.hidden=false;
      caption.textContent='Result pasted. Now tap Post.';
    });
    later(8000,()=>{
      scene.querySelector('.guide-paste-bubble').hidden=true;
      scene.classList.remove('guide-tap');
      scene.classList.add('guide-post-tap');
      caption.textContent='Tap Post.';
    });
    later(9000,()=>guide.classList.add('guide-fade'));
    later(9250,stopGuide);
  });
  // The tap that starts Help is allowed through; the next click anywhere dismisses it.
  document.addEventListener('click',event=>{
    if(guide.hidden)return;
    event.preventDefault();event.stopImmediatePropagation();stopGuide();
  },true);
  dialog.addEventListener('close',()=>{shareSession++;stopGuide();});
  dialog.addEventListener('cancel',event=>{
    if(!guide.hidden){event.preventDefault();stopGuide();}
  });
  $('shareRecordsClose').addEventListener('click',()=>{stopGuide();dialog.close();});
  copyButton.addEventListener('click',async()=>{
    const session=shareSession;
    try {
      if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text.value);
      if(session===shareSession)copiedSuccessfully();
    } catch {
      if(session!==shareSession)return;
      text.hidden=false;text.focus();text.select();text.setSelectionRange(0,text.value.length);
      status.textContent='Copy the selected text using your device’s Copy option, then open Facebook and paste it.';
    }
  });
  // A native Copy action on the fallback selection also unlocks Facebook.
  text.addEventListener('copy',event=>{
    if(!event.isTrusted)return;
    const session=shareSession;
    setTimeout(()=>{if(!event.defaultPrevented&&session===shareSession)copiedSuccessfully();},0);
  });
  facebookButton.addEventListener('click',()=>{
    if(facebookButton.disabled)return;
    window.location.href='https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(url);
  });
})();

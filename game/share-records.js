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
  $('shareGuidePause').addEventListener('click',()=>{
    const paused=$('shareGuidePause').getAttribute('aria-pressed')!=='true';
    $('shareGuidePause').setAttribute('aria-pressed',String(paused));
    $('shareGuidePause').textContent=paused?'Play animation':'Pause animation';
    dialog.classList.toggle('share-guide-paused',paused);
  });
  $('shareRecordsClose').addEventListener('click',()=>dialog.close());
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

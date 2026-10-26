(() => {
  'use strict';
  const button=document.getElementById('shareGameRecords');
  const dialog=document.getElementById('shareRecordsDialog');
  if(!button||!dialog||!window.SORTING_STATS)return;
  const url='https://bagdaymalta.eu/game/';
  const $=id=>document.getElementById(id);
  const status=$('shareRecordsStatus');
  const records=()=>window.SORTING_STATS.snapshot();
  const message=r=>`Can you beat my Sorting Game records? 🏆 Highest Level: ${r.highestLevel} · Most Correct: ${r.bestRound} · Longest Streak: ${r.longestStreak} days. Play free: ${url}`;
  function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
  function makeImage(r){
    const c=document.createElement('canvas');c.width=1080;c.height=1080;
    const ctx=c.getContext('2d');if(!ctx)throw Error('Picture creation unavailable');
    const g=ctx.createLinearGradient(0,0,1080,1080);g.addColorStop(0,'#0c588b');g.addColorStop(1,'#0c2639');ctx.fillStyle=g;ctx.fillRect(0,0,1080,1080);
    ctx.strokeStyle='#65b8c5';ctx.lineWidth=4;roundRect(ctx,52,52,976,976,55);ctx.stroke();
    const center=(txt,y,size,color='#fff',weight=750)=>{ctx.fillStyle=color;ctx.font=`${weight} ${size}px system-ui, sans-serif`;ctx.textAlign='center';ctx.fillText(txt,540,y);};
    center('BAG DAY MALTA',170,49,'#a6ecdb');center('THE 1 MINUTE',253,58);center('SORTING GAME',324,71);
    center('MY PERSONAL RECORDS',401,38,'#c2e8f0');
    const rows=[['Highest Level',r.highestLevel],['Most Correct',r.bestRound],['Longest Streak',`${r.longestStreak} days`]];
    rows.forEach(([label,value],i)=>{const y=445+i*142;ctx.fillStyle='#184a62';roundRect(ctx,104,y,872,121,25);ctx.fill();ctx.textAlign='left';ctx.font='600 35px system-ui';ctx.fillStyle='#d3e9f0';ctx.fillText(label,141,y+72);ctx.textAlign='right';ctx.font='800 49px system-ui';ctx.fillStyle='#fff';ctx.fillText(String(value),935,y+77);});
    center('CAN YOU BEAT MY RECORDS?',925,39);center('Play free at bagdaymalta.eu/game/',983,31,'#a6ecdb');
    return new Promise((resolve,reject)=>c.toBlob(blob=>blob?resolve(blob):reject(Error('Picture could not be created')),'image/png'));
  }
  const filename='BagDayMalta_SortingGame_Records.png';
  function download(blob){const a=document.createElement('a');const obj=URL.createObjectURL(blob);a.href=obj;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(obj),1500);}
  const feedback=text=>{status.textContent=text;};
  button.addEventListener('click',()=>{feedback('Challenge your friends to beat your Sorting Game records.');dialog.showModal();});
  $('shareRecordsClose').addEventListener('click',()=>dialog.close());
  $('shareRecordsNative').addEventListener('click',async()=>{
    const r=records();
    try{
      const blob=await makeImage(r);
      const file=new File([blob],filename,{type:'image/png'});
      if(navigator.share && navigator.canShare?.({files:[file]})){
        await navigator.share({files:[file],title:'My Bag Day Malta Sorting Game records',text:message(r),url});
        feedback('Sharing options opened.');
      }else if(navigator.share){
        await navigator.share({title:'My Sorting Game records',text:message(r),url});
        feedback('Link sharing options opened. You can also save the achievement picture below.');
      }else{download(blob);feedback('Achievement picture saved. Upload it to Facebook, or use the Facebook link button.');}
    }catch(e){if(e?.name!=='AbortError')feedback('Sharing was unavailable. Try saving the picture or copying the game link.');}
  });
  $('shareRecordsDownload').addEventListener('click',async()=>{try{download(await makeImage(records()));feedback('Achievement picture saved to your device.');}catch{feedback('Unable to create the picture in this browser.');}});
  $('shareRecordsFacebook').addEventListener('click',()=>{const destination='https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(url);window.open(destination,'_blank','noopener,noreferrer');feedback('Facebook sharing opened. To show your scores, attach the saved achievement picture to your post.');});
  $('shareRecordsCopy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(message(records()));feedback('Your records and the game link were copied.');}catch{feedback('Copy unavailable. Game link: '+url);}});
})();

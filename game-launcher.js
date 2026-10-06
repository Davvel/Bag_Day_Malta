/* Optional launcher boundary. /game/ never imports the app's methods, data, graphics or styles.
   Delete /game/ after setting Game_Enabled=false. Missing mode files cannot break Bag Day. */
(() => {
 'use strict';
 const button=document.getElementById('gameModeButton'),layer=document.getElementById('gameModeLayer'),content=document.getElementById('appContent'),status=document.getElementById('gameLaunchStatus'),message=document.getElementById('gameLaunchMessage'),back=document.getElementById('gameLaunchBack');
 if(!button||!layer||!content)return;
 let gameInfo=false;
 let gamePaused=false,gameWon=false,gameRound=false;
 let enabled=false,frame=null,launchTimer=null,opener=null,previousOverflow='',launchSerial=0,controller=null;
 function close(){
  gameInfo=false;gamePaused=false;gameWon=false;gameRound=false;
  launchSerial++;controller?.abort();controller=null;clearTimeout(launchTimer);frame?.remove();frame=null;layer.hidden=true;content.inert=false;document.body.style.overflow=previousOverflow;
  if(opener?.isConnected && !opener.hidden)opener.focus({preventScroll:true});opener=null;
 }
 async function readSwitch(){
  try{
   const response=await fetch(`./game_config.txt?t=${Date.now()}`,{cache:'no-store'});
   const text=response.ok?await response.text():'';enabled=/^\s*Game_Enabled\s*=\s*true\s*$/mi.test(text);button.hidden=!enabled;
   if(!enabled && !layer.hidden)close();
  }catch(_){enabled=false;button.hidden=true;}
 }
 button.addEventListener('click',async()=>{
  if(!enabled||!layer.hidden||content.inert||!document.getElementById('splashScreen').hidden||document.getElementById('dashboard').hidden||[...document.querySelectorAll('.overlay')].some(node=>!node.hidden))return;
  opener=button;previousOverflow=document.body.style.overflow;content.inert=true;document.body.style.overflow='hidden';layer.hidden=false;status.hidden=false;message.textContent='Opening Sort & Learn…';back.focus();
  const serial=++launchSerial;controller=new AbortController();launchTimer=setTimeout(()=>controller?.abort(),5000);
  try{
   const response=await fetch('./game/index.html',{cache:'no-store',signal:controller.signal});if(!response.ok)throw new Error('Missing game');
   clearTimeout(launchTimer);if(serial!==launchSerial)return;
   frame=document.createElement('iframe');frame.title='Sort & Learn game';frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox');frame.allow='screen-wake-lock';frame.src='./game/index.html';layer.append(frame);
   launchTimer=setTimeout(()=>{if(serial===launchSerial && !status.hidden){frame?.remove();frame=null;message.textContent='The game is unavailable. Bag Day is ready to use.';}},8000);
  }catch(_){if(serial===launchSerial){message.textContent='The game is unavailable. Bag Day is ready to use.';clearTimeout(launchTimer);}}
 });
 back.onclick=close;
 window.addEventListener('message',event=>{
  if(!frame||event.source!==frame.contentWindow||event.origin!==location.origin)return;
  if(event.data?.type==='bag-day-game-info'){gameInfo=event.data.open===true;window.BAG_DAY_BACK?.sync();}
  else if(event.data?.type==='bag-day-game-close')close();
  else if(event.data?.type==='bag-day-game-round'){gameRound=event.data.open===true;window.BAG_DAY_BACK?.sync();}
  else if(event.data?.type==='bag-day-game-pause'){gamePaused=event.data.paused===true;window.BAG_DAY_BACK?.sync();}
  else if(event.data?.type==='bag-day-game-win'){gameWon=event.data.open===true;window.BAG_DAY_BACK?.sync();}
  else if(event.data?.type==='bag-day-game-ready'){clearTimeout(launchTimer);status.hidden=true;frame.focus();}
 });
 // Mode is never saved or encoded in the URL. Every new page starts with Bag Day.
 window.BAG_DAY_BACK?.register('sortingGame',{isOpen:()=>!layer.hidden,close});
 window.BAG_DAY_BACK?.register('sortingGameRound',{isOpen:()=>!layer.hidden&&gameRound,close:()=>{gameRound=false;gameWon=false;frame?.contentWindow.postMessage({type:'bag-day-game-menu'},location.origin);}});
 window.BAG_DAY_BACK?.register('sortingGamePause',{isOpen:()=>!layer.hidden&&gamePaused,close:()=>{gamePaused=false;frame?.contentWindow.postMessage({type:'bag-day-game-resume'},location.origin);}});
 window.BAG_DAY_BACK?.register('sortingGameInformation',{isOpen:()=>!layer.hidden&&gameInfo,close:()=>{gameInfo=false;frame?.contentWindow.postMessage({type:'bag-day-game-info-close'},location.origin);}});
 layer.hidden=true;button.hidden=true;readSwitch();setInterval(readSwitch,30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)readSwitch();});
})();

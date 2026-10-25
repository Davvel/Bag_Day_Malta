/* Optional game: own document preserves Home's native history/zoom. */
(() => {
 'use strict';
 const button=document.getElementById('gameModeButton'),layer=document.getElementById('gameModeLayer'),content=document.getElementById('appContent'),status=document.getElementById('gameLaunchStatus'),message=document.getElementById('gameLaunchMessage'),back=document.getElementById('gameLaunchBack');
 if(!button||!layer||!content)return;
 let enabled=false,opening=false,controller=null,opener=null,previousOverflow='';
 const track=(name)=>window.BAG_DAY_ANALYTICS?.event(name);
 function close(){controller?.abort();controller=null;opening=false;layer.hidden=true;content.inert=false;document.body.style.overflow=previousOverflow;opener?.focus({preventScroll:true});opener=null;}
 async function readSwitch(){
  try{
   const text=location.protocol==='file:'?window.BAG_DAY_LOCAL_FILES?.['game_config.txt']||'':await fetch('./game_config.txt?t='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r.text():'');
   enabled=/^\s*Game_Enabled\s*=\s*true\s*$/mi.test(text);button.hidden=!enabled;
  }catch{enabled=false;button.hidden=true;}
 }
 button.addEventListener('click',async()=>{
  if(!enabled||opening||content.inert||!document.getElementById('splashScreen').hidden||document.getElementById('dashboard').hidden||[...document.querySelectorAll('.overlay')].some(n=>!n.hidden))return;
  opening=true;opener=button;previousOverflow=document.body.style.overflow;content.inert=true;document.body.style.overflow='hidden';layer.hidden=false;status.hidden=false;message.textContent='Opening Sort & Learn…';back.focus();
  const request=new AbortController();controller=request;const timer=setTimeout(()=>request.abort(),5000);
  try{
   if(location.protocol!=='file:'){const r=await fetch('./game/index.html',{cache:'no-store',signal:request.signal});if(!r.ok)throw new Error('Missing game');}
   if(!opening||request.signal.aborted)return;
   track('game_open');location.assign('./game/index.html?from=home&v=1.1.57&theme='+encodeURIComponent(document.documentElement.dataset.theme||'dark'));
  }catch{if(opening){track('game_unavailable');message.textContent='The game is unavailable. Bag Day is ready to use.';}}
  finally{clearTimeout(timer);}
 });
 back.onclick=close;
 window.addEventListener('pagehide',()=>{if(opening)close();});
 window.addEventListener('pageshow',()=>{if(opening)close();});
 layer.hidden=true;button.hidden=true;readSwitch();setInterval(readSwitch,30000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)readSwitch();});
})();

/* Apply the same saved appearance as Home before the noticeboard paints. */
(() => {
 const key='bag-day-appearance-v1';
 function apply(){
  let value;try{value=localStorage.getItem(key)}catch{}
  const theme=value==='light'?'light':'dark',root=document.documentElement;
  root.dataset.theme=theme;root.style.colorScheme=theme;
  root.style.backgroundColor=theme==='dark'?'#0b1421':'#e9f1f8';
  const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=root.style.backgroundColor;
 }
 apply();
 window.addEventListener('storage',e=>{if(e.key===key||e.key===null)apply()});
 window.addEventListener('pageshow',apply);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)apply()});
})();

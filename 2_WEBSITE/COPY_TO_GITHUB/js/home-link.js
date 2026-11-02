/* Home logos restore the previous Home entry when this visit came from Home. */
(() => {
 const key='bag-day-return-home-v1';
 let fromHome=false;try{const u=new URL(document.referrer);fromHome=u.origin===location.origin&&['/','/index.html'].includes(u.pathname)}catch{}
 const valid=n=>Number.isInteger(n)&&n>0&&n<history.length;
 if(fromHome&&!valid(history.state?.bagDayHomeSteps))history.replaceState({...history.state,bagDayHomeSteps:1},'');
 document.addEventListener('click',e=>{
  const link=e.target.closest?.('a[data-home-link]');if(!link||e.defaultPrevented||e.button>0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  e.preventDefault();try{sessionStorage.setItem(key,String(Date.now()))}catch{}
  const steps=history.state?.bagDayHomeSteps;
  if(fromHome&&valid(steps))history.go(-steps);else location.assign(link.href);
 });
})();

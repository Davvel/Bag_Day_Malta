/* Single source of truth for the frontend release. Change the version here only. */
(()=>{
 const config=Object.freeze({version:'1.1.101',splashEnabled:false});
 globalThis.BAG_DAY_CONFIG=config;
 if(typeof document==='undefined')return; // Also imported by the offline workers.
 function showVersion(){
  for(const node of document.querySelectorAll('[data-app-version]'))node.textContent=(node.dataset.versionPrefix??'v ')+config.version;
  for(const node of document.querySelectorAll('[data-app-version-label]'))node.setAttribute('aria-label',node.dataset.appVersionLabel.replace('{version}',config.version));
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',showVersion,{once:true});
 else showVersion();
})();

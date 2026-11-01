/* Reuse the existing feature launchers and their feature-flag behaviour. */
(()=>{'use strict';
 const row=document.querySelector('.home-shortcuts');if(!row)return;
 row.addEventListener('click',e=>{const target=e.target.closest('.home-shortcut');if(!target)return;
 if(target.id==='reuseModeButton')window.BAG_DAY_ANALYTICS?.event('reuse_entry_click',{entry_point:'home_shortcuts'});
 if(target.id==='noticeModeButton')window.BAG_DAY_ANALYTICS?.event('noticeboard_entry_click',{entry_point:'home_shortcuts'});
 });
})();

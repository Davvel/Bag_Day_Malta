import {request} from './client.mjs';
function entry(a,entry_point){a.addEventListener('click',()=>window.BAG_DAY_ANALYTICS?.event('reuse_entry_click',{entry_point}));}
const url=new URL('./',import.meta.url),icon=document.getElementById('reuseModeButton');
// The marketplace link lives in index.html; modules only enhance it.
if(icon){icon.href=url.href;entry(icon,'header');}
const settings=document.querySelector('#settingsDialog');
if(settings){const section=document.createElement('section');section.className='settings-section';section.innerHTML='<h3>REUSE</h3><p class="section-help"><a id="reuseMine" hidden>My REUSE items</a><a id="reuseJoin">Sign in to donate an item</a></p>';settings.querySelector('.settings-credit')?.before(section);const mine=section.querySelector('#reuseMine'),join=section.querySelector('#reuseJoin');mine.href=new URL('#mine',url).href;join.href=new URL('#join',url).href;entry(mine,'settings');entry(join,'settings');request('/reuse/me').then(()=>{mine.hidden=false;join.hidden=true}).catch(()=>{})}

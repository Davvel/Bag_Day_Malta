import {request} from '../reuse/client.mjs?v=1.1.158';
const buttons=[...document.querySelectorAll('[data-public-account]')];
let signed=false,known=false,busy=false,loadGoogle;
const dialog=document.createElement('dialog');dialog.className='bagday-account-dialog';dialog.setAttribute('aria-labelledby','publicAccountTitle');
dialog.innerHTML='<header><h2 id="publicAccountTitle">Sign in with Google</h2><button type="button" data-close>Close</button></header><p>Use your Bag Day account across the public screens.</p><div data-google></div><p data-error role="status"></p>';
document.body.append(dialog);dialog.querySelector('[data-close]').onclick=()=>dialog.close();
function paint(){for(const b of buttons){b.textContent=signed?'Sign Out':'Sign in';b.disabled=busy;b.setAttribute('aria-label',signed?'Sign out of Bag Day':'Sign in to Bag Day')}}
async function refresh(){const previous=signed;try{await request('/reuse/me');signed=true}catch(e){if(e.status===401)signed=false;else{buttons.forEach(b=>{b.disabled=false;b.textContent='Retry account'});return}}known=true;paint();if(previous!==signed)window.dispatchEvent(new CustomEvent('bag-day-account-changed',{detail:{signed_in:signed}}))}
function announce(){window.dispatchEvent(new CustomEvent('bag-day-account-changed',{detail:{signed_in:signed}}));try{localStorage.setItem('bag-day-account-refresh',String(Date.now()))}catch{}}
async function login(){
 dialog.querySelector('[data-error]').textContent='Loading Google sign-in…';dialog.showModal();
 try{
  const config=await request('/auth/public/config');
  if(!window.google?.accounts){loadGoogle ||= new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.onload=resolve;s.onerror=()=>{loadGoogle=null;s.remove();reject(Error('Google sign-in could not load. Please try again.'))};document.head.append(s)});await loadGoogle}
  if(!dialog.open)return;
  google.accounts.id.initialize({client_id:config.google_client_id,nonce:config.nonce,callback:async r=>{
   try{await request('/auth/public/google',{method:'POST',body:{credential:r.credential}});signed=true;paint();dialog.close();announce()}catch(e){dialog.querySelector('[data-error]').textContent=e.message}
  }});
  const box=dialog.querySelector('[data-google]');box.replaceChildren();google.accounts.id.renderButton(box,{theme:'outline',size:'large',width:Math.min(320,innerWidth-64)});dialog.querySelector('[data-error]').textContent='';
 }catch(e){dialog.querySelector('[data-error]').textContent=e.message}
}
for(const b of buttons)b.onclick=async()=>{
 if(busy)return;if(!known){await refresh();return}if(!signed){await login();return}
 busy=true;paint();try{await request('/auth/public/logout',{method:'POST',body:{}});signed=false;announce()}catch(e){if(!dialog.open)dialog.showModal();dialog.querySelector('[data-error]').textContent=e.message}finally{busy=false;paint()}
};
window.BAG_DAY_PUBLIC_ACCOUNT={refresh};
window.addEventListener('pageshow',refresh);window.addEventListener('storage',e=>{if(e.key==='bag-day-account-refresh')refresh()});
refresh();

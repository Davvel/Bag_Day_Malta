import {detailHTML} from './presentation.mjs?v=1.1.135';
import {esc} from './shared.mjs?v=1.1.135';

// Isolate the public notice from all editor and wizard styles.
export function mountNoticePreview(frame,item,source,locality,onClose){
 const version=new URL(import.meta.url).search;
 const styles=['/noticeboard/style.css','/css/sponsor-carousel.css','/css/brand.css','/css/public-layout.css'];
 const theme=document.documentElement.dataset.theme||'light';
 frame.onload=()=>{
  const doc=frame.contentDocument,dialog=doc.querySelector('#noticeDialog');
  if(!dialog)return;
  dialog.showModal();
  // Preview keeps the public controls visually intact without opening external actions.
  doc.addEventListener('click',event=>{if(event.target.closest('a'))event.preventDefault()});
  doc.querySelector('#closeNotice').onclick=onClose;
  dialog.addEventListener('cancel',event=>{event.preventDefault();onClose()});
 };
 frame.srcdoc=`<!doctype html><html lang="en" data-theme="${esc(theme)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${styles.map(path=>`<link rel="stylesheet" href="${esc(new URL(path+version,location.href).href)}">`).join('')}</head><body class="public-notices"><dialog id="noticeDialog" class="notice-detail-modal ${esc(source.key||item.section)}" aria-labelledby="noticeDetailTitle">${detailHTML(item,source,locality)}</dialog></body></html>`;
}

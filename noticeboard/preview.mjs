import {detailHTML} from './presentation.mjs?v=1.1.184';
import {esc} from './shared.mjs?v=1.1.184';

// Isolate the public notice from all editor and wizard styles.
export function mountNoticePreview(frame,item,source,locality){
 const version=new URL(import.meta.url).search;
 const styles=['/noticeboard/style.css','/css/sponsor-carousel.css','/css/brand.css','/css/public-layout.css'];
 const theme=document.documentElement.dataset.theme||'light';
 frame.onload=()=>{
  const doc=frame.contentDocument,dialog=doc.querySelector('#noticeDialog');
  if(!dialog)return;
  // Preview keeps the public controls visually intact without opening external actions.
  doc.addEventListener('click',event=>{if(event.target.closest('a'))event.preventDefault()});
  const close=doc.querySelector('#closeNotice');
  const dismissed=doc.createElement('section');
  dismissed.className='notice-preview-dismissed';
  dismissed.hidden=true;
  dismissed.innerHTML='<p>Notice preview closed.</p><button type="button">Reopen notice preview</button>';
  doc.body.append(dismissed);
  dismissed.querySelector('button').addEventListener('click',()=>{dismissed.hidden=true;dialog.showModal();dialog.focus()});
  dialog.addEventListener('close',()=>{dismissed.hidden=false;dismissed.querySelector('button').focus()});
  dialog.tabIndex=-1;dialog.showModal();dialog.focus();
  close.addEventListener('click',()=>dialog.close());
 };
 frame.srcdoc=`<!doctype html><html lang="en" data-theme="${esc(theme)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${styles.map(path=>`<link rel="stylesheet" href="${esc(new URL(path+version,location.href).href)}">`).join('')}<style>dialog.notice-detail-modal{margin-block:8px;max-height:calc(100dvh - 16px)}.notice-preview-dismissed{box-sizing:border-box;min-height:180px;margin:8px;padding:24px;border:1px solid var(--nb-border);border-radius:16px;background:var(--nb-card);color:var(--nb-ink);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center}.notice-preview-dismissed[hidden]{display:none}.notice-preview-dismissed p{margin:0}.notice-preview-dismissed button{padding:10px 16px;border:1px solid var(--nb-border);border-radius:10px;background:var(--nb-card);color:var(--nb-ink);font:inherit;cursor:pointer}</style></head><body class="public-notices"><dialog id="noticeDialog" class="notice-detail-modal ${esc(source.key||item.section)}" aria-labelledby="noticeDetailTitle">${detailHTML(item,source,locality)}</dialog></body></html>`;
}

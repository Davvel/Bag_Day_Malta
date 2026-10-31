import {today} from './shared.mjs?v=1.1.126';
let popup=null,opener=null;
function cleanState(){const state={...history.state};delete state.bagDaySlotHelp;return state;}
// A reload has no open dialog, so discard only this dialog's transient marker.
if(history.state?.bagDaySlotHelp)history.replaceState(cleanState(),'');
function finishClose(){if(popup?.open)popup.close();if(opener?.isConnected)opener.focus({preventScroll:true});opener=null;}
function close(){if(history.state?.bagDaySlotHelp)history.back();else finishClose();}
window.addEventListener('popstate',()=>{if(popup?.open&&!history.state?.bagDaySlotHelp)finishClose()});
export function openSlotHelp(state,button){
 if(!popup){popup=document.createElement('dialog');popup.className='slot-help-dialog';popup.setAttribute('aria-labelledby','slotHelpTitle');document.body.append(popup);popup.addEventListener('cancel',event=>{event.preventDefault();close()});}
 const current=state.items.filter(i=>i.end_date>=today()).length,expired=state.items.length-current;
 popup.innerHTML=`<div class="notice-modal-heading"><h2 id="slotHelpTitle">Your 20 notice slots</h2><button type="button" class="notice-circle-close" aria-label="Close noticeboard help" title="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div><p class="slot-counter"><strong>${state.items.length}/20 slots used</strong> · ${current} current · ${expired} expired · ${Math.max(0,20-state.items.length)} available</p><p>Each locality has a separate allowance of 20 saved notices for Council, 20 for Church and 20 for Police. Events and information notices share this section’s 20 slots.</p><p><strong>Expired notices still use a slot.</strong> Edit and renew one to reuse its slot, or delete it to free space. They are no longer visible to the public.</p><p>Information notices can show for up to 30 days. Events can have any future date. Both stay visible through their final date, then disappear automatically after midnight in Malta.</p><p>Future events appear immediately once published. Information notices appear first, newest updates first; events follow, earliest event first.</p><p><strong>Save draft, then Publish Notices.</strong> Saving alone does not update the public board.</p><p class="hint">For older notices, the creation date uses their previously recorded modification time; the original creation time was not recorded.</p>`;
 popup.querySelector('button').onclick=close;opener=button;
 if(!history.state?.bagDaySlotHelp)history.pushState({...history.state,bagDaySlotHelp:true},'');
 popup.showModal();
}

import {esc,icon,calendarURL} from './shared.mjs?v=1.1.131';
import {longDate,eventSymbol} from './discovery.mjs?v=1.1.131';
import {noticeLink} from './links.mjs?v=1.1.131';
import {mapURL} from './locations.mjs?v=1.1.131';
export const noticeType=i=>i.notice_type||i.kind;
export function noticeBadge(item){
 if(item.kind!=='event')return `<span class="info-square">${icon('info')}<span class="sr-only">${noticeType(item)==='disruption'?'Temporary change':'Information'}</span></span>`;
 const d=new Date(item.end_date+'T12:00:00Z');return `<span class="date-weekday">${d.toLocaleDateString('en-GB',{weekday:'short',timeZone:'UTC'}).toUpperCase()}</span><strong>${d.getUTCDate()}</strong><span>${d.toLocaleDateString('en-GB',{month:'short',timeZone:'UTC'}).toUpperCase()}</span>`;
}
export function detailHTML(item,source,locality){
 const type=noticeType(item),physical=item.location_mode==='physical'||(!item.location_mode&&!!item.where_text),url=physical?mapURL(item):'',place=physical&&(item.where_text||url),external=noticeLink(item);
 const row=(label,name,body)=>`<section class="detail-fact">${icon(name)}<span class="detail-label">${label}</span><div>${body}</div></section>`;
 let when='';
 if(type==='event')when=row('When','calendar',`<strong>${esc(longDate(item.end_date))}</strong>${item.start_time?`<p>${esc(item.start_time)}–${esc(item.end_time)} <small>(Malta time)</small></p>`:'<p>All day</p>'}`);
 if(type==='disruption')when=row('When','calendar',`<strong>From ${esc(longDate(item.start_date||item.end_date))}</strong>${item.expected_end_date?`<p>Expected until ${esc(longDate(item.expected_end_date))}${item.expected_end_time?' · '+esc(item.expected_end_time)+' (Malta time)':''}</p>`:'<p>End date not yet confirmed</p>'}`);
 const where=place?row('Where','pin',`<strong>${esc(item.locality||locality)}</strong>${item.where_text?`<p>${esc(item.where_text)}</p>`:''}${url?`<a href="${esc(url)}" data-notice-action="map" target="_blank" rel="noopener noreferrer">Open in Google Maps ↗</a>`:''}`):item.location_mode==='online'?row('Where','info','<strong>Online</strong>'):'';
 return `<header class="notice-detail-titlebar"><div class="notice-detail-source">${icon(source.icon)}<strong>${esc(source.name)}</strong></div><button type="button" class="notice-detail-close" id="closeNotice" aria-label="Close notice"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header><div class="notice-detail-body"><div class="detail-headline"><span class="detail-emoji" aria-hidden="true">${esc(eventSymbol(item))}</span><div><h2 id="noticeDetailTitle">${esc(item.title)}</h2>${type!=='event'?`<span class="detail-kind">${type==='disruption'?'Temporary change':'Information'}</span>`:''}${!place?`<p class="detail-locality">${esc(item.locality||locality)}</p>`:''}</div></div>${when}${where}<p class="modal-text">${esc(item.description)}</p>${external||type==='event'?`<footer class="detail-actions">${external}${type==='event'?`<a class="primary" data-notice-action="calendar" href="${esc(calendarURL(item,item.locality||locality))}" target="_blank" rel="noopener noreferrer">${icon('calendar')}<span>Add to your calendar</span></a>`:''}</footer>`:''}</div>`;
}

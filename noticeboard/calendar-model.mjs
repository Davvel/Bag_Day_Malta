import {monthCells,moveMonth} from './discovery.mjs?v=1.1.126';
import {compareLocalityNotices} from './discovery.mjs?v=1.1.126';
export function calendarDays(items){const days=new Map();for(const item of items)if(item.kind==='event'){if(!days.has(item.end_date))days.set(item.end_date,[]);days.get(item.end_date).push(item)}for(const rows of days.values())rows.sort(compareLocalityNotices);return days}
export const calendarSourceOrder=['council','church','police'];
export const cappedNoticeCount=count=>count>9?'9+':String(count);
export function calendarSectors(entries){return calendarSourceOrder.map(section=>{const items=entries.filter(item=>item.section===section);return {section,count:items.length,first:items[0]||null}})}
export function calendarContext({section='',category='',audience='',locality='',allLocalities=false,q=''}={}){const subject=category==='Activities & outings'?'Activities':category||'Notices',who=section?section+' ':'';return 'Showing '+(!category?'all ':'')+who+subject+(audience?' for '+audience:'')+' in '+(allLocalities?'all localities':locality)+(q?' matching “'+q+'”':'')}

export function calendarMonthCells(month){const cells=monthCells(month);return [...cells,...Array(42-cells.length).fill(null)]}

export function calendarBounds(date){const min=date.slice(0,7);return {min,max:moveMonth(min,6)}}
export function boundedCalendarMonth(month,date){const {min,max}=calendarBounds(date);if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month||''))return min;return month<min?min:month>max?max:month}

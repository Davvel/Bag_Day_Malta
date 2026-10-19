/* Listing age comes from the immutable submission date, never the expiry. */
const DAY=86400000;
const calendar=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Malta',year:'numeric',month:'2-digit',day:'2-digit'});
const fullDate=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Malta',year:'numeric',month:'long',day:'numeric'});
export function submittedTime(item){
 const value=item?.submitted_at;if(typeof value!=='string'||!value.trim())return null;
 const normal=/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value)?value.replace(' ','T')+'Z':value;
 const ms=Date.parse(normal);return Number.isFinite(ms)?ms:null;
}
function calendarDay(ms){const parts=Object.fromEntries(calendar.formatToParts(ms).map(p=>[p.type,p.value]));return Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day))/DAY}
export function listingAge(item,now=Date.now()){
 const submitted=submittedTime(item);if(submitted===null||submitted>now+120000)return null;
 return Math.max(0,Math.round(calendarDay(now)-calendarDay(submitted)));
}
export function ageLabel(item,now=Date.now()){const days=listingAge(item,now);return days===null?'Date unavailable':days===0?'Today':days===1?'1 day old':days+' days old'}
export function postedDate(item){const submitted=submittedTime(item);return submitted===null?'':fullDate.format(submitted)}
export function newestFirst(items){return [...items].sort((a,b)=>(submittedTime(b)??0)-(submittedTime(a)??0))}

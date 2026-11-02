// Calendar dates are always interpreted in Europe/Malta, independently of device timezone.
const DAY=86400000;
export function maltaDate(at=new Date()){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Malta',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(at),get=k=>parts.find(p=>p.type===k).value;
 return `${get('year')}-${get('month')}-${get('day')}`;
}
export function addDays(value,days){return new Date(Date.parse(value+'T00:00:00Z')+days*DAY).toISOString().slice(0,10)}
export function showUntilLimits(at=new Date()){const min=maltaDate(at);return {min,max:addDays(min,30)}}
export function showUntilFromExpiry(value){const time=Date.parse(value);return Number.isFinite(time)?maltaDate(new Date(time-1)):''}
export function expiryForShowUntil(value,at=new Date()){
 const {min,max}=showUntilLimits(at);
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'T00:00:00Z'))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value||value<min||value>max)throw Error('Choose a Show Until date from today to 30 days from today (Malta time).');
 const midnight=Date.parse(addDays(value,1)+'T00:00:00Z');
 const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Malta',hour:'2-digit',hourCycle:'h23'}).format(new Date(midnight)));
 return new Date(midnight-hour*3600000).toISOString();
}

// Calendar months, clamped to the final day when the target month is shorter.
export function eventDateMaximum(date){
 const [year,month,day]=date.split('-').map(Number),target=new Date(Date.UTC(year,month-1+6,1,12));
 const last=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0,12)).getUTCDate();
 target.setUTCDate(Math.min(day,last));return target.toISOString().slice(0,10);
}

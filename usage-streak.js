(() => {
 'use strict';
 const key='bag-day-usage-streak-v1';
 const day=(date=new Date())=>{const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Malta',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);const part=name=>parts.find(p=>p.type===name).value;return `${part('year')}-${part('month')}-${part('day')}`;};
 const ordinal=value=>Date.parse(`${value}T12:00:00Z`)/86400000;
 function read(){let saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}')||{};}catch(_){}const count=value=>Number.isFinite(Number(value))?Math.max(0,Math.floor(Number(value))):0;return {current:count(saved.current),longest:count(saved.longest),lastDay:typeof saved.lastDay==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(saved.lastDay)?saved.lastDay:null};}
 function snapshot(date=new Date()){const record=read();if(!record.lastDay||ordinal(day(date))-ordinal(record.lastDay)>1)record.current=0;return record;}
 function visit(date=new Date()){const record=snapshot(date),today=day(date);if(record.lastDay!==today){record.current=record.lastDay&&ordinal(today)-ordinal(record.lastDay)===1?record.current+1:1;record.lastDay=today;}record.longest=Math.max(record.longest,record.current);try{localStorage.setItem(key,JSON.stringify(record));}catch(_){}return record;}
 window.BAG_DAY_STREAK={snapshot,visit};
 if(!document.hidden)visit();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)visit();});
 window.addEventListener('pageshow',()=>{if(!document.hidden)visit();});
})();

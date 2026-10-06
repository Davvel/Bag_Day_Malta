(() => {
 'use strict';
 const key='sort-belt-records-v1';
 const day=(date=new Date())=>{const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Malta',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);const get=type=>parts.find(p=>p.type===type).value;return `${get('year')}-${get('month')}-${get('day')}`;};
 const dayNumber=value=>Date.parse(`${value}T12:00:00Z`)/86400000;
 const count=value=>Math.max(0,Math.floor(Number(value)||0));
 function read(){let saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}')||{};}catch(_){}return {firstDay:saved.firstDay||null,highestLevel:Math.min(100,count(saved.highestLevel)),bestRound:count(saved.bestRound),currentStreak:count(saved.currentStreak),longestStreak:count(saved.longestStreak),lastDay:typeof saved.lastDay==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(saved.lastDay)?saved.lastDay:null};}
 function snapshot(date=new Date()){const stats=read(),gap=stats.lastDay?dayNumber(day(date))-dayNumber(stats.lastDay):Infinity;if(gap>1)stats.currentStreak=0;return stats;}
 function complete({level,hits,passed},date=new Date()){
  const stats=snapshot(date),today=day(date);
  if(!stats.firstDay&&!stats.longestStreak)stats.firstDay=today;stats.highestLevel=Math.max(stats.highestLevel,passed?count(level):0);stats.bestRound=Math.max(stats.bestRound,count(hits));
  if(stats.lastDay!==today){stats.currentStreak=stats.lastDay&&dayNumber(today)-dayNumber(stats.lastDay)===1?stats.currentStreak+1:1;stats.lastDay=today;}
  stats.longestStreak=Math.max(stats.longestStreak,stats.currentStreak);
  try{localStorage.setItem(key,JSON.stringify(stats));}catch(_){}return stats;
 }
 window.SORTING_STATS={snapshot,complete,day};
})();

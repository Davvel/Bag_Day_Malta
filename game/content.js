/* Pure round planning: keep three destinations and accept every valid visible route. */
(() => {
 'use strict';
 const destinations={
  organic:{id:'organic',name:'Organic',image:'assets/bag-organic.svg',detail:'White bag'},
  mixed:{id:'mixed',name:'Mixed',image:'assets/bag-mixed.svg',detail:'Black bag'},
  recycle:{id:'recycle',name:'Recyclables',image:'assets/bag-recycle.svg',detail:'Grey / green bag'},
  battery:{id:'battery',name:'Battery bin',image:'assets/destination-battery.svg',detail:'Ask a grown-up'},
  roadshow:{id:'roadshow',name:'Roadshow Truck',image:'assets/destination-roadshow.svg',detail:'Check the local stop'},
  bulky:{id:'bulky',name:'Bulky collection',image:'assets/destination-bulky.svg',detail:'Book with your council'}
 };
 const lessons=[
  {id:'batteries',route:'battery',replace:1,item:'battery-aa',title:'Small batteries have their own home',text:'A used battery does not go in a waste bag. Ask a grown-up to take it to a battery collection bin, such as Batteries for Hospice.',extra:'Never play with batteries. A grown-up should handle them.',link:'https://batterybin.mt/'},
  {id:'oil',route:'roadshow',replace:2,item:'oil-jar',title:'Used cooking oil needs a special stop',text:'Oil left over from cooking does not go in a bag or down the sink. Ask a grown-up to take it in a closed container to the WasteServ Roadshow Truck.',extra:'A Civic Amenity Site accepts cooking oil too. This is cooking oil, not engine oil.',link:'https://www.wsm.com.mt/en/roadshow'},
  {id:'paint',route:'roadshow',replace:2,item:'paint-tin',title:'Leftover paint needs a special stop',text:'Paint left in a tin does not go in a waste bag. Ask a grown-up to take it to the WasteServ Roadshow Truck.',extra:'Keep it in its original labelled container. A Civic Amenity Site accepts paint too.',link:'https://www.wsm.com.mt/en/roadshow'},
  ...[['chair','A broken chair'],['sofa','A worn-out sofa'],['mattress','A worn-out mattress'],['table','A broken table'],['wardrobe','A broken wardrobe'],['bed','A broken bed frame']].map(([id,name])=>({id:'bulky-'+id,route:'bulky',replace:0,item:'bulky-'+id,title:name+' is too big for a bag',text:'Ask a grown-up to book a free bulky collection with your Local Council. Put it outside only when the council tells you.',extra:'If furniture can still be used safely, giving it to someone else is another option. A Civic Amenity Site also accepts bulky items.',link:'https://www.wsm.com.mt/en/bulky-waste'}))
 ];
 const classic=['organic','mixed','recycle'];
 function shuffle(items,random=Math.random){const a=items.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a;}
 function plan(level,lesson=null,random=Math.random){
  if(level<=10)lesson=null;
  const columns=classic.slice();if(lesson)columns[lesson.replace]=lesson.route;
  const perBag=Math.min(24,2+Math.floor((level-1)/2)*2);
  const pool=[];
  columns.forEach(route=>{
   const choices=window.SORTING_ITEMS.filter(item=>item.bag!==null?classic[item.bag]===route:item.lesson===lesson?.id&&item.routes.includes(route));
   pool.push(...shuffle(choices,random).slice(0,perBag));
  });
  return {columns,pool,lesson};
 }
 const accepts=(item,route)=>item.routes.includes(route);
 const laneFor=(item,columns)=>columns.findIndex(route=>accepts(item,route));
 function deck(pool,lastId=null,random=Math.random){const a=shuffle(pool,random);const special=a.findIndex(item=>item.bag===null);if(special>=0&&special<a.length-6){const early=Math.max(0,a.length-3);[a[special],a[early]]=[a[early],a[special]];}if(a.length>1&&a[a.length-1].id===lastId)[a[0],a[a.length-1]]=[a[a.length-1],a[0]];return a;}
 window.SORTING_CONTENT={destinations,lessons,classic,plan,accepts,laneFor,deck};
})();

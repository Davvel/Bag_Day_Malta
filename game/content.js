/* Pure round planning: keep three destinations and accept every valid visible route. */
(() => {
 'use strict';
 const destinations={
  organic:{id:'organic',name:'Organic',image:'assets/bag-organic.svg',detail:'White bag'},
  mixed:{id:'mixed',name:'Mixed',image:'assets/bag-mixed.svg',detail:'Black bag'},
  recycle:{id:'recycle',name:'Recyclables',image:'assets/bag-recycle.svg',detail:'Grey / green bag'},
  battery:{id:'battery',name:'Battery bin',image:'assets/destination-battery.svg',detail:'Battery collection'},
  roadshow:{id:'roadshow',name:'Roadshow Truck',image:'assets/destination-roadshow.svg',detail:'Check the local stop'},
  bulky:{id:'bulky',name:'Bulky collection',image:'assets/destination-bulky.svg',detail:'Book with your council'}
 };
 const lessons=[
  {id:'batteries',route:'battery',replace:1,item:'battery-aa',title:'Used batteries go in a battery bin',text:'Keep small household batteries out of waste bags. Take them to a battery collection point, such as a Batteries for Hospice bin.',extra:'Household batteries are also accepted at Roadshow Trucks and Civic Amenity Sites.',link:'https://batterybin.mt/'},
  {id:'oil',route:'roadshow',replace:2,item:'oil-jar',title:'Take used cooking oil to the Roadshow Truck',text:'Take used cooking oil in a closed container to the WasteServ Roadshow Truck. Keep it out of waste bags and drains.',extra:'A Civic Amenity Site accepts cooking oil too. This is cooking oil, not engine oil.',link:'https://www.wsm.com.mt/en/roadshow'},
  {id:'paint',route:'roadshow',replace:2,item:'paint-tin',title:'Take leftover paint to the Roadshow Truck',text:'Take leftover household paint to the WasteServ Roadshow Truck. Keep paint out of ordinary waste bags.',extra:'Keep it in its original labelled container. A Civic Amenity Site accepts paint too.',link:'https://www.wsm.com.mt/en/roadshow'},
  ...[['chair','A broken chair'],['sofa','A worn-out sofa'],['mattress','A worn-out mattress'],['table','A broken table'],['wardrobe','A broken wardrobe'],['bed','A broken bed frame']].map(([id,name])=>({id:'bulky-'+id,route:'bulky',replace:0,item:'bulky-'+id,title:name+' needs bulky collection',text:'Book a free bulky collection with your Local Council. Put the item out according to your booking instructions.',extra:'If furniture can still be used safely, giving it to someone else is another option. A Civic Amenity Site also accepts bulky items.',link:'https://www.wsm.com.mt/en/bulky-waste'}))
 ];
 // Select a fresh mode per round, then a destination before its lesson.
 // Equal destination weighting keeps the six bulky lessons from dominating.
 const specialRoutes=['battery','roadshow','bulky'];
 function chooseLesson(level,random=Math.random){
  if(level<=10||random()<0.6)return null;
  const route=specialRoutes[Math.floor(random()*specialRoutes.length)];
  const choices=lessons.filter(lesson=>lesson.route===route);
  return choices[Math.floor(random()*choices.length)];
 }
 const specialGuides={
  battery:{groups:[['Household batteries',['AA and AAA batteries','Button cells','9V batteries']]],note:'Use a household battery collection point. Check the collection operator for other battery types. Roadshow Trucks and Civic Amenity Sites also accept household batteries.'},
  roadshow:{groups:[['Accepted waste',['Clothing, bags and shoes','Plastic and metal','Used cooking oil','Light bulbs and fluorescent tubes','Glass bottles and jars','Paper and cardboard','Household batteries','Expanded polystyrene','Pots and pans','Small electronic devices','Paint and solvents','Aerosol cans']]],note:'Check the Roadshow schedule before visiting. Seal cooking oil and keep paint in its labelled container.'},
  bulky:{groups:[['Furniture',['Chairs, tables and sofas','Beds, wardrobes, dressers, desks and cupboards','Mattresses']],['Electrical equipment',['Fridges, freezers and air conditioners','Televisions, screens, laptops and tablets','Ovens, washing machines and dishwashers','Large sports and leisure equipment','Small electricals: microwaves, vacuums, irons, kettles, phones, printers and consoles']],['Textiles and household items',['Clothing, carpets, curtains and curtain rails','Cushions, pillows and rags','Luggage, prams and pushchairs','Heaters, cookers, barbecues and TV aerials','Clothes racks, brooms and ironing boards']],['Garden and other items',['Logs, leaves, plants and pots','Garden tools and lawnmowers','Canopies, gazebos and parasol bases','Bicycles, tyres, vehicle batteries, seat covers and mirrors']]],note:'Book with your Local Council and confirm your items before putting them outside. Usable items can be given away instead.'}
 };
 const classic=['organic','mixed','recycle'];
 function shuffle(items,random=Math.random){const a=items.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a;}
 function plan(level,lesson=null,random=Math.random){
  if(level<=10)lesson=null;
  let columns=classic.slice();if(lesson){columns[lesson.replace]=lesson.route;columns=shuffle(columns,random);}
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
 // Same denominator as the finished round: how many wrong answers needed to be right.
 function outcome(hits,misses){
  const total=hits+misses,percent=total?hits/total*100:0,required=Math.ceil(total*4/5),shortfall=Math.max(0,required-hits);
  const passed=total>0&&hits*5>=total*4;
  const accuracy=passed?Math.round(percent):Math.floor(percent*10)/10;
  const gap=shortfall===1?'1 fewer mistake':`${shortfall} fewer mistakes`;
  const message=!total?'A fresh start is waiting. Try sorting a few items this time.':passed?'Level complete!':percent>=70?`So close! ${gap} would have passed this round.`:percent>=50?`You are getting there. ${gap} would have passed this round.`:`This level needs a little more practice. ${gap} would have passed this round.`;
  return {total,percent,accuracy,required,shortfall,passed,message};
 }
 const artURL=id=>`assets/items/${id}.webp?v=1.1.42`;
 window.SORTING_CONTENT={outcome,artURL,destinations,lessons,chooseLesson,specialGuides,classic,plan,accepts,laneFor,deck};
})();

// Local visual hints only. Saved item_emojis will take priority when the API adds that field.
const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter('en',{granularity:'grapheme'}):null;
const emoji=/[\p{Extended_Pictographic}\p{Regional_Indicator}\u20e3]/u;
const categories=[
 [/\b(shoes?|trainers?|sneakers?|boots?|sandals?|slippers?)\b/i,'👟'],
 [/\b(laptops?|notebooks?|macbooks?)\b/i,'💻'],
 [/\b(phones?|smartphones?|iphones?)\b/i,'📱'],
 [/\b(computers?|monitors?|keyboards?|printers?)\b/i,'🖥️'],
 [/\b(bikes?|bicycles?|cycling)\b/i,'🚲'],
 [/\b(sofas?|couches?|armchairs?)\b/i,'🛋️'],
 [/\b(beds?|mattress(?:es)?|cots?)\b/i,'🛏️'],
 [/\b(chairs?|stools?|tables?|desks?|furniture)\b/i,'🪑'],
 [/\b(wardrobes?|cabinets?|drawers?|shelves|shelving|bookcases?)\b/i,'🗄️'],
 [/\b(dresses?|skirts?)\b/i,'👗'],
 [/\b(clothes|clothing|shirts?|jackets?|coats?|trousers|jeans|uniforms?)\b/i,'👕'],
 [/\b(baby|babies|toys?|tedd(?:y|ies)|prams?|strollers?)\b/i,'🧸'],
 [/\b(books?|novels?|magazines?)\b/i,'📚'],
 [/\b(plants?|garden|seedlings?|flowers?|seeds?|planters?)\b/i,'🪴'],
 [/\b(tools?|drills?|hammers?|saws?|screwdrivers?|ladders?)\b/i,'🧰'],
 [/\b(lamps?|lights?|lighting|bulbs?)\b/i,'💡'],
 [/\b(televisions?|tvs?)\b/i,'📺'],
 [/\b(pans?|pots?|cookware|kitchen|plates?|cutlery|crockery)\b/i,'🍳'],
 [/\b(washing|laundry|baskets?|blankets?|bedding|curtains?|towels?)\b/i,'🧺'],
 [/\b(fridges?|freezers?|coolers?)\b/i,'🧊'],
 [/\b(guitars?|music|pianos?|instruments?)\b/i,'🎸'],
 [/\b(painting|art|crafts?|easels?)\b/i,'🎨'],
 [/\b(footballs?|basketballs?|sports?|rackets?)\b/i,'⚽'],
 [/\b(weights?|dumbbells?|fitness|exercise)\b/i,'🏋️'],
 [/\b(games?|puzzles?)\b/i,'🎲'],
 [/\b(pets?|cats?|dogs?|kennels?|aquariums?)\b/i,'🐾'],
 [/\b(christmas|festive|decorations?)\b/i,'🎄'],
 [/\b(cakes?|birthday)\b/i,'🎂'],
 [/\b(bags?|luggage|suitcases?)\b/i,'🧳']
];
export function itemSymbols(item){
 const saved=item?.item_emojis;
 if(segmenter&&typeof saved==='string'&&saved.length<=1024){
  const icons=Array.from(segmenter.segment(saved),s=>s.segment).filter(s=>emoji.test(s)).slice(0,3);
  if(icons.length)return icons;
 }
 const description=String(item?.description||'');
 return [categories.find(([pattern])=>pattern.test(description))?.[1]||'♻️'];
}

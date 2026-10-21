export const ATTRIBUTE_VERSION=1;
export const ATTRIBUTES=[{"key":"item_condition","label":"Condition","multiple":false,"options":[["like_new","Like new"],["very_good","Very good"],["good","Good"],["fair","Fair"],["needs_repair","Needs repair"]]},{"key":"collection_time","label":"Collection","multiple":false,"options":[["flexible","Flexible"],["evenings","Evenings"],["weekends","Weekends"],["arrange_with_me","Arrange with me"]]},{"key":"moving_help","label":"Moving it","multiple":false,"options":[["easy_to_carry","Easy to carry"],["bulky","Bulky"],["heavy_needs_two_people","Heavy / needs two people"]]},{"key":"colours","label":"Colour","multiple":true,"options":[["black","Black"],["white","White"],["grey","Grey"],["brown","Brown"],["beige","Beige"],["red","Red"],["orange","Orange"],["yellow","Yellow"],["green","Green"],["blue","Blue"],["purple","Purple"],["pink","Pink"],["multicolour","Multicolour"],["other","Other"]]},{"key":"materials","label":"Material","multiple":true,"options":[["wood","Wood"],["metal","Metal"],["plastic","Plastic"],["glass","Glass"],["fabric","Fabric"],["leather","Leather"],["ceramic","Ceramic"],["paper_cardboard","Paper / Cardboard"],["mixed_materials","Mixed materials"],["other","Other"]]},{"key":"item_size","label":"Size","multiple":false,"options":[["very_large","Very Large"],["large","Large"],["medium","Medium"],["small","Small"]]}];
export const ATTRIBUTE_KEYS=ATTRIBUTES.map(a=>a.key);
export function normaliseAttributes(input,old={}){
 const out={};
 for(const a of ATTRIBUTES){
  const value=input[a.key]===undefined?old[a.key]:input[a.key];
  if(a.multiple){
   if(value===undefined||value===null){out[a.key]=[];continue}
   if(!Array.isArray(value)||value.length>a.options.length||value.some(v=>typeof v!=='string'||!a.options.some(o=>o[0]===v)))throw Error('Choose valid '+a.label.toLowerCase()+' options');
   out[a.key]=a.options.filter(o=>value.includes(o[0])).map(o=>o[0]);
  }else{
   if(value===undefined||value===null||value===''){out[a.key]=null;continue}
   if(typeof value!=='string'||!a.options.some(o=>o[0]===value))throw Error('Choose a valid '+a.label.toLowerCase()+' option');
   out[a.key]=value;
  }
 }
 return out;
}
export function decodeAttributes(item){
 const values={...item};for(const a of ATTRIBUTES)if(a.multiple&&typeof values[a.key]==='string'){try{values[a.key]=JSON.parse(values[a.key])}catch{values[a.key]=[]}}
 return normaliseAttributes(values);
}
export function attributeSummary(item){const v=decodeAttributes(item);return ATTRIBUTES.map(a=>({label:a.label,values:a.options.filter(o=>a.multiple?v[a.key].includes(o[0]):v[a.key]===o[0]).map(o=>o[1])})).filter(a=>a.values.length)}

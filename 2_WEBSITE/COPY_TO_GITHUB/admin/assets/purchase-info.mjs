export const MAX_PRICE_CENTS=100000000;
export const maltaYear=(now=new Date())=>Number(new Intl.DateTimeFormat('en',{timeZone:'Europe/Malta',year:'numeric'}).format(now));
export function normalisePurchase(input={},old={},year=maltaYear()){
 const price=input.original_price_cents===undefined?(old.original_price_cents??null):input.original_price_cents;
 const bought=input.purchase_year===undefined?(old.purchase_year??null):input.purchase_year;
 if(price!==null&&(!Number.isInteger(price)||price<0||price>MAX_PRICE_CENTS))throw Error('Enter an original price between €0 and €1,000,000, with up to two decimal places.');
 if(bought!==null&&(!Number.isInteger(bought)||bought<1900||bought>year))throw Error('Choose a purchase year between 1900 and this year.');
 return {original_price_cents:price,purchase_year:bought};
}
export function priceToCents(value){
 const text=String(value??'').trim();if(!text)return null;
 if(!/^\d{1,7}(?:\.\d{1,2})?$/.test(text))throw Error('Enter an original price with up to two decimal places.');
 const [whole,fraction='']=text.split('.'),cents=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 if(cents>MAX_PRICE_CENTS)throw Error('The maximum original price is €1,000,000.');return cents;
}
export function purchaseSummary(item,now=new Date()){
 const parts=[];
 if(Number.isInteger(item.original_price_cents)&&item.original_price_cents>=0){
  const cents=item.original_price_cents;
  parts.push('Originally purchased for '+new Intl.NumberFormat('en-MT',{style:'currency',currency:'EUR',minimumFractionDigits:cents%100?2:0,maximumFractionDigits:2}).format(cents/100));
 }
 if(Number.isInteger(item.purchase_year)&&item.purchase_year>=1900&&item.purchase_year<=maltaYear(now)){
  const years=maltaYear(now)-item.purchase_year;
  parts.push(years===0?'Bought this year':years===1?'Bought last year':'Bought about '+years+' years ago');
 }
 return parts.join(' · ');
}

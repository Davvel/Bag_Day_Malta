import {itemSymbols} from './item-symbols.mjs?v=1.1.17';

// The stored field stays ordered: one leading icon, then up to two trailing icons.
export function titleIcons(item){
 const [main,...extra]=itemSymbols(item);
 return {main,extra:extra.slice(0,2)};
}
export function promoteTitleIcon(icons,index){
 const next=[...icons];
 if(Number.isInteger(index)&&index>0&&index<next.length)[next[0],next[index]]=[next[index],next[0]];
 return next;
}

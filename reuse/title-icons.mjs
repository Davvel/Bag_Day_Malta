import {itemSymbols} from './item-symbols.mjs?v=1.1.105';

// The first saved icon is shown. Other saved icons stay in storage.
export function titleIcons(item){return {main:itemSymbols(item)[0],extra:[]}}

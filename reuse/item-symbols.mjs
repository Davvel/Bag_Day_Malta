// Existing saved Unicode icons are displayed unchanged; empty selections stay neutral.
const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter('en',{granularity:'grapheme'}):null;
const emoji=/[\p{Extended_Pictographic}\p{Regional_Indicator}\u20e3]/u;
export function itemSymbols(item){
 const saved=item?.item_emojis;
 if(segmenter&&typeof saved==='string'&&saved.length<=1024){const icons=Array.from(segmenter.segment(saved),s=>s.segment).filter(s=>emoji.test(s)).slice(0,3);if(icons.length)return icons}
 return ['📦'];
}

// Complete emoji clusters from paste or a keyboard, independent of the catalogue.
const segmenter=new Intl.Segmenter('en',{granularity:'grapheme'});
const pictograph='(?:\\p{Emoji_Modifier_Base}[\\uFE0E\\uFE0F]?\\p{Emoji_Modifier}?|\\p{Extended_Pictographic}[\\uFE0E\\uFE0F]?)';
const emojiPattern=new RegExp('^(?:'+pictograph+'(?:\\u200D'+pictograph+')*|\\p{Regional_Indicator}{2}|[0-9#*]\\uFE0F?\\u20E3|\\u{1F3F4}[\\u{E0061}-\\u{E007A}]{2,}\\u{E007F})$','u');
export function isEmoji(value){
 return typeof value==='string'&&value.length<=1024&&Array.from(value).length<=255&&emojiPattern.test(value)&&Array.from(segmenter.segment(value)).length===1;
}
export function emojiCandidates(value){
 if(typeof value!=='string'||value.length>4096)return [];
 return [...new Set(Array.from(segmenter.segment(value),s=>s.segment).filter(isEmoji))].slice(0,12);
}
// Preserve the existing three-icon storage limit for older listings and clients.
export function validItemEmojis(value){
 if(typeof value!=='string'||value.length>1024||Array.from(value).length>255)return false;
 const symbols=Array.from(segmenter.segment(value),s=>s.segment).filter(s=>s.trim());
 return symbols.length<=3&&symbols.every(isEmoji);
}

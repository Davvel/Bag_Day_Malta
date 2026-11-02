// Count complete visible characters, including joined emoji and combining marks.
const segmenter=new Intl.Segmenter('en',{granularity:'grapheme'});
export const titleLength=value=>Array.from(segmenter.segment(value)).length;
export const titleSlice=(value,max=40)=>Array.from(segmenter.segment(value),part=>part.segment).slice(0,max).join('');

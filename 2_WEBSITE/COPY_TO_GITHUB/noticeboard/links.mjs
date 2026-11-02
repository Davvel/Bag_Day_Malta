export function normaliseNoticeURL(value){
 const raw=String(value??'').trim();if(!raw)return '';
 if(/[\s\u0000-\u001f\u007f]/.test(raw))throw Error('Enter a valid website address.');
 const candidate=/^[a-z][a-z0-9+.-]*:/i.test(raw)?raw:'https://'+raw;
 let url;try{url=new URL(candidate)}catch{throw Error('Enter a valid website address.')}
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password||!url.hostname.includes('.')||url.href.length>2048)throw Error('Enter a valid website address starting with https:// or http://.');
 return url.href;
}
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function noticeLink(item){
 let url;try{url=normaliseNoticeURL(item.link_url)}catch{return ''}if(!url)return '';
 const title=String(item.link_title??'').trim()||'More details';
 return `<a class="notice-link" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(title)} <span aria-hidden="true">↗</span></a>`;
}

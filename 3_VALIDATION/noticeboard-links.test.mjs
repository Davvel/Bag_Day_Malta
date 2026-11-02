import {test} from 'node:test';
import assert from 'node:assert/strict';
import {noticeLink,normaliseNoticeURL} from '../2_WEBSITE/COPY_TO_GITHUB/noticeboard/links.mjs';
import {decodePublishedCSV,visibleItems} from '../2_WEBSITE/COPY_TO_GITHUB/noticeboard/shared.mjs';
import {noticeStatus} from '../2_WEBSITE/COPY_TO_GITHUB/noticeboard/publication.mjs';
test('link is absent without URL; default and custom text are safe and escaped',()=>{
 assert.equal(noticeLink({link_title:'Unused'}),'');assert.equal(noticeLink({link_url:'javascript:alert(1)'}),'');
 assert.match(noticeLink({link_url:'example.com'}),/More details/);assert.match(noticeLink({link_url:'example.com',link_title:'Buy <tickets>'}),/Buy &lt;tickets&gt;/);
 assert.equal(normaliseNoticeURL('example.com'),'https://example.com/');
});
test('static CSV preserves link columns and accepts older notices',()=>{
 const csv='format_version,record_type,page_id,kind,title,description,end_date,entry_id,link_url,link_title\n1,manifest,,,,,,,,\n1,page,p,,,,,,,\n1,entry,p,event,Show,Details,2099-01-01,e,https://example.com,Buy tickets\n';
 const pages=decodePublishedCSV(csv),item=visibleItems(pages[0].csv,'2026-10-28')[0];assert.equal(item.link_title,'Buy tickets');assert.equal(item.link_url,'https://example.com');
 assert.equal(visibleItems('entry_id,kind,title,description,end_date\ne,event,T,D,2099-01-01','2026-10-28').length,1);
 assert.equal(noticeStatus([{...item,link_title:'New text'}],pages[0],'2026-10-28').state,'unpublished');
});
test('editor confirmation asks for fresh CSV while default public reads stay cacheable',async()=>{
 const {readPublishedCSV}=await import('../2_WEBSITE/COPY_TO_GITHUB/noticeboard/shared.mjs');
 const {publishedPages}=await import('../2_WEBSITE/COPY_TO_GITHUB/noticeboard/publication.mjs');
 const saved=globalThis.fetch,urls=[];
 globalThis.fetch=async url=>{urls.push(url);return new Response('format_version,record_type\n1,manifest\n')};
 try{await readPublishedCSV();await publishedPages();assert.ok(urls[0].endsWith('/public/noticeboard.csv'));assert.match(urls[1],/noticeboard\.csv\?refresh=\d{13}$/)}finally{globalThis.fetch=saved}
});

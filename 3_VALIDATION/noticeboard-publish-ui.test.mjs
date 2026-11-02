import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {noticeStatus} from '../2_WEBSITE/COPY_TO_GITHUB/noticeboard/publication.mjs';
import {esc,today,icon} from '../2_WEBSITE/COPY_TO_GITHUB/noticeboard/shared.mjs';
function harness({mismatch=false,offline=false,empty=false}={}){
 let nodes=new Map(),published=false,release;
 const pending=new Promise(resolve=>release=resolve);
 const node=()=>({disabled:false,isConnected:true,textContent:'',className:'',addEventListener(){}});
 const root={querySelector:s=>{if(!nodes.has(s))nodes.set(s,node());return nodes.get(s)},querySelectorAll:s=>s==='button,select'?['#publish','#checkPublication','#add','#logout'].map(s=>root.querySelector(s)):[],prepend(){}};
 Object.defineProperty(root,'innerHTML',{set(html){for(const n of nodes.values())n.isConnected=false;nodes=new Map();root.html=html;const publish=root.querySelector('#publish');publish.disabled=/<button id="publish"[^>]*disabled/.test(html);publish.textContent='Publish Notices'}});
 const item={entry_id:'e',kind:'event',title:'Bingo',description:'Details',end_date:'2099-01-01',link_url:'https://example.com/tickets',link_title:'Book your chair'},page={page_id:'EditorPage3',locality_name:'Żejtun',section:'church',revision:2};
 const csv=(withLink)=>'entry_id,kind,title,description,end_date,link_url,link_title\ne,event,Bingo,Details,2099-01-01,'+(withLink?'https://example.com/tickets,Book your chair':',')+'\n';
 const state={page,items:[item],today:today(),published:{csv:csv(false),published_at:'2026-10-28T19:01:00Z'}};
 const context=vm.createContext({document:{querySelector:s=>s==='#root'?root:s==='#noticeDialog'?{}:s==='#message'?root.querySelector(s):null,title:''},location:{pathname:'/EditChurchNoticeBoard/',search:''},URLSearchParams,Intl,Date,Set,Map,sections:{church:{name:'Church'}},esc,today,icon,noticeStatus,sectionFromPath:()=> 'church',authorisedPages:pages=>pages,request:async path=>{if(path.endsWith('/publish')){await pending;published=true;return {published:true}}return {page,items:[item],today:today(),publication:{published_at:'2026-10-28T19:01:00Z'}}},publishedPages:async()=>{if(offline)throw Error('offline');return [{...page,csv:csv(published&&!mismatch),published_at:'2026-10-28T19:01:00Z'}]},noticeTags:()=>'',noticeLink:()=>'',console});
 let source=readFileSync(new URL('../2_WEBSITE/COPY_TO_GITHUB/noticeboard/editor.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/login\(\);\s*$/,'');
 source+='\n globalThis.setup=(data)=>{profile={name:"David",pages:[data.page]};pageId=data.page.page_id;state=data;render()};';
 vm.runInContext(source,context);context.setup(empty?{...state,items:[],published:{csv:'',published_at:null},publication:null}:state);
 return {root,release};
}
test('Publish shows progress then verified success with disabled button, without page refresh',async()=>{
 const {root,release}=harness(),button=root.querySelector('#publish');assert.match(root.html,/class="primary publish-attention"/);const task=button.onclick();assert.equal(button.textContent,'Publishing…');assert.equal(button.disabled,true);release();await task;
 assert.equal(root.querySelector('#publish').disabled,true);assert.doesNotMatch(root.html,/class="primary publish-attention"/);assert.match(root.html,/All current notices published/);assert.match(root.querySelector('#message').textContent,/Published and verified successfully/);assert.equal(root.querySelector('#message').className,'status success');
});
test('unconfirmed publication never displays success and remains retryable',async()=>{
 for(const options of [{mismatch:true},{offline:true}]){const {root,release}=harness(options);const task=root.querySelector('#publish').onclick();release();await task;assert.match(root.querySelector('#message').textContent,/could not be confirmed/);assert.equal(root.querySelector('#message').className,'status error');assert.ok(root.querySelector('#checkPublication'));}
});

test('empty untouched board disables Publish without attention or unpublished warning',()=>{
 const {root}=harness({empty:true});
 assert.equal(root.querySelector('#publish').disabled,true);
 assert.doesNotMatch(root.html,/publish-attention|changes waiting|Not published yet/);
 assert.match(root.html,/Add your first notice/);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,existsSync,readdirSync,statSync} from 'node:fs';
const root=new URL('../2_WEBSITE/COPY_TO_GITHUB/',import.meta.url);
const source=readFileSync(new URL('js/startup.js',root),'utf8');
function startup(){
 const nodes={splashScreen:{hidden:false},appContent:{inert:true}};
 const document={documentElement:{dataset:{}},body:{classList:{remove(){}}},getElementById:id=>nodes[id]};
 const context=vm.createContext({document,window:{BAG_DAY_CONFIG:{splashEnabled:false}},performance:{getEntriesByType:()=>[]},location:{search:''},URLSearchParams,Promise,setTimeout(){throw Error('Startup may not delay Home')},Image:class{constructor(){throw Error('Startup may not preload artwork')}}});
 vm.runInContext(source,context);return {api:context.window.BAG_DAY_STARTUP,nodes,document};
}
test('disabled splash reveals Home synchronously without artwork requests or timers',async()=>{
 const {api,nodes,document}=startup();let rendered=false,done=false;
 const result=api.reveal({beforeReveal(){rendered=true},onComplete(){done=true}});
 assert.equal(rendered,true);assert.equal(done,true);assert.equal(nodes.splashScreen.hidden,true);assert.equal(nodes.appContent.inert,false);assert.equal(document.documentElement.dataset.splashEnabled,'false');await result;
});
test('render errors still release the hidden splash and content interaction',async()=>{
 const {api,nodes}=startup();await assert.rejects(api.reveal({beforeReveal(){throw Error('render error')}}),/render error/);assert.equal(nodes.splashScreen.hidden,true);assert.equal(nodes.appContent.inert,false);
});
test('single supplied images are below 50 KB and old artwork variants are absent',()=>{
 for(const name of ['bag-organic','bag-mixed','bag-recycle','glass']){
 const file=new URL('icons/'+name+'-light.webp',root);assert.ok(existsSync(file));assert.ok(statSync(file).size<50000);
 }
 const names=readdirSync(new URL('icons/',root));assert.equal(names.some(n=>/^(?:bag-(?:organic|mixed|recycle)|glass)-real/.test(n)),false);
});
test('card uses a single direct image without loaders, previews or source swapping',()=>{
 const app=readFileSync(new URL('js/app.js',root),'utf8');
 assert.match(app,/src="icons\/bag-\$\{type\}-light.webp"/);assert.match(app,/src="icons\/glass-light.webp"/);
 assert.doesNotMatch(app+source,/progressiveImage|upgradeImages|detailState|data-detail-src|data-preview-src|real-preview|new Image/);
});
test('only the four new collection images enter offline precaching',()=>{
 const sw=readFileSync(new URL('service-worker.js',root),'utf8');const assets=JSON.parse(sw.match(/const ASSETS=(\[[^;]+\]);/)[1]);
 for(const name of ['bag-organic','bag-mixed','bag-recycle','glass'])assert.ok(assets.includes('./icons/'+name+'-light.webp'));
 assert.doesNotMatch(assets.join(' '),/bag-(organic|mixed|recycle)-real|glass-real|glass-carrier|icons\/bag-(organic|mixed|recycle)\.svg/);
});
function worker(){
 const handlers={},cached={cached:true},network=[];
 const context=vm.createContext({importScripts(){},globalThis:{BAG_DAY_CONFIG:{version:'1.1.100'}},URL,Request,Response,
 self:{location:{href:'https://bag.test/service-worker.js',origin:'https://bag.test'},addEventListener:(name,fn)=>handlers[name]=fn},
 caches:{open:async()=>({match:async()=>cached,put:async()=>{}})},fetch:(...args)=>{network.push(args);return new Promise(()=>{});}});
 vm.runInContext(readFileSync(new URL('service-worker.js',root),'utf8'),context);
 return {handlers,cached,network};
}
test('cached versioned scripts and bag images bypass the network',async()=>{
 for(const path of ['/js/app.js?v=1.1.100','/icons/bag-organic-light.webp']){
 const {handlers,cached,network}=worker();let result;handlers.fetch({request:{url:'https://bag.test'+path,method:'GET',mode:'cors',headers:new Headers()},respondWith:p=>result=p,waitUntil(){}});assert.equal(await result,cached);assert.equal(network.length,0);
 }
});


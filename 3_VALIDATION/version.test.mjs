import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,cpSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';
const root=fileURLToPath(new URL('../2_WEBSITE/COPY_TO_GITHUB/',import.meta.url));
const configSource=readFileSync(path.join(root,'app-config.js'),'utf8');
const release=()=>{const ctx=vm.createContext({});vm.runInContext(configSource,ctx);return ctx.BAG_DAY_CONFIG.version};
const version=release();
test('central config fills splash, Settings and accessible label from one value',()=>{
 const elements=[{dataset:{},textContent:''},{dataset:{versionPrefix:''},textContent:''}];
 const accessible={dataset:{appVersionLabel:'Version {version}. Loading.'},setAttribute:(key,value)=>accessible[key]=value};let ready;
 const context=vm.createContext({document:{readyState:'loading',querySelectorAll:s=>s==='[data-app-version]'?elements:[accessible],addEventListener:(name,fn)=>ready=fn}});
 vm.runInContext(configSource,context);ready();assert.equal(elements[0].textContent,'v '+version);assert.equal(elements[1].textContent,version);assert.equal(accessible['aria-label'],'Version '+version+'. Loading.');assert(Object.isFrozen(context.BAG_DAY_CONFIG));
 const html=readFileSync(path.join(root,'index.html'),'utf8');assert.equal((html.match(/data-app-version(?=[ >])/g)||[]).length,2);assert(!html.includes('v 1.1.61'));
});
test('public and Admin pages load the config before application scripts',()=>{
 for(const name of ['index.html','game/index.html','reuse/index.html','noticeboard/index.html','noticeboard/editor.html','admin/index.html']){
  const html=readFileSync(path.join(root,name),'utf8');assert(html.includes('app-config.js?v='+version),name);assert(html.indexOf('app-config.js')<html.indexOf('</head>'));
 }
 for(const name of ['reuse/config.mjs','admin/assets/config.mjs'])assert(readFileSync(path.join(root,name),'utf8').includes('globalThis.BAG_DAY_CONFIG?.version'));
});
for(const worker of ['service-worker.js','game/service-worker.js','admin/sw.js'])test('offline config is precached and returned without network: '+worker,async()=>{
 const handlers={},cached=new Response(configSource),base=new URL(worker,'https://bagdaymalta.eu/'),scope=new URL('./',base).href;
 const cache={addAll:async()=>{},match:async()=>cached,put:async()=>{}};
 const context=vm.createContext({URL,Request,Response,self:{location:base,registration:{scope},addEventListener:(name,fn)=>handlers[name]=fn,clients:{claim(){}},skipWaiting(){}},importScripts:()=>vm.runInContext(configSource,context),fetch:async()=>{throw Error('offline')},caches:{open:async()=>cache,match:async()=>cached,keys:async()=>[]}});
 const source=readFileSync(path.join(root,worker),'utf8');vm.runInContext(source,context);
 const imported=source.match(/importScripts\('([^']+)'\)/)[1];assert.equal(new URL(imported,base).searchParams.get('v'),version);
 const assets=vm.runInContext(worker==='admin/sw.js'?'SHELL':'ASSETS',context);assert(assets.includes(imported));
 let response;handlers.fetch({request:{url:new URL(imported,base).href,method:'GET',mode:'same-origin',headers:new Headers()},respondWith:r=>response=r,waitUntil(){}});
 assert(response,'worker must handle the shared config outside its own scope');assert.equal(await (await response).text(),configSource);
});
test('next release changes only the config; preparation updates all asset references and is repeatable',()=>{
 const temp=mkdtempSync(path.join(tmpdir(),'bagday-version-'));
 try{
  const work=path.join(temp,'2_WEBSITE/COPY_TO_GITHUB');mkdirSync(path.join(temp,'scripts'),{recursive:true});
  cpSync(root,work,{recursive:true,filter:src=>!path.extname(src)||/\.(js|mjs|html|css|webmanifest)$/.test(src)});
  cpSync(fileURLToPath(new URL('../scripts/prepare-release.mjs',import.meta.url)),path.join(temp,'scripts/prepare-release.mjs'));
  writeFileSync(path.join(work,'app-config.js'),configSource.replace(version,'9.8.7'));
  const run=()=>{const result=spawnSync(process.execPath,[path.join(temp,'scripts/prepare-release.mjs')],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);return result.stdout};run();
  const snapshots=[];function inspect(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory()){inspect(file);continue}const text=readFileSync(file,'utf8');for(const m of text.matchAll(/[?&]v=(\d+\.\d+\.\d+)/g))assert.equal(m[1],'9.8.7',file);snapshots.push([file,text])}}inspect(work);
  assert(run().includes('0 files refreshed'));for(const [file,text]of snapshots)assert.equal(readFileSync(file,'utf8'),text);
 }finally{rmSync(temp,{recursive:true,force:true})}
});

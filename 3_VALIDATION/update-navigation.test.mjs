import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const root=new URL('../2_WEBSITE/COPY_TO_GITHUB/',import.meta.url);
for(const offline of [false,true])for(const route of ['','?panel=settings','?v=1.1.109'])test(`${route||'Home'} uses ${offline?'offline fallback':'fresh network HTML'}`,async()=>{
 const handlers={};let stored,policy;
 const cache={match:async()=>new Response('old'),put:async(key,response)=>{stored=await response.text()}};
 const ctx=vm.createContext({URL,Request,Response,self:{location:new URL('https://bagdaymalta.eu/service-worker.js'),addEventListener:(n,f)=>handlers[n]=f},importScripts:()=>{ctx.BAG_DAY_CONFIG={version:'1.1.109'}},caches:{open:async()=>cache},fetch:async(req,opts)=>{policy=opts.cache;if(offline)throw Error('offline');return new Response('new')}});
 vm.runInContext(readFileSync(new URL('service-worker.js',root),'utf8'),ctx);
 let result;handlers.fetch({request:{url:'https://bagdaymalta.eu/'+route,method:'GET',mode:'navigate',headers:new Headers()},respondWith:p=>result=p});
 assert.equal(await (await result).text(),offline?'old':'new');assert.equal(policy,'no-store');if(!offline)assert.equal(stored,'new');
});

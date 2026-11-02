// Run after changing only COPY_TO_GITHUB/app-config.js. No dependencies needed.
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
const root=fileURLToPath(new URL('../2_WEBSITE/COPY_TO_GITHUB/',import.meta.url));
const context=vm.createContext({});
vm.runInContext(readFileSync(path.join(root,'app-config.js'),'utf8'),context);
const version=context.BAG_DAY_CONFIG?.version;
if(!/^\d+\.\d+\.\d+$/.test(version||''))throw Error('Set a valid version in app-config.js first.');
let changed=0;
function walk(dir){for(const item of readdirSync(dir,{withFileTypes:true})){
 const file=path.join(dir,item.name);if(item.isDirectory()){walk(file);continue}
 if(!/\.(?:html|js|mjs|css|webmanifest)$/.test(item.name)||file===path.join(root,'app-config.js'))continue;
 const old=readFileSync(file,'utf8'),next=old.replace(/([?&]v=)\d+\.\d+\.\d+/g,(_,prefix)=>prefix+version);
 if(next!==old){writeFileSync(file,next);changed++}
}}
walk(root);
// Deduplicate generated precache arrays after aligning old asset URLs.
for(const [file,name] of [['service-worker.js','ASSETS'],['game/service-worker.js','ASSETS'],['admin/sw.js','SHELL']]){
 const full=path.join(root,file),source=readFileSync(full,'utf8');
 const pattern=new RegExp('const '+name+'=(\\[[^;]+\\]);');
 const match=source.match(pattern);if(!match)throw Error('Missing offline asset list: '+file);
 const assets=vm.runInNewContext(match[1]);
 writeFileSync(full,source.replace(pattern,'const '+name+'='+JSON.stringify([...new Set(assets)])+';'));
}
console.log(`Frontend ${version} ready; ${changed} files refreshed from app-config.js.`);

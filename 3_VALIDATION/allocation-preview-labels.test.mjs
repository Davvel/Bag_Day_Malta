import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('preview labels describe future insertion while saved results retain INSERTED',()=>{
 const source=readFileSync(new URL('../2_WEBSITE/COPY_TO_GITHUB/admin/assets/app.mjs',import.meta.url),'utf8');
 const c=vm.createContext({esc:x=>String(x??''),name:()=>''});
 vm.runInContext(source.slice(source.indexOf('function metrics('),source.indexOf('\nfunction renderReport()')),c);
 const report={counts:{attempted:2,inserted:2},details:[{outcome:'INSERTED',locality_name:'Balzan',advertising_month:'2026-10-01',position:2}]};
 assert.match(c.metrics(report.counts,true),/ready to insert/);assert.match(c.detailTable(report,true),/Ready to insert/);assert.doesNotMatch(c.detailTable(report,true),/INSERTED/);
 assert.match(c.detailTable(report),/INSERTED/);
});

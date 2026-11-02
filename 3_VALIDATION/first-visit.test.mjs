import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../2_WEBSITE/COPY_TO_GITHUB/js/app.js',import.meta.url),'utf8');
test('a fresh or interrupted visit goes directly from locality selection to today in Home mode',()=>{
 for(const draft of [null,{step:3,mode:'auto',locality:'Żejtun'}]){
  const values=new Map(),nodes=new Map();
  const $=id=>{
   if(!nodes.has(id))nodes.set(id,{hidden:true,value:'',focus(){},add(){},setAttribute(){}});
   return nodes.get(id);
  };
  if(draft)values.set('bag-day-welcome-draft-v1',JSON.stringify(draft));
  const ctx=vm.createContext({$,names:['Żejtun'],selected:null,followLocation:true,dayOffset:1,viewedDate:'tomorrow',temporaryView:null,followLocationKey:'mode',splash:{hidden:true},appContent:{inert:false},Option:class{},saveHomeLocality:name=>ctx.selected=name,render(){},localStorage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}});
  vm.runInContext(source.slice(source.indexOf('  const welcomeDraftKey'),source.indexOf("  $('welcomeOverlay').addEventListener"))+'\nopenWelcome()',ctx);
  assert.equal(ctx.appContent.inert,true);
  assert.equal($('welcomeNext').disabled,!draft);
  $('welcomeLocality').value='Żejtun';$('welcomeLocality').onchange();$('welcomeNext').onclick();
  assert.equal(ctx.selected,'Żejtun');assert.equal(ctx.dayOffset,0);assert.equal(ctx.followLocation,false);
  assert.equal(ctx.appContent.inert,false);assert.equal(values.get('bag-day-welcome-complete-v1'),'true');
 }
});

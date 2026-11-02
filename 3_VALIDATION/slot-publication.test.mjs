import {test} from 'node:test';
import assert from 'node:assert/strict';
import {slotPublication} from '../2_WEBSITE/COPY_TO_GITHUB/admin/assets/slot-publication.mjs';
const row={slot_id:'a',sponsor_id:'s',locality_id:'l',locality_name:'Attard',advertising_month:'2026-11-01',position:2,status:'APPROVED'};
const localities=[{locality_id:'l',name:'Attard',active:1}],sponsors=[{sponsor_id:'s',active:1,company_name:'Test',advert_text:'Advert',banner_url:'',destination_url:''}];
const published={sponsors:[{SponsorID:'s',SponsorName:'Test',DisplayText:'Advert',ImageURL:'',URL:''}],slots:[{SponsorID:'s',Locality:'Attard',Year:'2026',Month:'11',Slot:'2'}]};
const at=new Date('2026-10-28T12:00:00Z');
const status=(r=row,p=published,ss=sponsors)=>slotPublication(r,p,localities,ss,at);
test('future approved placement is published only when the row and advert match',()=>{
 assert.equal(status().label,'Published');assert.equal(status(row,{...published,slots:[]}).state,'unpublished');
 assert.equal(status(row,published,[{...sponsors[0],advert_text:'Changed'}]).state,'unpublished');
});
test('drafts and past slots are excluded; still-public cancelled rows await removal',()=>{
 assert.equal(status({...row,status:'DRAFT'},{sponsors:[],slots:[]}).label,'Draft · not published');
 assert.equal(status({...row,advertising_month:'2026-09-01'}).label,'Past month · not published');
 assert.equal(status({...row,status:'CANCELLED'}).label,'Unpublished removal');
});

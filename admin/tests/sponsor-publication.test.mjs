import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sponsorPublication} from '../assets/sponsor-publication.mjs';
const at=new Date('2026-10-31T23:00:00Z'); // November in Malta.
const localities=[{locality_id:'L',name:'Żejtun',active:1}],sponsors=[{sponsor_id:'S',company_name:'Shop',advert_text:'Advert',banner_url:'',destination_url:'',active:1}];
const slot={sponsor_id:'S',locality_id:'L',advertising_month:'2026-11-01',status:'APPROVED',position:1};
const published={sponsors:[{SponsorID:'S',SponsorName:'Shop',DisplayText:'Advert',ImageURL:'',URL:''}],slots:[{SponsorID:'S',Locality:'Żejtun',Month:'11',Year:'2026',Slot:'1'}]};
test('name-only additions and drafts do not require publication',()=>{
 assert.equal(sponsorPublication(localities,sponsors,[],{sponsors:[],slots:[]},at).state,'published');
 assert.equal(sponsorPublication(localities,sponsors,[{...slot,status:'DRAFT'}],{sponsors:[],slots:[]},at).state,'published');
});
test('current and future approved placements are compared, including sponsor names',()=>{
 assert.equal(sponsorPublication(localities,sponsors,[slot],published,at).state,'published');
 assert.equal(sponsorPublication(localities,[{...sponsors[0],company_name:'Renamed'}],[slot],published,at).state,'unpublished');
 assert.equal(sponsorPublication(localities,sponsors,[slot,{...slot,advertising_month:'2026-12-01'}],published,at).slotChanges,true);
});
test('expired CSV rows and orphan sponsor rows require cleanup, past database history does not',()=>{
 const old={...slot,advertising_month:'2026-10-01'};
 assert.equal(sponsorPublication(localities,sponsors,[slot,old],published,at).state,'published');
 assert.equal(sponsorPublication(localities,sponsors,[old],published,at).state,'unpublished');
 assert.equal(sponsorPublication(localities,sponsors,[old],{...published,slots:[]},at).state,'unpublished');
 assert.equal(sponsorPublication(localities,sponsors,[old],{sponsors:[],slots:[]},at).state,'published');
});

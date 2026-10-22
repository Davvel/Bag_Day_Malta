import {test} from 'node:test';import assert from 'node:assert/strict';
import {itemSymbols} from '../COPY_TO_GITHUB/reuse/item-symbols.mjs';
test('empty icon selections stay neutral instead of guessing from item text',()=>{for(const description of ['Running shoes size 42','Toy fish for cats','Toy train','Miscellaneous'])assert.deepEqual(itemSymbols({description}),['📦'])});
test('saved symbols override local hints and retain complete visible sequences',()=>{assert.deepEqual(itemSymbols({description:'Shoes',item_emojis:'👨‍👩‍👧‍👦🇲🇹👍🏽🎂'}),['👨‍👩‍👧‍👦','🇲🇹','👍🏽']);assert.deepEqual(itemSymbols({item_emojis:'1️⃣ 💚 🎂'}),['1️⃣','💚','🎂'])});
test('empty, non-emoji or unexpected saved values do not break the listing',()=>{for(const item_emojis of [null,{},'','<script>alert(1)</script>','x'.repeat(1025)])assert.deepEqual(itemSymbols({description:'Books',item_emojis}),['📦'])});

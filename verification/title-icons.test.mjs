import {test} from 'node:test';
import assert from 'node:assert/strict';
import {titleIcons} from '../COPY_TO_GITHUB/reuse/title-icons.mjs';
import {titleLength,titleSlice} from '../COPY_TO_GITHUB/reuse/title-text.mjs';
test('only the first saved icon is displayed without changing stored data',()=>{
 const item={item_emojis:'🚲🧺🔧'};assert.deepEqual(titleIcons(item),{main:'🚲',extra:[]});assert.equal(item.item_emojis,'🚲🧺🔧');assert.deepEqual(titleIcons({}),{main:'📦',extra:[]});
});
test('title counts and slices complete visible characters without splitting emoji or accents',()=>{
 for(const symbol of ['🚲','👨‍👩‍👧‍👦','🇲🇹','👍🏽','e\u0301','1️⃣']){assert.equal(titleLength(symbol.repeat(40)),40);assert.equal(titleLength(symbol.repeat(41)),41);assert.equal(titleSlice(symbol.repeat(41)),symbol.repeat(40))}
 assert.equal(titleLength('Bike 🚲'),6);assert.equal(titleLength(''),0);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {noticeboardTab} from '../2_WEBSITE/COPY_TO_GITHUB/noticeboard/discovery.mjs';
const data=[{section:'church',kind:'event',end_date:'2026-11-13'},{section:'police',kind:'event',end_date:'2026-12-01'},{section:'council',kind:'info',end_date:'2026-12-01'}];
test('tab defaults to Council with multiple or no sources, sole source otherwise',()=>{assert.equal(noticeboardTab(data),'council');assert.equal(noticeboardTab([]),'council');assert.equal(noticeboardTab([data[0]]),'church');assert.equal(noticeboardTab([data[1]]),'police')});
test('calendar tab availability counts only events in that month',()=>{assert.equal(noticeboardTab(data,{view:'calendar',month:'2026-11'}),'church');assert.equal(noticeboardTab(data,{view:'calendar',month:'2026-12'}),'police');assert.equal(noticeboardTab(data,{view:'calendar',month:'2027-01'}),'council')});
test('day selection uses that exact date, never information expiry dates',()=>{assert.equal(noticeboardTab(data,{view:'day',day:'2026-11-13'}),'church');assert.equal(noticeboardTab(data,{view:'day',day:'2026-12-01'}),'police')});
test('manual selection is honoured even for an empty source; invalid source uses automatic rule',()=>{assert.equal(noticeboardTab([data[0]],{requested:'police'}),'police');assert.equal(noticeboardTab([data[0]],{requested:'invalid'}),'church')});

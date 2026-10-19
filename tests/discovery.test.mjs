import test from 'node:test';
import assert from 'node:assert/strict';
import {discoveryStats} from '../src/discovery.mjs';
import {readFileSync} from 'node:fs';
import {matchesQuickFilter} from '../src/filtering.mjs';
test('overview totals use the complete catalogue and the existing graded filter',()=>{
 const horses=JSON.parse(readFileSync(new URL('../data/horses.json',import.meta.url)));
 const stats=discoveryStats(horses);
 assert.equal(stats.total,horses.length);
 assert.deepEqual(stats.years,[2018,2019,2020,2021,2022]);
 assert.equal(stats.graded,horses.filter(h=>matchesQuickFilter(h,'graded')).length);
 assert.deepEqual(discoveryStats([{birth_year:null},{birth_year:'unknown'}]).years,[]);
});

import { astro } from 'iztro';
import { MINOR_STARS_DATA } from './utils/ziwei-minor-data.ts';

// Create a sample chart
const astrolabe = astro.bySolar('2000-01-01', 0, 'male', true, 'zh-TW');

let adjectiveStarsFound = new Set();
astrolabe.palaces.forEach(p => {
    if (p.adjectiveStars) {
        p.adjectiveStars.forEach(s => adjectiveStarsFound.add(s.name));
    }
});

const starList = Array.from(adjectiveStarsFound).sort();
console.log(`Found ${starList.length} unique adjective stars in iztro.`);

const missingInterp = [];
const presentInterp = [];

starList.forEach(name => {
    if (MINOR_STARS_DATA[name]) {
        presentInterp.push(name);
    } else {
        missingInterp.push(name);
    }
});

console.log(`\nStars WITH interpretations (${presentInterp.length}):`);
console.log(presentInterp.join(', '));

console.log(`\nStars WITHOUT interpretations (${missingInterp.length}):`);
console.log(missingInterp.join(', '));

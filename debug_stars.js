import { astro } from 'iztro';

// Create a sample chart
const astrolabe = astro.bySolar('2000-01-01', 0, 'male', true, 'zh-TW');

console.log('--- Minor Stars Inspection ---');
let allStars = new Set();
let minorStarsFound = new Set();
let adjectiveStarsFound = new Set();

astrolabe.palaces.forEach((p, idx) => {
    // console.log(`Palace ${idx} (${p.name}):`);

    if (p.minorStars) {
        p.minorStars.forEach(s => {
            allStars.add(s.name);
            minorStarsFound.add(s.name);
        });
        // console.log('  Minor:', p.minorStars.map(s => s.name).join(', '));
    }

    if (p.adjectiveStars) {
        p.adjectiveStars.forEach(s => {
            allStars.add(s.name);
            adjectiveStarsFound.add(s.name);
        });
        // console.log('  Adj:', p.adjectiveStars.map(s => s.name).join(', '));
    }
});

console.log('\n--- Summary ---');
console.log('Total unique minor stars found:', minorStarsFound.size);
console.log('List:', Array.from(minorStarsFound).sort().join(', '));
console.log('Total unique adjective stars found:', adjectiveStarsFound.size);
console.log('List:', Array.from(adjectiveStarsFound).sort().join(', '));

// Check against user's MINOR_STARS list
const EXPECTED_MINOR = [
    '封誥', '天巫', '天才', '天壽', '天哭', '恩光', '天空', '八座',
    '天福', '旬空', '孤辰', '蜚廉', '破碎', '天傷', '天喜', '解神',
    '台輔', '天官', '陰煞', '龍池', '鳳閣', '華蓋', '天刑', '天使',
    '年解', '月德', '三台', '天虛', '天貴', '天月', '天姚', '天廚',
    '紅鸞', '咸池', '天德', '截路', '空亡', '寡宿'
];

const missing = EXPECTED_MINOR.filter(s => !allStars.has(s));
console.log('\n--- Missing Expected Stars ---');
if (missing.length > 0) {
    console.log('Missing:', missing.join(', '));
} else {
    console.log('All expected minor stars are present in the output.');
}

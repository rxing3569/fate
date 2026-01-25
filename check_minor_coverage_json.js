import fs from 'fs';

const iztroStars = [
    '三台', '八座', '台輔', '咸池', '天使', '天傷', '天刑',
    '天哭', '天喜', '天壽', '天姚', '天官', '天巫', '天廚',
    '天德', '天才', '天月', '天福', '天空', '天虛', '天貴',
    '孤辰', '寡宿', '封誥', '年解', '恩光', '截路', '旬空',
    '月德', '破碎', '空亡', '紅鸞', '華蓋', '蜚廉', '解神',
    '陰煞', '鳳閣', '龍池'
];

const paths = [
    'd:/document/fate-book/public/data/minor.json',
    'd:/document/fate-book/public/data/minor2.json'
];

let availableStars = new Set();

paths.forEach(p => {
    if (fs.existsSync(p)) {
        try {
            const raw = fs.readFileSync(p, 'utf8');
            const data = JSON.parse(raw);
            if (data.ziwei_minor_stars) {
                data.ziwei_minor_stars.forEach(s => {
                    let name = s.star_name.replace('星', '');
                    availableStars.add(name);
                });
            }
        } catch (e) {
            console.error(`Error reading ${p}:`, e);
        }
    }
});

console.log('Available stars in JSONs:', Array.from(availableStars).sort().join(', '));

const missing = iztroStars.filter(s => !availableStars.has(s));

console.log(`\nMissing interpretations for ${missing.length} stars:`);
if (missing.length > 0) {
    console.log(missing.join(', '));
} else {
    console.log('All stars have interpretations.');
}

export function calculatePatterns(astrolabe) {
    if (!astrolabe) return []
    const detected = []

    // 1. Identify Life Palace Index
    let lifePalace = astrolabe.palaces.find(p => p.isLifePalace)
    if (!lifePalace) {
        lifePalace = astrolabe.palaces.find(p => p.name === '命宮')
    }
    if (!lifePalace) return []
    const lifeIdx = astrolabe.palaces.indexOf(lifePalace)

    // 2. Helpers
    const getStars = (idx) => {
        const p = astrolabe.palaces[idx]
        return [...p.majorStars, ...p.minorStars].map(s => s.name)
    }
    const getAllStars = (indices) => {
        const all = new Set()
        indices.forEach(idx => getStars(idx).forEach(s => all.add(s)))
        return all
    }
    const hasStar = (list, name) => list.includes(name)
    const hasAll = (set, names) => names.every(n => set.has(n))
    const getBranch = (idx) => astrolabe.palaces[idx].earthlyBranch

    // 3. San Fang Indices & Union
    const sanFangIndices = [
        lifeIdx,
        (lifeIdx + 4) % 12,
        (lifeIdx + 8) % 12,
        (lifeIdx + 6) % 12
    ]
    const sanFangStars = getAllStars(sanFangIndices)
    const lifeStars = getStars(lifeIdx)
    const lifeBranch = getBranch(lifeIdx)

    // === A. Life Palace Patterns (Specific Stars & Positions) ===

    // 1. Zi Fu Tong Gong (紫府同宮)
    if (hasStar(lifeStars, '紫微') && hasStar(lifeStars, '天府')) {
        detected.push('紫府同宮格')
    }

    // 2. Ju Ji Tong Gong (巨機同宮)
    if (hasStar(lifeStars, '巨門') && hasStar(lifeStars, '天機')) {
        detected.push('巨機同宮格')
    }

    // 3. Shan Yin Chao Gang (善蔭朝綱)
    if (hasStar(lifeStars, '天機') && hasStar(lifeStars, '天梁')) {
        detected.push('善蔭朝綱格')
    }

    // 4. Ri Li Zhong Tian (日麗中天)
    if (hasStar(lifeStars, '太陽') && lifeBranch === '午') {
        detected.push('日麗中天格')
    }

    // 5. Ri Zhao Lei Men (日照雷門)
    if (hasStar(lifeStars, '太陽') && lifeBranch === '卯') {
        detected.push('日照雷門格')
    }

    // 6. Ri Yue Tong Gong (日月同宮)
    if (hasStar(lifeStars, '太陽') && hasStar(lifeStars, '太陰')) {
        detected.push('日月同宮格')
    }

    // 7. Ju Ri Tong Gong (巨日同宮)
    if (hasStar(lifeStars, '太陽') && hasStar(lifeStars, '巨門')) {
        detected.push('巨日同宮格')
    }

    // 8. Tan Wu Tong Xing (貪武同行)
    if (hasStar(lifeStars, '武曲') && hasStar(lifeStars, '貪狼')) {
        detected.push('貪武同行格')
    }

    // === B. San Fang Structural Patterns ===

    // 9. Ji Yue Tong Liang (機月同梁)
    if (hasAll(sanFangStars, ['天機', '太陰', '天同', '天梁'])) {
        detected.push('機月同梁格')
    }

    // 10. Yang Liang Chang Lu (陽梁昌祿)
    if (hasAll(sanFangStars, ['太陽', '天梁', '文昌', '祿存'])) {
        detected.push('陽梁昌祿格')
    }

    // 11. Huo Tan / Ling Tan (火貪/鈴貪)
    if (sanFangStars.has('貪狼')) {
        if (sanFangStars.has('火星')) detected.push('火貪格')
        if (sanFangStars.has('鈴星')) detected.push('鈴貪格')
    }

    // 12. Shuang Lu Chao Yuan (雙祿朝垣)
    const mutagens = new Set()
    sanFangIndices.forEach(idx => {
        const p = astrolabe.palaces[idx]
        const stars = [...p.majorStars, ...p.minorStars]
        stars.forEach(s => { if (s.mutagen) mutagens.add(s.mutagen) })
    })
    if (sanFangStars.has('祿存') && mutagens.has('祿')) {
        detected.push('祿合鴛鴦格')
    }

    // 13. San Qi Jia Hui (三奇嘉會)
    if (mutagens.has('祿') && mutagens.has('權') && mutagens.has('科')) {
        detected.push('三奇嘉會格')
    }

    // === C. Positional / Distant Patterns ===

    // 14. Fu Xiang Chao Yuan (府相朝垣)
    const trine1Idx = (lifeIdx + 4) % 12
    const trine2Idx = (lifeIdx + 8) % 12
    const trine1Stars = getStars(trine1Idx)
    const trine2Stars = getStars(trine2Idx)
    if ((hasStar(trine1Stars, '天府') && hasStar(trine2Stars, '天相')) ||
        (hasStar(trine2Stars, '天府') && hasStar(trine1Stars, '天相'))) {
        detected.push('府相朝垣格')
    }

    // 15. Ri Yue Bing Ming (日月並明)
    const findStarIdx = (name) => {
        return astrolabe.palaces.findIndex(p =>
            [...p.majorStars, ...p.minorStars].some(s => s.name === name)
        )
    }
    const sunIdx = findStarIdx('太陽')
    const moonIdx = findStarIdx('太陰')
    const sunBranch = sunIdx >= 0 ? getBranch(sunIdx) : ''
    const moonBranch = moonIdx >= 0 ? getBranch(moonIdx) : ''

    if (sanFangIndices.includes(sunIdx) && sanFangIndices.includes(moonIdx)) {
        if (['辰', '巳'].includes(sunBranch) && ['戌', '酉'].includes(moonBranch)) {
            detected.push('日月並明格')
        }
    }

    // 16. Ming Zhu Chu Hai (明珠出海)
    if (lifeBranch === '未') {
        const lifeMajor = astrolabe.palaces[lifeIdx].majorStars
        if (lifeMajor.length === 0) {
            if (sunBranch === '卯' && moonBranch === '亥') {
                detected.push('明珠出海格')
            }
        }
    }

    // Debug log
    if (detected.length > 0) {
        console.log("Calculated Patterns:", detected)
    }

    return detected
}

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

    // Mutagen Helper (Global)
    const countMutagens = (idx) => {
        const stars = [...astrolabe.palaces[idx].majorStars, ...astrolabe.palaces[idx].minorStars]
        let set = new Set()
        stars.forEach(s => { if (s.mutagen) set.add(s.mutagen) })
        return set
    }
    const lifeM = countMutagens(lifeIdx)

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

    // Neighbor Palaces & Stars (Global Helpers for Patterns)
    const prevIdx = (lifeIdx - 1 + 12) % 12
    const nextIdx = (lifeIdx + 1) % 12
    const pStars = getStars(prevIdx)
    const nStars = getStars(nextIdx)

    // Helper checks
    const isClampedBy = (s1, s2) => (hasStar(pStars, s1) && hasStar(nStars, s2)) || (hasStar(pStars, s2) && hasStar(nStars, s1))

    // Helper to add detected pattern
    // type: 'lucky' | 'unlucky'
    const add = (name, description, type = 'lucky', note = '') => {
        detected.push({ name, description, type, note })
    }

    // === Pattern Logic ===

    // 1. 極向離明格
    if (hasStar(lifeStars, '紫微') && lifeBranch === '午') {
        add('極向離明格', '紫微為北極，午宮屬離卦位，故名為極向離明。此為貴格。', 'lucky')
    }

    // 2. 君臣慶會格
    if (hasStar(lifeStars, '紫微')) {
        let count = 0
        if (sanFangStars.has('左輔')) count++
        if (sanFangStars.has('右弼')) count++

        // Neighbor check relative to Life
        if (isClampedBy('左輔', '右弼')) count = 2

        if (count >= 1) {
            add('君臣慶會格', '紫微為君王，左右、魁鉞、昌曲諸星作臣子，故名為君臣慶會。此為貴格，且有助力之跡象。', 'lucky')
        }
    }

    // 3. 紫府同宮格
    if (hasStar(lifeStars, '紫微') && hasStar(lifeStars, '天府') && (lifeBranch === '寅' || lifeBranch === '申')) {
        add('紫府同宮格', '紫微、天府二帝同宮，貴氣重，但紫微性質為積極進取，天府性質為穩重保守，步調不一。故不能果斷下決策，延誤搶得先機機會。', 'lucky')
    }

    // 4. 紫府朝垣格
    if (!hasStar(lifeStars, '紫微') && !hasStar(lifeStars, '天府')) {
        if (sanFangStars.has('紫微') && sanFangStars.has('天府')) {
            add('紫府朝垣格', '紫微、天府於三方四正照命。為貴格，但也可成富。', 'lucky')
        }
    }

    // 5. 巨機同宮格 / 巨機化酉格
    if (hasStar(lifeStars, '巨門') && hasStar(lifeStars, '天機') && (lifeBranch === '卯' || lifeBranch === '酉')) {
        const hasJi = astrolabe.palaces[lifeIdx].majorStars.some(s => s.mutagen === '忌') || astrolabe.palaces[lifeIdx].minorStars.some(s => s.mutagen === '忌')
        if (hasJi && lifeBranch === '酉') {
            add('巨機化酉格', '巨門、天機同在酉宮坐命，有化忌同宮。性質為奔波飄蕩。不利於感情、事業。', 'unlucky')
        } else if (!hasJi) {
            add('巨機同宮格', '注意感情上的困擾，不利於愛情婚姻，要特別留意。', 'lucky')
        }
    }

    // 6. 善蔭朝綱格
    if (hasStar(lifeStars, '天機') && hasStar(lifeStars, '天梁') && (lifeBranch === '辰' || lifeBranch === '戌')) {
        add('善蔭朝綱格', '所謂機梁善談兵。具幕後策劃分析能力，有巧思，口才佳。', 'lucky')
    }

    // 7. 機月同梁格
    if (hasAll(sanFangStars, ['天機', '太陰', '天同', '天梁'])) {
        add('機月同梁格', '所謂機月同梁做吏人。適合安身立命於公門，從事軍公教等職務。', 'lucky')
    }

    // 8. 日麗中天格
    if (hasStar(lifeStars, '太陽') && lifeBranch === '午') {
        add('日麗中天格', '太陽在午時為光芒最盛，釋放能量最高時。又稱金燦光輝格。本格生人帶貴氣。', 'lucky')
    }

    // 9. 日出扶桑格
    if (hasStar(lifeStars, '太陽') && lifeBranch === '卯') {
        add('日出扶桑格', '太陽在卯時為旭日東昇之象。又稱日照雷門格。本格生人帶貴氣。', 'lucky')
    }

    // 10. 日月同宮格
    if (hasStar(lifeStars, '太陽') && hasStar(lifeStars, '太陰') && (lifeBranch === '丑' || lifeBranch === '未')) {
        add('日月同宮格', '主晉升之跡象。', 'lucky')
    }

    // 11. 日月並明格
    const findStarIdx = (name) => astrolabe.palaces.findIndex(p => [...p.majorStars, ...p.minorStars].some(s => s.name === name))
    const sunIdx = findStarIdx('太陽')
    const moonIdx = findStarIdx('太陰')

    if (sunIdx !== -1 && moonIdx !== -1 && sanFangIndices.includes(sunIdx) && sanFangIndices.includes(moonIdx)) {
        const sunB = getBranch(sunIdx)
        const moonB = getBranch(moonIdx)
        if ((sunB === '巳' && moonB === '酉') || (sunB === '辰' && moonB === '戌')) {
            add('日月並明格', '此二種組合，日月光芒皆旺。太陽為丹墀，太陰為桂墀，故又稱丹墀桂墀格。主少年得志。', 'lucky')
        }
    }

    // 12. 明珠出海格
    if (lifeBranch === '未' && astrolabe.palaces[lifeIdx].majorStars.length === 0) {
        if (sunIdx !== -1 && moonIdx !== -1 && sanFangIndices.includes(sunIdx) && sanFangIndices.includes(moonIdx)) {
            const sunB = getBranch(sunIdx)
            const moonB = getBranch(moonIdx)
            if (sunB === '卯' && moonB === '亥') {
                add('明珠出海格', '參加公職考試，可望金榜題名。在政界發展，則可飛黃騰達。', 'lucky')
            }
        }
    }

    // 13. 巨日同宮格
    if (hasStar(lifeStars, '巨門') && hasStar(lifeStars, '太陽') && (lifeBranch === '寅' || lifeBranch === '申')) {
        add('巨日同宮格', '為貴格。求名易於求利。若從政，官場上能飛黃騰達。或在社會成為知名人士。又稱官封三代格。', 'lucky')
    }

    // 14. 陽梁昌祿格
    if (hasAll(sanFangStars, ['太陽', '天梁', '文昌', '祿存'])) {
        add('陽梁昌祿格', '利於參加國家考試。', 'lucky')
    }

    // 15. 貪武同行格
    if (hasStar(lifeStars, '武曲') && hasStar(lifeStars, '貪狼') && (lifeBranch === '丑' || lifeBranch === '未')) {
        add('貪武同行格', '大器晚成，少年運勢較不利，三十歲後漸能逐步發達。', 'lucky')
    }

    // 16. 將星得地格
    if (hasStar(lifeStars, '武曲') && (lifeBranch === '辰' || lifeBranch === '戌')) {
        add('將星得地格', '大器晚成，少年運勢較不利，三十歲後漸能逐步發達。', 'lucky')
    }

    // 17. 財祿夾馬格
    if (hasStar(lifeStars, '天馬')) {
        const hasWuQu = hasStar(pStars, '武曲') || hasStar(nStars, '武曲')
        const hasLu = hasStar(pStars, '祿存') || hasStar(nStars, '祿存')
        const hasMutagenLu = (idx) => {
            const p = astrolabe.palaces[idx]
            return [...p.majorStars, ...p.minorStars].some(s => s.mutagen === '祿')
        }

        if (hasWuQu && (hasMutagenLu(prevIdx) || hasMutagenLu(nextIdx) || hasStar(pStars, '祿存') || hasStar(nStars, '祿存'))) {
            add('財祿夾馬格', '善於冒險投機，財富險中求，主富但不主貴。', 'lucky')
        }
    }

    // 18. 廉貞文武格
    if (hasStar(lifeStars, '廉貞')) {
        const careerIdx = (lifeIdx + 8) % 12
        if (hasStar(getStars(careerIdx), '武曲')) {
            if (sanFangStars.has('文昌') || sanFangStars.has('文曲')) {
                add('廉貞文武格', '個人可獲功績、名望。', 'lucky')
            }
        }
    }

    // 19. 財蔭夾印格
    if (hasStar(lifeStars, '天相')) {
        const hasLiang = (idx) => getStars(idx).includes('天梁')
        const hasMutagenLu = (idx) => {
            const p = astrolabe.palaces[idx]
            return [...p.majorStars, ...p.minorStars].some(s => s.mutagen === '祿')
        }

        // Strict Clamping: One side has Liang, the other side has Lu
        if ((hasLiang(prevIdx) && hasMutagenLu(nextIdx)) || (hasLiang(nextIdx) && hasMutagenLu(prevIdx))) {
            add('財蔭夾印格', '能得長輩幫助，取得財富或社會地位。', 'lucky')
        }
    }

    // 20. 雄宿朝垣格
    if (hasStar(lifeStars, '廉貞') && (lifeBranch === '申' || lifeBranch === '寅')) {
        add('雄宿朝垣格', '有能力，可任要職。', 'lucky')
    }

    // 21. 府相朝垣格
    if (sanFangStars.has('天府') && sanFangStars.has('天相')) {
        if (!detected.some(p => p.name === '府相朝垣格')) {
            add('府相朝垣格', '可衣食無憂。若為官或做主管，則機運佳。', 'lucky')
        }
    }

    // 22. 月朗天門格
    if (hasStar(lifeStars, '太陰') && lifeBranch === '亥') {
        add('月朗天門格', '又名月落亥宮格。此格生人，因太陰主富，更利於得財，為富中帶貴。', 'lucky')
    }

    // 23. 月生滄海格
    if (hasStar(lifeStars, '太陰') && hasStar(lifeStars, '天同') && lifeBranch === '子') {
        add('月生滄海格', '此格局舉止清秀優雅，有學識，入社會時可得名聲與財富之跡象。', 'lucky')
    }

    // 24. Fire/Bell/Greedy variations
    const hasTan = hasStar(lifeStars, '貪狼')
    const hasHuo = sanFangStars.has('火星')
    const hasLing = sanFangStars.has('鈴星')
    const isClampedByFireBell = isClampedBy('火星', '鈴星')

    if (hasTan) {
        if (hasHuo && hasLing) add('火鈴貪格', '有突然發達，獲得橫財跡象。', 'lucky')
        else if (hasHuo) add('火貪格', '有突然發達，獲得橫財跡象。', 'lucky')
        else if (hasLing) add('鈴貪格', '有突然發達，獲得橫財跡象。', 'lucky')

        if (isClampedByFireBell) {
            add('火鈴夾貪格', '貪狼守命，遇火星、鈴星在左右鄰宮相夾。此為大吉之格，能將貪狼的創造力轉化為行動力，有橫發之象。', 'lucky')
        }
    }

    // 25. 石中隱玉格
    if (hasStar(lifeStars, '巨門') && (lifeBranch === '子' || lifeBranch === '午')) {
        add('石中隱玉格', '本格生人，有才能，但運勢屬於先苦後甘，無論從事何種行業，有早年辛苦，中晚年後發達的跡象。', 'lucky')
    }

    // 26. 祿馬配印格
    if (hasStar(lifeStars, '天相') && hasStar(lifeStars, '天馬')) {
        const hasLuCun = hasStar(lifeStars, '祿存')
        const hasMutagenLu = astrolabe.palaces[lifeIdx].majorStars.some(s => s.mutagen === '祿') || astrolabe.palaces[lifeIdx].minorStars.some(s => s.mutagen === '祿')
        if (hasLuCun || hasMutagenLu) {
            add('祿馬配印格', '主奔波勞碌而招財。', 'lucky')
        }
    }

    // 27. 祿馬交馳格
    if (sanFangStars.has('天馬')) {
        let hasLu = sanFangStars.has('祿存')
        if (!hasLu) {
            sanFangIndices.forEach(idx => {
                if ([...astrolabe.palaces[idx].majorStars, ...astrolabe.palaces[idx].minorStars].some(s => s.mutagen === '祿')) hasLu = true
            })
        }
        if (hasLu) add('祿馬交馳格', '主奔波勞碌而招財。', 'lucky')
    }

    // 28. 壽星入廟格
    if (hasStar(lifeStars, '天梁') && lifeBranch === '午') {
        add('壽星入廟格', '有壽，得名易於得利。', 'lucky')
    }

    // 29. 七殺朝鬥格
    if (hasStar(lifeStars, '七殺') && ['子', '午', '寅', '申'].includes(lifeBranch)) {
        add('七殺朝鬥格', '此格為貴格，但也可成富。但作風強勢，殺氣凜凜，攻擊力強。為達目的較不擇手段，可能損及旁人利益。', 'lucky')
    }

    // 30. 英星入廟格
    if (hasStar(lifeStars, '破軍') && ['子', '午'].includes(lifeBranch)) {
        add('英星入廟格', '有領導力，喜冒險犯難，具開創精神。', 'lucky')
    }

    // 31. 文桂文華格
    if (hasStar(lifeStars, '文昌') && hasStar(lifeStars, '文曲') && ['丑', '未'].includes(lifeBranch)) {
        add('文桂文華格', '聰明多藝。', 'lucky')
    }

    // 32. 文星拱命格
    if (sanFangStars.has('文昌') && sanFangStars.has('文曲') && !detected.some(p => p.name === '文桂文華格')) {
        add('文星拱命格', '聰明多藝。', 'lucky')
    }

    // 33. Purple/Fu Clamp (紫府夾命)
    if (['寅', '申'].includes(lifeBranch) &&
        ((hasStar(pStars, '紫微') && hasStar(nStars, '天府')) || (hasStar(pStars, '天府') && hasStar(nStars, '紫微')))) {
        add('紫府夾命格', '具貴氣。利於取得社會名聲或地位。', 'lucky')
    }

    // 34. Sun/Moon Clamp (日月夾命)
    if (['丑', '未'].includes(lifeBranch) &&
        ((hasStar(pStars, '太陽') && hasStar(nStars, '太陰')) || (hasStar(pStars, '太陰') && hasStar(nStars, '太陽')))) {
        add('日月夾命格', '有財運，利於事業發展。', 'lucky')
    }

    // 35. Left/Right Clamp (左右夾命)
    if (['丑', '未'].includes(lifeBranch) &&
        ((hasStar(pStars, '左輔') && hasStar(nStars, '右弼')) || (hasStar(pStars, '右弼') && hasStar(nStars, '左輔')))) {
        add('左右夾命格', '有貴人助之象。', 'lucky')
    }

    // 36. Chang/Qu Clamp (昌曲夾命)
    if (['丑', '未'].includes(lifeBranch) &&
        ((hasStar(pStars, '文昌') && hasStar(nStars, '文曲')) || (hasStar(pStars, '文曲') && hasStar(nStars, '文昌')))) {
        add('昌曲夾命格', '利於學術發展。又稱為文星暗拱格。', 'lucky')
    }

    // 37. Left/Right Same Palace (左右同宮)
    if (['丑', '未'].includes(lifeBranch) && hasStar(lifeStars, '左輔') && hasStar(lifeStars, '右弼')) {
        add('左右同宮格', '有助人，人助之象。', 'lucky')
    }

    // 38. 輔拱文星格
    if ((hasStar(lifeStars, '文昌') || hasStar(lifeStars, '文曲'))) {
        if (sanFangStars.has('左輔') && sanFangStars.has('右弼')) {
            add('輔拱文星格', '才思敏捷，有能力獨當一面。', 'lucky')
        }
    }

    // 39. 雙祿交流格
    let hasLuCun = sanFangStars.has('祿存')
    let hasHuaLu = false
    sanFangIndices.forEach(idx => {
        if ([...astrolabe.palaces[idx].majorStars, ...astrolabe.palaces[idx].minorStars].some(s => s.mutagen === '祿')) hasHuaLu = true
    })
    if (hasLuCun && hasHuaLu) add('雙祿交流格', '有財源，在事業上有成富的機運。又稱為祿合鴛鴦格。', 'lucky')

    // 40. 三奇嘉會格
    let mLu = false, mQuan = false, mKe = false
    sanFangIndices.forEach(idx => {
        const stars = [...astrolabe.palaces[idx].majorStars, ...astrolabe.palaces[idx].minorStars]
        if (stars.some(s => s.mutagen === '祿')) mLu = true
        if (stars.some(s => s.mutagen === '權')) mQuan = true
        if (stars.some(s => s.mutagen === '科')) mKe = true
    })
    if (mLu && mQuan && mKe) add('三奇嘉會格', '化祿、化權、化科三化曜合稱為三奇。', 'lucky')

    // 41. 權祿巡逢格.
    if (mLu && mQuan && !mKe) add('權祿巡逢格', '利於事業穩定發展經營。', 'lucky')

    // 42. 科權祿夾格
    const pM = countMutagens(prevIdx)
    const nM = countMutagens(nextIdx)
    const allM = new Set([...pM, ...nM])
    if ((allM.has('祿') && allM.has('權')) || (allM.has('祿') && allM.has('科')) || (allM.has('權') && allM.has('科'))) {
        add('科權祿夾格', '能獲得意外的好運及貴人相助。', 'lucky')
    }

    // 43. 甲第登科格
    if (lifeM.has('科') && mQuan) {
        add('甲第登科格', '聰明，有學歷，入社會時可飛黃騰達之跡象。', 'lucky')
    }

    // 44. 科名會祿格
    if (lifeM.has('科') && mLu) {
        add('科名會祿格', '才華卓越，步入社會發展，可獲擢升。', 'lucky')
    }

    // 45. 坐貴向貴格 & 天乙拱命 (Kui/Yue)
    const hasKui = hasStar(lifeStars, '天魁')
    const hasYue = hasStar(lifeStars, '天鉞')
    const sfKui = sanFangStars.has('天魁')
    const sfYue = sanFangStars.has('天鉞')

    let zuoGui = false
    if ((hasKui && sfYue) || (hasYue && sfKui)) {
        add('坐貴向貴格', '有學識，有貴人相助。', 'lucky')
        zuoGui = true
    }

    if (sfKui && sfYue && !zuoGui) {
        add('天乙拱命格', '有學識，有貴人相助。天乙拱命格的條件比坐貴向貴格寬鬆。若是格局已符合坐貴向貴格條件，則格局標明為坐貴向貴格。', 'lucky')
    }

    // 46. 火羊格, 47. 鈴陀格
    if (sanFangStars.has('火星') && sanFangStars.has('擎羊')) add('火羊格', '屬火的火星遇屬金的擎羊，互動作用，成為火鍊金的效應。吉為鍛鍊，兇為熬煎。', 'lucky')
    if (sanFangStars.has('鈴星') && sanFangStars.has('陀羅')) add('鈴陀格', '屬火的鈴星遇屬金的陀羅。互動作用，成為火鍊金的效應，吉為磨鍊，兇為熬煎。', 'lucky')

    // 48. 擎羊入廟格
    if (hasStar(lifeStars, '擎羊') && ['丑', '辰', '未', '戌'].includes(lifeBranch)) {
        add('擎羊入廟格', '擎羊的作用本為刑傷，位於四墓(丑辰未戌)之地，兇性則有所克制。此為武貴之格。', 'lucky')
    }

    // === Fierce Patterns (Unlucky) ===

    // 49. 馬頭帶劍格
    if (hasStar(lifeStars, '擎羊') && lifeBranch === '午') {
        add('馬頭帶劍格', '五行中，擎羊屬金，進入屬火的午宮，有火鍊金效應。從事武職或外交工作，反為助力。離鄉背井出外發展，多為艱辛奔波，成敗起伏大。', 'unlucky')
    }

    // 50. 極居卯酉格
    if (hasStar(lifeStars, '紫微') && hasStar(lifeStars, '貪狼') && ['卯', '酉'].includes(lifeBranch)) {
        add('極居卯酉格', '對於在感情、婚姻生活會帶來不利影響。', 'unlucky')
    }

    // 51. 日月反背格
    if ((hasStar(lifeStars, '太陽') && lifeBranch === '戌') || (hasStar(lifeStars, '太陰') && lifeBranch === '辰')) {
        add('日月反背格', '勞碌命，求人不如勞己。無閒享清福。', 'unlucky')
    }

    // 52. 梁馬飄蕩格
    if (hasStar(lifeStars, '天梁') && hasStar(lifeStars, '天馬') && ['巳', '亥', '寅', '申'].includes(lifeBranch)) {
        add('梁馬飄蕩格', '此格表示勞而無獲之象。若顯現在感情生活上，對婚姻生活帶來不利影響。', 'unlucky')
    }

    // 53. 貞殺同宮格
    if (hasStar(lifeStars, '廉貞') && hasStar(lifeStars, '七殺') && ['丑', '未'].includes(lifeBranch)) {
        add('貞殺同宮格', '此格人應注意法律方面的問題。', 'unlucky')
    }

    // 54. 刑囚印格
    if (hasStar(lifeStars, '廉貞') && hasStar(lifeStars, '天相') && hasStar(lifeStars, '擎羊') && ['子', '午'].includes(lifeBranch)) {
        add('刑囚印格', '應注意法律訴訟問題。', 'unlucky')
    }

    // 55. 巨逢四煞格
    if (hasStar(lifeStars, '巨門')) {
        if (sanFangStars.has('擎羊') || sanFangStars.has('陀羅') || sanFangStars.has('火星') || sanFangStars.has('鈴星')) {
            add('巨逢四煞格', '此格局應防意外之災或為不得已苦衷流落四方。', 'unlucky')
        }
    }

    // 56. 命無正曜格
    if (astrolabe.palaces[lifeIdx].majorStars.length === 0) {
        add('命無正曜格', '個人特質不明顯，發展不具特定方向。', 'unlucky')
    }

    // 57. 命裡逢空格
    if (hasStar(lifeStars, '地劫') || hasStar(lifeStars, '地空')) {
        add('命裡逢空格', '有精神上孤獨，錢不易留住之跡象。', 'unlucky')
    }

    // 58. 空劫夾命格
    if ((hasStar(pStars, '地劫') && hasStar(nStars, '地空')) || (hasStar(pStars, '地空') && hasStar(nStars, '地劫'))) {
        add('空劫夾命格', '有精神上孤獨，錢不易留住之跡象。', 'unlucky')
    }

    // 59. 文星遇夾格
    if (hasStar(lifeStars, '文昌') || hasStar(lifeStars, '文曲')) {
        if (isClampedBy('地空', '地劫') || isClampedBy('火星', '鈴星') || isClampedBy('擎羊', '陀羅')) {
            add('文星遇夾格', '有懷才不遇跡象。', 'unlucky')
        }
    }

    // 60. 羊陀夾忌格
    if (lifeM.has('忌') && isClampedBy('擎羊', '陀羅')) {
        add('羊陀夾忌格', '雖有祿存守命，亦不為美。', 'unlucky')
    }

    // 61. 羊陀夾命格
    if (hasStar(lifeStars, '祿存') && !lifeM.has('忌')) {
        add('羊陀夾命格', '祿存獨坐命宮，亦是守財奴，即使富有，一文不捨，與孤貧無異。', 'unlucky')
    }

    // 62. 火鈴夾命格
    if (isClampedByFireBell && !hasTan) {
        add('火鈴夾命格', '有此格局之人，潛在叛逆心強，敢於行事。但應防一時衝動，與人發生衝突，惹來災禍。', 'unlucky')
    }

    // 63. 刑忌夾印格
    if (hasStar(lifeStars, '天相')) {
        const hasMutagenJi = (idx) => [...astrolabe.palaces[idx].majorStars, ...astrolabe.palaces[idx].minorStars].some(s => s.mutagen === '忌')
        const hasXing = (idx) => {
            const stars = getStars(idx)
            return stars.includes('天梁') || stars.includes('擎羊')
        }
        const isClamped = (hasMutagenJi(prevIdx) && hasXing(nextIdx)) || (hasMutagenJi(nextIdx) && hasXing(prevIdx))
        if (isClamped) {
            if (!detected.some(p => p.name === '財蔭夾印格')) {
                add('刑忌夾印格', '此格生人應注意刑傷、克害、破敗、災厄。', 'unlucky')
            }
        }
    }

    // 64. 馬落空亡格
    if (hasStar(lifeStars, '天馬')) {
        if (hasStar(lifeStars, '地空') || hasStar(lifeStars, '地劫') || sanFangStars.has('地空') || sanFangStars.has('地劫')) {
            add('馬落空亡格', '奔波，空忙一場。', 'unlucky')
        }
    }

    // 65. 兩重華蓋格
    if (hasStar(lifeStars, '祿存') && lifeM.has('祿') && (hasStar(lifeStars, '地空') || hasStar(lifeStars, '地劫'))) {
        add('兩重華蓋格', '華蓋表示有宗教緣分。皈依宗教，反可享主清福。但因雙祿被衝破，較不易累積錢財。', 'unlucky')
    }

    // 66. 祿逢衝破格
    if ((hasStar(lifeStars, '祿存') || lifeM.has('祿')) && (sanFangStars.has('地空') || sanFangStars.has('地劫'))) {
        add('祿逢衝破格', '吉處藏兇之象，應居安思危。', 'unlucky')
    }

    // 67. 泛水桃花格
    if (hasStar(lifeStars, '貪狼') && lifeBranch === '子') add('泛水桃花格', '無論男女，多風流，感情債不斷。', 'unlucky')
    if (hasStar(lifeStars, '廉貞') && hasStar(lifeStars, '貪狼') && lifeBranch === '亥' && hasStar(lifeStars, '陀羅')) add('泛水桃花格', '無論男女，多風流，感情債不斷。', 'unlucky')

    // 68. 風流彩杖格
    if (hasStar(lifeStars, '貪狼') && hasStar(lifeStars, '陀羅') && lifeBranch === '寅') {
        add('風流彩杖格', '喜好賭博、喝酒。應防過度流連聲色場所，迷戀其中，無法自拔。', 'unlucky')
    }

    return detected
}

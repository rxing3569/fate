export function calculatePatterns(astrolabe: any) {
    if (!astrolabe) return []
    const detected: any[] = []

    // 1. Identify Life Palace Index
    let lifePalace = astrolabe.palaces.find((p: any) => p.isLifePalace)
    if (!lifePalace) {
        lifePalace = astrolabe.palaces.find((p: any) => p.name === '命宮')
    }
    if (!lifePalace) return []
    const lifeIdx = astrolabe.palaces.indexOf(lifePalace)

    // 2. Helpers
    const getStars = (idx: number) => {
        const p = astrolabe.palaces[idx]
        return [...p.majorStars, ...p.minorStars].map((s: any) => s.name)
    }
    const getAllStars = (indices: number[]) => {
        const all = new Set()
        indices.forEach(idx => getStars(idx).forEach(s => all.add(s)))
        return all
    }
    const hasStar = (list: string[], name: string) => list.includes(name)
    const hasAll = (set: Set<unknown>, names: string[]) => names.every(n => set.has(n))
    const getBranch = (idx: number) => astrolabe.palaces[idx].earthlyBranch

    // Mutagen Helper (Global)
    const countMutagens = (idx: number) => {
        const stars = [...astrolabe.palaces[idx].majorStars, ...astrolabe.palaces[idx].minorStars]
        let set = new Set()
        stars.forEach((s: any) => { if (s.mutagen) set.add(s.mutagen) })
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
    const isClampedBy = (s1: string, s2: string) => (hasStar(pStars, s1) && hasStar(nStars, s2)) || (hasStar(pStars, s2) && hasStar(nStars, s1))

    // Helper to add detected pattern
    // type: 'lucky' | 'unlucky'
    const add = (name: string, description: string, type: 'lucky' | 'unlucky' = 'lucky', note: string = '') => {
        detected.push({ name, description, type, note })
    }

    // === Pattern Logic ===

    // 1. 極向離明格
    if (hasStar(lifeStars, '紫微') && lifeBranch === '午') {
        add('極向離明格', '紫微入午宮，氣象宏大，主聲名遠播，為貴格。', 'lucky')
    }

    // 2. 君臣慶會格
    if (hasStar(lifeStars, '紫微')) {
        let count = 0
        if (sanFangStars.has('左輔')) count++
        if (sanFangStars.has('右弼')) count++

        // Neighbor check relative to Life
        if (isClampedBy('左輔', '右弼')) count = 2

        if (count >= 1) {
            add('君臣慶會格', '君星得臣輔佐，主有助力，事業順遂，為貴格。', 'lucky')
        }
    }

    // 3. 紫府同宮格
    if (hasStar(lifeStars, '紫微') && hasStar(lifeStars, '天府') && (lifeBranch === '寅' || lifeBranch === '申')) {
        add('紫府同宮格', '兩大帝星同宮，貴氣雖重，但性格矛盾，易猶豫不決，大器晚成。', 'lucky')
    }

    // 4. 紫府朝垣格
    if (!hasStar(lifeStars, '紫微') && !hasStar(lifeStars, '天府')) {
        if (sanFangStars.has('紫微') && sanFangStars.has('天府')) {
            add('紫府朝垣格', '紫微天府三方拱照，主衣食無憂，富貴雙全。', 'lucky')
        }
    }

    // 5. 巨機同宮格 / 巨機化酉格
    if (hasStar(lifeStars, '巨門') && hasStar(lifeStars, '天機') && (lifeBranch === '卯' || lifeBranch === '酉')) {
        const hasJi = astrolabe.palaces[lifeIdx].majorStars.some((s: any) => s.mutagen === '忌') || astrolabe.palaces[lifeIdx].minorStars.some((s: any) => s.mutagen === '忌')
        if (hasJi && lifeBranch === '酉') {
            add('巨機化酉格', '性質為奔波飄蕩，凡事親力親為，需防口舌是非。', 'unlucky')
        } else if (!hasJi) {
            add('巨機同宮格', '巨門天機同宮，主思變，具策劃能力，但需防感情波折。', 'lucky')
        }
    }

    // 6. 善蔭朝綱格
    if (hasStar(lifeStars, '天機') && hasStar(lifeStars, '天梁') && (lifeBranch === '辰' || lifeBranch === '戌')) {
        add('善蔭朝綱格', '聰明機智，口才佳，擅長分析策劃，有貴人提拔。', 'lucky')
    }

    // 7. 機月同梁格
    if (hasAll(sanFangStars, ['天機', '太陰', '天同', '天梁'])) {
        add('機月同梁格', '適合公職或專門技術，生活安穩，主富。', 'lucky')
    }

    // 8. 日麗中天格
    if (hasStar(lifeStars, '太陽') && lifeBranch === '午') {
        add('日麗中天格', '太陽入廟，光芒萬丈，主貴氣，早年得志。', 'lucky')
    }

    // 9. 日出扶桑格
    if (hasStar(lifeStars, '太陽') && lifeBranch === '卯') {
        add('日出扶桑格', '旭日東昇，充滿朝氣，主少年得志，發展迅速。', 'lucky')
    }

    // 10. 日月同宮格
    if (hasStar(lifeStars, '太陽') && hasStar(lifeStars, '太陰') && (lifeBranch === '丑' || lifeBranch === '未')) {
        add('日月同宮格', '性格雙重，既有剛強一面亦有溫柔一面，主變動中發展。', 'lucky')
    }

    // 11. 日月並明格
    const findStarIdx = (name: string) => astrolabe.palaces.findIndex((p: any) => [...p.majorStars, ...p.minorStars].some((s: any) => s.name === name))
    const sunIdx = findStarIdx('太陽')
    const moonIdx = findStarIdx('太陰')

    if (sunIdx !== -1 && moonIdx !== -1 && sanFangIndices.includes(sunIdx) && sanFangIndices.includes(moonIdx)) {
        const sunB = getBranch(sunIdx)
        const moonB = getBranch(moonIdx)
        if ((sunB === '巳' && moonB === '酉') || (sunB === '辰' && moonB === '戌')) {
            add('日月並明格', '丹墀桂墀，日月光芒互映，主早年得志，富貴雙全。', 'lucky')
        }
    }

    // 12. 明珠出海格
    if (lifeBranch === '未' && astrolabe.palaces[lifeIdx].majorStars.length === 0) {
        if (sunIdx !== -1 && moonIdx !== -1 && sanFangIndices.includes(sunIdx) && sanFangIndices.includes(moonIdx)) {
            const sunB = getBranch(sunIdx)
            const moonB = getBranch(moonIdx)
            if (sunB === '卯' && moonB === '亥') {
                add('明珠出海格', '命無正曜，日月明亮拱照，主才華出眾，名利雙收。', 'lucky')
            }
        }
    }

    // 13. 巨日同宮格
    if (hasStar(lifeStars, '巨門') && hasStar(lifeStars, '太陽') && (lifeBranch === '寅' || lifeBranch === '申')) {
        add('巨日同宮格', '巨門太陽同宮，主口才極佳，適合傳播、法律，先名後利。', 'lucky')
    }

    // 14. 陽梁昌祿格
    if (hasAll(sanFangStars, ['太陽', '天梁', '文昌', '祿存'])) {
        add('陽梁昌祿格', '太陽天梁文昌祿存會合，利於考試競選，主功名顯達。', 'lucky')
    }

    // 15. 貪武同行格
    if (hasStar(lifeStars, '武曲') && hasStar(lifeStars, '貪狼') && (lifeBranch === '丑' || lifeBranch === '未')) {
        add('貪武同行格', '貪狼武曲同宮，主大器晚成，先苦後甘，適合軍警或經商。', 'lucky')
    }

    // 16. 將星得地格
    if (hasStar(lifeStars, '武曲') && (lifeBranch === '辰' || lifeBranch === '戌')) {
        add('將星得地格', '武曲入廟，主剛毅果決，大器晚成，奮鬥有成。', 'lucky')
    }

    // 17. 財祿夾馬格
    if (hasStar(lifeStars, '天馬')) {
        const hasWuQu = hasStar(pStars, '武曲') || hasStar(nStars, '武曲')
        // Check mutagens for Hua Lu in neighbors
        const hasMutagenLu = (idx: number) => {
            const p = astrolabe.palaces[idx]
            return [...p.majorStars, ...p.minorStars].some((s: any) => s.mutagen === '祿')
        }

        if (hasWuQu && (hasMutagenLu(prevIdx) || hasMutagenLu(nextIdx) || hasStar(pStars, '祿存') || hasStar(nStars, '祿存'))) {
            add('財祿夾馬格', '天馬被武曲祿存夾，主善於理財投機，財運極佳。', 'lucky')
        }
    }

    // 18. 廉貞文武格
    if (hasStar(lifeStars, '廉貞')) {
        const careerIdx = (lifeIdx + 8) % 12
        if (hasStar(getStars(careerIdx), '武曲')) {
            if (sanFangStars.has('文昌') || sanFangStars.has('文曲')) {
                add('廉貞文武格', '廉貞遇文昌文曲，主文武兼備，才華洋溢。', 'lucky')
            }
        }
    }

    // 19. 財蔭夾印格
    if (hasStar(lifeStars, '天相')) {
        const hasLiang = (idx: number) => getStars(idx).includes('天梁')
        const hasMutagenLu = (idx: number) => {
            const p = astrolabe.palaces[idx]
            return [...p.majorStars, ...p.minorStars].some((s: any) => s.mutagen === '祿')
        }

        // Strict Clamping: One side has Liang, the other side has Lu
        if ((hasLiang(prevIdx) && hasMutagenLu(nextIdx)) || (hasLiang(nextIdx) && hasMutagenLu(prevIdx))) {
            add('財蔭夾印格', '天相被化祿天梁夾，主得長輩提攜，財官雙美。', 'lucky')
        }
    }

    // 20. 雄宿朝垣格
    if (hasStar(lifeStars, '廉貞') && (lifeBranch === '申' || lifeBranch === '寅')) {
        add('雄宿朝垣格', '廉貞獨坐，個性強悍，可任要職，主艱苦奮鬥後有成。', 'lucky')
    }

    // 21. 府相朝垣格
    if (sanFangStars.has('天府') && sanFangStars.has('天相')) {
        if (!detected.some((p: any) => p.name === '府相朝垣格')) {
            add('府相朝垣格', '天府天相拱照，主食祿豐足，人際關係佳，事業穩定。', 'lucky')
        }
    }

    // 22. 月朗天門格
    if (hasStar(lifeStars, '太陰') && lifeBranch === '亥') {
        add('月朗天門格', '太陰入廟，光芒瑩潔，主富貴，藝術氣質濃厚。', 'lucky')
    }

    // 23. 月生滄海格
    if (hasStar(lifeStars, '太陰') && hasStar(lifeStars, '天同') && lifeBranch === '子') {
        add('月生滄海格', '氣質優雅，學識豐富，主清貴，得名聲財富。', 'lucky')
    }

    // 24. Fire/Bell/Greedy variations
    const hasTan = hasStar(lifeStars, '貪狼')
    const hasHuo = sanFangStars.has('火星')
    const hasLing = sanFangStars.has('鈴星')
    const isClampedByFireBell = isClampedBy('火星', '鈴星')

    if (hasTan) {
        if (hasHuo && hasLing) add('火鈴貪格', '火鈴助漲貪狼聲勢，主突發橫財，運勢爆發。', 'lucky')
        else if (hasHuo) add('火貪格', '火星助漲貪狼，主突發橫財，爆發力強。', 'lucky')
        else if (hasLing) add('鈴貪格', '鈴星助漲貪狼，主突發橫財，但偏向暗中發展。', 'lucky')

        if (isClampedByFireBell) {
            add('火鈴夾貪格', '貪狼被火鈴夾，主化被動為主動，將才華化為行動，有突發之象。', 'lucky')
        }
    }

    // 25. 石中隱玉格
    if (hasStar(lifeStars, '巨門') && (lifeBranch === '子' || lifeBranch === '午')) {
        add('石中隱玉格', '才華內斂，經磨練後方能顯露光芒，先苦後甘。', 'lucky')
    }

    // 26. 祿馬配印格
    if (hasStar(lifeStars, '天相') && hasStar(lifeStars, '天馬')) {
        const hasLuCun = hasStar(lifeStars, '祿存')
        const hasMutagenLu = astrolabe.palaces[lifeIdx].majorStars.some((s: any) => s.mutagen === '祿') || astrolabe.palaces[lifeIdx].minorStars.some((s: any) => s.mutagen === '祿')
        if (hasLuCun || hasMutagenLu) {
            add('祿馬配印格', '祿存天馬天相，主奔波中生財，動中求利，名利雙收。', 'lucky')
        }
    }

    // 27. 祿馬交馳格
    if (sanFangStars.has('天馬')) {
        let hasLu = sanFangStars.has('祿存')
        if (!hasLu) {
            sanFangIndices.forEach(idx => {
                if ([...astrolabe.palaces[idx].majorStars, ...astrolabe.palaces[idx].minorStars].some((s: any) => s.mutagen === '祿')) hasLu = true
            })
        }
        if (hasLu) add('祿馬交馳格', '祿存天馬交會，主奔波勞碌以求財，愈動愈發。', 'lucky')
    }

    // 28. 壽星入廟格
    if (hasStar(lifeStars, '天梁') && lifeBranch === '午') {
        add('壽星入廟格', '天梁入廟，主正直無私，健康長壽，有名望。', 'lucky')
    }

    // 29. 七殺朝鬥格
    if (hasStar(lifeStars, '七殺') && ['子', '午', '寅', '申'].includes(lifeBranch)) {
        add('七殺朝鬥格', '七殺仰斗，主謀略膽識，適合開創，成就非凡。', 'lucky')
    }

    // 30. 英星入廟格
    if (hasStar(lifeStars, '破軍') && ['子', '午'].includes(lifeBranch)) {
        add('英星入廟格', '破軍入廟，主果敢有魄力，適合開創性事業。', 'lucky')
    }

    // 31. 文桂文華格
    if (hasStar(lifeStars, '文昌') && hasStar(lifeStars, '文曲') && ['丑', '未'].includes(lifeBranch)) {
        add('文桂文華格', '文昌文曲同宮，主聰明多藝，氣質高雅，利於學術。', 'lucky')
    }

    // 32. 文星拱命格
    if (sanFangStars.has('文昌') && sanFangStars.has('文曲') && !detected.some((p: any) => p.name === '文桂文華格')) {
        add('文星拱命格', '文昌文曲拱照，主聰明多藝，利於文教藝術發展。', 'lucky')
    }

    // 33. Purple/Fu Clamp (紫府夾命)
    if (['寅', '申'].includes(lifeBranch) &&
        ((hasStar(pStars, '紫微') && hasStar(nStars, '天府')) || (hasStar(pStars, '天府') && hasStar(nStars, '紫微')))) {
        add('紫府夾命格', '命宮被紫府夾，主貴氣逼人，得有得力助手，社會地位高。', 'lucky')
    }

    // 34. Sun/Moon Clamp (日月夾命)
    if (['丑', '未'].includes(lifeBranch) &&
        ((hasStar(pStars, '太陽') && hasStar(nStars, '太陰')) || (hasStar(pStars, '太陰') && hasStar(nStars, '太陽')))) {
        add('日月夾命格', '命宮被日月夾，主財權雙美，一生富足，不權則富。', 'lucky')
    }

    // 35. Left/Right Clamp (左右夾命)
    if (['丑', '未'].includes(lifeBranch) &&
        ((hasStar(pStars, '左輔') && hasStar(nStars, '右弼')) || (hasStar(pStars, '右弼') && hasStar(nStars, '左輔')))) {
        add('左右夾命格', '命宮被左右夾，主得朋友助力，人緣極佳，凡事有人幫。', 'lucky')
    }

    // 36. Chang/Qu Clamp (昌曲夾命)
    if (['丑', '未'].includes(lifeBranch) &&
        ((hasStar(pStars, '文昌') && hasStar(nStars, '文曲')) || (hasStar(pStars, '文曲') && hasStar(nStars, '文昌')))) {
        add('昌曲夾命格', '命宮被昌曲夾，主文采風流，學術成就高。', 'lucky')
    }

    // 37. Left/Right Same Palace (左右同宮)
    if (['丑', '未'].includes(lifeBranch) && hasStar(lifeStars, '左輔') && hasStar(lifeStars, '右弼')) {
        add('左右同宮格', '左輔右弼同宮，主敦厚善良，人緣好，助力大。', 'lucky')
    }

    // 38. 輔拱文星格
    if ((hasStar(lifeStars, '文昌') || hasStar(lifeStars, '文曲'))) {
        if (sanFangStars.has('左輔') && sanFangStars.has('右弼')) {
            add('輔拱文星格', '才思敏捷，有能力獨當一面，文武雙全。', 'lucky')
        }
    }

    // 39. 雙祿交流格
    let hasLuCun = sanFangStars.has('祿存')
    let hasHuaLu = false
    sanFangIndices.forEach(idx => {
        if ([...astrolabe.palaces[idx].majorStars, ...astrolabe.palaces[idx].minorStars].some((s: any) => s.mutagen === '祿')) hasHuaLu = true
    })
    if (hasLuCun && hasHuaLu) add('雙祿交流格', '祿存化祿互動，主財源廣進，富貴可期。', 'lucky')

    // 40. 三奇嘉會格
    let mLu = false, mQuan = false, mKe = false
    sanFangIndices.forEach(idx => {
        const stars = [...astrolabe.palaces[idx].majorStars, ...astrolabe.palaces[idx].minorStars]
        if (stars.some((s: any) => s.mutagen === '祿')) mLu = true
        if (stars.some((s: any) => s.mutagen === '權')) mQuan = true
        if (stars.some((s: any) => s.mutagen === '科')) mKe = true
    })
    if (mLu && mQuan && mKe) add('三奇嘉會格', '祿權科會合，主名氣響亮，運勢強勁，富貴雙全。', 'lucky')

    // 41. 權祿巡逢格.
    if (mLu && mQuan && !mKe) add('權祿巡逢格', '祿權同會，主事業穩固，財權雙美。', 'lucky')

    // 42. 科權祿夾格
    const pM = countMutagens(prevIdx)
    const nM = countMutagens(nextIdx)
    const allM = new Set([...pM, ...nM])
    if ((allM.has('祿') && allM.has('權')) || (allM.has('祿') && allM.has('科')) || (allM.has('權') && allM.has('科'))) {
        add('科權祿夾格', '命宮被科權祿夾，主貴人環繞，機遇如雨。', 'lucky')
    }

    // 43. 甲第登科格
    if (lifeM.has('科') && mQuan) {
        add('甲第登科格', '科權會，主考運佳，學歷高，少年得志。', 'lucky')
    }

    // 44. 科名會祿格
    if (lifeM.has('科') && mLu) {
        add('科名會祿格', '科祿會，主才華獲利，名利雙收。', 'lucky')
    }

    // 45. 坐貴向貴格 & 天乙拱命 (Kui/Yue)
    const hasKui = hasStar(lifeStars, '天魁')
    const hasYue = hasStar(lifeStars, '天鉞')
    const sfKui = sanFangStars.has('天魁')
    const sfYue = sanFangStars.has('天鉞')

    let zuoGui = false
    if ((hasKui && sfYue) || (hasYue && sfKui)) {
        add('坐貴向貴格', '主得貴人提拔，逢凶化吉，機遇佳。', 'lucky')
        zuoGui = true
    }

    if (sfKui && sfYue && !zuoGui) {
        add('天乙拱命格', '天魁天鉞拱命，主得貴人多助，運勢順遂。', 'lucky')
    }

    // 46. 火羊格, 47. 鈴陀格
    if (sanFangStars.has('火星') && sanFangStars.has('擎羊')) add('火羊格', '火星遇擎羊，火鍊金精，主經鍛鍊而成大器，吉則武職顯貴。', 'lucky')
    if (sanFangStars.has('鈴星') && sanFangStars.has('陀羅')) add('鈴陀格', '鈴星遇陀羅，磨練成材，吉則武職顯貴，凶則煎熬。', 'lucky')

    // 48. 擎羊入廟格
    if (hasStar(lifeStars, '擎羊') && ['丑', '辰', '未', '戌'].includes(lifeBranch)) {
        add('擎羊入廟格', '擎羊入四墓地，凶性轉為剛毅，主權威出眾，富貴可期。', 'lucky')
    }

    // === Fierce Patterns (Unlucky) ===

    // 49. 馬頭帶劍格
    if (hasStar(lifeStars, '擎羊') && lifeBranch === '午') {
        add('馬頭帶劍格', '主個性剛烈，奔波勞碌，宜武職或外地發展，成敗起伏大。', 'unlucky')
    }

    // 50. 極居卯酉格
    if (hasStar(lifeStars, '紫微') && hasStar(lifeStars, '貪狼') && ['卯', '酉'].includes(lifeBranch)) {
        add('極居卯酉格', '主桃花犯主，感情生活複雜，需防色難，宜修身養性。', 'unlucky')
    }

    // 51. 日月反背格
    if ((hasStar(lifeStars, '太陽') && lifeBranch === '戌') || (hasStar(lifeStars, '太陰') && lifeBranch === '辰')) {
        add('日月反背格', '日月失輝，主勞碌奔波，披星戴月，成敗起伏大。', 'unlucky')
    }

    // 52. 梁馬飄蕩格
    if (hasStar(lifeStars, '天梁') && hasStar(lifeStars, '天馬') && ['巳', '亥', '寅', '申'].includes(lifeBranch)) {
        add('梁馬飄蕩格', '天梁天馬同宮，主飄蕩不定，離鄉背井，感情多波折。', 'unlucky')
    }

    // 53. 貞殺同宮格
    if (hasStar(lifeStars, '廉貞') && hasStar(lifeStars, '七殺') && ['丑', '未'].includes(lifeBranch)) {
        add('貞殺同宮格', '廉貞七殺同宮，主個性剛硬，需防官非口舌。', 'unlucky')
    }

    // 54. 刑囚印格
    if (hasStar(lifeStars, '廉貞') && hasStar(lifeStars, '天相') && hasStar(lifeStars, '擎羊') && ['子', '午'].includes(lifeBranch)) {
        add('刑囚印格', '主是非纏身，官司刑訟，因財持刀，需守法守紀。', 'unlucky')
    }

    // 55. 巨逢四煞格
    if (hasStar(lifeStars, '巨門')) {
        if (sanFangStars.has('擎羊') || sanFangStars.has('陀羅') || sanFangStars.has('火星') || sanFangStars.has('鈴星')) {
            add('巨逢四煞格', '巨門遇煞，主口舌是非，意外災禍，人生多坎坷。', 'unlucky')
        }
    }

    // 56. 命無正曜格
    if (astrolabe.palaces[lifeIdx].majorStars.length === 0) {
        add('命無正曜格', '命宮無主星，主特質不明顯，易受環境影響，或是離鄉發展。', 'unlucky')
    }

    // 57. 命裡逢空格
    if (hasStar(lifeStars, '地劫') || hasStar(lifeStars, '地空')) {
        add('命裡逢空格', '命宮逢空劫，主精神孤獨，財來財去，不利聚財。', 'unlucky')
    }

    // 58. 空劫夾命格
    if ((hasStar(pStars, '地劫') && hasStar(nStars, '地空')) || (hasStar(pStars, '地空') && hasStar(nStars, '地劫'))) {
        add('空劫夾命格', '命被空劫夾，主環境不利，人生多波折，財庫難守。', 'unlucky')
    }

    // 59. 文星遇夾格
    if (hasStar(lifeStars, '文昌') || hasStar(lifeStars, '文曲')) {
        if (isClampedBy('地空', '地劫') || isClampedBy('火星', '鈴星') || isClampedBy('擎羊', '陀羅')) {
            add('文星遇夾格', '文星被煞夾，主懷才不遇，學業受阻，文書失誤。', 'unlucky')
        }
    }

    // 60. 羊陀夾忌格
    if (lifeM.has('忌') && isClampedBy('擎羊', '陀羅')) {
        add('羊陀夾忌格', '化忌被羊陀夾，主雪上加霜，災厄連連，事倍功半。', 'unlucky')
    }

    // 61. 羊陀夾命格
    if (hasStar(lifeStars, '祿存') && !lifeM.has('忌')) {
        add('羊陀夾命格', '祿存獨坐命宮，前後為羊陀所夾。性格保守謹慎，防衛心強，適合穩健發展。', 'unlucky')
    }

    // 62. 火鈴夾命格
    if (isClampedByFireBell && !hasTan) {
        add('火鈴夾命格', '命被火鈴夾，主叛逆衝動，易惹災禍，需修身養性。', 'unlucky')
    }

    // 63. 刑忌夾印格
    if (hasStar(lifeStars, '天相')) {
        const hasMutagenJi = (idx: number) => [...astrolabe.palaces[idx].majorStars, ...astrolabe.palaces[idx].minorStars].some((s: any) => s.mutagen === '忌')
        const hasXing = (idx: number) => {
            const stars = getStars(idx)
            return stars.includes('天梁') || stars.includes('擎羊')
        }
        const isClamped = (hasMutagenJi(prevIdx) && hasXing(nextIdx)) || (hasMutagenJi(nextIdx) && hasXing(prevIdx))
        if (isClamped) {
            if (!detected.some((p: any) => p.name === '財蔭夾印格')) {
                add('刑忌夾印格', '天相被刑忌夾，主刑傷官非，壓力巨大，運勢受阻。', 'unlucky')
            }
        }
    }

    // 64. 馬落空亡格
    if (hasStar(lifeStars, '天馬')) {
        if (hasStar(lifeStars, '地空') || hasStar(lifeStars, '地劫') || sanFangStars.has('地空') || sanFangStars.has('地劫')) {
            add('馬落空亡格', '天馬遇空亡，主奔波勞碌無功，白忙一場。', 'unlucky')
        }
    }

    // 65. 兩重華蓋格
    if (hasStar(lifeStars, '祿存') && lifeM.has('祿') && (hasStar(lifeStars, '地空') || hasStar(lifeStars, '地劫'))) {
        add('兩重華蓋格', '雙祿遇空亡，主雖有財緣但難守，宜修身養性，追求精神富足。', 'unlucky')
    }

    // 66. 祿逢衝破格
    if ((hasStar(lifeStars, '祿存') || lifeM.has('祿')) && (sanFangStars.has('地空') || sanFangStars.has('地劫'))) {
        add('祿逢衝破格', '祿存遇沖破，主吉處藏凶，財來財去，成敗不一。', 'unlucky')
    }

    // 67. 泛水桃花格
    if (hasStar(lifeStars, '貪狼') && lifeBranch === '子') add('泛水桃花格', '貪狼居子，主風流多情，感情糾葛，易因此破財。', 'unlucky')
    if (hasStar(lifeStars, '廉貞') && hasStar(lifeStars, '貪狼') && lifeBranch === '亥' && hasStar(lifeStars, '陀羅')) add('泛水桃花格', '廉貪加煞，主風流多情，感情糾葛，易因此破財。', 'unlucky')

    // 68. 風流彩杖格
    if (hasStar(lifeStars, '貪狼') && hasStar(lifeStars, '陀羅') && lifeBranch === '寅') {
        add('風流彩杖格', '主喜好聲色，酒色財氣，需防沉迷其中。', 'unlucky')
    }

    return detected
}

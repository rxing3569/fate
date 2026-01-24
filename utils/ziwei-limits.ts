import { SUI_JIAN_12, JIANG_QIAN_12 } from './ziwei-stars'

export const PALACE_ORDER = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '交友', '官祿', '田宅', '福德', '父母']

export function getRelativePalaceName(cIdx, lifeIdx, prefix) {
    const diff = (lifeIdx - cIdx + 12) % 12
    const name = PALACE_ORDER[diff]
    return name ? `${prefix}${name.replace('宮', '')}` : ''
}

export function getIztroIndex(standardIndex) {
    return (standardIndex - 2 + 12) % 12
}

export function getFlowStars(horoscope, palaceIdx, activeLimit) {
    if (!horoscope || !activeLimit) return []

    // We expect activeLimit to determine the 'Year' logic
    let targetYearBranch = -1

    if (activeLimit.type === 'yearly' && horoscope.yearly) {
        const iztroIdx = horoscope.yearly.index
        targetYearBranch = (iztroIdx + 2) % 12
    }
    else if (activeLimit.type === 'age' && horoscope.yearly) {
        // Use Yearly context even for Small Limit/Age view
        const iztroIdx = horoscope.yearly.index
        targetYearBranch = (iztroIdx + 2) % 12
    }

    if (targetYearBranch === -1) return []

    const stars = []
    const palaceStd = (palaceIdx + 2) % 12

    // 1. Sui Jian 12 (Starts at Year Branch, Clockwise)
    const suiJianIdx = (palaceStd - targetYearBranch + 12) % 12
    if (SUI_JIAN_12[suiJianIdx]) {
        stars.push({ name: SUI_JIAN_12[suiJianIdx], type: 'flow-sui' })
    }

    // 2. Jiang Qian 12 (Based on San He of Year Branch)
    let jiangXingStd = -1
    const y = targetYearBranch
    if ([8, 0, 4].includes(y)) jiangXingStd = 0      // Shen-Zi-Chen -> Zi
    else if ([11, 1, 5].includes(y)) jiangXingStd = 1 // Hai-Mao-Wei -> Mao
    else if ([2, 6, 10].includes(y)) jiangXingStd = 6 // Yin-Wu-Xu -> Wu
    else if ([3, 7, 9].includes(y)) jiangXingStd = 7  // Si-You-Chou -> You

    if (jiangXingStd !== -1) {
        const jiangQianIdx = (palaceStd - jiangXingStd + 12) % 12
        if (JIANG_QIAN_12[jiangQianIdx]) {
            stars.push({ name: JIANG_QIAN_12[jiangQianIdx], type: 'flow-jiang' })
        }
    }

    return stars
}

// Keep legacy for now if needed, but prefer getFlowStars
export function getManualYearlyStars(horoscope, palaceIdx, activeLimit) {
    return getFlowStars(horoscope, palaceIdx, activeLimit)
}

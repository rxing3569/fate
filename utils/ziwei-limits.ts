export const PALACE_ORDER = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '交友', '官祿', '田宅', '福德', '父母']

export function getRelativePalaceName(cIdx, lifeIdx, prefix) {
    const diff = (lifeIdx - cIdx + 12) % 12
    const name = PALACE_ORDER[diff]
    return name ? `${prefix}${name.replace('宮', '')}` : ''
}

export function getIztroIndex(standardIndex) {
    return (standardIndex - 2 + 12) % 12
}

export function getManualYearlyStars(horoscope, palaceIdx, activeLimit) {
    if (!horoscope) return []
    if (!activeLimit) return []

    const yearlyPalaceIdx = horoscope.yearly.index
    const yearBranch = (yearlyPalaceIdx + 2) % 12

    const manualStars = []

    // 1. Bing Fu
    const bingFuStd = (yearBranch + 11) % 12
    const bingFuIztro = getIztroIndex(bingFuStd)
    if (bingFuIztro === palaceIdx) manualStars.push({ name: '病符', brightness: '' })

    // 2. Tian Sha
    let tianShaStd = -1
    if ([2, 6, 10].includes(yearBranch)) tianShaStd = 0
    if ([8, 0, 4].includes(yearBranch)) tianShaStd = 6
    if ([11, 3, 7].includes(yearBranch)) tianShaStd = 9
    if ([5, 9, 1].includes(yearBranch)) tianShaStd = 3

    if (tianShaStd !== -1) {
        if (getIztroIndex(tianShaStd) === palaceIdx) manualStars.push({ name: '天煞', brightness: '' })
    }

    return manualStars
}

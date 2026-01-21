// 1. Major Stars (14主星)
export const MAJOR_STARS = [
    '紫微', '天機', '太陽', '武曲', '天同', '廉貞',
    '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍'
]

// 2. Lucky Stars (八吉星)
export const LUCKY_STARS = [
    '左輔', '右弼', '天魁', '天鉞', '文昌', '文曲', '祿存', '天馬'
]

// 3. Sha Stars (六煞星)
export const SHA_STARS = [
    '擎羊', '陀羅', '火星', '鈴星', '地空', '地劫'
]

// 4. Peach Stars (桃花星 - Subset of others but useful for styling)
export const PEACH_STARS = ['紅鸞', '天喜', '咸池', '天姚']

// 5. B-Grade Stars (乙級星)
export const MINOR_STARS = [
    '天官', '天福', '天廚', '天刑', '天姚', '解神', '陰煞',
    '台輔', '封誥', '恩光', '天貴', '三台', '八座',
    '孤辰', '寡宿', '天才', '天壽', '破碎', '天月', '天巫', '天哭', '天虛',
    '龍池', '鳳閣', '紅鸞', '天喜', '咸池', '大耗'
]

// 6. 12 Gods (十二神)
export const CHANG_SHENG_12 = ['長生', '沐浴', '冠帶', '臨官', '帝旺', '衰', '病', '死', '墓', '絕', '胎', '養']
export const BO_SHI_12 = ['博士', '力士', '青龍', '小耗', '將軍', '奏書', '飛廉', '喜神', '病符', '大耗', '伏兵', '官府']
export const SUI_JIAN_12 = ['歲建', '晦氣', '喪門', '貫索', '官符', '小耗', '大耗', '龍德', '白虎', '天德', '吊客', '病符']
export const JIANG_QIAN_12 = ['將星', '攀鞍', '歲驛', '息神', '華蓋', '劫煞', '災煞', '天煞', '指背', '咸池', '月煞', '亡神']

// Helper for Styling
export function getStarClass(name) {
    if (MAJOR_STARS.includes(name)) return 'type-major'

    // Lucky (+ Flow Lucky)
    if (LUCKY_STARS.includes(name) || ['流昌', '流鉞', '流魁', '流鸞', '流喜'].includes(name)) return 'type-lucky'

    // Sha (+ Flow Sha)
    if (SHA_STARS.includes(name) || ['流羊', '流陀'].includes(name)) return 'type-sha'

    if (PEACH_STARS.includes(name)) return 'type-peach'
    return 'type-misc'
}

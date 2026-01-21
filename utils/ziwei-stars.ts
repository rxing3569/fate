export const LUCKY_STARS = ['左輔', '右弼', '天魁', '天鉞', '文昌', '文曲', '祿存', '天馬', '流昌', '流鉞', '流魁', '流鸞', '流喜']
export const SHA_STARS = ['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫', '流羊', '流陀', '病符', '天煞', '喪門', '白虎', '官符', '吊客']
export const PEACH_STARS = ['紅鸞', '天喜', '咸池', '天姚']

export function getStarClass(name) {
    if (LUCKY_STARS.includes(name)) return 'type-lucky'
    if (SHA_STARS.includes(name)) return 'type-sha'
    if (PEACH_STARS.includes(name)) return 'type-peach'
    return 'type-misc'
}

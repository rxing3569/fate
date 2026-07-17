import type { Bureau, Gender, ZiweiChartData } from '~/types/ziwei'

export const heavenlyStems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const
export const earthlyBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const
export const ziweiPalaces = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '交友', '官祿', '田宅', '福德', '父母'] as const

export const fiveElementsBureaus: Bureau[] = [
  { name: '水二局', number: 2 },
  { name: '木三局', number: 3 },
  { name: '金四局', number: 4 },
  { name: '土五局', number: 5 },
  { name: '火六局', number: 6 },
]

export function mod(value: number, base = 12) {
  return ((value % base) + base) % base
}

export function createChartData(input: {
  gender: Gender
  solarYear: number
  solarMonth: number
  solarDay: number
  lunarYear: number
  lunarMonth: number
  lunarDay: number
  timeBranch: string
  trueSolarTime?: string
  trueSolarOffset?: string
}): ZiweiChartData {
  const palaceStars = Object.fromEntries(earthlyBranches.map((branch) => [branch, [] as string[]]))
  return {
    ...input,
    palaceStars,
    palaceChangSheng: {},
    palaceBoShi: {},
    palaceSuiJian: {},
    palaceJiangQian: {},
    palaceSiHua: {},
    palaceDaXian: {},
    palaceXiaoXian: {},
  }
}

export function palaceNameForBranch(chart: ZiweiChartData, branch: string) {
  if (!chart.destinyPalaceBranch) return ''
  const destinyIndex = earthlyBranches.indexOf(chart.destinyPalaceBranch as never)
  const branchIndex = earthlyBranches.indexOf(branch as never)
  if (destinyIndex < 0 || branchIndex < 0) return ''
  return ziweiPalaces[mod(destinyIndex - branchIndex)]
}

export function getEarthlyBranchByHour(hour: number) {
  if (hour >= 23 || hour < 1) return '子'
  if (hour >= 1 && hour < 3) return '丑'
  if (hour >= 3 && hour < 5) return '寅'
  if (hour >= 5 && hour < 7) return '卯'
  if (hour >= 7 && hour < 9) return '辰'
  if (hour >= 9 && hour < 11) return '巳'
  if (hour >= 11 && hour < 13) return '午'
  if (hour >= 13 && hour < 15) return '未'
  if (hour >= 15 && hour < 17) return '申'
  if (hour >= 17 && hour < 19) return '酉'
  if (hour >= 19 && hour < 21) return '戌'
  return '亥'
}

export function getXiaoXianAges(chart: ZiweiChartData, branch: string) {
  const ages: number[] = []
  if (!chart.yearBranch) return ages
  const yearBranchIndex = earthlyBranches.indexOf(chart.yearBranch as never)
  const xiaoXianStart = [2, 6, 10].includes(yearBranchIndex)
    ? 4
    : [8, 0, 4].includes(yearBranchIndex)
      ? 10
      : [5, 9, 1].includes(yearBranchIndex)
        ? 7
        : 1
  const targetIndex = earthlyBranches.indexOf(branch as never)
  const baseAge = chart.gender === '男'
    ? 1 + mod(targetIndex - xiaoXianStart)
    : 1 + mod(xiaoXianStart - targetIndex)
  for (let index = 0; index < 8; index += 1) {
    ages.push(baseAge + 12 * index)
  }
  return ages
}

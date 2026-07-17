export type Gender = '男' | '女'

export interface Bureau {
  name: string
  number: number
}

export interface ZiweiChartData {
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
  yearStem?: string
  yearBranch?: string
  bureau?: Bureau
  destinyPalaceBranch?: string
  bodyPalaceBranch?: string
  palaceStars: Record<string, string[]>
  palaceChangSheng: Record<string, string>
  palaceBoShi: Record<string, string>
  palaceSuiJian: Record<string, string>
  palaceJiangQian: Record<string, string>
  palaceSiHua: Record<string, string>
  palaceDaXian: Record<string, [number, number]>
  palaceXiaoXian: Record<string, number>
}

export interface BirthInfo {
  gender: Gender
  year: number
  month: number
  day: number
  hour: number
  minute: number
  cityId: string
  longitude?: number
}

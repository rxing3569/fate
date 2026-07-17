import { Solar } from 'lunar-typescript'
import type { Gender, ZiweiChartData } from '~/types/ziwei'
import { boShi12, changSheng12, jiangQian12, siHuaTable, suiJian12 } from './stars'
import { createChartData, earthlyBranches, fiveElementsBureaus, getEarthlyBranchByHour, heavenlyStems, mod } from './core'

function branchAt(index: number) {
  return earthlyBranches[mod(index)]!
}

function stemAt(index: number) {
  return heavenlyStems[mod(index, 10)]!
}

function addStar(chart: ZiweiChartData, branchIndex: number, starName: string) {
  const branch = branchAt(branchIndex)
  ;(chart.palaceStars[branch] ??= []).push(starName)
}

function setDestinyPalace(chart: ZiweiChartData) {
  chart.yearStem = stemAt(chart.lunarYear - 4)
  chart.yearBranch = branchAt(chart.lunarYear - 4)

  const timeIndex = Math.max(earthlyBranches.indexOf(chart.timeBranch as never), 0)
  const destinyIndex = mod(2 + chart.lunarMonth - 1 - timeIndex)
  const bodyIndex = mod(2 + chart.lunarMonth - 1 + timeIndex)

  chart.destinyPalaceBranch = branchAt(destinyIndex)
  chart.bodyPalaceBranch = branchAt(bodyIndex)
}

function setFiveElementsBureau(chart: ZiweiChartData) {
  if (!chart.destinyPalaceBranch || !chart.yearStem) return
  const destinyBranchIndex = earthlyBranches.indexOf(chart.destinyPalaceBranch as never)
  const yearStemIndex = heavenlyStems.indexOf(chart.yearStem as never)
  const yinStemIndex = ((yearStemIndex % 5) * 2 + 2) % 10
  const diff = mod(destinyBranchIndex - 2)
  const destinyStemIndex = (yinStemIndex + diff) % 10
  const col = Math.floor(destinyStemIndex / 2)
  const row = Math.floor(destinyBranchIndex / 2) % 3
  const bureauMatrix = [
    [4, 2, 6, 5, 3],
    [2, 6, 5, 3, 4],
    [6, 5, 3, 4, 2],
  ]
  const number = bureauMatrix[row]![col]!
  chart.bureau = fiveElementsBureaus.find((item) => item.number === number)
}

function set14MajorStars(chart: ZiweiChartData) {
  if (!chart.bureau) return
  const day = chart.lunarDay
  const bureauNumber = chart.bureau.number
  let remainder = day % bureauNumber
  let quotient = Math.floor(day / bureauNumber)
  let x = 0
  if (remainder !== 0) {
    x = bureauNumber - remainder
    quotient += 1
  }
  let ziweiIndexFromYin = quotient
  ziweiIndexFromYin = x % 2 === 1 ? ziweiIndexFromYin - x : ziweiIndexFromYin + x
  const ziweiIndex = mod(2 + ziweiIndexFromYin - 1)

  addStar(chart, ziweiIndex, '紫微')
  addStar(chart, ziweiIndex - 1, '天機')
  addStar(chart, ziweiIndex - 3, '太陽')
  addStar(chart, ziweiIndex - 4, '武曲')
  addStar(chart, ziweiIndex - 5, '天同')
  addStar(chart, ziweiIndex - 8, '廉貞')

  const tianfuIndex = mod(16 - ziweiIndex)
  addStar(chart, tianfuIndex, '天府')
  addStar(chart, tianfuIndex + 1, '太陰')
  addStar(chart, tianfuIndex + 2, '貪狼')
  addStar(chart, tianfuIndex + 3, '巨門')
  addStar(chart, tianfuIndex + 4, '天相')
  addStar(chart, tianfuIndex + 5, '天梁')
  addStar(chart, tianfuIndex + 6, '七殺')
  addStar(chart, tianfuIndex + 10, '破軍')
}

function setAllStars(chart: ZiweiChartData) {
  const month = chart.lunarMonth
  const timeIndex = Math.max(earthlyBranches.indexOf(chart.timeBranch as never), 0)
  const yearStem = chart.yearStem || '甲'
  const yearBranch = chart.yearBranch || '子'

  addStar(chart, 4 + month - 1, '左輔')
  addStar(chart, 10 - (month - 1), '右弼')
  addStar(chart, 4 + timeIndex, '文曲')
  addStar(chart, 10 - timeIndex, '文昌')

  if (['甲', '戊', '庚'].includes(yearStem)) {
    addStar(chart, 1, '天魁'); addStar(chart, 7, '天鉞')
  } else if (['乙', '己'].includes(yearStem)) {
    addStar(chart, 0, '天魁'); addStar(chart, 8, '天鉞')
  } else if (['丙', '丁'].includes(yearStem)) {
    addStar(chart, 11, '天魁'); addStar(chart, 9, '天鉞')
  } else if (yearStem === '辛') {
    addStar(chart, 6, '天魁'); addStar(chart, 2, '天鉞')
  } else {
    addStar(chart, 3, '天魁'); addStar(chart, 5, '天鉞')
  }

  const lucunMap: Record<string, number> = { 甲: 2, 乙: 3, 丙: 5, 丁: 6, 戊: 5, 己: 6, 庚: 8, 辛: 9, 壬: 11, 癸: 0 }
  const lucunIndex = lucunMap[yearStem] ?? 2
  addStar(chart, lucunIndex, '祿存')

  const tianmaMap: Record<string, number> = { 申: 2, 子: 2, 辰: 2, 寅: 8, 午: 8, 戌: 8, 亥: 5, 卯: 5, 未: 5, 巳: 11, 酉: 11, 丑: 11 }
  addStar(chart, tianmaMap[yearBranch] ?? 2, '天馬')
  addStar(chart, lucunIndex + 1, '擎羊')
  addStar(chart, lucunIndex - 1, '陀羅')
  addStar(chart, 11 + timeIndex, '地劫')
  addStar(chart, 11 - timeIndex, '地空')

  let huoStart = 0
  let lingStart = 0
  if (['寅', '午', '戌'].includes(yearBranch)) {
    huoStart = 1; lingStart = 3
  } else if (['申', '子', '辰'].includes(yearBranch)) {
    huoStart = 2; lingStart = 10
  } else if (['巳', '酉', '丑'].includes(yearBranch)) {
    huoStart = 3; lingStart = 10
  } else {
    huoStart = 9; lingStart = 10
  }
  addStar(chart, huoStart + timeIndex, '火星')
  addStar(chart, lingStart + timeIndex, '鈴星')
}

function setMinorStars(chart: ZiweiChartData) {
  const month = chart.lunarMonth
  const day = chart.lunarDay
  const yearBranchIndex = earthlyBranches.indexOf((chart.yearBranch || '子') as never)
  const destinyIndex = earthlyBranches.indexOf((chart.destinyPalaceBranch || '子') as never)
  const bodyIndex = earthlyBranches.indexOf((chart.bodyPalaceBranch || '子') as never)
  const timeIndex = Math.max(earthlyBranches.indexOf(chart.timeBranch as never), 0)
  const yearStem = chart.yearStem || '甲'
  const yearStemIndex = Math.max(heavenlyStems.indexOf(yearStem as never), 0)

  addStar(chart, mod(3 - yearBranchIndex), '紅鸞')
  addStar(chart, 1 + month - 1, '天姚')
  addStar(chart, 9 + month - 1, '天刑')
  addStar(chart, 2 - (month - 1) * 2, '陰煞')
  addStar(chart, 4 + yearBranchIndex, '龍池')
  addStar(chart, 10 - yearBranchIndex, '鳳閣')
  addStar(chart, destinyIndex + yearBranchIndex, '天才')
  addStar(chart, bodyIndex + yearBranchIndex, '天壽')
  addStar(chart, 1 - yearBranchIndex, '天空')

  let guChen = 0
  let guaSu = 0
  if ([11, 0, 1].includes(yearBranchIndex)) {
    guChen = 2; guaSu = 10
  } else if ([2, 3, 4].includes(yearBranchIndex)) {
    guChen = 5; guaSu = 1
  } else if ([5, 6, 7].includes(yearBranchIndex)) {
    guChen = 8; guaSu = 4
  } else {
    guChen = 11; guaSu = 7
  }
  addStar(chart, guChen, '孤辰')
  addStar(chart, guaSu, '寡宿')

  const zuoFu = mod(4 + month - 1)
  const youBi = mod(10 - (month - 1))
  addStar(chart, zuoFu + day - 1, '三台')
  addStar(chart, youBi - (day - 1), '八座')
  addStar(chart, 10 - timeIndex + day - 2, '恩光')
  addStar(chart, 4 + timeIndex + day - 2, '天貴')
  addStar(chart, 6 - yearBranchIndex, '天哭')
  addStar(chart, 6 + yearBranchIndex, '天虛')

  const poSui = [0, 3, 6, 9].includes(yearBranchIndex) ? 5 : [4, 10, 1, 7].includes(yearBranchIndex) ? 1 : 9
  addStar(chart, poSui, '破碎')
  addStar(chart, 6 + timeIndex, '台輔')
  addStar(chart, 2 + timeIndex, '封誥')

  const tianGuanMap: Record<string, number> = { 甲: 7, 乙: 4, 丙: 5, 丁: 2, 戊: 3, 己: 9, 庚: 11, 辛: 9, 壬: 10, 癸: 6 }
  const tianFuMap: Record<string, number> = { 甲: 9, 乙: 8, 丙: 0, 丁: 11, 戊: 3, 己: 2, 庚: 6, 辛: 5, 壬: 6, 癸: 5 }
  addStar(chart, tianGuanMap[yearStem] ?? 7, '天官')
  addStar(chart, tianFuMap[yearStem] ?? 9, '天福')
  addStar(chart, 8 + Math.floor((month - 1) / 2) * 2, '解神')
  addStar(chart, [5, 8, 2, 11][(month - 1) % 4]!, '天巫')
  addStar(chart, [10, 5, 4, 2, 6, 3, 9, 11, 6, 0, 5, 8][month - 1]!, '天月')
  const tianChuMap: Record<string, number> = { 甲: 5, 乙: 6, 丙: 0, 丁: 5, 戊: 6, 己: 8, 庚: 2, 辛: 6, 壬: 9, 癸: 11 }
  addStar(chart, tianChuMap[yearStem] ?? 5, '天廚')
  addStar(chart, destinyIndex - 5, '天傷')
  addStar(chart, destinyIndex - 6, '天使')
  addStar(chart, [8, 9, 10, 5, 6, 7, 2, 3, 4, 11, 0, 1][yearBranchIndex]!, '蜚廉')
  addStar(chart, 10 - yearStemIndex + yearBranchIndex, '旬空')
  addStar(chart, 10 - yearBranchIndex, '年解')

  const yueDeIdx = [2, 6, 10].includes(yearBranchIndex) ? 5 : [8, 0, 4].includes(yearBranchIndex) ? 8 : [5, 9, 1].includes(yearBranchIndex) ? 9 : 2
  addStar(chart, yueDeIdx, '月德')
  const jieLuMap: Record<string, [number, number]> = { 甲: [8, 9], 己: [8, 9], 乙: [6, 7], 庚: [6, 7], 丙: [4, 5], 辛: [4, 5], 丁: [2, 3], 壬: [2, 3], 戊: [0, 1], 癸: [0, 1] }
  const [jieLu, kongWang] = jieLuMap[yearStem] ?? [8, 9]
  addStar(chart, jieLu, '截路')
  addStar(chart, kongWang, '空亡')
}

function set12Gods(chart: ZiweiChartData) {
  if (!chart.bureau || !chart.yearStem) return
  const yearStemIndex = heavenlyStems.indexOf(chart.yearStem as never)
  const isForward = (yearStemIndex % 2 === 0 && chart.gender === '男') || (yearStemIndex % 2 !== 0 && chart.gender === '女')
  const changShengStart = chart.bureau.number === 3 ? 11 : chart.bureau.number === 4 ? 5 : chart.bureau.number === 6 ? 2 : 8

  changSheng12.forEach((name, index) => {
    chart.palaceChangSheng[branchAt(isForward ? changShengStart + index : changShengStart - index)] = name
  })

  const lucunMap: Record<string, number> = { 甲: 2, 乙: 3, 丙: 5, 丁: 6, 戊: 5, 己: 6, 庚: 8, 辛: 9, 壬: 11, 癸: 0 }
  const boShiStart = lucunMap[chart.yearStem] ?? 2
  boShi12.forEach((name, index) => {
    chart.palaceBoShi[branchAt(isForward ? boShiStart + index : boShiStart - index)] = name
  })

  const yearBranchIndex = earthlyBranches.indexOf((chart.yearBranch || '子') as never)
  suiJian12.forEach((name, index) => {
    chart.palaceSuiJian[branchAt(yearBranchIndex + index)] = name
  })

  const jiangQianStart = [2, 6, 10].includes(yearBranchIndex) ? 6 : [8, 0, 4].includes(yearBranchIndex) ? 0 : [5, 9, 1].includes(yearBranchIndex) ? 9 : 3
  jiangQian12.forEach((name, index) => {
    chart.palaceJiangQian[branchAt(jiangQianStart + index)] = name
  })
}

function setSiHua(chart: ZiweiChartData) {
  const siHua = siHuaTable[chart.yearStem || '甲']
  if (!siHua) return
  ;['化祿', '化權', '化科', '化忌'].forEach((label, index) => {
    chart.palaceSiHua[siHua[index]!] = label
  })
}

function setDaXian(chart: ZiweiChartData) {
  if (!chart.bureau || !chart.destinyPalaceBranch || !chart.yearStem) return
  const destinyIndex = earthlyBranches.indexOf(chart.destinyPalaceBranch as never)
  const yearStemIndex = heavenlyStems.indexOf(chart.yearStem as never)
  const isForward = (yearStemIndex % 2 === 0 && chart.gender === '男') || (yearStemIndex % 2 !== 0 && chart.gender === '女')
  for (let index = 0; index < 12; index += 1) {
    const branch = branchAt(isForward ? destinyIndex + index : destinyIndex - index)
    const start = chart.bureau.number + index * 10
    chart.palaceDaXian[branch] = [start, start + 9]
  }
}

function setXiaoXian(chart: ZiweiChartData) {
  if (!chart.yearBranch) return
  const yearBranchIndex = earthlyBranches.indexOf(chart.yearBranch as never)
  const start = [2, 6, 10].includes(yearBranchIndex) ? 2 : [8, 0, 4].includes(yearBranchIndex) ? 8 : [5, 9, 1].includes(yearBranchIndex) ? 5 : 11
  for (let index = 0; index < 120; index += 1) {
    const branch = branchAt(chart.gender === '男' ? start + index : start - index)
    chart.palaceXiaoXian[branch] ??= index + 1
  }
}

export function calculateChart(input: {
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
}) {
  const chart = createChartData(input)
  setDestinyPalace(chart)
  setFiveElementsBureau(chart)
  set14MajorStars(chart)
  setAllStars(chart)
  setMinorStars(chart)
  set12Gods(chart)
  setSiHua(chart)
  setDaXian(chart)
  setXiaoXian(chart)
  return chart
}

export function calculateChartFromSolar(input: {
  gender: Gender
  year: number
  month: number
  day: number
  hour: number
  minute: number
  longitude?: number
}) {
  const offsetMinutes = typeof input.longitude === 'number' ? (input.longitude - 120) * 4 : 0
  const birth = new Date(input.year, input.month - 1, input.day, input.hour, input.minute)
  const trueSolar = new Date(birth.getTime() + offsetMinutes * 60 * 1000)
  const solar = Solar.fromYmd(trueSolar.getFullYear(), trueSolar.getMonth() + 1, trueSolar.getDate())
  const lunar = solar.getLunar()
  return calculateChart({
    gender: input.gender,
    solarYear: trueSolar.getFullYear(),
    solarMonth: trueSolar.getMonth() + 1,
    solarDay: trueSolar.getDate(),
    lunarYear: lunar.getYear(),
    lunarMonth: Math.abs(lunar.getMonth()),
    lunarDay: lunar.getDay(),
    timeBranch: getEarthlyBranchByHour(trueSolar.getHours()),
    trueSolarTime: `${trueSolar.getFullYear()}/${String(trueSolar.getMonth() + 1).padStart(2, '0')}/${String(trueSolar.getDate()).padStart(2, '0')} ${String(trueSolar.getHours()).padStart(2, '0')}:${String(trueSolar.getMinutes()).padStart(2, '0')}`,
    trueSolarOffset: `${offsetMinutes > 0 ? '+' : ''}${offsetMinutes.toFixed(1)} 分鐘`,
  })
}

export function calculateFlowData(input: {
  chart: ZiweiChartData
  flowType: '流年' | '流月' | '流日'
  year: number
  month: number
  day: number
}) {
  const { chart, flowType, year, month, day } = input
  const lunar = Solar.fromYmdHms(year, month, day, 12, 0, 0).getLunar()
  let stem = lunar.getYearGan()
  let branch = lunar.getYearZhi()
  let typeLabel = '流'
  if (flowType === '流月') { stem = lunar.getMonthGan(); branch = lunar.getMonthZhi(); typeLabel = '月' }
  if (flowType === '流日') { stem = lunar.getDayGan(); branch = lunar.getDayZhi(); typeLabel = '日' }

  let destinyIndex = earthlyBranches.indexOf(branch as never)
  if (flowType !== '流年') {
    const yearBranchIndex = earthlyBranches.indexOf(lunar.getYearZhi() as never)
    const timeIndex = Math.max(earthlyBranches.indexOf(chart.timeBranch as never), 0)
    const douJunIndex = mod(yearBranchIndex - (chart.lunarMonth - 1) + timeIndex)
    const lunarMonth = Math.abs(lunar.getMonth())
    const monthlyDestinyIndex = mod(douJunIndex + lunarMonth - 1)
    destinyIndex = flowType === '流日' ? mod(monthlyDestinyIndex + lunar.getDay() - 1) : monthlyDestinyIndex
  }

  const stars = Object.fromEntries(earthlyBranches.map(item => [item, [] as string[]])) as Record<string, string[]>
  const add = (index: number, name: string) => stars[branchAt(index)]!.push(name)
  const branchIndex = earthlyBranches.indexOf(branch as never)
  add(10 - branchIndex, `${typeLabel}昌`)
  add(4 + branchIndex, `${typeLabel}曲`)
  const kuiYue: Record<string, [number, number]> = { 甲: [1, 7], 戊: [1, 7], 庚: [1, 7], 乙: [0, 8], 己: [0, 8], 丙: [11, 9], 丁: [11, 9], 辛: [6, 2], 壬: [3, 5], 癸: [3, 5] }
  const pair = kuiYue[stem]
  if (pair) { add(pair[0], `${typeLabel}魁`); add(pair[1], `${typeLabel}鉞`) }
  const luMap: Record<string, number> = { 甲: 2, 乙: 3, 丙: 5, 丁: 6, 戊: 5, 己: 6, 庚: 8, 辛: 9, 壬: 11, 癸: 0 }
  const luIndex = luMap[stem] ?? 2
  add(luIndex, `${typeLabel}祿`)
  const horseMap: Record<string, number> = { 申: 2, 子: 2, 辰: 2, 寅: 8, 午: 8, 戌: 8, 亥: 5, 卯: 5, 未: 5, 巳: 11, 酉: 11, 丑: 11 }
  add(horseMap[branch] ?? 2, `${typeLabel}馬`)
  add(luIndex + 1, `${typeLabel}羊`)
  add(luIndex - 1, `${typeLabel}陀`)
  const timeIndex = Math.max(earthlyBranches.indexOf(chart.timeBranch as never), 0)
  let fireStart = 9
  let bellStart = 10
  if (['寅', '午', '戌'].includes(branch)) { fireStart = 1; bellStart = 3 }
  else if (['申', '子', '辰'].includes(branch)) { fireStart = 2; bellStart = 10 }
  else if (['巳', '酉', '丑'].includes(branch)) { fireStart = 3; bellStart = 10 }
  add(fireStart + timeIndex, `${typeLabel}火`)
  add(bellStart + timeIndex, `${typeLabel}鈴`)

  const transformations: Record<string, string> = {}
  const transformationStars = siHuaTable[stem]
  if (transformationStars) ['化祿', '化權', '化科', '化忌'].forEach((label, index) => { transformations[transformationStars[index]!] = `${typeLabel}${label}` })
  return { stem, branch, destinyBranch: branchAt(destinyIndex), stars, siHua: transformations }
}

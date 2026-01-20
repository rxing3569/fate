<script setup>
import { computed, ref, watch } from 'vue'
import { astro } from 'iztro'

const props = defineProps({
  inputData: {
    type: Object,
    required: true
  }
})

// === Core Astrolabe ===
const astrolabe = computed(() => {
  if (!props.inputData) return null
  try {
      return astro.bySolar(
        props.inputData.date, 
        Number(props.inputData.timeIndex), 
        props.inputData.gender, 
        true, 
        'zh-TW'
      )
  } catch (e) {
      console.error(e)
      return null
  }
})

// === Interaction State ===
const activeHoroscope = ref(null) 
const activeLimit = ref(null) 
const hoveredIndex = ref(null)

// Date Selection State
const selectedDate = ref({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    day: new Date().getDate()
})

watch(() => props.inputData, () => {
    activeHoroscope.value = null
    activeLimit.value = null
    hoveredIndex.value = null
    // Reset date picker to today
    const now = new Date()
    selectedDate.value = {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate()
    }
})

// === Helpers ===
function selectDecadal(palaceIndex, range) {
    if (!astrolabe.value) return
    const startAge = range[0]
    const birthYear = new Date(astrolabe.value.solarDate).getFullYear()
    const targetYear = birthYear + (startAge - 1)
    const dateStr = `${targetYear}-06-15`

    try {
        const h = astrolabe.value.horoscope(dateStr)
        activeHoroscope.value = h
        activeLimit.value = { type: 'decadal', index: palaceIndex, range: range.join('-'), label: `大限 ${range.join('-')}` }
    } catch (e) {
        console.error(e)
    }
}

function selectAge(age) {
    if (!astrolabe.value) return
    const birthYear = new Date(astrolabe.value.solarDate).getFullYear()
    const targetYear = birthYear + (age - 1)
    const dateStr = `${targetYear}-06-15`

    try {
        const h = astrolabe.value.horoscope(dateStr)
        activeHoroscope.value = h
        activeLimit.value = { type: 'yearly', age: age, label: `流年 ${age}歲 (${targetYear})` }
        
        // Sync picker
        selectedDate.value.year = targetYear
    } catch (e) {
        console.error(e)
    }
}

function updateByDate() {
    if (!astrolabe.value) return
    const { year, month, day } = selectedDate.value
    // Format YYYY-M-D will work with most parsers, but padding is safer
    const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    
    try {
        const h = astrolabe.value.horoscope(dateStr)
        activeHoroscope.value = h
        activeLimit.value = { 
            type: 'date', 
            label: `流運 ${dateStr}`,
            date: dateStr
        }
    } catch (e) {
        console.error(e)
    }
}

function resetView() {
    activeHoroscope.value = null
    activeLimit.value = null
}

function isSanFang(index) {
    if (hoveredIndex.value === null) return false
    const target = hoveredIndex.value
    const related = [
        target,
        (target + 6) % 12,
        (target + 4) % 12,
        (target + 8) % 12
    ]
    return related.includes(index)
}

const MUTAGEN_LABELS = ['祿', '權', '科', '忌']

function getStarMutagens(star) {
    const badges = []
    
    // 1. Natal
    if (star.mutagen) {
        badges.push({ label: star.mutagen, class: 'mutagen-natal' })
    }

    if (!activeHoroscope.value) return badges

    // 2. Decadal
    if (activeHoroscope.value.decadal && activeHoroscope.value.decadal.mutagen) {
        const index = activeHoroscope.value.decadal.mutagen.indexOf(star.name)
        if (index !== -1) {
            badges.push({ label: `大${MUTAGEN_LABELS[index]}`, class: 'mutagen-decadal' })
        }
    }

    // 3. Yearly
    if (activeHoroscope.value.yearly && activeHoroscope.value.yearly.mutagen) {
        const index = activeHoroscope.value.yearly.mutagen.indexOf(star.name)
         if (index !== -1) {
            badges.push({ label: `流${MUTAGEN_LABELS[index]}`, class: 'mutagen-yearly' })
        }
    }

    // 4. Monthly
    if (activeHoroscope.value.monthly && activeHoroscope.value.monthly.mutagen) {
        const index = activeHoroscope.value.monthly.mutagen.indexOf(star.name)
        if (index !== -1) {
            badges.push({ label: `月${MUTAGEN_LABELS[index]}`, class: 'mutagen-monthly' })
        }
    }

    // 5. Daily
    if (activeHoroscope.value.daily && activeHoroscope.value.daily.mutagen) {
        const index = activeHoroscope.value.daily.mutagen.indexOf(star.name)
        if (index !== -1) {
            badges.push({ label: `日${MUTAGEN_LABELS[index]}`, class: 'mutagen-daily' })
        }
    }
    
    return badges
}

const LUCKY_STARS = ['左輔', '右弼', '天魁', '天鉞', '文昌', '文曲', '祿存', '天馬', '流昌', '流鉞', '流魁', '流鸞', '流喜']
const SHA_STARS = ['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫', '流羊', '流陀', '病符', '天煞', '喪門', '白虎', '官符', '吊客']
const PEACH_STARS = ['紅鸞', '天喜', '咸池', '天姚']

function getStarClass(name) {
    if (LUCKY_STARS.includes(name)) return 'type-lucky'
    if (SHA_STARS.includes(name)) return 'type-sha'
    if (PEACH_STARS.includes(name)) return 'type-peach'
    return 'type-misc'
}

function getIztroIndex(standardIndex) {
    return (standardIndex - 2 + 12) % 12
}

function getManualYearlyStars(horoscope, palaceIdx) {
    if (!horoscope) return []
    if (!activeLimit.value) return [] 
    
    const yearlyPalaceIdx = horoscope.yearly.index
    const yearBranch = (yearlyPalaceIdx + 2) % 12
    
    const manualStars = []
    
    // 1. Bing Fu
    const bingFuStd = (yearBranch + 11) % 12
    const bingFuIztro = getIztroIndex(bingFuStd)
    if (bingFuIztro === palaceIdx) manuallyAdd('病符')
    
    // 2. Tian Sha
    let tianShaStd = -1
    if ([2, 6, 10].includes(yearBranch)) tianShaStd = 0
    if ([8, 0, 4].includes(yearBranch)) tianShaStd = 6
    if ([11, 3, 7].includes(yearBranch)) tianShaStd = 9
    if ([5, 9, 1].includes(yearBranch)) tianShaStd = 3
    
    if (tianShaStd !== -1) {
        if (getIztroIndex(tianShaStd) === palaceIdx) manuallyAdd('天煞')
    }

    function manuallyAdd(name) {
        manualStars.push({ name, brightness: '' })
    }
    
    return manualStars
}

// === Relative Palace Names Logic ===
const PALACE_ORDER = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '交友', '官祿', '田宅', '福德', '父母']

function getRelativePalaceName(cIdx, lifeIdx, prefix) {
    const diff = (lifeIdx - cIdx + 12) % 12
    const name = PALACE_ORDER[diff] 
    return name ? `${prefix}${name.replace('宮', '')}` : ''
}


const displayPalaces = computed(() => {
    if (!astrolabe.value) return []
    
    return astrolabe.value.palaces.map((p, idx) => {
        let dynamicStars = []
        let manualStars = []
        
        let decadalLabel = ''
        let yearlyLabel = ''

        if (activeHoroscope.value) {
             if (activeHoroscope.value.decadal) {
                 decadalLabel = getRelativePalaceName(idx, activeHoroscope.value.decadal.index, '大')
             }

            if (activeLimit.value) {
                 if (activeHoroscope.value.yearly && Array.isArray(activeHoroscope.value.yearly.stars)) {
                    if (activeHoroscope.value.yearly.stars[idx]) {
                        dynamicStars = activeHoroscope.value.yearly.stars[idx]
                    }
                }
                manualStars = getManualYearlyStars(activeHoroscope.value, idx)
                
                if (activeHoroscope.value.yearly) {
                    yearlyLabel = getRelativePalaceName(idx, activeHoroscope.value.yearly.index, '流')
                }
            }
        }
        
        const item = {
            ...p,
            isBaseLife: p.isLifePalace || p.name === '命宮',
            isBaseBody: p.isBodyPalace || p.name === '身宮', // Although name usually isn't '身宮' for Body
            decadalRange: p.decadal.range,
            agesFiltered: p.ages.filter(a => a <= 90),
            
            decadalLabel,
            yearlyLabel,

            allMinorStars: [
                ...p.minorStars,
                ...p.adjectiveStars,
                ...p.boshi12,
                ...p.jiangqian12,
                ...p.suiqian12,
                ...dynamicStars, 
                ...manualStars 
            ].sort((a, b) => {
                 const getScore = (name) => {
                     if (SHA_STARS.includes(name)) return 4
                     if (LUCKY_STARS.includes(name)) return 3
                     if (PEACH_STARS.includes(name)) return 2
                     return 1
                 }
                 return getScore(b.name) - getScore(a.name)
            })
        }

        if (activeHoroscope.value) {
            if (activeLimit.value?.type === 'decadal') {
                item.isDecadalLife = (activeHoroscope.value.decadal.index === idx)
            } else if (activeLimit.value?.type === 'yearly') {
                item.isDecadalLife = (activeHoroscope.value.decadal.index === idx) 
                item.isYearlyLife = (activeHoroscope.value.yearly.index === idx)
            }
        }
        
        return item
    })
})

const gridLayout = [
  3, 4, 5, 6,
  2, -1, -1, 7,
  1, -2, -2, 8,
  0, 11, 10, 9
]

const centerInfo = computed(() => {
    if(!astrolabe.value) return {}
    const base = {
        name: props.inputData.name,
        gender: props.inputData.gender,
        solarDate: astrolabe.value.solarDate,
        lunarDate: astrolabe.value.lunarDate,
        chineseDate: astrolabe.value.chineseDate,
        fiveElementClass: astrolabe.value.fiveElementsClass,
    }
    if (activeLimit.value) {
        return { ...base, limitLabel: activeLimit.value.label }
    }
    return base
})

// === Pattern Calculation ===
const patterns = computed(() => {
    if (!astrolabe.value) return []
    const detected = []
    
    // 1. Identify Life Palace Index
    let lifePalace = astrolabe.value.palaces.find(p => p.isLifePalace)
    if (!lifePalace) {
        lifePalace = astrolabe.value.palaces.find(p => p.name === '命宮')
    }
    if (!lifePalace) return []
    const lifeIdx = astrolabe.value.palaces.indexOf(lifePalace)

    // 2. Helpers
    const getStars = (idx) => {
        const p = astrolabe.value.palaces[idx]
        return [...p.majorStars, ...p.minorStars].map(s => s.name)
    }
    const getAllStars = (indices) => {
        const all = new Set()
        indices.forEach(idx => getStars(idx).forEach(s => all.add(s)))
        return all
    }
    const hasStar = (list, name) => list.includes(name)
    const hasAll = (set, names) => names.every(n => set.has(n))
    const getBranch = (idx) => astrolabe.value.palaces[idx].earthlyBranch

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
         const p = astrolabe.value.palaces[idx]
         const stars = [...p.majorStars, ...p.minorStars]
         stars.forEach(s => { if(s.mutagen) mutagens.add(s.mutagen) })
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
        return astrolabe.value.palaces.findIndex(p => 
            [...p.majorStars,...p.minorStars].some(s => s.name === name)
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
        const lifeMajor = astrolabe.value.palaces[lifeIdx].majorStars
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
})

const birthYear = computed(() => {
    return astrolabe.value ? new Date(astrolabe.value.solarDate).getFullYear() : 0
})

const currentDecadeAges = computed(() => {
    if (activeLimit.value?.type === 'decadal') {
        const start = Number(activeLimit.value.range.split('-')[0])
        const end = Number(activeLimit.value.range.split('-')[1])
        const ages = []
        for (let i = start; i <= end; i++) ages.push(i)
        return ages
    }
    return []
})
</script>

<template>
  <div class="chart-container">
    <div class="chart-controls">
        <div class="control-row">
            <button @click="resetView" class="btn-xs" :class="{active: !activeLimit}">本命盤</button>
            <div class="date-picker">
                <input type="number" v-model.number="selectedDate.year" class="input-xs" placeholder="年">
                <span class="sep">/</span>
                <input type="number" v-model.number="selectedDate.month" class="input-xs" placeholder="月" min="1" max="12">
                <span class="sep">/</span>
                <input type="number" v-model.number="selectedDate.day" class="input-xs" placeholder="日" min="1" max="31">
                <button @click="updateByDate" class="btn-xs primary">查看流運</button>
            </div>
        </div>

        <div v-if="activeLimit && activeLimit.type === 'decadal'" class="age-pills">
            <span class="pill-label">選擇流年:</span>
            <button v-for="age in currentDecadeAges" :key="age" @click="selectAge(age)" class="pill">
                {{ age }} <span class="year-small">({{ birthYear + age - 1 }})</span>
            </button>
        </div>
        <div v-if="activeLimit && activeLimit.type === 'yearly'" class="age-pills">
             <button @click="selectDecadal(activeHoroscope.decadal.index, activeHoroscope.decadal.range)" class="pill">
                回到大限
             </button>
        </div>
    </div>

    <!-- Main Grid -->
    <div class="chart-grid" v-if="astrolabe">
        <template v-for="(paramIndex, idx) in gridLayout" :key="idx">
            <!-- Center -->
            <div v-if="paramIndex < 0" class="center-placeholder">
                 <div v-if="idx === 5" class="center-content">
                    <h3>{{ centerInfo.name }}</h3>
                    <p class="limit-label" v-if="centerInfo.limitLabel">{{ centerInfo.limitLabel }}</p>
                    <div class="info-row"><span>西:</span> {{ centerInfo.solarDate }}</div>
                    <div class="info-row"><span>農:</span> {{ centerInfo.lunarDate }}</div>
                    <div class="info-row"><span>干支:</span> {{ centerInfo.chineseDate }}</div>
                    <div class="info-row"><span>五行:</span> {{ centerInfo.fiveElementClass }}</div>
                </div>
            </div>

            <!-- Palace -->
            <div v-else class="palace-cell glass" 
                @mouseenter="hoveredIndex = paramIndex"
                @mouseleave="hoveredIndex = null"
                :class="{ 
                    'life-palace': displayPalaces[paramIndex].isBaseLife, 
                    'body-palace': displayPalaces[paramIndex].isBaseBody,
                    'decadal-life': displayPalaces[paramIndex].isDecadalLife,
                    'yearly-life': displayPalaces[paramIndex].isYearlyLife,
                    'monthly-life': displayPalaces[paramIndex].isMonthlyLife,
                    'daily-life': displayPalaces[paramIndex].isDailyLife,
                    'highlight-group': isSanFang(paramIndex)
                }">
                 
                 <div class="palace-header">
                    <div class="header-left">
                         <span class="palace-name">{{ displayPalaces[paramIndex].name }}</span>
                         
                         <!-- Labels Inline -->
                         <div class="badges-inline">
                            <span v-if="displayPalaces[paramIndex].isBaseBody" class="inline-badge body">身宮</span>
                            <span v-if="displayPalaces[paramIndex].decadalLabel" class="inline-badge decadal">{{ displayPalaces[paramIndex].decadalLabel }}</span>
                            <span v-if="displayPalaces[paramIndex].yearlyLabel" class="inline-badge yearly">{{ displayPalaces[paramIndex].yearlyLabel }}</span>
                            <span v-if="displayPalaces[paramIndex].monthlyLabel" class="inline-badge monthly">{{ displayPalaces[paramIndex].monthlyLabel }}</span>
                            <span v-if="displayPalaces[paramIndex].dailyLabel" class="inline-badge daily">{{ displayPalaces[paramIndex].dailyLabel }}</span>
                         </div>
                    </div>
                    
                    <div class="header-right">
                        <span class="earthly-branch">{{ displayPalaces[paramIndex].heavenlyStem }}{{ displayPalaces[paramIndex].earthlyBranch }}</span>
                    </div>
                 </div>
                 
                 <div class="stars-container">
                    <!-- Major Stars: Horizontal Wrap -->
                    <div class="stars-row-major">
                        <div v-for="star in displayPalaces[paramIndex].majorStars" :key="star.name" class="star major" :class="{'brightness-top': star.brightness === 'Top'}">
                            {{ star.name }} <span class="brightness" v-if="star.brightness && star.brightness !== '-'">{{ star.brightness }}</span>
                            <span v-for="(badge, bIdx) in getStarMutagens(star)" :key="bIdx" :class="['mutagen-badge', badge.class]">
                                {{ badge.label }}
                            </span>
                        </div>
                    </div>

                    <!-- All Other Stars (Sorted) -->
                    <div class="stars-row-minor">
                        <span v-for="star in displayPalaces[paramIndex].allMinorStars" :key="star.name" class="star" :class="getStarClass(star.name)">
                             {{ star.name }}
                             <span v-for="(badge, bIdx) in getStarMutagens(star)" :key="bIdx" :class="['mutagen-badge', badge.class]">
                                {{ badge.label }}
                            </span>
                         </span>
                         <!-- Changsheng Stage (Flows with stars) -->
                         <span class="star changsheng">{{ displayPalaces[paramIndex].changsheng12 }}</span>
                    </div>
                 </div>
                 
                 <div class="palace-footer">
                      <button class="limit-btn" @click.stop="selectDecadal(paramIndex, displayPalaces[paramIndex].decadalRange)">
                          大限 {{ displayPalaces[paramIndex].decadalRange.join('-') }}
                      </button>
                      <span class="activity">{{ displayPalaces[paramIndex].agesFiltered.join(' ') }}</span>
                 </div>
                 
                 <div v-if="displayPalaces[paramIndex].isDecadalLife" class="overlay-label daxian">大限命</div>
                 <div v-if="displayPalaces[paramIndex].isYearlyLife" class="overlay-label xiaoxian">流年命</div>
                 <div v-if="displayPalaces[paramIndex].isMonthlyLife" class="overlay-label liuyue">流月命</div>
                 <div v-if="displayPalaces[paramIndex].isDailyLife" class="overlay-label liuri">流日命</div>
            </div>
        </template>
    </div>


  </div>
</template>

<style scoped>
/* Theme Variables for Chart */
.chart-container { 
    width: 100%; max-width: 1000px; margin: 0 auto; padding: 1rem; 
}

/* Controls */
.chart-controls { margin-bottom: 2rem; display: flex; flex-direction: column; gap: 1rem; align-items: center; }
.control-row { display: flex; gap: 1rem; align-items: center; background: #FFFAF0; padding: 1rem; border-radius: 50px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }

.date-picker { display: flex; align-items: center; gap: 0.5rem; }
.input-xs { 
    width: 60px; padding: 0.4rem; border: 1px solid #d7ccc8; border-radius: 4px; 
    text-align: center; color: #5d4037;
}
.sep { color: #aaa; }

.btn-xs { 
    background: #8d6e63; color: white; border: none; padding: 0.5rem 1rem; 
    border-radius: 20px; font-size: 0.9rem; cursor: pointer; transition: all 0.3s;
}
.btn-xs:hover, .btn-xs.active { background: #5d4037; transform: translateY(-1px); }
.btn-xs.primary { background: #81C7D4; }
.btn-xs.primary:hover { background: #4dd0e1; }

.age-pills { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; align-items: center; margin-top: 0.5rem; }
.pill-label { margin-right: 0.5rem; font-size: 0.9rem; color: #5d4037; font-weight: bold; }
.pill { 
    background: #fff; border: 1px solid #d7ccc8; color: #5d4037; 
    padding: 0.4rem 0.8rem; border-radius: 20px; font-size: 0.9rem; cursor: pointer; 
    transition: all 0.2s;
}
.pill:hover { border-color: #81C7D4; color: #81C7D4; background: #f0fdfa; }

/* Grid Layout */
.chart-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(4, minmax(200px, auto));
  gap: 10px;
  background: #f4f1ea; /* Rice paper gap color */
  padding: 10px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(93, 64, 55, 0.1);
}

.palace-cell {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 0.8rem;
  display: flex;
  flex-direction: column;
  position: relative;
  font-size: 1rem;
  min-height: 200px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 5px rgba(0,0,0,0.02);
}

.palace-cell:hover { box-shadow: 0 5px 15px rgba(0,0,0,0.08); transform: translateY(-2px); z-index: 10; }

/* Center Content */
.center-placeholder { visibility: hidden; position: relative; }
.center-content {
    visibility: visible; position: absolute; top: 0; left: 0;
    width: calc(200% + 10px); height: calc(200% + 10px);
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    z-index: 5; pointer-events: none;
    /* Mask added */
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(5px);
    border-radius: 12px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.05);
}
.center-content h3 { 
    font-size: 2.5rem; color: #5d4037; margin-bottom: 0.5rem; 
    letter-spacing: 4px; 
    text-shadow: 0 2px 4px rgba(255,255,255,0.8);
}
.limit-label { 
    background: #81C7D4; color: white; padding: 4px 12px; 
    border-radius: 20px; margin-bottom: 1rem; font-weight: bold; letter-spacing: 1px; 
}
.info-row { font-size: 1.1rem; color: #5d4037; margin-bottom: 0.4rem; }
.info-row span { color: #8d6e63; margin-right: 0.5rem; }

/* Header */
.palace-header { 
    display: flex; justify-content: space-between; align-items: flex-start; 
    border-bottom: 2px solid #f4f1ea; margin-bottom: 8px; padding-bottom: 6px;
}
.header-left { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
.palace-name { 
    font-weight: bold; font-size: 1.4rem; color: #5d4037; 
}
.earthly-branch { 
    font-size: 1.2rem; color: #a1887f; font-weight: bold;
}

/* Stars */
.stars-container { display: flex; flex-direction: column; gap: 6px; flex: 1; }
.stars-row-major { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 4px; }
.stars-row-minor { display: flex; flex-wrap: wrap; gap: 4px; font-size: 0.85rem; }

.star { line-height: 1.4; }
.star.major { font-size: 1.1rem; font-weight: bold; color: #c0392b; /* Deep Red */ }
.star.major.brightness-top { color: #e74c3c; text-shadow: 0 0 1px rgba(231, 76, 60, 0.5); }

.star.type-lucky { color: #27ae60; font-weight: 600; } /* Green */
.star.type-sha { color: #8e44ad; font-weight: 600; } /* Purple */
.star.type-peach { color: #d81b60; } /* Deep Pink */
.star.type-misc { color: #7f8c8d; } /* Grey */
.star.changsheng { color: #95a5a6; font-size: 0.85rem; }

/* Mutagen Badges */
.mutagen-badge { font-size: 0.7rem; padding: 1px 4px; border-radius: 4px; color: white; margin-left: 2px; vertical-align: text-bottom; }
.mutagen-natal { background: #c0392b; } 
.mutagen-decadal { background: #2980b9; } 
.mutagen-yearly { background: #f39c12; } 

/* Footer (Limit Btn) */
.palace-footer { margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; }
.limit-btn { 
    background: #efebe9; color: #5d4037; border: none; font-size: 0.85rem; 
    padding: 4px 8px; border-radius: 4px; cursor: pointer; font-weight: bold;
}
.limit-btn:hover { background: #81C7D4; color: white; }
.activity { font-size: 0.8rem; color: #bbb; }

/* Highlights */
.life-palace { border: 2px solid #d81b60 !important; background: #fff0f5; }
.decadal-life { border: 2px solid #2980b9 !important; background: #f0f8ff; }
.yearly-life { border: 2px dashed #f39c12 !important; }
.highlight-group { background: #f0fdfa; border-color: #81C7D4; }

/* Overlay Labels */
.overlay-label { position: absolute; top: -1px; right: -1px; font-size: 0.75rem; padding: 2px 6px; border-bottom-left-radius: 6px; color: white; font-weight: bold; z-index: 2; }
.daxian { background: #2980b9; }
.xiaoxian { background: #f39c12; top: 20px; right: -1px; }

/* Patterns */
.patterns-container {
    background: #fff; border: 1px solid #ebd5b3; padding: 1.5rem; border-radius: 12px; margin: 2rem 0;
    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
}
.patterns-container h3 { 
    color: #5d4037; font-size: 1.3rem; margin-bottom: 1rem; 
    font-family: 'Ma Shan Zheng', cursive; border-bottom: 2px solid #f4f1ea; padding-bottom: 0.5rem; 
}
.pattern-tag { 
    background: #fff8e1; color: #f57f17; border: 1px solid #ffe0b2; 
    padding: 0.4rem 1rem; border-radius: 20px; font-weight: bold; 
}

/* Badges Inline */
.badges-inline { display: flex; gap: 3px; margin-top: 2px; }
.inline-badge { font-size: 0.7rem; padding: 1px 4px; border-radius: 4px; font-weight: bold; color: white; }
.inline-badge.body { background: #9e9e9e; }
.inline-badge.decadal { background: #64b5f6; }
.inline-badge.yearly { background: #fbc02d; }

@media (max-width: 900px) {
    .chart-grid { grid-template-columns: 1fr; grid-template-rows: auto; display: flex; flex-direction: column; }
    .center-placeholder { display: none; }
    .center-content { position: relative; width: 100%; height: auto; margin-bottom: 2rem; }
    .palace-cell { min-height: auto; }
}
</style>

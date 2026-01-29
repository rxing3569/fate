<script setup>
import { computed, ref, watch } from 'vue'
import { astro } from 'iztro'
import { LUCKY_STARS, SHA_STARS, PEACH_STARS, getStarClass, getStarPriority } from '../utils/ziwei-stars'
import { MUTAGEN_LABELS, getStarMutagens } from '../utils/ziwei-mutagens'
import { calculatePatterns } from '../utils/ziwei-patterns'
import { getManualYearlyStars, getRelativePalaceName } from '../utils/ziwei-limits'
import { getStarInterpretation } from '../utils/ziwei-interpretations'
import NumberInput from './NumberInput.vue'

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
const selectedPalaceIndex = ref(null)

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
    selectedPalaceIndex.value = null // Reset selection
    // Reset date picker to today
    const now = new Date()
    selectedDate.value = {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate()
    }
})

// ... (Helpers - selectDecadal, selectAge, updateByDate, resetView, isSanFang unchanged) ...
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


const displayPalaces = computed(() => {
    if (!astrolabe.value) return []
    
    return astrolabe.value.palaces.map((p, idx) => {
        let dynamicStars = []
        let manualStars = []
        
        let decadalLabel = ''
        let yearlyLabel = ''
        let labels = [] // Local array to collect multiple limit labels

        const isYearlyFlow = activeLimit.value && ['yearly', 'date', 'age'].includes(activeLimit.value.type)

        if (activeHoroscope.value) {
             if (activeHoroscope.value.decadal) {
                 decadalLabel = getRelativePalaceName(idx, activeHoroscope.value.decadal.index, '大')
             }

                if (isYearlyFlow) {
                 if (activeHoroscope.value.yearly && Array.isArray(activeHoroscope.value.yearly.stars)) {
                    if (activeHoroscope.value.yearly.stars[idx]) {
                        dynamicStars = activeHoroscope.value.yearly.stars[idx]
                    }
                }
                manualStars = getManualYearlyStars(activeHoroscope.value, idx, activeLimit.value)
                
                if (activeHoroscope.value.yearly) {
                    yearlyLabel = getRelativePalaceName(idx, activeHoroscope.value.yearly.index, '流')
                }
            }
        }
        
        let overlayLabel = ''
        let overlayClass = ''

        if (activeHoroscope.value) {
            // Decadal Focus
            if (activeLimit.value?.type === 'decadal') {
                const decadalLifeIdx = activeHoroscope.value.decadal.index
                const relName = getRelativePalaceName(idx, decadalLifeIdx, '大限')
                if (relName) {
                    overlayLabel = relName // Prioritize Decadal in Decadal View
                    overlayClass = 'daxian'
                }
            } 
            // Yearly Focus (Date or Age)
            else if (isYearlyFlow) {
                // Use outer `labels` array directly

                // 1. Small Limit (Age) - 小限
                if (activeHoroscope.value.age) {
                    const smallLimitLifeIdx = activeHoroscope.value.age.index
                    const relName = getRelativePalaceName(idx, smallLimitLifeIdx, '小限')
                    if (relName) {
                        labels.push({ text: relName, class: 'xiaoxian ages' })
                    }
                }

                // 2. Yearly (Liu Nian) - 流年
                if (activeHoroscope.value.yearly) {
                     const yearlyLifeIdx = activeHoroscope.value.yearly.index
                     const relName = getRelativePalaceName(idx, yearlyLifeIdx, '流年')
                     if (relName) {
                         labels.push({ text: relName, class: 'liuyue' })
                     }
                }
            }
        }
        
        const item = {
            ...p,
            isBaseLife: p.isLifePalace || p.name === '命宮',
            isBaseBody: p.isBodyPalace || p.name === '身宮',
            decadalRange: p.decadal.range,
            agesFiltered: p.ages.filter(a => a <= 84),
            
            overlayLabel, // Legacy/Decadal
            overlayClass, // Legacy/Decadal
            limitLabels: labels.length > 0 ? labels : (overlayLabel ? [{text: overlayLabel, class: overlayClass}] : []), 

            // Legacy labels kept for inline badges if needed, but overlay takes precedence
            decadalLabel,
            yearlyLabel,
            
            combinedStars: [
                ...p.majorStars.map(s => ({ ...s, isMajor: true })),
                ...p.minorStars,
                ...p.adjectiveStars,
                // Natal Stars
                { name: p.boshi12, type: 'boshi' },
                { name: p.changsheng12, isChangsheng: true },
                
                // Natal Sui/Jiang (Show if NOT in Yearly flow - i.e. Natal or Decadal)
                ...(!isYearlyFlow ? [
                    { name: p.jiangqian12, type: 'jiangqian' },
                    { name: p.suiqian12, type: 'suiqian' },
                ] : []),
                ...dynamicStars, 
                ...manualStars,
            ].filter((star, index, self) => 
                // Defensive check: Ensure star exists and has a name
                star && star.name && 
                // Deduplicate by name (keep first occurrence) to prevent "accumulation" or ghost stars
                index === self.findIndex((s) => s && s.name === star.name)
            ).sort((a, b) => {
                 if (!a || !b) return 0
                 // Sort priority: Major > Lucky > Sha > Peach > Others
                 const getPrio = (s) => {
                     if (!s || !s.name) return 0
                     if (s.isChangsheng) return 10 
                     return getStarPriority(s.name)
                 }
                 const prioA = getPrio(a)
                 const prioB = getPrio(b)
                 if (prioA !== prioB) return prioB - prioA
                 
                 // Stable sort by name for equal priority
                 return (a.name || '').localeCompare(b.name || '')
            })
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
        mingZhu: astrolabe.value.soul, // Ming Zhu (Life Master)
        shenZhu: astrolabe.value.body, // Shen Zhu (Body Master)
    }
    if (activeLimit.value) {
        return { ...base, limitLabel: activeLimit.value.label }
    }
    return base
})

// === Pattern Calculation ===
const patterns = computed(() => {
    return calculatePatterns(astrolabe.value)
})

// ...



// === Interpretations ===
const selectedPalaceInterpretations = computed(() => {
    if (selectedPalaceIndex.value === null || !astrolabe.value) return []
    const palace = astrolabe.value.palaces[selectedPalaceIndex.value]
    if (!palace) return []

    // Major Stars (Handle Empty Palace)
    let majorStars = palace.majorStars || []
    let isBorrowed = false
    let borrowSource = ''

    if (majorStars.length === 0) {
        // Empty Palace: Borrow from Opposite
        const oppositeIndex = (selectedPalaceIndex.value + 6) % 12
        const oppositePalace = astrolabe.value.palaces[oppositeIndex]
        if (oppositePalace && oppositePalace.majorStars.length > 0) {
            majorStars = oppositePalace.majorStars
            isBorrowed = true
            borrowSource = oppositePalace.name // e.g. 遷移
        }
    }

    const majorInterps = majorStars.map(star => ({
        starName: star.name,
        isMajor: true,
        isBorrowed,
        borrowSource,
        content: getStarInterpretation(star.name, palace.name) // Use ORIGINAL palace name context, but interpretations might need to reflect borrowing?
        // Standard practice: Interpret star AS IF it is in the current palace (mapping), or note it.
        // Usually "Borrowed Sun in Life" -> Read as Sun in Life (weakened).
        // For simplicity, we fetch standard interpretation but mark as borrowed.
    }))

    // Minor Stars (Local only)
    // Filter out stars that don't have interpretations or we don't want to spam?
    // User asked for "Others too".
    // Let's include everything in `minorStars` and `adjectiveStars` if present in `combinedStars` logic? 
    // `palace.minorStars` + `palace.adjectiveStars` + 12 gods?
    // Let's stick to key minor ones usually found in minorStars array.
    // Minor Stars (Local only) + 12 Gods
    const otherStars = [
        ...palace.minorStars, 
        ...palace.adjectiveStars,
        // Add 12 Gods
        ...(palace.changsheng12 ? [{ name: palace.changsheng12 }] : []),
        ...(palace.boshi12 ? [{ name: palace.boshi12 }] : []),
        ...(palace.jiangqian12 ? [{ name: palace.jiangqian12 }] : []),
        ...(palace.suiqian12 ? [{ name: palace.suiqian12 }] : [])
    ].map(star => ({
        starName: star.name,
        isMajor: false,
        content: getStarInterpretation(star.name, palace.name) // Use ORIGINAL palace name context
    }))

    return {
        major: majorInterps,
        minor: otherStars
    }
})

// Add helper to handle palace click
function handlePalaceClick(index) {
    selectedPalaceIndex.value = index
}

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


    <!-- Main Grid -->
    <div class="chart-grid" v-if="astrolabe">
        <template v-for="(paramIndex, idx) in gridLayout" :key="idx">
            <!-- Center -->
            <div v-if="paramIndex < 0" class="center-placeholder">
                <div v-if="idx === 5" class="center-content">
                    <div class="chart-controls">
                        <div class="control-row">
                            <div class="date-picker">
                                <NumberInput v-model.number="selectedDate.year" :min="1900" :max="2100" />
                                <span class="label-text">年</span>
                                <button @click="updateByDate" class="btn-xs primary">查看流運</button>
                                <button @click="resetView" class="btn-xs" :class="{active: !activeLimit}">查看本命盤</button>
                            </div>
                        </div>
                    </div>
                    <div class="info-row"> {{ centerInfo.name }}</div>
                    <div class="info-row"><span>國曆:</span> {{ centerInfo.solarDate }}</div>
                    <div class="info-row"><span>農曆:</span> {{ centerInfo.lunarDate }}</div>
                    <div class="info-row"><span>干支:</span> {{ centerInfo.chineseDate }}</div>
                    <div class="info-row"><span>五行:</span> {{ centerInfo.fiveElementClass }}</div>
                    <div class="info-row"><span>命主:</span> {{ centerInfo.mingZhu }}</div>
                    <div class="info-row"><span>身主:</span> {{ centerInfo.shenZhu }}</div>
                </div>
            </div>

            <!-- Palace -->
            <div v-else class="palace-cell glass" 
                @mouseenter="hoveredIndex = paramIndex"
                @mouseleave="hoveredIndex = null"
                @click="handlePalaceClick(paramIndex)"
                :class="{ 
                    'life-palace': displayPalaces[paramIndex].isBaseLife, 
                    'body-palace': displayPalaces[paramIndex].isBaseBody,
                    'decadal-life': displayPalaces[paramIndex].isDecadalLife,
                    'yearly-life': displayPalaces[paramIndex].isYearlyLife,
                    'monthly-life': displayPalaces[paramIndex].isMonthlyLife,
                    'daily-life': displayPalaces[paramIndex].isDailyLife,
                    'highlight-group': isSanFang(paramIndex),
                    'selected-palace': selectedPalaceIndex === paramIndex
                }">
                 
                 <div class="palace-header">
                    <div class="header-left">
                         <span class="palace-name">
                             {{ displayPalaces[paramIndex].name }}{{ displayPalaces[paramIndex].isBaseBody ? '-身' : '' }}
                             <span v-for="(lbl, lIdx) in displayPalaces[paramIndex].limitLabels" :key="lIdx" class="limit-suffix" :class="lbl.class">
                                 - {{ lbl.text }}
                             </span>
                         </span>
                         

                    </div>
                    
                    <div class="header-right">
                        <span class="earthly-branch">{{ displayPalaces[paramIndex].heavenlyStem }}{{ displayPalaces[paramIndex].earthlyBranch }}</span>
                    </div>
                 </div>
                 
                 <div class="stars-container">
                    <div class="stars-unified">
                        <span v-for="(star, sIdx) in displayPalaces[paramIndex].combinedStars" 
                              :key="star.name + sIdx" 
                              class="star" 
                              :class="[
                                  star.isMajor ? 'major' : getStarClass(star.name),
                                  star.isChangsheng ? 'changsheng' : '',
                                  {'brightness-top': star.isMajor && star.brightness === 'Top'}
                              ]">
                             {{ star.name }}<span class="brightness" v-if="star.brightness && star.brightness !== '-'">{{ star.brightness }}</span>
                             <span v-for="(badge, bIdx) in getStarMutagens(star)" :key="bIdx" :class="['mutagen-badge', badge.class]">
                                {{ badge.label }}
                            </span>
                        </span>
                    </div>
                 </div>
                 
                 <div class="palace-footer">
                       <div class="limit-row">
                           <span class="limit-label">大限</span>
                           <span class="limit-val pointer" @click.stop="selectDecadal(paramIndex, displayPalaces[paramIndex].decadalRange)">{{ displayPalaces[paramIndex].decadalRange.join('-') }}</span>
                       </div>
                       <div class="limit-row">
                           <span class="limit-label">小限</span>
                           <div class="age-list">
                               <span v-for="age in displayPalaces[paramIndex].agesFiltered" 
                                     :key="age" 
                                     class="age-item"
                                     @click.stop="selectAge(age)">
                                   {{ age }}
                               </span>
                           </div>
                       </div>
                 </div>
                 
             </div>
        </template>
    </div>

    <!-- Interpretations -->
    <div class="interpretations-container" v-if="selectedPalaceIndex !== null && (selectedPalaceInterpretations.major.length > 0 || selectedPalaceInterpretations.minor.length > 0)">
        <h3 class="interp-title">
            {{ displayPalaces[selectedPalaceIndex].name }}星曜解說
        </h3>
        
        <!-- Major Stars Section -->
        <div class="interp-group" v-if="selectedPalaceInterpretations.major.length > 0">
            <h4 class="group-title">【主星】</h4>
            <div class="interp-list major-list">
                <div v-for="(interp, idx) in selectedPalaceInterpretations.major" :key="'major-'+idx" class="interp-item major-item">
                    <h4 class="interp-star-name">
                        {{ interp.starName }}
                        <span v-if="interp.isBorrowed" class="borrow-note">(借對宮{{ interp.borrowSource }})</span>
                    </h4>
                    <div class="interp-content" v-if="interp.content">{{ interp.content }}</div>
                    <div class="interp-content empty" v-else>暫無解說</div>
                </div>
            </div>
        </div>

        <!-- Minor Stars Section -->
        <div class="interp-group" v-if="selectedPalaceInterpretations.minor.length > 0">
            <h4 class="group-title">【輔星與雜曜】</h4>
            <div class="interp-list minor-grid">
                <div v-for="(interp, idx) in selectedPalaceInterpretations.minor" :key="'minor-'+idx" class="interp-item minor-item">
                    <h4 class="interp-star-name">
                        {{ interp.starName }}
                    </h4>
                    <div class="interp-content" v-if="interp.content">{{ interp.content }}</div>
                    <div class="interp-content empty" v-else>暫無解說</div>
                </div>
            </div>
        </div>
    </div>
    <div class="interpretations-container" v-else-if="selectedPalaceIndex !== null">
        <h3 class="interp-title">{{ displayPalaces[selectedPalaceIndex].name }}</h3>
        <p style="color: #666;">此宮位無主要星曜資料。</p>
    </div>


    <!-- Patterns -->
    <div class="patterns-container" v-if="patterns.length > 0">
        <h3>格局分析</h3>
        <div class="patterns-grid">
             <div v-for="(p, idx) in patterns" :key="idx" class="pattern-card" :class="p.type">
                 <div class="pattern-header">
                     <span class="pattern-tag" :class="p.type">{{ p.type === 'lucky' ? '吉' : '凶' }}</span>
                     <span class="pattern-name" :class="p.type">{{ p.name }}</span>
                 </div>
                 <p class="pattern-desc">{{ p.description }}</p>
                 <p class="pattern-desc" v-if="p.note" style="color: #666; font-size: 0.9em; margin-top: 4px;">{{ p.note }}</p>
             </div>
        </div>
    </div>

  </div>
</template>

<style scoped>
/* Theme Variables for Chart */
.chart-container { 
    width: 100%; max-width: 1000px; margin: 0 auto; padding: 1rem; 
}

/* Controls */
.chart-controls { 
    margin-bottom: 0.5rem; display: flex; flex-direction: column; gap: 0.5rem; align-items: center; 
    scale: 0.85; transform-origin: center bottom;
    pointer-events: auto; /* Re-enable clicks blocked by center-content */
}
.control-row { 
    display: flex; gap: 0.5rem; align-items: center; 
    background: #FFFAF0; padding: 0.5rem; border-radius: 50px; 
    box-shadow: 0 4px 15px rgba(93, 64, 55, 0.15); /* Stronger shadow */
    border: 1px solid rgba(255,255,255,0.8);
}

.date-picker { display: flex; align-items: center; gap: 0.5rem; }
.input-xs { 
    width: 60px; padding: 0.4rem; border: 1px solid #d7ccc8; border-radius: 4px; 
    text-align: center; color: #5d4037; font-size: 14px;
}
.label-text { font-size: 14px; color: #5d4037; }
.sep { color: #aaa; }

.btn-xs { 
    background: #8d6e63; color: white; border: none; padding: 0.5rem 1rem; 
    border-radius: 20px; font-size: 14px; cursor: pointer; transition: all 0.3s;
}
.btn-xs:hover, .btn-xs.active { background: #5d4037; transform: translateY(-1px); }
.btn-xs.primary { background: #81C7D4; }
.btn-xs.primary:hover { background: #4dd0e1; }

.age-pills { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; align-items: center; margin-top: 0.5rem; }
.pill-label { margin-right: 0.5rem; font-size: 14px; color: #5d4037; font-weight: bold; }
.pill { 
    background: #fff; border: 1px solid #d7ccc8; color: #5d4037; 
    padding: 0.4rem 0.8rem; border-radius: 20px; font-size: 14px; cursor: pointer; 
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
  font-size: 16px;
  min-height: 200px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 5px rgba(0,0,0,0.02);
  cursor: pointer; /* Clickable */
}

.palace-cell:hover { box-shadow: 0 5px 15px rgba(0,0,0,0.08); z-index: 10; transform: translateY(-2px); }
.palace-cell.selected-palace { border: 2px solid #e65100; box-shadow: 0 0 10px rgba(230, 81, 0, 0.2); }

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
    font-size: 40px; color: #5d4037; margin-bottom: 0.5rem; 
    letter-spacing: 4px; 
    text-shadow: 0 2px 4px rgba(255,255,255,0.8);
}
.limit-label { 
    background: #81C7D4; color: white; padding: 2px 4px; 
    border-radius: 4px; font-weight: bold; letter-spacing: 1px; 
}
.info-row { font-size: 18px; color: #5d4037; margin-bottom: 0.4rem; }
.info-row span { color: #8d6e63; margin-right: 0.5rem; }

/* Header */
.palace-header { 
    display: flex; justify-content: space-between; align-items: flex-start; 
    border-bottom: 2px solid #f4f1ea; margin-bottom: 8px; padding-bottom: 6px;
}
.header-left { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
.palace-name { 
    font-weight: bold; font-size: 14px; color: #5d4037; 
}
.earthly-branch { 
    font-size: 13px; color: #a1887f; font-weight: bold;
}

/* Stars */
.stars-container { display: flex; flex-direction: column; flex: 1; }
.stars-unified { display: flex; flex-wrap: wrap; gap: 4px; align-content: flex-start; }

.star { line-height: 1.4; white-space: nowrap; font-size: 16px; }
.star.major { font-size: 16px; font-weight: bold; color: #c0392b; /* Deep Red */ }
.star.major.brightness-top { color: #e74c3c; text-shadow: 0 0 1px rgba(231, 76, 60, 0.5); }

.star.type-lucky { color: #27ae60; font-weight: 600; } /* Green */
.star.type-sha { color: #8e44ad; font-weight: 600; } /* Purple */
.star.type-peach { color: #d81b60; } /* Deep Pink */
.star.type-misc { color: #5d4037; } /* Grey -> Brown */

/* Mutagen Badges */
.mutagen-badge { font-size: 14px; padding: 0px 2px; border-radius: 4px; color: white; vertical-align: text-bottom; }
.mutagen-natal { background: #c0392b; } 
.mutagen-decadal { background: #2980b9; } 
.mutagen-yearly { background: #f39c12; } 

/* Footer (Limit Btn) */
.palace-footer { margin-top: auto; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; width: 100%; }
.limit-row { display: flex; align-items: center; gap: 4px; font-size: 13px; color: #5d4037; line-height: 1.4; width: 100%; }
.limit-row.pointer { cursor: pointer; transition: color 0.2s; }
.limit-row.pointer:hover { color: #81C7D4; font-weight: bold; }
.limit-label { flex-shrink: 0; }
.limit-val { font-family: monospace; } /* Optional align */
.limit-val.pointer { cursor: pointer; transition: color 0.2s; }
.limit-val.pointer:hover { color: #81C7D4; font-weight: bold; }

.age-list { display: flex; flex-wrap: wrap; gap: 3px; }
.age-item { cursor: pointer; transition: color 0.2s; padding: 0 1px; }
.age-item:hover { color: #81C7D4; font-weight: bold; }

/* Highlights */
.life-palace { border: 2px solid #d81b60 !important; background: #fff0f5; }
.decadal-life { border: 2px solid #2980b9 !important; background: #f0f8ff; }
.yearly-life { border: 2px dashed #f39c12 !important; }
.highlight-group { background: #f0fdfa; border-color: #81C7D4; }

/* Limit Suffix (Inline) */
.limit-suffix { 
    font-size: 13px; margin-left: 2px; padding: 2px; border-radius: 4px; color: white; display: inline-block; 
}
.daxian { background: #2980b9; }
.xiaoxian { background: #f39c12; }
.xiaoxian.ages { background: #8e44ad; }
.liuyue { background: #27ae60; }

/* Interpretations */
.interpretations-container {
    background: #fff; border: 1px solid #ebd5b3; padding: 1.5rem; border-radius: 12px; margin: 2rem 0;
    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
}
.interp-title {
    color: #5d4037; font-size: 21px; margin-bottom: 1rem; 
    font-family: 'Ma Shan Zheng', cursive; border-bottom: 2px solid #f4f1ea; padding-bottom: 0.5rem;
}
.interp-item { margin-bottom: 1.5rem; }
.interp-star-name { color: #e65100; font-size: 18px; margin-bottom: 0.5rem; }
.borrow-note { font-size: 0.8em; color: #5d4037; font-weight: normal; margin-left: 0.5rem; }
.interp-content { font-size: 16px; color: #5d4037; line-height: 1.6; white-space: pre-line; }
.interp-content.empty { color: #aaa; font-style: italic; }

.interp-group { margin-bottom: 2rem; }
.group-title { 
    font-size: 19px; color: #795548; margin-bottom: 1rem; 
    border-left: 4px solid #e65100; padding-left: 10px; font-weight: bold;
}
.major-list { 
    display: grid; 
    grid-template-columns: repeat(3, 1fr); 
    gap: 1rem; 
}
.major-item { 
    background: #fff8e1; padding: 1.5rem; border-radius: 8px; 
    border: 1px solid #ffe0b2; margin-bottom: 0; 
}
.minor-grid { 
    display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); 
    gap: 1rem; 
}
.minor-item { 
    background: #fafafa; padding: 1rem; border-radius: 8px; 
    border: 1px solid #eee; margin-bottom: 0; 
}
.minor-item .interp-content { font-size: 15px; }
.minor-item .interp-star-name { font-size: 17px; margin-bottom: 0.3rem; color: #5d4037; font-weight: bold; }

/* Patterns */
.patterns-container {
    background: #fff; border: 1px solid #ebd5b3; padding: 1.5rem; border-radius: 12px; margin: 2rem 0;
    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
}

@media (max-width: 900px) {
    .major-list { grid-template-columns: 1fr; }
}
.patterns-container h3 { 
    color: #5d4037; font-size: 21px; margin-bottom: 1rem; 
    font-family: 'Ma Shan Zheng', cursive; border-bottom: 2px solid #f4f1ea; padding-bottom: 0.5rem; 
}
.patterns-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem;
}
.pattern-card {
    background: #FFFAF0; border: 1px solid #ffe0b2; padding: 1rem; border-radius: 8px;
    transition: all 0.2s; position: relative; overflow: hidden;
}
.pattern-card.unlucky {
    background: #f3e5f5; border-color: #e1bee7; /* Purple tint */
}
.pattern-card:hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(0,0,0,0.05); }

.pattern-header {
    display: flex; align-items: center; margin-bottom: 0.5rem;
}
.pattern-tag {
    font-size: 12px; padding: 2px 6px; border-radius: 4px; color: white; margin-right: 8px; font-weight: bold;
}
.pattern-tag.lucky { background: #f57f17; }
.pattern-tag.unlucky { background: #8e44ad; }

.pattern-name {
    font-weight: bold; font-size: 18px; color: #e65100;
}
.pattern-name.unlucky { color: #8e44ad; }

.pattern-desc {
    font-size: 15px; color: #5d4037; line-height: 1.5;
}


@media (max-width: 900px) {
    .chart-grid { grid-template-columns: 1fr; grid-template-rows: auto; display: flex; flex-direction: column; }
    .center-placeholder { display: none; }
    .center-content { position: relative; width: 100%; height: auto; margin-bottom: 2rem; }
    .palace-cell { min-height: auto; }
}
</style>

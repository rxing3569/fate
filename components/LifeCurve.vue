<script setup>
import { computed, ref, onMounted, watch } from 'vue'

const props = defineProps({
  astrolabe: {
    type: Object,
    required: true
  }
})

const width = 800
const height = 250
const padding = 40

// Amplified Scoring Logic
function calculateScore(horoscope) {
  let score = 60 // Base score

  if (!horoscope) return score
  
  const daXianIndex = horoscope.decadal.index
  const daXianPalace = props.astrolabe.palaces[daXianIndex]

  if (daXianPalace) {
     // Static stars in that palace
      daXianPalace.majorStars.forEach(star => {
          // Brightness is significant
          if (['Miao', 'Wang'].includes(star.brightness)) score += 5
          if (['De', 'Li'].includes(star.brightness)) score += 2
          if (['Ping', 'Xian'].includes(star.brightness)) score -= 2
          if (star.brightness === 'Bu') score -= 4
          
          // Lucky stars
          if (['Zi Wei', 'Tian Fu', 'Tai Yang', 'Tai Yin', 'Tian Liang', 'Tian Xiang', 'Wu Qu'].includes(star.name)) score += 5
          // Unlucky
          if (['Po Jun', 'Qi Sha', 'Lian Zhen', 'Tan Lang'].includes(star.name)) score -= 3
      })
      
      daXianPalace.minorStars.forEach(star => {
           if (['Zuo Fu', 'You Bi', 'Tian Kui', 'Tian Xi', 'Wen Chang', 'Wen Qu'].includes(star.name)) score += 4
           if (['Qing Yang', 'Tuo Luo', 'Huo Xing', 'Ling Xing', 'Di Kong', 'Di Jie'].includes(star.name)) score -= 5
      })
  }

  // Decadal Mutagens (Powerful impact)
  const decMutagens = horoscope.decadal.mutagen
  if (decMutagens && decMutagens.length === 4) {
      if (daXianPalace) {
           const allStars = [...daXianPalace.majorStars, ...daXianPalace.minorStars].map(s => s.name)
           if (allStars.includes(decMutagens[0])) score += 15 // Hua Lu (Prosperity)
           if (allStars.includes(decMutagens[1])) score += 10 // Hua Quan (Power)
           if (allStars.includes(decMutagens[2])) score += 8  // Hua Ke (Fame)
           if (allStars.includes(decMutagens[3])) score -= 15 // Hua Ji (Obstacle)
      }
  }

  // Yearly Penalty/Bonus (Noise)
  const yearlyIndex = horoscope.yearly.index
  const yearlyPalace = props.astrolabe.palaces[yearlyIndex]
  if (yearlyPalace) {
       yearlyPalace.minorStars.forEach(star => {
           if (['Qing Yang', 'Tuo Luo'].includes(star.name)) score -= 3
           if (['Tian Xi', 'Hong Luan'].includes(star.name)) score += 2
       })
  }

  return Math.max(10, Math.min(100, score)) // Clamp 10-100
}

const scores = ref([])

onMounted(() => {
    generateScores()
})

watch(() => props.astrolabe, () => {
    generateScores()
})

function generateScores() {
   if (!props.astrolabe) return

   const result = []
   const birthYear = new Date(props.astrolabe.solarDate).getFullYear()
   
   // Calculate for ages 10 to 90 (Focus on active years)
   for (let age = 1; age <= 90; age++) {
       const targetYear = birthYear + (age - 1)
       const dateStr = `${targetYear}-06-15`
       
       try {
           const horoscope = props.astrolabe.horoscope(dateStr)
           const score = calculateScore(horoscope)
           result.push({ age, score })
       } catch (e) {
           // console.error(e) 
       }
   }
   scores.value = result
}

// SVG Path Generation
const pathD = computed(() => {
    if (scores.value.length === 0) return ''
    
    // Scales
    const minAge = 1
    const maxAge = 90
    const minScore = 0
    const maxScore = 100
    
    const xScale = (width - padding * 2) / (maxAge - minAge)
    const yScale = (height - padding * 2) / (maxScore - minScore)
    
    // Start Move
    let d = `M ${padding + (scores.value[0].age - minAge) * xScale} ${height - padding - (scores.value[0].score * yScale)}`
    
    // Draw lines
    for (let i = 1; i < scores.value.length; i++) {
        const p = scores.value[i]
        const x = padding + (p.age - minAge) * xScale
        const y = height - padding - (p.score * yScale)
        d += ` L ${x} ${y}`
    }
    
    return d
})

</script>

<template>
  <div class="curve-container glass">
      <h3 class="title-gradient">一生運勢曲線 (Life Luck Curve)</h3>
      <div class="chart-wrapper">
        <svg :viewBox="`0 0 ${width} ${height}`" class="curve-svg">
            <!-- Grid Lines & Y-Axis Labels -->
            <g class="grid" stroke="#334155" stroke-width="0.5" stroke-dasharray="4">
                <line :x1="padding" :y1="height-padding" :x2="width-padding" :y2="height-padding" /> <!-- 0 -->
                <line :x1="padding" :y1="(height-padding)/2 + padding/2" :x2="width-padding" :y2="(height-padding)/2 + padding/2" /> <!-- 50 -->
                <line :x1="padding" :y1="padding" :x2="width-padding" :y2="padding" /> <!-- 100 -->
            </g>

            <!-- Y Axis Text -->
            <g class="labels" fill="#94a3b8" font-size="10" text-anchor="end">
                <text :x="padding - 5" :y="height - padding">0 分</text>
                <text :x="padding - 5" :y="(height-padding)/2 + padding/2">50 分</text>
                <text :x="padding - 5" :y="padding + 4">100 分</text>
            </g>
            
            <!-- Path -->
            <path :d="pathD" fill="none" class="curve-line" stroke-width="2" />
            
            <!-- Area under curve (Optional, makes it look nicer) -->
             <path :d="`${pathD} L ${width-padding} ${height-padding} L ${padding} ${height-padding} Z`" fill="url(#gradient)" opacity="0.2" />
             
             <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:var(--color-primary);stop-opacity:1" />
                    <stop offset="100%" style="stop-color:var(--color-primary);stop-opacity:0" />
                </linearGradient>
            </defs>

            <!-- X Axis Labels -->
             <g class="labels" fill="#94a3b8" font-size="10" text-anchor="middle">
                <text :x="padding" :y="height - 10">1歲</text>
                <text :x="width / 2" :y="height - 10">45歲</text>
                <text :x="width - padding" :y="height - 10">90歲</text>
            </g>
        </svg>
      </div>
      <p class="disclaimer">縱軸：運勢指數 (分) | 橫軸：年齡 (歲)</p>
  </div>
</template>

<style scoped>
.curve-container {
    padding: 1.5rem;
    margin-top: 1rem;
    border-radius: var(--radius-lg);
}
.chart-wrapper {
    width: 100%;
    margin-top: 1rem;
}
.curve-svg {
    width: 100%;
    height: auto;
    overflow: visible;
}
.curve-line {
    stroke: var(--color-primary);
    stroke-linecap: round;
    stroke-linejoin: round;
    filter: drop-shadow(0 0 2px var(--color-primary));
}
.disclaimer {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    margin-top: 0.5rem;
    text-align: center;
}
</style>

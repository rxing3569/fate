<script setup lang="ts">
import { Brain, Heart, MessageCircle, Puzzle, Shield } from '@lucide/vue'

interface Dimension {
  title: string
  score: number
  description: string
}

const props = defineProps<{ dimensions: Dimension[] }>()
const canvas = ref<HTMLCanvasElement | null>(null)
const chart = ref<HTMLElement | null>(null)
let observer: ResizeObserver | undefined

const orderedNames = ['緣分吸引力', '價值觀契合', '現實互補度', '精神與溝通', '運勢抗風險']
const ordered = computed(() => orderedNames.map((title) => props.dimensions.find(item => item.title === title) || { title, score: 0, description: '' }))
const iconMap = { '緣分吸引力': Heart, '價值觀契合': Brain, '現實互補度': Puzzle, '精神與溝通': MessageCircle, '運勢抗風險': Shield }
const colorMap: Record<string, string> = { '緣分吸引力': '#b85b4b', '價值觀契合': '#e5a93b', '現實互補度': '#24575a', '精神與溝通': '#4a90e2', '運勢抗風險': '#6b4ee0' }

function drawRadar() {
  if (!canvas.value || !chart.value) return
  const rect = chart.value.getBoundingClientRect()
  const width = Math.max(280, rect.width)
  const height = 292
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.value.width = width * dpr
  canvas.value.height = height * dpr
  canvas.value.style.width = `${width}px`
  canvas.value.style.height = `${height}px`
  const context = canvas.value.getContext('2d')
  if (!context) return
  context.scale(dpr, dpr)
  context.clearRect(0, 0, width, height)

  const centerX = width / 2
  const centerY = 148
  const radius = Math.min(width * 0.27, 104)
  const point = (axis: number, value: number) => {
    const angle = axis * Math.PI * 2 / 5 - Math.PI / 2
    return { x: centerX + radius * value * Math.cos(angle), y: centerY + radius * value * Math.sin(angle) }
  }

  context.lineWidth = 1
  for (let level = 1; level <= 5; level++) {
    context.beginPath()
    for (let axis = 0; axis < 5; axis++) {
      const current = point(axis, level / 5)
      axis === 0 ? context.moveTo(current.x, current.y) : context.lineTo(current.x, current.y)
    }
    context.closePath()
    context.strokeStyle = 'rgba(36, 87, 90, .09)'
    context.stroke()
  }
  for (let axis = 0; axis < 5; axis++) {
    const end = point(axis, 1)
    context.beginPath()
    context.moveTo(centerX, centerY)
    context.lineTo(end.x, end.y)
    context.strokeStyle = 'rgba(36, 87, 90, .13)'
    context.stroke()
  }

  const scorePoints = ordered.value.map((item, axis) => point(axis, Math.max(0, Math.min(100, item.score)) / 100))
  context.beginPath()
  scorePoints.forEach((current, index) => index === 0 ? context.moveTo(current.x, current.y) : context.lineTo(current.x, current.y))
  context.closePath()
  const fill = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
  fill.addColorStop(0, 'rgba(184, 91, 75, .44)')
  fill.addColorStop(1, 'rgba(184, 91, 75, .15)')
  context.fillStyle = fill
  context.fill()
  context.strokeStyle = '#b85b4b'
  context.lineWidth = 2.5
  context.lineJoin = 'round'
  context.stroke()
  scorePoints.forEach((current) => {
    context.beginPath(); context.arc(current.x, current.y, 6, 0, Math.PI * 2); context.fillStyle = 'rgba(184, 91, 75, .28)'; context.fill()
    context.beginPath(); context.arc(current.x, current.y, 3.5, 0, Math.PI * 2); context.fillStyle = '#b85b4b'; context.fill()
  })
}

watch(ordered, () => nextTick(drawRadar), { deep: true })
onMounted(() => {
  nextTick(drawRadar)
  observer = new ResizeObserver(drawRadar)
  if (chart.value) observer.observe(chart.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div class="score-overview">
    <div ref="chart" class="radar-chart" role="img" :aria-label="ordered.map(item => `${item.title} ${item.score} 分`).join('、')">
      <canvas ref="canvas" aria-hidden="true" />
      <span v-for="(item, index) in ordered" :key="item.title" class="radar-label" :class="`label-${index}`"><b>{{ item.title }}</b><strong>{{ item.score }} 分</strong></span>
    </div>

    <div class="dimension-list">
      <article v-for="item in ordered" :key="item.title" class="dimension-card">
        <header>
          <span class="dimension-icon" :style="{ color: colorMap[item.title], backgroundColor: `${colorMap[item.title]}18` }"><component :is="iconMap[item.title as keyof typeof iconMap]" :size="19" /></span>
          <strong>{{ item.title }}</strong>
          <b :style="{ color: colorMap[item.title] }">{{ item.score }}</b><small>/ 100</small>
        </header>
        <div class="score-scale"><i :style="{ width: `${item.score}%`, background: `linear-gradient(90deg, ${colorMap[item.title]}, ${colorMap[item.title]}b3)`, boxShadow: `0 2px 5px ${colorMap[item.title]}3d` }" /></div>
        <MarkdownContent v-if="item.description" class="dimension-copy" :source="item.description" />
      </article>
    </div>
  </div>
</template>

<style scoped>
.score-overview { display:grid;gap:16px; }.radar-chart { position:relative;width:100%;height:292px;overflow:hidden; }.radar-chart canvas { position:absolute;inset:0;display:block; }.radar-label { position:absolute;z-index:1;display:grid;min-width:96px;padding:5px 9px;border:1px solid rgba(36,87,90,.07);border-radius:10px;background:rgba(255,255,255,.9);box-shadow:0 3px 8px rgba(0,0,0,.035);text-align:center;pointer-events:none; }.radar-label b { font-size:11.5px;line-height:1.25; }.radar-label strong { margin-top:2px;color:var(--cinnabar);font-size:11px; }.label-0 { top:4px;left:50%;transform:translateX(-50%); }.label-1 { top:74px;right:0; }.label-2 { right:8%;bottom:4px; }.label-3 { left:8%;bottom:4px; }.label-4 { top:74px;left:0; }
.dimension-list { display:grid;gap:14px; }.dimension-card { padding:14px 16px 16px;border:1px solid rgba(36,87,90,.06);border-radius:18px;background:rgba(255,255,255,.62); }.dimension-card header { display:grid;grid-template-columns:38px minmax(0,1fr) auto auto;gap:9px;align-items:center; }.dimension-icon { display:grid;place-items:center;width:36px;height:36px;border-radius:50%; }.dimension-card header > strong { font-size:14px; }.dimension-card header > b { font-size:20px;font-weight:900; }.dimension-card header > small { align-self:end;margin-bottom:3px;color:rgba(0,0,0,.28);font-size:11px;font-weight:800; }.score-scale { height:8px;margin-top:10px;overflow:hidden;border-radius:4px;background:#f1f1ef; }.score-scale i { display:block;height:100%;border-radius:4px;transition:width .5s ease; }.dimension-copy { margin-top:10px; }.dimension-copy:deep(.markdown-content) { color:rgba(36,87,90,.82);font-size:14.5px;line-height:1.6; }.dimension-copy:deep(p:last-child) { margin-bottom:0; }
@media(max-width:420px){.radar-label{min-width:82px;padding-inline:6px}.radar-label b{font-size:10.5px}.label-2{right:2%}.label-3{left:2%}.dimension-card{padding-inline:13px}.dimension-card header{grid-template-columns:36px minmax(0,1fr) auto auto;gap:7px}}
</style>

<script setup lang="ts">
import { Brain, Heart, MessageCircle, Puzzle, Shield } from '@lucide/vue'

interface Dimension {
  title: string
  score: number
  description: string
}

const props = defineProps<{ dimensions: Dimension[] }>()

const ordered = computed(() => props.dimensions)
const icons = [Heart, Brain, Puzzle, MessageCircle, Shield]
const colors = ['#b85b4b', '#e5a93b', '#24575a', '#4a90e2', '#6b4ee0']
const itemIcon = (index: number) => icons[index % icons.length]
const itemColor = (index: number) => colors[index % colors.length]!

const radarPoint = (axis: number, value: number) => {
  const angle = axis * Math.PI * 2 / 5 - Math.PI / 2
  return {
    x: 160 + 91 * value * Math.cos(angle),
    y: 144 + 91 * value * Math.sin(angle),
  }
}
const pointList = (values: number[]) => values
  .map((value, axis) => {
    const point = radarPoint(axis, value)
    return `${point.x.toFixed(2)},${point.y.toFixed(2)}`
  })
  .join(' ')
const radarGrid = computed(() => Array.from({ length: 5 }, (_, index) => pointList(Array(5).fill((index + 1) / 5))))
const radarAxes = computed(() => Array.from({ length: 5 }, (_, axis) => radarPoint(axis, 1)))
const radarScores = computed(() => ordered.value.map(item => Math.max(0, Math.min(100, item.score)) / 100))
const radarScorePolygon = computed(() => pointList(radarScores.value))
const radarScorePoints = computed(() => radarScores.value.map((score, axis) => radarPoint(axis, score)))
</script>

<template>
  <div class="score-overview">
    <div v-if="ordered.length === 5" class="radar-chart" role="img" :aria-label="ordered.map(item => `${item.title} ${item.score} 分`).join('、')">
      <svg viewBox="0 0 320 292" aria-hidden="true">
        <defs>
          <radialGradient id="match-radar-fill" cx="50%" cy="50%" r="58%">
            <stop offset="0" stop-color="#b85b4b" stop-opacity=".44" />
            <stop offset="1" stop-color="#b85b4b" stop-opacity=".15" />
          </radialGradient>
        </defs>
        <polygon v-for="(points, index) in radarGrid" :key="index" :points="points" class="radar-grid" />
        <line v-for="(point, index) in radarAxes" :key="`axis-${index}`" x1="160" y1="144" :x2="point.x" :y2="point.y" class="radar-axis" />
        <polygon :points="radarScorePolygon" class="radar-score-shape" />
        <g v-for="(point, index) in radarScorePoints" :key="`score-${index}`">
          <circle :cx="point.x" :cy="point.y" r="6" class="radar-point-halo" />
          <circle :cx="point.x" :cy="point.y" r="3.5" class="radar-point" />
        </g>
      </svg>
      <span v-for="(item, index) in ordered" :key="item.title" class="radar-label" :class="`label-${index}`"><b>{{ item.title }}</b><strong>{{ item.score }} 分</strong></span>
    </div>

    <div class="dimension-list">
      <article v-for="(item, index) in ordered" :key="`${item.title}-${index}`" class="dimension-card">
        <header>
          <span class="dimension-icon" :style="{ color: itemColor(index), backgroundColor: `${itemColor(index)}18` }"><component :is="itemIcon(index)" :size="19" /></span>
          <strong>{{ item.title }}</strong>
          <b :style="{ color: itemColor(index) }">{{ item.score }}</b><small>/ 100</small>
        </header>
        <div class="score-scale"><i :style="{ width: `${item.score}%`, background: `linear-gradient(90deg, ${itemColor(index)}, ${itemColor(index)}b3)`, boxShadow: `0 2px 5px ${itemColor(index)}3d` }" /></div>
        <MarkdownContent
          v-if="item.description"
          class="dimension-copy"
          :source="item.description"
          :report-formatting="false"
        />
      </article>
    </div>
  </div>
</template>

<style scoped>
.score-overview { display:grid;gap:16px; }.radar-chart { position:relative;width:100%;height:292px;overflow:hidden; }.radar-chart svg { position:absolute;inset:0;display:block;width:100%;height:100%; }.radar-grid { fill:none;stroke:rgba(36,87,90,.1);stroke-width:1; }.radar-axis { stroke:rgba(36,87,90,.14);stroke-width:1; }.radar-score-shape { fill:url(#match-radar-fill);stroke:#b85b4b;stroke-width:2.5;stroke-linejoin:round; }.radar-point-halo { fill:rgba(184,91,75,.28); }.radar-point { fill:#b85b4b; }.radar-label { position:absolute;z-index:1;display:grid;min-width:96px;padding:5px 9px;border:1px solid rgba(36,87,90,.07);border-radius:10px;background:rgba(255,255,255,.9);box-shadow:0 3px 8px rgba(0,0,0,.035);text-align:center;pointer-events:none; }.radar-label b { font-size:11.5px;line-height:1.25; }.radar-label strong { margin-top:2px;color:var(--cinnabar);font-size:11px; }.label-0 { top:4px;left:50%;transform:translateX(-50%); }.label-1 { top:74px;right:0; }.label-2 { right:8%;bottom:4px; }.label-3 { left:8%;bottom:4px; }.label-4 { top:74px;left:0; }
.dimension-list { display:grid;gap:14px; }.dimension-card { padding:14px 16px 16px;border:1px solid rgba(36,87,90,.06);border-radius:18px;background:rgba(255,255,255,.62); }.dimension-card header { display:grid;grid-template-columns:38px minmax(0,1fr) auto auto;gap:9px;align-items:center; }.dimension-icon { display:grid;place-items:center;width:36px;height:36px;border-radius:50%; }.dimension-card header > strong { font-size:14px; }.dimension-card header > b { font-size:20px;font-weight:900; }.dimension-card header > small { align-self:end;margin-bottom:3px;color:rgba(0,0,0,.28);font-size:11px;font-weight:800; }.score-scale { height:8px;margin-top:10px;overflow:hidden;border-radius:4px;background:#f1f1ef; }.score-scale i { display:block;height:100%;border-radius:4px;transition:width .5s ease; }.dimension-copy { margin-top:10px; }.dimension-copy:deep(.markdown-content) { color:rgba(36,87,90,.82);font-size:14.5px;line-height:1.6; }.dimension-copy:deep(p:last-child) { margin-bottom:0; }
@media(max-width:420px){.radar-label{min-width:82px;padding-inline:6px}.radar-label b{font-size:10.5px}.label-2{right:2%}.label-3{left:2%}.dimension-card{padding-inline:13px}.dimension-card header{grid-template-columns:36px minmax(0,1fr) auto auto;gap:7px}}
</style>

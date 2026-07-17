<script setup lang="ts">
import { ChevronDown, ChevronLeft, ChevronsUpDown, CircleHelp, Sparkles } from '@lucide/vue'
import { getStarLessonDetail, learningStages, starLessons, stageLabel } from '~/utils/learning'

const route = useRoute()
const router = useRouter()
const id = computed(() => String(route.params.id))
const stage = computed(() => learningStages.find(item => item.id === id.value))
const source = ref('')
const selectedStar = ref('')
const loading = ref(false)
const error = ref('')
const expanded = ref<Set<number>>(new Set())
const trineInteractiveExpanded = ref(true)

type Section = { title: string; body: string }
const sections = computed<Section[]>(() => {
  if (!source.value) return []
  const chunks = source.value.split(/^##\s+/m).filter(Boolean)
  return chunks.map(chunk => {
    const newline = chunk.indexOf('\n')
    return newline < 0
      ? { title: chunk.trim(), body: '' }
      : { title: chunk.slice(0, newline).trim(), body: chunk.slice(newline + 1).trim() }
  })
})
const hasTrineInteractive = computed(() => id.value === '2_3')
const allExpanded = computed(() =>
  sections.value.length > 0 &&
  expanded.value.size === sections.value.length &&
  (!hasTrineInteractive.value || trineInteractiveExpanded.value),
)

async function loadLesson() {
  source.value = ''
  selectedStar.value = ''
  error.value = ''
  expanded.value = new Set()
  trineInteractiveExpanded.value = true
  if (!stage.value || stage.value.kind === 'action') return
  if (stage.value.kind === 'stars') return
  loading.value = true
  try {
    const response = await fetch(`/docs/course/${id.value}.md`)
    if (!response.ok) throw new Error(String(response.status))
    const content = await response.text()
    source.value = content
    expanded.value = new Set(sections.value.map((_, index) => index))
  } catch {
    error.value = '無法載入課程內容，請稍後再試。'
  } finally {
    loading.value = false
  }
}

const selectedStarData = computed(() =>
  selectedStar.value ? getStarLessonDetail(id.value, selectedStar.value) : null,
)
const selectedStarDetails = computed(() => selectedStarData.value?.palaceDescriptions || [])

function goBack() {
  if (selectedStar.value) selectedStar.value = ''
  else router.back()
}

function toggle(index: number) {
  const next = new Set(expanded.value)
  next.has(index) ? next.delete(index) : next.add(index)
  expanded.value = next
}

function toggleAll() {
  const shouldExpand = !allExpanded.value
  expanded.value = shouldExpand ? new Set(sections.value.map((_, index) => index)) : new Set()
  if (hasTrineInteractive.value) trineInteractiveExpanded.value = shouldExpand
}

function startQuiz() {
  navigateTo({ path: '/quiz', query: { stage: id.value }, replace: true })
}

watch(id, loadLesson, { immediate: true })
</script>

<template>
  <AppPageLayout
    :title="stage ? stageLabel(stage) : '學習紫微'"
    screen-class="lesson-screen"
    content-mode="flush"
    header-layout="wide"
  >
    <template #leading>
      <button class="icon-button" type="button" aria-label="返回" @click="goBack"><ChevronLeft :size="23" /></button>
    </template>
    <template #actions>
      <button v-if="stage" class="quiz-link" type="button" @click="startQuiz">考試去 <CircleHelp :size="18" /></button>
      <span v-else />
    </template>

    <main v-if="stage && selectedStar" class="lesson-content star-detail-page">
      <section class="star-detail-hero">
        <span class="star-emblem">{{ selectedStarData?.name.slice(0, 1) }}</span>
        <div><h1>{{ selectedStarData?.name }}</h1><p>{{ selectedStarData?.label || stage.title }}</p></div>
      </section>
      <section class="star-focus">
        <strong>星曜重點</strong>
        <p>{{ selectedStarData?.baseDescription || starLessons[id]?.intro }}</p>
      </section>
      <h2 class="detail-heading">十二宮位簡介</h2>
      <section v-for="detail in selectedStarDetails" :key="`${detail.title}-${detail.text}`" class="star-description">
        <h3>{{ detail.title }}</h3><p>{{ detail.text }}</p>
      </section>
    </main>
    <main v-else-if="stage" class="lesson-content">
      <div class="lesson-heading">
        <h1>{{ stageLabel(stage) }}</h1>
        <button v-if="stage.kind === 'reference' && sections.length" class="expand-button" type="button" @click="toggleAll">
          <ChevronsUpDown :size="17" />{{ allExpanded ? '全部收合' : '全部展開' }}
        </button>
      </div>

      <div v-if="loading" class="lesson-state"><span class="loading-ring" />載入課程內容</div>
      <div v-else-if="error" class="lesson-state error-state">{{ error }}</div>

      <template v-else-if="stage.kind === 'reference'">
        <template v-for="(section, index) in sections" :key="`${section.title}-${index}`">
          <TransitTeachingChart
            v-if="id === '4_2' && section.title === '實例剖析'"
          />
          <section
            class="course-section"
            :class="{ keypoints: section.title === '學習重點' }"
          >
            <button type="button" class="section-toggle" :aria-expanded="expanded.has(index)" @click="toggle(index)">
              <span><Sparkles v-if="section.title === '學習重點'" :size="17" />{{ section.title || '章節內容' }}</span>
              <ChevronDown :size="20" :class="{ rotated: expanded.has(index) }" />
            </button>
            <div v-if="expanded.has(index)" class="section-body">
              <MarkdownContent :source="section.body" />
              <TransitExampleAnalysis
                v-if="id === '4_2' && section.title === '實例剖析'"
              />
            </div>
          </section>
          <TrineInteractive
            v-if="hasTrineInteractive && index === 0"
            :expanded="trineInteractiveExpanded"
            @toggle="trineInteractiveExpanded = !trineInteractiveExpanded"
          />
        </template>
      </template>

      <template v-else-if="stage.kind === 'stars' && starLessons[id]">
        <p class="star-intro">{{ starLessons[id].intro }}</p>
        <section class="star-grid" :aria-label="stage.title">
          <button v-for="(name, index) in starLessons[id].names" :key="name" class="star-item" type="button" @click="selectedStar = name">
            <span>{{ index + 1 }}</span><strong>{{ name }}</strong>
            <ChevronDown class="star-arrow" :size="17" />
          </button>
        </section>
        <p class="quiz-note">點選星曜可查看星曜重點與落入十二宮位的完整說明；完成測驗後會記錄本課學習進度。</p>
      </template>

      <button v-if="stage.kind !== 'action'" class="app-button bottom-quiz" type="button" @click="startQuiz">
        <CircleHelp :size="19" /> 開始本課測驗
      </button>
    </main>
    <main v-else class="lesson-content lesson-state error-state">找不到這個教程。</main>
  </AppPageLayout>
</template>

<style scoped>
.lesson-screen { min-height:100dvh; }
.quiz-link,.expand-button { display:flex;align-items:center;gap:5px;border:0;background:transparent;color:var(--mountain);font-weight:900; }.quiz-link { justify-self:end;justify-content:flex-end;flex:0 0 88px;width:88px;min-width:88px;height:42px;padding:0;white-space:nowrap; }.lesson-content { box-sizing:border-box;width:100%;max-width:680px;margin:0 auto;padding:8px 18px 110px; }.lesson-heading { display:flex;align-items:center;justify-content:space-between;gap:12px;margin:2px 0 14px; }.lesson-heading h1 { margin:0;color:var(--mountain);font-size:20px;line-height:1.35; }.expand-button { flex:none;padding:8px 0;font-size:13px; }
.course-section { margin-bottom:16px;overflow:hidden;border:1px solid rgba(36,87,90,.08);border-radius:18px;background:rgba(255,255,255,.64); }.course-section.keypoints { border-color:rgba(107,166,160,.3);background:rgba(107,166,160,.12); }.section-toggle { display:flex;align-items:center;justify-content:space-between;width:100%;min-height:50px;padding:13px 16px;border:0;background:transparent;color:var(--mountain);font-size:16px;font-weight:800;text-align:left; }.section-toggle span { display:flex;align-items:center;gap:6px; }.section-toggle svg { transition:transform .2s ease; }.section-toggle svg.rotated { transform:rotate(180deg); }.section-body { padding:0 16px 16px; }
.lesson-state { display:flex;align-items:center;justify-content:center;gap:10px;min-height:180px;color:var(--text-soft);font-weight:700; }.loading-ring { width:22px;height:22px;border:3px solid rgba(36,87,90,.14);border-top-color:var(--mountain);border-radius:50%;animation:spin .8s linear infinite; }.error-state { color:var(--cinnabar); }.star-intro { margin:2px 0 18px;color:var(--text-soft);font-size:15px;line-height:1.75; }.star-grid { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px; }.star-item { display:grid;grid-template-columns:30px minmax(0,1fr) 18px;align-items:center;gap:9px;min-height:58px;padding:12px;border:1px solid rgba(36,87,90,.09);border-radius:16px;background:rgba(255,255,255,.68);color:var(--mountain);text-align:left; }.star-item span { display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:rgba(107,166,160,.14);font-size:12px;font-weight:900; }.star-item strong { min-width:0;font-size:14px;line-height:1.35; }.star-arrow { transform:rotate(-90deg);opacity:.55; }.quiz-note { margin:20px 2px 0;color:var(--text-soft);font-size:13px;line-height:1.65; }.bottom-quiz { display:flex;align-items:center;justify-content:center;gap:7px;width:100%;margin-top:24px; }
.star-detail-hero { display:flex;align-items:center;gap:14px;padding:22px;border:1px solid rgba(255,255,255,.58);border-radius:26px;background:rgba(255,255,255,.66);box-shadow:0 12px 24px rgba(36,87,90,.07); }.star-emblem { display:grid;place-items:center;flex:none;width:52px;height:52px;border-radius:14px;background:rgba(200,174,120,.2);color:var(--mountain);font-size:23px;font-weight:900; }.star-detail-hero h1 { margin:0;color:var(--mountain);font-size:25px; }.star-detail-hero p { margin:4px 0 0;color:var(--text-soft);font-size:14px;font-weight:700; }.star-focus { margin-top:14px;padding:18px;border:1px solid rgba(107,166,160,.25);border-radius:18px;background:rgba(107,166,160,.11); }.star-focus strong { color:var(--mountain);font-size:15px; }.star-focus p,.star-description p { margin:7px 0 0;color:var(--text-soft);line-height:1.7; }.detail-heading { margin:22px 4px 10px;color:var(--mountain);font-size:18px; }.star-description { margin-bottom:12px;padding:16px;border:1px solid rgba(36,87,90,.08);border-radius:18px;background:rgba(255,255,255,.62); }.star-description h3 { margin:0;color:var(--mountain);font-size:16px; }
@keyframes spin { to { transform:rotate(360deg); } } @media (max-width:360px) { .star-grid { grid-template-columns:1fr; } .lesson-heading { align-items:flex-start; } }
</style>

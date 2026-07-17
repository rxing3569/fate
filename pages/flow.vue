<script setup lang="ts">
import { CalendarCheck, CalendarDays, CalendarRange, ChevronDown, ChevronLeft, ChevronRight, Coins, RefreshCw, Sparkles, WifiOff } from '@lucide/vue'
import { earthlyBranches, getXiaoXianAges, palaceNameForBranch, ziweiPalaces } from '~/utils/ziwei/core'
import { calculateFlowData } from '~/utils/ziwei/calculator'

definePageMeta({ middleware: 'auth' })

type FlowType = '流年' | '流月' | '流日'
interface FlowSection { title: string; content: string }
interface FlowRecord { content?: string; is_complete?: boolean; created_at?: string }

const auth = useAuthStore()
const chartStore = useChartStore()
const activeAnalysis = useActiveAnalysisStore()
const now = new Date()
const stage = ref<'type' | 'date' | 'result'>('type')
const flowType = ref<FlowType>('流年')
const year = ref(now.getFullYear())
const month = ref(now.getMonth() + 1)
const day = ref(now.getDate())
const content = ref('')
const createdAt = ref('')
const analyzing = ref(false)
const preparing = ref(false)
const error = ref('')
const showConfirm = ref(false)
const showFallback = ref(false)
const recalculate = ref(false)
const usePointsFallback = ref(false)
const notice = ref('')
let noticeTimer: ReturnType<typeof setTimeout> | undefined

const days = computed(() => Array.from({ length: new Date(year.value, month.value, 0).getDate() }, (_, index) => index + 1))
const birthYear = computed(() => Number(chartStore.birthInfo?.year || chartStore.chart?.solarYear || now.getFullYear() - 80))
const dateKey = computed(() => flowType.value === '流年' ? year.value * 10000 : flowType.value === '流月' ? year.value * 10000 + month.value * 100 : year.value * 10000 + month.value * 100 + day.value)
const displayDate = computed(() => flowType.value === '流年' ? `${year.value}` : flowType.value === '流月' ? `${year.value}/${String(month.value).padStart(2, '0')}` : `${year.value}/${String(month.value).padStart(2, '0')}/${String(day.value).padStart(2, '0')}`)
const sections = computed(() => parseSections(content.value))
const visibleSections = computed(() => analyzing.value && sections.value.length ? sections.value.slice(0, -1) : sections.value)
const formattedCreatedAt = computed(() => {
  if (!createdAt.value) return ''
  const value = new Date(createdAt.value)
  return Number.isNaN(value.getTime()) ? '' : value.toLocaleString('zh-TW', { hour12: false })
})

watch([year, month], () => { if (day.value > days.value.length) day.value = days.value.length })
onMounted(async () => {
  chartStore.hydrate(auth.profile)
  await activeAnalysis.hydrate()
  syncActiveFlow()
  await recoverFlowResult()
})
watch(() => activeAnalysis.active, syncActiveFlow, { deep: true })
watch(() => activeAnalysis.active?.status, () => { void recoverFlowResult() })

function syncActiveFlow() {
  const job = activeAnalysis.active
  if (!job || job.kind !== 'flow') return
  const meta = job.metadata as { flowType?: FlowType, year?: number, month?: number, day?: number }
  if (meta.flowType) flowType.value = meta.flowType
  if (meta.year) year.value = meta.year
  if (meta.month) month.value = meta.month
  if (meta.day) day.value = meta.day
  content.value = job.contents.main || content.value
  analyzing.value = job.status === 'running'
  if (job.error) error.value = job.error
  stage.value = 'result'
}

async function recoverFlowResult() {
  const job = activeAnalysis.active
  if (!job || job.kind !== 'flow' || job.status !== 'completed') return
  const key = Number(job.metadata.dateKey || 0)
  if (!key) return
  try {
    const record = normalizeRecord(await ziweiApi.getFlowRecord(key, { notifyError: false }))
    if (record?.is_complete && record.content?.trim()) {
      content.value = record.content
      createdAt.value = record.created_at || ''
      stage.value = 'result'
      analyzing.value = false
    }
  } catch { /* The streamed snapshot remains available. */ }
}

const typeOptions = [
  { type: '流年' as const, title: '流年（年度）運勢', subtitle: '分析整年吉凶起伏、事業財運與流年重點', icon: CalendarDays },
  { type: '流月' as const, title: '流月（月份）運勢', subtitle: '細推每月氣場轉變，掌握行事契機與變化', icon: CalendarRange },
  { type: '流日' as const, title: '流日（單日）運勢', subtitle: '排算每日吉凶運程，指引生活細節與決策', icon: CalendarCheck },
]

function selectType(type: FlowType) { flowType.value = type; stage.value = 'date'; error.value = '' }
function notify(message: string) { notice.value = message; clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { notice.value = '' }, 3000) }

function normalizeRecord(data: unknown): FlowRecord | null {
  if (!data || typeof data !== 'object') return null
  const wrapped = data as { data?: FlowRecord }
  return wrapped.data ?? data as FlowRecord
}

async function requestAnalysis(force = false) {
  if (!chartStore.chart || analyzing.value || preparing.value) return
  if (!await activeAnalysis.ensureAvailable('flow')) return
  preparing.value = true
  error.value = ''
  recalculate.value = force
  usePointsFallback.value = false
  if (!force) {
    try {
      const record = normalizeRecord(await ziweiApi.getFlowRecord(dateKey.value, { notifyError: false }))
      if (record?.is_complete && record.content?.trim()) {
        content.value = record.content
        createdAt.value = record.created_at || ''
        stage.value = 'result'
        notify('已自動載入歷史排算紀錄，此操作不花費點數。')
        preparing.value = false
        return
      }
    } catch { /* No completed cache: continue to confirmation. */ }
  }
  preparing.value = false
  showConfirm.value = true
}

function buildPayload() {
  const chart = chartStore.chart!
  const palaces = earthlyBranches.map((branch) => {
    let name = palaceNameForBranch(chart, branch)
    if (branch === chart.bodyPalaceBranch) name = `${name}(身宮)`
    const daXian = chart.palaceDaXian[branch]
    return {
      name, position: branch, stars: chart.palaceStars[branch] || [],
      twelve_gods: {
        ...(chart.palaceChangSheng[branch] ? { '長生十二神': chart.palaceChangSheng[branch] } : {}),
        ...(chart.palaceBoShi[branch] ? { '博士十二神': chart.palaceBoShi[branch] } : {}),
        ...(chart.palaceSuiJian[branch] ? { '歲建十二神': chart.palaceSuiJian[branch] } : {}),
        ...(chart.palaceJiangQian[branch] ? { '將前十二神': chart.palaceJiangQian[branch] } : {}),
      },
      daxian_ages: daXian ? `${daXian[0]}-${daXian[1]}` : '',
      xiaoxian_ages: getXiaoXianAges(chart, branch).join(', '),
    }
  })
  const flowData = calculateFlowData({ chart, flowType: flowType.value, year: year.value, month: month.value, day: day.value })
  const destinyIndex = earthlyBranches.indexOf(flowData.destinyBranch as never)
  const flowPalaces = ziweiPalaces.map((name, index) => {
    const branch = earthlyBranches[(destinyIndex - index + 12) % 12]!
    const transformations = (chart.palaceStars[branch] || []).flatMap((star) => {
      const clean = star.replace(/[廟旺得利平陷不]$/, '')
      return flowData.siHua[clean] ? [`${clean}${flowData.siHua[clean]}`] : []
    })
    const daXian = chart.palaceDaXian[branch]
    return { name, position: branch, stars: [...(flowData.stars[branch] || []), ...transformations], daxian_ages: daXian ? `${daXian[0]}-${daXian[1]}` : '', xiaoxian_ages: getXiaoXianAges(chart, branch).join(', ') }
  })
  return {
    owner: chart.gender, gender: chart.gender,
    birth_date: { solar: `${chart.solarYear}年${chart.solarMonth}月${chart.solarDay}日`, lunar: `${chart.lunarYear}年${chart.lunarMonth}月${chart.lunarDay}日`, ganzhi: `${chart.yearStem || ''}${chart.yearBranch || ''}年 ${chart.timeBranch}時` },
    wuxing_ju: chart.bureau?.name || '未知', palaces, language: 'zh-Hant',
    analysis_type: 'flow', recalculate: recalculate.value, use_points_fallback: usePointsFallback.value,
    flow: { palaces: flowPalaces, analysis_date_key: dateKey.value },
  }
}

async function startAnalysis() {
  showConfirm.value = false
  const started = await activeAnalysis.begin('flow', `flow:${dateKey.value}`, {
    flowType: flowType.value, year: year.value, month: month.value, day: day.value,
    dateKey: dateKey.value,
  })
  if (!started) return
  stage.value = 'result'
  content.value = ''
  createdAt.value = ''
  error.value = ''
  analyzing.value = true
  try {
    content.value = await activeAnalysis.runStep(buildPayload())
    analyzing.value = false
    recalculate.value = false
    await auth.loadBilling()
  } catch (reason) {
    analyzing.value = false
    const message = reason instanceof Error ? reason.message : '分析連線發生錯誤，請稍後再試。'
    if (message.includes('membership_limit_exceeded')) showFallback.value = true
    else if (message.includes('insufficient_points')) error.value = '點數餘額不足，請先購買點數後再繼續。'
    else error.value = message
  }
}

async function usePoints() { showFallback.value = false; usePointsFallback.value = true; await startAnalysis() }

function parseSections(text: string): FlowSection[] {
  if (!text.trim()) return []
  const result: FlowSection[] = []
  let title = ''
  let lines: string[] = []
  const commit = () => { const body = lines.join('\n').trim(); if (title || body) result.push({ title: title || '分析內容', content: body }); lines = [] }
  for (const line of text.split('\n')) {
    if (line.trim().startsWith('###')) { commit(); title = line.replace(/###/g, '').trim() }
    else if (title || line.trim()) lines.push(line)
  }
  commit()
  return result
}

function goBack() {
  if (analyzing.value) { useRouter().back(); return }
  if (stage.value === 'result') { stage.value = 'date'; content.value = ''; error.value = ''; return }
  if (stage.value === 'date') { stage.value = 'type'; return }
  useRouter().back()
}
</script>

<template>
  <AppPageLayout screen-class="flow-screen" content-mode="flush" header-layout="wide">
    <template #leading><button class="icon-button" type="button" aria-label="返回" @click="goBack"><ChevronLeft :size="23" /></button></template>
    <template #title><div class="bar-title"><h1>時運解析</h1></div></template>
    <template #actions><button v-if="stage === 'result' && content" class="recalc-button" type="button" :disabled="analyzing" @click="requestAnalysis(true)"><RefreshCw :size="16" />重新排算</button><span v-else /></template>
    <div v-if="analyzing && content" class="analysis-progress"><span /></div>

    <main v-if="stage === 'type'" class="flow-body type-stage">
      <p class="stage-copy">請選擇您想排算的運勢週期，開始解析運勢</p>
      <button v-for="option in typeOptions" :key="option.type" class="type-card glass" type="button" @click="selectType(option.type)"><span class="type-icon"><component :is="option.icon" :size="24" /></span><span><strong>{{ option.title }}</strong><small>{{ option.subtitle }}</small></span><ChevronRight :size="22" /></button>
    </main>

    <main v-else-if="stage === 'date'" class="flow-body date-stage">
      <p class="stage-copy">選擇分析時間（{{ flowType }}）</p>
      <FlowDatePicker v-model:year="year" v-model:month="month" v-model:day="day" :flow-type="flowType" :birth-year="birthYear" />
      <p v-if="!chartStore.chart" class="flow-error">請先完成出生資料與命盤設定</p>
      <button class="app-button start-button" type="button" :disabled="preparing || !chartStore.chart" @click="requestAnalysis(false)"><Sparkles :size="18" />{{ preparing ? '正在確認...' : '開始時運解析' }}</button>
    </main>

    <main v-else class="result-stage">
      <h2>{{ displayDate }} 運勢解析</h2>
      <small v-if="formattedCreatedAt" class="analysis-time">分析時間：{{ formattedCreatedAt }}</small>
      <div v-if="analyzing && !content" class="flow-loading"><AstrologyLoader /></div>
      <section v-else class="flow-result">
        <details v-for="(section, index) in visibleSections" :key="`${section.title}-${index}`" class="flow-card glass" :open="index === 0"><summary><strong>{{ section.title }}</strong><ChevronDown :size="19" /></summary><MarkdownContent :source="section.content" /></details>
        <MarkdownContent v-if="content && !sections.length" class="raw-content" :source="content" />
        <div v-if="analyzing && content" class="streaming-note"><Sparkles :size="16" />正在整理下一段內容...</div>
        <div v-if="error" class="result-error"><WifiOff :size="22" /><p>{{ error }}</p><NuxtLink v-if="error.includes('點數')" class="app-button" to="/store"><Coins :size="17" />前往購買</NuxtLink></div>
      </section>
    </main>

    <AppBottomSheet :open="showConfirm" @close="showConfirm = false"><h2>{{ recalculate ? '確認重新排算' : '開始時運解析' }}</h2><p>{{ auth.premium ? (recalculate ? '重新排算將消耗會員額度 1 次，並覆蓋所選日期的歷史紀錄。' : '時運解析將消耗會員額度 1 次；查看歷史快取不消耗額度。') : (recalculate ? '重新排算將重新消耗 100 點並覆蓋歷史紀錄。' : '本次時運解析將消耗 100 點。') }}</p><div v-if="!auth.premium" class="points-row"><Coins :size="18" /><span>目前點數</span><b>{{ auth.points }}</b></div><div class="sheet-actions"><button class="app-button outline" type="button" @click="showConfirm = false">取消</button><button class="app-button" type="button" :disabled="!auth.premium && auth.points < 100" @click="startAnalysis">{{ recalculate ? '確認重新排算' : auth.premium ? '確認使用' : '確認' }}</button></div></AppBottomSheet>
    <AppBottomSheet :open="showFallback" @close="showFallback = false"><h2>會員月度額度已滿</h2><p>是否改為扣除 100 點數繼續本次時運解析？目前點數：{{ auth.points }}</p><div class="sheet-actions"><button class="app-button outline" type="button" @click="showFallback = false">取消</button><button class="app-button" type="button" :disabled="auth.points < 100" @click="usePoints">使用點數</button></div></AppBottomSheet>
    <Transition name="toast"><div v-if="notice" class="toast">{{ notice }}</div></Transition>
  </AppPageLayout>
</template>

<style scoped>
.flow-screen { position:relative; }.bar-title { min-width:0;text-align:center; }.bar-title h1 { line-height:1.15; }.bar-title small { display:block;margin-top:2px;color:rgba(36,87,90,.38);font-size:10px;font-weight:500;white-space:nowrap; }.recalc-button { display:flex;align-items:center;justify-content:center;gap:3px;width:86px;padding:0;border:0;background:transparent;color:var(--mountain);font-size:11px;font-weight:800; }.flow-body { padding:14px 24px 80px; }.stage-copy { margin:4px 0 28px;color:var(--mountain);font-size:14px;text-align:center; }.type-card { display:grid;grid-template-columns:48px minmax(0,1fr) 24px;gap:13px;align-items:center;width:100%;margin-bottom:16px;padding:20px;border:0;border-radius:26px;color:var(--mountain);text-align:left; }.type-icon { display:grid;place-items:center;width:46px;height:46px;border-radius:50%;background:rgba(107,166,160,.13); }.type-card strong,.type-card small { display:block; }.type-card strong { font-size:17px; }.type-card small { margin-top:5px;color:var(--text-soft);font-size:12.5px;line-height:1.4; }
.date-stage { max-width:570px;margin:0 auto; }.start-button { width:100%;margin-top:30px;gap:7px; }.flow-error { color:var(--cinnabar);font-size:13px;text-align:center; }
.result-stage { padding:8px 16px 30px; }.result-stage > h2 { margin:8px 0 18px;font-size:20px;text-align:center; }.flow-result { display:grid;gap:13px;padding-bottom:16px; }.flow-card { overflow:hidden;border-radius:21px; }.flow-card summary { display:flex;align-items:center;justify-content:space-between;min-height:60px;padding:16px 18px;cursor:pointer;list-style:none; }.flow-card summary::-webkit-details-marker{display:none}.flow-card summary svg{transition:transform .2s}.flow-card[open] summary svg{transform:rotate(180deg)}.flow-card[open] summary{border-bottom:1px solid rgba(36,87,90,.08)}.flow-card > :not(summary){padding:16px 18px 20px}.flow-card :deep(.markdown-content){font-size:15px;line-height:1.6}.raw-content { padding:20px;border-radius:22px;background:rgba(255,255,255,.6); }.streaming-note { display:flex;align-items:center;justify-content:center;gap:7px;padding:18px;color:var(--text-soft);font-size:13px;font-weight:700; }.result-error { display:flex;flex-direction:column;align-items:center;padding:22px;color:var(--cinnabar);text-align:center; }.result-error p{margin:8px 0 15px}.result-error .app-button{gap:7px}.choose-again { width:100%;gap:7px; }
.analysis-progress { height:2px;margin:0 24px;overflow:hidden;background:rgba(36,87,90,.08); }.analysis-progress span { display:block;width:35%;height:100%;background:var(--mountain);animation:progress 1.1s ease-in-out infinite alternate; }@keyframes progress{to{transform:translateX(185%)}}.flow-sheet { width:min(100%,680px);padding:12px 24px calc(28px + env(safe-area-inset-bottom));border-radius:28px 28px 0 0;background:var(--paper);text-align:center; }.sheet-icon { display:grid;place-items:center;width:62px;height:62px;margin:0 auto;border-radius:50%;background:rgba(107,166,160,.13); }.sheet-icon.fallback { color:var(--cinnabar);background:rgba(184,91,75,.1); }.flow-sheet h2 { margin:15px 0 8px;font-size:19px; }.flow-sheet p { margin:0 0 20px;color:var(--text-soft);font-size:14px;line-height:1.6; }.points-row { display:grid;grid-template-columns:24px 1fr auto;align-items:center;margin-bottom:20px;padding:13px 16px;border-radius:15px;background:rgba(107,166,160,.1);text-align:left; }.toast { position:fixed;z-index:100;left:50%;bottom:calc(28px + env(safe-area-inset-bottom));transform:translateX(-50%);max-width:calc(100% - 40px);padding:11px 16px;border-radius:15px;background:rgba(36,87,90,.94);color:white;font-size:13px;font-weight:700;text-align:center; }.toast-enter-active,.toast-leave-active{transition:opacity .2s}.toast-enter-from,.toast-leave-to{opacity:0}
.bar-title small{display:none}.recalc-button{justify-content:flex-end;width:88px;padding:8px 0;font-size:12px;white-space:nowrap}.recalc-button:disabled{cursor:wait;opacity:.48}.result-stage>h2{margin-bottom:3px}.analysis-time{display:block;margin:0 0 18px;color:rgba(36,87,90,.42);font-size:11px;text-align:center}.flow-loading{display:grid;place-items:center;min-height:calc(100dvh - 180px)}.flow-loading :deep(> *){width:100%}
@media(max-width:420px){.flow-body{padding-inline:18px}.result-stage{padding-inline:12px}.type-card{padding-inline:16px}.recalc-button{width:88px;font-size:11px}}
</style>

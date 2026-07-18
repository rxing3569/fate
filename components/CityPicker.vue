<script setup lang="ts">
import { Check, ChevronDown, LocateFixed, MapPin, Search, X } from '@lucide/vue'
import cityData from '~/data/cities.json'

export interface CityOption { id: string; name: string; country: string; lng: number }

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string]; select: [city: CityOption] }>()
const open = ref(false)
const query = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
const otherCity: CityOption = { id: 'OTHER', name: '其他（手動輸入經度）', country: 'OTHER', lng: 120 }
const cities = [...cityData, otherCity] as CityOption[]
const normalizedValue = computed(() => props.modelValue.replaceAll('-', '_'))
const selected = computed(() => cities.find(city => city.id === normalizedValue.value))
const filtered = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  if (!keyword) return cityData as CityOption[]
  return (cityData as CityOption[]).filter(city => city.name.toLowerCase().includes(keyword) || city.id.toLowerCase().includes(keyword) || city.country.toLowerCase().includes(keyword))
})

watch(open, async value => {
  if (!value) { query.value = ''; return }
  await nextTick()
  searchInput.value?.focus()
})

function choose(city: CityOption) {
  emit('update:modelValue', city.id)
  emit('select', city)
  open.value = false
}
</script>

<template>
  <div class="city-picker">
    <button class="city-trigger input" type="button" aria-haspopup="dialog" :aria-expanded="open" @click="open = true">
      <MapPin :size="20" aria-hidden="true" />
      <span v-if="selected"><strong>{{ selected.name }}</strong><small>{{ selected.id === 'OTHER' ? '手動設定出生地經度' : `${selected.id} · 經度 ${selected.lng.toFixed(2)}°` }}</small></span>
      <span v-else class="city-placeholder"><strong>請選擇出生城市</strong></span>
      <ChevronDown :size="20" aria-hidden="true" />
    </button>

    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="open" class="sheet-backdrop content-sheet-backdrop city-backdrop" @click.self="open = false">
          <section class="city-sheet" role="dialog" aria-modal="true" aria-labelledby="city-picker-title">
            <div class="sheet-handle" />
            <header><span><LocateFixed :size="21" /><strong id="city-picker-title">選擇出生城市</strong></span><button type="button" aria-label="關閉城市選擇" @click="open = false"><X :size="21" /></button></header>
            <label class="city-search"><Search :size="19" aria-hidden="true" /><input ref="searchInput" v-model="query" type="search" placeholder="搜尋城市、國家或代碼" autocomplete="off"></label>
            <div class="city-other">
              <button class="city-option" type="button" :class="{ selected: normalizedValue === 'OTHER' }" @click="choose(otherCity)">
                <span class="city-pin"><MapPin :size="18" /></span>
                <span><strong>{{ otherCity.name }}</strong><small>搜尋不到時可自行輸入經度</small></span>
                <Check v-if="normalizedValue === 'OTHER'" :size="20" aria-hidden="true" />
              </button>
            </div>
            <div class="city-list">
              <button v-for="city in filtered" :key="city.id" class="city-option" type="button" :class="{ selected: city.id === normalizedValue }" @click="choose(city)">
                <span class="city-pin"><MapPin :size="18" /></span>
                <span><strong>{{ city.name }}</strong><small>{{ `${city.id} · 經度 ${city.lng.toFixed(2)}°` }}</small></span>
                <Check v-if="city.id === normalizedValue" :size="20" aria-hidden="true" />
              </button>
              <p v-if="!filtered.length">找不到符合的城市</p>
            </div>
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.city-trigger { display:grid;grid-template-columns:24px 1fr 20px;gap:10px;align-items:center;height:auto;text-align:left; }.city-trigger > span { min-width:0; }.city-trigger strong,.city-trigger small { display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }.city-trigger small { margin-top:3px;color:var(--text-soft);font-size:11px;font-weight:600; }
.city-placeholder strong { color:rgba(36,87,90,.42);font-weight:600; }
.city-backdrop { z-index:100; }.city-sheet { display:flex;flex-direction:column;width:min(100%,680px);height:min(75dvh,720px);padding:12px 16px calc(12px + env(safe-area-inset-bottom));border-radius:30px 30px 0 0;background:var(--paper);box-shadow:0 -8px 30px rgba(0,0,0,.08); }.city-sheet .sheet-handle { margin-bottom:14px; }.city-sheet header { display:flex;align-items:center;justify-content:space-between;padding:0 4px 12px; }.city-sheet header > span { display:flex;align-items:center;gap:9px; }.city-sheet header button { display:grid;place-items:center;width:40px;height:40px;border:0;border-radius:50%;background:rgba(36,87,90,.08);color:var(--mountain); }
.city-search { display:grid;grid-template-columns:22px 1fr;gap:8px;align-items:center;padding:0 14px;border:1px solid rgba(36,87,90,.18);border-radius:18px;background:rgba(255,255,255,.66); }.city-search input { min-width:0;height:48px;border:0;outline:0;background:transparent;color:var(--mountain);font-weight:600; }
.city-other { flex:0 0 auto;margin-top:10px;padding:0 2px 8px;border-bottom:1px solid rgba(36,87,90,.12); }.city-list { flex:1;overflow:auto;padding:8px 2px 0;overscroll-behavior:contain;scrollbar-color:rgba(36,87,90,.28) transparent; }.city-list::-webkit-scrollbar { width:5px; }.city-list::-webkit-scrollbar-track { background:transparent; }.city-list::-webkit-scrollbar-thumb { border-radius:99px;background:rgba(36,87,90,.28); }.city-option { display:grid;grid-template-columns:42px 1fr 24px;gap:10px;align-items:center;width:100%;min-height:66px;padding:9px 10px;border:0;border-radius:16px;background:transparent;color:var(--mountain);text-align:left; }.city-option:hover,.city-option.selected { background:rgba(107,166,160,.12); }.city-pin { display:grid;place-items:center;width:38px;height:38px;border-radius:50%;background:rgba(36,87,90,.09); }.city-option strong,.city-option small { display:block; }.city-option strong { font-size:14px; }.city-option small { margin-top:4px;color:var(--text-soft);font-size:11px; }.city-list p { color:var(--text-soft);text-align:center; }
</style>

<script setup>
import { ref } from 'vue'

// Components are auto-imported in Nuxt, but we want to ensure client-only rendering for the chart
// which depends on iztro logic that might be heavy or browser-dependent (though iztro is pure JS).
// The main issue in Vite SSG was import/export. 
// In Nuxt, we can wrap <ZiWeiChart> in <ClientOnly>.

useHead({
  title: '紫微斗數排盤 | 江映澄命相',
  meta: [
    { name: 'description', content: '免費線上紫微斗數排盤，即時分析本命、大運、流年。' },
  ],
})

const currentMode = ref('form') // 'form' | 'chart'
const inputData = ref(null)

function handleFormSubmit(data) {
  inputData.value = data
  setTimeout(() => {
      currentMode.value = 'chart'
      window.scrollTo({ top: 0, behavior: 'smooth' })
  }, 50)
}

function resetToForm() {
  currentMode.value = 'form'
}
</script>

<template>
    <div class="page-container">
        <div class="ziwei-wrapper">
            <div class="header-actions" v-if="currentMode === 'chart'">
                 <button @click="resetToForm" class="back-btn">← 重新輸入條件</button>
            </div>
            
            <ClientOnly>
                <div v-if="currentMode === 'form'">
                     <ZiWeiForm @submit="handleFormSubmit" />
                </div>
                <div v-else-if="currentMode === 'chart'">
                     <ZiWeiChart :inputData="inputData" />
                </div>
                <template #fallback>
                    <div style="text-align:center; padding: 2rem;">Loading...</div>
                </template>
            </ClientOnly>
        </div>
    </div>
</template>

<style scoped>
.page-container {
    padding-top: 9rem; /* Match other pages offset */
    padding-bottom: 4rem;
    min-height: 85vh;
    animation: fadeIn 0.8s ease-out;
    display: flex; justify-content: center;
}

.ziwei-wrapper {
    width: 100%; max-width: 1200px;
    margin: 0 1rem;
}

.header-actions { margin-bottom: 1rem; display: flex; justify-content: center; }

.back-btn {
    background: white; border: 1px solid #5d4037; color: #5d4037;
    padding: 0.6rem 1.5rem; border-radius: 50px; cursor: pointer;
    transition: all 0.3s; font-family: 'Noto Serif TC', serif; font-weight: bold;
    display: flex; align-items: center; gap: 0.5rem;
    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}
.back-btn:hover { background: #5d4037; color: white; transform: translateY(-2px); }

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
    .ziwei-wrapper { margin: 0; }
}
</style>

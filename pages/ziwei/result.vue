<script setup>
import { useRoute, useRouter } from 'vue-router'
import { computed } from 'vue'
import { decodeData } from '../../utils/url-data'

const route = useRoute()
const router = useRouter()

useHead({
  title: '紫微斗數排盤 - 命盤結果 | 江映澄命相',
})

const inputData = computed(() => {
    const q = route.query.q
    if (!q) return null
    
    const decoded = decodeData(q)
    if (!decoded || !decoded.date) return null
    
    return {
        name: decoded.name,
        gender: decoded.gender,
        date: decoded.date,
        timeIndex: Number(decoded.timeIndex)
    }
})

function goBack() {
    router.push('/ziwei')
}
</script>

<template>
    <div class="page-container">
        <div class="ziwei-wrapper">


             <ClientOnly>
                <div v-if="inputData">
                     <ZiWeiChart :inputData="inputData" />
                </div>
                <div v-else class="empty-state">
                    <p>無效的資料，請重新輸入。</p>
                    <button @click="goBack" class="btn-primary">返回輸入</button>
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
    padding-top: 9rem;
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

.empty-state { text-align: center; padding: 3rem; color: #5d4037; }

.btn-primary {
    display: inline-block; margin-top: 1rem;
    background: #5d4037; color: white; border: none; padding: 0.8rem 2rem;
    border-radius: 50px; cursor: pointer;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
    .ziwei-wrapper { margin: 0; }
}
</style>

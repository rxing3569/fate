<script setup>
import { useRouter } from 'vue-router'
import { encodeData } from '../../utils/url-data'

const router = useRouter()

useHead({
  title: '紫微斗數排盤 - 輸入資料 | 江映澄命相',
})

function handleFormSubmit(data) {
    const encoded = encodeData({
        name: data.name,
        gender: data.gender,
        date: data.date,
        timeIndex: data.timeIndex
    })
    
    // Navigate to result with single encoded param
    router.push({
        path: '/ziwei/result',
        query: { q: encoded }
    })
}
</script>

<template>
    <div class="page-container">
        <div class="ziwei-wrapper">
             <ZiWeiForm @submit="handleFormSubmit" />
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
    width: 100%; max-width: 800px;
    margin: 0 1rem;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
    .ziwei-wrapper { margin: 0; }
}
</style>

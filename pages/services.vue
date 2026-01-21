<script setup>
import { ref } from 'vue'

useHead({
  title: '服務方案 | 江映澄命相',
  meta: [
    { name: 'description', content: '提供紫微斗數、八字命理分析服務，以及流年運勢預測。' },
  ],
})

const services = ref([
    { 
        title: '紫微本命大運', 
        price: 2100, 
        desc: '深度解析人格特質、天賦才華與近十年大運，全方位了解人生格局，涵蓋性格、事業、財運、婚姻、健康、人際關係等一生的運勢基調與潛能，它是你人生的「宇宙履歷」。', 
        action: 'ziwei',
        addOnSelected: false,
        contents: [
            '本命盤與近十年大運詳細說明',
            '一生大運走勢重點說明',
            '完整 PDF 命書',
            '三個月內不限次數訊息詢問（非即時覆回）'
        ]
    },
  
    { 
        title: '紫微單一流年', 
        price: 1200, 
        desc: '聚焦當年度流年運勢，精準解析該年吉凶禍福與機遇挑戰。涵蓋事業升遷、財運起伏、感情變化與外出運勢，助您在關鍵時刻預知先機，做出最佳決策。', 
        action: 'ziwei',
        addOnSelected: false,
        contents: [
            '當年度注意事項詳細說明 (事業/財運/感情/考試/外出)',
            '完整 PDF 命書',
            '三個月內不限次數訊息詢問（非即時覆回）'
        ]
    },
      { 
        title: '八字本命大運', 
        price: 1800, 
        desc: '透過五行結構剖析核心能量，掌握一生大運起伏與喜忌。全方位解讀性格特質、事業財運與婚姻家庭，助您在人生順逆境中找準定位，掌握關鍵轉折，知命而順勢。', 
        action: 'bazi',
        addOnSelected: false,
        contents: [
            '八字命式與五行喜忌能量詳細說明',
            '一生大運走勢重點說明',
            '完整 PDF 命書',
            '三個月內不限次數訊息詢問（非即時覆回）'
        ]
    },
    { 
        title: '八字單一流年', 
        price: 900, 
        desc: '針對特定流年進行五行生剋推演，預測該年運勢走向與潛在變數。深入解析事業機遇、財運得失與健康狀況，提供具體的趨吉避凶策略，助您安穩度過流年挑戰。', 
        action: 'bazi',
        addOnSelected: false,
        contents: [
            '當年度注意事項詳細說明 (事業/財運/感情/考試/外出)',
            '完整 PDF 命書',
            '三個月內不限次數訊息詢問（非即時覆回）'
        ]
    }
])

const handleAction = (svc) => {
    // In a real app, you might pass the selected add-on state
    // console.log(`Service: ${svc.title}, Voice Add-on: ${svc.addOnSelected}`)
    
    if(svc.action === 'ziwei') {
        window.location.href = '/ziwei'
    } else {
        alert('此功能建設中')
    }
}
</script>

<template>
    <div class="page-container">
        <section class="section-block">
            <div class="container">
                <div class="section-header">
                    <h2>服務方案</h2>
                    <span class="eng-title">SERVICES</span>
                    <div class="ink-line"></div>
                </div>
                
                <div class="services-list">
                    <div v-for="(svc, idx) in services" :key="idx" class="service-card">
                        <div class="service-main">
                            <div class="service-info">
                                <h3 class="service-title">{{ svc.title }}</h3>
                                <p class="service-desc">{{ svc.desc }}</p>
                                
                                <div class="plan-contents">
                                    <span class="plan-label">方案內容</span>
                                    <div v-for="(item, i) in svc.contents" :key="i" class="content-tag">{{ item }}</div>
                                    
                                    <!-- Add-on inside contents -->
                                    <label class="content-tag addon-item" :class="{ 'selected': svc.addOnSelected }">
                                        <input type="checkbox" v-model="svc.addOnSelected" class="addon-checkbox-inline">
                                        <span class="addon-text-inline">加購即時語音講解 (+ NT$ 300 / 30min)</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div class="price-block">
                                <div class="base-price">NT$ {{ svc.price }}</div>
                            </div>
                        </div>
                        
                        <div class="total-block">
                            <div class="total-price">
                                總計: <span class="highlight">NT$ {{ svc.addOnSelected ? svc.price + 300 : svc.price }}</span>
                            </div>
                            <button class="btn-action" @click="handleAction(svc)">立即預約</button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>
</template>

<style scoped>
.page-container {
    padding-top: 4rem;
    min-height: 80vh;
    animation: fadeIn 0.8s ease-out;
}
.container { max-width: 900px; margin: 0 auto; padding: 6rem 2rem 2rem; }

.section-header { text-align: center; margin-bottom: 4rem; }
h2 { font-size: 2.5rem; color: #2c2c2c; margin-bottom: 0.2rem; letter-spacing: 4px; }
.eng-title { font-size: 0.9rem; color: #81C7D4; letter-spacing: 4px; font-weight: bold; }
.ink-line { width: 60px; height: 3px; background: #81C7D4; margin: 0.8rem auto 0; border-radius: 2px; }

/* List Layout */
.services-list {
    display: flex; flex-direction: column;
    gap: 2rem;
    margin-bottom: 3rem;
}

.service-card {
    background: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(129, 199, 212, 0.3);
    border-radius: 12px;
    padding: 2rem;
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(0,0,0,0.03);
}

.service-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 25px rgba(0,0,0,0.08);
    border-color: #81C7D4;
}

.service-main {
    display: flex; justify-content: space-between; align-items: flex-start;
    border-bottom: 1px solid rgba(0,0,0,0.05);
    padding-bottom: 1.5rem;
    margin-bottom: 1.5rem;
}

.service-info { flex: 1; padding-right: 2rem; }

.service-title {
    font-size: 1.6rem; color: #4a3b32; margin-bottom: 0.8rem; font-weight: bold;
}

.service-desc {
    font-size: 1.05rem; color: #666; line-height: 1.6; margin-bottom: 1.5rem;
}

/* Plan Contents Styling */
.plan-contents {
    margin-top: 1.5rem;
    background: rgba(129, 199, 212, 0.1);
    padding: 1.2rem;
    border-radius: 8px;
}

.plan-label {
    display: block;
    font-size: 0.9rem; font-weight: bold; color: #5d4037;
    margin-bottom: 0.8rem;
    letter-spacing: 1px;
}

.content-tag {
    display: block;
    background: white;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.95rem; color: #4a3b32;
    margin-bottom: 0.6rem;
    border: 1px solid rgba(129, 199, 212, 0.2);
    display: flex; align-items: center;
}
.content-tag:before {
    content: '✓'; color: #81C7D4; font-weight: bold; margin-right: 0.8rem;
}
.content-tag:last-child { margin-bottom: 0; }

.addon-item {
    cursor: pointer;
    border-style: dashed;
    transition: all 0.2s;
    border-color: #81C7D4;
}
.addon-item:before { content: none; } /* Remove default checkmark */
.addon-item:hover { background: rgba(255,255,255,0.8); }
.addon-item.selected {
    border-style: solid;
    /* border-color and background remain as defined in .addon-item or inherited */
}
.addon-item.selected:hover { background: rgba(255,255,255,0.8); }

.addon-checkbox-inline {
    appearance: none;
    -webkit-appearance: none;
    background-color: #fff;
    margin-right: 0.8rem;
    font: inherit;
    width: 20px;
    height: 20px;
    border: 1px solid #81C7D4;
    border-radius: 5px; /* Rounded corners */
    display: grid;
    place-content: center;
    transition: 0.2s;
    cursor: pointer;
}

.addon-checkbox-inline::before {
    content: "";
    width: 10px;
    height: 10px;
    transform: scale(0);
    transition: 120ms transform ease-in-out;
    box-shadow: inset 1em 1em white;
    transform-origin: center;
    clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
}

.addon-checkbox-inline:checked {
    background-color: #81C7D4;
}

.addon-checkbox-inline:checked::before {
    transform: scale(1);
}
.addon-text-inline { font-weight: bold; color: #5d4037; }


.price-block { text-align: right; }
.base-price { font-size: 1.8rem; color: #4a3b32; font-weight: bold; }

/* Remove old addon section styles, keep minimal if needed or delete */


/* Total & Action */
.total-block {
    display: flex; justify-content: space-between; align-items: center;
    padding-top: 0.5rem;
}

.total-price { font-size: 1.2rem; color: #666; font-weight: bold; }
.highlight { color: #d35400; font-size: 1.6rem; margin-left: 0.5rem; }

.btn-action {
    background: #5d4037; color: white;
    border: none;
    padding: 0.8rem 2.5rem;
    font-size: 1.1rem;
    border-radius: 50px;
    cursor: pointer;
    transition: all 0.3s;
    letter-spacing: 2px;
}

.btn-action:hover {
    background: #4a3b32;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(93, 64, 55, 0.3);
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
    .service-main { flex-direction: column; gap: 1rem; }
    .price-block { align-self: flex-start; margin-bottom: 0.5rem; }
    .total-block { flex-direction: column; gap: 1.5rem; align-items: stretch; }
    .total-price { text-align: right; margin-bottom: 0.5rem; }
    .btn-action { width: 100%; }
}
</style>

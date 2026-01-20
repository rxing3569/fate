<script setup>
useHead({
  title: '服務方案 | 江映澄命相',
  meta: [
    { name: 'description', content: '提供紫微斗數、八字命理分析服務，以及流年運勢預測。' },
  ],
})

const services = [
    { title: '紫微本命大運', price: '2100', desc: '深度解析命宮、身宮與十年大運，全方位了解人生格局。', action: 'ziwei' },
    { title: '八字本命大運', price: '1800', desc: '分析八字結構與一生大運，掌握五行喜忌。', action: 'bazi' },
    { title: '紫微單一流年', price: '1200', desc: '針對單一年度深入分析，掌握年度吉凶與機運。', action: 'ziwei' },
    { title: '八字單一流年', price: '900', desc: '預測流年禍福，趨吉避凶。', action: 'bazi' }
]

const handleAction = (type) => {
    // In a real app, this might navigate to a specific form or checkout
    if(type === 'ziwei') {
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
                    <div v-for="(svc, idx) in services" :key="idx" class="service-item" @click="handleAction(svc.action)">
                        <div class="service-info">
                            <h3 class="service-title">{{ svc.title }}</h3>
                            <p class="service-desc">{{ svc.desc }}</p>
                        </div>
                        <div class="service-price">NT$ {{ svc.price }}</div>
                    </div>
                </div>
                
                <div class="divider-section">
                    <span class="divider-text">加值服務</span>
                </div>

                <div class="special-list">
                     <div class="service-item special">
                        <div class="service-info">
                            <h3 class="service-title text-light">即時語音講解</h3>
                            <p class="service-desc text-light-dim">搭配命書的一對一諮詢，解開您心中的疑惑。</p>
                        </div>
                        <div class="service-right">
                            <div class="service-price text-highlight">NT$ 300 / 30min</div>
                            <span class="special-tag">預約</span>
                        </div>
                    </div>
                </div>

                <div class="service-note">
                    * 所有命理服務皆附完整 PDF 命書<br>
                    * 不明之處可私訊（非即時覆回）
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
h2 { font-size: 2.5rem; color: #2c2c2c; margin-bottom: 0.5rem; letter-spacing: 4px; }
.eng-title { font-size: 0.9rem; color: #81C7D4; letter-spacing: 4px; font-weight: bold; }
.ink-line { width: 60px; height: 3px; background: #81C7D4; margin: 1.5rem auto 0; border-radius: 2px; }

/* List Layout */
.services-list {
    display: flex; flex-direction: column;
    gap: 1.5rem;
    margin-bottom: 3rem;
}

.service-item {
    display: flex; justify-content: space-between; align-items: center;
    padding: 2rem;
    background: rgba(255, 255, 255, 0.6);
    border-bottom: 1px solid rgba(74, 59, 50, 0.1);
    transition: all 0.3s ease;
    cursor: pointer;
    border-radius: 4px;
}

.service-item:hover {
    background: rgba(255, 255, 255, 0.95);
    transform: translateX(5px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    border-left: 4px solid #81C7D4;
}

.service-info { flex: 1; padding-right: 2rem; }

.service-title {
    font-size: 1.4rem;
    color: #4a3b32;
    margin-bottom: 0.5rem;
    font-weight: 600;
}

.service-desc {
    font-size: 1rem;
    color: #666;
    line-height: 1.6;
}

.service-price {
    font-size: 1.5rem;
    color: #81C7D4;
    font-weight: bold;
    white-space: nowrap;
}

/* Divider */
.divider-section {
    text-align: center; margin: 3rem 0; position: relative;
}
.divider-section::before {
    content: ''; position: absolute; top: 50%; left: 0; width: 100%; height: 1px; background: rgba(0,0,0,0.1); z-index: 0;
}
.divider-text {
    background: #f4f1ea; /* Match body bg */
    padding: 0 1.5rem;
    position: relative; z-index: 1;
    color: #888; font-size: 0.9rem; letter-spacing: 2px;
}

/* Special Item */
.special-list { display: flex; flex-direction: column; }

.special {
    background: #2c3e50;
    border: none;
    padding: 2.5rem;
}
.special:hover {
    background: #34495e;
    border-left: 4px solid #ec4899;
    transform: translateX(5px);
}

.text-light { color: #fff; }
.text-light-dim { color: #ccc; }
.text-highlight { color: #81C7D4; }

.service-right {
    display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem;
}
.special-tag {
    font-size: 0.8rem; border: 1px solid rgba(255,255,255,0.3);
    padding: 2px 8px; border-radius: 12px; color: #aaa;
}

.service-note { text-align: center; margin-top: 4rem; color: #888; font-size: 0.9rem; line-height: 1.8; font-style: italic; }

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
    .service-item { flex-direction: column; align-items: flex-start; gap: 1rem; padding: 1.5rem; }
    .service-info { padding-right: 0; }
    .service-price { align-self: flex-end; }
    .service-right { flex-direction: row; align-items: center; justify-content: space-between; width: 100%; margin-top: 1rem; }
}
</style>

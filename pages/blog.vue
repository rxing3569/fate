<script setup>
useHead({
  title: '命理專欄 | 江映澄命相',
  meta: [
    { name: 'description', content: '閱讀最新命理與心理學相關文章，探索命運的奧秘。' },
  ],
})

const articles = [
    { title: '命理與心理學的交會', date: '2025.12.01', tag: '像是科技', excerpt: '探討現代心理學如何與傳統命理相互印證，揭示性格決定命運的真諦。' },
    { title: '如何看待「大限」？', date: '2026.01.10', tag: '紫微斗數', excerpt: '大限並非生命的終結，而是人生階段的轉捩點。正確理解大限，掌握轉運契機。' },
    { title: '2026 丙午年運勢前瞻', date: '2026.01.15', tag: '流年運勢', excerpt: '火馬奔騰之年，全球局勢與個人運勢將有何巨變？提前佈局，趨吉避凶。' },
    { title: '宮位之間的對話', date: '2026.01.20', tag: '進階紫微', excerpt: '深入解析三方四正的互動關係，了解宮位如何相互影響，構成你的人生劇本。' }
]
</script>

<template>
    <div class="page-container">
        <section class="section-block">
            <div class="container">
                <SectionHeader title="命理專欄" engTitle="LATEST ARTICLES" />
                
                <div class="blog-grid">
                    <div v-for="(art, idx) in articles" :key="idx" class="blog-card">
                        <div class="card-body">
                            <div class="blog-tag">{{ art.tag }}</div>
                            <h4>{{ art.title }}</h4>
                            <p class="excerpt">{{ art.excerpt }}</p>
                        </div>
                        <div class="card-footer">
                            <div class="blog-date">{{ art.date }}</div>
                            <span class="read-more">閱讀更多</span>
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
.container { max-width: 1000px; margin: 0 auto; padding: 4rem 2rem 2rem; }

.blog-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2.5rem; }

.blog-card {
    background: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(74, 59, 50, 0.1);
    border-radius: 8px;
    padding: 2rem;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex; flex-direction: column; justify-content: space-between;
    min-height: 280px;
    backdrop-filter: blur(5px);
}

.blog-card:hover {
    transform: translateY(-5px);
    background: #fff;
    box-shadow: 0 10px 25px rgba(0,0,0,0.08);
    border-color: #81C7D4;
}

.blog-tag { 
    display: inline-block;
    font-size: 0.8rem; color: #fff; background: #81C7D4;
    padding: 0.2rem 0.8rem; border-radius: 20px;
    margin-bottom: 1rem;
}

.blog-card h4 { font-size: 1.4rem; margin-bottom: 1rem; color: #333; line-height: 1.4; }
.excerpt { 
    font-size: 1rem; color: #666; line-height: 1.6; 
    display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; 
    line-clamp: 3; /* Standard property for compatibility */
    overflow: hidden; 
}

.card-footer { 
    margin-top: 2rem; padding-top: 1rem; border-top: 1px dashed #ddd;
    display: flex; justify-content: space-between; align-items: center;
}

.blog-date { font-size: 0.85rem; color: #999; }
.read-more { font-size: 0.9rem; color: #81C7D4; font-weight: bold; }

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>

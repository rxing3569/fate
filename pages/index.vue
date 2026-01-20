<script setup>
useHead({
  title: '江映澄命相 | 八字與紫微斗數諮詢，掌握運勢趨吉避凶的現代指引',
  meta: [
    { name: 'description', content: '結合現代心理學與傳統命理智慧，江映澄老師提供專業的八字、紫微斗數及流年運勢分析。我們深信命雖說已定，但運可以自己掌控。透過精準的命理諮詢，協助您在人生十字路口看清方向，學會趨吉避凶，找回生活的掌控權。' },
    { property: 'og:title', content: '江映澄命相' },
    { property: 'og:description', content: '入道六載，閱人無數。命有定數，運在人為。' },
    { property: 'og:image', content: '/logo.png' },
  ],
})

const scrollToAbout = () => {
    const element = document.getElementById('about');
    if (element) {
        // Reduced offset to hide the arrow in the previous section
        const headerOffset = 100; 
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
        });
    }
}
</script>

<template>
    <div class="page-container">
        <!-- Hero Section -->
        <section class="hero-section">
            <div class="hero-content">
                <div class="hero-text">
                    <h1 class="main-title">命有定數 <br>　運在人為</h1>

                    <div class="hero-desc">
                        <p>結合現代心理學與古老命理學</p>
                        <p>為您揭開命運的神秘面紗，為自己尋找方向。</p>
                    </div>
                </div>
                <div class="hero-visual">
                    <div class="hero-poem">
                        <p>江海浮沉測吉凶</p>
                        <p>映照流年萬象中</p>
                        <p>澄澈慧心觀氣數</p>
                        <p>撥開雲霧路從容</p>
                    </div>
                </div>
            </div>
            
            <!-- Floating Scroll Indicator -->
            <div class="scroll-indicator" @click="scrollToAbout">
                <span class="scroll-text">深入認識映澄</span>
                <div class="scroll-arrow">↓</div>
            </div>
        </section>

        <!-- About / Destiny Section -->
        <section id="about" class="section-block about-container">
            <div class="container-narrow">
                <div class="section-header">
                    <h2>關於映澄</h2>
                    <span class="eng-title">ABOUT DESTINY</span>
                    <div class="ink-line"></div>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="num">06</span>
                        <span class="label">年資歷</span>
                    </div>
                    <div class="stat-item">
                        <span class="num">300+</span>
                        <span class="label">閱盤數量</span>
                    </div>
                    <div class="stat-item">
                        <span class="num">100%</span>
                        <span class="label">回覆率</span>
                    </div>
                </div>
                
                <div class="content-card">
                      <p class="about-text">
                     <b>【知命，是為了更好的造命】</b><br>

<b>從業六載，閱人數百</b> <br>江某入途六年有餘，曾協助數百位個案釐清生命迷惘，風格獨樹一格，將「現代心理學」融入「傳統命理」之中；不語怪力亂神，而是引導您進行深度的自我覺察。
<br>
<b>算命非認命，旨在趨吉避凶</b> <br>我始終深信，命理的價值不在於讓人消極認命，而是讓您「知命」進而「造命」。透過精準的命盤解析，我將陪您找出運勢的突破口。</p>

                </div>

                <!-- Quick Links -->
                <!-- Quick Links Card Grid -->
                <div class="quick-links-container">
                    <div class="card-grid">
                        <NuxtLink to="/services" class="quick-card">
                            <h3 class="card-title">服務方案</h3>
                            <p class="card-desc">專業命理分析，全方位解析人生格局與流年運勢。</p>
                            <span class="card-arrow">→</span>
                        </NuxtLink>
                        <NuxtLink to="/blog" class="quick-card">
                            <h3 class="card-title">命理專欄</h3>
                            <p class="card-desc">深入淺出的命理知識分享，帶您探索命運的奧秘。</p>
                            <span class="card-arrow">→</span>
                        </NuxtLink>
                        <NuxtLink to="/contact" class="quick-card">
                            <h3 class="card-title">聯繫我</h3>
                            <p class="card-desc">預約諮詢或有任何疑問，歡迎隨時與我聯繫。</p>
                            <span class="card-arrow">→</span>
                        </NuxtLink>
                    </div>
                    
                    <div class="action-wrapper">
                        <NuxtLink to="/ziwei" class="btn-start-lg">開始排盤</NuxtLink>
                    </div>
                </div>
            </div>
        </section>
    </div>
</template>

<style scoped>
.page-container {
    animation: fadeIn 1s ease-out;
    background: rgba(255,255,255,0.4);
}

/* --- Hero Section --- */
.hero-section {
    min-height: 85vh;
    display: flex; align-items: center;
    max-width: 1200px; margin: 0 auto; padding: 0 2rem;
    position: relative; /* For absolute positioning of scroll indicator */
}
.hero-content { display: flex; flex-direction: row; width: 100%; }
.hero-text { flex: 1; padding-right: 2rem; padding-top: 9rem; }
.hero-visual { flex: 1; }

.sub-title { font-size: 1.4rem; color: #81C7D4; margin-bottom: 1.5rem; letter-spacing: 4px; font-weight: 600; }
.main-title { font-size: 4.5rem; color: #2c2c2c; margin-bottom: 2.5rem; line-height: 1.2; text-shadow: 0 10px 30px rgba(0,0,0,0.1); }
.hero-desc { font-size: 1.2rem; line-height: 2; color: #5d4037; margin-bottom: 3.5rem; font-weight: 600; padding-left: 1.5rem; }

.hero-visual { flex: 1; display: flex; justify-content: flex-end; align-items: center; padding-top: 9rem; }

.hero-poem {
    writing-mode: vertical-lr;
    text-orientation: upright;
    font-family: 'BiauKai', 'DFKai-SB', '標楷體', serif;
    font-size: 2rem;
    color: #4a3b32;
    height: fit-content;
    display: flex;
    flex-flow: column-reverse;
    gap: 1.5rem; /* Adjusted gap */
    letter-spacing: 1rem;
    font-weight: 600;
    line-height: title;
    margin-right: 2rem;
    text-shadow: 0 0 10px #fff, 0 0 20px #fff, 0 0 40px #fff, 0 0 60px #fff;
    /* Ensure visual centering of the whole block */
    align-self: center; 
}

.hero-poem p { 
    margin: 0; 
    padding-right: 0.8rem; 
    transition: all 0.3s;
}
.hero-poem p:last-child { border-right: none; }

/* Staggered Waterfall Effect - One char height approx 3rem w/ spacing */
.hero-poem p:nth-child(1) { margin-top: -8rem; }
.hero-poem p:nth-child(2) { margin-top: -4rem; } 
.hero-poem p:nth-child(3) { margin-top: 0rem; }
.hero-poem p:nth-child(4) { margin-top: 4rem; }

/* Scroll Indicator */
.scroll-indicator {
    position: absolute;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    opacity: 0.6; /* Faint */
    transition: opacity 0.3s;
    color: #5d4037;
}

.scroll-indicator:hover {
    opacity: 1;
}

.scroll-text {
    font-size: 0.9rem;
    letter-spacing: 3px;
    margin-bottom: 0.5rem;
    font-weight: 500;
}

.scroll-arrow {
    font-size: 1.5rem;
    animation: float 2.5s infinite ease-in-out;
}

@keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(10px); }
}

/* --- Shared Headers --- */
.container-narrow { max-width: 900px; margin: 0 auto; padding: 0 2rem; }
.section-header { text-align: center; margin-bottom: 4rem; }
h2 { font-size: 2.5rem; color: #2c2c2c; margin-bottom: 0.5rem; }
.eng-title { font-size: 0.9rem; color: #81C7D4; letter-spacing: 4px; font-weight: bold; }
.ink-line { width: 60px; height: 3px; background: #81C7D4; margin: 1.5rem auto 0; border-radius: 2px; }

/* --- About Container --- */
.stats-grid { display: flex; justify-content: center; gap: 4rem; margin-bottom: 3rem; text-align: center; }
.stat-item { position: relative; }
.stat-item::after { content: ''; position: absolute; right: -2rem; top: 20%; height: 60%; width: 1px; background: #ddd; }
.stat-item:last-child::after { display: none; }
.num { 
    display: block; font-size: 3rem; font-weight: bold; 
    color: #81C7D4;
    text-shadow: 1px 1px 1px rgba(0,0,0,0.3);
}
.label { font-size: 1rem; color: #666; font-weight: 500; }

.content-card { background: rgba(255, 255, 255, 0.6); padding: 3rem; border-radius: 8px; box-shadow: 0 5px 25px rgba(0,0,0,0.05); backdrop-filter: blur(5px); border: 1px solid rgba(255,255,255,0.5); }
.about-text { text-align: center; font-size: 1.1rem; line-height: 2.2; color: #4a3b32; }

@media (max-width: 768px) {
    .main-title { font-size: 2.2rem; margin-bottom: 1rem; }
    .hero-section { flex-direction: column; text-align: center; padding-top: 7.5rem; padding-bottom: 6rem; justify-content: flex-start; }
    .hero-content { flex-direction: column; }
    .hero-text { padding: 0; }
    .hero-desc { border-left: none; padding-left: 0; margin-bottom: 1.5rem; }
    .hero-visual { display: flex; padding-top: 0; justify-content: center; width: 100%; } 
    .hero-poem { 
        display: flex; margin-right: 0; 
        writing-mode: vertical-lr;
        flex-flow: column-reverse;
        width: auto;
        gap: 1rem;
        height: fit-content;
        font-size: 1.4rem; /* Scaled down */
        letter-spacing: 0.2rem;
        margin-top: 0.5rem;
    }
    .hero-poem p {
        padding-right: 0.6rem;
        margin-top: 0 !important; /* Aligned top */
    }

    .stats-grid { grid-template-columns: 1fr; gap: 1rem; }
    .about-text { padding: 0 1rem; font-size: 0.95rem; }
    .hero-desc { border-left: none; padding-left: 0; }
    .stats-grid { flex-direction: column; gap: 2rem; }
    .stat-item::after { display: none; }
    .content-card { padding: 1.5rem; }
    .scroll-indicator { bottom: 1rem; }
    
    .card-grid { grid-template-columns: 1fr; }
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

/* Quick Links Card Grid */
.quick-links-container {
    margin-top: 4rem;
    animation: fadeIn 1s ease-out 0.3s backwards;
}

.card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
    margin-bottom: 3rem;
}

.quick-card {
    background: rgba(255, 255, 255, 0.7);
    padding: 2rem;
    border-radius: 12px;
    border: 1px solid rgba(129, 199, 212, 0.2);
    text-decoration: none;
    transition: all 0.3s ease;
    display: flex; flex-direction: column;
    position: relative;
    backdrop-filter: blur(5px);
}

.quick-card:hover {
    background: #fff;
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(0,0,0,0.08);
    border-color: #81C7D4;
}

.card-title {
    font-size: 1.3rem; color: #5d4037; margin-bottom: 0.8rem;
    font-weight: bold;
}

.card-desc {
    font-size: 0.95rem; color: #666; line-height: 1.6; margin-bottom: 1.5rem; flex: 1;
}

.card-arrow {
    align-self: flex-end; color: #81C7D4; font-size: 1.2rem; transition: transform 0.3s;
}

.quick-card:hover .card-arrow { transform: translateX(5px); }

/* Centered Action Button */
.action-wrapper { text-align: center; margin-top: 2rem; padding-bottom: 6rem; }

.btn-start-lg {
    display: inline-flex; justify-content: center; align-items: center;
    background: #5d4037; color: white;
    padding: 1rem 3.5rem;
    font-size: 1.3rem; letter-spacing: 4px;
    border-radius: 50px;
    text-decoration: none;
    box-shadow: 0 4px 15px rgba(93, 64, 55, 0.3);
    transition: all 0.3s;
    font-weight: bold;
}

.btn-start-lg:hover {
    background: #4a3b32;
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(93, 64, 55, 0.4);
}
</style>

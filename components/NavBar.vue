<script setup>
import { ref } from 'vue'

const isMenuOpen = ref(false)

const toggleMenu = () => {
    isMenuOpen.value = !isMenuOpen.value
    if (isMenuOpen.value) {
        document.body.style.overflow = 'hidden'
    } else {
        document.body.style.overflow = ''
    }
}

const closeMenu = () => {
    isMenuOpen.value = false
    document.body.style.overflow = ''
}
</script>

<template>
    <nav class="navbar">
        <div class="nav-content">
            <div class="logo">
                <router-link to="/" class="logo-link" @click="closeMenu">
                    <img src="/logo.png" alt="江映澄命相" class="logo-img">
                    <span>江映澄命相</span>
                </router-link>
            </div>
            
            <!-- Desktop Links -->
            <div class="nav-links">
                <router-link to="/services">服務方案</router-link>
                <router-link to="/blog">專欄文章</router-link>
                <router-link to="/contact">聯繫我</router-link>
                <router-link to="/ziwei" class="nav-cta">開始排盤</router-link>
            </div>

            <!-- Mobile Toggle -->
            <button class="menu-toggle" @click="toggleMenu" :class="{ active: isMenuOpen }">
                <span></span>
                <span></span>
                <span></span>
            </button>
        </div>

        <!-- Mobile Menu Overlay -->
        <div class="mobile-menu" :class="{ open: isMenuOpen }">
            <div class="mobile-nav-links">
                <router-link to="/services" @click="closeMenu">服務方案</router-link>
                <router-link to="/blog" @click="closeMenu">專欄文章</router-link>
                <router-link to="/contact" @click="closeMenu">聯繫我</router-link>
                <router-link to="/ziwei" class="nav-cta mobile-cta" @click="closeMenu">開始排盤</router-link>
            </div>
        </div>
    </nav>
</template>

<style scoped>
.navbar {
    position: fixed; top: 1.5rem; left: 50%; transform: translateX(-50%);
    z-index: 1000;
    width: 100%; max-width: 1100px;
    background: rgba(255, 255, 255, 0.25); /* More transparent */
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 50px;
    height: 70px; 
    display: flex; align-items: center; justify-content: space-between;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05);
    padding: 0 1.5rem;
    transition: all 0.3s ease;
}

.nav-content {
    width: 100%;
    display: flex; justify-content: space-between; align-items: center;
}

.logo-link {
    display: flex; align-items: center; gap: 0.8rem;
    text-decoration: none; color: inherit;
}

.logo { 
    font-size: 1.3rem; 
    font-weight: 700; 
    letter-spacing: 2px; 
    color: #5d4037; 
}

.logo-img {
    height: 40px; width: auto;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
}

.nav-links { display: flex; gap: 2rem; align-items: center; }

.nav-links a { 
    text-decoration: none; 
    color: #5d4037; 
    font-size: 1rem; 
    font-weight: 600;
    transition: all 0.3s ease;
    padding: 0.5rem 0;
    border-bottom: 2px solid transparent;
}

.nav-links a:hover, .nav-links a.router-link-active { 
    color: #81C7D4; 
}

.nav-cta {
    background: #5d4037;
    color: white !important; 
    border: none;
    padding: 0.6rem 1.5rem !important; 
    border-radius: 50px; 
    transition: all 0.3s;
    border-bottom: none !important;
    box-shadow: 0 4px 10px rgba(93, 64, 55, 0.3);
    display: flex !important; /* Force flex for centering */
    justify-content: center; align-items: center;
    line-height: normal; /* Reset line-height */
}

.nav-cta:hover { 
    background: #4a3b32;
    transform: translateY(-2px);
    box-shadow: 0 6px 15px rgba(93, 64, 55, 0.4);
}

/* Menu Toggle */
.menu-toggle {
    display: none;
    flex-direction: column;
    justify-content: space-around;
    width: 30px;
    height: 25px;
    background: transparent;
    border: none;
    cursor: pointer;
    z-index: 102;
    padding: 0;
}

.menu-toggle span {
    width: 100%;
    height: 2px;
    background: #5d4037;
    transition: all 0.3s;
    border-radius: 2px;
}

.menu-toggle.active span:nth-child(1) { transform: rotate(45deg) translate(8px, 6px); }
.menu-toggle.active span:nth-child(2) { opacity: 0; }
.menu-toggle.active span:nth-child(3) { transform: rotate(-45deg) translate(8px, -6px); }

/* Mobile Menu */
.mobile-menu {
    position: fixed; 
    top: calc(1.5rem + 70px + 10px); 
    left: 50%; 
    width: 95%; max-width: 1100px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(20px);
    border-radius: 30px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    border: 1px solid rgba(255,255,255,0.5);
    
    /* Animation states */
    opacity: 0; pointer-events: none;
    transform: translateX(-50%) translateY(-20px);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    
    z-index: 99;
    display: none; /* Desktop hidden, shown via media query */
    flex-direction: column;
    justify-content: center; align-items: center;
    padding: 3rem 1rem;
}

.mobile-menu.open { 
    opacity: 1; pointer-events: auto;
    transform: translateX(-50%) translateY(0); 
}

.mobile-nav-links {
    display: flex; flex-direction: column; align-items: center; gap: 2rem;
}

.mobile-nav-links a {
    font-size: 1.5rem;
    color: #5d4037;
    text-decoration: none;
    font-weight: bold;
    font-family: 'Noto Serif TC', serif;
}

.mobile-cta { margin-top: 1rem; padding: 1rem 3rem; font-size: 1.2rem; }

@media (max-width: 768px) {
    .nav-links { display: none; }
    .menu-toggle { display: flex; }
    .mobile-menu { display: flex; } /* Show on mobile */
    .logo { font-size: 1.2rem; } 
    .logo-img { height: 40px; }
}
</style>

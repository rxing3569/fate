<script setup>
// NavBar is auto-imported
</script>

<template>
  <main class="main-layout">
    <NavBar />
    
    <div class="content-body">
        <slot />
    </div>

    <!-- Global Footer -->
    <footer class="main-footer">
        <div class="footer-content">
            <div class="footer-logo">江映澄命相</div>
            <div class="social-links">
                <a href="https://www.instagram.com/jiang.yin.cheng/" target="_blank">Instagram</a>
                <a href="https://www.threads.net/@jiang.yin.cheng" target="_blank">Threads</a>
                <!-- <a href="#">Facebook</a> -->
            </div>
            <div class="copyright">© 2026 喜助數位. All Rights Reserved.</div>
        </div>
    </footer>
  </main>
</template>

<style scoped>
.main-layout {
    display: flex; flex-direction: column; min-height: 100vh;
}

.content-body {
    flex: 1;
    width: 100%;
}

.main-footer { 
    padding: 3rem 2rem; 
    background: transparent; 
    border-top: 1px solid rgba(0,0,0,0.05);
    color: #888; text-align: center; margin-top: auto; 
}
.footer-logo { font-size: 1.2rem; color: #4a3b32; margin-bottom: 1.5rem; font-weight: bold; font-family: 'Noto Serif TC', serif; letter-spacing: 2px; }
.social-links { margin-bottom: 2rem; display: flex; justify-content: center; gap: 2rem; }
.social-links a { 
    color: #5d4037; /* Darker brown */
    text-decoration: none; 
    transition: all 0.3s; 
    font-size: 1rem; 
    font-weight: 600; 
}
.social-links a:hover { color: #81C7D4; transform: translateY(-2px); }
.copyright { font-size: 0.8rem; letter-spacing: 1px; }
</style>

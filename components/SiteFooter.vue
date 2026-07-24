<script setup lang="ts">
const config = useRuntimeConfig();
const linkGroups = [
  {
    title: "系統功能",
    links: [
      { label: "命盤解析", to: "/report" },
      { label: "時運解析", to: "/flow" },
      { label: "合盤解析", to: "/match" },
      { label: "AI 問答", to: "/qa" },
    ],
  },
  {
    title: "資源學習",
    links: [
      { label: "學習紫微", to: "/learn/" },
      { label: "命理專欄", to: "/articles" },
    ],
  },
  {
    title: "會員權益",
    links: [
      { label: "隱私權政策", to: "/privacy-pwa" },
      { label: "問題回報", to: "/issue-report" },
    ],
  },
];
</script>

<template>
  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <div class="footer-brand-title">
          <NuxtLink to="/" aria-label="回到江映澄紫微首頁">江映澄紫微</NuxtLink>
          <small>ver {{ config.public.appVersion }}</small>
        </div>
        <p>AI 紫微斗數命盤解析與自我探索</p>
      </div>

      <nav class="footer-links" aria-label="網站頁尾導覽">
        <section v-for="group in linkGroups" :key="group.title">
          <span class="footer-group-title">{{ group.title }}</span>
          <ul>
            <li v-for="link in group.links" :key="link.to">
              <NuxtLink :to="link.to">{{ link.label }}</NuxtLink>
            </li>
          </ul>
        </section>
      </nav>

      <p class="footer-copyright">© 2026 喜助數位. All Rights Reserved.</p>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  position: relative;
  isolation: isolate;
  width: 100%;
  margin: 48px auto 0;
  border: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  background: linear-gradient(
    145deg,
    rgba(20, 55, 57, 0.94),
    rgba(24, 66, 68, 0.9) 52%,
    rgba(10, 38, 41, 0.96)
  );
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 -12px 34px rgba(10, 38, 41, 0.14);
  -webkit-backdrop-filter: blur(28px) saturate(155%);
  backdrop-filter: blur(28px) saturate(155%);
  color: #fff;
}
.site-footer::before {
  content: "";
  position: absolute;
  z-index: -1;
  inset: 0;
  background:
    radial-gradient(
      circle at 12% 0%,
      rgba(255, 255, 255, 0.16),
      transparent 38%
    ),
    radial-gradient(
      circle at 88% 100%,
      rgba(107, 166, 160, 0.2),
      transparent 42%
    );
  pointer-events: none;
}
.footer-inner {
  width: min(100%, 680px);
  margin: 0 auto;
  padding: 24px 18px calc(20px + env(safe-area-inset-bottom));
}
.footer-brand-title {
  display: flex;
  align-items: baseline;
  gap: 7px;
}
.footer-brand-title > a {
  font-family: "Noto Serif TC", serif;
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 0.08em;
}
.footer-brand-title > small {
  color: rgba(255, 255, 255, 0.48);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.03em;
}
.footer-brand p,
.footer-copyright {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
}
.footer-brand p {
  margin: 4px 0 0;
}
.footer-links {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  margin-top: 20px;
}
.footer-links section {
  padding-inline: 12px;
}
.footer-links section:first-child {
  padding-left: 0;
}
.footer-links section:nth-child(2) {
  border-left: 1px solid rgba(255, 255, 255, 0.12);
}
.footer-links section:nth-child(3) {
  grid-column: 1 / -1;
  padding: 16px 0 0;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}
.footer-group-title {
  display: block;
  margin: 0 0 9px;
  color: #fff;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.08em;
}
.footer-links ul {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.footer-links a {
  color: rgba(255, 255, 255, 0.78);
  font-size: 13px;
  font-weight: 700;
  transition: color 0.18s ease;
}
.footer-links a:hover {
  color: #fff;
}
.footer-copyright {
  margin: 20px 0 0;
  text-align: center;
}
@media (max-width: 759px) {
  .site-footer {
    margin-bottom: calc(-90px - env(safe-area-inset-bottom));
    padding-bottom: calc(90px + env(safe-area-inset-bottom));
  }
}
@media (min-width: 600px) {
  .footer-inner {
    padding-inline: 28px;
  }
  .footer-links {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .footer-links section:nth-child(3) {
    grid-column: auto;
    padding: 0 0 0 12px;
    border-top: 0;
    border-left: 1px solid rgba(255, 255, 255, 0.12);
  }
}
@media (min-width: 760px) {
  .site-footer::after {
    content: "";
    position: absolute;
    top: -1px;
    bottom: 0;
    left: -10px;
    width: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(20, 55, 57, 0.94);
  }
}
@media (min-width: 1180px) {
  .site-footer::after {
    left: -16px;
    width: 16px;
  }
}
</style>

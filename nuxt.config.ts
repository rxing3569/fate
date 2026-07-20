const reviewPrerenderRoutes = {
  basic: ["1", "2_1", "2_2", "2_3"],
  advanced: ["3_1", "3_2", "3_3", "3_4", "3_5", "3_6", "3_7", "3_8"],
  expert: ["4_1", "4_2"],
};

const learningPrerenderRoutes = [
  "1",
  "2_1",
  "2_2",
  "2_3",
  "3_1",
  "3_2",
  "3_3",
  "3_4",
  "3_5",
  "3_6",
  "3_7",
  "3_8",
  "4_1",
  "4_2",
].map((courseId) => `/learning/${courseId}/`);

const articlePrerenderRoutes = [
  "ziwei-chart-basics",
  "four-transformations",
  "ten-year-fortune",
].map((slug) => `/articles/${slug}/`);

export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  ssr: true,
  devServer: {
    port: 3001,
  },
  devtools: { enabled: false },
  experimental: {
    defaults: {
      nuxtLink: {
        trailingSlash: "append",
      },
    },
  },
  nitro: {
    prerender: {
      routes: Object.entries(reviewPrerenderRoutes)
        .flatMap(([level, courseIds]) =>
          courseIds.map((courseId) => `/review/${level}/${courseId}/`),
        )
        .concat(learningPrerenderRoutes, articlePrerenderRoutes),
    },
  },
  routeRules: {
    "/sw.js": {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    },
    "/nwp-live-check": {
      headers: {
        "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
      },
    },
    "/cms": {
      ssr: false,
      headers: { "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet" },
    },
    "/cms/**": {
      ssr: false,
      headers: { "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet" },
    },
  },
  modules:
    process.env.NUXT_DISABLE_PWA === "1"
      ? ["@pinia/nuxt", "@nuxtjs/sitemap"]
      : ["@pinia/nuxt", "@nuxtjs/sitemap", "@vite-pwa/nuxt"],
  site: {
    url: "https://www.fatejyc.com",
    trailingSlash: true,
  },
  sitemap: {
    exclude: [
      "/cms/**",
      "/chart",
      "/flow",
      "/issue-report",
      "/login",
      "/match",
      "/member/**",
      "/nwp-live-check",
      "/payment-result",
      "/point-history",
      "/profile/**",
      "/purchase-history",
      "/qa",
      "/report",
      "/report-detail",
      "/store",
    ],
  },
  css: ["~/assets/css/main.css"],
  runtimeConfig: {
    backendApiBase:
      process.env.NUXT_BACKEND_API_BASE || "http://localhost:3000/api",
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "/api",
      wsAnalyzeUrl:
        process.env.NUXT_PUBLIC_WS_ANALYZE_URL ||
        "ws://localhost:3000/ws/analyze",
      appName: process.env.NUXT_PUBLIC_APP_NAME || "紫微斗數",
      appVersion: process.env.NUXT_PUBLIC_APP_VERSION || "1.1.2",
      googleWebClientId: process.env.NUXT_PUBLIC_GOOGLE_WEB_CLIENT_ID || "",
    },
  },
  app: {
    head: {
      title: "江映澄紫微",
      meta: [
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1, viewport-fit=cover",
        },
        { name: "description", content: "紫微斗數命盤、AI 分析與學習工具" },
        { name: "theme-color", content: "#24575a" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        {
          name: "apple-mobile-web-app-status-bar-style",
          content: "black-translucent",
        },
      ],
      link: [
        { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
        { rel: "shortcut icon", href: "/favicon.ico" },
        { rel: "apple-touch-icon", href: "/icons/icon-192.png" },
      ],
      script: [
        {
          innerHTML: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-KQ7WDSSD');`,
        },
      ],
      noscript: [
        {
          innerHTML: `<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-KQ7WDSSD"
height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
        },
      ],
    },
  },
  pwa: {
    registerType: "autoUpdate",
    client: {
      installPrompt: true,
      periodicSyncForUpdates: 3600,
    },
    manifest: {
      name: "江映澄紫微",
      short_name: "江映澄紫微",
      description: "紫微斗數命盤、AI 分析與學習工具",
      lang: "zh-TW",
      start_url: "/",
      scope: "/",
      display: "standalone",
      orientation: "portrait-primary",
      background_color: "#f7f3ea",
      theme_color: "#24575a",
      icons: [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        {
          src: "/icons/maskable-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "maskable",
        },
        {
          src: "/icons/maskable-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
    workbox: {
      navigateFallback: "/",
      navigateFallbackDenylist: [
        /^\/cms(?:\/|$)/,
        /\/[^/?]+\.[^/]+$/,
        /^\/__sitemap__\//,
      ],
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      skipWaiting: true,
      globPatterns: ["**/*.{js,css,html,png,svg,ico,json,txt,md,woff2,otf}"],
      globIgnores: ["cms/**"],
      manifestTransforms: [
        async (entries) => ({
          manifest: entries.map((entry) => {
            if (entry.url === "index.html" || entry.url === "/index.html") {
              return { ...entry, url: "/" };
            }

            if (entry.url.endsWith("/index.html")) {
              return {
                ...entry,
                url: entry.url.slice(0, -"index.html".length),
              };
            }

            if (entry.url.endsWith(".html")) {
              return { ...entry, url: entry.url.slice(0, -".html".length) };
            }

            return entry;
          }),
          warnings: [],
        }),
      ],
    },
  },
});

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  modules: [
    '@vueuse/nuxt',
    '@nuxtjs/sitemap'
  ],
  site: {
    url: 'https://www.fatejyc.com',
  },
  app: {
    baseURL: '/',
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      link: [
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;700&family=Times+New+Roman&display=swap' }
      ],
      script: [
        {
          innerHTML: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-KQ7WDSSD');`
        }
      ],
      noscript: [
        {
          innerHTML: `<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-KQ7WDSSD"
height="0" width="0" style="display:none;visibility:hidden"></iframe>`
        }
      ]
    }
  },
  css: ['~/assets/css/style.css']
})

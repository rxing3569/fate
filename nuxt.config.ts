// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  modules: [
    '@vueuse/nuxt'
  ],
  app: {
    baseURL: '/fate/',
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      link: [
        { rel: 'icon', type: 'image/png', href: '/logo.png' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;700&family=Times+New+Roman&display=swap' }
      ]
    }
  },
  css: ['~/assets/css/style.css']
})

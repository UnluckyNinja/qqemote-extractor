// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  app: {
    head: {
      title: 'QQ自定义表情导出',
      htmlAttrs: {
        lang: 'zh-Hans-CN'
      },
    },
  },
  future: {
    compatibilityVersion: 4,
  },
  ssr: false,
  nitro: {
    preset: 'cloudflare-pages',
  },
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: [
    '@nuxt/eslint',
    '@unocss/nuxt',
    '@vueuse/nuxt',
  ],
})
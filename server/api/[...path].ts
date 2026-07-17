import { getRequestURL, getRouterParam, proxyRequest } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const backendBase = String(config.backendApiBase).replace(/\/$/, '')
  const path = getRouterParam(event, 'path') || ''
  const search = getRequestURL(event).search

  return proxyRequest(event, `${backendBase}/${path}${search}`, {
    fetchOptions: {
      redirect: 'manual',
    },
  })
})

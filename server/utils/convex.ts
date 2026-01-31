import { ConvexHttpClient } from 'convex/browser'

let convexClient: ConvexHttpClient | null = null

export function getConvexClient(): ConvexHttpClient {
  if (!convexClient) {
    const config = useRuntimeConfig()
    const convexUrl = config.public.convexUrl

    if (!convexUrl) {
      throw new Error('NUXT_CONVEX_URL environment variable is not set')
    }

    convexClient = new ConvexHttpClient(convexUrl)
  }

  return convexClient
}

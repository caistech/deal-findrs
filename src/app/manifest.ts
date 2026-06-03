import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DealFindrs — AI-Powered Deal Assessment',
    short_name: 'DealFindrs',
    description:
      'Branded deal assessment for buyers\' agent firms and property advisories — deploy AI-powered Finance Packs to your developer client roster.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#2563eb',
    icons: [
      {
        // served by src/app/icon.tsx (192x192)
        src: '/icon',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}

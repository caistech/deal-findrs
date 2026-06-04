import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'DealFindrs — AI-Powered Deal Assessment for Buyers\' Agents'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 14,
              background: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 40,
              fontWeight: 800,
              marginRight: 24,
            }}
          >
            D
          </div>
          <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: -1 }}>DealFindrs</div>
        </div>
        <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.1, marginBottom: 20 }}>
          Stop Guessing. Start Knowing.
        </div>
        <div style={{ display: 'flex', fontSize: 30, color: '#94a3b8', maxWidth: 900, lineHeight: 1.3 }}>
          AI-powered deal assessment for buyers&apos; agent firms and property advisories.
        </div>
        <div style={{ display: 'flex', marginTop: 'auto', fontSize: 24, color: '#64748b' }}>
          Corporate AI Solutions
        </div>
      </div>
    ),
    { ...size }
  )
}

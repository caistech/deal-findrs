/** @type {import('next').NextConfig} */

// ── Security headers (CSP verification test, 2026-06-03) ───────────────────────
// Baseline being validated for promotion into cais-build-template-v2. If the live site renders
// with no CSP violations in the console (images, fonts, Supabase all work), this baseline is safe
// to keep as the template default. Tune a directive only if the console flags a blocked resource.
const SUPABASE = 'https://*.supabase.co wss://*.supabase.co';

const ContentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https:`,
  `font-src 'self' data:`,
  `connect-src 'self' ${SUPABASE} https:`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
].join('; ');

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy', value: ContentSecurityPolicy },
];

const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  transpilePackages: ['@caistech/platform-trust-middleware', '@caistech/property-services-sdk'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
}

module.exports = nextConfig

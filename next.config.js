/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  transpilePackages: ['@caistech/platform-trust-middleware', '@caistech/property-services-sdk'],
}

module.exports = nextConfig

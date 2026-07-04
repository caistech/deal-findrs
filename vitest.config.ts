import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
    // report-generator ships extensionless ESM imports — inline it so vite's resolver handles them.
    server: { deps: { inline: ['@caistech/report-generator'] } },
  },
})
